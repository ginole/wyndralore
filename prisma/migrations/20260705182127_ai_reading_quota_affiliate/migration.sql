-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "affiliateId" TEXT,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'plan';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiDeepReadsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aiExtraReadsAvailable" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aiQuotaCycleStart" TIMESTAMP(3);
