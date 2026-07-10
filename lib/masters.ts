import crypto from "node:crypto";
import { MasterOrder, MasterProfile } from "@prisma/client";
import { prisma } from "./db";

// The two storefront products. Prices and commission are snapshotted onto each order at purchase
// time, so changing these later never rewrites what a master was already promised for past sales.
export type MasterProductKind = "ai_style" | "live_voice";

export const MASTER_PRICE_USD: Record<MasterProductKind, number> = {
  ai_style: 9.9,
  live_voice: 39,
};
export const MASTER_COMMISSION: Record<MasterProductKind, number> = {
  ai_style: 0.5, // instant AI reading in her style
  live_voice: 0.7, // she records a short voice/video reading herself
};

// After a live_voice reading is delivered, the buyer has this long to dispute before the master's
// commission is released. Failing to deliver at all within the master's SLA auto-refunds instead.
export const DISPUTE_WINDOW_HOURS = 72;
const UPLOAD_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days to deliver a paid order

export function isMasterProductKind(v: string): v is MasterProductKind {
  return v === "ai_style" || v === "live_voice";
}

/** Short human-facing order code, e.g. "WL-M-7Q2K". */
export function masterOrderCode(): string {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(4);
  let s = "";
  for (let i = 0; i < 4; i++) s += alphabet[bytes[i]! % alphabet.length];
  return `WL-M-${s}`;
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** The master's commission for one order — their cut of the sticker price (platform eats the LS fee). */
export function masterCut(amountUsd: number, commissionPct: number): number {
  return Math.round(amountUsd * commissionPct * 100) / 100;
}

export interface FulfillMasterOrderArgs {
  master: MasterProfile;
  buyerId: string;
  kind: MasterProductKind;
  amountUsd: number;
}

export interface FulfillResult {
  order: MasterOrder;
  /** Raw upload token — returned ONCE for live_voice so the caller can email the delivery link. */
  uploadToken?: string;
}

/**
 * Records a paid storefront purchase and opens the right settlement path. Called from the Lemon
 * Squeezy webhook once payment is confirmed.
 *
 * - ai_style: delivered instantly (the AI reading), so there's no chargeback-from-non-delivery
 *   risk — the ledger entry is immediately `available`, no hold.
 * - live_voice: money is HELD. The master gets a tokenized upload link and an SLA deadline; the
 *   commission only becomes `available` after she delivers AND the dispute window passes. If she
 *   never delivers, refundOverdueOrders() reverses it before the buyer can charge back.
 *
 * Everything runs in one transaction so an order can never exist without its ledger entry.
 */
export async function fulfillMasterOrderPaid({ master, buyerId, kind, amountUsd }: FulfillMasterOrderArgs): Promise<FulfillResult> {
  const commissionPct = MASTER_COMMISSION[kind];
  const cut = masterCut(amountUsd, commissionPct);
  const now = new Date();

  if (kind === "ai_style") {
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.masterOrder.create({
        data: {
          code: masterOrderCode(),
          masterId: master.id,
          buyerId,
          kind,
          amountUsd,
          commissionPct,
          status: "delivered",
          paidAt: now,
          deliveredAt: now,
        },
      });
      await tx.ledgerEntry.create({
        data: { masterId: master.id, orderId: created.id, amountUsd: cut, status: "available", availableAt: now },
      });
      return created;
    });
    return { order };
  }

  // live_voice — held with an SLA deadline and a one-time upload token.
  const rawToken = crypto.randomBytes(24).toString("base64url");
  const deliverBy = new Date(now.getTime() + master.slaHours * 60 * 60 * 1000);
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.masterOrder.create({
      data: {
        code: masterOrderCode(),
        masterId: master.id,
        buyerId,
        kind,
        amountUsd,
        commissionPct,
        status: "paid",
        paidAt: now,
        deliverBy,
        uploadTokenHash: hashToken(rawToken),
        uploadTokenExpiresAt: new Date(now.getTime() + UPLOAD_TOKEN_TTL_MS),
      },
    });
    await tx.ledgerEntry.create({
      data: { masterId: master.id, orderId: created.id, amountUsd: cut, status: "held" },
    });
    return created;
  });
  return { order, uploadToken: rawToken };
}

