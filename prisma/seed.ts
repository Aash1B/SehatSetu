import 'dotenv/config';
import { PrismaClient, Role, Gender } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const CANONICAL_DOCTORS = [
  {
    id: 'doc-1',
    email: 'alok.verma@sehatsetu.com',
    name: 'Dr. Alok Verma',
    specialty: 'Pediatrician',
    consultationFee: 500,
    gender: Gender.MALE,
    experience: '12 Years Exp.',
    degrees: 'MBBS, MD (Pediatrics)',
    hospital: 'Fortis Healthcare, New Delhi',
    location: 'New Delhi',
    imageUrl: '/doctors/doctor-04.webp',
    imageStoragePath: 'doctors/doctor-04.webp',
    tags: ['Child Care', 'Vaccination', 'Pediatrics'],
  },
  {
    id: 'doc-2',
    email: 'priya.mehta@sehatsetu.com',
    name: 'Dr. Priya Mehta',
    specialty: 'Gynecologist',
    consultationFee: 600,
    gender: Gender.FEMALE,
    experience: '10 Years Exp.',
    degrees: 'MBBS, MS (Obstetrics & Gynecology)',
    hospital: 'Apollo Hospitals, Mumbai',
    location: 'Mumbai',
    imageUrl: '/doctors/doctor-05.webp',
    imageStoragePath: 'doctors/doctor-05.webp',
    tags: ['Women Health', 'Pregnancy', 'PCOS'],
  },
  {
    id: 'doc-3',
    email: 'amit.verma@sehatsetu.com',
    name: 'Dr. Amit Verma',
    specialty: 'Neurologist',
    consultationFee: 1200,
    gender: Gender.MALE,
    experience: '15 Years Exp.',
    degrees: 'MBBS, DM (Neurology)',
    hospital: 'Max Super Specialty Hospital, Bangalore',
    location: 'Bangalore',
    imageUrl: '/doctors/doctor-06.webp',
    imageStoragePath: 'doctors/doctor-06.webp',
    tags: ['Stroke', 'Migraine', 'Epilepsy'],
  },
  {
    id: 'doc-4',
    email: 'vikramaditya.roy@sehatsetu.com',
    name: 'Dr. Vikramaditya Roy',
    specialty: 'Cardiologist',
    consultationFee: 1500,
    gender: Gender.MALE,
    experience: '18 Years Exp.',
    degrees: 'MBBS, MD, DM (Cardiology)',
    hospital: 'Medanta - The Medicity, Gurugram',
    location: 'Gurugram',
    imageUrl: '/doctors/doctor-09.webp',
    imageStoragePath: 'doctors/doctor-09.webp',
    tags: ['Heart Disease', 'Angioplasty', 'Hypertension'],
  },
  {
    id: 'doc-5',
    email: 'rajesh.gupta@sehatsetu.com',
    name: 'Dr. Rajesh Gupta',
    specialty: 'Orthopedic Doctor',
    consultationFee: 1000,
    gender: Gender.MALE,
    experience: '14 Years Exp.',
    degrees: 'MBBS, MS (Orthopedics)',
    hospital: 'Manipal Hospital, Hyderabad',
    location: 'Hyderabad',
    imageUrl: '/doctors/doctor-07.webp',
    imageStoragePath: 'doctors/doctor-07.webp',
    tags: ['Joint Replacement', 'Fractures', 'Sports Injury'],
  },
  {
    id: 'doc-6',
    email: 'sunita.deshmukh@sehatsetu.com',
    name: 'Dr. Sunita Deshmukh',
    specialty: 'General Physician',
    consultationFee: 500,
    gender: Gender.FEMALE,
    experience: '11 Years Exp.',
    degrees: 'MBBS, MD (General Medicine)',
    hospital: 'Lilavati Hospital, Mumbai',
    location: 'Mumbai',
    imageUrl: '/doctors/doctor-02.webp',
    imageStoragePath: 'doctors/doctor-02.webp',
    tags: ['Fever', 'Diabetes Management', 'General Care'],
  },
  {
    id: 'doc-7',
    email: 'kavita.reddy@sehatsetu.com',
    name: 'Dr. Kavita Reddy',
    specialty: 'Dentist',
    consultationFee: 400,
    gender: Gender.FEMALE,
    experience: '8 Years Exp.',
    degrees: 'BDS, MDS (Endodontics)',
    hospital: 'Clove Dental, Chennai',
    location: 'Chennai',
    imageUrl: '/doctors/doctor-10.webp',
    imageStoragePath: 'doctors/doctor-10.webp',
    tags: ['Root Canal', 'Teeth Whitening', 'Dental Care'],
  },
  {
    id: 'doc-8',
    email: 'suresh.menon@sehatsetu.com',
    name: 'Dr. Suresh Menon',
    specialty: 'ENT Specialist',
    consultationFee: 700,
    gender: Gender.MALE,
    experience: '13 Years Exp.',
    degrees: 'MBBS, MS (ENT)',
    hospital: 'Aster Medcity, Kochi',
    location: 'Kochi',
    imageUrl: '/doctors/doctor-11.webp',
    imageStoragePath: 'doctors/doctor-11.webp',
    tags: ['Sinusitis', 'Hearing Loss', 'Throat Infection'],
  },
  {
    id: 'doc-9',
    email: 'meera.nambiar@sehatsetu.com',
    name: 'Dr. Meera Nambiar',
    specialty: 'Ophthalmologist',
    consultationFee: 750,
    gender: Gender.FEMALE,
    experience: '9 Years Exp.',
    degrees: 'MBBS, MS (Ophthalmology)',
    hospital: 'Sankara Nethralaya, Chennai',
    location: 'Chennai',
    imageUrl: '/doctors/doctor-08.webp',
    imageStoragePath: 'doctors/doctor-08.webp',
    tags: ['Cataract Surgery', 'LASIK', 'Eye Checkup'],
  },
  {
    id: 'doc-10',
    email: 'tarun.bhatia@sehatsetu.com',
    name: 'Dr. Tarun Bhatia',
    specialty: 'Psychiatrist',
    consultationFee: 1000,
    gender: Gender.MALE,
    experience: '10 Years Exp.',
    degrees: 'MBBS, MD (Psychiatry)',
    hospital: 'VIMHANS, New Delhi',
    location: 'New Delhi',
    imageUrl: '/doctors/doctor-12.webp',
    imageStoragePath: 'doctors/doctor-12.webp',
    tags: ['Anxiety', 'Depression', 'Mental Wellness'],
  },
  {
    id: 'doc-11',
    email: 'ananya.sharma@sehatsetu.com',
    name: 'Dr. Ananya Sharma',
    specialty: 'Dermatologist',
    consultationFee: 600,
    gender: Gender.FEMALE,
    experience: '7 Years Exp.',
    degrees: 'MBBS, MD (Dermatology)',
    hospital: 'Kaya Skin Clinic, Pune',
    location: 'Pune',
    imageUrl: '/doctors/doctor-03.webp',
    imageStoragePath: 'doctors/doctor-03.webp',
    tags: ['Acne Treatment', 'Skin Care', 'Hair Loss'],
  },
  {
    id: 'doc-12',
    email: 'neha.saxena@sehatsetu.com',
    name: 'Dr. Neha Saxena',
    specialty: 'Pulmonologist',
    consultationFee: 900,
    gender: Gender.FEMALE,
    experience: '11 Years Exp.',
    degrees: 'MBBS, DTCD, DNB (Pulmonary Medicine)',
    hospital: 'Sir Ganga Ram Hospital, New Delhi',
    location: 'New Delhi',
    imageUrl: '/doctors/doctor-13.webp',
    imageStoragePath: 'doctors/doctor-13.webp',
    tags: ['Asthma', 'COPD', 'Lung Infection'],
  },
  {
    id: 'doc-13',
    email: 'arvind.swamy@sehatsetu.com',
    name: 'Dr. Arvind Swamy',
    specialty: 'Gastroenterologist',
    consultationFee: 1100,
    gender: Gender.MALE,
    experience: '16 Years Exp.',
    degrees: 'MBBS, MD, DM (Gastroenterology)',
    hospital: 'Global Hospitals, Chennai',
    location: 'Chennai',
    imageUrl: '/doctors/doctor-14.webp',
    imageStoragePath: 'doctors/doctor-14.webp',
    tags: ['Liver Disease', 'Endoscopy', 'Acidity'],
  },
  {
    id: 'doc-14',
    email: 'shilpa.iyer@sehatsetu.com',
    name: 'Dr. Shilpa Iyer',
    specialty: 'Endocrinologist',
    consultationFee: 850,
    gender: Gender.FEMALE,
    experience: '12 Years Exp.',
    degrees: 'MBBS, MD, DM (Endocrinology)',
    hospital: 'Kokilaben Dhirubhai Ambani Hospital, Mumbai',
    location: 'Mumbai',
    imageUrl: '/doctors/doctor-15.webp',
    imageStoragePath: 'doctors/doctor-15.webp',
    tags: ['Thyroid Care', 'Diabetes Specialist', 'Hormone Disorders'],
  },
  {
    id: 'doc-15',
    email: 'rohan.kulkarni@sehatsetu.com',
    name: 'Dr. Rohan Kulkarni',
    specialty: 'Urologist',
    consultationFee: 950,
    gender: Gender.MALE,
    experience: '13 Years Exp.',
    degrees: 'MBBS, MS, MCh (Urology)',
    hospital: 'Ruby Hall Clinic, Pune',
    location: 'Pune',
    imageUrl: '/doctors/doctor-16.webp',
    imageStoragePath: 'doctors/doctor-16.webp',
    tags: ['Kidney Stones', 'Prostate Care', 'Urology'],
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

export async function main() {
  console.log('Starting Canonical Doctor Cleanup & Seeding... 🏥');
  const passwordHash = await bcrypt.hash('password123', 10);

  const canonicalIds = CANONICAL_DOCTORS.map((d) => d.id);
  const canonicalEmails = CANONICAL_DOCTORS.map((d) => d.email);

  // 1. Audit and Cleanup non-canonical doctors / dummy profiles
  const nonCanonicalDoctors = await prisma.doctor.findMany({
    where: {
      id: { notIn: canonicalIds },
    },
    include: {
      appointments: true,
      prescriptions: true,
      user: true,
    },
  });

  for (const dummyDoc of nonCanonicalDoctors) {
    console.log(`Cleaning non-canonical doctor profile: [${dummyDoc.id}] ${dummyDoc.name}`);
    const appts = await prisma.appointment.findMany({ where: { doctorId: dummyDoc.id }, select: { id: true } });
    const apptIds = appts.map((a) => a.id);
    if (apptIds.length > 0) {
      await prisma.payment.deleteMany({ where: { appointmentId: { in: apptIds } } });
      await prisma.ehrRecord.deleteMany({ where: { appointmentId: { in: apptIds } } });
      await prisma.medicalReport.deleteMany({ where: { appointmentId: { in: apptIds } } });
      await prisma.prescription.deleteMany({ where: { appointmentId: { in: apptIds } } });
      await prisma.appointment.deleteMany({ where: { id: { in: apptIds } } });
    }
    await prisma.prescription.deleteMany({ where: { doctorId: dummyDoc.id } });
    await prisma.doctor.delete({ where: { id: dummyDoc.id } });
    if (dummyDoc.userId && dummyDoc.user && !canonicalEmails.includes(dummyDoc.user.email)) {
      await prisma.user.delete({ where: { id: dummyDoc.userId } }).catch(() => undefined);
    }
  }

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
      { day: 'Sunday', isWorking: false, workingHours: 'Closed', breakTime: '-' },
    ],
  };

  // 2. Seed Canonical Doctors Idempotently
  for (const docData of CANONICAL_DOCTORS) {
    const user = await prisma.user.upsert({
      where: { email: docData.email },
      update: {
        fullName: docData.name,
        role: Role.DOCTOR,
      },
      create: {
        email: docData.email,
        fullName: docData.name,
        passwordHash,
        role: Role.DOCTOR,
      },
    });

    await prisma.doctor.upsert({
      where: { id: docData.id },
      update: {
        userId: user.id,
        name: docData.name,
        gender: docData.gender,
        specialty: docData.specialty,
        consultationFee: docData.consultationFee,
        fee: `₹${docData.consultationFee}`,
        degrees: docData.degrees,
        experience: docData.experience,
        hospital: docData.hospital,
        location: docData.location,
        imageUrl: docData.imageUrl,
        imageStoragePath: docData.imageStoragePath,
        imagePosition: (docData as any).imagePosition || '50% 20%',
        tags: docData.tags,
        availability: defaultAvailability,
        profileCompleted: true,
        isVerified: true,
        isActive: true,
        availableToday: true,
      },
      create: {
        id: docData.id,
        userId: user.id,
        name: docData.name,
        gender: docData.gender,
        specialty: docData.specialty,
        consultationFee: docData.consultationFee,
        fee: `₹${docData.consultationFee}`,
        degrees: docData.degrees,
        experience: docData.experience,
        hospital: docData.hospital,
        location: docData.location,
        imageUrl: docData.imageUrl,
        imageStoragePath: docData.imageStoragePath,
        imagePosition: (docData as any).imagePosition || '50% 20%',
        tags: docData.tags,
        availability: defaultAvailability,
        profileCompleted: true,
        isVerified: true,
        isActive: true,
        availableToday: true,
      },
    });
  }

  // 3. Seed Patients Idempotently
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

  const doctorCount = await prisma.doctor.count();
  console.log(`Database seeding completed! Total Doctor profiles: ${doctorCount} 🌱`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

