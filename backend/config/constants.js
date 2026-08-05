/*
  DEFAULT_COMPANY_ROLES Configured in this system:
  ADMIN, DCC, WELD_PLAN_ADMIN, PRODUCTION_ENGINEER, QC_ENGINEER, USER, DCR, DESIGN_ENGINEER, MARKETING, TAXATION, QAP, DMS, NCR, MAINTENANCE
*/
const SYSTEM_CONSTANTS = {
  // FUNCTIONAL_TAGS: Used in Work Permit module to grant highly specific legal signing authority (e.g. LOTO Isolation).
  FUNCTIONAL_TAGS: {
    PERMIT_ISSUER: "Permit Issuer",
    PERMIT_APPROVER: "Permit Approver",
    ELECTRICAL_SUPERVISOR: "Electrical Supervisor",
    MECHANICAL_TECHNICIAN: "Mechanical Technician",
    PERMIT_ACCEPTOR: "Permit Acceptor",
    SAFETY_OFFICER: "Safety Officer",
  },
  
  // GROUP_TYPES: Categories for Employee Groups; 'role' defines the base requirement to join a group.
  GROUP_TYPES: [
    { label: "Quality", value: "QUALITY", role: "QC_ENGINEER" },
    { label: "Production", value: "PRODUCTION", role: "PRODUCTION_ENGINEER" },
    { label: "Design", value: "DESIGN", role: "DESIGN_ENGINEER" },
    { label: "Marketing", value: "MARKETING", role: "MARKETING" },
    { label: "Maintenance", value: "MAINTENANCE", role: "MAINTENANCE" },
  ]
};

const getAvailableTags = () => {
  return Object.entries(SYSTEM_CONSTANTS.FUNCTIONAL_TAGS).map(([key, value]) => ({
    id: key,
    name: value
  }));
};

module.exports = {
  SYSTEM_CONSTANTS,
  getAvailableTags
};
