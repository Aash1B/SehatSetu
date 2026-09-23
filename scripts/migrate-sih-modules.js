// Migration script for SIH26133 Modules:
// 1. Referral Tracking
// 2. Diagnostic Coordination
// 3. Medicine Availability (Facility & MedicineStock)
// 4. Role FACILITY_ADMIN
const { Client } = require('pg');
require('dotenv').config();

const migrationSQL = `
-- 1. Add FACILITY_ADMIN to Role enum if not present
DO $$
BEGIN
  ALTER TYPE "Role" ADD VALUE 'FACILITY_ADMIN';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Referral table
CREATE TABLE IF NOT EXISTS "Referral" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "referredByDoctorId" TEXT,
  "appointmentId" TEXT,
  "recommendedFacility" TEXT NOT NULL,
  "facilityType" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "scheduledDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "followUpNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Referral_patientId_status_idx" ON "Referral"("patientId", "status");
CREATE INDEX IF NOT EXISTS "Referral_status_idx" ON "Referral"("status");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_patientId_fkey') THEN
    ALTER TABLE "Referral" ADD CONSTRAINT "Referral_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_referredByDoctorId_fkey') THEN
    ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredByDoctorId_fkey" FOREIGN KEY ("referredByDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_appointmentId_fkey') THEN
    ALTER TABLE "Referral" ADD CONSTRAINT "Referral_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. Create DiagnosticOrder table
CREATE TABLE IF NOT EXISTS "DiagnosticOrder" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "orderedByDoctorId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "testName" TEXT NOT NULL,
  "testType" TEXT NOT NULL,
  "instructions" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ORDERED',
  "reportFileUrl" TEXT,
  "resultSummary" TEXT,
  "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resultAt" TIMESTAMP(3),

  CONSTRAINT "DiagnosticOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DiagnosticOrder_patientId_status_idx" ON "DiagnosticOrder"("patientId", "status");
CREATE INDEX IF NOT EXISTS "DiagnosticOrder_status_idx" ON "DiagnosticOrder"("status");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DiagnosticOrder_patientId_fkey') THEN
    ALTER TABLE "DiagnosticOrder" ADD CONSTRAINT "DiagnosticOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DiagnosticOrder_orderedByDoctorId_fkey') THEN
    ALTER TABLE "DiagnosticOrder" ADD CONSTRAINT "DiagnosticOrder_orderedByDoctorId_fkey" FOREIGN KEY ("orderedByDoctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DiagnosticOrder_appointmentId_fkey') THEN
    ALTER TABLE "DiagnosticOrder" ADD CONSTRAINT "DiagnosticOrder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Create Facility and MedicineStock tables
CREATE TABLE IF NOT EXISTS "Facility" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "village" TEXT,
  "district" TEXT,

  CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MedicineStock" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "medicineName" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "quantity" INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MedicineStock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MedicineStock_facilityId_idx" ON "MedicineStock"("facilityId");
CREATE INDEX IF NOT EXISTS "MedicineStock_medicineName_idx" ON "MedicineStock"("medicineName");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicineStock_facilityId_fkey') THEN
    ALTER TABLE "MedicineStock" ADD CONSTRAINT "MedicineStock_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
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
    console.log('Connected to database.');

    console.log('Applying SIH26133 modules migration...');
    await client.query(migrationSQL);
    console.log('SIH26133 migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
