const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runTest() {
  console.log('--- Starting Diagnostic Coordination End-to-End Test ---');

  // 1. Find a test patient and doctor
  const patient = await prisma.patient.findFirst({
    include: { user: true },
  });
  if (!patient) {
    throw new Error('No patient found in database for testing');
  }

  const doctor = await prisma.doctor.findFirst({
    include: { user: true },
  });
  if (!doctor) {
    throw new Error('No doctor found in database for testing');
  }

  console.log(`Using Patient: ${patient.fullName || patient.user?.fullName} (${patient.id})`);
  console.log(`Using Doctor: ${doctor.name || doctor.user?.fullName} (${doctor.id})`);

  // 2. Create Diagnostic Order
  const order = await prisma.diagnosticOrder.create({
    data: {
      patientId: patient.id,
      orderedByDoctorId: doctor.id,
      testName: 'Complete Blood Count (CBC) with Platelets',
      testType: 'BLOOD',
      instructions: '12-hour fasting required. Test for hemoglobin and platelet count.',
      status: 'ORDERED',
    },
  });
  console.log(`[PASS] Diagnostic order created: ${order.id}, Status: ${order.status}`);

  // 3. Simulate Report Upload
  const updatedOrder = await prisma.diagnosticOrder.update({
    where: { id: order.id },
    data: {
      status: 'REPORT_UPLOADED',
      reportFileUrl: '/uploads/medical-reports/sample-cbc-report.pdf',
      resultAt: new Date(),
    },
  });
  console.log(`[PASS] Report uploaded: Status is now ${updatedOrder.status}, File: ${updatedOrder.reportFileUrl}`);

  // 4. Doctor Review & Sync to EhrRecord
  const clinicalFinding = 'Hemoglobin 13.8 g/dL (normal). Platelet count 240,000/mcL (normal). No signs of acute infection or anemia.';
  const reviewedOrder = await prisma.diagnosticOrder.update({
    where: { id: order.id },
    data: {
      status: 'REVIEWED',
      resultSummary: clinicalFinding,
    },
  });
  console.log(`[PASS] Doctor reviewed order: Status is now ${reviewedOrder.status}, Summary: ${reviewedOrder.resultSummary}`);

  // Sync findings into EhrRecord
  const ehrRecord = await prisma.ehrRecord.create({
    data: {
      patientId: patient.id,
      verifiedByDoctorId: doctor.id,
      notes: `[Diagnostic Review: ${order.testName} (${order.testType})] Result: ${clinicalFinding}`,
      diagnosis: `Post-Diagnostic: ${order.testName}`,
      status: 'VERIFIED',
      verifiedAt: new Date(),
    },
  });
  console.log(`[PASS] EhrRecord created & synced with diagnostic finding: ${ehrRecord.id}`);

  // 5. Query Patient Diagnostic Orders
  const patientOrders = await prisma.diagnosticOrder.findMany({
    where: { patientId: patient.id },
    orderBy: { orderedAt: 'desc' },
  });
  console.log(`[PASS] Retrieved ${patientOrders.length} diagnostic orders for patient.`);

  console.log('--- Diagnostic Coordination E2E Verification COMPLETE & SUCCESSFUL ---');
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
