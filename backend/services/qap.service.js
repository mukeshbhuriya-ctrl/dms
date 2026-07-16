const prisma = require('#prisma');
const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('#utils/upload');

const computeSerialNumbers = (items) => {
    if (!items || items.length === 0) return items;
    let mainCounter = 0;
    let subCounter = 0;

    return items.map((item) => {
        let sr_no = null;
        if (item.activity === "Pre-Inspection Meeting") {
            sr_no = "---";
        } else if (item.is_heading || item.is_root) {
            mainCounter++;
            subCounter = 0;
            sr_no = mainCounter.toString();
        } else {
            if (mainCounter > 0) {
                subCounter++;
                sr_no = `${mainCounter}.${subCounter}`;
            }
        }
        return { ...item, sr_no };
    });
};
const mapItemsForPrisma = (items) => {
    return computeSerialNumbers(items || []).map((item, index) => ({
        sort_order: index,
        sr_no: item.sr_no || null,
        is_heading: item.is_heading || false,
        is_root: item.is_root || false,
        heading_text: item.heading_text || null,
        parent_header_id: item.parent_header_id || null,
        activity: item.activity || null,
        type_method_check: item.type_method_check || null,
        extent: item.extent || null,
        acceptance_criteria: item.acceptance_criteria || null,
        reference_documents: item.reference_documents || null,
        verifying_document: item.verifying_document || null,
        shreno: item.shreno || null,
        client_tpia: item.client_tpia || null,
        remark: item.remark || null,
        dynamic_values: item.dynamic_values || {}
    }));
};

class QapService {
    async create(company_id, payload, files) {
        // FormData from frontend stringifies arrays/objects unconditionally
        const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
        payload.job_ids = parse(payload.job_ids);
        payload.msns = parse(payload.msns);
        payload.items = parse(payload.items);
        payload.dynamic_columns = parse(payload.dynamic_columns);

        let attachmentCreateData = [];
        if (payload.qap_type === 'CLIENT_APPROVED') {
            if (files && files.length > 0) {
                attachmentCreateData = files.map(f => ({
                    file_name: f.originalname,
                    file_url: f.filename,
                    file_type: f.mimetype,
                    file_size: f.size
                }));
            }
        }

        const {
            job_ids, msns, job_id, msn, client, po_no, po_date, project_id, equipment_name,
            tag_no, code, shreno_drg_no, customer_drg_no, dynamic_columns,
            items, report_no, status, remarks, qap_type, attachments
        } = payload;

        const jobsToProcess = Array.isArray(job_ids) && job_ids.length > 0 ? job_ids : [job_id];
        const msnList = Array.isArray(msns) && msns.length > 0 ? msns : [msn];

        if (!jobsToProcess.length || !jobsToProcess[0] || !msnList.length || !msnList[0]) {
            throw new Error("Job ID / MSN is required");
        }

        const createdRecords = [];

        for (let i = 0; i < jobsToProcess.length; i++) {
            const currentJobId = jobsToProcess[i];
            const currentMsn = msnList[i] || msnList[0];

            let finalReportNo = report_no;
            // Always auto-generate when cloning for multiple jobs
            if (!finalReportNo || finalReportNo === "Auto-generated on Submit" || jobsToProcess.length > 1) {
                const count = await prisma.quality_assurance_plan.count({ where: { job_id: currentJobId, company_id } });
                finalReportNo = `SHR/${currentMsn}/QAP/${count + 1}`;
            }

            const jobDetails = await prisma.job.findFirst({
                where: { id: currentJobId, company_id },
                select: { project_id: true, equipement_name: true, tag_number: true, code: true }
            });

            const currentProjectId = jobDetails?.project_id || project_id;
            const currentEquipmentName = jobDetails?.equipement_name || equipment_name;
            const currentTagNo = jobDetails?.tag_number || tag_no;
            const currentCode = code;

            const record = await prisma.quality_assurance_plan.create({
                data: {
                    company_id, job_id: currentJobId, msn: currentMsn, report_no: finalReportNo,
                    client, po_no, po_date, 
                    project_id: currentProjectId, 
                    equipment_name: currentEquipmentName,
                    tag_no: currentTagNo, 
                    code: currentCode, 
                    shreno_drg_no, customer_drg_no,
                    qap_type: qap_type || "INTERNAL",
                    status: status || "draft",
                    remarks,
                    dynamic_columns: dynamic_columns || [],
                    items: {
                        create: (qap_type === "CLIENT_APPROVED") ? [] : mapItemsForPrisma(items)
                    },
                    attachments: {
                        create: attachmentCreateData
                    }
                },
                include: { items: true, attachments: true }
            });
            createdRecords.push(record);
        }

        return jobsToProcess.length === 1 ? createdRecords[0] : createdRecords;
    }

