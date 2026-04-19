const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.drawing_transmittal.count();
  console.log('DTN Count:', count);
  const data = await prisma.drawing_transmittal.findMany();
  console.log('DTN Data:', JSON.stringify(data, null, 2));
  process.exit(0);
}

check();
