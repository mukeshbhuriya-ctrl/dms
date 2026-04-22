const prisma = require('#prisma');

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
            tableRows
        } = req.body;

        const company_id = req.user.company_id;
        const user_id = req.user.id;

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
                }
            });

            // 2. Update/Create Joints
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
        const user_id = req.user.id;

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

module.exports = {
    getjobInfo, createWeldJointPlan, updateWeldJointPlan, getWeldJointPlans, getWeldJointPlanDetails, getWeldJoints,
    updateStageStatus,
    getAssignedWeldJoints,
    reviewStageStatus,
    bulkCreateWeldJointPlan
};