import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPaddleSignature, expectedPriceIdsForOrder } from "@/lib/paddle";
import { markOrderPaid } from "@/lib/paymentProcessing";
import { reverseAffiliateCommission, recordAffiliateCommission } from "@/lib/affiliate";
import {
  linkSubscriptionToUser,
  applySubscriptionUpdate,
  markSubscriptionCanceled,
  PaddleSubscriptionData,
} from "@/lib/subscription";

// Handles the CORE product line only (membership + AI reads) — the Masters marketplace is paused
// (see lib/featureFlags.ts) and stays on its own dormant app/api/webhooks/lemonsqueezy/route.ts.
//
// Two event families arrive here:
//   • transaction.completed — every payment (one-time buys AND each subscription billing). Credits
//     the matching Order once; subscription RENEWAL transactions point at an already-paid order and
//     are skipped here (the period extension is done by subscription.updated instead).
//   • subscription.created / updated / canceled — the auto-renew lifecycle (see lib/subscription.ts).
//
// NOTE: the exact JSON paths (custom_data, totals, current_billing_period) are Paddle's documented
// shapes but should still be spot-checked against the first real sandbox events (temporary
// console.log of the raw payload) and adjusted if any path is off.
interface PaddleTransactionData {
  id?: string;
  status?: string;
  subscription_id?: string;
  custom_data?: { orderCode?: string } | null;
  items?: { price?: { id?: string } }[];
  details?: { totals?: { total?: string; tax?: string; fee?: string; earnings?: string; currency_code?: string } };
  currency_code?: string;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature");

  if (!verifyPaddleSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { event_type?: string; data?: unknown };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true, note: "invalid json, ignored" });
  }

  const eventType = payload.event_type;

  // Auto-renew subscription lifecycle.
  if (eventType === "subscription.created") {
    await linkSubscriptionToUser(payload.data as PaddleSubscriptionData);
    return NextResponse.json({ ok: true, note: "subscription linked" });
  }
  if (eventType === "subscription.updated") {
    await applySubscriptionUpdate(payload.data as PaddleSubscriptionData);
    return NextResponse.json({ ok: true, note: "subscription updated" });
  }
  if (eventType === "subscription.canceled") {
    await markSubscriptionCanceled(payload.data as PaddleSubscriptionData);
    return NextResponse.json({ ok: true, note: "subscription canceled" });
  }

  // Refund / chargeback → claw back the partner's commission for that order and mark it refunded.
  if (eventType === "adjustment.created") {
    const adj = payload.data as { transaction_id?: string; action?: string };
    if (adj.transaction_id && (adj.action === "refund" || adj.action === "chargeback")) {
      const order = await prisma.order.findFirst({ where: { paddleTransactionId: adj.transaction_id } });
      if (order) {
        await reverseAffiliateCommission(order.id);
        await prisma.order.updateMany({ where: { id: order.id, status: { not: "refunded" } }, data: { status: "refunded" } });
      }
    }
    return NextResponse.json({ ok: true, note: "adjustment processed" });
  }

  if (eventType !== "transaction.completed") {
    return NextResponse.json({ ok: true, note: "ignored event" });
  }

  const data = payload.data as PaddleTransactionData;
  const orderCode = data?.custom_data?.orderCode;
  if (!orderCode) {
    console.warn("[paddle] transaction.completed webhook missing custom_data.orderCode");
    return NextResponse.json({ ok: true, note: "no orderCode in custom data" });
  }

  const order = await prisma.order.findUnique({ where: { code: orderCode } });
  if (!order) {
    console.warn(`[paddle] transaction.completed webhook for unknown order code ${orderCode}`);
    return NextResponse.json({ ok: true, note: "unmatched order" });
  }

  // Already-paid order = a duplicate delivery OR a subscription renewal billing (the renewal reuses
  // the original order's custom_data). Access is extended via subscription.updated, not here — but a
  // renewal IS a fresh purchase for AFFILIATE purposes, so record a recurring commission for it,
  // keyed by the renewal's own txn id (there's no new order). We only do this when the txn differs
  // from the order's stored initial-payment txn (so a redelivered initial can't double-count); the
  // commission's unique orderId (= txn id) makes redelivered renewals idempotent too.
  if (order.status === "paid") {
    const txnId = data?.id;
    const isRenewal =
      !!data?.subscription_id &&
      !!txnId &&
      data?.status === "completed" &&
      !!order.paddleTransactionId &&
      order.paddleTransactionId !== txnId;
    if (isRenewal) {
      const totals = data?.details?.totals;
      const gross = totals?.total ? Number(totals.total) / 100 : order.amountUsd;
      const net = totals?.earnings ? Number(totals.earnings) / 100 : undefined;
      await recordAffiliateCommission({ id: txnId!, code: txnId!, userId: order.userId }, gross, net);
      return NextResponse.json({ ok: true, note: "subscription renewal commission recorded" });
    }
    return NextResponse.json({ ok: true, note: "already paid, duplicate delivery" });
  }

  if (data?.status !== "completed") {
    return NextResponse.json({ ok: true, note: `transaction status "${data?.status}", not completed` });
  }

  // Same anti-fraud check as the Lemon Squeezy handler: refuse to credit an order unless what was
  // actually purchased matches what we expect for that order's plan/kind.
  const purchasedPriceId = data?.items?.[0]?.price?.id;
  const expectedPriceIds = expectedPriceIdsForOrder(order);
  if (!purchasedPriceId || !expectedPriceIds.includes(purchasedPriceId)) {
    console.error(`[paddle] price mismatch for order ${orderCode}: expected one of ${expectedPriceIds.join(", ")}, got ${purchasedPriceId}`);
    return NextResponse.json({ ok: true, note: "price mismatch, ignored" });
  }

  // Paddle's tax-inclusive total (minor units). Falls back to the order's own sticker amount only
  // if that path is ever missing on a real payload — a safety net to notice during sandbox testing.
  const totals = data?.details?.totals;
  const amountUsd = totals?.total ? Number(totals.total) / 100 : order.amountUsd;
  // Paddle's own seller earnings (total minus tax minus Paddle's fee) — the base for affiliate
  // commission. May be absent on some payloads; then the commission estimates net from gross.
  const netUsd = totals?.earnings ? Number(totals.earnings) / 100 : undefined;

  await markOrderPaid(order, amountUsd, netUsd);
  // Remember the Paddle transaction id so a later refund/chargeback (adjustment webhook) can map back.
  if (data?.id) {
    await prisma.order.update({ where: { id: order.id }, data: { paddleTransactionId: data.id } });
  }

  return NextResponse.json({ ok: true, note: "matched and upgraded" });
}
