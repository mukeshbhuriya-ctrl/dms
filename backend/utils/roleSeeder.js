const prisma = require('#prisma');
const { IAM_POLICIES } = require('./iam_policies');

const SEED_ROLES = [
  {
    name: "ADMIN",
    identifier: "ADMIN",
    description: "Full system access for Company Administrators",
    is_system_role: true,
    policies: IAM_POLICIES.ADMIN
  },
  {
    name: "DESIGN_ENGINEER",
    identifier: "DESIGN_ENGINEER",
    description: "Design Engineering Role",
    is_system_role: true,
    policies: IAM_POLICIES.DESIGN_ENGINEER
  },
  {
    name: "PRODUCTION_ENGINEER",
    identifier: "PRODUCTION_ENGINEER",
    description: "Production Engineering Role",
    is_system_role: true,
    policies: IAM_POLICIES.PRODUCTION_ENGINEER
  },
  {
    name: "QC_ENGINEER",
    identifier: "QC_ENGINEER",
    description: "Quality Control Engineer",
    is_system_role: true,
    policies: IAM_POLICIES.QC_ENGINEER
  },
  {
    name: "WELD_PLAN_ADMIN",
    identifier: "WELD_PLAN_ADMIN",
    description: "Welding Plan Administrator",
    is_system_role: true,
    policies: IAM_POLICIES.WELD_PLAN_ADMIN
  },
  {
    name: "QAP",
    identifier: "QAP",
    description: "QAP Role",
    is_system_role: true,
    policies: IAM_POLICIES.QAP
  },
  {
    name: "MARKETING",
    identifier: "MARKETING",
    description: "Marketing Group",
    is_system_role: true,
    policies: IAM_POLICIES.MARKETING
  },
  {
    name: "TAXATION",
    identifier: "TAXATION",
    description: "Taxation Group",
    is_system_role: true,
    policies: IAM_POLICIES.TAXATION
  },
  {
    name: "DCC",
    identifier: "DCC",
    description: "Document Control Center",
    is_system_role: true,
    policies: IAM_POLICIES.DCC
  },
  {
    name: "USER",
    identifier: "USER",
    description: "Basic Operational Role",
    is_system_role: true,
    policies: IAM_POLICIES.USER
  },
  {
    name: "MAINTENANCE",
    identifier: "MAINTENANCE",
    description: "Maintenance Group",
    is_system_role: true,
    policies: IAM_POLICIES.MAINTENANCE
  },
  {
    name: "DMS",
    identifier: "DMS",
    description: "DMS Role",
    is_system_role: true,
    policies: IAM_POLICIES.DMS
  },
  {
    name: "DCR",
    identifier: "DCR",
    description: "DCR Role",
    is_system_role: true,
    policies: IAM_POLICIES.DCR
  },
  {
    name: "NCR",
    identifier: "NCR",
    description: "NCR Role",
    is_system_role: true,
    policies: IAM_POLICIES.NCR
  }
];

async function seedSystemRolesForCompany(companyId, txClient = prisma) {
  let seededCount = 0;
  for (const roleDef of SEED_ROLES) {
    const existing = await txClient.role.findFirst({
      where: { 
        company_id: companyId, 
        OR: [
          { identifier: roleDef.identifier },
          { name: roleDef.identifier } // Legacy data fallback
        ]
      }
    });

    if (!existing) {
      await txClient.role.create({
        data: {
          company_id: companyId,
          name: roleDef.name,
          identifier: roleDef.identifier,
          description: roleDef.description,
          is_system_role: roleDef.is_system_role,
          policies: roleDef.policies
        }
      });
      seededCount++;
    } else {
      // Optionally update policies and name if they diverge for system roles
      await txClient.role.update({
        where: { id: existing.id },
        data: {
          name: roleDef.name,
          identifier: roleDef.identifier,
          policies: roleDef.policies,
          description: roleDef.description,
          is_system_role: true
        }
      });
    }
  }
  return seededCount;
}

async function seedSystemRoles() {
  try {
    const companies = await prisma.company.findMany();
    let seededCount = 0;
    
    for (const company of companies) {
      seededCount += await seedSystemRolesForCompany(company.id);
    }
    
    if (seededCount > 0) {
      console.log(`Seeded missing system roles for existing companies.`);
    }
  } catch (error) {
    console.error("Error seeding roles:", error);
  }
}

module.exports = { seedSystemRoles, seedSystemRolesForCompany, SEED_ROLES };
