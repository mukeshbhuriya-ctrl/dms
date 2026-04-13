const prisma = require('#prisma');
const WELD_STAGES_CONFIG = require('../config/weldStagesConfig');
const emailService = require('./email.service.js');
const userService = require('./user.service.js');

class WeldJointService {
    getStageConfig() {
        return WELD_STAGES_CONFIG;
    }

    _mapDbStageDataToCamelCase(dbData) {
        if (!dbData) return {};
        return {
            materialIdMarks: dbData.material_id_marks,
            nozzleNumber: dbData.nozzle_number,
            tackWelder: dbData.tack_welder,
            visualInspection: dbData.visual_inspection,
            lSeamRt: dbData.l_seam_rt,
            nozzleSize: dbData.nozzle_size,
            totalLength: dbData.total_length,
            // Dual-key: welderNumber (canonical) + welderNo (AB Stage2/3 front-end reads this key)
            welderNumber: dbData.welder_number,
            welderNo: dbData.welder_number,
            overlayPt: dbData.overlay_pt,
            openingSize: dbData.opening_size,
            orientation: dbData.orientation,
            elevation: dbData.elevation,
            edgePreparation: dbData.edge_preparation,
            materialId: dbData.material_id,
            lSeamNdt: dbData.l_seam_ndt,
            cleaning: dbData.cleaning,
            grooveAngle: dbData.groove_angle,
            rootFace: dbData.root_face,
            rootGap: dbData.root_gap,
            projection: dbData.projection,
            pcdHole: dbData.pcd_hole,
            rfPad: dbData.rf_pad,
            filletSize: dbData.fillet_size,
            weldingProcess: dbData.welding_process,
            rfPadPneumatic: dbData.rf_pad_pneumatic,
            postRtStatus: dbData.post_rt_status,
            postPtStatus: dbData.post_pt_status,
            date: dbData.date,
            assignedNdtEngineerId: dbData.assigned_ndt_engineer_id,
        };
    }

    _mapCamelCaseToDbStageData(camelData) {
        if (!camelData) return {};
        // Strip undefined values manually or rely on Prisma.
        return {
            material_id_marks: camelData.materialIdMarks,
            nozzle_number: camelData.nozzleNumber,
            tack_welder: camelData.tackWelder,
            visual_inspection: camelData.visualInspection,
            l_seam_rt: camelData.lSeamRt,
            nozzle_size: camelData.nozzleSize,
            total_length: camelData.totalLength,
            welder_number: camelData.welderNumber || camelData.welderNo,
            overlay_pt: camelData.overlayPt,
            opening_size: camelData.openingSize,
            orientation: camelData.orientation,
            elevation: camelData.elevation,
            edge_preparation: camelData.edgePreparation,
            material_id: camelData.materialId,
            l_seam_ndt: camelData.lSeamNdt,
            cleaning: camelData.cleaning,
            groove_angle: camelData.grooveAngle,
            root_face: camelData.rootFace,
            root_gap: camelData.rootGap,
            projection: camelData.projection,
            pcd_hole: camelData.pcdHole,
            rf_pad: camelData.rfPad,
            fillet_size: camelData.filletSize,
            welding_process: camelData.weldingProcess,
            rf_pad_pneumatic: camelData.rfPadPneumatic,
            post_rt_status: camelData.postRtStatus,
            post_pt_status: camelData.postPtStatus,
            date: camelData.date,
            assigned_ndt_engineer_id: camelData.assignedNdtEngineerId,
        };
    }

