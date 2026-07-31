-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dataConsentAt" TIMESTAMP(3),
ADD COLUMN     "dataConsentGiven" BOOLEAN NOT NULL DEFAULT false;
