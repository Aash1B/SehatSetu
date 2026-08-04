-- CreateEnum
CREATE TYPE "public"."AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

-- AlterTable
ALTER TABLE "public"."User"
ADD COLUMN "authProvider" "public"."AuthProvider" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN "googleId" TEXT,
ADD COLUMN "avatarUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "public"."User"("googleId");
