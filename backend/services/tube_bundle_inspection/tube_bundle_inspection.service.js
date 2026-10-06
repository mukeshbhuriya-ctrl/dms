const prisma = require('#prisma');

class TubeBundleInspectionService {
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
     * List tube bundle inspection reports with pagination and search
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

        if (cFilters.is_active) {
            const activeStatus = Array.isArray(cFilters.is_active) ? cFilters.is_active : cFilters.is_active.split(',').map(v => v.trim());
            if (activeStatus.length === 1) {
                where.is_active = activeStatus[0] === 'true';
            }
        }
        if (cFilters.status) {
            const statusVals = Array.isArray(cFilters.status) ? cFilters.status : cFilters.status.split(',').map(v => v.trim());
            if (statusVals.length > 0) where.status = { in: statusVals };
        }
        if (cFilters.date) {
            const dateValues = Array.isArray(cFilters.date) ? cFilters.date : cFilters.date.split(',').map(v => v.trim());
            if (dateValues.includes('today')) {
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                where.updatedAt = { gte: startOfToday };
            }
        }

        const [data, total] = await Promise.all([
            prisma.tube_bundle_inspection_report.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                orderBy: { [sortBy]: sortOrder },
                include: {
                    job: true,
                    creator: { select: { id: true, name: true, email: true } },
                    production_group: { select: { id: true, name: true } },
                    qc_group: { select: { id: true, name: true } },
                    production_engineer: { select: { id: true, name: true } },
                    qc_engineer: { select: { id: true, name: true } }
                }
            }),
            prisma.tube_bundle_inspection_report.count({ where })
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
            prisma.tube_bundle_inspection_report.findMany({
                where,
                select: { msn: true },
                distinct: ['msn'],
                orderBy: { msn: 'asc' }
            }),
            prisma.tube_bundle_inspection_report.findMany({
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
        const report = await prisma.tube_bundle_inspection_report.findFirst({
            where: {
                id,
                company_id,
                is_deleted: false
            },
            include: {
                job: true,
                items: { orderBy: { sr_no: 'asc' } },
                instruments: true,
                remarks: { orderBy: { id: 'asc' } },
                creator: { select: { id: true, name: true } },
                production_group: { select: { id: true, name: true } },
                qc_group: { select: { id: true, name: true } },
                production_engineer: { select: { id: true, name: true } },
                qc_engineer: { select: { id: true, name: true } }
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
    async generateReportNo(company_id, job_id, inspection_type) {
        const job = await prisma.job.findUnique({ where: { id: job_id } });
        if (!job) throw new Error("Job not found");

        const isSkeleton = inspection_type === "Tube Skeleton";
        const prefixStr = isSkeleton ? "TSI" : "TBI";
        const prefix = `SHR/${prefixStr}/${job.job_number}/`;
        
        const count = await prisma.tube_bundle_inspection_report.count({
            where: {
                company_id,
                job_id,
                report_no: { startsWith: prefix }
            }
        });

        return `${prefix}${(count + 1).toString().padStart(2, '0')}`;
    }

    /**
     * Create a new tube bundle inspection report
     */
    async create(company_id, user_id, data) {
        const {
            inspection_type, job_id, msn, client, po_no, equipment_name, tag_no,
            code, drg_no, insp_agency, qap_clause, status,
            production_group_id, qc_group_id,
            items = [], instruments = [], general_remarks = []
        } = data;

        const report_no = await this.generateReportNo(company_id, job_id, inspection_type);

        let qc_engineer_id = null;
        let production_engineer_id = null;

        if (status === "Draft" || status === "Initiated") {
            qc_engineer_id = user_id;
        } else if (status === "Offered") {
            production_engineer_id = user_id;
        } else if (status === "Approved") {
            qc_engineer_id = user_id; // QC finalizes
        }

        return await prisma.$transaction(async (tx) => {
            const report = await tx.tube_bundle_inspection_report.create({
                data: {
                    company_id,
                    inspection_type,
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
                    qap_clause,
                    status,
                    production_group_id,
                    qc_group_id,
                    qc_engineer_id,
                    production_engineer_id,
                    created_by: user_id,
                    
                    items: {
                        create: items.map(item => ({
                            sr_no: item.sr_no,
                            description: item.description,
                            as_per_drg: item.as_per_drg,
                            actual_dimension: item.actual_dimension,
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
                        create: general_remarks.map((rem, index) => ({
                            text: rem
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
    async update(id, company_id, user_id, data, user = null) {
        const {
            items = [], instruments = [], general_remarks = [],
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

        let qc_engineer_id = existing.qc_engineer_id;
        let production_engineer_id = existing.production_engineer_id;

        if (updateData.status === "Draft" || updateData.status === "Initiated") {
            qc_engineer_id = qc_engineer_id || user_id;
        } else if (updateData.status === "Offered") {
            production_engineer_id = production_engineer_id || user_id;
        } else if (updateData.status === "Approved") {
            qc_engineer_id = user_id; // Update QC engineer on approval
        }

        return await prisma.$transaction(async (tx) => {
            // Delete existing relations
            await tx.tube_bundle_inspection_item.deleteMany({ where: { report_id: id } });
            await tx.tube_bundle_inspection_instrument.deleteMany({ where: { report_id: id } });
            await tx.tube_bundle_inspection_remark.deleteMany({ where: { report_id: id } });

            // Update main record and recreate relations
            const report = await tx.tube_bundle_inspection_report.update({
                where: { id },
                data: {
                    inspection_type: updateData.inspection_type,
                    job_id: updateData.job_id,
                    msn: updateData.msn,
                    client: updateData.client,
                    po_no: updateData.po_no,
                    equipment_name: updateData.equipment_name,
                    tag_no: updateData.tag_no,
                    code: updateData.code,
                    drg_no: updateData.drg_no,
                    insp_agency: updateData.insp_agency,
                    qap_clause: updateData.qap_clause,
                    status: updateData.status,
                    production_group_id: updateData.production_group_id,
                    qc_group_id: updateData.qc_group_id,
                    qc_engineer_id,
                    production_engineer_id,

                    items: {
                        create: items.map(item => ({
                            sr_no: item.sr_no,
                            description: item.description,
                            as_per_drg: item.as_per_drg,
                            actual_dimension: item.actual_dimension,
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
                        create: general_remarks.map((rem, index) => ({
                            text: rem
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
        
        return await prisma.tube_bundle_inspection_report.update({
            where: { id },
            data: { is_active: !report.is_active }
        });
    }

    /**
     * Soft delete
     */
    async delete(id, company_id) {
        await this.getById(id, company_id);
        
        return await prisma.tube_bundle_inspection_report.update({
            where: { id },
            data: { 
                is_deleted: true,
                is_active: false
            }
        });
    }
}

module.exports = new TubeBundleInspectionService();
