-- MCH Tracking: Add MCH models
-- Migration: 20260809000000_add_mch_tracking
-- Created manually to avoid drift conflict with existing live database.
-- Apply with: npx prisma migrate deploy  (production)
-- Or in dev with drift: npx prisma db push  (schema sync without migration history)

-- ─── Enums ─────────────────────────────────────────────────────────────────

CREATE TYPE "public"."PregnancyStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'LOST', 'TERMINATED');
CREATE TYPE "public"."InvestigationStatus" AS ENUM ('ORDERED', 'SAMPLE_COLLECTED', 'RESULT_AVAILABLE', 'VERIFIED');
CREATE TYPE "public"."ChildSex" AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE "public"."VaccinationStatus" AS ENUM ('UPCOMING', 'DUE', 'COMPLETED', 'MISSED');
CREATE TYPE "public"."MilestoneCategory" AS ENUM ('GROSS_MOTOR', 'FINE_MOTOR', 'LANGUAGE', 'SOCIAL_EMOTIONAL', 'COGNITIVE');
CREATE TYPE "public"."MilestoneStatus" AS ENUM ('PENDING', 'ACHIEVED', 'NEEDS_REVIEW');
CREATE TYPE "public"."FlagSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "public"."FlagStatus" AS ENUM ('OPEN', 'REVIEWED', 'RESOLVED');
CREATE TYPE "public"."MchReminderType" AS ENUM ('VACCINATION_7D', 'VACCINATION_3D', 'VACCINATION_DUE', 'VACCINATION_OVERDUE', 'ANC_7D', 'ANC_3D', 'ANC_DUE', 'ANC_OVERDUE');
CREATE TYPE "public"."ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- ─── Pregnancy ──────────────────────────────────────────────────────────────

