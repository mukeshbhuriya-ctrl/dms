import {
    LayoutDashboard,
    FileText,
    Users,
    Briefcase,
    Folder,
    ShieldCheck,
    Wrench,
    ClipboardCheck,
} from "lucide-react"

// ─── Module Keys (Hierarchical structure for maximum clarity) ─────────────
export const MODULES = {
    // ── Global ──
    ALL: "ALL",
    DASHBOARD_ADMIN: "DASHBOARD_ADMIN",
    DASHBOARD_USER: "DASHBOARD_USER",
    DASHBOARD_MARKETING: "DASHBOARD_MARKETING",
    
    // ── Engineering / Production / Quality Block ──
    JOB_OVERVIEW: "JOB_OVERVIEW",
    REPORTS_MANAGEMENT: "REPORTS_MANAGEMENT",

    DTN: {
        VIEW: "DTN_VIEW",
        MASTER: "DTN_MASTER",
    },

    DMS: {
        MASTER: "DMS_COMMUNICATION_MATRIX",
        VDR: "DMS_VDR",
        UPLOAD: "DMS_UPLOAD",
        APPROVER: "DMS_APPROVER",
        TRANSMISSION_CREATE: "DMS_TRANSMISSION_CREATE",
        TRANSMISSION_STATUS: "DMS_TRANSMISSION_STATUS",
    },

    DCR: "DCR_REQUEST",
    NCR: "NCR_CREATE",
    MHC: "MHC_VIEW",
    WELD_PLAN: "WELD_PLAN",
    WELD_JOINTS: "WELD_JOINTS",
    HYDRO_TEST: "HYDRO_TEST_VIEW",
    
    INSPECTION: {
        DISH_END: "INSPECTION_DISH_END",
        TUBE_SHEET: "INSPECTION_TUBE_SHEET",
        FINAL: "INSPECTION_FINAL",
    },

    QAP: "QAP_CREATE",

    // ── Marketing Block ──
    MARKETING: {
        RFQ: "MARKETING_RFQ",
        MASTER: "MARKETING_MASTER",
    },
    
    // ── Management / Finance Block ──
    CUSTOMERS: {
        CUSTOMER: "CUSTOMER_MANAGEMENT",
        LOCATION: "LOCATION_MANAGEMENT",
    },
    
    PO_MANAGEMENT: "PO_MANAGEMENT",
    JOB_MANAGEMENT: "JOB_MANAGEMENT",

    // ── Administration ──
    ADMINISTRATION: {
        USERS: "ADMIN_USERS",
        DEPARTMENTS: "ADMIN_DEPARTMENTS",
        QC_GROUPS: "ADMIN_QC_GROUPS",
        AUDIT_LOGS: "ADMIN_AUDIT_LOGS",
    }
};

// ─── Role Constants ──────────────────────────────────────────────
export const ROLES = {
    ADMIN: "ADMIN",
    DCC: "DCC",
    USER: "USER",
    PRODUCTION_ENGINEER: "PRODUCTION_ENGINEER",
    QC_ENGINEER: "QC_ENGINEER",
    NDT_ENGINEER: "NDT_ENGINEER",
    WELD_PLAN_ADMIN: "WELD_PLAN_ADMIN",
    DESIGN_ENGINEER: "DESIGN_ENGINEER",
    MARKETING: "MARKETING",
    TAXATION: "TAXATION",
    QAP: "QAP",
    DMS: "DMS",
    NCR: "NCR",
}

