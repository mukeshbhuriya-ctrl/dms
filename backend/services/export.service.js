const prisma = require('#prisma');
const excelGenerator = require('../utils/excelGenerator');

class ExportService {
    /**
     * Export Locations for a company.
     */
    async exportLocations(company_id) {
        const locations = await prisma.customer_location.findMany({
            where: { company_id },
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
    async exportCustomers(company_id) {
        const customers = await prisma.customer.findMany({
            where: { company_id },
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
    async exportJobs(company_id) {
        const jobs = await prisma.job.findMany({
            where: { company_id },
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
    async exportDepartments(company_id) {
        const departments = await prisma.department.findMany({
            where: { company_id },
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
    async exportMHC(company_id) {
        const reports = await prisma.material_heat_chart.findMany({
            where: { company_id },
            include: { items: { orderBy: { sort_order: 'asc' } } },
            orderBy: { createdAt: 'desc' },
        });

        const flatData = [];
        reports.forEach(r => {
            let currentHeading = "-";
            r.items.forEach(item => {
                if (item.is_heading) {
                    currentHeading = item.heading_text || item.item_no || "HEADING";
                }

                flatData.push({
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
                    status: (r.status || 'draft').toUpperCase(),
                    // Table Data
                    heading: currentHeading,
                    item_no: item.item_no || 'N/A',
                    description: item.description || 'N/A',
                    size: item.size || 'N/A',
                    material_spec: item.material_spec || 'N/A',
                    qty_unit: item.quantity_unit || 'N/A',
                    heat_no: item.heat_no || 'N/A',
                    mtr_no: item.mtr_no || 'N/A',
                    manufacturer: item.manufacturer || 'N/A',
                    remarks: item.remarks || 'N/A',
                    created_at: r.createdAt.toLocaleString(),
                });
            });

            // If no items, include at least one row with header info
            if (r.items.length === 0) {
                flatData.push({
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
                    status: (r.status || 'draft').toUpperCase(),
                    heading: 'N/A',
                    item_no: 'N/A',
                    description: 'No items found',
                    size: 'N/A',
                    material_spec: 'N/A',
                    qty_unit: 'N/A',
                    heat_no: 'N/A',
                    mtr_no: 'N/A',
                    manufacturer: 'N/A',
                    remarks: 'N/A',
                    created_at: r.createdAt.toLocaleString(),
                });
            }
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
     * Export QAP reports.
     */
    async exportQAP(company_id) {
        const reports = await prisma.quality_assurance_plan.findMany({
            where: { company_id },
            include: { job: true },
            orderBy: { createdAt: 'desc' },
        });

        const sheets = [
            {
                name: 'QAP Reports',
                columns: [
                    { header: 'Report No', key: 'report_no', width: 20 },
                    { header: 'MSN', key: 'msn', width: 20 },
                    { header: 'Client', key: 'client', width: 30 },
                    { header: 'PO No', key: 'po_no', width: 20 },
                    { header: 'Status', key: 'status', width: 15 },
                    { header: 'Created Date', key: 'created_at', width: 25 },
                ],
                data: reports.map(r => ({
                    report_no: r.report_no,
                    msn: r.msn,
                    client: r.client || 'N/A',
                    po_no: r.po_no || 'N/A',
                    status: r.status,
                    created_at: r.createdAt.toLocaleString(),
                })),
            }
        ];

        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export Hydro Test reports.
     */
    async exportHydro(company_id) {
        const reports = await prisma.hydrostatic_test_report.findMany({
            where: { company_id },
            include: { 
                items: { orderBy: { sort_order: 'asc' } },
                remarks: { orderBy: { sort_order: 'asc' } }
            },
            orderBy: { createdAt: 'desc' },
        });

        const flatData = [];
        reports.forEach(r => {
            const remarksText = r.remarks.map(rem => rem.text).filter(Boolean).join(' | ');

            r.items.forEach(item => {
                flatData.push({
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
                    construction_code: r.construction_code || 'N/A',
                    chlorine_content: r.chlorine_content || 'N/A',
                    inspection_agency: r.inspection_agency || 'N/A',
                    test_position: r.test_position || 'N/A',
                    procedure_no: r.procedure_no || 'N/A',
                    test_medium: r.test_medium || 'N/A',
                    metal_temp: r.metal_temp || 'N/A',
                    status: (r.status || 'draft').toUpperCase(),
                    // Item Data
                    particulars: item.particulars || 'N/A',
                    mawp_int_ext: item.mawp_int_ext || 'N/A',
                    required_test_pressure: item.required_test_pressure || 'N/A',
                    actual_test_pressure: item.actual_test_pressure || 'N/A',
                    holding_time: item.holding_time || 'N/A',
                    test_result: item.test_result || 'N/A',
                    // Gauges
                    pg1_range: item.pg1_range || 'N/A',
                    pg1_id_no: item.pg1_id_no || 'N/A',
                    pg1_calib_date: item.pg1_calib_date || 'N/A',
                    pg1_due_date: item.pg1_due_date || 'N/A',
                    pg2_range: item.pg2_range || 'N/A',
                    pg2_id_no: item.pg2_id_no || 'N/A',
                    pg2_calib_date: item.pg2_calib_date || 'N/A',
                    pg2_due_date: item.pg2_due_date || 'N/A',
                    remarks_all: remarksText || 'N/A',
                    created_at: r.createdAt.toLocaleString(),
                });
            });

            if (r.items.length === 0) {
                flatData.push({
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
                    construction_code: r.construction_code || 'N/A',
                    chlorine_content: r.chlorine_content || 'N/A',
                    inspection_agency: r.inspection_agency || 'N/A',
                    test_position: r.test_position || 'N/A',
                    procedure_no: r.procedure_no || 'N/A',
                    test_medium: r.test_medium || 'N/A',
                    metal_temp: r.metal_temp || 'N/A',
                    status: (r.status || 'draft').toUpperCase(),
                    particulars: 'No items found',
                    mawp_int_ext: 'N/A',
                    required_test_pressure: 'N/A',
                    actual_test_pressure: 'N/A',
                    holding_time: 'N/A',
                    test_result: 'N/A',
                    pg1_range: 'N/A',
                    pg1_id_no: 'N/A',
                    pg1_calib_date: 'N/A',
                    pg1_due_date: 'N/A',
                    pg2_range: 'N/A',
                    pg2_id_no: 'N/A',
                    pg2_calib_date: 'N/A',
                    pg2_due_date: 'N/A',
                    remarks_all: remarksText || 'N/A',
                    created_at: r.createdAt.toLocaleString(),
                });
            }
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
    async exportDishEnd(company_id) {
        const reports = await prisma.dish_end_inspection_report.findMany({
            where: { company_id },
            include: { job: true },
            orderBy: { createdAt: 'desc' },
        });

        const sheets = [
            {
                name: 'Dish End Reports',
                columns: [
                    { header: 'Report No', key: 'report_no', width: 20 },
                    { header: 'MSN', key: 'msn', width: 20 },
                    { header: 'Client', key: 'client', width: 30 },
                    { header: 'PO No', key: 'po_no', width: 20 },
                    { header: 'Status', key: 'status', width: 15 },
                    { header: 'Created Date', key: 'created_at', width: 25 },
                ],
                data: reports.map(r => ({
                    report_no: r.report_no,
                    msn: r.msn,
                    client: r.client,
                    po_no: r.po_no,
                    status: r.status,
                    created_at: r.createdAt.toLocaleString(),
                })),
            }
        ];

        return await excelGenerator.generateReport(sheets);
    }

    /**
     * Export Final Inspection reports.
     */
    async exportFinalInspection(company_id) {
        const reports = await prisma.final_inspection_report.findMany({
            where: { company_id },
            include: { job: true },
            orderBy: { createdAt: 'desc' },
        });

        const sheets = [
            {
                name: 'Final Inspection Reports',
                columns: [
                    { header: 'Report No', key: 'report_no', width: 20 },
                    { header: 'MSN', key: 'msn', width: 20 },
                    { header: 'Client', key: 'client', width: 30 },
                    { header: 'PO No', key: 'po_no', width: 20 },
                    { header: 'Status', key: 'status', width: 15 },
                    { header: 'Created Date', key: 'created_at', width: 25 },
                ],
                data: reports.map(r => ({
                    report_no: r.report_no,
                    msn: r.msn,
                    client: r.client,
                    po_no: r.po_no,
                    status: r.status,
                    created_at: r.createdAt.toLocaleString(),
                })),
            }
        ];

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
    async exportModule(moduleName, company_id) {
        const modelName = moduleName.replace(/-/g, '_');
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
