-- Creator affiliate program fields on User
ALTER TABLE "User" ADD COLUMN "affiliateCode" TEXT;
ALTER TABLE "User" ADD COLUMN "affiliatePayoutMethod" TEXT;
ALTER TABLE "User" ADD COLUMN "affiliatePayoutHandle" TEXT;
ALTER TABLE "User" ADD COLUMN "affiliateStatus" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "User" ADD COLUMN "affiliateStrikes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "attributedCreatorId" TEXT;
ALTER TABLE "User" ADD COLUMN "attributedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "affiliateFirstPaidAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "affiliateBlacklisted" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "User_affiliateCode_key" ON "User"("affiliateCode");

-- CreatorCommission ledger
CREATE TABLE "CreatorCommission" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderCode" TEXT NOT NULL,
    "grossUsd" DOUBLE PRECISION NOT NULL,
    "feeUsd" DOUBLE PRECISION NOT NULL,
    "netUsd" DOUBLE PRECISION NOT NULL,
    "tier" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "commissionUsd" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'held',
    "heldUntil" TIMESTAMP(3) NOT NULL,
    "availableAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "payoutBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreatorCommission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorCommission_orderId_key" ON "CreatorCommission"("orderId");
CREATE INDEX "CreatorCommission_creatorId_status_idx" ON "CreatorCommission"("creatorId", "status");
CREATE INDEX "CreatorCommission_customerId_idx" ON "CreatorCommission"("customerId");
