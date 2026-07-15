import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPaddleSignature, expectedPriceIdsForOrder } from "@/lib/paddle";
import { markOrderPaid } from "@/lib/paymentProcessing";
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
  custom_data?: { orderCode?: string } | null;
  items?: { price?: { id?: string } }[];
  details?: { totals?: { total?: string; currency_code?: string } };
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

  // Already-paid order = either a duplicate delivery or a subscription renewal billing (the renewal
  // transaction reuses the original order's custom_data). Either way, don't re-credit — renewals
  // extend access via subscription.updated, not here.
  if (order.status === "paid") {
    return NextResponse.json({ ok: true, note: "already paid, duplicate or renewal" });
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
  const totalMinorUnits = data?.details?.totals?.total;
  const amountUsd = totalMinorUnits ? Number(totalMinorUnits) / 100 : order.amountUsd;

  await markOrderPaid(order, amountUsd);

  return NextResponse.json({ ok: true, note: "matched and upgraded" });
}
