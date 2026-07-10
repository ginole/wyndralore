-- CreateTable
CREATE TABLE "MasterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "tagline" TEXT,
    "photoUrl" TEXT,
    "channelUrl" TEXT,
    "followerTier" TEXT,
    "styleTone" TEXT NOT NULL DEFAULT 'gentle',
    "focusAreas" TEXT NOT NULL DEFAULT '[]',
    "voiceSamples" TEXT NOT NULL DEFAULT '[]',
    "avoidTopics" TEXT,
    "dailyCapacity" INTEGER NOT NULL DEFAULT 5,
    "slaHours" INTEGER NOT NULL DEFAULT 48,
    "vacationMode" BOOLEAN NOT NULL DEFAULT false,
    "deepLinkUrl" TEXT,
    "payoutMethod" TEXT,
    "payoutHandle" TEXT,
    "strikeCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "commissionPct" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paid',
    "deliverBy" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "deliveryUrl" TEXT,
    "disputeUntil" TIMESTAMP(3),
    "uploadTokenHash" TEXT,
    "uploadTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "MasterOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'held',
    "availableAt" TIMESTAMP(3),
    "paidOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterProfile_userId_key" ON "MasterProfile"("userId");
CREATE UNIQUE INDEX "MasterProfile_handle_key" ON "MasterProfile"("handle");
CREATE INDEX "MasterProfile_status_idx" ON "MasterProfile"("status");
CREATE UNIQUE INDEX "MasterOrder_code_key" ON "MasterOrder"("code");
CREATE INDEX "MasterOrder_masterId_idx" ON "MasterOrder"("masterId");
CREATE INDEX "MasterOrder_status_idx" ON "MasterOrder"("status");
CREATE UNIQUE INDEX "LedgerEntry_orderId_key" ON "LedgerEntry"("orderId");
CREATE INDEX "LedgerEntry_masterId_status_idx" ON "LedgerEntry"("masterId", "status");

-- AddForeignKey
ALTER TABLE "MasterProfile" ADD CONSTRAINT "MasterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MasterOrder" ADD CONSTRAINT "MasterOrder_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MasterOrder" ADD CONSTRAINT "MasterOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MasterOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
