-- Align the original relational appointment table with the booking-flow
-- fields already present in schema.prisma.
ALTER TABLE "Appointment"
  ALTER COLUMN "patientId" DROP NOT NULL,
  ALTER COLUMN "scheduledAt" DROP NOT NULL,
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT,
  ALTER COLUMN "status" SET DEFAULT 'WAITING';

ALTER TABLE "Appointment"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "patientName" TEXT,
  ADD COLUMN "patientAge" TEXT,
  ADD COLUMN "patientGender" TEXT,
  ADD COLUMN "patientHeight" TEXT,
  ADD COLUMN "patientWeight" TEXT,
  ADD COLUMN "patientBloodGroup" TEXT,
  ADD COLUMN "patientPhone" TEXT,
  ADD COLUMN "patientEmail" TEXT,
  ADD COLUMN "healthConcern" TEXT,
  ADD COLUMN "symptoms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "duration" TEXT,
  ADD COLUMN "severity" TEXT,
  ADD COLUMN "consultMode" TEXT,
  ADD COLUMN "urgency" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "date" TEXT,
  ADD COLUMN "timeSlot" TEXT,
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'ROUTINE';
