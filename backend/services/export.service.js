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
            include: { job: true, items: true },
            orderBy: { createdAt: 'desc' },
        });

        const sheets = [
            {
                name: 'MHC Reports',
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

        // Add detailed items sheet
        const allItems = [];
        reports.forEach(r => {
            r.items.forEach(item => {
                allItems.push({
                    report_no: r.report_no,
                    item_no: item.item_no || 'N/A',
                    description: item.description || 'N/A',
                    size: item.size || 'N/A',
                    material_spec: item.material_spec || 'N/A',
                    heat_no: item.heat_no || 'N/A',
                    mtr_no: item.mtr_no || 'N/A',
                    manufacturer: item.manufacturer || 'N/A',
                });
            });
        });

        sheets.push({
            name: 'MHC Items',
            columns: [
                { header: 'Report No', key: 'report_no', width: 20 },
                { header: 'Item No', key: 'item_no', width: 15 },
                { header: 'Description', key: 'description', width: 30 },
                { header: 'Size', key: 'size', width: 20 },
                { header: 'Material Spec', key: 'material_spec', width: 20 },
                { header: 'Heat No', key: 'heat_no', width: 20 },
                { header: 'MTR No', key: 'mtr_no', width: 20 },
                { header: 'Manufacturer', key: 'manufacturer', width: 25 },
            ],
            data: allItems,
        });

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
            include: { job: true },
            orderBy: { createdAt: 'desc' },
        });

        const sheets = [
            {
                name: 'Hydro Reports',
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
                const skipList = ['id', '_id', 'company_id', 'group_id', 'created_by', 'updated_by', 'createdat', 'updatedat', 'deletedat', 'password'];
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
                initiator: true
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
            const mainSample = mainSheetData[0];
            const mainColumns = Object.keys(mainSample).map(key => {
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
