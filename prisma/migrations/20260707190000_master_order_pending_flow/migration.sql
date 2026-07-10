-- AlterTable: orders now start "pending" at checkout, confirmed "paid" by the LS webhook
ALTER TABLE "MasterOrder" ALTER COLUMN "status" SET DEFAULT 'pending';
ALTER TABLE "MasterOrder" ADD COLUMN "lsOrderId" TEXT;
ALTER TABLE "MasterOrder" ADD COLUMN "listenTokenHash" TEXT;
ALTER TABLE "MasterOrder" ADD COLUMN "listenTokenExpiresAt" TIMESTAMP(3);
