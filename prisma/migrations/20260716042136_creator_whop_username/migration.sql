-- DropIndex
DROP INDEX "Order_paddleTransactionId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isCreator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whopUsername" TEXT;
