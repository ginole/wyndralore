-- CreateTable
CREATE TABLE "SpecialReading" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cards" TEXT NOT NULL,
    "input" TEXT,
    "aiText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpecialReading_userId_createdAt_idx" ON "SpecialReading"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "SpecialReading" ADD CONSTRAINT "SpecialReading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
