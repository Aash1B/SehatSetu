ALTER TABLE "User"
ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "AccountDeletionOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'ACCOUNT_DELETION',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountDeletionOtp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountDeletionAudit" (
    "id" TEXT NOT NULL,
    "userIdentifier" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountDeletionAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StorageCleanupJob" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "StorageCleanupJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountDeletionOtp_userId_purpose_createdAt_idx" ON "AccountDeletionOtp"("userId", "purpose", "createdAt");
CREATE INDEX "AccountDeletionOtp_expiresAt_idx" ON "AccountDeletionOtp"("expiresAt");
CREATE INDEX "AccountDeletionAudit_userIdentifier_createdAt_idx" ON "AccountDeletionAudit"("userIdentifier", "createdAt");
CREATE UNIQUE INDEX "StorageCleanupJob_bucket_path_key" ON "StorageCleanupJob"("bucket", "path");
CREATE INDEX "StorageCleanupJob_status_createdAt_idx" ON "StorageCleanupJob"("status", "createdAt");
ALTER TABLE "AccountDeletionOtp" ADD CONSTRAINT "AccountDeletionOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
