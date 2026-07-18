import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWhopSignature, expectedPlanIdsForOrder } from "@/lib/whop";
import { markOrderPaid } from "@/lib/paymentProcessing";
import { reverseAffiliateCommission, recordAffiliateCommission } from "@/lib/affiliate";
import { creditOrphanedWhopPayment } from "@/lib/whopOrphanPayment";
import {
  linkMembershipToUser,
  applyMembershipUpdate,
  markMembershipCanceled,
  extendPlanForRenewal,
  WhopMembershipData,
} from "@/lib/subscription";

// Handles the CORE product line only (membership + AI reads) — the Masters marketplace is paused
// (see lib/featureFlags.ts) and stays on its own dormant app/api/webhooks/lemonsqueezy/route.ts.
// Replaces the Paddle webhook after Paddle rejected the domain on category grounds; markOrderPaid()
// is reused untouched, as it was across the LS → Paddle move.
//
// The webhook is registered with **api_version "v1"** on purpose (see lib/whop.ts). Whop's default
// is v2, which is a different protocol entirely: it names the event field `action`, and it
// "authenticates" by posting the shared secret back to you in plain text in a `webhook-secret`
// header — no HMAC, so no body integrity and no replay protection. v1 is the Standard-Webhooks-shaped
// one (`type` field, signed `webhook-signature`), which is both safer and what the official SDK's
// types describe. v1 also accepts membership.activated/deactivated, which v2 rejects.
//
// ⚠️ The converse, confirmed against the live API 2026-07-18: **v1 REJECTS membership.went_valid and
// membership.went_invalid** (422 "not a valid event" on PATCH /v1/webhooks/…), so the two branches
// below that handle them are UNREACHABLE and must not be relied on. They are kept only because they
// cost nothing and would become live if this ever moved to v2 — which it should not, v2 having no
// HMAC. The practical consequence is that renewal access extension cannot come from a membership
// event: it comes from payment.succeeded → extendPlanForRenewal (see lib/subscription.ts).
//
// Event names arrive dotted (`payment.succeeded`); eventKey() folds them to underscores so the
// branches read like the names used at registration. Keep it: the two shapes are genuinely mixed
// across Whop's own surfaces (its `testable_events` list has `payment.succeeded` and
// `membership_went_valid` side by side), and matching only one form fails silently.
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
  user?: { email?: string | null } | null;
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

  // No orderCode means the buyer never went through our checkout — they bought directly on Whop,
  // where plans stay publicly purchasable whatever their visibility is set to. Rare, but "we took
  // the money and granted nothing" is not an acceptable resting state, so match them by their Whop
  // account's email and credit it. See lib/whopOrphanPayment.ts.
  if (!orderCode) {
    if (data?.status !== "paid" || !data?.id || !data?.plan?.id || !data?.user?.email) {
      console.warn(
        `[whop] payment ${data?.id} has no orderCode and cannot be matched ` +
          `(status=${data?.status}, plan=${data?.plan?.id}, hasEmail=${!!data?.user?.email})`
      );
      return NextResponse.json({ ok: true, note: "no orderCode and not matchable" });
    }
    const note = await creditOrphanedWhopPayment({
      paymentId: data.id,
      whopPlanId: data.plan.id,
      email: data.user.email,
      amountUsd: data.usd_total ?? data.total ?? 0,
      netUsd: data.amount_after_fees ?? undefined,
    });
    return NextResponse.json({ ok: true, note: `orphaned payment: ${note}` });
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
      // Extend access from the payment itself rather than trusting a membership event to arrive.
      // See extendPlanForRenewal — this is the path that keeps a renewal from silently granting
      // nothing, and it is idempotent against the membership path.
      const extended = await extendPlanForRenewal(order);
      const user = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { planExpiresAt: true },
      });
      // The one outcome that must never pass quietly: we took a renewal payment and the buyer's
      // access still runs out. Shout, because this is otherwise invisible until they complain.
      if (user?.planExpiresAt && user.planExpiresAt.getTime() < Date.now()) {
        console.error(
          `[whop] RENEWAL PAID BUT ACCESS STILL EXPIRED — order ${order.code}, user ${order.userId}, ` +
            `plan "${order.plan}", expiry ${user.planExpiresAt.toISOString()}. Grant it by hand in /admin.`
        );
      }
      return NextResponse.json({
        ok: true,
        note: `subscription renewal commission recorded${extended ? ", access extended" : ""}`,
      });
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
