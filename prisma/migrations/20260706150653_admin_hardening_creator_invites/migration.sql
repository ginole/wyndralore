-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPlaceholder" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CreatorInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "affiliateLink" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wasNewAccount" BOOLEAN NOT NULL DEFAULT false,
    "planGranted" TEXT NOT NULL,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLoginThrottle" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lockoutCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminLoginThrottle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreatorInvite_email_idx" ON "CreatorInvite"("email");

-- CreateIndex
CREATE INDEX "CreatorInvite_createdAt_idx" ON "CreatorInvite"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminLoginThrottle_ipHash_key" ON "AdminLoginThrottle"("ipHash");

-- CreateIndex
CREATE INDEX "AdminLoginThrottle_lockedUntil_idx" ON "AdminLoginThrottle"("lockedUntil");

-- AddForeignKey
ALTER TABLE "CreatorInvite" ADD CONSTRAINT "CreatorInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
