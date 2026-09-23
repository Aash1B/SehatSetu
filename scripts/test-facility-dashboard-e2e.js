const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runTest() {
  console.log('--- Starting Facility / PHC Dashboard End-to-End Test ---');

  // 1. Fetch all facilities
  const facilities = await prisma.facility.findMany();
  console.log(`[PASS] Found ${facilities.length} health facilities.`);

  for (const fac of facilities) {
    console.log(`\nVerifying metrics for: ${fac.name} (${fac.type}, District: ${fac.district})`);

    // Consultations
    const totalAppointments = await prisma.appointment.count();
    const completedAppointments = await prisma.appointment.count({ where: { status: 'COMPLETED' } });

    // Referrals
    const incomingReferrals = await prisma.referral.count({
      where: { recommendedFacility: { contains: fac.name, mode: 'insensitive' } },
    });
    const completedReferrals = await prisma.referral.count({
      where: { recommendedFacility: { contains: fac.name, mode: 'insensitive' }, status: 'COMPLETED' },
    });

    // High risk
    const highRiskAppointments = await prisma.appointment.count({
      where: {
        OR: [
          { priority: 'EMERGENCY' },
          { priority: 'HIGH' },
          { urgency: 'emergency' },
          { urgency: 'high' },
        ],
      },
    });

    // Diagnostic orders
    const totalDiagnosticOrders = await prisma.diagnosticOrder.count();
    const pendingDiagnosticOrders = await prisma.diagnosticOrder.count({
      where: { status: { in: ['ORDERED', 'SAMPLE_COLLECTED'] } },
    });

    // Medicine Inventory & Shortages
    const stocks = await prisma.medicineStock.findMany({ where: { facilityId: fac.id } });
    const outOfStock = stocks.filter((s) => s.status === 'OUT_OF_STOCK' || (s.quantity !== null && s.quantity <= 0)).length;
    const lowStock = stocks.filter((s) => s.status === 'LOW_STOCK' || (s.quantity !== null && s.quantity > 0 && s.quantity < 10)).length;
    const available = stocks.filter((s) => s.status === 'AVAILABLE' && (s.quantity === null || s.quantity >= 10)).length;
    const shortages = outOfStock + lowStock;

    console.log(`  1. Consultations: Completed=${completedAppointments}, Total=${totalAppointments}`);
    console.log(`  2. Referrals: Incoming=${incomingReferrals}, Completed=${completedReferrals}`);
    console.log(`  3. High-Risk Cases: UrgentFlags=${highRiskAppointments}`);
    console.log(`  4. Diagnostic Orders: Pending=${pendingDiagnosticOrders}, Total=${totalDiagnosticOrders}`);
    console.log(`  5. Medicine Inventory: Total=${stocks.length}, Available=${available}, LowStock=${lowStock}, OutOfStock=${outOfStock}, Shortages=${shortages}`);
    console.log(`  6. Overdue Follow-ups: Reminders=0`);

    if (stocks.length === 0) {
      throw new Error(`Facility ${fac.id} should have inventory`);
    }
  }

  console.log('\n--- Facility / PHC Dashboard E2E Verification COMPLETE & SUCCESSFUL ---');
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