/** Verifies a master's upload-link token against an order (constant-time, checks expiry + status). */
export function verifyUploadToken(order: MasterOrder, rawToken: string): boolean {
  if (order.status !== "paid") return false; // already delivered/refunded
  if (!order.uploadTokenHash || !order.uploadTokenExpiresAt) return false;
  if (order.uploadTokenExpiresAt.getTime() < Date.now()) return false;
  const a = Buffer.from(order.uploadTokenHash, "utf8");
  const b = Buffer.from(hashToken(rawToken), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Records a live_voice delivery: stops the SLA clock, opens the dispute window, and consumes the
 * upload token. Guarded so only a still-"paid" order can be delivered (no double-delivery, no
 * delivering an already-refunded order).
 */
export async function recordDelivery(orderId: string, deliveryUrl: string): Promise<boolean> {
  const now = new Date();
  const disputeUntil = new Date(now.getTime() + DISPUTE_WINDOW_HOURS * 60 * 60 * 1000);
  const claimed = await prisma.masterOrder.updateMany({
    where: { id: orderId, status: "paid" },
    data: { status: "delivered", deliveredAt: now, deliveryUrl, disputeUntil, uploadTokenHash: null, uploadTokenExpiresAt: null },
  });
  return claimed.count === 1;
}

/**
 * Cron step: releases commissions whose dispute window has closed. A delivered live_voice order
 * past its disputeUntil flips its held ledger entry to `available` (and the order to `released`).
 * Returns how many were released.
 */
export async function releaseDueLedger(now: Date = new Date()): Promise<number> {
  const due = await prisma.masterOrder.findMany({
    where: { status: "delivered", disputeUntil: { lte: now } },
    select: { id: true },
  });
  let released = 0;
  for (const { id } of due) {
    const flipped = await prisma.masterOrder.updateMany({ where: { id, status: "delivered" }, data: { status: "released" } });
    if (flipped.count !== 1) continue;
    await prisma.ledgerEntry.updateMany({ where: { orderId: id, status: "held" }, data: { status: "available", availableAt: now } });
    released += 1;
  }
  return released;
}

/**
 * Cron step: finds live_voice orders whose delivery deadline passed without a delivery. The caller
 * (cron route) should issue the actual Lemon Squeezy refund for each, THEN call markOrderRefunded
 * so a failed refund API call doesn't prematurely void the ledger. Returns the overdue orders.
 */
export async function getOverdueUndeliveredOrders(now: Date = new Date()): Promise<MasterOrder[]> {
  return prisma.masterOrder.findMany({ where: { status: "paid", kind: "live_voice", deliverBy: { lte: now } } });
}

/** Marks an order refunded, voids its ledger entry, and adds a strike (auto-pausing at 3). */
export async function markOrderRefunded(orderId: string): Promise<void> {
  const claimed = await prisma.masterOrder.updateMany({ where: { id: orderId, status: "paid" }, data: { status: "refunded" } });
  if (claimed.count !== 1) return;
  const order = await prisma.masterOrder.findUniqueOrThrow({ where: { id: orderId } });
  await prisma.ledgerEntry.updateMany({ where: { orderId, status: "held" }, data: { status: "void" } });
  const master = await prisma.masterProfile.update({
    where: { id: order.masterId },
    data: { strikeCount: { increment: 1 } },
  });
  if (master.strikeCount >= 3 && master.status === "active") {
    await prisma.masterProfile.update({ where: { id: master.id }, data: { status: "paused" } });
  }
}

export interface PayoutDue {
  master: MasterProfile;
  totalUsd: number;
  entryIds: string[];
}

/** Reconciliation: every master with `available` (owed, unpaid) commission, grouped for payout. */
export async function payoutsDue(): Promise<PayoutDue[]> {
  const entries = await prisma.ledgerEntry.findMany({ where: { status: "available" }, include: { master: true } });
  const byMaster = new Map<string, PayoutDue>();
  for (const e of entries) {
    const cur = byMaster.get(e.masterId) ?? { master: e.master, totalUsd: 0, entryIds: [] };
    cur.totalUsd = Math.round((cur.totalUsd + e.amountUsd) * 100) / 100;
    cur.entryIds.push(e.id);
    byMaster.set(e.masterId, cur);
  }
  return [...byMaster.values()].sort((a, b) => b.totalUsd - a.totalUsd);
}

/** Admin marks a master's available commission as paid out (after sending via PayPal/Wise). */
export async function markMasterPaidOut(masterId: string): Promise<number> {
  const res = await prisma.ledgerEntry.updateMany({
    where: { masterId, status: "available" },
    data: { status: "paid_out", paidOutAt: new Date() },
  });
  return res.count;
}
