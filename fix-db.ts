import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
// @ts-ignore
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Fixing NULL values in Appointment table...');
  // Since Prisma Client is generated with patientId as required, we can't easily query for NULL using the typed client.
  // We'll use $executeRawUnsafe to update the rows directly.
  
  const dummyPatientId = 'dummy-patient-id';
  const dummyDate = new Date().toISOString();
  
  // Use raw SQL to avoid schema mismatch issues before db push
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "User" (id, email, "fullName", "passwordHash", role, "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (email) DO NOTHING
    `, dummyPatientId, 'dummy.patient@example.com', 'Dummy Patient', 'hash', 'PATIENT');
  } catch(e) {
    // If updatedAt doesn't exist, try without it
    await prisma.$executeRawUnsafe(`
      INSERT INTO "User" (id, email, "fullName", "passwordHash", role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, dummyPatientId, 'dummy.patient@example.com', 'Dummy Patient', 'hash', 'PATIENT');
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO "Patient" (id, "userId")
    VALUES ($1, $1)
    ON CONFLICT (id) DO NOTHING
  `, dummyPatientId);

  const updatedPatientId = await prisma.$executeRawUnsafe(`
    UPDATE "Appointment"
    SET "patientId" = $1
    WHERE "patientId" IS NULL
  `, dummyPatientId);
  console.log(`Updated ${updatedPatientId} rows with missing patientId`);
  
  const updatedScheduledAt = await prisma.$executeRawUnsafe(`
    UPDATE "Appointment"
    SET "scheduledAt" = $1::timestamp
    WHERE "scheduledAt" IS NULL
  `, dummyDate);
  console.log(`Updated ${updatedScheduledAt} rows with missing scheduledAt`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
