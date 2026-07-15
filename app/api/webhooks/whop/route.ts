import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWhopSignature, expectedPlanIdsForOrder } from "@/lib/whop";
import { markOrderPaid } from "@/lib/paymentProcessing";
import { reverseAffiliateCommission, recordAffiliateCommission } from "@/lib/affiliate";
import {
  linkMembershipToUser,
  applyMembershipUpdate,
  markMembershipCanceled,
  WhopMembershipData,
} from "@/lib/subscription";

// Handles the CORE product line only (membership + AI reads) — the Masters marketplace is paused
// (see lib/featureFlags.ts) and stays on its own dormant app/api/webhooks/lemonsqueezy/route.ts.
// Replaces the Paddle webhook after Paddle rejected the domain on category grounds; markOrderPaid()
// is reused untouched, as it was across the LS → Paddle move.
//
// ⚠️ Event naming is genuinely inconsistent, so every comparison here goes through eventKey().
// We register with underscores (`payment_succeeded`), and Whop stores/delivers a MIX: reading back
// our own registration showed `payment.succeeded` and `dispute.created` normalised to dots, while
// `membership_went_valid` and `membership_went_invalid` stayed underscored. Matching only one form
// would silently drop the other family — the handler would just never fire, with no error anywhere.
// eventKey() folds dots to underscores so both forms hit the same branch.
//
// Also note `membership_activated` / `membership_deactivated` pass the API's own name validation but
// are then rejected as "not a valid event" on create, so they are NOT subscribed. went_valid /
// went_invalid cover the same ground: went_valid → applyMembershipUpdate, which falls back to
// linkMembershipToUser when the membership isn't on a user yet.
const eventKey = (type: string | undefined): string => (type ?? "").replace(/\./g, "_");
//
// NOTE: field paths below come from the official @whop/sdk TypeScript types (v0.0.40), not from
// prose docs, so they are firmer than the Paddle route's original guesses were. The ONE thing the
// SDK does not state is the AMOUNT UNIT — Whop's plan prices are dollars (6.9, 39, 2.99), so we
// treat payment amounts as dollars too. plausibleAmount() below refuses to trust any amount that
// disagrees wildly with the order's own known price, so a units mistake can't silently pay an
// affiliate 100×. Confirm against the first real sandbox payment.
interface WhopPaymentData {
  id?: string;
  status?: string; // ReceiptStatus: draft|open|paid|pending|uncollectible|unresolved|void
  billing_reason?: string; // subscription_create|subscription_cycle|subscription_update|one_time|manual|subscription
  metadata?: { orderCode?: string } | null;
  plan?: { id?: string } | null;
  membership?: { id?: string } | null;
  total?: number | null;
  usd_total?: number | null;
  amount_after_fees?: number | null;
  refunded_amount?: number | null;
}

/**
 * Returns `received` only when it is in the same ballpark as the price we already know this order
 * to be. Guards against a units mismatch (dollars vs minor units): if Whop ever sends 690 for a
 * $6.90 order, silently trusting it would record a 100× amount and pay an affiliate 100× the real
 * commission. Falls back to the order's own amount, which we control, and shouts in the logs.
 */
