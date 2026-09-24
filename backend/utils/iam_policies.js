const IAM_POLICIES = {
  ADMIN: [
    { Effect: "Allow", Action: ["*"], Resource: ["*"] }
  ],
  DESIGN_ENGINEER: [
    {
      Effect: "Allow",
      Action: ["*"],
      Resource: [
        "dashboard:quality_production",
        "dtn:drawing_transmittal", "dtn:drawing_master",
        "dms:communication_matrix", "dms:vdr", "dms:approver", "dms:transmission", "dms:status",
        "dcr:request",
        "ncr:ncr",
        "mhc:material_heat_chart",
        "welding:plan", "welding:joints", "welding:traveler",
        "hydrostatic:test",
        "inspection:dish_end", "inspection:tube_sheet", "inspection:tube_bundle", "inspection:final",
        "qap:quality_assurance_plan",
        "dashboard:job_overview", "reports:management"
      ]
    }
  ],
  PRODUCTION_ENGINEER: [
    {
      Effect: "Allow",
      Action: ["*"],
      Resource: [
        "dashboard:quality_production",
        "dtn:drawing_transmittal", "dtn:drawing_master",
        "dms:vdr",
        "dcr:request",
        "ncr:ncr",
        "mhc:material_heat_chart",
        "welding:plan", "welding:joints", "welding:traveler",
        "hydrostatic:test",
        "inspection:dish_end", "inspection:tube_sheet", "inspection:tube_bundle", "inspection:final",
        "qap:quality_assurance_plan",
        "dashboard:job_overview", "reports:management",
        "dashboard:quality_production",
        "instruments:calibration", "instruments:pressure",
        "maintenance:machine", "maintenance:memo", "maintenance:pm_schedule",
        "work_permit:permit"
      ]
    }
  ],
  QC_ENGINEER: [
    {
      Effect: "Allow",
      Action: ["*"],
      Resource: [
        "dashboard:quality_production",
        "dtn:drawing_transmittal", "dtn:drawing_master",
        "dms:vdr",
        "dcr:request",
        "ncr:ncr",
        "mhc:material_heat_chart",
        "welding:plan", "welding:joints", "welding:traveler",
        "hydrostatic:test",
        "inspection:dish_end", "inspection:tube_sheet", "inspection:tube_bundle", "inspection:final",
        "qap:quality_assurance_plan",
        "dashboard:job_overview", "reports:management",
        "dashboard:quality_production",
        "instruments:calibration", "instruments:pressure"
      ]
    }
  ],
  WELD_PLAN_ADMIN: [
    {
      Effect: "Allow",
      Action: ["*"],
      Resource: [
        "dashboard:quality_production",
        "dtn:drawing_transmittal", "dtn:drawing_master",
        "dms:vdr",
        "dcr:request",
        "ncr:ncr",
        "mhc:material_heat_chart",
        "welding:plan", "welding:joints", "welding:traveler",
        "hydrostatic:test",
        "inspection:dish_end", "inspection:tube_sheet", "inspection:tube_bundle", "inspection:final",
        "qap:quality_assurance_plan",
        "dashboard:job_overview", "reports:management"
      ]
    }
  ],
  QAP: [
    {
      Effect: "Allow",
      Action: ["*"],
      Resource: ["dashboard:quality_production", "qap:quality_assurance_plan", "qap:heading_master"]
    }
  ],
  MARKETING: [
    {
      Effect: "Allow",
      Action: ["*"],
      Resource: ["marketing:*", "po:management", "job:management"]
    }
  ],
  TAXATION: [
    {
      Effect: "Allow",
      Action: ["*"],
      Resource: ["dashboard:user", "customer:customer", "customer:location", "po:management", "job:management"]
    }
  ],
  DCC: [
    {
      Effect: "Allow",
      Action: ["*"],
      Resource: [
        "dashboard:user",
        "customer:customer", "customer:location",
        "job:management",
        "dtn:drawing_transmittal", "dtn:drawing_master",
        "dms:communication_matrix", "dms:vdr", "dms:upload", "dms:approver", "dms:transmission", "dms:status",
        "qap:quality_assurance_plan"
      ]
    }
  ],
  USER: [
    {
      Effect: "Allow",
      Action: ["*"],
      Resource: ["dashboard:user", "dms:upload"]
    }
  ],
  MAINTENANCE: [
    {
      Effect: "Allow",
      Action: ["*"],
      Resource: ["dashboard:user", "maintenance:machine", "maintenance:memo", "maintenance:pm_schedule", "work_permit:permit"]
    }
  ],
  DMS: [
    {
      Effect: "Allow",
      Action: ["*"],
      Resource: [
        "dashboard:user",
        "dms:communication_matrix", "dms:vdr", "dms:approver", "dms:transmission", "dms:status"
      ]
    }
  ],
  DCR: [
    {
      Effect: "Allow",
      Action: ["*"],
      Resource: ["dashboard:user", "dcr:request"]
    }
  ],
  NCR: [
    {
      Effect: "Allow",
      Action: ["*"],
      Resource: ["dashboard:user", "ncr:ncr"]
    }
  ]
};

/**
 * Utility to merge multiple policy arrays (e.g., base role policies + user custom policies)
 */
function mergePolicies(basePolicies = [], customPolicies = []) {
  if (!Array.isArray(basePolicies)) basePolicies = [];
  if (!Array.isArray(customPolicies)) customPolicies = [];
  return [...basePolicies, ...customPolicies];
}

module.exports = {
  IAM_POLICIES,
  mergePolicies
};
