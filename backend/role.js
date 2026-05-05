// Import Prisma client from utils
require('module-alias/register');
require('tsx/cjs');
const prisma = require('#prisma');

const COMPANY_ID = '272b81b4-11c4-4316-9b67-ddf6687286d3';
const USER_ID = 'b760b4fe-d9cd-4a8e-bae0-6414f849e35e';
const ROLE_NAME = 'QAP';

async function createRoleAndAssign() {
  try {
    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: COMPANY_ID },
    });

    if (!company) {
      console.error(`Company with ID ${COMPANY_ID} not found`);
      throw new Error('Company not found');
    }

    console.log(`Company found: ${company.name}`);

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: USER_ID },
    });

    if (!user) {
      console.error(`User with ID ${USER_ID} not found`);
      throw new Error('User not found');
    }

    console.log(`User found: ${user.name} (${user.email})`);

    // Check if user belongs to the company
    if (user.company_id !== COMPANY_ID) {
      console.error(`User belongs to company ${user.company_id}, not ${COMPANY_ID}`);
      throw new Error('User does not belong to the specified company');
    }

    // Use transaction to ensure both operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Check if role already exists for this company
      const existingRole = await tx.role.findFirst({
        where: {
          company_id: COMPANY_ID,
          name: ROLE_NAME,
        },
      });

      let role;
      if (existingRole) {
        console.log(`Role "${ROLE_NAME}" already exists for this company`);
        role = existingRole;
      } else {
        // Create the Marketing role
        role = await tx.role.create({
          data: {
            company_id: COMPANY_ID,
            name: ROLE_NAME,
          },
        });
        console.log(`Role "${ROLE_NAME}" created successfully with ID: ${role.id}`);
      }

      // Check if user already has this role
      const existingUserRole = await tx.user_roles.findFirst({
        where: {
          user_id: USER_ID,
          role_id: role.id,
        },
      });

      if (existingUserRole) {
        console.log(`User already has the "${ROLE_NAME}" role`);
        return { role, userRole: existingUserRole, created: false };
      }

      // Assign role to user
      const userRole = await tx.user_roles.create({
        data: {
          user_id: USER_ID,
          role_id: role.id,
        },
      });

      console.log(`Role "${ROLE_NAME}" assigned to user successfully`);
      return { role, userRole, created: true };
    });

    console.log('\n✅ Success!');
    console.log(`Role ID: ${result.role.id}`);
    console.log(`User Role ID: ${result.userRole.id}`);
    console.log(`Created new assignment: ${result.created}`);

    return result;
  } catch (error) {
    console.error('Error creating role and assigning to user:', error);
    throw error;
  }
}

// Run the script if executed directly
if (require.main === module) {
  createRoleAndAssign()
    .then(() => {
      console.log('\nScript completed successfully');
      // Disconnect Prisma client when running as standalone script
      return prisma.$disconnect();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nScript failed:', error);
      // Ensure we disconnect even on error
      prisma.$disconnect().finally(() => {
        process.exit(1);
      });
    });
}

module.exports = { createRoleAndAssign };
