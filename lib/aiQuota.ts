import { User } from "@prisma/client";
import { prisma } from "./db";
import { isPremiumActive } from "./quota";
import { PlanId } from "./pricing";

// AI deep-reading quota tiers (AI-reading PRD §2). Lemon Squeezy plans are one-time payments,
// not real subscriptions, so there's no billing-cycle object to anchor "resets on your billing
// date" to. Instead we roll a fixed 30-day window forward from `aiQuotaCycleStart`, which is
// (re)set to the order's `paidAt` whenever a plan purchase activates or renews premium — see
// `markOrderPaid` in lib/paymentProcessing.ts.
export const AI_QUOTA_BY_PLAN: Record<PlanId, number> = {
  monthly: 2,
  yearly: 3,
  lifetime: 4,
};

export const AI_CYCLE_DAYS = 30;
const AI_CYCLE_MS = AI_CYCLE_DAYS * 24 * 60 * 60 * 1000;

// Non-member one-time deep read ($2.99) vs. a member's overage read once their monthly free
// quota is used up ($1.99 — already discounted vs. the non-member price).
export const AI_SINGLE_PRICE_USD = 2.99;
export const AI_OVERAGE_PRICE_USD = 1.99;
// One more question asked against a deep reading the buyer just received (kind "ai_followup").
export const AI_FOLLOWUP_PRICE_USD = 1.99;

/** Advances `cycleStart` by whole 30-day increments to the most recent boundary <= now. */
function currentCycleStart(cycleStart: Date, now: Date): Date {
  const elapsed = now.getTime() - cycleStart.getTime();
  if (elapsed < AI_CYCLE_MS) return cycleStart;
  const elapsedCycles = Math.floor(elapsed / AI_CYCLE_MS);
  return new Date(cycleStart.getTime() + elapsedCycles * AI_CYCLE_MS);
}

export interface AiQuotaStatus {
  isPremium: boolean;
  deepReadsUsed: number;
  deepReadsLimit: number;
  deepReadsRemaining: number;
  extraReadsAvailable: number;
  cycleResetsAt: Date | null;
}

/** Pure status computation — does not write to the DB (mirrors lib/quota.ts's pattern). */
export function getAiQuotaStatus(user: User, now: Date = new Date()): AiQuotaStatus {
  const premium = isPremiumActive(user);
  const extraReadsAvailable = user.aiExtraReadsAvailable;

  if (!premium || !user.aiQuotaCycleStart) {
    return { isPremium: premium, deepReadsUsed: 0, deepReadsLimit: 0, deepReadsRemaining: 0, extraReadsAvailable, cycleResetsAt: null };
  }

  const limit = AI_QUOTA_BY_PLAN[user.plan as PlanId] ?? 0;
  const cycleStart = currentCycleStart(user.aiQuotaCycleStart, now);
  const used = cycleStart.getTime() === user.aiQuotaCycleStart.getTime() ? user.aiDeepReadsUsed : 0;
  const cycleResetsAt = new Date(cycleStart.getTime() + AI_CYCLE_MS);

  return {
    isPremium: premium,
    deepReadsUsed: used,
    deepReadsLimit: limit,
    deepReadsRemaining: Math.max(0, limit - used),
    extraReadsAvailable,
    cycleResetsAt,
  };
}

/** Rolls the cycle forward in the DB if it's stale; returns the fresh user row. */
async function ensureFreshAiCycle(user: User, now: Date): Promise<User> {
  // Backfill for premium members who bought their plan before this feature shipped — they'll
  // never trigger a new Lemon Squeezy purchase (esp. lifetime members) to anchor a cycle, so
  // without this they'd be stuck at 0 AI reads forever. Anchor to now the first time they're seen.
  if (!user.aiQuotaCycleStart) {
    if (!isPremiumActive(user)) return user;
    return prisma.user.update({
      where: { id: user.id },
      data: { aiQuotaCycleStart: now, aiDeepReadsUsed: 0 },
    });
  }
  const cycleStart = currentCycleStart(user.aiQuotaCycleStart, now);
  if (cycleStart.getTime() === user.aiQuotaCycleStart.getTime()) return user;
  return prisma.user.update({
    where: { id: user.id },
    data: { aiQuotaCycleStart: cycleStart, aiDeepReadsUsed: 0 },
  });
}

/** Same as getAiQuotaStatus, but backfills/rolls the cycle in the DB first — use for user-facing reads. */
export async function getFreshAiQuotaStatus(userId: string): Promise<AiQuotaStatus> {
  const now = new Date();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const fresh = await ensureFreshAiCycle(user, now);
  return getAiQuotaStatus(fresh, now);
}

export type ConsumeAiReadResult =
  | { ok: true; source: "quota" | "extra"; status: AiQuotaStatus }
  | { ok: false; status: AiQuotaStatus };

/** Spends one deep read: free monthly quota first, then a purchased extra-read credit. */
export async function consumeAiDeepRead(userId: string): Promise<ConsumeAiReadResult> {
  const now = new Date();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const fresh = await ensureFreshAiCycle(user, now);
  const status = getAiQuotaStatus(fresh, now);

  // Conditional updateMany, not read-then-write: two concurrent requests can both read
  // "remaining > 0" before either writes, and both would otherwise be granted a read off a
  // single unit of quota. Guarding the WHERE clause on the still-current value makes only one
  // concurrent update actually match (count === 1) — the loser falls through to the next
  // source instead of getting a free extra generation.
  if (status.deepReadsRemaining > 0) {
    const claimed = await prisma.user.updateMany({
      where: { id: userId, aiQuotaCycleStart: fresh.aiQuotaCycleStart, aiDeepReadsUsed: { lt: status.deepReadsLimit } },
      data: { aiDeepReadsUsed: { increment: 1 } },
    });
    if (claimed.count === 1) {
      const updated = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      return { ok: true, source: "quota", status: getAiQuotaStatus(updated, now) };
    }
  }

  if (status.extraReadsAvailable > 0) {
    const claimed = await prisma.user.updateMany({
      where: { id: userId, aiExtraReadsAvailable: { gt: 0 } },
      data: { aiExtraReadsAvailable: { decrement: 1 } },
    });
    if (claimed.count === 1) {
      const updated = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      return { ok: true, source: "extra", status: getAiQuotaStatus(updated, now) };
    }
  }

  return { ok: false, status };
}

/** Grants purchased extra-read credits (single non-member read or member overage). Called from the LS webhook. */
export async function grantExtraAiReads(userId: string, count = 1) {
  return prisma.user.update({
    where: { id: userId },
    data: { aiExtraReadsAvailable: { increment: count } },
  });
}
