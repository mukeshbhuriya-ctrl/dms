const prisma = require('#prisma');
const excelGenerator = require('../utils/excelGenerator');

class ExportService {
    /**
     * Helper to create date filter for Prisma where clause.
     */
    _getDateFilter(startDate, endDate, dateField = 'createdAt') {
        if (!startDate && !endDate) return {};
        
        const filter = {};
        if (startDate && startDate !== '') {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) filter.gte = start;
        }
        if (endDate && endDate !== '') {
            const end = new Date(endDate);
            if (!isNaN(end.getTime())) {
                end.setHours(23, 59, 59, 999);
                filter.lte = end;
            }
        }
        
        if (Object.keys(filter).length === 0) return {};
        return { [dateField]: filter };
    }

    /**
     * Get record counts for all report modules.
     */
    async getReportSummary(company_id, startDate, endDate) {
        const summary = {};
        
        // Define modules and their primary date fields
        const modules = [
            { key: 'ncr', model: 'ncr', dateField: 'date' },
            { key: 'dcr', model: 'dcr', dateField: 'createdAt' },
            { key: 'wjp', model: 'weld_joint_plan', dateField: 'createdAt' },
            { key: 'wjd', model: 'weld_joint', dateField: 'createdAt', relationFilter: { weld_joint_plan: { company_id } } },
            { key: 'mhc', model: 'material_heat_chart', dateField: 'createdAt' },
            { key: 'qap', model: 'quality_assurance_plan', dateField: 'createdAt' },
            { key: 'hydro', model: 'hydrostatic_test_report', dateField: 'createdAt' },
            { key: 'dishend', model: 'dish_end_inspection_report', dateField: 'createdAt' },
            { key: 'final', model: 'final_inspection_report', dateField: 'createdAt' },
            { key: 'rfq', model: 'rfq_register', dateField: 'enq_date' },
            { key: 'users', model: 'user', dateField: 'createdAt' },
            { key: 'customers', model: 'customer', dateField: 'createdAt' },
            { key: 'jobs', model: 'job', dateField: 'createdAt' },
            { key: 'locations', model: 'customer_location', dateField: 'createdAt' },
            { key: 'departments', model: 'department', dateField: 'createdAt' },
        ];

        for (const mod of modules) {
            try {
                const whereClause = {
                    ...this._getDateFilter(startDate, endDate, mod.dateField)
                };

                if (mod.relationFilter) {
                    Object.assign(whereClause, mod.relationFilter);
                } else {
                    whereClause.company_id = company_id;
                }

                const count = await prisma[mod.model].count({
                    where: whereClause
                });
                summary[mod.key] = count;
            } catch (err) {
                console.error(`Error counting ${mod.key}:`, err.message);
                summary[mod.key] = 0;
            }
        }

        return summary;
    }

    /**
     * Export Locations for a company.
     */
    async exportLocations(company_id, startDate, endDate) {
        const locations = await prisma.customer_location.findMany({
            where: { 
                company_id,
                ...this._getDateFilter(startDate, endDate)
            },
            include: {
                customer: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const sheetData = locations.map(loc => ({
            customer_name: loc.customer?.customer_name || 'N/A',
            customer_short_name: loc.customer?.customer_short_name || 'N/A',
            location_name: loc.location_name,
            sap_number: loc.customer_number_as_per_sap || 'N/A',
            gst_number: loc.gst_number || 'N/A',
            created_at: loc.createdAt.toLocaleString(),
        }));

        const sheets = [
            {
                name: 'Locations',
                columns: [
                    { header: 'Customer Name', key: 'customer_name', width: 30 },
                    { header: 'Customer Short Name', key: 'customer_short_name', width: 20 },
                    { header: 'Location Name', key: 'location_name', width: 30 },
                    { header: 'SAP Number', key: 'sap_number', width: 20 },
                    { header: 'GST Number', key: 'gst_number', width: 25 },
                    { header: 'Created Date', key: 'created_at', width: 25 },
                ],
                data: sheetData,
            }
        ];

        // Also include linked customers in a separate sheet for complete data context
        const customerIds = [...new Set(locations.map(l => l.customer_id))];
        const customers = await prisma.customer.findMany({
            where: { id: { in: customerIds } }
        });

        sheets.push({
            name: 'Linked Customers',
            columns: [
                { header: 'Customer Name', key: 'customer_name', width: 30 },
                { header: 'Short Name', key: 'customer_short_name', width: 20 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Mobile', key: 'mobile', width: 20 },
            ],
            data: customers.map(c => ({
                customer_name: c.customer_name,
                customer_short_name: c.customer_short_name,
                email: c.email,
                mobile: c.mobile || 'N/A',
            })),
        });

        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export Customers for a company.
     */
    async exportCustomers(company_id, startDate, endDate) {
        const customers = await prisma.customer.findMany({
            where: { 
                company_id,
                ...this._getDateFilter(startDate, endDate)
            },
            include: {
                customer_locations: true,
                pos: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const sheets = [
            {
                name: 'Customers',
                columns: [
                    { header: 'Customer Name', key: 'customer_name', width: 30 },
                    { header: 'Short Name', key: 'customer_short_name', width: 20 },
                    { header: 'Email', key: 'email', width: 30 },
                    { header: 'Mobile', key: 'mobile', width: 20 },
                    { header: 'Created Date', key: 'created_at', width: 25 },
                ],
                data: customers.map(c => ({
                    ...c,
                    created_at: c.createdAt.toLocaleString(),
                })),
            }
        ];

        // Add Locations Sheet
        const allLocations = customers.flatMap(c => c.customer_locations.map(loc => ({
            ...loc,
            customer_name: c.customer_name
        })));
        sheets.push({
            name: 'All Locations',
            columns: [
                { header: 'Customer', key: 'customer_name', width: 30 },
                { header: 'Location', key: 'location_name', width: 30 },
                { header: 'SAP Number', key: 'customer_number_as_per_sap', width: 20 },
                { header: 'GST Number', key: 'gst_number', width: 25 },
            ],
            data: allLocations,
        });

        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export Jobs for a company.
     */
    async exportJobs(company_id, startDate, endDate) {
        const jobs = await prisma.job.findMany({
            where: { 
                company_id,
                ...this._getDateFilter(startDate, endDate)
            },
            include: {
                customer: { select: { customer_name: true } },
                customer_location: { select: { location_name: true } },
                po: { select: { po_number: true, po_date: true } }
            },
            orderBy: { createdAt: 'desc' },
        });

        const sheetData = jobs.map(job => ({
            job_number: job.job_number,
            equipment_name: job.equipement_name || 'N/A',
            project_id: job.project_id || 'N/A',
            tag_number: job.tag_number || 'N/A',
            code: job.code || 'N/A',
            customer: job.customer?.customer_name || 'N/A',
            location: job.customer_location?.location_name || 'N/A',
            po_number: job.po?.po_number || 'N/A',
            po_date: job.po?.po_date ? new Date(job.po.po_date).toLocaleDateString() : 'N/A',
            created_at: job.createdAt.toLocaleString(),
        }));

        const sheets = [
            {
                name: 'Jobs',
                columns: [
                    { header: 'Job Number', key: 'job_number', width: 20 },
                    { header: 'Equipment Name', key: 'equipment_name', width: 30 },
                    { header: 'Project ID', key: 'project_id', width: 20 },
                    { header: 'Tag Number', key: 'tag_number', width: 20 },
                    { header: 'Code', key: 'code', width: 20 },
                    { header: 'Customer', key: 'customer', width: 30 },
                    { header: 'Location', key: 'location', width: 30 },
                    { header: 'PO Number', key: 'po_number', width: 20 },
                    { header: 'PO Date', key: 'po_date', width: 20 },
                    { header: 'Created Date', key: 'created_at', width: 25 },
                ],
                data: sheetData,
            }
        ];

        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export Departments for a company.
     */
    async exportDepartments(company_id, startDate, endDate) {
        const departments = await prisma.department.findMany({
            where: { 
                company_id,
                ...this._getDateFilter(startDate, endDate)
            },
            orderBy: { createdAt: 'desc' },
        });

        const sheets = [
            {
                name: 'Departments',
                columns: [
                    { header: 'Department Name', key: 'name', width: 30 },
                    { header: 'Created Date', key: 'created_at', width: 25 },
                ],
                data: departments.map(d => ({
                    name: d.name,
                    created_at: d.createdAt.toLocaleString(),
                })),
            }
        ];

        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export Users for a company.
     */
    async exportUsers(company_id) {
        const users = await prisma.user.findMany({
            where: { company_id },
            include: {
                user_roles: {
                    include: { role: true }
                },
                department: true
            },
            orderBy: { createdAt: 'desc' },
        });

        const sheets = [
            {
                name: 'Users',
                columns: [
                    { header: 'Name', key: 'name', width: 30 },
                    { header: 'Email', key: 'email', width: 30 },
                    { header: 'Employee ID', key: 'empid', width: 20 },
                    { header: 'Mobile', key: 'mobile', width: 20 },
                    { header: 'Department', key: 'department', width: 20 },
                    { header: 'Designation', key: 'designation', width: 20 },
                    { header: 'Roles', key: 'roles', width: 30 },
                    { header: 'Created Date', key: 'created_at', width: 25 },
                ],
                data: users.map(u => ({
                    name: u.name,
                    email: u.email,
                    empid: u.empid,
                    mobile: u.mobile || 'N/A',
                    department: u.department?.name || 'N/A',
                    designation: u.designation || 'N/A',
                    roles: u.user_roles.map(ur => ur.role.name).join(', '),
                    created_at: u.createdAt.toLocaleString(),
                })),
            }
        ];

        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export MHC reports.
     */
    async exportMHC(company_id, startDate, endDate) {
        const reports = await prisma.material_heat_chart.findMany({
            where: { 
                company_id,
                ...this._getDateFilter(startDate, endDate)
            },
            include: { items: { orderBy: { sort_order: 'asc' } } },
            orderBy: { createdAt: 'desc' },
        });

        const flatData = reports.map(r => {
            const items = r.items || [];
            let currentHeading = "-";

            const itemRows = items.map(item => {
                if (item.is_heading) {
                    currentHeading = item.heading_text || item.item_no || "HEADING";
                }
                return {
                    heading: currentHeading,
                    item_no: item.item_no || '-',
                    description: item.description || '-',
                    size: item.size || '-',
                    material_spec: item.material_spec || '-',
                    qty_unit: item.quantity_unit || '-',
                    heat_no: item.heat_no || '-',
                    mtr_no: item.mtr_no || '-',
                    manufacturer: item.manufacturer || '-',
                    remarks: item.remarks || '-',
                };
            });

            return {
                msn: r.msn,
                client: r.client,
                po_no: r.po_no,
                project_id: r.project_id || 'N/A',
                equipment_name: r.equipment_name || 'N/A',
                tag_no: r.tag_no || 'N/A',
                code: r.code || 'N/A',
                shreno_drg_no: r.shreno_drg_no || 'N/A',
                customer_drg_no: r.customer_drg_no || 'N/A',
                report_no: r.report_no,
                inspection_by: r.inspection_by || 'N/A',
                // Table Data (Aggregated)
                heading: itemRows.map(ir => ir.heading).join('\n') || 'N/A',
                item_no: itemRows.map(ir => ir.item_no).join('\n') || 'N/A',
                description: itemRows.map(ir => ir.description).join('\n') || 'N/A',
                size: itemRows.map(ir => ir.size).join('\n') || 'N/A',
                material_spec: itemRows.map(ir => ir.material_spec).join('\n') || 'N/A',
                qty_unit: itemRows.map(ir => ir.qty_unit).join('\n') || 'N/A',
                heat_no: itemRows.map(ir => ir.heat_no).join('\n') || 'N/A',
                mtr_no: itemRows.map(ir => ir.mtr_no).join('\n') || 'N/A',
                manufacturer: itemRows.map(ir => ir.manufacturer).join('\n') || 'N/A',
                remarks: itemRows.map(ir => ir.remarks).join('\n') || 'N/A',
                status: (r.status || 'draft').toUpperCase(),
                created_at: r.createdAt.toLocaleString(),
            };
        });

        const sheets = [
            {
                name: 'MHC Full Report',
                columns: [
                    { header: 'MSN / JOB NO', key: 'msn', width: 15 },
                    { header: 'CLIENT', key: 'client', width: 20 },
                    { header: 'PO NO', key: 'po_no', width: 15 },
                    { header: 'PROJECT ID', key: 'project_id', width: 15 },
                    { header: 'EQUIPMENT', key: 'equipment_name', width: 20 },
                    { header: 'TAG NO', key: 'tag_no', width: 15 },
                    { header: 'CODE', key: 'code', width: 15 },
                    { header: 'SHRENO DRG NO', key: 'shreno_drg_no', width: 20 },
                    { header: 'CUSTOMER DRG NO', key: 'customer_drg_no', width: 20 },
                    { header: 'REPORT NO', key: 'report_no', width: 25 },
                    { header: 'INSPECTION BY', key: 'inspection_by', width: 15 },
                    { header: 'HEADING', key: 'heading', width: 20 },
                    { header: 'ITEM NO./PART NO.', key: 'item_no', width: 20 },
                    { header: 'DESCRIPTION', key: 'description', width: 30 },
                    { header: 'SIZE', key: 'size', width: 20 },
                    { header: 'MATERIAL SPECIFICATION', key: 'material_spec', width: 25 },
                    { header: 'QUANTITY / UNIT', key: 'qty_unit', width: 15 },
                    { header: 'HEAT NO. / CAST NO. / PLATE NO.', key: 'heat_no', width: 30 },
                    { header: 'MTR NO.', key: 'mtr_no', width: 15 },
                    { header: 'MANUFACTURER NAME', key: 'manufacturer', width: 20 },
                    { header: 'REMARKS NCR/DCR', key: 'remarks', width: 25 },
                    { header: 'STATUS', key: 'status', width: 12 },
                    { header: 'CREATED DATE', key: 'created_at', width: 20 },
                ],
                data: flatData,
            }
        ];

        return await excelGenerator.generateReport(sheets);
    }


    /**
     * Export Hydro Test reports.
     */
    async exportHydro(company_id, startDate, endDate) {
        const reports = await prisma.hydrostatic_test_report.findMany({
            where: { 
                company_id,
                ...this._getDateFilter(startDate, endDate)
            },
            include: {
                items: { orderBy: { sort_order: 'asc' } },
                remarks: { orderBy: { sort_order: 'asc' } }
            },
            orderBy: { createdAt: 'desc' },
        });

        const flatData = reports.map(r => {
            const items = r.items || [];
            const remarksText = r.remarks.map(rem => rem.text).filter(Boolean).join('\n');

            return {
                msn: r.msn,
                client: r.client,
                po_no: r.po_no,
                project_id: r.project_id || 'N/A',
                equipment_name: r.equipment_name || 'N/A',
                tag_no: r.tag_no || 'N/A',
                code: r.code || 'N/A',
                shreno_drg_no: r.shreno_drg_no || 'N/A',
                customer_drg_no: r.customer_drg_no || 'N/A',
                report_no: r.report_no,
                // Aggregated Item Data
                particulars: items.map(i => i.particulars || '-').join('\n') || 'N/A',
                mawp_int_ext: items.map(i => i.mawp_int_ext || '-').join('\n') || 'N/A',
                required_test_pressure: items.map(i => i.required_test_pressure || '-').join('\n') || 'N/A',
                actual_test_pressure: items.map(i => i.actual_test_pressure || '-').join('\n') || 'N/A',
                holding_time: items.map(i => i.holding_time || '-').join('\n') || 'N/A',
                test_result: items.map(i => i.test_result || '-').join('\n') || 'N/A',
                // Pressure Gauges
                pg1_range: items.map(i => i.pg1_range || '-').join('\n') || 'N/A',
                pg1_id_no: items.map(i => i.pg1_id_no || '-').join('\n') || 'N/A',
                pg1_calib_date: items.map(i => i.pg1_calib_date || '-').join('\n') || 'N/A',
                pg1_due_date: items.map(i => i.pg1_due_date || '-').join('\n') || 'N/A',
                pg2_range: items.map(i => i.pg2_range || '-').join('\n') || 'N/A',
                pg2_id_no: items.map(i => i.pg2_id_no || '-').join('\n') || 'N/A',
                pg2_calib_date: items.map(i => i.pg2_calib_date || '-').join('\n') || 'N/A',
                pg2_due_date: items.map(i => i.pg2_due_date || '-').join('\n') || 'N/A',
                // Header details continued
                construction_code: r.construction_code || 'N/A',
                chlorine_content: r.chlorine_content || 'N/A',
                inspection_agency: r.inspection_agency || 'N/A',
                test_position: r.test_position || 'N/A',
                procedure_no: r.procedure_no || 'N/A',
                test_medium: r.test_medium || 'N/A',
                metal_temp: r.metal_temp || 'N/A',
                status: (r.status || 'draft').toUpperCase(),
                remarks_all: remarksText || 'N/A',
                created_at: r.createdAt.toLocaleString(),
            };
        });

        const sheets = [
            {
                name: 'Hydro Full Report',
                columns: [
                    { header: 'MSN NUMBER', key: 'msn', width: 15 },
                    { header: 'CLIENT', key: 'client', width: 20 },
                    { header: 'PO NO', key: 'po_no', width: 15 },
                    { header: 'PROJECT ID', key: 'project_id', width: 15 },
                    { header: 'EQUIPMENT', key: 'equipment_name', width: 20 },
                    { header: 'TAG NO', key: 'tag_no', width: 15 },
                    { header: 'CODE', key: 'code', width: 15 },
                    { header: 'SHRENO DRG NO', key: 'shreno_drg_no', width: 20 },
                    { header: 'CUSTOMER DRG NO', key: 'customer_drg_no', width: 20 },
                    { header: 'REPORT NO', key: 'report_no', width: 25 },
                    { header: 'PARTICULARS', key: 'particulars', width: 30 },
                    { header: 'MAWP (INT/EXT)', key: 'mawp_int_ext', width: 15 },
                    { header: 'REQ. PRESSURE', key: 'required_test_pressure', width: 15 },
                    { header: 'ACT. PRESSURE', key: 'actual_test_pressure', width: 15 },
                    { header: 'HOLDING TIME', key: 'holding_time', width: 15 },
                    { header: 'TEST RESULT', key: 'test_result', width: 15 },
                    { header: 'CONSTRUCTION CODE', key: 'construction_code', width: 20 },
                    { header: 'CHLORINE CONTENT', key: 'chlorine_content', width: 15 },
                    { header: 'INSPECTION AGENCY', key: 'inspection_agency', width: 20 },
                    { header: 'TEST POSITION', key: 'test_position', width: 15 },
                    { header: 'PROCEDURE NO', key: 'procedure_no', width: 15 },
                    { header: 'TEST MEDIUM', key: 'test_medium', width: 15 },
                    { header: 'METAL TEMP', key: 'metal_temp', width: 15 },
                    { header: 'PG1 RANGE', key: 'pg1_range', width: 15 },
                    { header: 'PG1 ID NO', key: 'pg1_id_no', width: 15 },
                    { header: 'PG1 CALIB DATE', key: 'pg1_calib_date', width: 15 },
                    { header: 'PG1 DUE DATE', key: 'pg1_due_date', width: 15 },
                    { header: 'PG2 RANGE', key: 'pg2_range', width: 15 },
                    { header: 'PG2 ID NO', key: 'pg2_id_no', width: 15 },
                    { header: 'PG2 CALIB DATE', key: 'pg2_calib_date', width: 15 },
                    { header: 'PG2 DUE DATE', key: 'pg2_due_date', width: 15 },
                    { header: 'REMARKS / NOTES', key: 'remarks_all', width: 40 },
                    { header: 'STATUS', key: 'status', width: 12 },
                    { header: 'CREATED DATE', key: 'created_at', width: 20 },
                ],
                data: flatData,
            }
        ];

        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export Dish End Inspection reports.
     */
    async exportDishEnd(company_id, startDate, endDate) {
        const reports = await prisma.dish_end_inspection_report.findMany({
            where: { 
                company_id,
                ...this._getDateFilter(startDate, endDate)
            },
            include: {
                items: { orderBy: { sr_no: 'asc' } },
                instruments: true,
                quality_engineer: true
            },
            orderBy: { createdAt: 'desc' },
        });

        const flatData = reports.map(r => {
            const items = r.items || [];
            const instruments = r.instruments || [];

            return {
                msn: r.msn,
                client: r.client,
                po_no: r.po_no,
                project_id: r.project_id || 'N/A',
                equipment_name: r.equipment_name || 'N/A',
                tag_no: r.tag_no || 'N/A',
                code: r.code || 'N/A',
                drg_no: r.drg_no || 'N/A',
                insp_agency: r.insp_agency || 'N/A',
                report_no: r.report_no,
                quality_engineer: r.quality_engineer?.name || 'N/A',
                vendor_dish_end_number: r.vendor_dish_end_number || 'N/A',
                status: (r.status || 'Pending').toUpperCase(),
                createdAt: r.createdAt.toLocaleString(),
                // Items Aggregation
                item_sr: items.map(i => i.sr_no || '-').join('\n'),
                item_desc: items.map(i => i.description || '-').join('\n'),
                item_drg: items.map(i => i.as_per_drg || '-').join('\n'),
                item_actual: items.map(i => i.actual || '-').join('\n'),
                item_remarks: items.map(i => i.remarks || '-').join('\n'),
                // Instruments Aggregation
                inst_name: instruments.map(i => i.name || '-').join('\n'),
                inst_id: instruments.map(i => i.id_no || '-').join('\n'),
                inst_due: instruments.map(i => i.due_date || '-').join('\n'),
            };
        });

        const sheets = [
            {
                name: 'Dish End Full Report',
                columns: [
                    { header: 'MSN / JOB NO', key: 'msn', width: 15 },
                    { header: 'CLIENT', key: 'client', width: 20 },
                    { header: 'PO NO', key: 'po_no', width: 15 },
                    { header: 'PROJECT ID', key: 'project_id', width: 15 },
                    { header: 'EQUIPMENT', key: 'equipment_name', width: 20 },
                    { header: 'TAG NO', key: 'tag_no', width: 15 },
                    { header: 'CODE', key: 'code', width: 15 },
                    { header: 'DRG NO', key: 'drg_no', width: 20 },
                    { header: 'INSP AGENCY', key: 'insp_agency', width: 20 },
                    { header: 'REPORT NO', key: 'report_no', width: 25 },
                    { header: 'QUALITY ENGINEER', key: 'quality_engineer', width: 20 },
                    { header: 'VENDOR DISH END NO', key: 'vendor_dish_end_number', width: 20 },
                    { header: 'ITEM SR NO', key: 'item_sr', width: 10 },
                    { header: 'ITEM DESCRIPTION', key: 'item_desc', width: 30 },
                    { header: 'AS PER DRG', key: 'item_drg', width: 20 },
                    { header: 'ACTUAL', key: 'item_actual', width: 20 },
                    { header: 'ITEM REMARKS', key: 'item_remarks', width: 25 },
                    { header: 'INSTRUMENT NAME', key: 'inst_name', width: 20 },
                    { header: 'INST. ID / SR NO', key: 'inst_id', width: 20 },
                    { header: 'INST. DUE DATE', key: 'inst_due', width: 15 },
                    { header: 'STATUS', key: 'status', width: 12 },
                    { header: 'CREATED DATE', key: 'createdAt', width: 20 },
                ],
                data: flatData,
            }
        ];

        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export Final Inspection reports.
     */
    async exportFinalInspection(company_id, startDate, endDate) {
        const reports = await prisma.final_inspection_report.findMany({
            where: { 
                company_id,
                ...this._getDateFilter(startDate, endDate)
            },
            include: {
                details: { orderBy: { sr_no: 'asc' } },
                nozzles: { orderBy: { sr_no: 'asc' } },
                parts: { orderBy: { sr_no: 'asc' } },
                instruments: true,
                remarks: { orderBy: { sr_no: 'asc' } },
                quality_engineer: true
            },
            orderBy: { createdAt: 'desc' },
        });

        const flatData = reports.map(r => {
            const details = r.details || [];
            const nozzles = r.nozzles || [];
            const parts = r.parts || [];
            const instruments = r.instruments || [];
            const remarks = r.remarks || [];

            return {
                msn: r.msn,
                client: r.client,
                po_no: r.po_no,
                project_id: r.project_id || 'N/A',
                equipment_name: r.equipment_name || 'N/A',
                tag_no: r.tag_no || 'N/A',
                code: r.code || 'N/A',
                drg_no: r.drg_no || 'N/A',
                report_no: r.report_no,
                quality_engineer: r.quality_engineer?.name || 'N/A',
                status: (r.status || 'Pending').toUpperCase(),
                createdAt: r.createdAt.toLocaleString(),
                // Details Aggregation
                det_desc: details.map(d => d.description || '-').join('\n'),
                det_req: details.map(d => d.required || '-').join('\n'),
                det_act: details.map(d => d.actual || '-').join('\n'),
                det_rem: details.map(d => d.remarks || '-').join('\n'),
                // Nozzles Aggregation
                noz_mark: nozzles.map(n => n.nozzle_mark || '-').join('\n'),
                noz_orient: nozzles.map(n => n.orientation || '-').join('\n'),
                noz_size: nozzles.map(n => n.size || '-').join('\n'),
                noz_loc: nozzles.map(n => n.location || '-').join('\n'),
                noz_elev_app: nozzles.map(n => n.elevation_approved || '-').join('\n'),
                noz_proj_app: nozzles.map(n => n.projection_approved || '-').join('\n'),
                noz_elev_act: nozzles.map(n => n.elevation_actual || '-').join('\n'),
                noz_proj_act: nozzles.map(n => n.projection_actual || '-').join('\n'),
                // Parts Aggregation
                part_no: parts.map(p => p.part_no || '-').join('\n'),
                part_desc: parts.map(p => p.description || '-').join('\n'),
                part_orient: parts.map(p => p.orientation_approved || '-').join('\n'),
                part_elev_app: parts.map(p => p.elevation_approved || '-').join('\n'),
                part_proj_app: parts.map(p => p.projection_approved || '-').join('\n'),
                part_elev_act: parts.map(p => p.elevation_actual || '-').join('\n'),
                part_proj_act: parts.map(p => p.projection_actual || '-').join('\n'),
                // Instruments Aggregation
                inst_name: instruments.map(i => i.name || '-').join('\n'),
                inst_id: instruments.map(i => i.id_no || '-').join('\n'),
                inst_due: instruments.map(i => i.due_date || '-').join('\n'),
                // Remarks Aggregation
                rem_text: remarks.map(rem => rem.text || '-').join('\n'),
            };
        });

        const sheets = [
            {
                name: 'Final Inspection Full Report',
                columns: [
                    { header: 'MSN / JOB NO', key: 'msn', width: 15 },
                    { header: 'CLIENT', key: 'client', width: 20 },
                    { header: 'PO NO', key: 'po_no', width: 15 },
                    { header: 'PROJECT ID', key: 'project_id', width: 15 },
                    { header: 'EQUIPMENT', key: 'equipment_name', width: 20 },
                    { header: 'TAG NO', key: 'tag_no', width: 15 },
                    { header: 'CODE', key: 'code', width: 15 },
                    { header: 'DRG NO', key: 'drg_no', width: 20 },
                    { header: 'REPORT NO', key: 'report_no', width: 25 },
                    { header: 'QUALITY ENGINEER', key: 'quality_engineer', width: 20 },
                    { header: 'INSP. DESCRIPTION', key: 'det_desc', width: 30 },
                    { header: 'INSP. REQUIRED', key: 'det_req', width: 20 },
                    { header: 'INSP. ACTUAL', key: 'det_act', width: 20 },
                    { header: 'INSP. REMARKS', key: 'det_rem', width: 25 },
                    { header: 'NOZZLE MARK', key: 'noz_mark', width: 15 },
                    { header: 'NOZZLE ORIENT', key: 'noz_orient', width: 15 },
                    { header: 'NOZZLE SIZE', key: 'noz_size', width: 15 },
                    { header: 'NOZZLE LOCATION', key: 'noz_loc', width: 15 },
                    { header: 'NOZZLE ELEV APP', key: 'noz_elev_app', width: 15 },
                    { header: 'NOZZLE PROJ APP', key: 'noz_proj_app', width: 15 },
                    { header: 'NOZZLE ELEV ACT', key: 'noz_elev_act', width: 15 },
                    { header: 'NOZZLE PROJ ACT', key: 'noz_proj_act', width: 15 },
                    { header: 'PART NO', key: 'part_no', width: 15 },
                    { header: 'PART DESCRIPTION', key: 'part_desc', width: 30 },
                    { header: 'PART ORIENT', key: 'part_orient', width: 15 },
                    { header: 'PART ELEV APP', key: 'part_elev_app', width: 15 },
                    { header: 'PART PROJ APP', key: 'part_proj_app', width: 15 },
                    { header: 'PART ELEV ACT', key: 'part_elev_act', width: 15 },
                    { header: 'PART PROJ ACT', key: 'part_proj_act', width: 15 },
                    { header: 'INSTRUMENT NAME', key: 'inst_name', width: 20 },
                    { header: 'INST. ID / SR NO', key: 'inst_id', width: 20 },
                    { header: 'INST. DUE DATE', key: 'inst_due', width: 15 },
                    { header: 'REMARKS / NOTES', key: 'rem_text', width: 40 },
                    { header: 'STATUS', key: 'status', width: 12 },
                    { header: 'CREATED DATE', key: 'createdAt', width: 20 },
                ],
                data: flatData,
            }
        ];

        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export RFQ Register reports.
     */
    async exportRFQRegister(company_id, startDate, endDate) {
        const reports = await prisma.rfq_register.findMany({
            where: { 
                company_id,
                ...this._getDateFilter(startDate, endDate, 'enq_date')
            },
            include: {
                items: { orderBy: { sr_no: 'asc' } },
                creator: true
            },
            orderBy: { createdAt: 'desc' },
        });

        const flatData = reports.map(r => {
            const items = r.items || [];

            return {
                quotation_no: r.quotation_no,
                client_ref: r.client_ref || '-',
                rfq_type: r.rfq_type || '-',
                client_name: r.client_name || '-',
                consultancy: r.consultancy || '-',
                contact_person: r.contact_person || '-',
                mode_of_enquiry: r.mode_of_enquiry || '-',
                enq_date: r.enq_date ? new Date(r.enq_date).toLocaleDateString('en-GB') : '-',
                target_date: r.target_date ? new Date(r.target_date).toLocaleDateString('en-GB') : '-',
                actual_submission_date: r.actual_submission_date ? new Date(r.actual_submission_date).toLocaleDateString('en-GB') : '-',
                time_taken: r.time_taken || '-',
                mediator: r.mediator || '-',
                estimator: r.estimator || '-',
                shreno_status: r.shreno_status || '-',
                client_status: r.client_status || '-',
                made_by: r.made_by || '-',
                remark: r.remark || '-',
                createdAt: r.createdAt.toLocaleString(),
                // Items Aggregation
                item_sr: items.map(i => i.sr_no || '-').join('\n'),
                item_desc: items.map(i => i.enq_description || '-').join('\n'),
                item_qty: items.map(i => i.equip_qty || '-').join('\n'),
                item_rev: items.map(i => i.rev || '-').join('\n'),
                item_total: items.map(i => i.total_value ? `₹${i.total_value.toLocaleString('en-IN')}` : '-').join('\n'),
                item_po_no: items.map(i => i.po_no || '-').join('\n'),
                item_po_date: items.map(i => i.po_date ? new Date(i.po_date).toLocaleDateString('en-GB') : '-').join('\n'),
                item_po_val: items.map(i => i.po_value ? `₹${i.po_value.toLocaleString('en-IN')}` : '-').join('\n'),
                item_rem: items.map(i => i.remarks || '-').join('\n'),
            };
        });

        const sheets = [
            {
                name: 'RFQ Register Full Export',
                columns: [
                    { header: 'QUOTATION NO.', key: 'quotation_no', width: 20 },
                    { header: 'CLIENT REF.', key: 'client_ref', width: 20 },
                    { header: 'RFQ TYPE', key: 'rfq_type', width: 15 },
                    { header: 'CLIENT NAME', key: 'client_name', width: 25 },
                    { header: 'CONSULTANCY', key: 'consultancy', width: 20 },
                    { header: 'CONTACT PERSON', key: 'contact_person', width: 20 },
                    { header: 'MODE OF ENQUIRY', key: 'mode_of_enquiry', width: 20 },
                    { header: 'ENQ. DATE', key: 'enq_date', width: 15 },
                    { header: 'TARGET DATE', key: 'target_date', width: 15 },
                    { header: 'ACTUAL SUBMISSION DATE', key: 'actual_submission_date', width: 25 },
                    { header: 'TIME TAKEN', key: 'time_taken', width: 15 },
                    { header: 'MEDIATOR', key: 'mediator', width: 15 },
                    { header: 'ESTIMATOR', key: 'estimator', width: 15 },
                    { header: 'SHRENO STATUS', key: 'shreno_status', width: 20 },
                    { header: 'CLIENT STATUS', key: 'client_status', width: 20 },
                    { header: 'MADE BY', key: 'made_by', width: 15 },
                    { header: 'REMARK', key: 'remark', width: 30 },
                    { header: 'ITEM SR NO.', key: 'item_sr', width: 10 },
                    { header: 'ENQ. DESCRIPTION', key: 'item_desc', width: 40 },
                    { header: 'EQUIP. QTY', key: 'item_qty', width: 12 },
                    { header: 'REV.', key: 'item_rev', width: 10 },
                    { header: 'TOTAL VALUE', key: 'item_total', width: 20 },
                    { header: 'PO NO.', key: 'item_po_no', width: 15 },
                    { header: 'PO DATE', key: 'item_po_date', width: 15 },
                    { header: 'PO VALUE', key: 'item_po_val', width: 20 },
                    { header: 'ITEM REMARKS', key: 'item_rem', width: 30 },
                    { header: 'CREATED AT', key: 'createdAt', width: 25 },
                ],
                data: flatData,
            }
        ];

        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export RFQ Lookup values (RFQ Type, Mode of Enquiry, Remark).
     */
    async exportRFQLookup(company_id, type, title) {
        const lookups = await prisma.rfq_lookup.findMany({
            where: { company_id, type },
            orderBy: { name: 'asc' },
        });

        const sheets = [
            {
                name: title,
                columns: [
                    { header: 'NAME', key: 'name', width: 40 },
                    { header: 'CREATED AT', key: 'createdAt', width: 25 },
                ],
                data: lookups.map(l => ({
                    name: l.name,
                    createdAt: l.createdAt.toLocaleString(),
                })),
            }
        ];

        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export Users for RFQ (Mediators / Estimators).
     */
    async exportRFQUsers(company_id, title) {
        const users = await prisma.user.findMany({
            where: { company_id },
            select: { name: true, email: true, createdAt: true },
            orderBy: { name: 'asc' },
        });

        const sheets = [
            {
                name: title,
                columns: [
                    { header: 'NAME', key: 'name', width: 30 },
                    { header: 'EMAIL', key: 'email', width: 40 },
                    { header: 'CREATED AT', key: 'createdAt', width: 25 },
                ],
                data: users.map(u => ({
                    name: u.name,
                    email: u.email,
                    createdAt: u.createdAt.toLocaleString(),
                })),
            }
        ];

        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export Quality Assurance Plan (QAP) reports.
     */
    async exportQAP(company_id, startDate, endDate) {
        const plans = await prisma.quality_assurance_plan.findMany({
            where: { 
                company_id,
                ...this._getDateFilter(startDate, endDate)
            },
            include: {
                items: { orderBy: { sort_order: 'asc' } }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (plans.length === 0) {
            return await excelGenerator.generateReport([{ name: 'QAP Reports', columns: [{ header: 'STATUS', key: 'status' }], data: [] }]);
        }

        // Identify all unique dynamic columns across all plans
        const dynamicColMap = new Map();
        plans.forEach(plan => {
            if (plan.dynamic_columns && Array.isArray(plan.dynamic_columns)) {
                plan.dynamic_columns.forEach(col => {
                    dynamicColMap.set(col.id, col.name);
                });
            }
        });

        const flatData = plans.map(p => {
            const items = p.items || [];

            // Helper to aggregate item fields
            const getAggr = (fn) => items.map(i => {
                if (i.is_heading) return i.heading_text || '-';
                return fn(i) || '-';
            }).join('\n');

            const row = {
                msn: p.msn || 'N/A',
                report_no: p.report_no || 'N/A',
                client: p.client || 'N/A',
                po_no: p.po_no || 'N/A',
                po_date: p.po_date || 'N/A',
                project_id: p.project_id || 'N/A',
                equipment_name: p.equipment_name || 'N/A',
                tag_no: p.tag_no || 'N/A',
                code: p.code || 'N/A',
                shreno_drg_no: p.shreno_drg_no || 'N/A',
                customer_drg_no: p.customer_drg_no || 'N/A',
                status: (p.status || 'draft').toUpperCase(),
                created_at: p.createdAt.toLocaleString(),

                // Aggregated Item details
                sr_no: items.map(i => i.sr_no || '-').join('\n'),
                activities: getAggr(i => i.activity),
                methods: getAggr(i => `${i.type_method_check || ''} ${i.extent || ''}`.trim()),
                criteria: getAggr(i => `${i.acceptance_criteria || ''} ${i.reference_documents || ''}`.trim()),
                verifying: getAggr(i => i.verifying_document),
                shreno_val: getAggr(i => i.shreno),
                client_tpia_val: getAggr(i => i.client_tpia),
                remarks_val: getAggr(i => i.remark),
            };

            // Add dynamic column values
            dynamicColMap.forEach((name, id) => {
                row[id] = items.map(i => {
                    if (i.is_heading) return '-';
                    return (i.dynamic_values && i.dynamic_values[id]) || '-';
                }).join('\n');
            });

            return row;
        });

        const columns = [
            { header: 'REPORT NO', key: 'report_no', width: 25 },
            { header: 'MSN NUMBER', key: 'msn', width: 15 },
            { header: 'CLIENT', key: 'client', width: 20 },
            { header: 'PO NO', key: 'po_no', width: 15 },
            { header: 'PO DATE', key: 'po_date', width: 15 },
            { header: 'PROJECT ID', key: 'project_id', width: 15 },
            { header: 'EQUIPMENT', key: 'equipment_name', width: 20 },
            { header: 'TAG NO', key: 'tag_no', width: 15 },
            { header: 'CODE', key: 'code', width: 15 },
            { header: 'SHRENO DRG NO', key: 'shreno_drg_no', width: 20 },
            { header: 'CUSTOMER DRG NO', key: 'customer_drg_no', width: 20 },
            // Aggregated columns
            { header: 'SR NO', key: 'sr_no', width: 10 },
            { header: 'ACTIVITY (DESCRIPTION)', key: 'activities', width: 40 },
            { header: 'TYPE / METHOD / EXTENT', key: 'methods', width: 30 },
            { header: 'ACCEPTANCE CRITERIA / REF DOCS', key: 'criteria', width: 35 },
            { header: 'VERIFYING DOCUMENT', key: 'verifying', width: 25 },
            { header: 'SHRENO', key: 'shreno_val', width: 10 },
            { header: 'CLIENT / TPIA', key: 'client_tpia_val', width: 15 },
        ];

        // Append dynamic columns to headers
        dynamicColMap.forEach((name, id) => {
            columns.push({ header: name.toUpperCase(), key: id, width: 15 });
        });

        // Closing standard columns
        columns.push(
            { header: 'REMARKS', key: 'remarks_val', width: 30 },
            { header: 'STATUS', key: 'status', width: 12 },
            { header: 'CREATED DATE', key: 'created_at', width: 20 }
        );

        const sheets = [{ name: 'QAP Full Report', columns, data: flatData }];
        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export Design Change Request (DCR) reports.
     */
    async exportDCR(company_id, startDate, endDate) {
        const dcrs = await prisma.dcr.findMany({
            where: {
                company_id,
                ...this._getDateFilter(startDate, endDate)
            },
            include: {
                job: { select: { job_number: true } },
                design_engineer: { select: { name: true } },
                quality_engineer: { select: { name: true } },
                dcr_change_request: true,
                dcr_status: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (dcrs.length === 0) {
            return await excelGenerator.generateReport([{ name: 'DCR Reports', columns: [{ header: 'DCR NO', key: 'dcr_no' }], data: [] }]);
        }

        const flatData = dcrs.map(d => {
            const requests = d.dcr_change_request || [];
            const latestStatus = d.dcr_status?.[0] || {};

            return {
                dcr_no: d.dcr_no || 'N/A',
                job_no: d.job?.job_number || 'N/A',
                drg_no: d.drg_no || 'N/A',
                equ_no: d.equ_no || 'N/A',
                inspect_by: d.inspect_by || 'N/A',
                design_engineer: d.design_engineer?.name || 'N/A',
                quality_engineer: d.quality_engineer?.name || 'N/A',

                // Aggregated Change Requests
                item_part_no: requests.map(r => r.item_part_no || '-').join('\n') || 'N/A',
                change_from: requests.map(r => r.chnage_from || '-').join('\n') || 'N/A',
                change_to: requests.map(r => r.chnage_to || '-').join('\n') || 'N/A',
                reasons: requests.map(r => r.reason || '-').join('\n') || 'N/A',

                // Status Details
                design_status: (latestStatus.design_engineer_status || 'pending').toUpperCase(),
                design_remarks: latestStatus.design_engineer_remarks || '-',
                quality_status: (latestStatus.quality_engineer_status || 'pending').toUpperCase(),
                quality_remarks: latestStatus.quality_engineer_remarks || '-',
                overall_status: (latestStatus.status || 'pending').toUpperCase(),

                created_at: d.createdAt.toLocaleString(),
            };
        });

        const sheets = [
            {
                name: 'DCR reports',
                columns: [
                    { header: 'DCR NO', key: 'dcr_no', width: 25 },
                    { header: 'JOB NO', key: 'job_no', width: 15 },
                    { header: 'DRAWING NO', key: 'drg_no', width: 20 },
                    { header: 'EQUIPMENT NO', key: 'equ_no', width: 20 },
                    { header: 'INSPECT BY', key: 'inspect_by', width: 20 },
                    { header: 'DESIGN ENGINEER', key: 'design_engineer', width: 25 },
                    { header: 'QUALITY ENGINEER', key: 'quality_engineer', width: 25 },

                    { header: 'ITEM / PART NO', key: 'item_part_no', width: 25 },
                    { header: 'CHANGE FROM', key: 'change_from', width: 30 },
                    { header: 'CHANGE TO', key: 'change_to', width: 30 },
                    { header: 'REASON FOR CHANGE', key: 'reasons', width: 40 },

                    { header: 'DESIGN STATUS', key: 'design_status', width: 15 },
                    { header: 'DESIGN REMARKS', key: 'design_remarks', width: 25 },
                    { header: 'QUALITY STATUS', key: 'quality_status', width: 15 },
                    { header: 'QUALITY REMARKS', key: 'quality_remarks', width: 25 },
                    { header: 'MAIN STATUS', key: 'overall_status', width: 15 },

                    { header: 'CREATED DATE', key: 'created_at', width: 20 },
                ],
                data: flatData,
            }
        ];

        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export Non-Conformance Reports (NCR) with all 5 stages.
     */
    async exportNCR(company_id, startDate, endDate) {
        const reports = await prisma.ncr.findMany({
            where: { 
                company_id,
                ...this._getDateFilter(startDate, endDate, 'date')
            },
            include: {
                job: { select: { job_number: true } },
                initiator: { select: { name: true } },
                raised_at_user: { select: { name: true } },
                resolution_user: { select: { name: true } },
                target_engineer: { select: { name: true } },
                target_head_design: { select: { name: true } },
                target_head_welding: { select: { name: true } },
                target_head_quality: { select: { name: true } },
                corrective_action_verifier: { select: { name: true } },
                qce_verifier: { select: { name: true } },
                head_quality_verifier: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' }
        });

        if (reports.length === 0) {
            return await excelGenerator.generateReport([{ name: 'NCR Reports', columns: [{ header: 'NCR NO', key: 'ncr_no' }], data: [] }]);
        }

        const flatData = reports.map(r => {
            return {
                ncr_no: r.ncr_no || 'N/A',
                msn: r.msn || 'N/A',
                job_no: r.job?.job_number || 'N/A',
                client: r.client || 'N/A',
                po_no: r.po_no || 'N/A',
                project_id: r.project_id || 'N/A',
                tag_no: r.tag_no || 'N/A',
                drg_no: r.drg_no || 'N/A',
                rev_no: r.rev_no || 'N/A',

                // Stage 1
                description: r.description_non_conformance || 'N/A',
                raised_by: r.initiator?.name || 'N/A',
                raised_at: r.raised_at_user?.name || 'N/A',
                raised_date: r.ncr_date ? new Date(r.ncr_date).toLocaleDateString() : 'N/A',

                // Stage 2
                proposed_resolution: r.proposed_resolution || 'N/A',
                resolution_by: r.resolution_user?.name || 'N/A',
                resolution_date: r.resolution_date ? new Date(r.resolution_date).toLocaleDateString() : 'N/A',
                target_engineer: r.target_engineer?.name || 'N/A',
                target_head_design: r.target_head_design?.name || 'N/A',
                target_head_welding: r.target_head_welding?.name || 'N/A',
                target_head_quality: r.target_head_quality?.name || 'N/A',

                // Stage 3
                design_status: (r.design_review_status || 'PENDING').toUpperCase(),
                design_comments: r.head_design_comments || '-',
                welding_status: (r.welding_review_status || 'PENDING').toUpperCase(),
                welding_comments: r.head_welding_comments || '-',
                quality_status: (r.quality_review_status || 'PENDING').toUpperCase(),
                quality_comments: r.head_quality_comments || '-',
                acceptance_date: r.acceptance_date ? new Date(r.acceptance_date).toLocaleDateString() : 'N/A',

                // Stage 4
                ca_verified_by: r.corrective_action_verifier?.name || 'N/A',
                ca_comments: r.corrective_action_comments || '-',
                ca_date: r.corrective_action_date ? new Date(r.corrective_action_date).toLocaleDateString() : 'N/A',
                qce_verifier: r.qce_verifier?.name || 'N/A',

                // Stage 5
                disposition: r.disposition || 'N/A',
                disposition_date: r.disposition_date ? new Date(r.disposition_date).toLocaleDateString() : 'N/A',
                head_quality_verifier: r.head_quality_verifier?.name || 'N/A',

                overall_status: (r.status || 'OPEN').toUpperCase(),
                ncr_status: (r.ncr_status || 'draft').toUpperCase(),
                created_at: r.createdAt.toLocaleString(),
            };
        });

        const columns = [
            { header: 'NCR NO', key: 'ncr_no', width: 25 },
            { header: 'MSN', key: 'msn', width: 15 },
            { header: 'JOB NO', key: 'job_no', width: 15 },
            { header: 'CLIENT', key: 'client', width: 20 },
            { header: 'PO NO', key: 'po_no', width: 15 },
            { header: 'TAG NO', key: 'tag_no', width: 15 },
            { header: 'DRG NO', key: 'drg_no', width: 20 },

            // Stage 1
            { header: 'DESCRIPTION OF NON-CONFORMANCE', key: 'description', width: 40 },
            { header: 'RAISED BY', key: 'raised_by', width: 20 },
            { header: 'RAISED AT', key: 'raised_at', width: 20 },
            { header: 'RAISED DATE', key: 'raised_date', width: 15 },

            // Stage 2
            { header: 'PROPOSED RESOLUTION', key: 'proposed_resolution', width: 40 },
            { header: 'RESOLUTION BY', key: 'resolution_by', width: 20 },
            { header: 'ENGINEER', key: 'target_engineer', width: 20 },
            { header: 'HEAD DESIGN', key: 'target_head_design', width: 20 },
            { header: 'HEAD WELDING', key: 'target_head_welding', width: 20 },
            { header: 'HEAD QUALITY', key: 'target_head_quality', width: 20 },

            // Stage 3
            { header: 'DESIGN HEAD STATUS', key: 'design_status', width: 15 },
            { header: 'DESIGN COMMENTS', key: 'design_comments', width: 25 },
            { header: 'WELDING HEAD STATUS', key: 'welding_status', width: 15 },
            { header: 'WELDING COMMENTS', key: 'welding_comments', width: 25 },
            { header: 'QUALITY HEAD STATUS', key: 'quality_status', width: 15 },
            { header: 'QUALITY COMMENTS', key: 'quality_comments', width: 25 },

            // Stage 4
            { header: 'CA VERIFIED BY', key: 'ca_verified_by', width: 20 },
            { header: 'CA COMMENTS', key: 'ca_comments', width: 25 },
            { header: 'QCE VERIFIER', key: 'qce_verifier', width: 20 },

            // Stage 5
            { header: 'DISPOSITION', key: 'disposition', width: 30 },
            { header: 'HEAD QUALITY VERIFIER', key: 'head_quality_verifier', width: 20 },

            { header: 'OVERALL STATUS', key: 'overall_status', width: 15 },
            { header: 'NCR STATUS', key: 'ncr_status', width: 15 },
            { header: 'CREATED DATE', key: 'created_at', width: 20 }
        ];

        const sheets = [{ name: 'NCR Reports', columns, data: flatData }];
        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export Weld Joint Plans with all joint details consolidated into single rows.
     */
    async exportWeldJointPlan(company_id, startDate, endDate) {
        const plans = await prisma.weld_joint_plan.findMany({
            where: { 
                company_id,
                ...this._getDateFilter(startDate, endDate)
            },
            include: {
                job: {
                    include: {
                        customer: { select: { customer_name: true } }
                    }
                },
                weld_joints: { orderBy: { createdAt: 'asc' } },
                creator: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (plans.length === 0) {
            return await excelGenerator.generateReport([{ name: 'Weld Joint Plans', columns: [{ header: 'WELD PLAN NO', key: 'weld_plan_no' }], data: [] }]);
        }

        const flatData = plans.map(p => {
            const joints = p.weld_joints || [];
            
            return {
                weld_plan_no: p.weld_plan_no || 'N/A',
                job_no: p.job?.job_number || 'N/A',
                project_id: p.job?.project_id || 'N/A',
                tag_no: p.job?.tag_number || 'N/A',
                client_name: p.job?.customer?.customer_name || 'N/A',
                equipment_name: p.job?.equipement_name || 'N/A',
                shr_drg_no: p.shreno_drg_no || 'N/A',
                customer_drg_no: p.customer_drg_no || 'N/A',
                code_of_construction: p.code_of_construction || 'N/A',
                created_by: p.creator?.name || 'N/A',
                created_at: p.createdAt.toLocaleString(),

                // Aggregated Joint details
                joint_no: joints.map(j => j.joint_no || '-').join('\n'),
                joint_type: joints.map(j => j.joint_type || '-').join('\n'),
                joint_description: joints.map(j => j.joint_description || '-').join('\n'),
                
                thickness: joints.map(j => `${j.base_metal_thickness_p1 || '-'}/${j.base_metal_thickness_p2 || '-'}`).join('\n'),
                spec: joints.map(j => `${j.base_metal_spec_p1 || '-'}/${j.base_metal_spec_p2 || '-'}`).join('\n'),
                
                consumable: joints.map(j => j.consumable || '-').join('\n'),
                wps_pqr_no: joints.map(j => j.wps_pqr_no || '-').join('\n'),
                process: joints.map(j => j.process || '-').join('\n'),
                impact_test: joints.map(j => j.impact_test || '-').join('\n'),
                
                // NDT Flags (Boolean to String)
                back_chip: joints.map(j => j.back_chip_req ? 'YES' : 'NO').join('\n'),
                pwht: joints.map(j => j.pwht ? 'YES' : 'NO').join('\n'),
                rt: joints.map(j => j.rt ? 'YES' : 'NO').join('\n'),
                pt: joints.map(j => j.pt ? 'YES' : 'NO').join('\n'),
                
                remarks: joints.map(j => j.remarks || '-').join('\n')
            };
        });

        const columns = [
            { header: 'WELD PLAN NO', key: 'weld_plan_no', width: 25 },
            { header: 'JOB NO', key: 'job_no', width: 15 },
            { header: 'PROJECT ID', key: 'project_id', width: 15 },
            { header: 'TAG NO', key: 'tag_no', width: 15 },
            { header: 'CLIENT NAME', key: 'client_name', width: 25 },
            { header: 'EQUIPMENT NAME', key: 'equipment_name', width: 25 },
            { header: 'SHRENO DRG NO', key: 'shr_drg_no', width: 20 },
            { header: 'CUSTOMER DRG NO', key: 'customer_drg_no', width: 20 },
            { header: 'CODE OF CONSTRUCTION', key: 'code_of_construction', width: 20 },
            
            { header: 'JOINT NO', key: 'joint_no', width: 15 },
            { header: 'JOINT TYPE', key: 'joint_type', width: 12 },
            { header: 'DESCRIPTION', key: 'joint_description', width: 30 },
            { header: 'THICKNESS (P1/P2)', key: 'thickness', width: 18 },
            { header: 'SPEC (P1/P2)', key: 'spec', width: 20 },
            { header: 'CONSUMABLE', key: 'consumable', width: 15 },
            { header: 'WPS / PQR NO', key: 'wps_pqr_no', width: 20 },
            { header: 'PROCESS', key: 'process', width: 15 },
            { header: 'IMPACT TEST', key: 'impact_test', width: 15 },
            
            { header: 'BACK CHIP', key: 'back_chip', width: 12 },
            { header: 'PWHT', key: 'pwht', width: 10 },
            { header: 'RT', key: 'rt', width: 10 },
            { header: 'PT', key: 'pt', width: 10 },
            
            { header: 'REMARKS', key: 'remarks', width: 30 },
            { header: 'CREATED BY', key: 'created_by', width: 20 },
            { header: 'CREATED AT', key: 'created_at', width: 20 }
        ];

        const sheets = [{ name: 'Weld Joint Plans', columns, data: flatData }];
        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export individual Weld Joints with full specifications and parent metadata.
     */
    async exportWeldJoint(company_id, startDate, endDate) {
        const joints = await prisma.weld_joint.findMany({
            where: { 
                weld_joint_plan: { 
                    company_id,
                    ...this._getDateFilter(startDate, endDate)
                } 
            },
            include: {
                weld_joint_plan: {
                    include: {
                        job: {
                            include: {
                                customer: { select: { customer_name: true } }
                            }
                        }
                    }
                },
                weld_joint_inspection: true
            },
            orderBy: { createdAt: 'desc' }
        });

        if (joints.length === 0) {
            return await excelGenerator.generateReport([{ name: 'Weld Joints', columns: [{ header: 'JOINT NO', key: 'joint_no' }], data: [] }]);
        }

        const flatData = joints.map(j => {
            const p = j.weld_joint_plan || {};
            const job = p.job || {};
            const insp = j.weld_joint_inspection || {};

            const getOverallStatus = (joint) => {
                const insp = joint.weld_joint_inspection || {};
                if (insp.s1_status !== 'approved') return 'STAGE 1';

                if (joint.joint_type === 'C') {
                    if (insp.s2_status !== 'approved') return 'STAGE 2';
                    if (insp.s7_status !== 'approved') return 'STAGE 7';
                    if (insp.s8_status !== 'approved') return 'STAGE 8';
                    return 'COMPLETED';
                }

                if (joint.joint_type === 'D') {
                    if (insp.s2_status !== 'approved') return 'STAGE 2';
                    if (insp.s3_status !== 'approved') return 'STAGE 3';
                    if (insp.s4_status !== 'approved') return 'STAGE 4';
                    if (insp.s5_status !== 'approved') return 'STAGE 5';
                    if (insp.s6_status !== 'approved') return 'STAGE 6';
                    if (insp.s7_status !== 'approved') return 'STAGE 7';
                    if (insp.s8_status !== 'approved') return 'STAGE 8';
                    return 'COMPLETED';
                }

                if (joint.joint_type === 'F') {
                    if (insp.s2_status !== 'approved') return 'STAGE 2';
                    if (insp.s3_status !== 'approved') return 'STAGE 3';
                    if (insp.s4_status !== 'approved') return 'STAGE 4';
                    return 'COMPLETED';
                }

                if (joint.joint_type === 'A' || joint.joint_type === 'B') {
                    if (joint.back_chip_req) {
                        if (insp.s2_status !== 'approved') return 'STAGE 2';
                    }
                    if (insp.s3_status !== 'approved') return 'STAGE 3';
                    if (joint.rt) {
                        if (insp.s4_status !== 'approved') return 'STAGE 4';
                    }
                    if (joint.pt) {
                        if (insp.s5_status !== 'approved') return 'STAGE 5';
                    }
                    if (joint.pwht) {
                        if (insp.s6_status !== 'approved') return 'STAGE 6';
                        if (insp.s7_status !== 'approved') return 'STAGE 7';
                    }
                }
                return 'COMPLETED';
            };
            
            return {
                msn: job.job_number || 'N/A',
                client: job.customer?.customer_name || 'N/A',
                project_id: job.project_id || 'N/A',
                tag_no: job.tag_number || 'N/A',
                equipment: job.equipement_name || 'N/A',
                weld_plan_no: p.weld_plan_no || 'N/A',
                shr_drg_no: p.shreno_drg_no || 'N/A',
                customer_drg_no: p.customer_drg_no || 'N/A',
                
                joint_no: j.joint_no || 'N/A',
                joint_type: j.joint_type || 'N/A',
                joint_description: j.joint_description || 'N/A',
                
                thickness_p1: j.base_metal_thickness_p1 || 'N/A',
                thickness_p2: j.base_metal_thickness_p2 || 'N/A',
                spec_p1: j.base_metal_spec_p1 || 'N/A',
                spec_p2: j.base_metal_spec_p2 || 'N/A',
                
                consumable: j.consumable || 'N/A',
                wps_pqr_no: j.wps_pqr_no || 'N/A',
                process: j.process || 'N/A',
                impact_test: j.impact_test || 'N/A',
                
                back_chip: j.back_chip_req ? 'YES' : 'NO',
                pwht: j.pwht ? 'YES' : 'NO',
                rt: j.rt ? 'YES' : 'NO',
                pt: j.pt ? 'YES' : 'NO',
                
                remarks: j.remarks || '-',
                
                overall_status: getOverallStatus(j),
                s1_status: (insp.s1_status || 'PENDING').toUpperCase(),
                s2_status: (insp.s2_status || 'PENDING').toUpperCase(),
                s3_status: (insp.s3_status || 'PENDING').toUpperCase(),
                s4_status: (insp.s4_status || 'PENDING').toUpperCase(),
                s5_status: (insp.s5_status || 'PENDING').toUpperCase(),
                s6_status: (insp.s6_status || 'PENDING').toUpperCase(),
                s7_status: (insp.s7_status || 'PENDING').toUpperCase(),
                s8_status: (insp.s8_status || 'PENDING').toUpperCase(),

                created_at: j.createdAt.toLocaleString()
            };
        });

        const columns = [
            { header: 'MSN NO', key: 'msn', width: 15 },
            { header: 'CLIENT', key: 'client', width: 25 },
            { header: 'PROJECT ID', key: 'project_id', width: 15 },
            { header: 'TAG NO', key: 'tag_no', width: 15 },
            { header: 'EQUIPMENT', key: 'equipment', width: 25 },
            { header: 'WELD PLAN NO', key: 'weld_plan_no', width: 25 },
            { header: 'SHRENO DRG NO', key: 'shr_drg_no', width: 20 },
            { header: 'CUSTOMER DRG NO', key: 'customer_drg_no', width: 20 },
            
            { header: 'JOINT NO', key: 'joint_no', width: 15 },
            { header: 'CATEGORY', key: 'joint_type', width: 12 },
            { header: 'DESCRIPTION', key: 'joint_description', width: 30 },
            
            { header: 'THICKNESS P1', key: 'thickness_p1', width: 15 },
            { header: 'THICKNESS P2', key: 'thickness_p2', width: 15 },
            { header: 'SPEC P1', key: 'spec_p1', width: 15 },
            { header: 'SPEC P2', key: 'spec_p2', width: 15 },
            
            { header: 'CONSUMABLE', key: 'consumable', width: 15 },
            { header: 'WPS / PQR NO', key: 'wps_pqr_no', width: 20 },
            { header: 'PROCESS', key: 'process', width: 15 },
            { header: 'IMPACT TEST', key: 'impact_test', width: 15 },
            
            { header: 'BACK CHIP', key: 'back_chip', width: 12 },
            { header: 'PWHT', key: 'pwht', width: 10 },
            { header: 'RT', key: 'rt', width: 10 },
            { header: 'PT', key: 'pt', width: 10 },
            
            { header: 'REMARKS', key: 'remarks', width: 30 },
            
            { header: 'WORKFLOW STATUS', key: 'overall_status', width: 20 },
            { header: 'S1 STATUS', key: 's1_status', width: 12 },
            { header: 'S2 STATUS', key: 's2_status', width: 12 },
            { header: 'S3 STATUS', key: 's3_status', width: 12 },
            { header: 'S4 STATUS', key: 's4_status', width: 12 },
            { header: 'S5 STATUS', key: 's5_status', width: 12 },
            { header: 'S6 STATUS', key: 's6_status', width: 12 },
            { header: 'S7 STATUS', key: 's7_status', width: 12 },
            { header: 'S8 STATUS', key: 's8_status', width: 12 },

            { header: 'CREATED AT', key: 'created_at', width: 20 }
        ];

        const sheets = [{ name: 'Welding Joints', columns, data: flatData }];
        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Helper to flatten nested objects for Excel columns.
     * Smartly picks display names for relation objects.
     */
    flattenObject(obj, prefix = '', depth = 0) {
        const flattened = {};
        if (depth > 2) return flattened; // Safety limit

        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const keyLower = key.toLowerCase();
                const val = obj[key];

                // Skip technical IDs and meta fields
                const skipList = [
                    'id', '_id', 'company_id', 'group_id', 'created_by', 'updated_by',
                    'createdat', 'updatedat', 'deletedat', 'password',
                    'ncr_raised_at', 'ncr_raised_by', 'resolution_by', 'assigned_engineer',
                    'design_head', 'welding_head', 'quality_head', 'corrective_action_verified_by',
                    'target_engineer_id', 'target_head_design_id', 'target_head_welding_id',
                    'target_head_quality_id', 'verified_by_qce_id', 'verified_by_head_quality_id',
                    'resolution_approval'
                ];
                if (skipList.includes(keyLower) || keyLower.endsWith('_id')) continue;

                const propName = prefix ? (keyLower.startsWith(prefix.toLowerCase()) ? key : `${prefix}_${key}`) : key;

                if (val && typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val)) {
                    // Smart resolve: if this is a relation object, try to pick its display field
                    const displayFields = [
                        'name', 'customer_name', 'location_name', 'po_number', 'job_number',
                        'document_number', 'document_name', 'report_no', 'title', 'label'
                    ];

                    const foundField = displayFields.find(f => val[f] !== undefined && val[f] !== null);

                    if (foundField && Object.keys(val).length < 15) {
                        // If it has a display field and isn't too many-to-many, just use that value
                        flattened[propName] = val[foundField];
                    } else {
                        // Otherwise flatten its internal fields
                        Object.assign(flattened, this.flattenObject(val, propName, depth + 1));
                    }
                } else if (!Array.isArray(val)) {
                    flattened[propName] = (val instanceof Date) ? val.toLocaleString() : val;
                }
            }
        }
        return flattened;
    }

    /**
     * Generic Export with relationship awareness.
     */
    async exportModule(moduleName, company_id, startDate, endDate) {
        const modelName = moduleName.replace(/-/g, '_');

        // SPECIAL HANDLING FOR RFQ LOOKUPS & USERS
        if (modelName === 'rfq_register') return this.exportRFQRegister(company_id, startDate, endDate);
        if (modelName === 'quality_assurance_plan') return this.exportQAP(company_id, startDate, endDate);
        if (modelName === 'dcr') return this.exportDCR(company_id, startDate, endDate);
        if (modelName === 'ncr') return this.exportNCR(company_id, startDate, endDate);
        if (modelName === 'weld_joint_plan') return this.exportWeldJointPlan(company_id, startDate, endDate);
        if (modelName === 'weld_joint') return this.exportWeldJoint(company_id, startDate, endDate);
        if (modelName === 'rfq_type') return this.exportRFQLookup(company_id, 'rfq_type', 'RFQ Types');
        if (modelName === 'mode_of_enquiry') return this.exportRFQLookup(company_id, 'mode_of_enquiry', 'Mode of Enquiry');
        if (modelName === 'remark') return this.exportRFQLookup(company_id, 'remark', 'Remark Options');
        if (modelName === 'mediator') return this.exportRFQUsers(company_id, 'Mediators');
        if (modelName === 'estimator') return this.exportRFQUsers(company_id, 'Estimators');

        const model = prisma[modelName];
        if (!model) throw new Error(`Model ${modelName} not found`);

        // Configuration for relations to include - now with nested names
        const RELATIONS_CONFIG = {
            po: {
                customer: true,
                customer_location: true
            },
            job: {
                customer: true,
                customer_location: true,
                po: true
            },
            transmission: {
                customer: true,
                location: true,
                po: true,
                creator: true
            },
            group_document: {
                customer: true,
                customer_location: true,
                po: {
                    include: {
                        customer: true,
                        customer_location: true
                    }
                },
                document: {
                    include: {
                        document_type: true
                    }
                },
                user: {
                    include: {
                        department: true
                    }
                },
                group: {
                    include: {
                        job_group: {
                            include: {
                                job: true
                            }
                        }
                    }
                },
                versions: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            },
            ncr: {
                job: true,
                initiator: true,
                raised_at_user: true,
                resolution_user: true,
                target_engineer: true,
                target_head_design: true,
                target_head_welding: true,
                target_head_quality: true,
                corrective_action_verifier: true,
                qce_verifier: true,
                head_quality_verifier: true
            },
            rfq_register: {
                creator: true
            },
            user: {
                department: true
            },
            customer_location: {
                customer: true
            },
            document_master: {
                document_type: true
            }
        };

        const include = RELATIONS_CONFIG[modelName] || {};
        let data = await model.findMany({
            where: { company_id },
            include: Object.keys(include).length > 0 ? include : undefined,
            orderBy: { createdAt: 'desc' },
        });

        if (data.length === 0) {
            return await excelGenerator.generateReport([{
                name: moduleName,
                columns: [{ header: 'Status', key: 'status', width: 20 }],
                data: [{ status: 'No data found' }]
            }]);
        }

        const sheets = [];
        const mainSheetData = [];
        const childSheets = {};

        data.forEach(item => {
            const mainRow = this.flattenObject(item);

            // Special handling for group_document to include Job Numbers and URL
            if (modelName === 'group_document') {
                if (item.group?.job_group) {
                    const jobNumbers = item.group.job_group
                        .map(jg => jg.job?.job_number)
                        .filter(Boolean);
                    if (jobNumbers.length > 0) {
                        mainRow['Job Number'] = jobNumbers.join(', ');
                    }
                }

                if (item.versions && item.versions.length > 0) {
                    mainRow['Document URL'] = item.versions[0].file_url;
                }
            }

            // Special handling for transmission to include Password
            if (modelName === 'transmission') {
                mainRow['Zip Password'] = item.password;
            }

            // Special handling for ncr to ensure real names instead of UUIDs
            if (modelName === 'ncr') {
                if (item.initiator) mainRow['Raised By'] = item.initiator.name;
                if (item.raised_at_user) mainRow['Raised At'] = item.raised_at_user.name;
                if (item.resolution_user) mainRow['Resolution By'] = item.resolution_user.name;
                if (item.target_engineer) mainRow['Assigned Engineer'] = item.target_engineer.name;
                if (item.target_head_design) mainRow['Design Head'] = item.target_head_design.name;
                if (item.target_head_welding) mainRow['Welding Head'] = item.target_head_welding.name;
                if (item.target_head_quality) mainRow['Quality Head'] = item.target_head_quality.name;
                if (item.corrective_action_verifier) mainRow['Corrective Action Verified By'] = item.corrective_action_verifier.name;
                if (item.qce_verifier) mainRow['QCE Verifier'] = item.qce_verifier.name;
                if (item.head_quality_verifier) mainRow['Head Quality Verifier'] = item.head_quality_verifier.name;

                // Handle Resolution Approval (could be string or array)
                if (item.resolution_approval) {
                    mainRow['Resolution Approval'] = Array.isArray(item.resolution_approval)
                        ? item.resolution_approval[0]
                        : item.resolution_approval;
                }
            }

            mainSheetData.push(mainRow);

            // Handle array relations (child sheets)
            for (const key in item) {
                const val = item[key];
                if (val && Array.isArray(val)) {
                    if (!childSheets[key]) childSheets[key] = [];
                    val.forEach(childItem => {
                        childSheets[key].push(this.flattenObject(childItem));
                    });
                }
            }
        });

        // 1. Create Main Sheet
        if (mainSheetData.length > 0) {
            // Collect all unique keys from all rows to ensure no columns are missed
            const allKeys = new Set();
            mainSheetData.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)));

            const mainColumns = Array.from(allKeys).map(key => {
                let header = key.split(/_|\./)
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');

                // Remove redundant suffixes
                const cleanHeaders = ['Id', 'Name', 'Number', 'Date'];
                cleanHeaders.forEach(suffix => {
                    if (header.endsWith(' ' + suffix)) {
                        header = header.slice(0, -(suffix.length + 1));
                    }
                });

                // Special case for PO / Document numbers which are better with the suffix
                if (key.toLowerCase().includes('number')) {
                    const original = key.split(/_|\./).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    if (original.includes('Number')) header = original.replace('Number', 'No');
                }

                return { header, key, width: 25 };
            });

            sheets.push({
                name: 'Main Data',
                columns: mainColumns,
                data: mainSheetData
            });
        }

        // 2. Create Child Sheets (for array relations)
        for (const sheetName in childSheets) {
            const rows = childSheets[sheetName];
            if (rows.length > 0) {
                const sample = rows[0];
                const columns = Object.keys(sample).map(key => {
                    let header = key.split(/_|\./).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    if (header.endsWith(' Id')) header = header.slice(0, -3);
                    return { header, key, width: 25 };
                });

                sheets.push({
                    name: `Linked ${sheetName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
                    columns,
                    data: rows
                });
            }
        }

        return await excelGenerator.generateReport(sheets);
    }


}

module.exports = new ExportService();
