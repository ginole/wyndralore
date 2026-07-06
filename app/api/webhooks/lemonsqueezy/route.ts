import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyLemonSqueezySignature, expectedVariantIdForOrder } from "@/lib/lemonsqueezy";
import { markOrderPaid } from "@/lib/paymentProcessing";

interface LemonSqueezyOrderPayload {
  meta?: { event_name?: string; custom_data?: { order_code?: string; affiliate_id?: string } };
  data?: { attributes?: { status?: string; total_usd?: number; total?: number; first_order_item?: { variant_id?: number | string } } };
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
