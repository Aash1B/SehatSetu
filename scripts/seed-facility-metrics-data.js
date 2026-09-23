const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedMetricsData() {
  console.log('Seeding rich data for health facility metrics...');

  // 1. Get first doctor and patient
  const doctor = await prisma.doctor.findFirst();
  const patient = await prisma.patient.findFirst();

  if (!doctor || !patient) {
    console.warn('Need at least one doctor and one patient');
    return;
  }

  // 2. High-Risk Emergency Appointments
  const existingEmergency = await prisma.appointment.findFirst({
    where: { priority: 'EMERGENCY' },
  });

  if (!existingEmergency) {
    await prisma.appointment.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        patientName: patient.name || 'Pooja Verma',
        patientAge: patient.age || '28',
        patientGender: patient.gender || 'Female',
        patientPhone: patient.phone || '+91 98765 43210',
        priority: 'EMERGENCY',
        urgency: 'emergency',
        status: 'WAITING',
        healthConcern: 'Acute Dyspnea & Hypoxia (SpO2 88%)',
        symptoms: ['Severe breathlessness', 'Chest tightness', 'Rapid pulse'],
        severity: 'CRITICAL',
        date: new Date().toISOString().split('T')[0],
        timeSlot: '11:00 AM',
      },
    });

    await prisma.appointment.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        patientName: 'Rameshwar Yadav',
        patientAge: '56',
        patientGender: 'Male',
        patientPhone: '+91 94150 11223',
        priority: 'HIGH',
        urgency: 'high',
        status: 'SCHEDULED',
        healthConcern: 'Hypertensive Urgency (BP 190/115 mmHg)',
        symptoms: ['Severe occipital headache', 'Dizziness', 'Blurred vision'],
        severity: 'SEVERE',
        date: new Date().toISOString().split('T')[0],
        timeSlot: '02:30 PM',
      },
    });
    console.log('Created 2 high-risk triage appointments.');
  }

  // 3. Incoming Referrals to Rampur PHC and Bilaspur CHC
  const existingRampurRef = await prisma.referral.findFirst({
    where: { recommendedFacility: { contains: 'Rampur' } },
  });

  if (!existingRampurRef) {
    await prisma.referral.create({
      data: {
        patientId: patient.id,
        referredByDoctorId: doctor.id,
        recommendedFacility: 'Rampur Primary Health Centre (PHC)',
        facilityType: 'PHC',
        reason: 'Gestational Diabetes Mellitus & ANC 3rd Trimester Monitoring',
        status: 'PENDING',
        followUpNotes: 'Urgent HbA1c and fetal NST required at PHC lab',
        scheduledDate: new Date(Date.now() + 86400000),
      },
    });

    await prisma.referral.create({
      data: {
        patientId: patient.id,
        referredByDoctorId: doctor.id,
        recommendedFacility: 'Rampur Primary Health Centre (PHC)',
        facilityType: 'PHC',
        reason: 'Post-operative wound dressing & antibiotic review',
        status: 'SCHEDULED',
        followUpNotes: 'Referred from Bilaspur CHC for local PHC daily dressing',
        scheduledDate: new Date(),
      },
    });

    await prisma.referral.create({
      data: {
        patientId: patient.id,
        referredByDoctorId: doctor.id,
        recommendedFacility: 'Bilaspur Community Health Centre (CHC)',
        facilityType: 'CHC',
        reason: 'Pediatric dehydration and IV fluid administration',
        status: 'PENDING',
        followUpNotes: 'Triage grade 2, requires observation',
        scheduledDate: new Date(),
      },
    });
    console.log('Created incoming referrals for health facilities.');
  }

  // 4. Overdue Follow-ups (MCH Reminders)
  const existingReminder = await prisma.mchReminder.findFirst();
  if (!existingReminder) {
    await prisma.mchReminder.create({
      data: {
        patientId: patient.id,
        reminderType: 'ANC_OVERDUE',
        eventDate: new Date(Date.now() - 3 * 86400000), // 3 days overdue
        status: 'PENDING',
      },
    });

    await prisma.mchReminder.create({
      data: {
        patientId: patient.id,
        reminderType: 'VACCINATION_OVERDUE',
        eventDate: new Date(Date.now() - 7 * 86400000), // 7 days overdue
        status: 'FAILED',
      },
    });
    console.log('Created 2 overdue follow-up reminders.');
  }

  console.log('Health facility metrics data seeded successfully!');
}

seedMetricsData()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