function plausibleAmount(received: number | null | undefined, expectedUsd: number, label: string): number | undefined {
  if (received == null) return undefined;
  if (expectedUsd <= 0) return received;
  const ratio = received / expectedUsd;
  // Generous band: tax, FX and Whop's fees legitimately move the number, but never by ~100×.
  if (ratio > 0.4 && ratio < 3) return received;
  console.error(
    `[whop] IMPLAUSIBLE ${label}: got ${received} for an order priced ${expectedUsd} (ratio ${ratio.toFixed(1)}×). ` +
      `Refusing to use it — check Whop's amount units and fix app/api/webhooks/whop/route.ts.`
  );
  return undefined;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (
    !verifyWhopSignature(rawBody, {
      id: req.headers.get("webhook-id"),
      timestamp: req.headers.get("webhook-timestamp"),
      signature: req.headers.get("webhook-signature"),
    })
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { type?: string; data?: unknown };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true, note: "invalid json, ignored" });
  }

  const eventType = eventKey(payload.type);

  // Auto-renew membership lifecycle (see lib/subscription.ts).
  if (eventType === "membership_activated") {
    await linkMembershipToUser(payload.data as WhopMembershipData);
    return NextResponse.json({ ok: true, note: "membership linked" });
  }
  if (eventType === "membership_cancel_at_period_end_changed" || eventType === "membership_went_valid") {
    await applyMembershipUpdate(payload.data as WhopMembershipData);
    return NextResponse.json({ ok: true, note: "membership updated" });
  }
  if (eventType === "membership_deactivated" || eventType === "membership_went_invalid") {
    await markMembershipCanceled(payload.data as WhopMembershipData);
    return NextResponse.json({ ok: true, note: "membership canceled" });
  }

  // Refund / chargeback → claw back the partner's commission for that order and mark it refunded.
  // Whop delivers the Payment object on refund.created/dispute.created, so the payment id maps back
  // to the order we stored it on at purchase time.
  if (eventType === "refund_created" || eventType === "dispute_created") {
    const data = payload.data as WhopPaymentData;
    const paymentId = data?.id;
    if (paymentId) {
      const order = await prisma.order.findFirst({ where: { paddleTransactionId: paymentId } });
      if (order) {
        await reverseAffiliateCommission(order.id);
        await prisma.order.updateMany({
          where: { id: order.id, status: { not: "refunded" } },
          data: { status: "refunded" },
        });
      }
    }
    return NextResponse.json({ ok: true, note: "refund/dispute processed" });
  }

  if (eventType !== "payment_succeeded") {
    return NextResponse.json({ ok: true, note: `ignored event ${eventType}` });
  }

  const data = payload.data as WhopPaymentData;
  const orderCode = data?.metadata?.orderCode;
  if (!orderCode) {
    console.warn("[whop] payment.succeeded missing metadata.orderCode");
    return NextResponse.json({ ok: true, note: "no orderCode in metadata" });
  }

  const order = await prisma.order.findUnique({ where: { code: orderCode } });
  if (!order) {
    console.warn(`[whop] payment.succeeded for unknown order code ${orderCode}`);
    return NextResponse.json({ ok: true, note: "unmatched order" });
  }

  // Already-paid order = a duplicate delivery OR a subscription renewal billing (the renewal reuses
  // the original checkout's metadata). Access is extended by the membership events, not here — but a
  // renewal IS a fresh purchase for AFFILIATE purposes, so record a recurring commission keyed by the
  // renewal's own payment id. Unlike the Paddle handler — which had to INFER a renewal by comparing
  // transaction ids and got it wrong once — Whop states it outright in billing_reason.
  if (order.status === "paid") {
    const paymentId = data?.id;
    const isRenewal = data?.billing_reason === "subscription_cycle" && !!paymentId && data?.status === "paid";
    if (isRenewal) {
      const gross = plausibleAmount(data?.usd_total ?? data?.total, order.amountUsd, "renewal gross") ?? order.amountUsd;
      const net = plausibleAmount(data?.amount_after_fees, order.amountUsd, "renewal net");
      await recordAffiliateCommission({ id: paymentId!, code: paymentId!, userId: order.userId }, gross, net);
      return NextResponse.json({ ok: true, note: "subscription renewal commission recorded" });
    }
    return NextResponse.json({ ok: true, note: "already paid, duplicate delivery" });
  }

  if (data?.status !== "paid") {
    return NextResponse.json({ ok: true, note: `payment status "${data?.status}", not paid` });
  }

  // Same anti-fraud check as the Paddle/LS handlers: refuse to credit an order unless what was
  // actually purchased matches what we expect for that order's plan/kind.
  const purchasedPlanId = data?.plan?.id;
  const expectedPlanIds = expectedPlanIdsForOrder(order);
  if (!purchasedPlanId || !expectedPlanIds.includes(purchasedPlanId)) {
    console.error(
      `[whop] plan mismatch for order ${orderCode}: expected one of ${expectedPlanIds.join(", ")}, got ${purchasedPlanId}`
    );
    return NextResponse.json({ ok: true, note: "plan mismatch, ignored" });
  }

  // Gross the buyer paid, and Whop's own after-fee earnings — the affiliate commission base (the
  // analogue of Paddle's details.totals.earnings).
  const amountUsd = plausibleAmount(data?.usd_total ?? data?.total, order.amountUsd, "gross") ?? order.amountUsd;
  const netUsd = plausibleAmount(data?.amount_after_fees, order.amountUsd, "net");

  await markOrderPaid(order, amountUsd, netUsd);
  // Remember the Whop payment id so a later refund/dispute can map back. Column is still named
  // paddleTransactionId — kept as-is deliberately: it is a generic "processor transaction id" and
  // renaming it would mean a migration on the shared production DB for zero behavioural gain.
  if (data?.id) {
    await prisma.order.update({ where: { id: order.id }, data: { paddleTransactionId: data.id } });
  }

  return NextResponse.json({ ok: true, note: "matched and upgraded" });
}
