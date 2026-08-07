import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const doctor = await prisma.doctor.findFirst();
  console.log(doctor ? doctor.id : 'No doctor found');
}
main().catch(console.error).finally(() => prisma.$disconnect());
