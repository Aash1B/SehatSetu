// Migration script for ASHA worker and patient/appointment extensions
const { Client } = require('pg');
require('dotenv').config();

const migrationSQL = `
-- 1. Add ASHA to Role enum if not present
DO $$
BEGIN
  ALTER TYPE "Role" ADD VALUE 'ASHA';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create AshaWorker table
CREATE TABLE IF NOT EXISTS "AshaWorker" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workerCode" TEXT,
  "assignedArea" TEXT,
  "village" TEXT,
  "subCenterId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AshaWorker_pkey" PRIMARY KEY ("id")
);

-- Unique indexes on AshaWorker
CREATE UNIQUE INDEX IF NOT EXISTS "AshaWorker_userId_key" ON "AshaWorker"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "AshaWorker_workerCode_key" ON "AshaWorker"("workerCode");

-- Foreign key for AshaWorker -> User
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AshaWorker_userId_fkey') THEN
    ALTER TABLE "AshaWorker" ADD CONSTRAINT "AshaWorker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. Update Patient table
ALTER TABLE "Patient" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "village" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "assignedArea" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "assignedAshaWorkerId" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "registeredByAshaId" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "isAshaRegistered" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Patient_assignedAshaWorkerId_fkey') THEN
    ALTER TABLE "Patient" ADD CONSTRAINT "Patient_assignedAshaWorkerId_fkey" FOREIGN KEY ("assignedAshaWorkerId") REFERENCES "AshaWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Patient_registeredByAshaId_fkey') THEN
    ALTER TABLE "Patient" ADD CONSTRAINT "Patient_registeredByAshaId_fkey" FOREIGN KEY ("registeredByAshaId") REFERENCES "AshaWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Update Appointment table
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "bookedByAshaId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "verifiedByAsha" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "verifiedByAshaAt" TIMESTAMP(3);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_bookedByAshaId_fkey') THEN
    ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_bookedByAshaId_fkey" FOREIGN KEY ("bookedByAshaId") REFERENCES "AshaWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
`;

async function runMigration() {
  console.log('Connecting to database...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    console.log('Running ASHA migration...');
    await client.query(migrationSQL);
    console.log('ASHA migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
