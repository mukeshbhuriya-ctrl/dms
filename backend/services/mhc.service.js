const prisma = require('#prisma');

class MhcService {
    /**
     * List material heat charts with pagination and search
     */
    async list(company_id, params = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = params;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const where = { company_id };

        if (search) {
            where.OR = [
                { msn: { contains: search, mode: 'insensitive' } },
                { client: { contains: search, mode: 'insensitive' } },
                { po_no: { contains: search, mode: 'insensitive' } },
                { report_no: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [total, data] = await prisma.$transaction([
            prisma.material_heat_chart.count({ where }),
            prisma.material_heat_chart.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    production_engineer: { select: { id: true, name: true, empid: true } },
                    qc_engineer: { select: { id: true, name: true, empid: true } },
                }
            }),
        ]);

        return {
            data,
            meta: {
                total,
                page: Number(page),
                limit: take,
                totalPages: Math.ceil(total / take),
            },
        };
    }

    /**
     * Create a new MHC record with items
     */
    async create(company_id, body, creator_id) {
        const {
            job_id,
            shreno_drg_no,
            customer_drg_no,
            inspection_by,
            production_engineer_id,
            qc_engineer_id,
            status,
            items = [],
        } = body;

        if (!job_id) throw new Error('job_id is required');

        // Fetch job with relations to extract basic info
        const job = await prisma.job.findFirst({
            where: { id: job_id, company_id },
            include: {
                customer: { select: { customer_name: true } },
                po: { select: { po_number: true } },
            },
        });

        if (!job) throw new Error('Job not found');

        const mhc = await prisma.$transaction(async (tx) => {
            // Calculate next serial_no for this job
            const lastMhc = await tx.material_heat_chart.findFirst({
                where: { company_id },
                orderBy: { serial_no: 'desc' },
                select: { serial_no: true }
            });

            const nextSerialNo = lastMhc ? lastMhc.serial_no + 1 : 1;
            const paddedSerial = String(nextSerialNo).padStart(4, '0');
            const reportNo = `SHR/${job.job_number}/MHC/${paddedSerial}`;

            // Create header record
            const header = await tx.material_heat_chart.create({
                data: {
                    company_id,
                    job_id,
                    serial_no: nextSerialNo,
                    report_no: reportNo,
                    msn: job.job_number,
                    client: job.customer?.customer_name || '',
                    po_no: job.po?.po_number || '',
                    project_id: job.project_id || null,
                    equipment_name: job.equipement_name || null,
                    tag_no: job.tag_number || null,
                    code: job.code || null,
                    shreno_drg_no: shreno_drg_no || null,
                    customer_drg_no: customer_drg_no || null,
                    inspection_by: inspection_by || null,
                    status: status || 'Pending',
                    production_engineer_id: production_engineer_id || creator_id,
                    qc_engineer_id: qc_engineer_id || null,
                    submitted_at: new Date(),
                },
            });

            // Create item rows
            if (items.length > 0) {
                await tx.material_heat_chart_item.createMany({
                    data: items.map((item, idx) => ({
                        mhc_id: header.id,
                        sort_order: item.sort_order !== undefined ? item.sort_order : idx,
                        is_heading: item.is_heading || false,
                        heading_text: item.heading_text || null,
                        parent_heading_id: item.parent_heading_id ? String(item.parent_heading_id) : null,
                        item_no: item.itemNo || item.item_no || null,
                        description: item.description || null,
                        size: item.size || null,
                        material_spec: item.materialSpecification || item.material_spec || null,
                        quantity_unit: item.quantityUnit || item.quantity_unit || null,
                        heat_no: item.heatNo || item.heat_no || null,
                        grn_app_ap_no: item.grn_app_ap_no || null,
                        mtr_no: item.mtrNo || item.mtr_no || null,
                        manufacturer: item.manufacturerName || item.manufacturer || null,
                        remarks: item.remarks || null,
                    })),
                });
            }

            // Return with items
            return tx.material_heat_chart.findUnique({
                where: { id: header.id },
                include: {
                    items: { orderBy: { sort_order: 'asc' } },
                    production_engineer: { select: { id: true, name: true, empid: true } },
                    qc_engineer: { select: { id: true, name: true, empid: true } },
                },
            });
        });

        return mhc;
    }

