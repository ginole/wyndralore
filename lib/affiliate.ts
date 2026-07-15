import crypto from "node:crypto";
import { User } from "@prisma/client";
import { prisma } from "./db";

// Commission model (see the design doc): a referred customer's FIRST paid purchase earns the partner
// 50% of net, and every purchase after that earns 20% — but only for 6 months after the first
// purchase, and only if that first purchase happened within 60 days of the referral click.
export const AFFILIATE_FIRST_RATE = 0.5;
export const AFFILIATE_RECURRING_RATE = 0.2;
export const QUALIFY_WINDOW_DAYS = 60; // first-touch → first purchase
export const RECURRING_WINDOW_MONTHS = 6; // first purchase → recurring cutoff
export const COMMISSION_HOLD_DAYS = 30; // held before it becomes withdrawable (refund/chargeback buffer)
export const AFFILIATE_MIN_PAYOUT_USD = 30;
export const AFFILIATE_STRIKE_LIMIT = 3; // reversals before a partner is auto-paused

// Carries a partner's code from the landing click (?via=CODE) through to registration.
export const VIA_PARAM = "via";
export const VIA_STORAGE_KEY = "wl_via";

const DAY_MS = 86_400_000;

/** Human-friendly 8-char code (no ambiguous 0/O/1/I/L). */
function newCode(): string {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

/** Assigns an affiliate code to a partner that doesn't have one yet. Idempotent. Called when a
 * partner is onboarded (admin invite) — NOT lazily for every user, unlike referral codes. */
export async function ensureAffiliateCode(user: User): Promise<User> {
  if (user.affiliateCode) return user;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      return await prisma.user.update({ where: { id: user.id }, data: { affiliateCode: code } });
    } catch {
      // unique collision — try another
    }
  }
  throw new Error("Could not assign an affiliate code");
}

/**
 * Records which partner referred a freshly-registered account (first-touch, locked). Called once at
 * registration with the ?via= code the client forwarded. Silently no-ops on a bad/self code so a
 * bogus link can never block signup.
 */
export async function attributeAffiliate(newUser: User, rawViaCode: string | undefined | null): Promise<void> {
  const code = typeof rawViaCode === "string" ? rawViaCode.trim().toUpperCase() : "";
  if (!code) return;
  if (code === newUser.affiliateCode) return; // can't refer yourself
  const partner = await prisma.user.findUnique({ where: { affiliateCode: code } });
  if (!partner || partner.id === newUser.id) return;
  await prisma.user.update({
    where: { id: newUser.id },
    data: { attributedCreatorId: partner.id, attributedAt: new Date() },
  });
}

/**
 * Records the partner's commission for a paid order by a referred customer. Called from
 * markOrderPaid. `netUsd` is the seller's earnings after Paddle's fee + tax (Paddle's own `earnings`
 * figure); when a caller can't supply it (Wise/LS legacy paths) we estimate ~93% of gross. No-ops
 * unless the customer is attributed + within the windows + not blacklisted, and the partner is
 * active. Idempotent per order via the CreatorCommission.orderId unique constraint.
 */
export async function recordAffiliateCommission(
  order: { id: string; code: string; userId: string },
  grossUsd: number,
  netUsd?: number
): Promise<void> {
  const customer = await prisma.user.findUnique({ where: { id: order.userId } });
  if (!customer || !customer.attributedCreatorId || customer.affiliateBlacklisted) return;

  const partner = await prisma.user.findUnique({ where: { id: customer.attributedCreatorId } });
  if (!partner || partner.affiliateStatus !== "active") return;

  const now = new Date();
  let tier: "first" | "recurring";
  let rate: number;

  if (!customer.affiliateFirstPaidAt) {
    // Would-be first purchase — enforce the qualification window before anything else.
    const deadline = customer.attributedAt ? new Date(customer.attributedAt.getTime() + QUALIFY_WINDOW_DAYS * DAY_MS) : null;
    if (deadline && now > deadline) return; // never qualified → no commission, ever
    // Atomically claim the "first purchase" slot so two concurrent deliveries can't both bill 50%.
    const claimed = await prisma.user.updateMany({
      where: { id: customer.id, affiliateFirstPaidAt: null },
      data: { affiliateFirstPaidAt: now },
    });
    if (claimed.count === 1) {
      tier = "first";
      rate = AFFILIATE_FIRST_RATE;
    } else {
      tier = "recurring";
      rate = AFFILIATE_RECURRING_RATE;
    }
  } else {
    if (now > addMonths(customer.affiliateFirstPaidAt, RECURRING_WINDOW_MONTHS)) return; // past the 6-month tail
    tier = "recurring";
    rate = AFFILIATE_RECURRING_RATE;
  }

  const net = typeof netUsd === "number" ? netUsd : roundCents(grossUsd * 0.93);
  const commissionUsd = roundCents(rate * net);
  if (commissionUsd <= 0) return;

  try {
    await prisma.creatorCommission.create({
      data: {
        creatorId: partner.id,
        customerId: customer.id,
        orderId: order.id,
        orderCode: order.code,
        grossUsd: roundCents(grossUsd),
        feeUsd: roundCents(grossUsd - net),
        netUsd: roundCents(net),
        tier,
        rate,
        commissionUsd,
        status: "held",
        heldUntil: new Date(now.getTime() + COMMISSION_HOLD_DAYS * DAY_MS),
      },
    });
  } catch {
    // orderId unique violation → already recorded (duplicate webhook delivery). Fine.
  }
}

