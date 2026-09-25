const prisma = require('#prisma');

class TubeSheetInspectionService {
    /**
     * Helper to process string filters for partial matching
     */
    _processFilter(value) {
        if (!value) return undefined;
        if (typeof value === 'string' && value.includes(',')) {
            return { in: value.split(',').map(v => v.trim()) };
        }
        return { contains: value, mode: 'insensitive' };
    }

    /**
     * List tube sheet inspection reports with pagination and search
     */
    async list(company_id, params = {}, user = null) {
        const {
            page = 1,
            limit = 10,
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = params;

        const skip = (page - 1) * limit;

        const where = {
            company_id,
            is_deleted: false
        };

        if (user) {
            const userId = user.id || user.userid;
            where.OR = [
                { status: { not: 'Draft' } },
                { AND: [{ status: 'Draft' }, { created_by: userId }] }
            ];
        } else {
            where.status = { not: 'Draft' };
        }

        if (search) {
            const searchOr = [
                { msn: { contains: search, mode: 'insensitive' } },
                { report_no: { contains: search, mode: 'insensitive' } },
                { client: { contains: search, mode: 'insensitive' } },
                { equipment_name: { contains: search, mode: 'insensitive' } }
            ];
            if (where.OR) {
                where.AND = where.AND || [];
                where.AND.push({ OR: searchOr });
            } else {
                where.OR = searchOr;
            }
        }

        const cFilters = params.columnFilters || {};
        if (cFilters.msn) where.msn = this._processFilter(cFilters.msn);
        if (cFilters.report_no) where.report_no = this._processFilter(cFilters.report_no);
        if (cFilters.client) where.client = this._processFilter(cFilters.client);
        if (cFilters.status) where.status = this._processFilter(cFilters.status);

        if (cFilters.is_active) {
            const activeStatus = Array.isArray(cFilters.is_active) ? cFilters.is_active : cFilters.is_active.split(',').map(v => v.trim());
            if (activeStatus.length === 1) {
                where.is_active = activeStatus[0] === 'true';
            }
        }

        const [data, total] = await Promise.all([
            prisma.tube_sheet_inspection_report.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                orderBy: { [sortBy]: sortOrder },
                include: {
                    job: true,
                    creator: { select: { id: true, name: true, email: true } }
                }
            }),
            prisma.tube_sheet_inspection_report.count({ where })
        ]);

