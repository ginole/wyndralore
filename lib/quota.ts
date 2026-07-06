import { User } from "@prisma/client";
import { prisma } from "./db";

// Mirrors PRD §4.1's free-tier math: 1 base + up to 1 share bonus + up to 3 ad bonuses = 5/day.
export const BASE_FREE_DRAWS = 1;
export const SHARE_BONUS_CAP = 1;
export const AD_BONUS_CAP = 3;

export function isPremiumActive(user: Pick<User, "plan" | "planExpiresAt">): boolean {
  if (user.plan === "free") return false;
  if (!user.planExpiresAt) return true; // lifetime
  return user.planExpiresAt.getTime() > Date.now();
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The daily free-draw quota trusted `clientDate` outright — a free user could send any
 * never-before-seen date string to force a "new day" reset and draw unlimited times. Clamp to
 * within a day of the server's own date (generous enough to cover real timezone differences)
 * so an out-of-range date falls back to the server's date instead of being accepted verbatim.
 */
function clampClientDate(clientDate: string): string {
  const serverDate = new Date().toISOString().slice(0, 10);
  const clientMs = Date.parse(`${clientDate}T00:00:00Z`);
  if (!Number.isFinite(clientMs)) return serverDate;
  const serverMs = Date.parse(`${serverDate}T00:00:00Z`);
  return Math.abs(clientMs - serverMs) <= ONE_DAY_MS ? clientDate : serverDate;
}

/** Applies same-day vs. new-day reset math without writing to the DB. */
function resolveCounters(user: User, clientDate: string) {
  if (user.quotaDate === clientDate) {
    return {
      dailyDrawsUsed: user.dailyDrawsUsed,
      bonusShareUsedToday: user.bonusShareUsedToday,
      bonusAdUsedToday: user.bonusAdUsedToday,
    };
  }
  return { dailyDrawsUsed: 0, bonusShareUsedToday: 0, bonusAdUsedToday: 0 };
}

export interface QuotaStatus {
  isPremium: boolean;
  remaining: number | null; // null means unlimited (premium) — Infinity doesn't survive JSON
  limit: number | null;
  shareBonusAvailable: boolean;
  adBonusAvailable: boolean;
}

export function getQuotaStatus(user: User, clientDate: string): QuotaStatus {
  if (isPremiumActive(user)) {
    return { isPremium: true, remaining: null, limit: null, shareBonusAvailable: false, adBonusAvailable: false };
  }
  const counters = resolveCounters(user, clampClientDate(clientDate));
  const limit = BASE_FREE_DRAWS + counters.bonusShareUsedToday + counters.bonusAdUsedToday;
  const remaining = Math.max(0, limit - counters.dailyDrawsUsed);
  return {
    isPremium: false,
    remaining,
    limit,
    shareBonusAvailable: counters.bonusShareUsedToday < SHARE_BONUS_CAP,
    adBonusAvailable: counters.bonusAdUsedToday < AD_BONUS_CAP,
  };
}

/** Resets day-rollover counters in the DB if needed; returns the fresh user row. */
async function ensureFreshDay(user: User, clientDate: string): Promise<User> {
  const date = clampClientDate(clientDate);
  if (user.quotaDate === date) return user;
  return prisma.user.update({
    where: { id: user.id },
    data: { dailyDrawsUsed: 0, bonusShareUsedToday: 0, bonusAdUsedToday: 0, quotaDate: date },
  });
}

export async function consumeDraw(userId: string, clientDate: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (isPremiumActive(user)) return { ok: true as const, remaining: null as number | null };

  const fresh = await ensureFreshDay(user, clientDate);
  const status = getQuotaStatus(fresh, clientDate);
  if ((status.remaining ?? 0) <= 0) return { ok: false as const, remaining: 0 };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { dailyDrawsUsed: fresh.dailyDrawsUsed + 1 },
  });
  await prisma.drawEvent.create({ data: { userId } });
  return { ok: true as const, remaining: getQuotaStatus(updated, clientDate).remaining };
}

export async function grantShareBonus(userId: string, clientDate: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const fresh = await ensureFreshDay(user, clientDate);
  if (fresh.bonusShareUsedToday >= SHARE_BONUS_CAP) return { ok: false as const };
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { bonusShareUsedToday: fresh.bonusShareUsedToday + 1 },
  });
  return { ok: true as const, status: getQuotaStatus(updated, clientDate) };
}

export async function grantAdBonus(userId: string, clientDate: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const fresh = await ensureFreshDay(user, clientDate);
  if (fresh.bonusAdUsedToday >= AD_BONUS_CAP) return { ok: false as const };
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { bonusAdUsedToday: fresh.bonusAdUsedToday + 1 },
  });
  return { ok: true as const, status: getQuotaStatus(updated, clientDate) };
}
