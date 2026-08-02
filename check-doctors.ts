import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const doctors = await prisma.doctor.findMany({
    include: { user: true }
  });
  console.log('--- DOCTORS IN DATABASE ---');
  doctors.forEach(d => {
    console.log(`ID: ${d.id} | Name: ${d.user?.fullName} | Email: ${d.user?.email}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
