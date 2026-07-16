-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiFollowupCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cardBackStyle" TEXT NOT NULL DEFAULT 'lunar',
ADD COLUMN     "dailyReminderOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dailyStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deckStyle" TEXT NOT NULL DEFAULT 'minimal',
ADD COLUMN     "lastDailyDate" TEXT,
ADD COLUMN     "loveReadingCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "yearReadingCredits" INTEGER NOT NULL DEFAULT 0;
