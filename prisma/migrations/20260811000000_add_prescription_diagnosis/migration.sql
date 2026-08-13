-- Store the doctor-confirmed diagnosis on the patient-safe prescription record.
-- This keeps draft EHR records private while allowing patients to see the diagnosis
-- that belongs to a prescription issued directly to them.
ALTER TABLE "public"."Prescription"
  ADD COLUMN "diagnosis" TEXT;

-- Backfill prescriptions that already have a consultation EHR diagnosis.
UPDATE "public"."Prescription" AS prescription
SET "diagnosis" = ehr."diagnosis"
FROM "public"."EhrRecord" AS ehr
WHERE ehr."appointmentId" = prescription."appointmentId"
  AND ehr."diagnosis" IS NOT NULL
  AND prescription."diagnosis" IS NULL;
