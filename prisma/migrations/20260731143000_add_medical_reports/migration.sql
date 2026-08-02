-- CreateEnum
CREATE TYPE "MedicalReportStatus" AS ENUM (
    'PENDING_UPLOAD',
    'UPLOADED',
    'PROCESSING',
    'PROCESSED',
    'OCR_FAILED',
    'DELETED'
);

-- CreateEnum
CREATE TYPE "MedicalReportOcrStatus" AS ENUM (
    'NOT_STARTED',
    'PROCESSING',
    'SUCCEEDED',
    'FAILED'
);

-- CreateEnum
CREATE TYPE "MedicalReportType" AS ENUM (
    'LAB_REPORT',
    'PRESCRIPTION',
    'DISCHARGE_SUMMARY',
    'SCAN',
    'OTHER'
);

-- CreateTable
CREATE TABLE "MedicalReport" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "originalFileName" TEXT NOT NULL,
    "storageBucket" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "reportType" "MedicalReportType" NOT NULL,
    "status" "MedicalReportStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "ocrStatus" "MedicalReportOcrStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "extractedText" TEXT,
    "extractedData" JSONB,
    "processingErrorCode" TEXT,
    "processingErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedAt" TIMESTAMP(3),
    "processingStartedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicalReport_storagePath_key" ON "MedicalReport"("storagePath");
CREATE INDEX "MedicalReport_patientId_createdAt_idx" ON "MedicalReport"("patientId", "createdAt");
CREATE INDEX "MedicalReport_appointmentId_idx" ON "MedicalReport"("appointmentId");
CREATE INDEX "MedicalReport_uploadedByUserId_idx" ON "MedicalReport"("uploadedByUserId");
CREATE INDEX "MedicalReport_status_idx" ON "MedicalReport"("status");

-- AddForeignKey
ALTER TABLE "MedicalReport" ADD CONSTRAINT "MedicalReport_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicalReport" ADD CONSTRAINT "MedicalReport_uploadedByUserId_fkey"
FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicalReport" ADD CONSTRAINT "MedicalReport_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
