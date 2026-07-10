import crypto from "node:crypto";
import { MasterOrder, MasterProfile } from "@prisma/client";
import { prisma } from "./db";
import { getDeckManifest } from "./cards";
import { generateMasterStyleReading, ReadingCardInput } from "./claude";
import { Orientation } from "./types";

// Fixed 3-position spread for the storefront's AI-style product — same "Past / Present / Future"
// vocabulary as the site's own free three-card spread, so it reads as familiar rather than
// inventing new ritual language just for this product.
const AI_STYLE_POSITIONS = ["Past", "Present", "Future"];

export interface DrawnCard {
  position: string;
  cardId: number;
  cardName: string;
  orientation: Orientation;
}

/** Draws a random, non-repeating 3-card spread server-side (no browser involved — the buyer
 * never shuffles for this product, unlike the site's own reading ritual; see Phase 5 scope notes). */
function drawRandomCards(): DrawnCard[] {
  const deck = getDeckManifest();
  const shuffled = [...deck].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, AI_STYLE_POSITIONS.length).map((card, i) => ({
    position: AI_STYLE_POSITIONS[i]!,
    cardId: card.id,
    cardName: card.name,
    orientation: Math.random() < 0.5 ? "upright" : "reversed",
  }));
}

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
const UPLOAD_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; // master's delivery link: 14 days to use it
const LISTEN_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000; // buyer's listen link: long-lived, re-listenable

export function isMasterProductKind(v: string): v is MasterProductKind {
  return v === "ai_style" || v === "live_voice";
}

/** Short human-facing order code, e.g. "WL-M-7Q2K" — the "-M-" segment keeps it disjoint from
 * membership Order codes ("WL-XXXX") even though both flow through the same LS custom_data key. */
export function masterOrderCode(): string {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(4);
  let s = "";
  for (let i = 0; i < 4; i++) s += alphabet[bytes[i]! % alphabet.length];
  return `WL-M-${s}`;
}

function randomToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}
function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
function tokensEqual(hashA: string, rawB: string): boolean {
  const a = Buffer.from(hashA, "utf8");
  const b = Buffer.from(hashToken(rawB), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** The master's commission for one order — their cut of the sticker price (platform eats the LS fee). */
export function masterCut(amountUsd: number, commissionPct: number): number {
  return Math.round(amountUsd * commissionPct * 100) / 100;
}

/**
 * Creates the `pending` order row at checkout time (before Lemon Squeezy has confirmed payment) —
 * mirrors the existing membership-Order and AI-read-purchase pattern. The caller (the checkout
 * route) owns the order-code collision retry loop, same convention as those two routes.
 */
export async function createPendingMasterOrder(args: {
  code: string;
  master: MasterProfile;
  buyerId: string;
  kind: MasterProductKind;
  question?: string;
}): Promise<MasterOrder> {
  return prisma.masterOrder.create({
    data: {
      code: args.code,
      masterId: args.master.id,
      buyerId: args.buyerId,
      kind: args.kind,
      question: args.question?.trim() || undefined,
      amountUsd: MASTER_PRICE_USD[args.kind],
      commissionPct: MASTER_COMMISSION[args.kind],
      status: "pending",
    },
  });
}

export interface MarkPaidResult {
  /** True once for a genuinely-new confirmation; false if this webhook delivery was a dupe. */
  claimed: boolean;
  /** Only set for live_voice — the raw token to email the master (never persisted in the clear). */
  uploadToken?: string;
}

/**
 * Called from the Lemon Squeezy webhook once payment is confirmed. Atomically claims the
 * pending -> paid/delivered transition (a redelivered webhook is a safe no-op: `claimed: false`).
 *
 * - ai_style: delivered instantly, ledger `available` immediately — no chargeback-from-
 *   non-delivery risk since the AI reading is generated and shown the moment payment clears.
 * - live_voice: money is HELD. The master gets a one-time tokenized upload link + an SLA
 *   deadline; the commission only becomes `available` after she delivers AND the dispute window
 *   passes. If she never delivers, the SLA-sweep cron refunds it before the buyer can dispute.
 */
export async function markMasterOrderPaid(order: MasterOrder, master: MasterProfile, args: { lsOrderId: string; amountUsd: number }): Promise<MarkPaidResult> {
  const now = new Date();
  const cut = masterCut(args.amountUsd, order.commissionPct);

  if (order.kind === "ai_style") {
    // Draw the cards now (instant, no external dependency) — the actual reading TEXT is
    // generated lazily on first view (see ensureMasterAiReading) so a slow/failed Claude call
    // can never hold up settlement. Money and content are deliberately decoupled.
    const cardsDrawn = drawRandomCards();
    const claimed = await prisma.masterOrder.updateMany({
      where: { id: order.id, status: "pending" },
      data: { status: "delivered", lsOrderId: args.lsOrderId, paidAt: now, deliveredAt: now, cardsDrawn: JSON.stringify(cardsDrawn) },
    });
    if (claimed.count !== 1) return { claimed: false };
    await prisma.ledgerEntry.create({
      data: { masterId: master.id, orderId: order.id, amountUsd: cut, status: "available", availableAt: now },
    });
    return { claimed: true };
  }

  // live_voice — held with an SLA deadline and a one-time upload token.
  const rawToken = randomToken();
  const deliverBy = new Date(now.getTime() + master.slaHours * 60 * 60 * 1000);
  const claimed = await prisma.masterOrder.updateMany({
    where: { id: order.id, status: "pending" },
    data: {
      status: "paid",
      lsOrderId: args.lsOrderId,
      paidAt: now,
      deliverBy,
      uploadTokenHash: hashToken(rawToken),
      uploadTokenExpiresAt: new Date(now.getTime() + UPLOAD_TOKEN_TTL_MS),
    },
  });
  if (claimed.count !== 1) return { claimed: false };
  await prisma.ledgerEntry.create({
    data: { masterId: master.id, orderId: order.id, amountUsd: cut, status: "held" },
  });
  return { claimed: true, uploadToken: rawToken };
}

/** Verifies a master's upload-link token against an order (constant-time, checks expiry + status). */
export function verifyUploadToken(order: MasterOrder, rawToken: string): boolean {
  if (order.status !== "paid") return false; // already delivered/refunded, or never paid
  if (!order.uploadTokenHash || !order.uploadTokenExpiresAt) return false;
  if (order.uploadTokenExpiresAt.getTime() < Date.now()) return false;
  return tokensEqual(order.uploadTokenHash, rawToken);
}

/** Verifies a buyer's listen-link token against an order (constant-time, checks expiry). */
export function verifyListenToken(order: MasterOrder, rawToken: string): boolean {
  if (!order.deliveryUrl) return false; // nothing delivered yet
  if (!order.listenTokenHash || !order.listenTokenExpiresAt) return false;
  if (order.listenTokenExpiresAt.getTime() < Date.now()) return false;
  return tokensEqual(order.listenTokenHash, rawToken);
}

/** Looks up the order a raw upload token belongs to (deterministic-hash lookup, same pattern as
 * lib/passwordReset's resetTokenHash) and confirms the token is still valid via verifyUploadToken. */
export async function findOrderByUploadToken(rawToken: string): Promise<(MasterOrder & { master: MasterProfile }) | null> {
  const order = await prisma.masterOrder.findFirst({ where: { uploadTokenHash: hashToken(rawToken) }, include: { master: true } });
  if (!order || !verifyUploadToken(order, rawToken)) return null;
  return order;
}

/** Looks up the order a raw listen token belongs to and confirms it's still valid via verifyListenToken. */
export async function findOrderByListenToken(rawToken: string): Promise<(MasterOrder & { master: MasterProfile }) | null> {
  const order = await prisma.masterOrder.findFirst({ where: { listenTokenHash: hashToken(rawToken) }, include: { master: true } });
  if (!order || !verifyListenToken(order, rawToken)) return null;
  return order;
}

export interface DeliveryResult {
  ok: boolean;
  /** Raw listen token to email the buyer — only set when this call actually recorded delivery. */
  listenToken?: string;
}

/**
 * Records a live_voice delivery: stops the SLA clock, opens the dispute window, issues the
 * buyer's listen token, and consumes the (now-used) upload token. Guarded so only a still-"paid"
 * order can be delivered — a second call (e.g. both the client confirm AND the Blob
 * onUploadCompleted callback firing) is a safe no-op, matching the idempotency pattern used
 * throughout this codebase's payment webhooks.
 */
export async function recordDelivery(orderId: string, deliveryUrl: string): Promise<DeliveryResult> {
  const now = new Date();
  const disputeUntil = new Date(now.getTime() + DISPUTE_WINDOW_HOURS * 60 * 60 * 1000);
  const rawListenToken = randomToken();
  const claimed = await prisma.masterOrder.updateMany({
    where: { id: orderId, status: "paid" },
    data: {
      status: "delivered",
      deliveredAt: now,
      deliveryUrl,
      disputeUntil,
      uploadTokenHash: null,
      uploadTokenExpiresAt: null,
      listenTokenHash: hashToken(rawListenToken),
      listenTokenExpiresAt: new Date(now.getTime() + LISTEN_TOKEN_TTL_MS),
    },
  });
  if (claimed.count !== 1) return { ok: false };
  return { ok: true, listenToken: rawListenToken };
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

/**
 * Returns the ai_style order's reading text, generating and caching it on first call. Called
 * from the buyer's result page — the first person to load it pays the ~1-2s Claude latency,
 * everyone after (including the same buyer refreshing) gets the cached text instantly. Safe to
 * call concurrently: a second caller mid-generation just regenerates once more (wasted tokens,
 * never wrong data) rather than needing a lock, since writes are idempotent overwrites of the
 * same field with equivalent content.
 */
export async function ensureMasterAiReading(order: MasterOrder, master: MasterProfile): Promise<string> {
  if (order.aiReadingText) return order.aiReadingText;
  if (!order.cardsDrawn) throw new Error(`Order ${order.code} has no cardsDrawn — cannot generate a reading`);

  const cards: DrawnCard[] = JSON.parse(order.cardsDrawn);
  const cardInputs: ReadingCardInput[] = cards.map((c) => ({ position: c.position, name: c.cardName, orientation: c.orientation }));

  const text = await generateMasterStyleReading(
    {
      displayName: master.displayName,
      styleTone: master.styleTone,
      focusAreas: JSON.parse(master.focusAreas || "[]"),
      voiceSamples: JSON.parse(master.voiceSamples || "[]"),
      avoidTopics: master.avoidTopics,
    },
    { cards: cardInputs, theme: "general", question: order.question ?? undefined },
  );

  await prisma.masterOrder.update({ where: { id: order.id }, data: { aiReadingText: text } });
  return text;
}