    /**
     * Update an existing MHC record
     */
    async update(company_id, id, body) {
        const {
            shreno_drg_no,
            customer_drg_no,
            inspection_by,
            tag_no,
            production_engineer_id,
            qc_engineer_id,
            status,
            items = [],
        } = body;

        const existing = await prisma.material_heat_chart.findFirst({
            where: { id, company_id }
        });

        if (!existing) throw new Error('Material Heat Chart not found');
        if (existing.status === 'Approved') throw new Error('Cannot edit an approved report');

        return await prisma.$transaction(async (tx) => {
            // Update header
            const updatedHeader = await tx.material_heat_chart.update({
                where: { id },
                data: {
                    shreno_drg_no,
                    customer_drg_no,
                    inspection_by,
                    tag_no,
                    production_engineer_id,
                    qc_engineer_id,
                    status: status || existing.status,
                }
            });

            // Replace items
            await tx.material_heat_chart_item.deleteMany({ where: { mhc_id: id } });
            if (items.length > 0) {
                await tx.material_heat_chart_item.createMany({
                    data: items.map((item, idx) => ({
                        mhc_id: id,
                        sort_order: item.sort_order !== undefined ? item.sort_order : idx,
                        is_heading: item.is_heading || false,
                        heading_text: item.heading_text || null,
                        parent_heading_id: item.parent_heading_id ? String(item.parent_heading_id) : null,
                        item_no: item.itemNo || item.item_no || null,
                        description: item.description || null,
                        size: item.size || null,
                        material_spec: item.materialSpecification || item.material_spec || null,
                        quantity_unit: item.quantityUnit || item.quantity_unit || null,
                        heat_no: item.heatNo || item.heat_no || null,
                        grn_app_ap_no: item.grn_app_ap_no || null,
                        mtr_no: item.mtrNo || item.mtr_no || null,
                        manufacturer: item.manufacturerName || item.manufacturer || null,
                        remarks: item.remarks || null,
                    })),
                });
            }

            return tx.material_heat_chart.findUnique({
                where: { id },
                include: {
                    items: { orderBy: { sort_order: 'asc' } },
                    production_engineer: { select: { id: true, name: true, empid: true } },
                    qc_engineer: { select: { id: true, name: true, empid: true } },
                }
            });
        });
    }

    /**
     * Update status (Approve/Reject)
     */
    async updateStatus(company_id, id, { status, remarks, user_id }) {
        const existing = await prisma.material_heat_chart.findFirst({
            where: { id, company_id }
        });

        if (!existing) throw new Error('Material Heat Chart not found');

        const data = { status };
        if (status === 'Approved') {
            data.approved_at = new Date();
            data.approver_remarks = remarks || null;
        } else if (status === 'Rejected') {
            data.rejected_at = new Date();
            data.approver_remarks = remarks;
        }

        return await prisma.material_heat_chart.update({
            where: { id },
            data,
            include: {
                production_engineer: { select: { id: true, name: true, empid: true } },
                qc_engineer: { select: { id: true, name: true, empid: true } },
            }
        });
    }

    /**
     * Get a single MHC record with items
     */
    async getById(company_id, id) {
        const mhc = await prisma.material_heat_chart.findFirst({
            where: { id, company_id },
            include: {
                items: { orderBy: { sort_order: 'asc' } },
                production_engineer: { select: { id: true, name: true, empid: true } },
                qc_engineer: { select: { id: true, name: true, empid: true } },
            },
        });

        if (!mhc) throw new Error('Material Heat Chart not found');
        return mhc;
    }

    /**
     * Get all items from approved MHCs for a specific job
     */
    async getApprovedItemsByJob(company_id, job_id) {
        if (!job_id) throw new Error('job_id is required');

        const approvedCharts = await prisma.material_heat_chart.findMany({
            where: {
                company_id,
                job_id,
                status: 'Approved'
            },
            include: {
                items: {
                    orderBy: { sort_order: 'asc' }
                }
            }
        });

        const allItems = approvedCharts.flatMap(chart => 
            chart.items.map(item => ({
                ...item,
                mhc_report_no: chart.report_no
            }))
        );

        return allItems;
    }

    async getApprovedItemsByMsn(company_id, msn) {
        if (!msn) throw new Error('msn is required');

        const approvedCharts = await prisma.material_heat_chart.findMany({
            where: {
                company_id,
                msn: String(msn),
                status: 'Approved'
            },
            include: {
                items: {
                    orderBy: { sort_order: 'asc' }
                }
            }
        });

        const allItems = approvedCharts.flatMap(chart => 
            chart.items.map(item => ({
                ...item,
                mhc_report_no: chart.report_no
            }))
        );

        return allItems;
    }

    /**
     * Get the next report number for a specific job
     */
    async getNextReportNo(company_id, job_id) {
        if (!job_id) throw new Error('job_id is required');

        const job = await prisma.job.findFirst({
            where: { id: job_id, company_id },
        });

        if (!job) throw new Error('Job not found');

        const lastMhc = await prisma.material_heat_chart.findFirst({
            where: { company_id },
            orderBy: { serial_no: 'desc' },
            select: { serial_no: true }
        });

        const nextSerialNo = lastMhc ? lastMhc.serial_no + 1 : 1;
        const paddedSerial = String(nextSerialNo).padStart(4, '0');
        const reportNo = `SHR/${job.job_number}/MHC/${paddedSerial}`;

        return { next_report_no: reportNo, next_serial_no: nextSerialNo };
    }
}

module.exports = new MhcService();
