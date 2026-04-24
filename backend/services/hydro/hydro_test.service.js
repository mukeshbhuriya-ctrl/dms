const prisma = require('#prisma');

class HydroTestService {
    /**
     * List hydrostatic test reports with pagination and search
     */
    async list(company_id, params = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc',
            columnFilters = null
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

        if (columnFilters) {
            try {
                const filters = typeof columnFilters === 'string' ? JSON.parse(columnFilters) : columnFilters;
                
                const handleMultiFilter = (field, value) => {
                    if (!value) return;
                    const values = Array.isArray(value) ? value : value.split(',').map(v => v.trim());
                    if (values.length > 0) where[field] = { in: values };
                };

                handleMultiFilter('client', filters.client);
                handleMultiFilter('po_no', filters.poNo || filters.po_no);
                handleMultiFilter('msn', filters.msn || filters.msnNumber);
            } catch (e) {
                console.error("Error parsing columnFilters:", e);
            }
        }

        const [total, data] = await prisma.$transaction([
            prisma.hydrostatic_test_report.count({ where }),
            prisma.hydrostatic_test_report.findMany({
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
     * Create a new Hydrostatic Test Report record with items and remarks
     */
    async create(company_id, body) {
        const {
            job_id,
            shreno_drg_no,
            customer_drg_no,
            construction_code,
            chlorine_content,
            inspection_agency,
            test_position,
            procedure_no,
            test_medium,
            metal_temp,
            items = [],
            remarks = [],
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

        const report = await prisma.$transaction(async (tx) => {
            // Calculate next serial_no for this job
            const lastReport = await tx.hydrostatic_test_report.findFirst({
                where: { company_id },
                orderBy: { serial_no: 'desc' },
                select: { serial_no: true }
            });

            const nextSerialNo = lastReport ? lastReport.serial_no + 1 : 1;
            const paddedSerial = String(nextSerialNo).padStart(4, '0');
            const reportNo = `SHR/${job.job_number}/HYDRO/${paddedSerial}`;

            // Create header record
            const header = await tx.hydrostatic_test_report.create({
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
                    construction_code: construction_code || null,
                    chlorine_content: chlorine_content || null,
                    inspection_agency: inspection_agency || null,
                    test_position: test_position || null,
                    procedure_no: procedure_no || null,
                    test_medium: test_medium || null,
                    metal_temp: metal_temp || null,

                    status: 'draft',
                },
            });

            // Create item rows
            if (items.length > 0) {
                await tx.hydrostatic_test_item.createMany({
                    data: items.map((item, idx) => ({
                        hydro_report_id: header.id,
                        sort_order: item.sort_order !== undefined ? item.sort_order : idx,
                        particulars: item.particulars || null,
                        mawp_int_ext: item.mawp_int_ext || null,
                        required_test_pressure: item.required_test_pressure || null,
                        actual_test_pressure: item.actual_test_pressure || null,
                        pg1_range: item.pg1_range || null,
                        pg1_id_no: item.pg1_id_no || null,
                        pg1_calib_date: item.pg1_calib_date || null,
                        pg1_due_date: item.pg1_due_date || null,
                        pg2_range: item.pg2_range || null,
                        pg2_id_no: item.pg2_id_no || null,
                        pg2_calib_date: item.pg2_calib_date || null,
                        pg2_due_date: item.pg2_due_date || null,
                        holding_time: item.holding_time || null,
                        test_result: item.test_result || null,
                    })),
                });
            }

            // Create remarks rows
            if (remarks.length > 0) {
                await tx.hydrostatic_test_remark.createMany({
                    data: remarks.map((remark, idx) => ({
                        hydro_report_id: header.id,
                        sort_order: remark.sort_order !== undefined ? remark.sort_order : idx,
                        text: remark.text || null,
                    })),
                });
            }

            // Return with items and remarks
            return tx.hydrostatic_test_report.findUnique({
                where: { id: header.id },
                include: {
                    items: { orderBy: { sort_order: 'asc' } },
                    remarks: { orderBy: { sort_order: 'asc' } },
                },
            });
        });

        return report;
    }

    /**
     * Update an existing Hydrostatic Test Report record
     */
    async update(company_id, id, body) {
        const {
            shreno_drg_no,
            customer_drg_no,
            construction_code,
            chlorine_content,
            inspection_agency,
            test_position,
            procedure_no,
            test_medium,
            metal_temp,
            items = [],
            remarks = [],
        } = body;

        const existingReport = await prisma.hydrostatic_test_report.findFirst({
            where: { id, company_id },
        });

        if (!existingReport) throw new Error('Hydrostatic Test Report not found');

        const report = await prisma.$transaction(async (tx) => {
            // Update header record
            const header = await tx.hydrostatic_test_report.update({
                where: { id },
                data: {
                    shreno_drg_no: shreno_drg_no !== undefined ? shreno_drg_no : existingReport.shreno_drg_no,
                    customer_drg_no: customer_drg_no !== undefined ? customer_drg_no : existingReport.customer_drg_no,
                    construction_code: construction_code !== undefined ? construction_code : existingReport.construction_code,
                    chlorine_content: chlorine_content !== undefined ? chlorine_content : existingReport.chlorine_content,
                    inspection_agency: inspection_agency !== undefined ? inspection_agency : existingReport.inspection_agency,
                    test_position: test_position !== undefined ? test_position : existingReport.test_position,
                    procedure_no: procedure_no !== undefined ? procedure_no : existingReport.procedure_no,
                    test_medium: test_medium !== undefined ? test_medium : existingReport.test_medium,
                    metal_temp: metal_temp !== undefined ? metal_temp : existingReport.metal_temp,
                },
            });

            // Delete old items and remarks
            await tx.hydrostatic_test_item.deleteMany({
                where: { hydro_report_id: id }
            });

            await tx.hydrostatic_test_remark.deleteMany({
                where: { hydro_report_id: id }
            });

            // Create item rows
            if (items.length > 0) {
                await tx.hydrostatic_test_item.createMany({
                    data: items.map((item, idx) => ({
                        hydro_report_id: id,
                        sort_order: item.sort_order !== undefined ? item.sort_order : idx,
                        particulars: item.particulars || null,
                        mawp_int_ext: item.mawp_int_ext || null,
                        required_test_pressure: item.required_test_pressure || null,
                        actual_test_pressure: item.actual_test_pressure || null,
                        pg1_range: item.pg1_range || null,
                        pg1_id_no: item.pg1_id_no || null,
                        pg1_calib_date: item.pg1_calib_date || null,
                        pg1_due_date: item.pg1_due_date || null,
                        pg2_range: item.pg2_range || null,
                        pg2_id_no: item.pg2_id_no || null,
                        pg2_calib_date: item.pg2_calib_date || null,
                        pg2_due_date: item.pg2_due_date || null,
                        holding_time: item.holding_time || null,
                        test_result: item.test_result || null,
                    })),
                });
            }

            // Create remarks rows
            if (remarks.length > 0) {
                await tx.hydrostatic_test_remark.createMany({
                    data: remarks.map((remark, idx) => ({
                        hydro_report_id: id,
                        sort_order: remark.sort_order !== undefined ? remark.sort_order : idx,
                        text: remark.text || null,
                    })),
                });
            }

            // Return with updated items and remarks
            return tx.hydrostatic_test_report.findUnique({
                where: { id },
                include: {
                    items: { orderBy: { sort_order: 'asc' } },
                    remarks: { orderBy: { sort_order: 'asc' } },
                },
            });
        });

        return report;
    }


    /**
     * Get a single Hydrostatic Test record with items and remarks
     */
    async getById(company_id, id) {
        const report = await prisma.hydrostatic_test_report.findFirst({
            where: { id, company_id },
            include: {
                items: { orderBy: { sort_order: 'asc' } },
                remarks: { orderBy: { sort_order: 'asc' } },
            },
        });

        if (!report) throw new Error('Hydrostatic Test Report not found');
        return report;
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

        const lastReport = await prisma.hydrostatic_test_report.findFirst({
            where: { company_id },
            orderBy: { serial_no: 'desc' },
            select: { serial_no: true }
        });

        const nextSerialNo = lastReport ? lastReport.serial_no + 1 : 1;
        const paddedSerial = String(nextSerialNo).padStart(4, '0');
        const reportNo = `SHR/${job.job_number}/HYDRO/${paddedSerial}`;

        return { next_report_no: reportNo, next_serial_no: nextSerialNo };
    }

    /**
     * Get active filters metadata
     */
    async getActiveFilters(company_id) {
        const records = await prisma.hydrostatic_test_report.findMany({
            where: { company_id },
            select: {
                client: true,
                po_no: true,
                msn: true
            },
            distinct: ['client', 'po_no', 'msn']
        });

        const mapped = records.map(r => ({
            client: r.client,
            po: r.po_no,
            msn: r.msn
        }));

        return { records: mapped };
    }
}

module.exports = new HydroTestService();
