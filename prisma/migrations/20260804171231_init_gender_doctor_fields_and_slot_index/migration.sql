-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "gender" "Gender",
ADD COLUMN     "imageStoragePath" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "availableToday" SET DEFAULT true,
ALTER COLUMN "rating" SET DEFAULT 4.8,
ALTER COLUMN "reviewsCount" SET DEFAULT 12;

-- CreateIndex
CREATE INDEX "Appointment_doctorId_date_timeSlot_idx" ON "Appointment"("doctorId", "date", "timeSlot");
