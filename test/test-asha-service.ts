import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { AshaService } from '../src/asha/asha.service';
import { EmergencyHandlingService } from '../src/chatbot/services/emergency-handling.service';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runTests() {
  console.log('Testing ASHA Service Integration...');

  const emergencyService = new EmergencyHandlingService();
  const ashaService = new AshaService(prisma as any, emergencyService);

  // 1. Find the seeded ASHA worker user
  const ashaUser = await prisma.user.findUnique({
    where: { email: 'sunita.asha@sehatsetu.com' },
    include: { ashaWorker: true },
  });

  if (!ashaUser || !ashaUser.ashaWorker) {
    throw new Error('Seed ASHA worker not found');
  }

  console.log(`Found ASHA worker: ${ashaUser.fullName} (${ashaUser.ashaWorker.workerCode})`);

  // 2. Test getDashboard
  const dashboard = await ashaService.getDashboard(ashaUser.id);
  console.log('Dashboard Counts:', dashboard.counts);
  if (dashboard.counts.assignedPatients < 2) {
    throw new Error('Expected at least 2 assigned patients in seed data');
  }

  // 3. Test getPatients with search
  const patients = await ashaService.getPatients(ashaUser.id, 'Rahul');
  console.log(`Patients search for 'Rahul': found ${patients.length}`);
  if (patients.length === 0 || !patients[0].name.includes('Rahul')) {
    throw new Error('Expected to find patient Rahul Sharma');
  }

  // 4. Test quickRegisterPatient
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const regResult = await ashaService.quickRegisterPatient(ashaUser.id, {
    fullName: 'Meena Devi',
    gender: 'Female',
    phone: testPhone,
    village: 'Chhawla',
    age: '32',
    allergies: ['Dust'],
  });

  console.log('Quick Register Result:', regResult);
  if (!regResult.patient || regResult.patient.name !== 'Meena Devi') {
    throw new Error('Quick registration failed');
  }

  // 5. Test bookAppointment
  const doctor = await prisma.doctor.findFirst();
  if (!doctor) throw new Error('No doctor found');

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const bookingResult = await ashaService.bookAppointment(ashaUser.id, {
    patientId: regResult.patient.id,
    doctorId: doctor.id,
    date: tomorrowStr,
    timeSlot: '11:00 AM',
    healthConcern: 'Fever and chills for 3 days',
    symptoms: ['Fever', 'Chills'],
    severity: 'Moderate',
    paymentStatus: 'CASH_PENDING',
  });

  console.log('Booking Result:', bookingResult);
  if (!bookingResult.appointment || bookingResult.appointment.paymentStatus !== 'CASH_PENDING') {
    throw new Error('Booking failed');
  }

  // 6. Test emergencies detection
  const emergencies = await ashaService.getEmergencies(ashaUser.id);
  console.log(`Found ${emergencies.length} emergencies in caseload`);

  console.log('ALL ASHA SERVICE INTEGRATION TESTS PASSED! ✅');
}

runTests()
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
