-- "Last seen" for the admin retention view (updated once a day by /api/auth/me).
-- Purely additive: one nullable column, no index, nothing existing touched. Safe on the live DB.
--
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);
