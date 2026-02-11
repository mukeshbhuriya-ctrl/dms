const prisma = require('#prisma');

class WeldJointService {
    /**
     * Get All Weld Joints with Pagination, Filtering, and Sorting
     * @param {string} company_id 
     * @param {Object} params 
     * @returns {Object} { data, meta }
     */
    async findAll(company_id, params = {}) {
        const {
            page = 1,
            limit = 50,
            search = '',
            status = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = params;

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        // Build Where Clause
        const where = {
            weld_joint_plan: {
                company_id: company_id
            }
        };

        if (search) {
            where.OR = [
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
            ];
        }

        if (status) {
            // Status filter logic (complex due to multiple stages)
            // If status is 'completed', check s8_status (or last stage)
            // If status is 'pending', check if any stage is pending? 
            // Simplified: Filter by specific stage status if provided like 's1_status:pending'?
            // For now, let's assume status is a general search term or handle specific logic later.
            // A robust implementation might filter based on the 'current stage' concept.

            // For basic "Pending" vs "Completed"
            if (status === 'completed') {
                where.weld_joint_inspection = {
                    s8_status: 'approved' // Example for full completion
                };
            } else if (status === 'pending') {
                where.weld_joint_inspection = {
                    NOT: {
                        s8_status: 'approved'
                    }
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

        return {
            data: joints,
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
