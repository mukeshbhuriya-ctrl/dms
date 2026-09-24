export const PERMISSION_MODULES = [
  // Dashboards
  { id: 'dashboard:admin', name: 'Dashboard: Admin', actions: ['View'] },
  { id: 'dashboard:user', name: 'Dashboard: User', actions: ['View'] },
  { id: 'dashboard:quality_production', name: 'Dashboard: Quality Production', actions: ['View'] },
  { id: 'dashboard:job_overview', name: 'Dashboard: Job Overview', actions: ['View'] },

  // Administration
  { id: 'admin:users', name: 'Admin: Users', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'admin:roles', name: 'Admin: Roles', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'admin:departments', name: 'Admin: Departments', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'admin:group_management', name: 'Admin: Group Management', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'admin:audit_logs', name: 'Admin: Audit Logs', actions: ['View'] },
  { id: 'admin:approval_center', name: 'Admin: Approval Center', actions: ['View', 'Approve'] },

  // Reports
  { id: 'reports:management', name: 'Reports: Management', actions: ['View', 'Export'] },

  // Customer Management
  { id: 'customer:customer', name: 'Customer: Customer', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'customer:location', name: 'Customer: Location', actions: ['View', 'Create', 'Update', 'Delete'] },

  // Purchase Orders & Jobs
  { id: 'po:management', name: 'PO Management', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'job:management', name: 'Job Management', actions: ['View', 'Create', 'Update', 'Delete'] },

  // DTN
  { id: 'dtn:drawing_transmittal', name: 'DTN: Drawing Transmittal', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'dtn:drawing_master', name: 'DTN: Drawing Master', actions: ['View', 'Create', 'Update', 'Delete'] },

  // DMS
  { id: 'dms:communication_matrix', name: 'DMS: Communication Matrix', actions: ['View', 'Create', 'Update'] },
  { id: 'dms:vdr', name: 'DMS: VDR', actions: ['View', 'Create', 'Update', 'Export'] },
  { id: 'dms:upload', name: 'DMS: Upload Documents', actions: ['Upload', 'View'] },
  { id: 'dms:approver', name: 'DMS: Document Approver', actions: ['View', 'Approve'] },
  { id: 'dms:transmission', name: 'DMS: Create Transmission', actions: ['Create', 'View'] },
  { id: 'dms:status', name: 'DMS: Client Approval Status', actions: ['View'] },

  // DCR
  { id: 'dcr:request', name: 'DCR: Request', actions: ['View', 'Create', 'Update', 'Delete'] },

  // NCR
  { id: 'ncr:ncr', name: 'NCR: NCR', actions: ['View', 'Create', 'Update', 'Delete'] },

  // MHC
  { id: 'mhc:material_heat_chart', name: 'MHC: Material Heat Chart', actions: ['View', 'Create', 'Update', 'Delete'] },

  // Welding
  { id: 'welding:plan', name: 'Welding: Weld Plan', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'welding:joints', name: 'Welding: Joints', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'welding:traveler', name: 'Welding: Traveler', actions: ['View', 'Update'] },

  // Hydrostatic
  { id: 'hydrostatic:test', name: 'HPT: Hydro Pres Test', actions: ['View', 'Update'] },

  // Instruments
  { id: 'instruments:calibration', name: 'Instruments: Calibration', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'instruments:pressure', name: 'Instruments: Pressure Gauges', actions: ['View', 'Create', 'Update', 'Delete'] },

  // Maintenance
  { id: 'maintenance:machine', name: 'Maintenance: Machine Master', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'maintenance:memo', name: 'Maintenance: Memo', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'maintenance:pm_schedule', name: 'Maintenance: PM Schedule', actions: ['View', 'Create', 'Update', 'Delete'] },

  // Work Permits
  { id: 'work_permit:permit', name: 'Work Permits', actions: ['View', 'Create', 'Update', 'Delete'] },

  // Inspection
  { id: 'inspection:dish_end', name: 'Inspection: Dish End', actions: ['View', 'Update'] },
  { id: 'inspection:final', name: 'Inspection: Final Dimension', actions: ['View', 'Update'] },
  { id: 'inspection:tube_sheet', name: 'Inspection: Tube Sheet', actions: ['View', 'Update'] },
  { id: 'inspection:tube_bundle', name: 'Inspection: Tube Bundle', actions: ['View', 'Update'] },

  // Marketing
  { id: 'marketing:dashboard', name: 'Marketing: Dashboard', actions: ['View'] },
  { id: 'marketing:rfq_type', name: 'Marketing: RFQ Types', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'marketing:mode_of_enquiry', name: 'Marketing: Mode of Enquiry', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'marketing:mediator', name: 'Marketing: Mediators', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'marketing:estimator', name: 'Marketing: Estimators', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'marketing:rfq_register', name: 'Marketing: RFQ Register', actions: ['View', 'Create', 'Update', 'Delete'] },

  // QAP
  { id: 'qap:heading_master', name: 'QAP: Heading Master', actions: ['View', 'Create', 'Update', 'Delete'] },
  { id: 'qap:quality_assurance_plan', name: 'QAP: Quality Assurance Plan', actions: ['View', 'Create', 'Update', 'Delete'] },
]