    async update(company_id, id, payload, files) {
        // FormData from frontend stringifies arrays/objects unconditionally
        const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
        payload.job_ids = parse(payload.job_ids);
        payload.msns = parse(payload.msns);
        payload.items = parse(payload.items);
        payload.dynamic_columns = parse(payload.dynamic_columns);

        let attachmentCreateData = [];
        let deletedAttachmentIds = [];
        
        if (payload.deleted_attachment_ids) {
            try {
                deletedAttachmentIds = JSON.parse(payload.deleted_attachment_ids);
            } catch (e) {
                // Ignore parse errors
            }
        }

        if (payload.qap_type === 'CLIENT_APPROVED') {
            if (files && files.length > 0) {
                attachmentCreateData = files.map(f => ({
                    file_name: f.originalname,
                    file_url: f.filename,
                    file_type: f.mimetype,
                    file_size: f.size
                }));
            }
        }

        const {
            job_ids, msns, job_id, msn, client, po_no, po_date, project_id, equipment_name,
            tag_no, code, shreno_drg_no, customer_drg_no, dynamic_columns, items, status, remarks,
            qap_type, attachments
        } = payload;

        const jobsToProcess = Array.isArray(job_ids) && job_ids.length > 0 ? job_ids : [job_id];
        const msnList = Array.isArray(msns) && msns.length > 0 ? msns : [msn];

        if (!jobsToProcess.length || !jobsToProcess[0] || !msnList.length || !msnList[0]) {
            throw new Error("Job ID / MSN is required");
        }

        const mainJobId = jobsToProcess[0];
        const mainMsn = msnList[0];

        const mainJobDetails = await prisma.job.findFirst({
            where: { id: mainJobId, company_id },
            select: { project_id: true, equipement_name: true, tag_number: true, code: true }
        });

        // Clear existing items
        await prisma.quality_assurance_plan_item.deleteMany({ where: { qap_id: id } });

        // Update parent & insert new items
        const updatedRecord = await prisma.quality_assurance_plan.update({
            where: { id, company_id },
            data: {
                job_id: mainJobId, msn: mainMsn, client, po_no, po_date, 
                project_id: mainJobDetails?.project_id || project_id, 
                equipment_name: mainJobDetails?.equipement_name || equipment_name,
                tag_no: mainJobDetails?.tag_number || tag_no, 
                code: code, 
                shreno_drg_no, customer_drg_no,
                qap_type: qap_type || "INTERNAL",
                status: status,
                remarks,
                dynamic_columns: dynamic_columns || [],
                items: {
                    create: (qap_type === "CLIENT_APPROVED") ? [] : mapItemsForPrisma(items)
                },
                attachments: {
                    create: attachmentCreateData
                }
            },
            include: { items: true, attachments: true }
        });

        if (deletedAttachmentIds.length > 0) {
            const attachmentsToDelete = await prisma.quality_assurance_plan_attachment.findMany({
                where: {
                    id: { in: deletedAttachmentIds },
                    qap_id: id
                }
            });

            for (const att of attachmentsToDelete) {
                if (att.file_url) {
                    const filePath = path.join(UPLOAD_DIR, path.basename(att.file_url));
                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    } catch (e) {
                        console.error('Failed to delete file from filesystem:', e);
                    }
                }
            }

            await prisma.quality_assurance_plan_attachment.deleteMany({
                where: {
                    id: { in: deletedAttachmentIds },
                    qap_id: id
                }
            });
        }

        // Clone to other jobs if multi-select edit
        if (jobsToProcess.length > 1) {
            for (let i = 1; i < jobsToProcess.length; i++) {
                const currentJobId = jobsToProcess[i];
                const currentMsn = msnList[i] || msnList[0];

                const count = await prisma.quality_assurance_plan.count({ where: { job_id: currentJobId, company_id } });
                const finalReportNo = `SHR/${currentMsn}/QAP/${count + 1}`;

                const cloneJobDetails = await prisma.job.findFirst({
                    where: { id: currentJobId, company_id },
                    select: { project_id: true, equipement_name: true, tag_number: true, code: true }
                });

                await prisma.quality_assurance_plan.create({
                    data: {
                        company_id, job_id: currentJobId, msn: currentMsn, report_no: finalReportNo,
                        client, po_no, po_date, 
                        project_id: cloneJobDetails?.project_id || project_id, 
                        equipment_name: cloneJobDetails?.equipement_name || equipment_name,
                        tag_no: cloneJobDetails?.tag_number || tag_no, 
                        code: cloneJobDetails?.code || code, 
                        shreno_drg_no, customer_drg_no,
                        qap_type: qap_type || "INTERNAL",
                        attachments: attachments || [],
                        status: status || "draft",
                        remarks,
                        dynamic_columns: dynamic_columns || [],
                        items: {
                            create: (qap_type === "CLIENT_APPROVED") ? [] : mapItemsForPrisma(items)
                        }
                    }
                });
            }
        }

