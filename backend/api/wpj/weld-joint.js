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
                next_weld_plan_no: `SHR/job${job.job_number}/WTP/${nextSerial}`
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

/**
 * Get All Weld Joints API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getWeldJoints(req, res) {
    try {
        const company_id = req.user.company_id;

        const joints = await prisma.weld_joint.findMany({
            where: {
                weld_joint_plan: {
                    company_id: company_id
                }
            },
            include: {
                weld_joint_plan: {
                    include: {
                        job: {
                            select: {
                                job_number: true,
                                project_id: true,
                                equipement_name: true,
                                tag_number: true,
                                code: true,
                                customer: {
                                    select: {
                                        customer_name: true
                                    }
                                },
                                po: {
                                    select: {
                                        po_number: true
                                    }
                                }
                            }
                        },
                    }
                },
                weld_joint_inspection: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            message: 'Weld Joints fetched successfully',
            data: joints
        });
    } catch (error) {
        console.error('Get weld joints error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

/**
 * Update Stage Status API
 */
async function updateStageStatus(req, res) {
    try {
        const { jointId, stage, status, data, engineerId, role } = req.body; // role: 'PROD', 'QC', 'NDT'

        // Basic validation
        if (!jointId || !stage || !status) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Map stage to DB fields
        const stagePrefix = {
            'stage1': 's1',
            'stage2': 's2',
            'stage3': 's3',
            'stage4': 's4',
            'stage5': 's5',
            'stage6': 's6',
            'stage7': 's7'
        }[stage];

        if (!stagePrefix) {
            return res.status(400).json({ success: false, message: 'Invalid stage' });
        }

        // Construct update data
        const updateData = {
            [`${stagePrefix}_status`]: status,
        };

        if (data) {
            // For stages that have a data field (like s1_data, s7_data)
            if (stage === 'stage1' || stage === 'stage7') {
                updateData[`${stagePrefix}_data`] = data;
            }
            // Add other specific mappings if needed, e.g. welder_no for stage 3
            if (stage === 'stage3') {
                if (data.welderNo) updateData[`${stagePrefix}_welder_no`] = data.welderNo;
                if (data.weldingProcess) updateData[`${stagePrefix}_welding_process`] = data.weldingProcess;
            }
            // Stage 4 & 5 - Map assigned NDT Engineer
            if ((stage === 'stage4' || stage === 'stage5') && data.assignedNdtEngineerId) {
                updateData[`${stagePrefix}_ndt_eng_id`] = data.assignedNdtEngineerId;
            }
            // Map assigned QC Engineer for relevant stages
            if (data.assignedQcEngineerId) {
                updateData[`${stagePrefix}_qc_eng_id`] = data.assignedQcEngineerId;
            }
            // Stage 6 - Map Post RT/PT Status
            if (stage === 'stage6') {
                if (data.postRtStatus) updateData[`${stagePrefix}_post_rt_status`] = data.postRtStatus;
                if (data.postPtStatus) updateData[`${stagePrefix}_post_pt_status`] = data.postPtStatus;
            }
        }

        if (status === 'approved' || status === 'completed') {
            updateData[`${stagePrefix}_completed_at`] = new Date();
        }

        // Handle Engineer IDs based on role/stage
        // This is a simplified logic, can be expanded based on specific field names
        if (role === 'PROD') {
            updateData[`${stagePrefix}_prod_eng_id`] = engineerId;
        } else if (role === 'QC') {
            // Special handling for NDT stages (Stage 4 & 5) approved by QC Engineer
            if (stage === 'stage4' || stage === 'stage5') {
                updateData[`${stagePrefix}_ndt_eng_id`] = engineerId;
            } else {
                updateData[`${stagePrefix}_qc_eng_id`] = engineerId;
            }
        } else if (role === 'NDT') {
            updateData[`${stagePrefix}_ndt_eng_id`] = engineerId;
        }

        // Use upsert to create if not exists
        const inspection = await prisma.weld_joint_inspection.upsert({
            where: { weld_joint_id: jointId },
            update: updateData,
            create: {
                weld_joint_id: jointId,
                ...updateData
            }
        });

        res.status(200).json({ success: true, message: 'Stage status updated successfully', data: inspection });

    } catch (error) {
        console.error('Update stage status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

/**
 * Review Stage Status API - Separate endpoint for Approve/Reject to prevent data overwrite
 */
async function reviewStageStatus(req, res) {
    try {
        const { jointId, stage, status, engineerId, role } = req.body;

        if (!jointId || !stage || !status) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const stagePrefix = {
            'stage1': 's1', 'stage2': 's2', 'stage3': 's3',
            'stage4': 's4', 'stage5': 's5', 'stage6': 's6', 'stage7': 's7'
        }[stage];

        if (!stagePrefix) return res.status(400).json({ success: false, message: 'Invalid stage' });

        const updateData = {
            [`${stagePrefix}_status`]: status
        };

        if (status === 'approved') {
            updateData[`${stagePrefix}_completed_at`] = new Date();
        }

        // Handle Status Transition (e.g. Stage 1 Approved -> Move to Stage 2)
        // I need to update the parent weld_joint status.
        // Assuming linear progression:
        const nextStageMap = {
            'stage1': 'stage2', 'stage2': 'stage3', 'stage3': 'stage4',
            'stage4': 'stage5', 'stage5': 'stage6', 'stage6': 'stage7', 'stage7': 'completed'
        };

        let parentStatusUpdate = {};
        if (status === 'approved' && nextStageMap[stage]) {
            parentStatusUpdate = { status: nextStageMap[stage] };
        }
        // If rejected, usually stays in current stage or moves back? 
        // User didn't specify reject logic, but usually rejection keeps it in current stage or marks 'rejected'. 
        // Existing logic likely keeps it 'stageX' but sX_status becomes 'rejected'.

        // Update Inspection Table
        await prisma.weld_joint_inspection.update({
            where: { weld_joint_id: jointId },
            data: updateData
        });

        // NOT updating parent table as 'status' column does not exist on weld_joint.
        // The frontend and other logic seem to infer stage from weld_joint_inspection status.

        res.status(200).json({ success: true, message: `Stage ${status} successfully` });
    } catch (error) {
        console.error('Review stage error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * Get Assigned Weld Joints API - For QC/NDT Engineers
 * Retrieves only joints that have a pending stage assigned to the authenticated user.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAssignedWeldJoints(req, res) {
    try {
        const company_id = req.user.company_id;
        const user_id = req.user.id;

        const joints = await prisma.weld_joint.findMany({
            where: {
                weld_joint_plan: {
                    company_id: company_id
                },
                weld_joint_inspection: {
                    OR: [
                        { s1_status: 'pending', s1_qc_eng_id: user_id },
                        { s2_status: 'pending', s2_qc_eng_id: user_id },
                        { s3_status: 'pending', s3_qc_eng_id: user_id },
                        { s4_status: 'pending', s4_ndt_eng_id: user_id }, // Stage 4 is RT (NDT)
                        { s4_status: 'pending', s4_qc_eng_id: user_id },   // Fallback if generic QC field used
                        { s5_status: 'pending', s5_ndt_eng_id: user_id }, // Stage 5 is PT (NDT)
                        { s5_status: 'pending', s5_qc_eng_id: user_id },   // Fallback
                        { s6_status: 'pending', s6_qc_eng_id: user_id }
                    ]
                }
            },
            include: {
                weld_joint_plan: {
                    include: {
                        job: {
                            select: {
                                job_number: true,
                                project_id: true,
                                equipement_name: true,
                                tag_number: true,
                                code: true,
                                customer: {
                                    select: {
                                        customer_name: true
                                    }
                                },
                                po: {
                                    select: {
                                        po_number: true
                                    }
                                }
                            }
                        },
                    }
                },
                weld_joint_inspection: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Extract all User IDs to fetch names
        const userIds = new Set();
        joints.forEach(joint => {
            const insp = joint.weld_joint_inspection;
            if (insp) {
                // Collect IDs from all stages
                ['s1', 's2', 's3', 's4', 's5', 's6', 's7'].forEach(stage => {
                    if (insp[`${stage}_prod_eng_id`]) userIds.add(insp[`${stage}_prod_eng_id`]);
                    if (insp[`${stage}_qc_eng_id`]) userIds.add(insp[`${stage}_qc_eng_id`]);
                    if (insp[`${stage}_ndt_eng_id`]) userIds.add(insp[`${stage}_ndt_eng_id`]);
                });
            }
        });

        // Fetch User Names
        const users = await prisma.user.findMany({
            where: { id: { in: Array.from(userIds) } },
            select: { id: true, name: true }
        });

        const userMap = {};
        users.forEach(u => userMap[u.id] = u.name);

        // Inject Names into Joints
        const assignedJoints = joints.map(joint => {
            if (joint.weld_joint_inspection) {
                const insp = { ...joint.weld_joint_inspection };
                ['s1', 's2', 's3', 's4', 's5', 's6', 's7'].forEach(stage => {
                    if (insp[`${stage}_prod_eng_id`]) insp[`${stage}_prod_eng_name`] = userMap[insp[`${stage}_prod_eng_id`]];
                    if (insp[`${stage}_qc_eng_id`]) insp[`${stage}_qc_eng_name`] = userMap[insp[`${stage}_qc_eng_id`]];
                    if (insp[`${stage}_ndt_eng_id`]) insp[`${stage}_ndt_eng_name`] = userMap[insp[`${stage}_ndt_eng_id`]];
                });
                return { ...joint, weld_joint_inspection: insp };
            }
            return joint;
        });

        res.status(200).json({
            success: true,
            message: 'Assigned Weld Joints fetched successfully',
            data: assignedJoints
        });
    } catch (error) {
        console.error('Get assigned weld joints error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

module.exports = {
    getjobInfo, createWeldJointPlan, getWeldJointPlans, getWeldJointPlanDetails, getWeldJoints,
    updateStageStatus,
    getAssignedWeldJoints,
    reviewStageStatus
};