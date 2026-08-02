import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const seededDoctors = [
  {
    id: 'd1',
    email: 'dr.sarah.jenkins@sehatsetu.com',
    name: 'Dr. Sarah Jenkins',
    specialty: 'Cardiologist',
    consultationFee: 1000,
  },
  {
    id: 'doc-6',
    email: 'sunita.deshmukh@sehatsetu.com',
    name: 'Dr. Sunita Deshmukh',
    specialty: 'General Physician',
    consultationFee: 500,
  },
  {
    id: 'doc-11',
    email: 'ananya.sharma@sehatsetu.com',
    name: 'Dr. Ananya Sharma',
    specialty: 'Dermatologist',
    consultationFee: 600,
  },
  {
    id: 'doc-1',
    email: 'alok.verma@sehatsetu.com',
    name: 'Dr. Alok Verma',
    specialty: 'Pediatrician',
    consultationFee: 500,
  },
  {
    id: 'doc-2',
    email: 'priya.mehta@sehatsetu.com',
    name: 'Dr. Priya Mehta',
    specialty: 'Gynecologist',
    consultationFee: 600,
  },
  {
    id: 'doc-3',
    email: 'amit.verma@sehatsetu.com',
    name: 'Dr. Amit Verma',
    specialty: 'Neurologist',
    consultationFee: 1200,
  },
  {
    id: 'doc-5',
    email: 'rajesh.gupta@sehatsetu.com',
    name: 'Dr. Rajesh Gupta',
    specialty: 'Orthopedic Doctor',
    consultationFee: 1000,
  },
  {
    id: 'doc-9',
    email: 'meera.nambiar@sehatsetu.com',
    name: 'Dr. Meera Nambiar',
    specialty: 'Ophthalmologist',
    consultationFee: 750,
  },
  {
    id: 'doc-4',
    email: 'vikramaditya.roy@sehatsetu.com',
    name: 'Dr. Vikramaditya Roy',
    specialty: 'Cardiologist',
    consultationFee: 1500,
  },
  {
    id: 'doc-7',
    email: 'kavita.reddy@sehatsetu.com',
    name: 'Dr. Kavita Reddy',
    specialty: 'Dentist',
    consultationFee: 400,
  },
  {
    id: 'doc-8',
    email: 'suresh.menon@sehatsetu.com',
    name: 'Dr. Suresh Menon',
    specialty: 'ENT Specialist',
    consultationFee: 700,
  },
  {
    id: 'doc-10',
    email: 'tarun.bhatia@sehatsetu.com',
    name: 'Dr. Tarun Bhatia',
    specialty: 'Psychiatrist',
    consultationFee: 1000,
  },
  {
    id: 'doc-12',
    email: 'neha.saxena@sehatsetu.com',
    name: 'Dr. Neha Saxena',
    specialty: 'Pulmonologist',
    consultationFee: 900,
  },
  {
    id: 'doc-13',
    email: 'arvind.swamy@sehatsetu.com',
    name: 'Dr. Arvind Swamy',
    specialty: 'Gastroenterologist',
    consultationFee: 1100,
  },
  {
    id: 'doc-14',
    email: 'shilpa.iyer@sehatsetu.com',
    name: 'Dr. Shilpa Iyer',
    specialty: 'Endocrinologist',
    consultationFee: 850,
  },
  {
    id: 'doc-15',
    email: 'rohan.kulkarni@sehatsetu.com',
    name: 'Dr. Rohan Kulkarni',
    specialty: 'Urologist',
    consultationFee: 950,
  },
];

const seededPatients = [
  {
    email: 'patient@example.com',
    fullName: 'Rahul Sharma',
    gender: 'Male',
    allergies: ['Dust', 'Penicillin'],
    chronicConditions: ['Mild Asthma'],
  },
  {
    email: 'ananya.patient@sehatsetu.com',
    fullName: 'Ananya Sharma',
    gender: 'Female',
    allergies: ['Pollen'],
    chronicConditions: ['Migraine'],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const defaultAvailability = {
    slotDurationMinutes: 15,
    status: 'Available',
    slots: [
      { day: 'Monday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
      { day: 'Tuesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
      { day: 'Wednesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
      { day: 'Thursday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
      { day: 'Friday', isWorking: true, workingHours: '09:00 AM - 01:00 PM', breakTime: 'None' },
      { day: 'Saturday', isWorking: false, workingHours: 'Closed', breakTime: '-' },
      { day: 'Sunday', isWorking: false, workingHours: 'Closed', breakTime: '-' }
    ]
  };

  // 1. Seed Doctors
  for (const docData of seededDoctors) {
    const user = await prisma.user.upsert({
      where: { email: docData.email },
      update: { fullName: docData.name },
      create: {
        email: docData.email,
        fullName: docData.name,
        passwordHash,
        role: Role.DOCTOR,
      },
    });

    await prisma.doctor.upsert({
      where: { userId: user.id },
      update: {
        specialty: docData.specialty,
        consultationFee: docData.consultationFee,
        availability: defaultAvailability,
      },
      create: {
        id: docData.id,
        userId: user.id,
        specialty: docData.specialty,
        consultationFee: docData.consultationFee,
        availability: defaultAvailability,
      },
    });
  }

  // 2. Seed Patients
  for (const patientData of seededPatients) {
    const patientUser = await prisma.user.upsert({
      where: { email: patientData.email },
      update: {
        fullName: patientData.fullName,
      },
      create: {
        email: patientData.email,
        fullName: patientData.fullName,
        passwordHash,
        role: Role.PATIENT,
      },
    });

    await prisma.patient.upsert({
      where: { userId: patientUser.id },
      update: {
        gender: patientData.gender,
        allergies: patientData.allergies,
        chronicConditions: patientData.chronicConditions,
      },
      create: {
        userId: patientUser.id,
        gender: patientData.gender,
        allergies: patientData.allergies,
        chronicConditions: patientData.chronicConditions,
      },
    });
  }

  console.log('Database seeded successfully with 15 Doctors and Patient profiles! 🌱');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