// ─── Menu Configuration ────────────────────────────────────────────
export const MENU_CONFIG = [
    // ── Dashboards ──
    {
        title: "Dashboard",
        icon: LayoutDashboard,
        path: "/admin/dashboard",
        moduleKey: MODULES.DASHBOARD_ADMIN,
    },
    {
        title: "Job Overview",
        icon: LayoutDashboard,
        path: "/admin/job-overview",
        moduleKey: MODULES.JOB_OVERVIEW,
    },
    {
        title: "Dashboard",
        icon: LayoutDashboard,
        path: "/user/dashboard",
        moduleKey: MODULES.DASHBOARD_USER,
        hideFor: [ROLES.ADMIN],
    },

    // ── Administration ──
    {
        title: "Administration",
        icon: ShieldCheck,
        moduleKey: MODULES.ADMINISTRATION.USERS,
        items: [
            { title: "Users", path: "/users", moduleKey: MODULES.ADMINISTRATION.USERS },
            { title: "Departments", path: "/departments", moduleKey: MODULES.ADMINISTRATION.DEPARTMENTS },
            { title: "Group Management", path: "/group-management", moduleKey: MODULES.ADMINISTRATION.QC_GROUPS },
            { title: "Audit Logs", path: "/admin/audit-logs", moduleKey: MODULES.ADMINISTRATION.AUDIT_LOGS },
            { title: "Approval Center", path: "/approval-center", moduleKey: MODULES.DASHBOARD_ADMIN },
        ],
    },

    // ── Report Management ──
    {
        title: "Reports Management",
        icon: FileText,
        path: "/admin/reports",
        moduleKey: MODULES.REPORTS_MANAGEMENT,
    },

    // ── Customer Management ──
    {
        title: "Customer Management",
        icon: Users,
        moduleKey: MODULES.CUSTOMERS.CUSTOMER,
        items: [
            { title: "Customer", path: "/dcc/create-customer", moduleKey: MODULES.CUSTOMERS.CUSTOMER },
            { title: "Location", path: "/dcc/create-location", moduleKey: MODULES.CUSTOMERS.LOCATION },
        ],
    },

    // ── Purchase Orders & Jobs ──
    {
        title: "Purchase Orders",
        icon: Briefcase,
        path: "/dcc/create-po",
        moduleKey: MODULES.PO_MANAGEMENT,
    },
    {
        title: "Jobs",
        icon: FileText,
        path: "/dcc/create-job",
        moduleKey: MODULES.JOB_MANAGEMENT,
    },

    // ── DTN ──
    {
        title: "DTN",
        icon: Folder,
        moduleKey: MODULES.DTN.VIEW,
        items: [
            { title: "Drawing Transmittal (DTN)", path: "/dtn/drawing-transmittal", moduleKey: MODULES.DTN.VIEW },
            { title: "Drawing Master", path: "/dtn/drawing-master", moduleKey: MODULES.DTN.MASTER },
        ],
    },

    // ── DMS ──
    {
        title: "DMS",
        icon: Folder,
        moduleKey: MODULES.DMS.VDR,
        items: [
            { title: "Communication Matrix", path: "/dcc/communication-matrix", moduleKey: MODULES.DMS.MASTER },
            { title: "Documents (VDR)", path: "/dcc/documents", moduleKey: MODULES.DMS.VDR },
            { title: "Upload Documents", path: "/user/upload-documents", moduleKey: MODULES.DMS.UPLOAD },
            { title: "Document Approver", path: "/dcc/document-approver", moduleKey: MODULES.DMS.APPROVER },
            { title: "Create Transmission", path: "/dcc/create-transmission", moduleKey: MODULES.DMS.TRANSMISSION_CREATE },
            { title: "Client Approval Status", path: "/dcc/client-approval-status", moduleKey: MODULES.DMS.TRANSMISSION_STATUS },
        ],
    },

    // ── DCR ──
    {
        title: "DCR",
        icon: Folder,
        items: [
            { title: "DCR Request", path: "/dcr/dcr-request", moduleKey: MODULES.DCR },
        ],
    },

    // ── NCR ──
    {
        title: "NCR",
        icon: Folder,
        items: [
            { title: "NCR", path: "/ncr/create-ncr", moduleKey: MODULES.NCR }
        ],
    },

    // ── MHC ──
    {
        title: "MHC",
        icon: Folder,
        items: [
            { title: "Material Heat Chart", path: "/material-heat-chart", moduleKey: MODULES.MHC },
        ],
    },

    // ── Welding ──
    {
        title: "Weld Plan",
        icon: Wrench,
        path: "/welding-joints",
        moduleKey: MODULES.WELD_PLAN,
    },
    {
        title: "Welding Joints",
        icon: Wrench,
        path: "/view-weldingjoints",
        moduleKey: MODULES.WELD_JOINTS,
    },

    // ── Hydrostatic Pressure Test ──
    {
        title: "Hydrostatic Pressure Test",
        icon: FileText,
        items: [
            { title: "Hydro Pres Test", path: "/hydrostatic-pressure-test", moduleKey: MODULES.HYDRO_TEST },
        ],
    },
    // ── Inspection ──
    {
        title: "Inspection",
        icon: Folder,
        moduleKey: MODULES.INSPECTION.DISH_END,
        items: [
            { title: "Dish End", path: "/inspections/dish-end", moduleKey: MODULES.INSPECTION.DISH_END },
            { title: "Final Dimension", path: "/inspections/final", moduleKey: MODULES.INSPECTION.FINAL },
            { title: "Tube Sheet", path: "/inspections/tube-sheet", moduleKey: MODULES.INSPECTION.TUBE_SHEET },
        ],
    },

    // ── Marketing ──
    {
        title: "Marketing",
        icon: Folder,
        moduleKey: MODULES.MARKETING.RFQ,
        items: [
            { title: "Dashboard", path: "/marketing/dashboard", moduleKey: MODULES.DASHBOARD_MARKETING },
            {
                title: "Master",
                moduleKey: MODULES.MARKETING.MASTER,
                items: [
                    { title: "RFQ Types", path: "/marketing/lookups/rfq_type", moduleKey: MODULES.MARKETING.MASTER },
                    { title: "Mode of Enquiry", path: "/marketing/lookups/mode_of_enquiry", moduleKey: MODULES.MARKETING.MASTER },
                    { title: "Mediators", path: "/marketing/lookups/mediator", moduleKey: MODULES.MARKETING.MASTER },
                    { title: "Estimators", path: "/marketing/lookups/estimator", moduleKey: MODULES.MARKETING.MASTER },
                ],
            },
            { title: "RFQ Register", path: "/marketing/rfq-register", moduleKey: MODULES.MARKETING.RFQ },
        ],
    },

    // ── Quality Assurance Plan ──
    {
        title: "QAP",
        icon: Folder,
        moduleKey: MODULES.QAP,
        items: [
            { title: "Heading Master", path: "/qap/heading-master", moduleKey: MODULES.QAP },
            { title: "Quality Assurance Plan", path: "/create-qarp", moduleKey: MODULES.QAP },
        ],
    },
]

// ─── Utility: Filter menu by user permissions ────────────────────────────
export function getFilteredMenu(userPermissions = [], userRoles = []) {
    const roleSet = new Set(userRoles)
    const hasAccess = (moduleKey) => {
        if (!moduleKey) return false
        if (userPermissions.includes("ALL")) return true
        return userPermissions.includes(moduleKey)
    }

    const filterItems = (items) => {
        return items.reduce((acc, item) => {
            if (item.hideFor?.some((role) => roleSet.has(role))) return acc

            if (item.items) {
                const visibleSubItems = filterItems(item.items)
                if (visibleSubItems.length > 0) {
                    acc.push({ ...item, items: visibleSubItems })
                }
            } else if (hasAccess(item.moduleKey)) {
                acc.push(item)
            }
            return acc
        }, [])
    }

    return filterItems(MENU_CONFIG)
}

// ─── Role name normalization map ───────────────────────────────────
export const ROLE_KEY_MAP = Object.values(ROLES).reduce((acc, role) => {
    acc[role.toLowerCase()] = role
    return acc
}, {})
