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
            ];
        }

        const [total, data] = await prisma.$transaction([
            prisma.material_heat_chart.count({ where }),
            prisma.material_heat_chart.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
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
    async create(company_id, body) {
        const {
            job_id,
            shreno_drg_no,
            customer_drg_no,
            inspection_by,
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
                where: { job_id, company_id },
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
                    status: 'draft',
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
                        parent_heading_id: item.parent_heading_id || null,
                        item_no: item.item_no || null,
                        description: item.description || null,
                        size: item.size || null,
                        material_spec: item.material_spec || null,
                        quantity_unit: item.quantity_unit || null,
                        heat_no: item.heat_no || null,
                        mtr_no: item.mtr_no || null,
                        manufacturer: item.manufacturer || null,
                        remarks: item.remarks || null,
                    })),
                });
            }

            // Return with items
            return tx.material_heat_chart.findUnique({
                where: { id: header.id },
                include: {
                    items: { orderBy: { sort_order: 'asc' } },
                },
            });
        });

        return mhc;
    }

    /**
     * Get a single MHC record with items
     */
    async getById(company_id, id) {
        const mhc = await prisma.material_heat_chart.findFirst({
            where: { id, company_id },
            include: {
                items: { orderBy: { sort_order: 'asc' } },
            },
        });

        if (!mhc) throw new Error('Material Heat Chart not found');
        return mhc;
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
            where: { job_id, company_id },
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
