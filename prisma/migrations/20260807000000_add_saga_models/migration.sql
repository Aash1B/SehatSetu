-- CreateEnum
CREATE TYPE "public"."SagaType" AS ENUM ('BOOK_APPOINTMENT_WITH_PAYMENT', 'RESCHEDULE_APPOINTMENT', 'CANCEL_APPOINTMENT');

-- CreateEnum
CREATE TYPE "public"."SagaStatus" AS ENUM ('STARTED', 'APPOINTMENT_CREATED', 'PAYMENT_INITIATED', 'PAYMENT_VERIFIED', 'RETRY_SCHEDULED', 'COMPLETED', 'FAILED', 'COMPENSATED');

-- CreateTable
CREATE TABLE "public"."SagaState" (
    "id" TEXT NOT NULL,
    "sagaId" TEXT NOT NULL,
    "type" "SagaType" NOT NULL,
    "status" "SagaStatus" NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "appointmentId" TEXT,
    "paymentId" TEXT,
    "errorMessage" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SagaState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SagaState_sagaId_key" ON "public"."SagaState"("sagaId");

-- CreateIndex
CREATE INDEX "SagaState_sagaId_idx" ON "public"."SagaState"("sagaId");

-- CreateIndex
CREATE INDEX "SagaState_status_createdAt_idx" ON "public"."SagaState"("status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SagaState_idempotencyKey_key" ON "public"."SagaState"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SagaState_idempotencyKey_idx" ON "public"."SagaState"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "public"."SagaState" ADD CONSTRAINT "SagaState_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SagaState" ADD CONSTRAINT "SagaState_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add columns for Payment model
ALTER TABLE "public"."Payment" ADD COLUMN "refundId" TEXT;
ALTER TABLE "public"."Payment" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "public"."Payment" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create index on Payment
CREATE UNIQUE INDEX "Payment_refundId_key" ON "public"."Payment"("refundId");
CREATE INDEX "Payment_razorpayOrderId_idx" ON "public"."Payment"("razorpayOrderId");
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");