    _reconstructMonolithicInspection(jointId, category, reportInfo, stages, userMap) {
        const insp = {
            id: jointId,
            weld_joint_id: jointId,
            data_json: null
        };

        const catKey = category ? category.toLowerCase() : 'f';

        if (reportInfo) {
            insp.data_json = JSON.stringify({
                [catKey]: {
                    reportNo: reportInfo.report_no,
                    tagNo: reportInfo.tag_no,
                    equipment: reportInfo.equipment,
                    projectsId: reportInfo.projects_id,
                    lindeDrgNo: reportInfo.linde_drg_no,
                    drgNo: reportInfo.drg_no,
                    code: reportInfo.code,
                    inspAgency: reportInfo.insp_agency
                }
            });
        }

        if (stages && stages.length > 0) {
            stages.forEach(stage => {
                const sKey = stage.stage_name.replace('stage', 's'); // "stage1" -> "s1"
                const sPrefix = sKey;
                insp[`${sKey}_status`] = stage.status;
                if (stage.prod_eng_id) {
                    insp[`${sKey}_prod_eng_id`] = stage.prod_eng_id;
                    if (userMap && userMap[stage.prod_eng_id]) insp[`${sKey}_prod_eng_name`] = userMap[stage.prod_eng_id];
                }
                if (stage.qc_eng_id) {
                    insp[`${sPrefix}_qc_eng_id`] = stage.qc_eng_id;
                    if (userMap && userMap[stage.qc_eng_id]) insp[`${sPrefix}_qc_eng_name`] = userMap[stage.qc_eng_id];
                }
                insp[`${sPrefix}_submitted_at`] = stage.submitted_at;
                insp[`${sPrefix}_approved_at`] = stage.approved_at;
                insp[`${sPrefix}_rejected_at`] = stage.rejected_at;
                insp[`${sPrefix}_remarks`] = stage.remarks;
                insp[`${sPrefix}_assigned_qc_group_id`] = stage.assigned_qc_group_id;

                // Reconstruct sX_data
                let innerData = this._mapDbStageDataToCamelCase(stage.stage_data);
                
                // Also reconstruct inspectionRows (stage_rows) if they exist
                if (stage.stage_rows && stage.stage_rows.length > 0) {
                    innerData.inspectionRows = stage.stage_rows.map(row => ({
                        id: row.sr_no,         // Critical for frontend row matching
                        name: row.row_name,    // Critical for frontend bindings
                        value: row.row_value || ""
                    })).sort((a,b) => a.id - b.id);
                }

                // Only the ACTIVE stage overwrites the canonical sX_data for the form
                if (stage.is_active) {
                    insp[`${sPrefix}_data`] = JSON.stringify({
                        [catKey]: {
                            [sPrefix]: innerData
                        }
                    });
                }
            });
        }

        // Initialize empty pending stages to mimic old behavior if needed
        ['s_bc', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'].forEach(s => {
            if (!insp[`${s}_status`]) insp[`${s}_status`] = 'pending';
        });

