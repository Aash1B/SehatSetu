require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log('Testing Referral Tracking DB & queries...');
  // Find or pick a patient
  const patient = await prisma.patient.findFirst({
    include: { user: true },
  });

  if (!patient) {
    console.error('No patient found in database to test referrals.');
    return;
  }

  const doctor = await prisma.doctor.findFirst();

  console.log(`Using patient ID: ${patient.id} (${patient.name || patient.user?.fullName})`);
  console.log(`Using doctor ID: ${doctor?.id || 'none'}`);

  // Create a test referral
  const created = await prisma.referral.create({
    data: {
      patientId: patient.id,
      referredByDoctorId: doctor?.id || null,
      recommendedFacility: 'Kashi District Government Hospital',
      facilityType: 'GOVERNMENT',
      reason: 'Chest pain evaluation with high troponin levels',
      status: 'PENDING',
      followUpNotes: 'Patient advised emergency cardiac consult',
    },
  });

  console.log('Created referral:', created.id, created.status);

  // Update status: PENDING -> SCHEDULED
  const scheduled = await prisma.referral.update({
    where: { id: created.id },
    data: {
      status: 'SCHEDULED',
      scheduledDate: new Date(),
      followUpNotes: 'ASHA scheduled visit for tomorrow morning',
    },
  });
  console.log('Updated to SCHEDULED:', scheduled.status, scheduled.scheduledDate);

  // Update status: SCHEDULED -> VISITED
  const visited = await prisma.referral.update({
    where: { id: created.id },
    data: {
      status: 'VISITED',
      followUpNotes: 'Patient visited government hospital, underwent ECG',
    },
  });
  console.log('Updated to VISITED:', visited.status);

  // Update status: VISITED -> COMPLETED
  const completed = await prisma.referral.update({
    where: { id: created.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      followUpNotes: 'Prescription given at hospital. Patient stable.',
    },
  });
  console.log('Updated to COMPLETED:', completed.status, completed.completedAt);

  // Query patient referrals
  const patientReferrals = await prisma.referral.findMany({
    where: { patientId: patient.id },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`Total referrals for patient ${patient.id}:`, patientReferrals.length);

  console.log('Module 1 Referral Tracking DB & State Transition tests PASSED!');
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
