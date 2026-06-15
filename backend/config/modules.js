/**
 * Centralized Module Keys for Permission-Based Access Control (PBAC)
 * Structured to match the Frontend Menu hierarchy for maximum clarity.
 */
const MODULES = {
    // ── Global ──────────────────────────────────────────────────────
    ALL: "ALL",
    DASHBOARD: {
        ADMIN: "DASHBOARD_ADMIN",
        USER: "DASHBOARD_USER",
        MARKETING: "DASHBOARD_MARKETING",
    },

    // ── Engineering / Production / Quality ──────────────────────────
    JOB_OVERVIEW: "JOB_OVERVIEW",
    REPORTS_MANAGEMENT: "REPORTS_MANAGEMENT",

    DTN: {
        VIEW: "DTN_VIEW",
        MASTER: "DTN_MASTER",
    },

    DMS: {
        COMMUNICATION_MATRIX: "DMS_COMMUNICATION_MATRIX",
        VDR: "DMS_VDR",
        UPLOAD: "DMS_UPLOAD",
        APPROVER: "DMS_APPROVER",
        TRANSMISSION_CREATE: "DMS_TRANSMISSION_CREATE",
        TRANSMISSION_STATUS: "DMS_TRANSMISSION_STATUS",
    },

    DCR: {
        REQUEST: "DCR_REQUEST", // Simplified for one item
    },

    NCR: {
        CREATE: "NCR_CREATE",
    },

    MHC: {
        VIEW: "MHC_VIEW",
    },

    WELDING: {
        WELD_PLAN: "WELD_PLAN",
        WELD_JOINTS: "WELD_JOINTS",
    },

    HYDRO_TEST: {
        VIEW: "HYDRO_TEST_VIEW",
    },

    INSPECTION: {
        DISH_END: "INSPECTION_DISH_END",
        TUBE_SHEET: "INSPECTION_TUBE_SHEET",
        FINAL: "INSPECTION_FINAL",
    },

    QAP: {
        CREATE: "QAP_CREATE",
    },

    // ── Masters ─────────────────────────────────────────────────────
    MASTERS: {
        INSTRUMENTS: "MASTERS_INSTRUMENTS",
    },

    // ── Marketing ───────────────────────────────────────────────────
    MARKETING: {
        RFQ: "MARKETING_RFQ",
        MASTER: "MARKETING_MASTER",
    },

    // ── Management / Finance ────────────────────────────────────────
    CUSTOMERS: {
        CUSTOMER: "CUSTOMER_MANAGEMENT",
        LOCATION: "LOCATION_MANAGEMENT",
    },

    PO_MANAGEMENT: "PO_MANAGEMENT",
    JOB_MANAGEMENT: "JOB_MANAGEMENT",

    // ── Administration ──────────────────────────────────────────────
    ADMINISTRATION: {
        USERS: "ADMIN_USERS",
        DEPARTMENTS: "ADMIN_DEPARTMENTS",
        QC_GROUPS: "ADMIN_QC_GROUPS",
        AUDIT_LOGS: "ADMIN_AUDIT_LOGS",
    }
};

module.exports = MODULES;
