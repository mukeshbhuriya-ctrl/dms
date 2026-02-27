import {
    LayoutDashboard,
    FileText,
    Users,
    Building2,
    ClipboardCheck,
    Wrench,
    Briefcase,
    Folder,
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
    PRODUCTION: "Production",
    MANAGER: "Manager",
    MARKETING: "Marketing",
}

// ─── Menu Configuration ────────────────────────────────────────────
// Each item defines `roles` — the set of roles that can SEE this item.
// For groups with `items[]`, the group itself is shown if ANY sub-item is visible.
// The group-level `roles` is optional (auto-derived from sub-items if omitted).
//
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
        title: "Dashboard",
        icon: LayoutDashboard,
        path: "/user/dashboard",
        roles: [ROLES.DCC, ROLES.USER, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER, ROLES.NDT_ENGINEER, ROLES.WELD_PLAN_ADMIN],
    },

    // ── Customer Management ──
    {
        title: "Customer Management",
        icon: Users,
        items: [
            { title: "Customer", path: "/dcc/create-customer", roles: [ROLES.ADMIN, ROLES.DCC] },
            { title: "Location", path: "/dcc/create-location", roles: [ROLES.ADMIN, ROLES.DCC] },
        ],
    },

    // ── User & Department Management ──
    {
        title: "User Management",
        icon: Users,
        path: "/users",
        roles: [ROLES.ADMIN],
    },
    {
        title: "Department Management",
        icon: Building2,
        path: "/departments",
        roles: [ROLES.ADMIN],
    },

    // ── Purchase Orders & Jobs ──
    {
        title: "Purchase Orders",
        icon: Briefcase,
        path: "/dcc/create-po",
        roles: [ROLES.ADMIN, ROLES.DCC],
    },
    {
        title: "Jobs",
        icon: FileText,
        path: "/dcc/create-job",
        roles: [ROLES.ADMIN, ROLES.DCC],
    },

    // ── DMS ──
    {
        title: "DMS",
        icon: Folder,
        items: [
            { title: "Document Master", path: "/dcc/document-master", roles: [ROLES.ADMIN, ROLES.DCC] },
            { title: "Assign Document", path: "/dcc/assign-document", roles: [ROLES.ADMIN, ROLES.DCC] },
            { title: "Upload Documents", path: "/user/upload-documents", roles: [ROLES.ADMIN, ROLES.DCC, ROLES.USER] },
            { title: "Document Approver", path: "/dcc/document-approver", roles: [ROLES.ADMIN, ROLES.DCC] },
            { title: "Create Transmission", path: "/dcc/create-transmission", roles: [ROLES.ADMIN, ROLES.DCC] },
            { title: "Send Document to Client", path: "/dcc/send-document-to-client", roles: [ROLES.ADMIN, ROLES.DCC] },
            { title: "Client Approval Status", path: "/dcc/client-approval-status", roles: [ROLES.ADMIN, ROLES.DCC] },
        ],
    },

    // ── DCR ──
    {
        title: "DCR",
        icon: Folder,
        items: [
            { title: "Create DCR", path: "/admin/create-dcr", roles: [ROLES.ADMIN] },
            { title: "View DCR", path: "/admin/view-dcr", roles: [ROLES.ADMIN] },
        ],
    },

    // ── NCR ──
    {
        title: "NCR",
        icon: Folder,
        items: [
            { title: "Create NCR", path: "/admin/create-ncr", roles: [ROLES.ADMIN] },
            { title: "View NCR", path: "/admin/view-ncr", roles: [ROLES.ADMIN] },
        ],
    },

    // ── MHC ──
    {
        title: "MHC",
        icon: Folder,
        items: [
            { title: "Material Heat Chart", path: "/material-heat-chart", roles: [ROLES.ADMIN] },
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
            { title: "Dish End Inspection", path: "/inspections/dish-end", roles: [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER] },
            { title: "Final Inspection Reports", path: "/inspections/final", roles: [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER] },
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

    const hasAccess = (itemRoles) => {
        if (!itemRoles || itemRoles.length === 0) return false
        return itemRoles.some((r) => roleSet.has(r))
    }

    const filtered = []

    for (const item of MENU_CONFIG) {
        // Simple item (no sub-items)
        if (!item.items) {
            if (hasAccess(item.roles)) {
                filtered.push(item)
            }
            continue
        }

        // Group item — filter sub-items
        const visibleSubItems = item.items.filter((sub) => hasAccess(sub.roles))
        if (visibleSubItems.length > 0) {
            filtered.push({
                ...item,
                items: visibleSubItems,
            })
        }
    }

    return filtered
}

// ─── Utility: Build a Set of all allowed paths for given roles ─────
/**
 * Returns a Set of all route paths a user with the given roles can access.
 * Used by ProtectedRoute to check authorization.
 */
export function getAllowedPaths(userRoles = []) {
    const roleSet = new Set(userRoles)
    const paths = new Set()

    for (const item of MENU_CONFIG) {
        if (!item.items) {
            if (item.roles?.some((r) => roleSet.has(r)) && item.path) {
                paths.add(item.path)
            }
        } else {
            for (const sub of item.items) {
                if (sub.roles?.some((r) => roleSet.has(r)) && sub.path) {
                    paths.add(sub.path)
                }
            }
        }
    }

    return paths
}

// ─── Role name normalization map ───────────────────────────────────
// Maps lowercase versions of role keys to their canonical form
export const ROLE_KEY_MAP = Object.values(ROLES).reduce((acc, role) => {
    acc[role.toLowerCase()] = role
    return acc
}, {})
