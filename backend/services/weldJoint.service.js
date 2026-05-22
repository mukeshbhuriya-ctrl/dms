const prisma = require('#prisma');
const WELD_STAGES_CONFIG = require('../config/weldStagesConfig');
const emailService = require('./email.service.js');
const userService = require('./user.service.js');
const NotificationService = require('./notification.service.js');

class WeldJointService {
    getStageConfig() {
        return WELD_STAGES_CONFIG;
    }

    async getReportNo(jointId) {
        // 1. Fetch joint with related plan and EXISTING report info
        const joint = await prisma.weld_joint.findUnique({
            where: { id: jointId },
            include: {
                weld_joint_plan: {
                    include: {
                        job: { select: { job_number: true } }
                    }
                },
                weld_joint_report_info: {
                    select: { report_no: true }
                }
            }
        });

        if (!joint || !joint.weld_joint_plan) return null;

        // 2. If report_no already exists in DB, return it
        if (joint.weld_joint_report_info?.report_no) {
            return joint.weld_joint_report_info.report_no;
        }

        // 3. Otherwise, calculate the standardized number
        const jobNo = joint.weld_joint_plan.job?.job_number || "000";
        const serialNo = joint.weld_joint_plan.serial_no || "000";
        const calculatedReportNo = `SHR/${jobNo}/${serialNo}`;

        // 4. Persist the calculated number to the database
        // Use upsert to handle case where weld_joint_report_info record might not exist yet
        await prisma.weld_joint_report_info.upsert({
            where: { weld_joint_id: jointId },
            update: { report_no: calculatedReportNo },
            create: { 
                weld_joint_id: jointId,
                report_no: calculatedReportNo
            }
        });

        return calculatedReportNo;
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
            rtStatus: dbData.rt_status,
            rtRemark: dbData.rt_remark,
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
            rt_status: camelData.rtStatus,
            rt_remark: camelData.rtRemark,
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
                
                // Prioritize active stage status or overwrite if not set
                if (stage.is_active || !insp[`${sKey}_status`] || insp[`${sKey}_status`] === 'pending') {
                    insp[`${sKey}_status`] = stage.status;
                }
                if (stage.production_engineer_id) {
                    insp[`${sKey}_production_engineer_id`] = stage.production_engineer_id;
                    if (userMap && userMap[stage.production_engineer_id]) insp[`${sKey}_prod_eng_name`] = userMap[stage.production_engineer_id];
                }
                if (stage.qc_engineer_id) {
                    insp[`${sPrefix}_qc_engineer_id`] = stage.qc_engineer_id;
                    if (userMap && userMap[stage.qc_engineer_id]) insp[`${sPrefix}_qc_eng_name`] = userMap[stage.qc_engineer_id];
                }
                insp[`${sPrefix}_submitted_at`] = stage.submitted_at;
                insp[`${sPrefix}_approved_at`] = stage.approved_at;
                insp[`${sPrefix}_rejected_at`] = stage.rejected_at;
                insp[`${sPrefix}_remarks`] = stage.remarks;
                insp[`${sPrefix}_qc_group_id`] = stage.qc_group_id;
                insp[`${sPrefix}_production_group_id`] = stage.production_group_id;

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
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        });

        if (!joint) return null;

        const userIds = new Set();
        joint.weld_joint_stages?.forEach(stage => {
            if (stage.production_engineer_id) userIds.add(stage.production_engineer_id);
            if (stage.qc_engineer_id) userIds.add(stage.qc_engineer_id);
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
                company_id: company_id,
                is_deleted: false
            }
        };

        const isAdminOrProd = roles.includes('ADMIN') || roles.includes('PRODUCTION_ENGINEER') || roles.includes('WELD_PLAN_ADMIN');
        const isQC = roles.includes('QC_ENGINEER') || roles.includes('NDT_ENGINEER');

        if (!isAdminOrProd && isQC) {
            // Fetch the groups this user belongs to
            const userGroups = await prisma.user_employee_group.findMany({
                where: { user_id: userId },
                select: { employee_group_id: true }
            });
            const groupIds = userGroups.map(ug => ug.employee_group_id);

            // Base criteria for QC: MUST be involved in at least one stage (historically or currently)
            // Or specifically filter based on the requested status.
            
            if (!status || status === 'all' || status === 'pending' || status === 'rejected') {
                where.weld_joint_stages = {
                    some: {
                        OR: [
                            { qc_engineer_id: userId },
                            { qc_group_id: { in: groupIds } }
                        ],
                        // For Pending/Rejected we only look at active stages
                        ...( (status === 'pending' || status === 'rejected') && { is_active: true } )
                    }
                };
            } else if (status === 'completed') {
                // For Completed, we look for stages they approved
                where.weld_joint_stages = {
                    some: {
                        qc_engineer_id: userId,
                        status: 'approved'
                    }
                };
            }
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
                // A joint is "Entirely Finished" if it has NO active stages and at least one approved stage
                where.weld_joint_stages = {
                    ...(where.weld_joint_stages || {}),
                    none: { is_active: true },
                    some: { 
                        ...(where.weld_joint_stages?.some || {}),
                        status: 'approved' 
                    }
                };
            } else if (status === 'pending') {
                where.weld_joint_stages = {
                    ...(where.weld_joint_stages || {}),
                    some: { 
                        ...(where.weld_joint_stages?.some || {}),
                        status: 'pending',
                        is_active: true
                    }
                };
            } else if (status === 'rejected') {
                where.weld_joint_stages = {
                    ...(where.weld_joint_stages || {}),
                    some: { 
                        ...(where.weld_joint_stages?.some || {}),
                        status: 'rejected',
                        is_active: true
                    }
                };
            }
        }

        // Column-based filters (Support multi-select)
        const { client, po, job, cat, msn } = params;

        const handleMultiFilter = (val) => {
            if (!val) return undefined;
            if (Array.isArray(val)) return { in: val };
            if (typeof val === 'string') {
                if (val.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) return { in: parsed };
                    } catch (e) { }
                }
                if (val.includes(',')) return { in: val.split(',').map(v => v.trim()) };
                return { equals: val, mode: 'insensitive' };
            }
            return { equals: val };
        };

        if (params.columnFilters) {
            const cFilters = typeof params.columnFilters === 'string' ? JSON.parse(params.columnFilters) : params.columnFilters;
            if (cFilters.client) {
                where.weld_joint_plan = { 
                    ...where.weld_joint_plan, 
                    job: { ...where.weld_joint_plan?.job, customer: { customer_name: handleMultiFilter(cFilters.client) } } 
                };
            }
            if (cFilters.po || cFilters.poNo) {
                where.weld_joint_plan = { 
                    ...where.weld_joint_plan, 
                    job: { ...where.weld_joint_plan?.job, po: { po_number: handleMultiFilter(cFilters.po || cFilters.poNo) } } 
                };
            }
            if (cFilters.job || cFilters.jointNo) {
                where.joint_no = handleMultiFilter(cFilters.job || cFilters.jointNo);
            }
            if (cFilters.cat || cFilters.jointCategory) {
                where.joint_type = handleMultiFilter(cFilters.cat || cFilters.jointCategory);
            }
            if (cFilters.msn || cFilters.msnNumber) {
                where.weld_joint_plan = { 
                    ...where.weld_joint_plan, 
                    job: { ...where.weld_joint_plan?.job, job_number: handleMultiFilter(cFilters.msn || cFilters.msnNumber) } 
                };
            }
            if (cFilters.is_active) {
                const activeStatus = Array.isArray(cFilters.is_active) ? cFilters.is_active : cFilters.is_active.split(',').map(v => v.trim());
                if (activeStatus.length === 1) {
                    where.weld_joint_plan.is_active = activeStatus[0] === 'true';
                } else if (activeStatus.length > 1) {
                    // If both true and false are selected, effectively no filter on is_active is needed
                    // But we can explicitly allow both if we really wanted to. 
                    // Prisma doesn't support 'in' for Booleans.
                }
            }
        }

        if (client) {
            where.weld_joint_plan = { 
                ...where.weld_joint_plan, 
                job: { ...where.weld_joint_plan?.job, customer: { customer_name: handleMultiFilter(client) } } 
            };
        }
        if (po) {
            where.weld_joint_plan = { 
                ...where.weld_joint_plan, 
                job: { ...where.weld_joint_plan?.job, po: { po_number: handleMultiFilter(po) } } 
            };
        }
        if (job) {
            where.joint_no = handleMultiFilter(job);
        }
        if (cat) {
            where.joint_type = handleMultiFilter(cat);
        }
        if (msn) {
            where.weld_joint_plan = { 
                ...where.weld_joint_plan, 
                job: { ...where.weld_joint_plan?.job, job_number: handleMultiFilter(msn) } 
            };
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
                        },
                        orderBy: {
                            createdAt: 'asc'
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
        const joint = await prisma.weld_joint.findUnique({ 
            where: { id: jointId },
            include: { weld_joint_plan: true }
        });
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

        // 3. Find active stage or create new revision
        let stageRecord = await prisma.weld_joint_stage.findFirst({
            where: { weld_joint_id: jointId, stage_name: stage, is_active: true }
        });

        const updateData = {
            status,
            ...(production_engineer_id && { production_engineer_id }),
            ...(qc_engineer_id && { qc_engineer_id }),
            qc_group_id: stagePayload.qcGroupId || undefined,
            production_group_id: stagePayload.productionGroupId || undefined,
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
        if (status === 'pending' && (qc_engineer_id || stagePayload.qcGroupId)) {
            try {
                // Background trigger
                (async () => {
                    const prodUser = await prisma.user.findUnique({ where: { id: engineerId } });
                    const config = WELD_STAGES_CONFIG[joint.joint_type] || [];
                    const stageConfig = config.find(s => s.id === stage);
                    const stageLabel = stageConfig ? stageConfig.label : stage;

                    const emailDetails = {
                        jointNo: joint.joint_no,
                        stageLabel: stageLabel,
                        status: 'Pending Review',
                        engineerName: prodUser ? prodUser.name : 'Production Engineer',
                        actionType: 'submission'
                    };

                    const recipients = new Set();

                    // 1. Add specific QC Engineer if assigned
                    if (qc_engineer_id) {
                        const qcUser = await prisma.user.findUnique({ where: { id: qc_engineer_id } });
                        if (qcUser && qcUser.email) recipients.add(qcUser.email);
                    }

                    // 2. Add QC Group members if assigned
                    if (stagePayload.qcGroupId) {
                        const groupMembers = await prisma.user_employee_group.findMany({
                            where: { employee_group_id: stagePayload.qcGroupId },
                            include: { user: true }
                        });
                        groupMembers.forEach(member => {
                            if (member.user && member.user.email) recipients.add(member.user.email);
                        });
                    }

                    // Send email to all resolved recipients
                    const toArray = Array.from(recipients);
                    if (toArray.length > 0) {
                        await emailService.sendWeldStageNotification(toArray, emailDetails);
                    }

                    // Send System Notifications
                    if (qc_engineer_id) {
                        await NotificationService.createNotification({
                            company_id: joint.weld_joint_plan.company_id,
                            user_id: qc_engineer_id,
                            title: 'New Weld Stage Assigned',
                            message: `Joint ${joint.joint_no} - ${stageLabel} requires inspection.`,
                            action_path: '/view-weldingjoints',
                            action_params: { joint_id: jointId }
                        });
                    } else if (stagePayload.qcGroupId) {
                        await NotificationService.broadcastToQcGroup({
                            company_id: joint.weld_joint_plan.company_id,
                            group_id: stagePayload.qcGroupId,
                            title: 'New Weld Stage Assigned',
                            message: `Joint ${joint.joint_no} - ${stageLabel} requires inspection.`,
                            action_path: '/view-weldingjoints',
                            action_params: { joint_id: jointId }
                        });
                    }
                })().catch(err => console.error("Email notification background error:", err));
            } catch (err) {
                console.error("Weld Stage Submission Email Error:", err);
            }
        } else if ((status === 'approved' || status === 'rejected') && stageRecord.production_engineer_id) {
            try {
                (async () => {
                    const prodUser = await prisma.user.findUnique({ where: { id: stageRecord.production_engineer_id } });
                    const actionUser = await prisma.user.findUnique({ where: { id: engineerId } });
                    const config = WELD_STAGES_CONFIG[joint.joint_type] || [];
                    const stageConfig = config.find(s => s.id === stage);
                    const stageLabel = stageConfig ? stageConfig.label : stage;

                    if (prodUser && prodUser.email) {
                        await emailService.sendWeldStageNotification(prodUser.email, {
                            jointNo: joint.joint_no,
                            stageLabel: stageLabel,
                            status: status,
                            engineerName: actionUser ? actionUser.name : (role || 'QC Engineer'),
                            actionType: 'review'
                        });
                    }

                    // System Notification
                    await NotificationService.createNotification({
                        company_id: joint.weld_joint_plan.company_id,
                        user_id: stageRecord.production_engineer_id,
                        severity: status === 'approved' ? 'success' : 'warning',
                        title: status === 'approved' ? 'Weld Stage Approved' : 'Weld Stage Rejected',
                        message: `Joint ${joint.joint_no} - ${stageLabel} has been ${status}.`,
                        action_path: '/view-weldingjoints',
                        action_params: { joint_id: jointId }
                    });
                })().catch(err => console.error("Email notification background error:", err));
            } catch (err) {
                console.error("Weld Stage Review Email Error in updateStatus:", err);
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
        if (stageRecord && stageRecord.qc_group_id) {
            const isMember = await prisma.user_employee_group.findFirst({
                where: {
                    user_id: engineerId,
                    employee_group_id: stageRecord.qc_group_id
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
                    qc_engineer_id: role === 'QC' || role === 'NDT' ? engineerId : undefined,
                    ...(status === 'approved' && { approved_at: new Date() }),
                    ...(status === 'rejected' && { rejected_at: new Date(), is_active: false }),
                },
                include: { weld_joint: { include: { weld_joint_plan: true } } }
            });
        } else {
            const updateData = { 
                status, 
                remarks,
                qc_engineer_id: role === 'QC' || role === 'NDT' ? engineerId : undefined
            };
            if (status === 'approved') updateData.approved_at = new Date();
            else if (status === 'rejected') {
                updateData.rejected_at = new Date();
                updateData.is_active = false; // Freeze rejection into history
            }

            stageRecord = await prisma.weld_joint_stage.update({
                where: { id: stageRecord.id },
                data: updateData,
                include: { weld_joint: { include: { weld_joint_plan: true } } }
            });
        }

        // Send notification to Production Engineer (approving/rejecting)
        if ((status === 'approved' || status === 'rejected') && stageRecord.production_engineer_id) {
            try {
                (async () => {
                    const prodUser = await prisma.user.findUnique({ where: { id: stageRecord.production_engineer_id } });
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

                    // System Notification
                    await NotificationService.createNotification({
                        company_id: stageRecord.weld_joint.weld_joint_plan.company_id,
                        user_id: stageRecord.production_engineer_id,
                        severity: status === 'approved' ? 'success' : 'warning',
                        title: status === 'approved' ? 'Weld Stage Approved' : 'Weld Stage Rejected',
                        message: `Joint ${stageRecord.weld_joint.joint_no} - ${stageLabel} has been ${status}.`,
                        action_path: '/view-weldingjoints',
                        action_params: { joint_id: jointId }
                    });
                })().catch(err => console.error("Email notification background error:", err));
            } catch (err) {
                console.error("Weld Stage Review Email Error:", err);
            }
        }

        return stageRecord;
    }

    async getWeldJointPlans(company_id, params = {}) {
        const { 
            page = 1, limit = 50, search = '', sortBy = 'createdAt', sortOrder = 'desc',
            columnFilters 
        } = params;
        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const where = { 
            company_id: company_id,
            is_deleted: false
        };

        if (columnFilters) {
            const cFilters = typeof columnFilters === 'string' ? JSON.parse(columnFilters) : columnFilters;
            if (cFilters.is_active) {
                const activeStatus = Array.isArray(cFilters.is_active) ? cFilters.is_active : cFilters.is_active.split(',').map(v => v.trim());
                if (activeStatus.length === 1) {
                    where.is_active = activeStatus[0] === 'true';
                }
            }
            if (cFilters.msn) {
                where.job = { job_number: { contains: cFilters.msn, mode: 'insensitive' } };
            }
        }

        if (search) {
            where.AND = [
                {
                    OR: [
                        { weld_plan_no: { contains: search, mode: 'insensitive' } },
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
                    ]
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

    async getActiveFilters(company_id) {
        try {
            // Fetch unique values from related tables
            const jobs = await prisma.job.findMany({
                where: { company_id },
                select: {
                    job_number: true,
                    customer: { select: { customer_name: true } },
                    po: { select: { po_number: true } }
                }
            });

            const joints = await prisma.weld_joint.findMany({
                where: { weld_joint_plan: { company_id } },
                select: { 
                    joint_type: true, 
                    joint_no: true,
                    weld_joint_plan: {
                        select: {
                            job: {
                                select: {
                                    job_number: true,
                                    customer: { select: { customer_name: true } },
                                    po: { select: { po_number: true } }
                                }
                            }
                        }
                    }
                }
            });

            const records = joints.map(j => ({
                client: j.weld_joint_plan?.job?.customer?.customer_name,
                po: j.weld_joint_plan?.job?.po?.po_number,
                msn: j.weld_joint_plan?.job?.job_number,
                joint_no: j.joint_no,
                cat: j.joint_type
            }));

            return { records };
        } catch (error) {
            console.error("Get Active Filters error:", error);
            throw error;
        }
    }

    async getJointTrail(jointId) {
        if (!jointId) throw new Error("Joint ID is required");

        const trail = await prisma.weld_joint_stage.findMany({
            where: { weld_joint_id: jointId },
            include: {
                prod_eng: { select: { id: true, name: true } },
                qc_eng: { select: { id: true, name: true } },
                qc_group: { select: { id: true, name: true } }, production_group: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        return trail;
    }

    async togglePlanStatus(company_id, id) {
        const plan = await prisma.weld_joint_plan.findFirst({
            where: { id, company_id },
            select: { is_active: true }
        });
        if (!plan) throw new Error('Weld Joint Plan not found');

        return await prisma.weld_joint_plan.update({
            where: { id },
            data: { is_active: !plan.is_active }
        });
    }

    async archivePlan(company_id, id) {
        const plan = await prisma.weld_joint_plan.findFirst({ where: { id, company_id } });
        if (!plan) throw new Error('Weld Joint Plan not found');

        return await prisma.weld_joint_plan.update({
            where: { id },
            data: { is_deleted: true }
        });
    }
}

module.exports = new WeldJointService();


