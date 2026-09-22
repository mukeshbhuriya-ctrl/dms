import {
    LayoutDashboard,
    FileText,
    Users,
    Briefcase,
    Folder,
    ShieldCheck,
    Wrench,
} from "lucide-react"

// ─── Menu Configuration (Single Source of Truth) ─────────────
export const MENU_CONFIG = [
    // ── Dashboards ──
    {
        title: "Admin Dashboard",
        icon: LayoutDashboard,
        path: "/admin/dashboard",
        required: "dashboard:admin:View",
    },
    {
        title: "User Dashboard",
        icon: LayoutDashboard,
        path: "/user/dashboard",
        required: "dashboard:user:View",
    },
    {
        title: "Job Overview",
        icon: FileText,
        path: "/admin/job-overview",
        required: "dashboard:job_overview:View",
    },
    // ── Administration ──
    {
        title: "Administration",
        icon: ShieldCheck,
        items: [
            { title: "Users", path: "/users", required: "admin:users:View" },
            { title: "Role Management", path: "/admin/roles", required: "admin:roles:View" },
            { title: "Departments", path: "/departments", required: "admin:departments:View" },
            { title: "Group Management", path: "/group-management", required: "admin:group_management:View" },
            { title: "Audit Logs", path: "/admin/audit-logs", required: "admin:audit_logs:View" },
            { title: "Approval Center", path: "/approval-center", required: "admin:approval_center:View" },
        ],
    },

    // ── Report Management ──
    {
        title: "Reports Management",
        icon: FileText,
        path: "/admin/reports",
        required: "reports:management:View",
    },

    // ── Customer Management ──
    {
        title: "Customer Management",
        icon: Users,
        items: [
            { title: "Customer", path: "/dcc/create-customer", required: "customer:customer:View" },
            { title: "Location", path: "/dcc/create-location", required: "customer:location:View" },
        ],
    },

    // ── Purchase Orders & Jobs ──
    {
        title: "Purchase Orders",
        icon: Briefcase,
        path: "/dcc/create-po",
        required: "po:management:View",
    },
    {
        title: "Jobs",
        icon: FileText,
        path: "/dcc/create-job",
        required: "job:management:View",
    },

    // ── DTN ──
    {
        title: "DTN",
        icon: Folder,
        items: [
            { title: "Drawing Transmittal (DTN)", path: "/dtn/drawing-transmittal", required: "dtn:drawing_transmittal:View" },
            { title: "Drawing Master", path: "/dtn/drawing-master", required: "dtn:drawing_master:View" },
        ],
    },

    // ── DMS ──
    {
        title: "DMS",
        icon: Folder,
        items: [
            { title: "Communication Matrix", path: "/dcc/communication-matrix", required: "dms:communication_matrix:View" },
            { title: "Documents (VDR)", path: "/dcc/documents", required: "dms:vdr:View" },
            { title: "Upload Documents", path: "/user/upload-documents", required: "dms:upload:View" },
            { title: "Document Approver", path: "/dcc/document-approver", required: "dms:approver:View" },
            { title: "Create Transmission", path: "/dcc/create-transmission", required: "dms:transmission:View" },
            { title: "Client Approval Status", path: "/dcc/client-approval-status", required: "dms:status:View" },
        ],
    },

    // ── DCR ──
    {
        title: "DCR",
        icon: Folder,
        items: [
            { title: "DCR Request", path: "/dcr/dcr-request", required: "dcr:request:View" },
        ],
    },

    // ── NCR ──
    {
        title: "NCR",
        icon: Folder,
        items: [
            { title: "NCR", path: "/ncr/create-ncr", required: "ncr:ncr:View" }
        ],
    },

    // ── MHC ──
    {
        title: "MHC",
        icon: Folder,
        items: [
            { title: "Material Heat Chart", path: "/material-heat-chart", required: "mhc:material_heat_chart:View" },
        ],
    },

    // ── Welding ──
    {
        title: "WELDING",
        icon: Folder,
        items: [
            { title: "Weld Plan", path: "/welding-joints", required: "welding:plan:View" },
            { title: "Welding Joints", path: "/view-weldingjoints", required: "welding:joints:View" },
            { title: "Traveler Welding & NDE", path: "/traveler-welding-nde", required: "welding:traveler:View" },
        ],
    },

    // ── Hydrostatic Pressure Test ──
    {
        title: "HPT",
        icon: Folder,
        items: [
            { title: "Hydro Pres Test", path: "/hydrostatic-pressure-test", required: "hydrostatic:test:View" },
        ],
    },

    // ── Instruments ──
    {
        title: "Instruments",
        icon: Folder,
        items: [
            { title: "Calibration Instruments", path: "/masters/calibration-instruments", required: "instruments:calibration:View" },
            { title: "Pressure Gauges", path: "/masters/pressure-gauges", required: "instruments:pressure:View" },
        ],
    },
    
    // ── Maintenance ──
    {
        title: "Maintenance",
        icon: Wrench,
        items: [
            { title: "Machine Master", path: "/maintenance/machines", required: "maintenance:machine:View" },
            { title: "Maintenance Memo", path: "/maintenance/memo", required: "maintenance:memo:View" },
            { title: "PM Schedule", path: "/maintenance/pm-schedule", required: "maintenance:pm_schedule:View" },
        ],
    },
    
    // ── Work Permits ──
    {
        title: "Work Permits",
        icon: ShieldCheck,
        path: "/work-permit",
        required: "work_permit:permit:View",
    },
    
    // ── Inspection ──
    {
        title: "Inspection",
        icon: Folder,
        items: [
            { title: "Dish End", path: "/inspections/dish-end", required: "inspection:dish_end:View" },
            { title: "Final Dimension", path: "/inspections/final", required: "inspection:final:View" },
            { title: "Tube Sheet", path: "/inspections/tube-sheet", required: "inspection:tube_sheet:View" },
            { title: "Tube Bundle", path: "/inspections/tube-bundle", required: "inspection:tube_bundle:View" },
        ],
    },

    // ── Marketing ──
    {
        title: "Marketing",
        icon: Folder,
        items: [
            { title: "Marketing Dashboard", path: "/marketing/dashboard", required: "marketing:dashboard:View" },
            {
                title: "Master",
                items: [
                    { title: "RFQ Types", path: "/marketing/lookups/rfq_type", required: "marketing:rfq_type:View" },
                    { title: "Mode of Enquiry", path: "/marketing/lookups/mode_of_enquiry", required: "marketing:mode_of_enquiry:View" },
                    { title: "Mediators", path: "/marketing/lookups/mediator", required: "marketing:mediator:View" },
                    { title: "Estimators", path: "/marketing/lookups/estimator", required: "marketing:estimator:View" },
                ],
            },
            { title: "RFQ Register", path: "/marketing/rfq-register", required: "marketing:rfq_register:View" },
        ],
    },

    // ── Quality Assurance Plan ──
    {
        title: "QAP",
        icon: Folder,
        items: [
            { title: "Heading Master", path: "/qap/heading-master", required: "qap:heading_master:View" },
            { title: "Quality Assurance Plan", path: "/create-qarp", required: "qap:quality_assurance_plan:View" },
        ],
    },
]

// ─── Utility: Filter menu by user permissions ────────────────────────────
import { validateAccess } from "@/config/permissions"

function hasPermission(iamPolicies, required) {
    if (!iamPolicies || !Array.isArray(iamPolicies)) return false;
    
    // Admin override check just in case
    if (validateAccess(iamPolicies, 'ALL', 'View')) return true;

    const lastColonIdx = required.lastIndexOf(':');
    let resource = required;
    let action = 'View'; // Default action if none specified

    if (lastColonIdx !== -1) {
        resource = required.substring(0, lastColonIdx);
        action = required.substring(lastColonIdx + 1);
    }

    return validateAccess(iamPolicies, resource, action);
}

export function getFilteredMenu(iamPolicies = []) {
    const filterItems = (items) => {
        return items.reduce((acc, item) => {
            if (item.items) {
                const visibleSubItems = filterItems(item.items)
                if (visibleSubItems.length > 0) {
                    acc.push({ ...item, items: visibleSubItems })
                }
            } else if (!item.required || hasPermission(iamPolicies, item.required)) {
                acc.push(item)
            }
            return acc
        }, [])
    }

    return filterItems(MENU_CONFIG)
}