/**
 * Refund/chargeback: reverse the commission for an order and strike the partner (auto-pausing at the
 * limit). A reversal that lands AFTER the commission was already paid out is carried as a negative
 * against the partner's future earnings — see getAffiliateBalances.
 */
export async function reverseAffiliateCommission(orderId: string): Promise<void> {
  const c = await prisma.creatorCommission.findUnique({ where: { orderId } });
  if (!c || c.status === "reversed") return;

  await prisma.creatorCommission.update({ where: { id: c.id }, data: { status: "reversed", reversedAt: new Date() } });

  const partner = await prisma.user.update({ where: { id: c.creatorId }, data: { affiliateStrikes: { increment: 1 } } });
  if (partner.affiliateStrikes >= AFFILIATE_STRIKE_LIMIT && partner.affiliateStatus === "active") {
    await prisma.user.update({ where: { id: partner.id }, data: { affiliateStatus: "paused" } });
  }
}

/**
 * Admin marks a partner's matured (available) commissions as paid, netting out any post-payout
 * clawback (reversals that landed after a prior payout) — those are then "settled" so they only ever
 * reduce ONE payout. Returns the net amount actually released to the partner.
 */
export async function payoutPartner(creatorId: string): Promise<number> {
  const bal = await getAffiliateBalances(creatorId);
  if (bal.availableUsd <= 0 && bal.clawbackUsd <= 0) return 0;
  const now = new Date();
  const batchId = `AFB-${now.getTime()}`;
  await prisma.creatorCommission.updateMany({
    where: { creatorId, status: "reversed", paidAt: { not: null } },
    data: { status: "reversed_settled" },
  });
  await prisma.creatorCommission.updateMany({
    where: { creatorId, status: "available" },
    data: { status: "paid", paidAt: now, payoutBatchId: batchId },
  });
  return Math.max(0, bal.netAvailableUsd);
}

/** Cron: matures held commissions whose 30-day hold has elapsed → available (withdrawable). */
export async function releaseMaturedCommissions(): Promise<number> {
  const now = new Date();
  const res = await prisma.creatorCommission.updateMany({
    where: { status: "held", heldUntil: { lte: now } },
    data: { status: "available", availableAt: now },
  });
  return res.count;
}

export interface AffiliateBalances {
  heldUsd: number; // still in the 30-day hold
  availableUsd: number; // matured, withdrawable
  paidUsd: number; // already paid out
  clawbackUsd: number; // reversals that hit after payout — owed back
  netAvailableUsd: number; // availableUsd - clawbackUsd (what a payout run would actually release)
  lifetimeUsd: number; // held + available + paid (excludes reversed)
  referredUsers: number; // distinct customers attributed to this partner
  payingUsers: number; // distinct customers who generated at least one commission
}

/** Balances + audience counts for a partner's dashboard / the admin payout table. */
export async function getAffiliateBalances(creatorId: string): Promise<AffiliateBalances> {
  const [rows, referredUsers] = await Promise.all([
    prisma.creatorCommission.findMany({ where: { creatorId } }),
    prisma.user.count({ where: { attributedCreatorId: creatorId } }),
  ]);
  const sum = (pred: (r: (typeof rows)[number]) => boolean) => roundCents(rows.filter(pred).reduce((s, r) => s + r.commissionUsd, 0));
  const held = sum((r) => r.status === "held");
  const available = sum((r) => r.status === "available");
  const paid = sum((r) => r.status === "paid");
  const clawback = sum((r) => r.status === "reversed" && r.paidAt != null);
  const payingUsers = new Set(rows.filter((r) => r.status !== "reversed").map((r) => r.customerId)).size;
  return {
    heldUsd: held,
    availableUsd: available,
    paidUsd: paid,
    clawbackUsd: clawback,
    netAvailableUsd: roundCents(available - clawback),
    lifetimeUsd: roundCents(held + available + paid),
    referredUsers,
    payingUsers,
  };
}
