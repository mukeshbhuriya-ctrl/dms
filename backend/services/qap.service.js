const prisma = require('#prisma');

class QapService {
    async create(company_id, payload) {
        const {
            job_id, msn, client, po_no, po_date, project_id, equipment_name,
            tag_no, code, shreno_drg_no, customer_drg_no, dynamic_columns,
            items, report_no
        } = payload;

        if (!job_id || !msn) throw new Error("Job ID / MSN is required");

        let finalReportNo = report_no;
        if (!finalReportNo || finalReportNo === "Auto-generated on Submit") {
            const count = await prisma.quality_assurance_plan.count({ where: { job_id, company_id } });
            finalReportNo = `SHR/${msn}/QAP/${count + 1}`;
        }

        return prisma.quality_assurance_plan.create({
            data: {
                company_id, job_id, msn, report_no: finalReportNo,
                client, po_no, po_date, project_id, equipment_name,
                tag_no, code, shreno_drg_no, customer_drg_no,
                dynamic_columns: dynamic_columns || [],
                items: {
                    create: (items || []).map((item, index) => ({
                        sort_order: index,
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
                    }))
                }
            },
            include: { items: true }
        });
    }

    async update(company_id, id, payload) {
        const {
            job_id, msn, client, po_no, po_date, project_id, equipment_name,
            tag_no, code, shreno_drg_no, customer_drg_no, dynamic_columns, items
        } = payload;

        if (!job_id || !msn) throw new Error("Job ID / MSN is required");

        // Clear existing items
        await prisma.quality_assurance_plan_item.deleteMany({ where: { qap_id: id } });

        // Update parent & insert new items
        return prisma.quality_assurance_plan.update({
            where: { id, company_id },
            data: {
                job_id, msn, client, po_no, po_date, project_id, equipment_name,
                tag_no, code, shreno_drg_no, customer_drg_no,
                dynamic_columns: dynamic_columns || [],
                items: {
                    create: (items || []).map((item, index) => ({
                        sort_order: index,
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
                    }))
                }
            },
            include: { items: true }
        });
    }

    async list(company_id, queryParams) {
        const { page = 1, limit = 10, search = "" } = queryParams;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = { company_id };

        if (search) {
            where.OR = [
                { report_no: { contains: search, mode: 'insensitive' } },
                { msn: { contains: search, mode: 'insensitive' } },
                { client: { contains: search, mode: 'insensitive' } },
                { equipment_name: { contains: search, mode: 'insensitive' } }
            ];
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

    async getById(company_id, id) {
        const qap = await prisma.quality_assurance_plan.findFirst({
            where: { id, company_id },
            include: { items: { orderBy: { sort_order: 'asc' } } }
        });
        if (!qap) throw new Error("Quality Assurance Plan not found");
        return qap;
    }

    async getNextReportNo(company_id, jobId) {
        const job = await prisma.job.findFirst({ where: { id: jobId, company_id } });
        if (!job) throw new Error("Job not found");

        const count = await prisma.quality_assurance_plan.count({ where: { job_id: jobId, company_id } });
        return { next_report_no: `SHR/${job.job_number}/QAP/${count + 1}` };
    }
}

module.exports = new QapService();
