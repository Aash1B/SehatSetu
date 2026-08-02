import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const doctorId = 'd1';

  let doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
  });

  if (!doctor) {
    let user = await prisma.user.findUnique({ where: { email: 'dr.sarah.jenkins@sehatsetu.com' } });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'dr.sarah.jenkins@sehatsetu.com',
          fullName: 'Dr. Sarah Jenkins',
          passwordHash: 'dummyhash',
          role: 'DOCTOR',
          phone: '+91 98765 43210'
        }
      });
    }

    doctor = await prisma.doctor.create({
      data: {
        id: doctorId,
        userId: user.id,
        specialty: 'Cardiologist',
        qualification: 'MBBS, MD (Cardiology)',
        yearsOfExperience: 12,
        medicalLicenseNumber: 'MED-1928-8374',
        languagesSpoken: ['English', 'Hindi', 'Marathi'],
        aboutMe: 'Dedicated and compassionate Cardiologist with 12 years of experience.',
        clinicName: 'HeartCare Clinic',
        address: '123 Health Ave, Wellness District, Mumbai, MH 400001',
      }
    });
    console.log('Created dummy doctor d1 successfully');
  } else {
    console.log('Dummy doctor d1 already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
