const prisma = require('#prisma');
const Audit = require('#utils/audit.js');

/**
 * Get Users API - Get all users for the authenticated user's company
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function getjobInfo(req, res) {
    try {
        const company_id = req.user.company_id; // Get company_id from authenticated user

        // Fetch all jobs for the company with their latest weld plan serial number
        const jobs = await prisma.job.findMany({
            where: {
                company_id: company_id,
            },
            select: {
                id: true,
                job_number: true,
                tag_number: true,
                project_id: true,
                equipement_name: true,
                code: true,
                customer: {
                    select: {
                        customer_name: true,
                    },
                },
                weld_joint_plans: {
                    select: {
                        serial_no: true
                    },
                    orderBy: {
                        serial_no: 'desc'
                    },
                    take: 1
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Process jobs to add next_serial_no and next_weld_plan_no
        const processedJobs = jobs.map(job => {
            const lastSerial = job.weld_joint_plans?.[0]?.serial_no || 0;
            const nextSerial = lastSerial + 1;

            return {
                ...job,
                next_serial_no: nextSerial,
                // Generate the dynamic Weld Plan No: SHR/JobNo/WTP/SerialNo
                next_weld_plan_no: `SHR/${job.job_number}/WTP/${nextSerial}`
            };
        });

        res.status(200).json({
            success: true,
            message: 'Job Information fetched successfully',
            data: processedJobs,
        });
    } catch (error) {
        console.error('Get job information error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}


/**
 * Create Weld Joint Plan API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createWeldJointPlan(req, res) {
    try {
        const {
            jobNo,
            shrDrgNo,
            customerDrgNumber,
            codeOfConstruction,
            projectId,
            tagId,
            clientName,
            equipmentName,
            tableRows
        } = req.body;

        const company_id = req.user.company_id;
        const user_id = req.user.userid || req.user.id;

        if (!jobNo) {
            return res.status(400).json({ success: false, message: 'Job Number is required' });
        }

        // Find the job to link and get its latest serial number
        const job = await prisma.job.findFirst({
            where: {
                job_number: jobNo,
                company_id: company_id
            },
            include: {
                weld_joint_plans: {
                    select: { serial_no: true },
                    orderBy: { serial_no: 'desc' },
                    take: 1
                }
            }
        });

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        // Calculate next serial number and weld plan no
        const lastSerial = job.weld_joint_plans?.[0]?.serial_no || 0;
        const nextSerial = lastSerial + 1;
        const generatedWeldPlanNo = `SHR/${job.job_number}/WTP/${nextSerial}`;

        // Create Plan and Joints in transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Header
            const plan = await tx.weld_joint_plan.create({
                data: {
                    company_id,
                    job_id: job.id,
                    shreno_drg_no: shrDrgNo,
                    customer_drg_no: customerDrgNumber,
                    code_of_construction: codeOfConstruction,
                    project_id: projectId,
                    tag_id: tagId,
                    client_name: clientName,
                    equipment_name: equipmentName,
                    created_by: user_id,
                    weld_plan_no: generatedWeldPlanNo,
                    serial_no: nextSerial
                }
            });

            // 2. Create Joints
            if (tableRows && tableRows.length > 0) {
                await tx.weld_joint.createMany({
                    data: tableRows.map(row => ({
                        weld_joint_plan_id: plan.id,
                        joint_no: row.jointNo,
                        joint_type: row.jointType,
                        joint_description: row.joint,
                        base_metal_thickness_p1: row.baseMetalThicknessPart1,
                        base_metal_thickness_p2: row.baseMetalThicknessPart2,
                        base_metal_spec_p1: row.baseMetalSpecPart1,
                        base_metal_spec_p2: row.baseMetalSpecPart2,
                        consumable: row.consumable,
                        wps_pqr_no: row.wpsNoPqrNo,
                        process: row.process,
                        impact_test: row.impactTest,
                        back_chip_req: row.backChipReq === 'yes' ? true : (row.backChipReq === 'no' ? false : null),
                        pwht: row.pwht === 'yes' ? true : (row.pwht === 'no' ? false : null),
                        rt: row.rt === 'yes' ? true : (row.rt === 'no' ? false : null),
                        pt: row.pt === 'yes' ? true : (row.pt === 'no' ? false : null),
                        remarks: row.remarks
                    }))
                });
            }

            return plan;
        });

        Audit.insert({
            req,
            company_id,
            user_id,
            action: 'created',
            module: 'Weld Joint Plan',
            description: `Created Weld Joint Plan "${generatedWeldPlanNo}"`,
            metadata: { target_weld_joint_plan_id: result.id },
        });

        res.status(201).json({
            success: true,
            message: 'Welding Joint Plan created successfully',
            data: result
        });

    } catch (error) {
        console.error('Create weld joint plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

/**
 * Get Weld Joint Plans API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getWeldJointPlans(req, res) {
    try {
        const company_id = req.user.company_id;

        const plans = await prisma.weld_joint_plan.findMany({
            where: {
                company_id: company_id
            },
            include: {
                job: {
                    select: {
                        job_number: true,
                        project_id: true,
                        equipement_name: true,
                        customer: {
                            select: {
                                customer_name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            message: 'Weld Joint Plans fetched successfully',
            data: plans
        });
    } catch (error) {
        console.error('Get weld joint plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

/**
 * Get Weld Joint Plan Details API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getWeldJointPlanDetails(req, res) {
    try {
        const { id } = req.params;

        const plan = await prisma.weld_joint_plan.findUnique({
            where: {
                id: id
            },
            include: {
                job: {
                    select: {
                        job_number: true,
                        tag_number: true,
                        project_id: true,
                        equipement_name: true,
                        customer: {
                            select: {
                                customer_name: true
                            }
                        }
                    }
                },
                weld_joints: {
                    orderBy: {
                        createdAt: 'asc' // Or by joint_no if sortable
                    }
                },
                creator: {
                    select: {
                        name: true // Assuming name field exists
                    }
                }
            }
        });

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Weld Joint Plan not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Weld Joint Plan details fetched successfully',
            data: plan
        });
    } catch (error) {
        console.error('Get weld joint plan details error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

const weldJointService = require('../../services/weldJoint.service.js');

/**
 * Get All Weld Joints API
 */
