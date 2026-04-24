import {
    LayoutDashboard,
    FileText,
    Users,
    Building2,
    ClipboardCheck,
    Wrench,
    Briefcase,
    Folder,
    ShieldCheck,
} from "lucide-react"

// ─── Role Constants ────────────────────────────────────────────────
export const ROLES = {
    ADMIN: "ADMIN",
    DCC: "DCC",
    USER: "USER",
    PRODUCTION_ENGINEER: "PRODUCTION_ENGINEER",
    QC_ENGINEER: "QC_ENGINEER",
    NDT_ENGINEER: "NDT_ENGINEER",
    WELD_PLAN_ADMIN: "WELD_PLAN_ADMIN",
    DCR: "DCR",
    DESIGN_ENGINEER: "DESIGN_ENGINEER",
    MARKETING: "MARKETING",
    TAXATION: "TAXATION",
}

// ─── Menu Configuration ────────────────────────────────────────────
// Each item defines `roles` — the set of roles that can SEE this item.
// For groups with `items[]`, the group itself is shown if ANY sub-item is visible.
// IMPORTANT: Each path appears EXACTLY ONCE. No duplication across roles.

export const MENU_CONFIG = [
    // ── Dashboards ──
    {
        title: "Dashboard",
        icon: LayoutDashboard,
        path: "/admin/dashboard",
        roles: [ROLES.ADMIN],
    },
    {
        title: "Job Overview",
        icon: LayoutDashboard,
        path: "/admin/job-overview",
        roles: [ROLES.ADMIN],
    },
    {
        title: "Dashboard",
        icon: LayoutDashboard,
        path: "/user/dashboard",
        roles: [ROLES.DCC, ROLES.USER, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER, ROLES.NDT_ENGINEER, ROLES.WELD_PLAN_ADMIN, ROLES.DESIGN_ENGINEER],
        hideFor: [ROLES.ADMIN],
    },

    // ── User & Department Management ──
    // ─── Administration ──
    {
        title: "Administration",
        icon: ShieldCheck,
        items: [
            { title: "User Management", path: "/users", roles: [ROLES.ADMIN] },
            { title: "Department Management", path: "/departments", roles: [ROLES.ADMIN] },
            { title: "QC Group", path: "/qc-group", roles: [ROLES.ADMIN] },
        ],
    },

    // ── Report Management ──
    {
        title: "Reports Management",
        icon: FileText,
        path: "/admin/reports",
        roles: [ROLES.ADMIN],
    },

    // ── Customer Management ──
    {
        title: "Customer Management",
        icon: Users,
        items: [
            { title: "Customer", path: "/dcc/create-customer", roles: [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION] },
            { title: "Location", path: "/dcc/create-location", roles: [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION] },
        ],
    },

    // ── Purchase Orders & Jobs ──
    {
        title: "Purchase Orders",
        icon: Briefcase,
        path: "/dcc/create-po",
        roles: [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION],
    },
    {
        title: "Jobs",
        icon: FileText,
        path: "/dcc/create-job",
        roles: [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION],
    },

    // ── DTN ──
    {
        title: "DTN",
        icon: Folder,
        items: [
            { title: "Drawing Transmittal (DTN)", path: "/dtn/drawing-transmittal", roles: [ROLES.ADMIN, ROLES.DCC] },
            { title: "Drawing Master", path: "/dtn/drawing-master", roles: [ROLES.ADMIN, ROLES.DCC, ] },
        ],
    },

    // ── DMS ──
    {
        title: "DMS",
        icon: Folder,
        items: [
            { title: "Communication Matrix", path: "/dcc/communication-matrix", roles: [ROLES.ADMIN, ROLES.DCC] },
            { title: "Documents (VDR)", path: "/dcc/documents", roles: [ROLES.ADMIN, ROLES.DCC] },
            { title: "Upload Documents", path: "/user/upload-documents", roles: [ROLES.USER], hideFor: [ROLES.ADMIN] },
            { title: "Document Approver", path: "/dcc/document-approver", roles: [ROLES.ADMIN, ROLES.DCC] },
            { title: "Create Transmission", path: "/dcc/create-transmission", roles: [ROLES.ADMIN, ROLES.DCC] },
            // { title: "Send Document to Client", path: "/dcc/send-document-to-client", roles: [ROLES.ADMIN, ROLES.DCC] },
            { title: "Client Approval Status", path: "/dcc/client-approval-status", roles: [ROLES.ADMIN, ROLES.DCC] },
        ],
    },

    // ── DCR ──
    {
        title: "DCR",
        icon: Folder,
        items: [
            { title: "DCR Request", path: "/dcr/dcr-request", roles: [ROLES.ADMIN, ROLES.QC_ENGINEER, ROLES.DCR, ROLES.DESIGN_ENGINEER] },
        ],
    },

    // ── NCR ──
    {
        title: "NCR",
        icon: Folder,
        items: [
            { title: "NCR", path: "/ncr/create-ncr", roles: [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER, ROLES.DESIGN_ENGINEER, ROLES.WELD_PLAN_ADMIN] }
        ],
    },

    // ── MHC ──
    {
        title: "MHC",
        icon: Folder,
        items: [
            { title: "Material Heat Chart", path: "/material-heat-chart", roles: [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER] },
        ],
    },

    // ── Welding ──
    {
        title: "Weld Plan",
        icon: Wrench,
        path: "/welding-joints",
        roles: [ROLES.ADMIN, ROLES.WELD_PLAN_ADMIN],
    },
    {
        title: "Welding Joints",
        icon: Wrench,
        path: "/view-weldingjoints",
        roles: [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER, ROLES.NDT_ENGINEER],
    },

    // ── Hydrostatic Pressure Test ──
    {
        title: "Hydrostatic Pressure Test",
        icon: FileText,
        items: [
            { title: "Hydro Pres Test", path: "/hydrostatic-pressure-test", roles: [ROLES.ADMIN] },
        ],
    },

    // ── Inspection ──
    {
        title: "Inspection",
        icon: Folder,
        items: [
            { title: "Dish End", path: "/inspections/dish-end", roles: [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER] },
            { title: "Final Dimension", path: "/inspections/final", roles: [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER] },
        ],
    },

    // ── Marketing ──
    {
        title: "Marketing",
        icon: Folder,
        items: [
            { title: "Dashboard", path: "/marketing/dashboard", roles: [ROLES.ADMIN, ROLES.MARKETING] },
            {
                title: "Master",
                roles: [ROLES.ADMIN, ROLES.MARKETING],
                items: [
                    { title: "RFQ Types", path: "/marketing/lookups/rfq_type", roles: [ROLES.ADMIN, ROLES.MARKETING] },
                    { title: "Mode of Enquiry", path: "/marketing/lookups/mode_of_enquiry", roles: [ROLES.ADMIN, ROLES.MARKETING] },
                    { title: "Mediators", path: "/marketing/lookups/mediator", roles: [ROLES.ADMIN, ROLES.MARKETING] },
                    { title: "Estimators", path: "/marketing/lookups/estimator", roles: [ROLES.ADMIN, ROLES.MARKETING] },
                ],
            },
            { title: "RFQ Register", path: "/marketing/rfq-register", roles: [ROLES.ADMIN, ROLES.MARKETING] },
        ],
    },

    // ── Quality Assurance Plan ──
    {
        title: "Quality Assurance Plan",
        icon: ClipboardCheck,
        path: "/create-qarp",
        roles: [ROLES.ADMIN],
    },
]

