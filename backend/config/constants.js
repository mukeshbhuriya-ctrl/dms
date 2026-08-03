const SYSTEM_CONSTANTS = {
  FUNCTIONAL_TAGS: {
    PERMIT_ISSUER: "Permit Issuer",
    PERMIT_APPROVER: "Permit Approver",
    ELECTRICAL_SUPERVISOR: "Electrical Supervisor",
    PERMIT_ACCEPTOR: "Permit Acceptor",
    SAFETY_OFFICER: "Safety Officer",
    MECHANICAL_TECHNICIAN: "Mechanical Technician",
    HOD_ENGINEER: "HOD Engineer"
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
