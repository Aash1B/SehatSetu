-- Persist the provider payment identifier and receipt metadata after verification.
ALTER TABLE "public"."Payment"
  ADD COLUMN "razorpayPaymentId" TEXT,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "receiptNumber" TEXT;

CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key"
  ON "public"."Payment"("razorpayPaymentId");

CREATE UNIQUE INDEX "Payment_receiptNumber_key"
  ON "public"."Payment"("receiptNumber");