        return {
            data,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get distinct values for dropdown filters
     */
    async getFilters(company_id) {
        const where = { company_id, is_deleted: false };

        const [msn, client] = await Promise.all([
            prisma.tube_sheet_inspection_report.findMany({
                where,
                select: { msn: true },
                distinct: ['msn'],
                orderBy: { msn: 'asc' }
            }),
            prisma.tube_sheet_inspection_report.findMany({
                where,
                select: { client: true },
                distinct: ['client'],
                orderBy: { client: 'asc' }
            })
        ]);

        return {
            msn: msn.filter(i => i.msn).map(i => ({ value: i.msn, label: i.msn })),
            client: client.filter(i => i.client).map(i => ({ value: i.client, label: i.client }))
        };
    }

    /**
     * Get single report by ID
     */
    async getById(id, company_id, user = null) {
        const report = await prisma.tube_sheet_inspection_report.findFirst({
            where: {
                id,
                company_id,
                is_deleted: false
            },
            include: {
                job: true,
                items: { orderBy: { sr_no: 'asc' } },
                instruments: true,
                remarks: { orderBy: { sr_no: 'asc' } },
                creator: { select: { id: true, name: true } }
            }
        });

        if (!report) {
            const error = new Error('Report not found');
            error.statusCode = 404;
            throw error;
        }

        if (report.status === 'Draft') {
            const userId = user?.id || user?.userid;
            if (!userId || report.created_by !== userId) {
                const error = new Error("Access denied: You cannot view this draft");
                error.statusCode = 403;
                throw error;
            }
        }

        return report;
    }

    /**
     * Generate auto-incrementing report number
     */
    async generateReportNo(company_id, job_id) {
        const job = await prisma.job.findUnique({ where: { id: job_id } });
        if (!job) throw new Error("Job not found");

        const prefix = `SHR/TSI/${job.job_number}/`;
        
        const count = await prisma.tube_sheet_inspection_report.count({
            where: {
                company_id,
                job_id,
                report_no: { startsWith: prefix }
            }
        });

        return `${prefix}${(count + 1).toString().padStart(2, '0')}`;
    }

    /**
     * Create a new tube sheet inspection report
     */
    async create(company_id, user_id, data) {
        const {
            job_id, msn, client, po_no, equipment_name, tag_no,
            code, drg_no, insp_agency, actual_dimension_1_header, actual_dimension_2_header,
            status,
            items = [], instruments = [], remarks = []
        } = data;

        const report_no = await this.generateReportNo(company_id, job_id);

        return await prisma.$transaction(async (tx) => {
            const report = await tx.tube_sheet_inspection_report.create({
                data: {
                    company_id,
                    job_id,
                    msn,
                    report_no,
                    client,
                    po_no,
                    equipment_name,
                    tag_no,
                    code,
                    drg_no,
                    insp_agency,
                    actual_dimension_1_header,
                    actual_dimension_2_header,
                    created_by: user_id,
                    status: status || "Draft",
                    
                    items: {
                        create: items.map(item => ({
                            sr_no: item.sr_no,
                            description: item.description,
                            drg_dim: item.drg_dim,
                            actual_dimension_1: item.actual_dimension_1,
                            actual_dimension_2: item.actual_dimension_2,
                            remarks: item.remarks
                        }))
                    },

                    instruments: {
                        create: instruments.map(inst => ({
                            instrument_id: inst.instrument_id,
                            name: inst.name,
                            id_no: inst.id_no,
                            due_date: inst.due_date
                        }))
                    },

                    remarks: {
                        create: remarks.map(rem => ({
                            sr_no: rem.sr_no,
                            text: rem.text
                        }))
                    }
                },
                include: {
                    items: true,
                    instruments: true,
                    remarks: true
                }
            });

            return report;
        });
    }

    /**
     * Update an existing report
     */
    async update(id, company_id, data, user = null) {
        const {
            items = [], instruments = [], remarks = [],
            ...updateData
        } = data;

        const existing = await this.getById(id, company_id, user);

        if (existing.status === 'Draft') {
            const userId = user?.id || user?.userid;
            if (!userId || existing.created_by !== userId) {
                const error = new Error("Access denied: You cannot edit this draft");
                error.statusCode = 403;
                throw error;
            }
        }

        return await prisma.$transaction(async (tx) => {
            // Delete existing relations
            await tx.tube_sheet_inspection_item.deleteMany({ where: { report_id: id } });
            await tx.tube_sheet_inspection_instrument.deleteMany({ where: { report_id: id } });
            await tx.tube_sheet_inspection_remark.deleteMany({ where: { report_id: id } });

            // Update main record and recreate relations
            const report = await tx.tube_sheet_inspection_report.update({
                where: { id },
                data: {
                    equipment_name: updateData.equipment_name,
                    tag_no: updateData.tag_no,
                    code: updateData.code,
                    drg_no: updateData.drg_no,
                    insp_agency: updateData.insp_agency,
                    actual_dimension_1_header: updateData.actual_dimension_1_header,
                    actual_dimension_2_header: updateData.actual_dimension_2_header,
                    ...(updateData.status && { status: updateData.status }),

                    items: {
                        create: items.map(item => ({
                            sr_no: item.sr_no,
                            description: item.description,
                            drg_dim: item.drg_dim,
                            actual_dimension_1: item.actual_dimension_1,
                            actual_dimension_2: item.actual_dimension_2,
                            remarks: item.remarks
                        }))
                    },

                    instruments: {
                        create: instruments.map(inst => ({
                            instrument_id: inst.instrument_id,
                            name: inst.name,
                            id_no: inst.id_no,
                            due_date: inst.due_date
                        }))
                    },

                    remarks: {
                        create: remarks.map(rem => ({
                            sr_no: rem.sr_no,
                            text: rem.text
                        }))
                    }
                },
                include: {
                    items: true,
                    instruments: true,
                    remarks: true
                }
            });

            return report;
        });
    }

    /**
     * Toggle active status
     */
    async toggleStatus(id, company_id) {
        const report = await this.getById(id, company_id);
        
        return await prisma.tube_sheet_inspection_report.update({
            where: { id },
            data: { is_active: !report.is_active }
        });
    }

    /**
     * Soft delete
     */
    async delete(id, company_id) {
        await this.getById(id, company_id);
        
        return await prisma.tube_sheet_inspection_report.update({
            where: { id },
            data: { 
                is_deleted: true,
                is_active: false
            }
        });
    }
}

module.exports = new TubeSheetInspectionService();
