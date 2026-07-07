-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "premiumSpreadCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referredByCode" TEXT,
ADD COLUMN     "referralRewarded" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
