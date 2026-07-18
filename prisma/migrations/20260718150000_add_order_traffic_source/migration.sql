-- Where the buyer came from, captured on first touch (components/TrafficSourceCapture.tsx).
-- Purely additive: four nullable columns and one index. No existing column, row or index is
-- touched, so this is safe to run against the live database with orders already in it.
--
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "referrer" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT;

-- CreateIndex
CREATE INDEX "Order_utmSource_idx" ON "Order"("utmSource");