// ─── Utility: Filter menu by user roles ────────────────────────────
/**
 * Given the full MENU_CONFIG and the user's roles array,
 * returns only the items/sub-items the user is allowed to see.
 */
export function getFilteredMenu(userRoles = []) {
    if (!userRoles || userRoles.length === 0) return []
    const roleSet = new Set(userRoles)
    const hasAccess = (itemRoles) => itemRoles?.some((r) => roleSet.has(r))

    const filterItems = (items) => {
        return items.reduce((acc, item) => {
            // Blacklist check: hide item if user has a role in hideFor
            if (item.hideFor?.some((role) => roleSet.has(role))) return acc

            if (item.items) {
                const visibleSubItems = filterItems(item.items)
                if (visibleSubItems.length > 0) {
                    acc.push({ ...item, items: visibleSubItems })
                }
            } else if (hasAccess(item.roles)) {
                acc.push(item)
            }
            return acc
        }, [])
    }

    return filterItems(MENU_CONFIG)
}

// ─── Utility: Build a Set of all allowed paths for given roles ─────
/**
 * Returns a Set of all route paths a user with the given roles can access.
 * Used by ProtectedRoute to check authorization.
 */
export function getAllowedPaths(userRoles = []) {
    const roleSet = new Set(userRoles)
    const paths = new Set()

    const collectPaths = (items) => {
        for (const item of items) {
            const isAllowed = item.roles?.some((r) => roleSet.has(r))
            const isHidden = item.hideFor?.some((r) => roleSet.has(r))

            if (item.path && isAllowed && !isHidden) {
                paths.add(item.path)
            }
            if (item.items) collectPaths(item.items)
        }
    }

    collectPaths(MENU_CONFIG)
    return paths
}

// ─── Role name normalization map ───────────────────────────────────
// Maps lowercase versions of role keys to their canonical form
export const ROLE_KEY_MAP = Object.values(ROLES).reduce((acc, role) => {
    acc[role.toLowerCase()] = role
    return acc
}, {})