        return insp;
    }

    async getWeldJointWithInspection(jointId) {
        const joint = await prisma.weld_joint.findUnique({
            where: { id: jointId },
            include: {
                weld_joint_plan: {
                    include: {
                        job: {
                            select: {
                                job_number: true, project_id: true, equipement_name: true,
                                tag_number: true, code: true,
                                customer: { select: { customer_name: true } },
                                po: { select: { po_number: true } }
                            }
                        },
                    }
                },
                weld_joint_report_info: true,
                weld_joint_stages: {
                    include: {
                        stage_data: true,
                        stage_rows: true
                    }
                }
            }
        });

        if (!joint) return null;

        const userIds = new Set();
        joint.weld_joint_stages?.forEach(stage => {
            if (stage.prod_eng_id) userIds.add(stage.prod_eng_id);
            if (stage.qc_eng_id) userIds.add(stage.qc_eng_id);
        });

        let userMap = {};
        if (userIds.size > 0) {
            const users = await prisma.user.findMany({
                where: { id: { in: Array.from(userIds) } },
                select: { id: true, name: true }
            });
            users.forEach(u => userMap[u.id] = u.name);
        }

        const monolithicInsp = this._reconstructMonolithicInspection(
            joint.id, 
            joint.joint_type, 
            joint.weld_joint_report_info, 
            joint.weld_joint_stages, 
            userMap
        );

        const { weld_joint_report_info, weld_joint_stages, ...jointRest } = joint;
        return {
            ...jointRest,
            weld_joint_inspection: Object.keys(monolithicInsp).length > 2 ? monolithicInsp : null
        };
    }

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

        const where = {
            weld_joint_plan: {
                company_id: company_id
            }
        };

        const isAdminOrProd = roles.includes('ADMIN') || roles.includes('PRODUCTION_ENGINEER') || roles.includes('WELD_PLAN_ADMIN');
        const isQC = roles.includes('QC_ENGINEER') || roles.includes('NDT_ENGINEER');

        if (!isAdminOrProd && isQC) {
            // Fetch the groups this user belongs to
            const userGroups = await prisma.user_qc_group.findMany({
                where: { user_id: userId },
                select: { qc_group_id: true }
            });
            const groupIds = userGroups.map(ug => ug.qc_group_id);

            // Find joints where user is assigned individually OR via a group
            where.weld_joint_stages = {
                some: {
                    OR: [
                        { qc_eng_id: userId },
                        { assigned_qc_group_id: { in: groupIds } }
                    ],
                    is_active: true
                }
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
                where.weld_joint_stages = {
                    some: {
                        stage_name: 'stage8', // Fallback simple logic, but getStatus uses multiple. We will leave this simple or rely on FE.
                        status: 'approved'
                    }
                };
            } else if (status === 'pending') {
                 // Not fully completed. This is a rough estimation for DB level query.
            }
        }

        const [joints, total] = await Promise.all([
            prisma.weld_joint.findMany({
                where,
                include: {
                    weld_joint_plan: {
                        include: {
                            job: {
                                select: {
                                    job_number: true, project_id: true, equipement_name: true,
                                    tag_number: true, code: true,
                                    customer: { select: { customer_name: true } },
                                    po: { select: { po_number: true } }
                                }
                            },
                        }
                    },
                    weld_joint_report_info: true,
                    weld_joint_stages: {
                        include: {
                            stage_data: true,
                            stage_rows: true
                        }
                    }
                },
                orderBy: { [sortBy]: sortOrder },
                skip, take
            }),
            prisma.weld_joint.count({ where })
        ]);

        const userIds = new Set();
        joints.forEach(joint => {
            joint.weld_joint_stages?.forEach(stage => {
                if (stage.prod_eng_id) userIds.add(stage.prod_eng_id);
                if (stage.qc_eng_id) userIds.add(stage.qc_eng_id);
            });
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
            // Remove the relational arrays and inject the synthetic weld_joint_inspection object
            const monolithicInsp = this._reconstructMonolithicInspection(
                joint.id, 
                joint.joint_type, 
                joint.weld_joint_report_info, 
                joint.weld_joint_stages, 
                userMap
            );

            // Clean up DB output to match exactly old output
            const { weld_joint_report_info, weld_joint_stages, ...jointRest } = joint;
            
            return {
                ...jointRest,
                weld_joint_inspection: Object.keys(monolithicInsp).length > 2 ? monolithicInsp : null
            };
        });

        return {
            data: enrichedJoints,
            meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) }
        };
    }

    async updateStatus(payload) {
        const { jointId, stage, status, data, engineerId, role, basicInfo } = payload;
        if (!jointId || !stage || !status) throw new Error('Missing required fields');

        // First find the joint to get category
        const joint = await prisma.weld_joint.findUnique({ where: { id: jointId } });
        if (!joint) throw new Error('Joint not found');
        const catKey = joint.joint_type.toLowerCase();

        // 1. Update basic info if provided
        if (basicInfo && basicInfo[catKey]) {
            const info = basicInfo[catKey];
            await prisma.weld_joint_report_info.upsert({
                where: { weld_joint_id: jointId },
                update: {
                    report_no: info.reportNo || undefined,
                    tag_no: info.tagNo || undefined,
                    equipment: info.equipment || undefined,
                    projects_id: info.projectsId || undefined,
                    linde_drg_no: info.lindeDrgNo || undefined,
                    drg_no: info.drgNo || undefined,
                    code: info.code || undefined,
                    insp_agency: info.inspAgency || undefined
                },
                create: {
                    weld_joint_id: jointId,
                    report_no: info.reportNo,
                    tag_no: info.tagNo,
                    equipment: info.equipment,
                    projects_id: info.projectsId,
                    linde_drg_no: info.lindeDrgNo,
                    drg_no: info.drgNo,
                    code: info.code,
                    insp_agency: info.inspAgency
                }
            });
        }

        // 2. Prepare stage dates and roles
        let submitted_at = undefined, approved_at = undefined, rejected_at = undefined;
        if (status === 'approved' || status === 'completed') approved_at = new Date();
        else if (status === 'rejected') rejected_at = new Date();
        else if (status === 'pending') submitted_at = new Date();

        let prod_eng_id = undefined, qc_eng_id = undefined;
        if (role === 'PROD') prod_eng_id = engineerId;
        else if (role === 'QC' || role === 'NDT') qc_eng_id = engineerId;

        // Extract deep payload
        const sKey = stage.replace('stage', 's');
        let stagePayload = data?.[catKey]?.[sKey] || data?.[catKey] || data || {};

        // Assign QC if provided in payload
        if (stagePayload.assignedQcEngineerId) qc_eng_id = stagePayload.assignedQcEngineerId;
        if (stagePayload.assignedNdtEngineerId) qc_eng_id = stagePayload.assignedNdtEngineerId;

        // 3. Find active stage or create new revision
        let stageRecord = await prisma.weld_joint_stage.findFirst({
            where: { weld_joint_id: jointId, stage_name: stage, is_active: true }
        });

        const updateData = {
            status,
            ...(prod_eng_id && { prod_eng_id }),
            ...(qc_eng_id && { qc_eng_id }),
            assigned_qc_group_id: stagePayload.assignedQcGroupId || undefined,
            ...(submitted_at && { submitted_at }),
            ...(approved_at && { approved_at }),
            ...(rejected_at && { rejected_at }),
        };

        if (stageRecord) {
            stageRecord = await prisma.weld_joint_stage.update({
                where: { id: stageRecord.id },
                data: updateData
            });
        } else {
            stageRecord = await prisma.weld_joint_stage.create({
                data: {
                    weld_joint_id: jointId,
                    stage_name: stage,
                    ...updateData,
                    is_active: true
                }
            });
        }

        // 4. Update stage data details
        if (Object.keys(stagePayload).length > 0) {
            const mappedData = this._mapCamelCaseToDbStageData(stagePayload);
            // clean undefineds since Prisma upsert doesn't ignore undefined in create well sometimes
            Object.keys(mappedData).forEach(k => mappedData[k] === undefined && delete mappedData[k]);

            await prisma.weld_joint_stage_data.upsert({
                where: { weld_joint_stage_id: stageRecord.id },
                update: mappedData,
                create: {
                    weld_joint_stage_id: stageRecord.id,
                    ...mappedData
                }
            });

            // Handle inspectionRows (tabular dynamic rows)
            if (stagePayload.inspectionRows && Array.isArray(stagePayload.inspectionRows)) {
                // Delete existing first for pure replacement
                await prisma.weld_joint_stage_row.deleteMany({ where: { weld_joint_stage_id: stageRecord.id } });
                
                const rowsToInsert = stagePayload.inspectionRows.map((r, idx) => ({
                    weld_joint_stage_id: stageRecord.id,
                    sr_no: r.id || r.srNo || (idx + 1),
                    row_name: (r.name || r.rowName) ? String(r.name || r.rowName) : "",
                    row_value: (r.value || r.rowValue) ? String(r.value || r.rowValue) : ""
                }));
                if (rowsToInsert.length > 0) {
                    await prisma.weld_joint_stage_row.createMany({ data: rowsToInsert });
                }
            }
        }

        // 5. Send notification if status changed to pending (Production submitted to QC)
        if (status === 'pending' && qc_eng_id) {
            try {
                // Background trigger
                (async () => {
                    const qcUser = await prisma.user.findUnique({ where: { id: qc_eng_id } });
                    const prodUser = await prisma.user.findUnique({ where: { id: engineerId } });
                    const config = WELD_STAGES_CONFIG[joint.joint_type] || [];
                    const stageConfig = config.find(s => s.id === stage);
                    const stageLabel = stageConfig ? stageConfig.label : stage;

                    if (qcUser && qcUser.email) {
                        await emailService.sendWeldStageNotification(qcUser.email, {
                            jointNo: joint.joint_no,
                            stageLabel: stageLabel,
                            status: 'Pending Review',
                            engineerName: prodUser ? prodUser.name : 'Production Engineer',
                            actionType: 'submission'
                        });
                    }
                })().catch(err => console.error("Email notification background error:", err));
            } catch (err) {
                console.error("Weld Stage Submission Email Error:", err);
            }
        }

        return stageRecord;
    }

    async reviewStatus(payload) {
        const { jointId, stage, status, engineerId, role, remarks } = payload;
        if (!jointId || !stage || !status) throw new Error('Missing required fields');

        // 1. Find current active stage
        let stageRecord = await prisma.weld_joint_stage.findFirst({
            where: { weld_joint_id: jointId, stage_name: stage, is_active: true }
        });

        // 2. Authorization Check: Must be in the assigned QC Group
        if (stageRecord && stageRecord.assigned_qc_group_id) {
            const isMember = await prisma.user_qc_group.findUnique({
                where: {
                    user_id_qc_group_id: {
                        user_id: engineerId,
                        qc_group_id: stageRecord.assigned_qc_group_id
                    }
                }
            });
            
            if (!isMember) {
                // Admin bypass
                const user = await prisma.user.findUnique({
                    where: { id: engineerId },
                    include: { user_roles: { include: { role: true } } }
                });
                const isAdmin = user?.user_roles.some(ur => ur.role.name === 'ADMIN');
                if (!isAdmin) {
                    throw new Error('You are not authorized to review this stage. Only members of the assigned QC Group can perform this action.');
                }
            }
        }

        if (!stageRecord) {
            // Create a record if none active (safety fallback)
            stageRecord = await prisma.weld_joint_stage.create({
                data: {
                    weld_joint_id: jointId,
                    stage_name: stage,
                    status: status,
                    remarks: remarks,
                    qc_eng_id: role === 'QC' || role === 'NDT' ? engineerId : undefined,
                    ...(status === 'approved' && { approved_at: new Date() }),
                    ...(status === 'rejected' && { rejected_at: new Date(), is_active: false }),
                },
                include: { weld_joint: true }
            });
        } else {
            const updateData = { 
                status, 
                remarks,
                qc_eng_id: role === 'QC' || role === 'NDT' ? engineerId : undefined
            };
            if (status === 'approved') updateData.approved_at = new Date();
            else if (status === 'rejected') {
                updateData.rejected_at = new Date();
                updateData.is_active = false; // Freeze rejection into history
            }

            stageRecord = await prisma.weld_joint_stage.update({
                where: { id: stageRecord.id },
                data: updateData,
                include: { weld_joint: true }
            });
        }

        // Send notification to Production Engineer (approving/rejecting)
        if ((status === 'approved' || status === 'rejected') && stageRecord.prod_eng_id) {
            try {
                (async () => {
                    const prodUser = await prisma.user.findUnique({ where: { id: stageRecord.prod_eng_id } });
                    const qcUser = await prisma.user.findUnique({ where: { id: engineerId } });
                    const config = WELD_STAGES_CONFIG[stageRecord.weld_joint.joint_type] || [];
                    const stageConfig = config.find(s => s.id === stage);
                    const stageLabel = stageConfig ? stageConfig.label : stage;

                    if (prodUser && prodUser.email) {
                        await emailService.sendWeldStageNotification(prodUser.email, {
                            jointNo: stageRecord.weld_joint.joint_no,
                            stageLabel: stageLabel,
                            status: status,
                            engineerName: qcUser ? qcUser.name : 'QC Engineer',
                            actionType: 'review'
                        });
                    }
                })().catch(err => console.error("Email notification background error:", err));
            } catch (err) {
                console.error("Weld Stage Review Email Error:", err);
            }
        }

        return stageRecord;
    }

    async getWeldJointPlans(company_id, params = {}) {
        const { page = 1, limit = 50, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = params;
        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const where = { company_id: company_id };
        if (search) {
            where.OR = [
                {
                    job: {
                        OR: [
                            { job_number: { contains: search, mode: 'insensitive' } },
                            { project_id: { contains: search, mode: 'insensitive' } },
                            { equipement_name: { contains: search, mode: 'insensitive' } },
                            { customer: { customer_name: { contains: search, mode: 'insensitive' } } }
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
                            job_number: true, project_id: true, equipement_name: true,
                            customer: { select: { customer_name: true } }
                        }
                    },
                    weld_joints: {
                        select: {
                            joint_type: true
                        }
                    }
                },
                orderBy: { [sortBy]: sortOrder },
                skip, take
            }),
            prisma.weld_joint_plan.count({ where })
        ]);

        return { data: plans, meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) } };
    }
}

module.exports = new WeldJointService();
