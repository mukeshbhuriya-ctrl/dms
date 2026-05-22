const prisma = require('#prisma');

class WeldJointService {

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
                insp[`${sKey}_status`] = stage.status;
                if (stage.production_engineer_id) {
                    insp[`${sKey}_production_engineer_id`] = stage.production_engineer_id;
                    if (userMap && userMap[stage.production_engineer_id]) insp[`${sKey}_prod_eng_name`] = userMap[stage.production_engineer_id];
                }
                if (stage.qc_engineer_id) {
                    insp[`${sKey}_qc_engineer_id`] = stage.qc_engineer_id;
                    if (userMap && userMap[stage.qc_engineer_id]) insp[`${sKey}_qc_eng_name`] = userMap[stage.qc_engineer_id];
                }
                insp[`${sKey}_submitted_at`] = stage.submitted_at;
                insp[`${sKey}_approved_at`] = stage.approved_at;
                insp[`${sKey}_rejected_at`] = stage.rejected_at;

                // Reconstruct sX_data
                let innerData = this._mapDbStageDataToCamelCase(stage.stage_data);

                // Also reconstruct inspectionRows (stage_rows) if they exist
                if (stage.stage_rows && stage.stage_rows.length > 0) {
                    innerData.inspectionRows = stage.stage_rows.map(row => ({
                        id: row.sr_no,         // Critical for frontend row matching
                        name: row.row_name,    // Critical for frontend bindings
                        value: row.row_value || ""
                    })).sort((a, b) => a.id - b.id);
                }

                insp[`${sKey}_data`] = JSON.stringify({
                    [catKey]: {
                        [sKey]: innerData
                    }
                });
            });
        }

        // Initialize empty pending stages to mimic old behavior if needed
        ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'].forEach(s => {
            if (!insp[`${s}_status`]) insp[`${s}_status`] = 'pending';
        });

        return insp;
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
            // Relational equivalent: find joints where THIS user is assigned to ANY stage as qc_engineer_id
            where.weld_joint_stages = {
                some: {
                    qc_engineer_id: userId
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
                if (stage.production_engineer_id) userIds.add(stage.production_engineer_id);
                if (stage.qc_engineer_id) userIds.add(stage.qc_engineer_id);
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

        let production_engineer_id = undefined, qc_engineer_id = undefined;
        if (role === 'PROD') production_engineer_id = engineerId;
        else if (role === 'QC' || role === 'NDT') qc_engineer_id = engineerId;

        // Extract deep payload
        const sKey = stage.replace('stage', 's');
        let stagePayload = data?.[catKey]?.[sKey] || data?.[catKey] || data || {};

        // Assign QC if provided in payload
        if (stagePayload.qcEngineerId) qc_engineer_id = stagePayload.qcEngineerId;
        if (stagePayload.assignedNdtEngineerId) qc_engineer_id = stagePayload.assignedNdtEngineerId;

        // 3. Upsert stage
        const stageRecord = await prisma.weld_joint_stage.upsert({
            where: { weld_joint_id_stage_name: { weld_joint_id: jointId, stage_name: stage } },
            update: {
                status,
                ...(production_engineer_id && { production_engineer_id }),
                ...(qc_engineer_id && { qc_engineer_id }),
                qc_group_id: stagePayload.qcGroupId || undefined,
                production_group_id: stagePayload.productionGroupId || undefined,
                ...(submitted_at && { submitted_at }),
                ...(approved_at && { approved_at }),
                ...(rejected_at && { rejected_at }),
            },
            create: {
                weld_joint_id: jointId,
                stage_name: stage,
                status,
                production_engineer_id, qc_engineer_id, 
                qc_group_id: stagePayload.qcGroupId || undefined,
                production_group_id: stagePayload.productionGroupId || undefined,
                submitted_at, approved_at, rejected_at
            }
        });

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

                const rowsToInsert = stagePayload.inspectionRows.map(r => ({
                    weld_joint_stage_id: stageRecord.id,
                    sr_no: r.srNo,
                    row_name: r.rowName,
                    row_value: r.rowValue ? String(r.rowValue) : ""
                }));
                if (rowsToInsert.length > 0) {
                    await prisma.weld_joint_stage_row.createMany({ data: rowsToInsert });
                }
            }
        }

        return stageRecord;
    }

    async reviewStatus(payload) {
        const { jointId, stage, status, engineerId, role } = payload;
        if (!jointId || !stage || !status) throw new Error('Missing required fields');

        const updateData = { status };
        if (status === 'approved') updateData.approved_at = new Date();
        else if (status === 'rejected') updateData.rejected_at = new Date();

        return await prisma.weld_joint_stage.upsert({
            where: { weld_joint_id_stage_name: { weld_joint_id: jointId, stage_name: stage } },
            update: updateData,
            create: { // in case reviewing a stage that was somehow never saved gracefully
                weld_joint_id: jointId,
                stage_name: stage,
                status,
                qc_engineer_id: role === 'QC' || role === 'NDT' ? engineerId : undefined,
                ...(status === 'approved' && { approved_at: new Date() }),
                ...(status === 'rejected' && { rejected_at: new Date() }),
            }
        });
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


