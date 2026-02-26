const prisma = require('#prisma');

class FinalInspectionService {
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
            prisma.final_inspection_report.findMany({
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
                    status: true,
                    createdAt: true
                }
            }),
            prisma.final_inspection_report.count({ where: whereClause })
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
        return await prisma.final_inspection_report.findFirst({
            where: { id, company_id },
            include: {
                details: { orderBy: { sr_no: 'asc' } },
                nozzles: { orderBy: { sr_no: 'asc' } },
                parts: { orderBy: { sr_no: 'asc' } },
                instruments: true,
                remarks: { orderBy: { sr_no: 'asc' } },
                quality_engineer: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
    }

    /**
     * Get the next report number for a company
     */
    async getNextReportNo(company_id, job_id) {
        const job = await prisma.job.findFirst({
            where: { id: job_id, company_id },
            select: { job_number: true }
        });

        if (!job) throw new Error("Job not found");

        const count = await prisma.final_inspection_report.count({
            where: { company_id }
        });

        const nextNumber = String(count + 1).padStart(4, '0');
        const reportNo = `SHR/${job.job_number}/FIR/${nextNumber}`;
        return reportNo;
    }

    /**
     * Create a new Final Inspection Report
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
            quality_engineer_id,
            status,      // Optional status field
            details,     // array
            nozzles,     // array
            parts,       // array 
            instruments, // array
            remarks      // array
        } = payload;

        // Verify the job
        const job = await prisma.job.findFirst({
            where: { id: job_id, company_id }
        });
        if (!job) throw new Error("Invalid job ID");

        // Generate report number transactionally
        return await prisma.$transaction(async (tx) => {
            const count = await tx.final_inspection_report.count({
                where: { company_id }
            });
            const nextNumber = String(count + 1).padStart(4, '0');
            const report_no = `SHR/${job.job_number}/FIR/${nextNumber}`;

            const report = await tx.final_inspection_report.create({
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
                    quality_engineer_id: quality_engineer_id || null,
                    status: status || "draft",
                    details: {
                        create: details?.map(item => ({
                            sr_no: item.sr_no,
                            description: item.description,
                            required: item.required,
                            actual: item.actual,
                            remarks: item.remarks
                        })) || []
                    },
                    nozzles: {
                        create: nozzles?.map(nz => ({
                            sr_no: nz.sr_no,
                            nozzle_mark: nz.nozzle_mark,
                            orientation: nz.orientation,
                            size: nz.size,
                            location: nz.location,
                            elevation_approved: nz.elevation_approved,
                            projection_approved: nz.projection_approved,
                            elevation_actual: nz.elevation_actual,
                            projection_actual: nz.projection_actual
                        })) || []
                    },
                    parts: {
                        create: parts?.map(pt => ({
                            sr_no: pt.sr_no,
                            part_no: pt.part_no,
                            description: pt.description,
                            orientation_approved: pt.orientation_approved,
                            elevation_approved: pt.elevation_approved,
                            projection_approved: pt.projection_approved,
                            elevation_actual: pt.elevation_actual,
                            projection_actual: pt.projection_actual
                        })) || []
                    },
                    instruments: {
                        create: instruments?.map(inst => ({
                            name: inst.name,
                            id_no: inst.id_no,
                            due_date: inst.due_date
                        })) || []
                    },
                    remarks: {
                        create: remarks?.map(rem => ({
                            sr_no: rem.sr_no,
                            text: rem.text
                        })) || []
                    }
                }
            });

            return report;
        });
    }

    /**
     * Update an existing Final Inspection Report
     */
    async updateReport(company_id, id, payload) {
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
            quality_engineer_id,
            status,
            details,
            nozzles,
            parts,
            instruments,
            remarks
        } = payload;

        // Verify report exists and belongs to company
        const existing = await prisma.final_inspection_report.findFirst({
            where: { id, company_id }
        });
        if (!existing) throw new Error("Report not found");

        return await prisma.$transaction(async (tx) => {
            // Delete existing sub-items
            await tx.final_inspection_detail.deleteMany({ where: { report_id: id } });
            await tx.final_inspection_nozzle.deleteMany({ where: { report_id: id } });
            await tx.final_inspection_part.deleteMany({ where: { report_id: id } });
            await tx.final_inspection_instrument.deleteMany({ where: { report_id: id } });
            await tx.final_inspection_remark.deleteMany({ where: { report_id: id } });

            // Update report and create new sub-items
            const report = await tx.final_inspection_report.update({
                where: { id },
                data: {
                    job_id,
                    msn,
                    client,
                    po_no,
                    project_id,
                    equipment_name,
                    tag_no,
                    code,
                    drg_no,
                    quality_engineer_id: quality_engineer_id || null,
                    status: status || "draft",
                    details: {
                        create: details?.map(item => ({
                            sr_no: item.sr_no,
                            description: item.description,
                            required: item.required,
                            actual: item.actual,
                            remarks: item.remarks
                        })) || []
                    },
                    nozzles: {
                        create: nozzles?.map(nz => ({
                            sr_no: nz.sr_no,
                            nozzle_mark: nz.nozzle_mark,
                            orientation: nz.orientation,
                            size: nz.size,
                            location: nz.location,
                            elevation_approved: nz.elevation_approved,
                            projection_approved: nz.projection_approved,
                            elevation_actual: nz.elevation_actual,
                            projection_actual: nz.projection_actual
                        })) || []
                    },
                    parts: {
                        create: parts?.map(pt => ({
                            sr_no: pt.sr_no,
                            part_no: pt.part_no,
                            description: pt.description,
                            orientation_approved: pt.orientation_approved,
                            elevation_approved: pt.elevation_approved,
                            projection_approved: pt.projection_approved,
                            elevation_actual: pt.elevation_actual,
                            projection_actual: pt.projection_actual
                        })) || []
                    },
                    instruments: {
                        create: instruments?.map(inst => ({
                            name: inst.name,
                            id_no: inst.id_no,
                            due_date: inst.due_date
                        })) || []
                    },
                    remarks: {
                        create: remarks?.map(rem => ({
                            sr_no: rem.sr_no,
                            text: rem.text
                        })) || []
                    }
                }
            });

            return report;
        });
    }
}

module.exports = new FinalInspectionService();
