import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyLemonSqueezySignature } from "@/lib/lemonsqueezy";
import { markOrderPaid } from "@/lib/paymentProcessing";

interface LemonSqueezyOrderPayload {
  meta?: { event_name?: string; custom_data?: { order_code?: string } };
  data?: { attributes?: { status?: string; total_usd?: number; total?: number } };
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

  // total_usd is in cents; fall back to total (also cents, store's own currency — our store is USD).
  const totalCents = payload.data?.attributes?.total_usd ?? payload.data?.attributes?.total ?? 0;
  const amountUsd = totalCents / 100;

  await markOrderPaid(order, amountUsd);

  return NextResponse.json({ ok: true, note: "matched and upgraded" });
}