        return updatedRecord;
    }

    async list(company_id, queryParams) {
        const { page = 1, limit = 10, search = "", columnFilters } = queryParams;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = { 
            company_id,
            is_deleted: false 
        };

        if (search) {
            where.OR = [
                { report_no: { contains: search, mode: 'insensitive' } },
                { msn: { contains: search, mode: 'insensitive' } },
                { client: { contains: search, mode: 'insensitive' } },
                { equipment_name: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (columnFilters) {
            const filters = typeof columnFilters === 'string' ? JSON.parse(columnFilters) : columnFilters;
            const andConditions = [];

            if (filters.client && filters.client.length > 0) {
                andConditions.push({ client: { in: filters.client } });
            }
            if (filters.po_no && filters.po_no.length > 0) {
                andConditions.push({ po_no: { in: filters.po_no } });
            }
            if (filters.msn && filters.msn.length > 0) {
                andConditions.push({ msn: { in: filters.msn } });
            }
            if (filters.is_active && filters.is_active.length === 1) {
                andConditions.push({ is_active: filters.is_active[0] === 'true' });
            }

            if (andConditions.length > 0) {
                where.AND = andConditions;
            }
        }

        const [qaps, total] = await Promise.all([
            prisma.quality_assurance_plan.findMany({
                where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' }
            }),
            prisma.quality_assurance_plan.count({ where })
        ]);

        return {
            data: qaps,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        };
    }

    async _ensureMasterHeadings(company_id) {
        const masterCount = await prisma.qap_activity_heading_master.count({
            where: { company_id, is_deleted: false }
        });

        if (masterCount === 0) {
            const defaults = [
                "Welding",
                "NDE & QC Procedures",
                "Material Identification",
                "Dish End Fabrication",
                "Main Shell and Skirt Fabrication",
                "Nozzle Fabrication",
                "Final Assembly",
                "Final Dimension and Visual",
                "PWHT AND NDE AFTER PWHT",
                "Pressure Test",
                "Surface Preparation and Painting",
                "Final Stamping & Documentation"
            ];

            await prisma.qap_activity_heading_master.createMany({
                data: defaults.map(name => ({
                    company_id,
                    name
                })),
                skipDuplicates: true
            });
        }
    }

    async getFilters(company_id) {
        // 1. Ensure master headings exist (Auto-Seed)
        await this._ensureMasterHeadings(company_id);

        // 2. Fetch master headings for the dropdown
        const masterHeadings = await prisma.qap_activity_heading_master.findMany({
            where: { company_id, is_active: true, is_deleted: false },
            orderBy: { createdAt: 'asc' }
        });

        // 3. Fetch existing records for cascading filters
        const records = await prisma.quality_assurance_plan.findMany({
            where: { 
                company_id,
                is_deleted: false
            },
            select: {
                client: true,
                po_no: true,
                msn: true
            },
            distinct: ['client', 'po_no', 'msn']
        });

        return { 
            records,
            masterHeadings: masterHeadings.map(h => h.name)
        };
    }

    async getById(company_id, id) {
        const qap = await prisma.quality_assurance_plan.findFirst({
            where: { id, company_id },
            include: { 
                items: { orderBy: { sort_order: 'asc' } },
                attachments: true 
            }
        });
        if (!qap) throw new Error("Quality Assurance Plan not found");

        if (qap.attachments && Array.isArray(qap.attachments)) {
            const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
            qap.attachments = qap.attachments.map(att => {
                if (att.file_url && !att.file_url.startsWith('http')) {
                    const safeUrl = att.file_url.startsWith('/') ? att.file_url : `/${att.file_url}`;
                    return { ...att, url: `${backendUrl}/api/files${safeUrl}` };
                }
                return { ...att, url: att.file_url };
            });
        }

        return qap;
    }

    async getNextReportNo(company_id, jobId) {
        const job = await prisma.job.findFirst({ where: { id: jobId, company_id } });
        if (!job) throw new Error("Job not found");

        const count = await prisma.quality_assurance_plan.count({ where: { company_id } });
        return { next_report_no: `SHR/${job.job_number}/QAP/${count + 1}` };
    }

    async toggleStatus(company_id, id) {
        const record = await prisma.quality_assurance_plan.findFirst({
            where: { id, company_id },
            select: { is_active: true }
        });
        if (!record) throw new Error("Quality Assurance Plan not found");

        return await prisma.quality_assurance_plan.update({
            where: { id },
            data: { is_active: !record.is_active }
        });
    }

    async archive(company_id, id) {
        const record = await prisma.quality_assurance_plan.findFirst({
            where: { id, company_id }
        });
        if (!record) throw new Error("Quality Assurance Plan not found");

        return await prisma.quality_assurance_plan.update({
            where: { id },
            data: { is_deleted: true }
        });
    }

    // Master Headings
    async listMasterHeadings(company_id) {
        await this._ensureMasterHeadings(company_id);
        return prisma.qap_activity_heading_master.findMany({
            where: { company_id, is_deleted: false },
            orderBy: { createdAt: 'asc' }
        });
    }

    async createMasterHeading(company_id, data) {
        return prisma.qap_activity_heading_master.create({
            data: {
                company_id,
                name: data.name
            }
        });
    }

    async updateMasterHeading(company_id, id, data) {
        return prisma.qap_activity_heading_master.update({
            where: { id, company_id },
            data: {
                name: data.name,
                is_active: data.is_active
            }
        });
    }

    async deleteMasterHeading(company_id, id) {
        return prisma.qap_activity_heading_master.update({
            where: { id, company_id },
            data: { is_deleted: true }
        });
    }
}

module.exports = new QapService();
