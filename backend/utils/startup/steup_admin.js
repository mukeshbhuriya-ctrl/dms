// Import Prisma client from utils
const prisma = require('#prisma');
const { hashPassword } = require('../../utils/hashpassword');

async function setupAdmin() {
  try {
    const adminEmail =  'admin@example.com';
    const adminPassword =  'admin123';
    const adminName = 'Admin';

    // Check if admin already exists
    const existingAdmin = await prisma.siteadmin.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log('Admin already exists:', adminEmail);
      return existingAdmin;
    }

    // Hash the password before storing
    const hashedPassword = await hashPassword(adminPassword);

    // Create admin if it doesn't exist
    const admin = await prisma.siteadmin.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword, // Store hashed password
      },
    });

    console.log('Admin created successfully:', admin.email);
    return admin;
  } catch (error) {
    console.error('Error setting up admin:', error);
    throw error;
  }
  // Note: Don't disconnect here as Prisma client should stay connected for the server
}

module.exports = { setupAdmin };

// Run setupAdmin if this file is executed directly
if (require.main === module) {
  setupAdmin()
    .then(() => {
      console.log('Setup completed');
      // Disconnect Prisma client when running as standalone script
      return prisma.$disconnect();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      // Ensure we disconnect even on error
      prisma.$disconnect().finally(() => {
        process.exit(1);
      });
    });
}
