require('dotenv/config');
require('tsx/cjs');

const { PrismaClient } = require('#prismaclint');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Create PrismaClient instance with adapter
const prisma = new PrismaClient({ adapter });

// Export the prisma client instance
module.exports = prisma;

// Also export a function to get the client (for consistency)
module.exports.getPrismaClient = () => prisma;

// Export a function to disconnect (useful for cleanup)
module.exports.disconnect = async () => {
  await prisma.$disconnect();
  await pool.end();
};