export const ALL_ACTIONS = ['View', 'Create', 'Update', 'Delete', 'Upload', 'Export', 'Approve'];

export function policiesToMatrix(policies, baseRolePolicies = []) {
  const matrix = {};
  PERMISSION_MODULES.forEach(m => {
    matrix[m.id] = {};
    ALL_ACTIONS.forEach(a => {
      matrix[m.id][a] = 'inherited_deny';
    });
  });

  const applyPolicies = (polArray, effectOverride, inheritPrefix = 'inherited_') => {
    if (!polArray || !Array.isArray(polArray)) return;
    polArray.forEach(policy => {
      const actions = policy.Action.includes('*') ? ALL_ACTIONS : policy.Action;
      policy.Resource.forEach(res => {
        let matchedModules = [];
        if (res === '*') {
          matchedModules = PERMISSION_MODULES.map(m => m.id);
        } else if (res.endsWith('*')) {
          const prefix = res.substring(0, res.length - 1);
          matchedModules = PERMISSION_MODULES.map(m => m.id).filter(id => id.startsWith(prefix));
        } else {
          matchedModules = [res];
        }

        matchedModules.forEach(modId => {
          if (matrix[modId]) {
            actions.forEach(act => {
              if (matrix[modId][act] !== undefined) {
                if (effectOverride) {
                  matrix[modId][act] = effectOverride;
                } else {
                  matrix[modId][act] = policy.Effect === 'Allow' ? `${inheritPrefix}allow` : `${inheritPrefix}deny`;
                }
              }
            });
          }
        });
      });
    });
  };

  // Base role
  applyPolicies(baseRolePolicies, null, 'inherited_');
  
  // Custom overrides (Effect is exactly 'allow' or 'deny')
  if (policies && Array.isArray(policies)) {
    policies.forEach(policy => {
      const actions = policy.Action.includes('*') ? ALL_ACTIONS : policy.Action;
      policy.Resource.forEach(res => {
        let matchedModules = [];
        if (res === '*') {
          matchedModules = PERMISSION_MODULES.map(m => m.id);
        } else if (res.endsWith('*')) {
          const prefix = res.substring(0, res.length - 1);
          matchedModules = PERMISSION_MODULES.map(m => m.id).filter(id => id.startsWith(prefix));
        } else {
          matchedModules = [res];
        }

        matchedModules.forEach(modId => {
          if (matrix[modId]) {
            actions.forEach(act => {
              if (matrix[modId][act] !== undefined) {
                matrix[modId][act] = policy.Effect === 'Allow' ? 'allow' : 'deny';
              }
            });
          }
        });
      });
    });
  }

  return matrix;
}

export function matrixToPolicies(matrix, isOverride = false) {
  const policies = [];
  const effectMap = { Allow: {}, Deny: {} };

  Object.entries(matrix).forEach(([modId, actionsMap]) => {
    Object.entries(actionsMap).forEach(([act, state]) => {
      if (state === 'allow') {
        if (!effectMap.Allow[act]) effectMap.Allow[act] = [];
        effectMap.Allow[act].push(modId);
      } else if (isOverride && state === 'deny') {
        if (!effectMap.Deny[act]) effectMap.Deny[act] = [];
        effectMap.Deny[act].push(modId);
      }
    });
  });

  const build = (map, effect) => {
    const resourceStringToAction = {};
    Object.entries(map).forEach(([act, resources]) => {
      resources.sort();
      const key = resources.join('||');
      if (!resourceStringToAction[key]) resourceStringToAction[key] = { resources, actions: [] };
      resourceStringToAction[key].actions.push(act);
    });

    Object.values(resourceStringToAction).forEach(({ resources, actions }) => {
      policies.push({ Effect: effect, Action: actions, Resource: resources });
    });
  };

  build(effectMap.Allow, 'Allow');
  build(effectMap.Deny, 'Deny');

  return policies;
}

export function validateAccess(policies, resource, action = 'View') {
  if (!policies || !Array.isArray(policies)) return false;
  
  let allowed = false;
  
  for (const policy of policies) {
    const matchResource = policy.Resource.some(r => r === '*' || r === resource || (r.endsWith('*') && resource.startsWith(r.slice(0, -1))));
    const matchAction = policy.Action.some(a => a === '*' || a === action);
    
    if (matchResource && matchAction) {
      if (policy.Effect === 'Deny') {
        return false; // Deny overrides anything
      }
      if (policy.Effect === 'Allow') {
        allowed = true;
      }
    }
  }
  
  return allowed;
}
