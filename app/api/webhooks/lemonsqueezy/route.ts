import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyLemonSqueezySignature, expectedVariantIdForOrder, expectedVariantIdForMasterOrder } from "@/lib/lemonsqueezy";
import { markOrderPaid } from "@/lib/paymentProcessing";
import { isMasterProductKind, markMasterOrderPaid } from "@/lib/masters";
import { sendEmail, masterDeliveryRequestEmail } from "@/lib/email";
import { trackEvent } from "@/lib/analytics";

interface LemonSqueezyOrderPayload {
  meta?: { event_name?: string; custom_data?: { order_code?: string; affiliate_id?: string } };
  data?: {
    id?: string;
    attributes?: { status?: string; total_usd?: number; total?: number; first_order_item?: { variant_id?: number | string } };
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");

  if (!verifyLemonSqueezySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LemonSqueezyOrderPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // Malformed body isn't something Lemon Squeezy will fix by retrying differently — ack it away.
    return NextResponse.json({ ok: true, note: "invalid json, ignored" });
  }

  if (payload.meta?.event_name !== "order_created") {
    return NextResponse.json({ ok: true, note: "ignored event" });
  }

  const orderCode = payload.meta?.custom_data?.order_code;
  if (!orderCode) {
    console.warn("[lemonsqueezy] order_created webhook missing custom_data.order_code");
    return NextResponse.json({ ok: true, note: "no order_code in custom data" });
  }

  // "Meet Our Masters" storefront orders use a disjoint code namespace ("WL-M-XXXX" vs. the
  // membership/AI-read "WL-XXXX") so one webhook endpoint can safely dispatch on the prefix.
  if (orderCode.startsWith("WL-M-")) {
    return handleMasterOrderWebhook(payload, orderCode);
  }

  const order = await prisma.order.findUnique({ where: { code: orderCode } });
  if (!order) {
    console.warn(`[lemonsqueezy] order_created webhook for unknown order code ${orderCode}`);
    return NextResponse.json({ ok: true, note: "unmatched order" });
  }

  if (order.status === "paid") {
    return NextResponse.json({ ok: true, note: "already paid, duplicate delivery" });
  }

  const status = payload.data?.attributes?.status;
  if (status !== "paid") {
    return NextResponse.json({ ok: true, note: `order status "${status}", not paid` });
  }

  // A checkout for one product (e.g. the $1.99 AI-read add-on) can have its custom_data
  // order_code pointed at a completely different order (e.g. a $79 lifetime plan) since we
  // don't control what the buyer puts in the checkout URL. Refuse to credit an order unless
  // what was actually purchased matches what we expect for that order's plan/kind.
  const purchasedVariantId = payload.data?.attributes?.first_order_item?.variant_id;
  const expectedVariantId = expectedVariantIdForOrder(order);
  if (purchasedVariantId === undefined || String(purchasedVariantId) !== expectedVariantId) {
    console.error(
      `[lemonsqueezy] variant mismatch for order ${orderCode}: expected ${expectedVariantId}, got ${purchasedVariantId}`
    );
    return NextResponse.json({ ok: true, note: "variant mismatch, ignored" });
  }

  // total_usd is in cents; fall back to total (also cents, store's own currency — our store is USD).
  const totalCents = payload.data?.attributes?.total_usd ?? payload.data?.attributes?.total ?? 0;
  const amountUsd = totalCents / 100;

  // Passed through from our own checkout's custom_data (AI-reading PRD §3) — NOT Lemon
  // Squeezy's built-in affiliate marketplace, which we haven't verified exposes a webhook
  // field for this. Only captured if the checkout that created this order set it.
  const affiliateId = payload.meta?.custom_data?.affiliate_id;
  if (affiliateId && !order.affiliateId) {
    await prisma.order.update({ where: { id: order.id }, data: { affiliateId } });
  }

  await markOrderPaid(order, amountUsd);

  return NextResponse.json({ ok: true, note: "matched and upgraded" });
}

/** Handles a "WL-M-" storefront order — a purchase from a master's storefront. */
async function handleMasterOrderWebhook(payload: LemonSqueezyOrderPayload, orderCode: string): Promise<NextResponse> {
  const order = await prisma.masterOrder.findUnique({ where: { code: orderCode }, include: { master: true } });
  if (!order) {
    console.warn(`[lemonsqueezy] order_created webhook for unknown master order code ${orderCode}`);
    return NextResponse.json({ ok: true, note: "unmatched master order" });
  }
  if (order.status !== "pending") {
    return NextResponse.json({ ok: true, note: "already processed, duplicate delivery" });
  }

  const status = payload.data?.attributes?.status;
  if (status !== "paid") {
    return NextResponse.json({ ok: true, note: `order status "${status}", not paid` });
  }

  if (!isMasterProductKind(order.kind)) {
    console.error(`[lemonsqueezy] master order ${orderCode} has an unrecognised kind "${order.kind}"`);
    return NextResponse.json({ ok: true, note: "unrecognised kind, ignored" });
  }

  // Same anti-fraud check as the membership/AI-read path above: refuse to credit unless what was
  // actually purchased matches the product this order was created for.
  const purchasedVariantId = payload.data?.attributes?.first_order_item?.variant_id;
  const expectedVariantId = expectedVariantIdForMasterOrder(order.kind);
  if (purchasedVariantId === undefined || String(purchasedVariantId) !== expectedVariantId) {
    console.error(`[lemonsqueezy] variant mismatch for master order ${orderCode}: expected ${expectedVariantId}, got ${purchasedVariantId}`);
    return NextResponse.json({ ok: true, note: "variant mismatch, ignored" });
  }

  const lsOrderId = payload.data?.id;
  if (!lsOrderId) {
    console.error(`[lemonsqueezy] master order ${orderCode} webhook missing data.id — cannot record for future refund`);
    return NextResponse.json({ ok: true, note: "missing LS order id, ignored" });
  }

  const totalCents = payload.data?.attributes?.total_usd ?? payload.data?.attributes?.total ?? 0;
  const amountUsd = totalCents / 100;

  const result = await markMasterOrderPaid(order, order.master, { lsOrderId, amountUsd });
  if (!result.claimed) {
    return NextResponse.json({ ok: true, note: "already claimed by a concurrent delivery" });
  }

  await trackEvent("payment_completed", { userId: order.buyerId, props: { masterOrder: true, kind: order.kind, amountUsd } });

  if (order.kind === "live_voice" && result.uploadToken) {
    const uploadLink = `https://wyndralore.com/deliver/${result.uploadToken}`;
    const deliverByLabel = order.master.slaHours ? `within ${order.master.slaHours} hours` : "soon";
    const master = await prisma.user.findUnique({ where: { id: order.master.userId } });
    if (master) {
      const { subject, html } = masterDeliveryRequestEmail(order.question ?? undefined, deliverByLabel, uploadLink);
      const sent = await sendEmail({ to: master.email, subject, html });
      if (!sent.ok) console.error(`[lemonsqueezy] delivery-request email failed for master order ${orderCode}:`, sent.error);
    }
  }

  return NextResponse.json({ ok: true, note: "master order paid" });
}
