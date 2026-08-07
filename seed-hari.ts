import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const doctorId = 'd2'; // Different ID for Hari

  let doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
  });

  if (!doctor) {
    let user = await prisma.user.findUnique({ where: { email: 'dr.hari@sehatsetu.com' } });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'dr.hari@sehatsetu.com',
          fullName: 'Dr. Hari',
          passwordHash: 'dummyhash',
          role: 'DOCTOR',
          phone: '+91 98765 00000'
        }
      });
    }

    doctor = await prisma.doctor.create({
      data: {
        id: doctorId,
        userId: user.id,
        specialty: 'General Physician',
        qualification: 'MBBS',
        yearsOfExperience: 5,
        medicalLicenseNumber: 'MED-1000-2000',
        languagesSpoken: ['English', 'Hindi'],
        aboutMe: 'Dedicated General Physician with 5 years of experience.',
        clinicName: 'Health First Clinic',
        address: '456 Wellness Road, Delhi, DL 110001',
      }
    });
    console.log('Created dummy doctor Dr. Hari successfully');
  } else {
    console.log('Dummy doctor Dr. Hari already exists');
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
