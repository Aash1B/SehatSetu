import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

import { DoctorService } from './src/doctor/doctor.service';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

import { doctorsData } from './frontend/src/patient/data/doctorsData';

async function main() {
  const seededDoctors = await prisma.doctor.findMany({
    where: {
      id: {
        in: Array.from({ length: 15 }, (_, i) => `doc-${i + 1}`),
      },
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  // Sort logically (doc-1, doc-2, ..., doc-15)
  const sortedDoctors = [...seededDoctors].sort((a, b) => {
    const numA = parseInt(a.id.replace('doc-', ''), 10);
    const numB = parseInt(b.id.replace('doc-', ''), 10);
    return numA - numB;
  });

  console.log('doctor ID | doctor name          | Prisma imageUrl | backend response imageUrl | frontend object imageUrl | final rendered <img src>');
  console.log('---------------------------------------------------------------------------------------------------------------------------------------');

  sortedDoctors.forEach((doctor) => {
    // 1. Prisma imageUrl
    const prismaUrl = doctor.imageUrl || '';
    
    // 2. Backend response imageUrl (matching DoctorsService.findAll() mapping)
    const backendUrl = doctor.imageUrl || '';

    // 3. Frontend object imageUrl (from doctorsData.ts fallback list)
    const matchedFrontend = doctorsData.find((d) => d.id === doctor.id);
    const frontendUrl = matchedFrontend ? matchedFrontend.imageUrl : '';

    // 4. Rendered image source (which is populated dynamically by react matching the object imageUrl)
    const renderedSrc = frontendUrl;

    const paddedId = doctor.id.padEnd(9);
    const paddedName = (doctor.name || '').padEnd(20);

    console.log(`${paddedId} | ${paddedName} | ${prismaUrl} | ${backendUrl} | ${frontendUrl} | ${renderedSrc}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
