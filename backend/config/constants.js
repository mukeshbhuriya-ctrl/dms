/*
  DEFAULT_COMPANY_ROLES Configured in this system:
  ADMIN, DCC, WELD_PLAN_ADMIN, PRODUCTION_ENGINEER, QC_ENGINEER, USER, DCR, DESIGN_ENGINEER, MARKETING, TAXATION, QAP, DMS, NCR, MAINTENANCE
*/
const SYSTEM_CONSTANTS = {
  FUNCTIONAL_TAGS: {
    PERMIT_ISSUER: "Permit Issuer",
    PERMIT_APPROVER: "Permit Approver",
    ELECTRICAL_SUPERVISOR: "Electrical Supervisor",
    MECHANICAL_TECHNICIAN: "Mechanical Technician",
    PERMIT_ACCEPTOR: "Permit Acceptor",
    SAFETY_OFFICER: "Safety Officer",
  }
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
