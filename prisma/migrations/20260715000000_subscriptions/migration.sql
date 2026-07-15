-- Auto-renewing Paddle subscription fields on User (the "Subscribe & save" pricing option).
ALTER TABLE "User" ADD COLUMN "subscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "User" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "autoRenew" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "User_subscriptionId_key" ON "User"("subscriptionId");
