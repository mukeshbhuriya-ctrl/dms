const prisma = require('#prisma');

class WeldJointService {
    /**
     * Get All Weld Joints with Pagination, Filtering, and Sorting
     * @param {string} company_id 
     * @param {Object} params 
     * @returns {Object} { data, meta }
     */
    async findAll(company_id, params = {}, userContext = {}) {
        const {
            page = 1,
            limit = 50,
            search = '',
            status = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = params;
        const { userId, roles = [] } = userContext;

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        // Build Where Clause
        const where = {
            weld_joint_plan: {
                company_id: company_id
            }
        };

        // Role-based Access Control
        const isAdminOrProd = roles.includes('ADMIN') || roles.includes('PRODUCTION_ENGINEER') || roles.includes('WELD_PLAN_ADMIN');
        const isQC = roles.includes('QC_ENGINEER') || roles.includes('NDT_ENGINEER');

        if (!isAdminOrProd && isQC) {
            // Filter for joints where the user is assigned as QC in ANY stage
            where.weld_joint_inspection = {
                OR: [
                    { s1_qc_eng_id: userId },
                    { s2_qc_eng_id: userId },
                    { s3_qc_eng_id: userId },
                    { s4_qc_eng_id: userId },
                    { s5_qc_eng_id: userId },
                    { s6_qc_eng_id: userId },
                    { s7_qc_eng_id: userId },
                    { s8_qc_eng_id: userId },
                ]
            };
        }

        if (search) {
            where.AND = {
                OR: [
                    { joint_no: { contains: search, mode: 'insensitive' } },
                    {
                        weld_joint_plan: {
                            OR: [
                                { weld_plan_no: { contains: search, mode: 'insensitive' } },
                                {
                                    job: {
                                        OR: [
                                            { job_number: { contains: search, mode: 'insensitive' } },
                                            { equipement_name: { contains: search, mode: 'insensitive' } },
                                            {
                                                customer: {
                                                    customer_name: { contains: search, mode: 'insensitive' }
                                                }
                                            },
                                            {
                                                po: {
                                                    po_number: { contains: search, mode: 'insensitive' }
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                ]
            };
        }

        if (status) {
            if (status === 'completed') {
                where.weld_joint_inspection = {
                    ...where.weld_joint_inspection,
                    s8_status: 'approved'
                };
            } else if (status === 'pending') {
                where.weld_joint_inspection = {
                    ...where.weld_joint_inspection,
                    NOT: { s8_status: 'approved' }
                };
            }
        }

        // Execute Query
        const [joints, total] = await Promise.all([
            prisma.weld_joint.findMany({
                where,
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
                    [sortBy]: sortOrder
                },
                skip,
                take
            }),
            prisma.weld_joint.count({ where })
        ]);

        // Inject Names Logic (Reused from getAssignedWeldJoints logic if needed, but existing findAll didn't do it)
        // Existing findAll returned raw data. The user might expect names if they were used to getAssignedWeldJoints.
        // However, the original getWeldJoints (Admin view) didn't seem to inject names in the controller.
        // Let's check view_welding_joints.jsx to see if it relies on injected names.
        // Step 1774 showing getAssignedWeldJoints DID inject names.
        // If I use this service for QC, I should probably inject names too, or frontend will show IDs?
        // Let's check the frontend.

        // ... (I will return data as is for now, if names are missing I might need to add injection logic here too)
        // Actually, for consistency, I should probably inject names if the frontend uses them.
        // Let's add name injection from getAssignedWeldJoints logic here.

        const userIds = new Set();
        joints.forEach(joint => {
            const insp = joint.weld_joint_inspection;
            if (insp) {
                ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].forEach(stage => {
                    if (insp[`${stage}_prod_eng_id`]) userIds.add(insp[`${stage}_prod_eng_id`]);
                    if (insp[`${stage}_qc_eng_id`]) userIds.add(insp[`${stage}_qc_eng_id`]);
                });
            }
        });

        let userMap = {};
        if (userIds.size > 0) {
            const users = await prisma.user.findMany({
                where: { id: { in: Array.from(userIds) } },
                select: { id: true, name: true }
            });
            users.forEach(u => userMap[u.id] = u.name);
        }

        const enrichedJoints = joints.map(joint => {
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

        return {
            data: enrichedJoints,
            meta: {
                total,
                page: parseInt(page),
                limit: take,
                totalPages: Math.ceil(total / take)
            }
        };
    }
    /**
     * Update Stage Status
     * @param {Object} payload 
     * @returns {Object} Updated inspection record
     */
    async updateStatus(payload) {
        const { jointId, stage, status, data, engineerId, role, basicInfo } = payload;

        if (!jointId || !stage || !status) {
            throw new Error('Missing required fields');
        }

        const stagePrefix = {
            'stage1': 's1', 'stage2': 's2', 'stage3': 's3',
            'stage4': 's4', 'stage5': 's5', 'stage6': 's6',
            'stage7': 's7', 'stage8': 's8'
        }[stage];

        if (!stagePrefix) {
            throw new Error('Invalid stage');
        }

        const updateData = {
            [`${stagePrefix}_status`]: status,
        };

        if (data) {
            updateData[`${stagePrefix}_data`] = data;
        }

        if (basicInfo) {
            const currentInspection = await prisma.weld_joint_inspection.findUnique({
                where: { weld_joint_id: jointId },
                select: { data_json: true }
            });

            const existingDataJson = currentInspection?.data_json || {};
            const newDataJson = { ...existingDataJson };

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
        } else if (status === 'rejected') {
            updateData[`${stagePrefix}_rejected_at`] = new Date();
        } else if (status === 'pending') {
            updateData[`${stagePrefix}_submitted_at`] = new Date();
        }

        if (role === 'PROD') {
            updateData[`${stagePrefix}_prod_eng_id`] = engineerId;
        } else if (role === 'QC' || role === 'NDT') {
            updateData[`${stagePrefix}_qc_eng_id`] = engineerId;
        }

        if (data) {
            const findAssignedId = (key) => {
                if (data.ab && data.ab[key]) return data.ab[key];
                if (data.cd && data.cd[key]) return data.cd[key];
                if (data.f && data.f[key]) return data.f[key];

                const checkObj = (obj) => {
                    if (!obj) return null;
                    if (obj[key]) return obj[key];
                    if (obj[stagePrefix] && obj[stagePrefix][key]) return obj[stagePrefix][key];
                    return null;
                };
                return checkObj(data.ab) || checkObj(data.cd) || checkObj(data.f);
            };

            const assignedNdt = findAssignedId('assignedNdtEngineerId');
            const assignedQc = findAssignedId('assignedQcEngineerId');

            if (['stage4', 'stage5', 'stage6', 'stage7', 'stage8'].includes(stage)) {
                if (assignedNdt) updateData[`${stagePrefix}_qc_eng_id`] = assignedNdt;
                else if (assignedQc) updateData[`${stagePrefix}_qc_eng_id`] = assignedQc;
            } else {
                if (assignedQc) updateData[`${stagePrefix}_qc_eng_id`] = assignedQc;
            }
        }

        return await prisma.weld_joint_inspection.upsert({
            where: { weld_joint_id: jointId },
            update: updateData,
            create: {
                weld_joint_id: jointId,
                ...updateData
            }
        });
    }

    /**
     * Review Stage Status
     * @param {Object} payload 
     * @returns {Object} Updated inspection record
     */
    async reviewStatus(payload) {
        const { jointId, stage, status, engineerId, role } = payload; // data not typically used in review only status

        if (!jointId || !stage || !status) {
            throw new Error('Missing required fields');
        }

        const stagePrefix = {
            'stage1': 's1', 'stage2': 's2', 'stage3': 's3',
            'stage4': 's4', 'stage5': 's5', 'stage6': 's6',
            'stage7': 's7', 'stage8': 's8'
        }[stage];

        if (!stagePrefix) {
            throw new Error('Invalid stage');
        }

        const updateData = {
            [`${stagePrefix}_status`]: status
        };

        if (status === 'approved') {
            updateData[`${stagePrefix}_approved_at`] = new Date();
        } else if (status === 'rejected') {
            updateData[`${stagePrefix}_rejected_at`] = new Date();
        }

        if (role === 'QC' || role === 'NDT') {
            // Ensure reviewer ID is captured if needed, currently schema mainly tracks assignee
            // But usually reviewer IS the assignee.
            // potentially update qc_eng_id if it was null?
            // tailored based on existing code which doesn't seem to enforce id update on review unless explicit
        }

        // Existing logic for reviewStageStatus in weld-joint.js was minimal, just status update
        // We will keep it simple.

        return await prisma.weld_joint_inspection.update({
            where: { weld_joint_id: jointId },
            data: updateData
        });
    }
    /**
     * Get Weld Joint Plans with Pagination, Filtering, and Sorting
     * @param {string} company_id 
     * @param {Object} params 
     * @returns {Object} { data, meta }
     */
    async getWeldJointPlans(company_id, params = {}) {
        const {
            page = 1,
            limit = 50,
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = params;

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const where = {
            company_id: company_id
        };

        if (search) {
            where.OR = [
                {
                    job: {
                        OR: [
                            { job_number: { contains: search, mode: 'insensitive' } },
                            { project_id: { contains: search, mode: 'insensitive' } },
                            { equipement_name: { contains: search, mode: 'insensitive' } },
                            {
                                customer: {
                                    customer_name: { contains: search, mode: 'insensitive' }
                                }
                            }
                        ]
                    }
                }
            ];
        }

        const [plans, total] = await Promise.all([
            prisma.weld_joint_plan.findMany({
                where,
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
                    [sortBy]: sortOrder
                },
                skip,
                take
            }),
            prisma.weld_joint_plan.count({ where })
        ]);

        return {
            data: plans,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = new WeldJointService();