CREATE TABLE "public"."Pregnancy" (
    "id"                         TEXT NOT NULL,
    "patientId"                  TEXT NOT NULL,
    "status"                     "public"."PregnancyStatus" NOT NULL DEFAULT 'ACTIVE',
    "lmpDate"                    TIMESTAMP(3),
    "eddLmp"                     TIMESTAMP(3),
    "eddUltrasound"              TIMESTAMP(3),
    "gestationalWeeksAtBooking"  INTEGER,
    "gravida"                    INTEGER,
    "para"                       INTEGER,
    "abortions"                  INTEGER,
    "bloodGroup"                 TEXT,
    "rhFactor"                   TEXT,
    "highRiskFactors"            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "notes"                      TEXT,
    "deliveryDate"               TIMESTAMP(3),
    "deliveryType"               TEXT,
    "deliveryOutcome"            TEXT,
    "createdAt"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pregnancy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Pregnancy_patientId_status_idx" ON "public"."Pregnancy"("patientId", "status");
CREATE INDEX "Pregnancy_patientId_createdAt_idx" ON "public"."Pregnancy"("patientId", "createdAt");

ALTER TABLE "public"."Pregnancy"
    ADD CONSTRAINT "Pregnancy_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ANC Visit ──────────────────────────────────────────────────────────────

CREATE TABLE "public"."AncVisit" (
    "id"                   TEXT NOT NULL,
    "pregnancyId"          TEXT NOT NULL,
    "visitDate"            TIMESTAMP(3) NOT NULL,
    "gestationalWeek"      INTEGER,
    "weight"               DOUBLE PRECISION,
    "systolicBp"           INTEGER,
    "diastolicBp"          INTEGER,
    "pulseRate"            INTEGER,
    "hemoglobin"           DOUBLE PRECISION,
    "fetalHeartRate"       INTEGER,
    "fundalHeight"         DOUBLE PRECISION,
    "urineProtein"         TEXT,
    "urineGlucose"         TEXT,
    "bloodSugarFasting"    DOUBLE PRECISION,
    "bloodSugarPp"         DOUBLE PRECISION,
    "complaints"           TEXT,
    "clinicalFindings"     TEXT,
    "advice"               TEXT,
    "nextVisitDate"        TIMESTAMP(3),
    "enteredByPatient"     BOOLEAN NOT NULL DEFAULT true,
    "verifiedByDoctorId"   TEXT,
    "verifiedAt"           TIMESTAMP(3),
    "verificationNotes"    TEXT,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AncVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AncVisit_pregnancyId_visitDate_idx" ON "public"."AncVisit"("pregnancyId", "visitDate");

ALTER TABLE "public"."AncVisit"
    ADD CONSTRAINT "AncVisit_pregnancyId_fkey"
    FOREIGN KEY ("pregnancyId") REFERENCES "public"."Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Pregnancy Investigation ────────────────────────────────────────────────

CREATE TABLE "public"."PregnancyInvestigation" (
    "id"                   TEXT NOT NULL,
    "pregnancyId"          TEXT NOT NULL,
    "testName"             TEXT NOT NULL,
    "testDate"             TIMESTAMP(3),
    "result"               TEXT,
    "unit"                 TEXT,
    "referenceRange"       TEXT,
    "notes"                TEXT,
    "reportId"             TEXT,
    "status"               "public"."InvestigationStatus" NOT NULL DEFAULT 'ORDERED',
    "enteredByPatient"     BOOLEAN NOT NULL DEFAULT true,
    "verifiedByDoctorId"   TEXT,
    "verifiedAt"           TIMESTAMP(3),
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PregnancyInvestigation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PregnancyInvestigation_pregnancyId_testDate_idx" ON "public"."PregnancyInvestigation"("pregnancyId", "testDate");

ALTER TABLE "public"."PregnancyInvestigation"
    ADD CONSTRAINT "PregnancyInvestigation_pregnancyId_fkey"
    FOREIGN KEY ("pregnancyId") REFERENCES "public"."Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Child ───────────────────────────────────────────────────────────────────

CREATE TABLE "public"."Child" (
    "id"              TEXT NOT NULL,
    "patientId"       TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "dateOfBirth"     TIMESTAMP(3) NOT NULL,
    "sex"             "public"."ChildSex" NOT NULL,
    "bloodGroup"      TEXT,
    "birthWeight"     DOUBLE PRECISION,
    "birthLength"     DOUBLE PRECISION,
    "birthHeadCirc"   DOUBLE PRECISION,
    "notes"           TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Child_patientId_idx" ON "public"."Child"("patientId");

ALTER TABLE "public"."Child"
    ADD CONSTRAINT "Child_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Vaccination Record ─────────────────────────────────────────────────────

CREATE TABLE "public"."VaccinationRecord" (
    "id"                  TEXT NOT NULL,
    "childId"             TEXT NOT NULL,
    "vaccineName"         TEXT NOT NULL,
    "doseNumber"          INTEGER NOT NULL DEFAULT 1,
    "scheduledDate"       TIMESTAMP(3) NOT NULL,
    "administeredDate"    TIMESTAMP(3),
    "status"              "public"."VaccinationStatus" NOT NULL DEFAULT 'UPCOMING',
    "administeredAt"      TEXT,
    "batchNumber"         TEXT,
    "notes"               TEXT,
    "verifiedByDoctorId"  TEXT,
    "verifiedAt"          TIMESTAMP(3),
    "reminderSentAt"      JSONB,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VaccinationRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VaccinationRecord_childId_scheduledDate_idx" ON "public"."VaccinationRecord"("childId", "scheduledDate");
CREATE INDEX "VaccinationRecord_status_scheduledDate_idx" ON "public"."VaccinationRecord"("status", "scheduledDate");

ALTER TABLE "public"."VaccinationRecord"
    ADD CONSTRAINT "VaccinationRecord_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Growth Measurement ─────────────────────────────────────────────────────

CREATE TABLE "public"."GrowthMeasurement" (
    "id"                  TEXT NOT NULL,
    "childId"             TEXT NOT NULL,
    "measurementDate"     TIMESTAMP(3) NOT NULL,
    "ageMonths"           DOUBLE PRECISION,
    "weightKg"            DOUBLE PRECISION,
    "heightCm"            DOUBLE PRECISION,
    "headCircCm"          DOUBLE PRECISION,
    "temperature"         DOUBLE PRECISION,
    "pulseRate"           INTEGER,
    "spo2"                DOUBLE PRECISION,
    "bmi"                 DOUBLE PRECISION,
    "notes"               TEXT,
    "enteredByPatient"    BOOLEAN NOT NULL DEFAULT true,
    "verifiedByDoctorId"  TEXT,
    "verifiedAt"          TIMESTAMP(3),
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrowthMeasurement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrowthMeasurement_childId_measurementDate_idx" ON "public"."GrowthMeasurement"("childId", "measurementDate");

ALTER TABLE "public"."GrowthMeasurement"
    ADD CONSTRAINT "GrowthMeasurement_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Developmental Milestone ────────────────────────────────────────────────

CREATE TABLE "public"."DevelopmentalMilestone" (
    "id"                    TEXT NOT NULL,
    "childId"               TEXT NOT NULL,
    "category"              "public"."MilestoneCategory" NOT NULL,
    "milestoneName"         TEXT NOT NULL,
    "expectedAgeMonths"     INTEGER NOT NULL,
    "expectedAgeMaxMonths"  INTEGER,
    "status"                "public"."MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "achievedDate"          TIMESTAMP(3),
    "parentObservation"     TEXT,
    "doctorAssessment"      TEXT,
    "verifiedByDoctorId"    TEXT,
    "verifiedAt"            TIMESTAMP(3),
    "needsReview"           BOOLEAN NOT NULL DEFAULT false,
    "notes"                 TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DevelopmentalMilestone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DevelopmentalMilestone_childId_category_idx" ON "public"."DevelopmentalMilestone"("childId", "category");
CREATE INDEX "DevelopmentalMilestone_childId_status_idx" ON "public"."DevelopmentalMilestone"("childId", "status");

ALTER TABLE "public"."DevelopmentalMilestone"
    ADD CONSTRAINT "DevelopmentalMilestone_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── MCH Safety Flag ────────────────────────────────────────────────────────

CREATE TABLE "public"."MchSafetyFlag" (
    "id"                   TEXT NOT NULL,
    "pregnancyId"          TEXT,
    "ancVisitId"           TEXT,
    "childId"              TEXT,
    "growthMeasurementId"  TEXT,
    "flagCode"             TEXT NOT NULL,
    "severity"             "public"."FlagSeverity" NOT NULL,
    "message"              TEXT NOT NULL,
    "ruleDescription"      TEXT NOT NULL,
    "status"               "public"."FlagStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedByDoctorId"   TEXT,
    "reviewedAt"           TIMESTAMP(3),
    "reviewNotes"          TEXT,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MchSafetyFlag_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MchSafetyFlag_pregnancyId_status_idx" ON "public"."MchSafetyFlag"("pregnancyId", "status");
CREATE INDEX "MchSafetyFlag_ancVisitId_idx" ON "public"."MchSafetyFlag"("ancVisitId");
CREATE INDEX "MchSafetyFlag_childId_status_idx" ON "public"."MchSafetyFlag"("childId", "status");
CREATE INDEX "MchSafetyFlag_growthMeasurementId_idx" ON "public"."MchSafetyFlag"("growthMeasurementId");

ALTER TABLE "public"."MchSafetyFlag"
    ADD CONSTRAINT "MchSafetyFlag_pregnancyId_fkey"
    FOREIGN KEY ("pregnancyId") REFERENCES "public"."Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MchSafetyFlag"
    ADD CONSTRAINT "MchSafetyFlag_ancVisitId_fkey"
    FOREIGN KEY ("ancVisitId") REFERENCES "public"."AncVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MchSafetyFlag"
    ADD CONSTRAINT "MchSafetyFlag_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MchSafetyFlag"
    ADD CONSTRAINT "MchSafetyFlag_growthMeasurementId_fkey"
    FOREIGN KEY ("growthMeasurementId") REFERENCES "public"."GrowthMeasurement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── MCH Document ───────────────────────────────────────────────────────────

CREATE TABLE "public"."MchDocument" (
    "id"               TEXT NOT NULL,
    "patientId"        TEXT NOT NULL,
    "pregnancyId"      TEXT,
    "childId"          TEXT,
    "investigationId"  TEXT,
    "medicalReportId"  TEXT,
    "title"            TEXT NOT NULL,
    "category"         TEXT NOT NULL,
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MchDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MchDocument_patientId_idx" ON "public"."MchDocument"("patientId");
CREATE INDEX "MchDocument_pregnancyId_idx" ON "public"."MchDocument"("pregnancyId");
CREATE INDEX "MchDocument_childId_idx" ON "public"."MchDocument"("childId");

ALTER TABLE "public"."MchDocument"
    ADD CONSTRAINT "MchDocument_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MchDocument"
    ADD CONSTRAINT "MchDocument_pregnancyId_fkey"
    FOREIGN KEY ("pregnancyId") REFERENCES "public"."Pregnancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."MchDocument"
    ADD CONSTRAINT "MchDocument_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── MCH Reminder ───────────────────────────────────────────────────────────

CREATE TABLE "public"."MchReminder" (
    "id"                   TEXT NOT NULL,
    "patientId"            TEXT NOT NULL,
    "childId"              TEXT,
    "vaccinationRecordId"  TEXT,
    "ancVisitId"           TEXT,
    "reminderType"         "public"."MchReminderType" NOT NULL,
    "eventDate"            TIMESTAMP(3) NOT NULL,
    "status"               "public"."ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt"               TIMESTAMP(3),
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MchReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MchReminder_vaccinationRecordId_reminderType_key"
    ON "public"."MchReminder"("vaccinationRecordId", "reminderType")
    WHERE "vaccinationRecordId" IS NOT NULL;

CREATE UNIQUE INDEX "MchReminder_ancVisitId_reminderType_key"
    ON "public"."MchReminder"("ancVisitId", "reminderType")
    WHERE "ancVisitId" IS NOT NULL;

CREATE INDEX "MchReminder_patientId_status_idx" ON "public"."MchReminder"("patientId", "status");
CREATE INDEX "MchReminder_eventDate_status_idx" ON "public"."MchReminder"("eventDate", "status");

ALTER TABLE "public"."MchReminder"
    ADD CONSTRAINT "MchReminder_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MchReminder"
    ADD CONSTRAINT "MchReminder_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."MchReminder"
    ADD CONSTRAINT "MchReminder_vaccinationRecordId_fkey"
    FOREIGN KEY ("vaccinationRecordId") REFERENCES "public"."VaccinationRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."MchReminder"
    ADD CONSTRAINT "MchReminder_ancVisitId_fkey"
    FOREIGN KEY ("ancVisitId") REFERENCES "public"."AncVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
