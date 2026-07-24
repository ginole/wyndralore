-- Social sign-in (Google / LINE): the provider's stable subject id per user.
-- Purely additive: two nullable columns and their unique indexes. No existing column, row or
-- index is touched, so this is safe to run against the live database. The unique indexes cannot
-- collide on existing rows because every existing row gets NULL, and Postgres unique indexes
-- allow many NULLs.
--
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleSub" TEXT,
ADD COLUMN     "lineSub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "User_lineSub_key" ON "User"("lineSub");