async function getWeldJoints(req, res) {
    try {
        const company_id = req.user.company_id;
        const { page, limit, search, status, sortBy, sortOrder } = req.query;

        const result = await weldJointService.findAll(company_id, {
            page, limit, search, status, sortBy, sortOrder
        }, {
            userId: req.user.userid || req.user.id,
            roles: req.user.role || req.user.roles || []
        });

        res.status(200).json({
            success: true,
            message: 'Weld Joints fetched successfully',
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        console.error('Get weld joints error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * Update Stage Status API
 */
async function updateStageStatus(req, res) {
    try {
        const result = await weldJointService.updateStatus(req.body);
        res.status(200).json({ success: true, message: 'Stage status updated successfully', data: result });
    } catch (error) {
        console.error('Update stage status error:', error);
        res.status(error.message === 'Missing required fields' || error.message === 'Invalid stage' ? 400 : 500).json({ success: false, message: error.message || 'Internal server error' });
    }
}

/**
 * Review Stage Status API
 */
async function reviewStageStatus(req, res) {
    try {
        const result = await weldJointService.reviewStatus(req.body);
        res.status(200).json({ success: true, message: 'Stage status reviewed successfully', data: result });
    } catch (error) {
        console.error('Review stage error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * Get Assigned Weld Joints API - For QC/NDT Engineers
 */
async function getAssignedWeldJoints(req, res) {
    try {
        const company_id = req.user.company_id;
        const user_id = req.user.id;
        const { page = 1, limit = 50, search = '' } = req.query;

        // Custom call to service passing strict constraint
        const result = await weldJointService.findAll(company_id, {
            page, limit, search
        }, {
            // Force it to act like QC looking for their assigned joints
            userId: user_id,
            roles: ['QC_ENGINEER']
        });

        res.status(200).json({
            success: true,
            message: 'Assigned Weld Joints fetched successfully',
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        console.error('Get assigned weld joints error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * Update Weld Joint Plan API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateWeldJointPlan(req, res) {
    try {
        const { id } = req.params;
        const {
            shrDrgNo,
            customerDrgNumber,
            codeOfConstruction,
            projectId,
            tagId,
            clientName,
            equipmentName,
            tableRows
        } = req.body;

        const company_id = req.user.company_id;

        if (!id) {
            return res.status(400).json({ success: false, message: 'Plan ID is required' });
        }

        // Verify plan exists and belongs to company
        const existingPlan = await prisma.weld_joint_plan.findFirst({
            where: {
                id: id,
                company_id: company_id
            }
        });

        if (!existingPlan) {
            return res.status(404).json({ success: false, message: 'Weld Joint Plan not found' });
        }

        // Update Plan and Joints in transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Header
            const updatedPlan = await tx.weld_joint_plan.update({
                where: { id: id },
                data: {
                    shreno_drg_no: shrDrgNo,
                    customer_drg_no: customerDrgNumber,
                    code_of_construction: codeOfConstruction,
                    project_id: projectId,
                    tag_id: tagId,
                    client_name: clientName,
                    equipment_name: equipmentName,
                }
            });

            // 2. Delete Removed Joints
            const incomingIds = tableRows
                ? tableRows.map(row => row.id).filter(id => id && typeof id === 'string' && id.length > 10)
                : [];

            await tx.weld_joint.deleteMany({
                where: {
                    weld_joint_plan_id: id,
                    id: { notIn: incomingIds }
                }
            });

            // 3. Update/Create Joints
            if (tableRows && tableRows.length > 0) {
                for (const row of tableRows) {
                    const jointData = {
                        joint_no: row.jointNo,
                        joint_type: row.jointType,
                        joint_description: row.joint,
                        base_metal_thickness_p1: row.baseMetalThicknessPart1,
                        base_metal_thickness_p2: row.baseMetalThicknessPart2,
                        base_metal_spec_p1: row.baseMetalSpecPart1,
                        base_metal_spec_p2: row.baseMetalSpecPart2,
                        consumable: row.consumable,
                        wps_pqr_no: row.wpsNoPqrNo,
                        process: row.process,
                        impact_test: row.impactTest,
                        back_chip_req: row.backChipReq === 'yes' ? true : (row.backChipReq === 'no' ? false : null),
                        pwht: row.pwht === 'yes' ? true : (row.pwht === 'no' ? false : null),
                        rt: row.rt === 'yes' ? true : (row.rt === 'no' ? false : null),
                        pt: row.pt === 'yes' ? true : (row.pt === 'no' ? false : null),
                        remarks: row.remarks
                    };

                    if (row.id && typeof row.id === 'string' && row.id.length > 10) {
                        // Update existing joint
                        await tx.weld_joint.update({
                            where: { id: row.id },
                            data: jointData
                        });
                    } else {
                        // Create new joint
                        await tx.weld_joint.create({
                            data: {
                                ...jointData,
                                weld_joint_plan_id: id
                            }
                        });
                    }
                }
            }

            return updatedPlan;
        });

        Audit.insert({
            req,
            company_id,
            user_id: req.user.userid || req.user.id,
            action: 'updated',
            module: 'Weld Joint Plan',
            description: `Updated Weld Joint Plan "${result.weld_plan_no || id}"`,
            metadata: { target_weld_joint_plan_id: id },
        });

        res.status(200).json({
            success: true,
            message: 'Welding Joint Plan updated successfully',
            data: result
        });

    } catch (error) {
        console.error('Update weld joint plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

/**
 * Bulk Create Weld Joint Plans API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function bulkCreateWeldJointPlan(req, res) {
    try {
        const payload = req.body;
        const company_id = req.user.company_id;
        const user_id = req.user.userid || req.user.id;

        if (!Array.isArray(payload) || payload.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        }

        const stats = { total: 0, created: 0, failed: 0 };

        for (const report of payload) {
            stats.total++;
            try {
                // Find job
                const job = await prisma.job.findFirst({
                    where: { job_number: report.msn, company_id },
                    include: { weld_joint_plans: { select: { serial_no: true }, orderBy: { serial_no: 'desc' }, take: 1 } }
                });

                if (!job) {
                    console.error(`Bulk Create: Job not found for ${report.msn}`);
                    stats.failed++;
                    continue;
                }

                const lastSerial = job.weld_joint_plans?.[0]?.serial_no || 0;
                const nextSerial = lastSerial + 1;
                const generatedWeldPlanNo = `SHR/${job.job_number}/WTP/${nextSerial}`;

                await prisma.$transaction(async (tx) => {
                    const plan = await tx.weld_joint_plan.create({
                        data: {
                            company_id,
                            job_id: job.id,
                            shreno_drg_no: String(report.shrDrgNo || ''),
                            customer_drg_no: String(report.customerDrgNo || ''),
                            code_of_construction: String(report.codeOfConstruction || ''),
                            created_by: user_id,
                            weld_plan_no: generatedWeldPlanNo,
                            serial_no: nextSerial
                        }
                    });

                    if (report.items && report.items.length > 0) {
                        await tx.weld_joint.createMany({
                            data: report.items.map(row => ({
                                weld_joint_plan_id: plan.id,
                                joint_no: String(row.jointNo || ''),
                                joint_type: String(row.jointType || ''),
                                joint_description: String(row.joint || ''),
                                base_metal_thickness_p1: String(row.baseMetalThicknessPart1 || ''),
                                base_metal_thickness_p2: String(row.baseMetalThicknessPart2 || ''),
                                base_metal_spec_p1: String(row.baseMetalSpecPart1 || ''),
                                base_metal_spec_p2: String(row.baseMetalSpecPart2 || ''),
                                consumable: String(row.consumable || ''),
                                wps_pqr_no: String(row.wpsNoPqrNo || ''),
                                process: String(row.process || ''),
                                impact_test: String(row.impactTest || ''),
                                back_chip_req: row.backChipReq === 'yes' ? true : (row.backChipReq === 'no' ? false : null),
                                pwht: row.pwht === 'yes' ? true : (row.pwht === 'no' ? false : null),
                                rt: row.rt === 'yes' ? true : (row.rt === 'no' ? false : null),
                                pt: row.pt === 'yes' ? true : (row.pt === 'no' ? false : null),
                                remarks: String(row.remarks || '')
                            }))
                        });
                    }
                });
                stats.created++;
            } catch (err) {
                console.error(`Error bulk creating plan for job ${report.msn}:`, err);
                stats.failed++;
            }
        }

        Audit.insert({
            req,
            company_id,
            user_id,
            action: 'created',
            module: 'Weld Joint Plan',
            description: `Bulk created ${stats.created} Weld Joint Plans`,
            metadata: { weld_joint_plan_count: stats.created },
        });

        res.status(201).json({
            success: true,
            message: `Bulk creation complete. Created: ${stats.created}, Failed: ${stats.failed}`,
            data: stats
        });

    } catch (error) {
        console.error('Bulk create weld joint plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

async function requestModification(req, res) {
    try {
        const { jointId, stage, reason } = req.body;
        const user_id = req.user.userid || req.user.id;

        if (!jointId || !stage || !reason) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const request = await prisma.weld_stage_modification_request.create({
            data: {
                weld_joint_id: jointId,
                stage_name: stage,
                requested_by: user_id,
                reason,
                status: 'pending'
            },
            include: {
                weld_joint: {
                    include: {
                        weld_joint_plan: {
                            include: { job: true }
                        }
                    }
                },
                requester: true
            }
        });

        // Trigger email notification to HODs
        try {
            const emailService = require('../../services/email.service.js');
            const { generateModificationRequestEmail } = require('../../templates/weld-joint.template.js');

            // Find HODs for the department
            const hods = await prisma.department_hod.findMany({
                where: { department_id: request.weld_joint.weld_joint_plan.job.department_id },
                include: { user: true }
            });

            if (hods.length > 0) {
                const hodEmails = hods.map(h => h.user.email).filter(Boolean);
                if (hodEmails.length > 0) {
                    const emailContent = generateModificationRequestEmail({
                        joint_no: request.weld_joint.joint_no,
                        stage: request.stage_name,
                        requesterName: request.requester.name,
                        reason: request.reason
                    });
                    emailService.sendEmail({
                        to: hodEmails.join(','),
                        subject: `New Modification Request for Joint ${request.weld_joint.joint_no}`,
                        html: emailContent
                    }).catch(err => console.error('Background email failed:', err));
                }
            }
        } catch (emailError) {
            console.error('Failed to send modification request email:', emailError);
        }

        res.status(200).json({ success: true, message: 'Modification request submitted successfully', data: request });
    } catch (error) {
        console.error('Request modification error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

async function approveModification(req, res) {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'approve' or 'reject'
        const user_id = req.user.userid || req.user.id;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        // Check if the user is an HOD
        const hodCheck = await prisma.department_hod.findFirst({
            where: { user_id }
        });

        if (!hodCheck) {
            return res.status(403).json({ success: false, message: 'Only HODs can approve modification requests' });
        }

        const request = await prisma.weld_stage_modification_request.findUnique({ where: { id } });
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.weld_stage_modification_request.update({
                where: { id },
                data: {
                    status: action === 'approve' ? 'approved' : 'rejected',
                    reviewed_by: user_id
                }
            });

            if (action === 'approve') {
                const activeStage = await tx.weld_joint_stage.findFirst({
                    where: {
                        weld_joint_id: request.weld_joint_id,
                        stage_name: request.stage_name,
                        is_active: true,
                        status: 'approved'
                    }
                });

                if (activeStage) {
                    await tx.weld_joint_stage.update({
                        where: { id: activeStage.id },
                        data: {
                            status: 'rejected',
                            rejected_at: new Date(),
                            remarks: `Modification Request Approved. Reason: ${request.reason}`
                        }
                    });
                }
            }
        });

        // Send email notification to requester
        try {
            const fullRequest = await prisma.weld_stage_modification_request.findUnique({
                where: { id },
                include: {
                    requester: true,
                    weld_joint: true,
                    reviewer: true
                }
            });

            if (fullRequest && fullRequest.requester.email) {
                const emailService = require('../../services/email.service.js');
                const { generateModificationActionEmail } = require('../../templates/weld-joint.template.js');

                const emailContent = generateModificationActionEmail({
                    joint_no: fullRequest.weld_joint.joint_no,
                    stage: fullRequest.stage_name,
                    action: action,
                    reason: fullRequest.reason,
                    reviewerName: fullRequest.reviewer?.name || 'HOD'
                });

                await emailService.sendEmail({
                    to: fullRequest.requester.email,
                    subject: `Modification Request ${action === 'approve' ? 'Approved' : 'Rejected'} for Joint ${fullRequest.weld_joint.joint_no}`,
                    html: emailContent
                });
            }
        } catch (emailError) {
            console.error('Failed to send modification action email:', emailError);
        }

        res.status(200).json({ success: true, message: `Modification ${action}d successfully` });
    } catch (error) {
        console.error('Approve modification error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

async function getPendingModifications(req, res) {
    try {
        const company_id = req.user.company_id;
        const requests = await prisma.weld_stage_modification_request.findMany({
            where: {
                status: 'pending',
                weld_joint: {
                    weld_joint_plan: {
                        company_id
                    }
                }
            },
            include: {
                weld_joint: {
                    include: {
                        weld_joint_plan: {
                            select: { weld_plan_no: true, job: { select: { job_number: true } } }
                        }
                    }
                },
                requester: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        console.error('Get pending modifications error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    getjobInfo, createWeldJointPlan, updateWeldJointPlan, getWeldJointPlans, getWeldJointPlanDetails, getWeldJoints,
    updateStageStatus,
    getAssignedWeldJoints,
    reviewStageStatus,
    bulkCreateWeldJointPlan,
    requestModification,
    approveModification,
    getPendingModifications
};
