const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runTest() {
  console.log('--- Starting Medicine Availability End-to-End Test ---');

  // 1. Fetch facilities
  const facilities = await prisma.facility.findMany({
    include: { _count: { select: { inventory: true } } },
  });
  console.log(`[PASS] Found ${facilities.length} health facilities with inventory.`);
  if (facilities.length < 4) {
    throw new Error('Expected at least 4 seeded facilities');
  }

  // 2. Search medicine across facilities (Paracetamol)
  const paracetamolStocks = await prisma.medicineStock.findMany({
    where: { medicineName: { contains: 'paracetamol', mode: 'insensitive' } },
    include: { facility: true },
  });
  console.log(`[PASS] Paracetamol found across ${paracetamolStocks.length} facilities.`);
  if (paracetamolStocks.length === 0) {
    throw new Error('Paracetamol stocks should not be empty');
  }

  // 3. Verify stock statuses
  const availableItems = await prisma.medicineStock.findMany({ where: { status: 'AVAILABLE' } });
  const lowStockItems = await prisma.medicineStock.findMany({ where: { status: 'LOW_STOCK' } });
  const outOfStockItems = await prisma.medicineStock.findMany({ where: { status: 'OUT_OF_STOCK' } });

  console.log(`[PASS] Stock distribution verified: Available=${availableItems.length}, LowStock=${lowStockItems.length}, OutOfStock=${outOfStockItems.length}`);
  if (availableItems.length === 0 || lowStockItems.length === 0 || outOfStockItems.length === 0) {
    throw new Error('Expected mixed stock distribution with available, low stock, and out of stock items');
  }

  // 4. Update stock quantity & status
  const targetStock = lowStockItems[0];
  const updatedStock = await prisma.medicineStock.update({
    where: { id: targetStock.id },
    data: {
      quantity: 150,
      status: 'AVAILABLE',
    },
  });
  console.log(`[PASS] Updated stock item ${updatedStock.medicineName} in ${targetStock.facilityId}: New Status=${updatedStock.status}, Quantity=${updatedStock.quantity}`);

  // Revert back so seed levels remain consistent
  await prisma.medicineStock.update({
    where: { id: targetStock.id },
    data: {
      quantity: targetStock.quantity,
      status: targetStock.status,
    },
  });

  console.log('--- Medicine Availability E2E Verification COMPLETE & SUCCESSFUL ---');
}

runTest()
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
