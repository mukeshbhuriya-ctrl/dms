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
        const { jointId, stage, status, data, engineerId, role, basicInfo } = req.body; // role: 'PROD', 'QC', 'NDT'

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
            'stage7': 's7',
            'stage8': 's8'
        }[stage];

        if (!stagePrefix) {
            return res.status(400).json({ success: false, message: 'Invalid stage' });
        }

        // Construct update data
        const updateData = {
            [`${stagePrefix}_status`]: status,
        };

        if (data) {
            // Save Stage Data (Nested JSON: { ab: { s1: ... }, cd: { s1: ... } })
            updateData[`${stagePrefix}_data`] = data;
        }

        // Handle Basic Info for data_json
        if (basicInfo) {
            const currentInspection = await prisma.weld_joint_inspection.findUnique({
                where: { weld_joint_id: jointId },
                select: { data_json: true }
            });

            const existingDataJson = currentInspection?.data_json || {};
            const newDataJson = { ...existingDataJson };

            // Merge Basic Info ({ ab: { ... }, cd: { ... } })
            // We assume basicInfo is structured as { ab: {...}, cd: {...} }
            ['ab', 'cd'].forEach(category => {
                if (basicInfo[category]) {
                    newDataJson[category] = {
                        ...(newDataJson[category] || {}),
                        ...basicInfo[category]
                    };
                }
            });

            updateData.data_json = newDataJson;
        }

        if (status === 'approved' || status === 'completed') {
            updateData[`${stagePrefix}_approved_at`] = new Date();
        }

        if (status === 'rejected') {
            updateData[`${stagePrefix}_rejected_at`] = new Date();
        }

        if (status === 'pending') {
            updateData[`${stagePrefix}_submitted_at`] = new Date();
        }

        // Handle Engineer IDs based on role/stage
        if (role === 'PROD') {
            updateData[`${stagePrefix}_prod_eng_id`] = engineerId;
        } else if (role === 'QC' || role === 'NDT') {
            // All non-PROD roles now write to qc_eng_id as per request
            // "update schema x_ndt_eng_id to x_qc_eng_id"
            updateData[`${stagePrefix}_qc_eng_id`] = engineerId;
        }

        // Map Assigned Engineers from data if present (for stages where PROD assigns NDT/QC)
        if (data) {
            // We need to look inside the nested structure { ab: { ... } }
            // This is a bit tricky as 'data' keys are dynamic ('ab', 'cd').
            // Helper to find assigned IDs in any category
            const findAssignedId = (key) => {
                if (data.ab && data.ab[key]) return data.ab[key];
                if (data.cd && data.cd[key]) return data.cd[key];
                // Check deeper if nested? The user struct used "s1" inside "ab"?
                // Previous user prompt: {ab: {s1: ...}}
                // So we might need to look deeper.
                // Let's check 'data.ab.s1' or 'data.ab' etc.
                const checkObj = (obj) => {
                    if (!obj) return null;
                    if (obj[key]) return obj[key];
                    // Check stage sub-key if exists
                    if (obj[stagePrefix] && obj[stagePrefix][key]) return obj[stagePrefix][key];
                    return null;
                };
                return checkObj(data.ab) || checkObj(data.cd);
            };

            const assignedNdt = findAssignedId('assignedNdtEngineerId');
            const assignedQc = findAssignedId('assignedQcEngineerId');

            // Map both assignedNdt and assignedQc to qc_eng_id column
            if (['stage4', 'stage5', 'stage6', 'stage7', 'stage8'].includes(stage)) {
                if (assignedNdt) updateData[`${stagePrefix}_qc_eng_id`] = assignedNdt;
                else if (assignedQc) updateData[`${stagePrefix}_qc_eng_id`] = assignedQc;
            } else {
                if (assignedQc) updateData[`${stagePrefix}_qc_eng_id`] = assignedQc;
            }
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
            'stage4': 's4', 'stage5': 's5', 'stage6': 's6', 'stage7': 's7', 'stage8': 's8'
        }[stage];

        if (!stagePrefix) return res.status(400).json({ success: false, message: 'Invalid stage' });

        const updateData = {
            [`${stagePrefix}_status`]: status
        };

        if (status === 'approved') {
            updateData[`${stagePrefix}_approved_at`] = new Date();
        } else if (status === 'rejected') {
            // Simply mark as rejected. The frontend will show "Open Stage X" for Prod to resubmit.
            // Do NOT rollback previous stages.
            updateData[`${stagePrefix}_rejected_at`] = new Date();
            // Optional: reset approved_at if it was approved before? safely yes.
            updateData[`${stagePrefix}_approved_at`] = null;
            // set status to 'rejected' which is passed in args.
        }

        // Handle Status Transition (e.g. Stage 1 Approved -> Move to Stage 2)
        // I need to update the parent weld_joint status.
        // Assuming linear progression:
        const nextStageMap = {
            'stage1': 'stage2', 'stage2': 'stage3', 'stage3': 'stage4',
            'stage4': 'stage5', 'stage5': 'stage6', 'stage6': 'stage7',
            'stage7': 'stage8', 'stage8': 'completed'
        };

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
                        { s4_status: 'pending', s4_qc_eng_id: user_id }, // Stage 4 is RT (now QC column)
                        { s5_status: 'pending', s5_qc_eng_id: user_id }, // Stage 5 is PT (now QC column)
                        { s6_status: 'pending', s6_qc_eng_id: user_id }, // Stage 6 (PWHT - RT) (now QC column)
                        { s7_status: 'pending', s7_qc_eng_id: user_id }, // Stage 7 (PWHT - PT) (now QC column)
                        { s8_status: 'pending', s8_qc_eng_id: user_id }, // Stage 8 (PWHT PT CD) (now QC column)
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
                ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].forEach(stage => {
                    if (insp[`${stage}_prod_eng_id`]) userIds.add(insp[`${stage}_prod_eng_id`]);
                    if (insp[`${stage}_qc_eng_id`]) userIds.add(insp[`${stage}_qc_eng_id`]);
                    // No ndt_eng_id anymore
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
                ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].forEach(stage => {
                    if (insp[`${stage}_prod_eng_id`]) insp[`${stage}_prod_eng_name`] = userMap[insp[`${stage}_prod_eng_id`]];
                    if (insp[`${stage}_qc_eng_id`]) insp[`${stage}_qc_eng_name`] = userMap[insp[`${stage}_qc_eng_id`]];
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