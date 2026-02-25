const prisma = require('#prisma');

class InspectionReportService {
    /**
     * Get paginated list of reports
     */
    async getList(company_id, { page, limit, search }) {
        const skip = (page - 1) * limit;

        let whereClause = { company_id };
        if (search) {
            whereClause = {
                ...whereClause,
                OR: [
                    { report_no: { contains: search, mode: 'insensitive' } },
                    { client: { contains: search, mode: 'insensitive' } },
                    { msn: { contains: search, mode: 'insensitive' } }
                ]
            };
        }

        const [data, total] = await Promise.all([
            prisma.dish_end_inspection_report.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    report_no: true,
                    msn: true,
                    client: true,
                    po_no: true,
                    project_id: true,
                    equipment_name: true,
                    vendor_dish_end_number: true,
                    createdAt: true
                }
            }),
            prisma.dish_end_inspection_report.count({ where: whereClause })
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get report by ID with all relations
     */
    async getById(company_id, id) {
        return await prisma.dish_end_inspection_report.findFirst({
            where: { id, company_id },
            include: {
                items: {
                    orderBy: { sr_no: 'asc' }
                },
                instruments: true,
                quality_engineer: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
    }

    /**
     * Get the next report number for a given job
     */
    async getNextReportNo(company_id, job_id) {
        const job = await prisma.job.findFirst({
            where: { id: job_id, company_id },
            select: { job_number: true }
        });

        if (!job) throw new Error("Job not found");

        const count = await prisma.dish_end_inspection_report.count({
            where: { company_id }
        });

        const nextNumber = String(count + 1).padStart(4, '0');
        const reportNo = `SHR/${job.job_number}/DEIR/${nextNumber}`;
        return reportNo;
    }

    /**
     * Create a new Dish End Inspection Report
     */
    async createReport(company_id, payload) {
        const {
            job_id,
            msn,
            client,
            po_no,
            project_id,
            equipment_name,
            tag_no,
            code,
            drg_no,
            insp_agency,
            quality_engineer_id,
            vendor_dish_end_number,
            items, // array of { sr_no, description, as_per_drg, actual, remarks }
            instruments // array of { name, id_no, due_date }
        } = payload;

        // Verify the job
        const job = await prisma.job.findFirst({
            where: { id: job_id, company_id }
        });
        if (!job) throw new Error("Invalid job ID");

        // Generate report number transactionally
        return await prisma.$transaction(async (tx) => {
            const count = await tx.dish_end_inspection_report.count({
                where: { company_id }
            });
            const nextNumber = String(count + 1).padStart(4, '0');
            const report_no = `SHR/${job.job_number}/DEIR/${nextNumber}`;

            const report = await tx.dish_end_inspection_report.create({
                data: {
                    company_id,
                    job_id,
                    msn,
                    report_no,
                    client,
                    po_no,
                    project_id,
                    equipment_name,
                    tag_no,
                    code,
                    drg_no,
                    insp_agency,
                    quality_engineer_id: quality_engineer_id || null,
                    vendor_dish_end_number: vendor_dish_end_number || null,
                    items: {
                        create: items.map(item => ({
                            sr_no: item.sr_no,
                            description: item.description,
                            as_per_drg: item.as_per_drg,
                            actual: item.actual,
                            remarks: item.remarks
                        }))
                    },
                    instruments: {
                        create: instruments.map(inst => ({
                            name: inst.name,
                            id_no: inst.id_no,
                            due_date: inst.due_date
                        }))
                    }
                }
            });

            return report;
        });
    }
}

module.exports = new InspectionReportService();
