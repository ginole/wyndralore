import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPaddleSignature, expectedPriceIdForOrder } from "@/lib/paddle";
import { markOrderPaid } from "@/lib/paymentProcessing";

// Handles the CORE product line only (membership + AI reads) — the Masters marketplace is paused
// (see lib/featureFlags.ts) and stays on its own dormant app/api/webhooks/lemonsqueezy/route.ts.
//
// NOTE: the exact JSON paths below (custom_data, totals) are Paddle's documented Transaction
// object shape but haven't yet been confirmed against a real delivered webhook — check the first
// live sandbox event closely (e.g. via a temporary console.log of the raw payload) and adjust if
// any path is wrong.
interface PaddleTransactionPayload {
  event_type?: string;
  data?: {
    id?: string;
    status?: string;
    custom_data?: { orderCode?: string } | null;
    items?: { price?: { id?: string } }[];
    details?: { totals?: { total?: string; currency_code?: string } };
    currency_code?: string;
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature");

  if (!verifyPaddleSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: PaddleTransactionPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true, note: "invalid json, ignored" });
  }

  if (payload.event_type !== "transaction.completed") {
    return NextResponse.json({ ok: true, note: "ignored event" });
  }

  const orderCode = payload.data?.custom_data?.orderCode;
  if (!orderCode) {
    console.warn("[paddle] transaction.completed webhook missing custom_data.orderCode");
    return NextResponse.json({ ok: true, note: "no orderCode in custom data" });
  }

  const order = await prisma.order.findUnique({ where: { code: orderCode } });
  if (!order) {
    console.warn(`[paddle] transaction.completed webhook for unknown order code ${orderCode}`);
    return NextResponse.json({ ok: true, note: "unmatched order" });
  }

  if (order.status === "paid") {
    return NextResponse.json({ ok: true, note: "already paid, duplicate delivery" });
  }

  if (payload.data?.status !== "completed") {
    return NextResponse.json({ ok: true, note: `transaction status "${payload.data?.status}", not completed` });
  }

  // Same anti-fraud check as the Lemon Squeezy handler: refuse to credit an order unless what was
  // actually purchased matches what we expect for that order's plan/kind.
  const purchasedPriceId = payload.data?.items?.[0]?.price?.id;
  const expectedPriceId = expectedPriceIdForOrder(order);
  if (!purchasedPriceId || purchasedPriceId !== expectedPriceId) {
    console.error(`[paddle] price mismatch for order ${orderCode}: expected ${expectedPriceId}, got ${purchasedPriceId}`);
    return NextResponse.json({ ok: true, note: "price mismatch, ignored" });
  }

  // Falls back to the order's own (pre-discount) amountUsd only if the totals path above turns
  // out wrong for a real payload — that fallback won't reflect a first-time-buyer discount, so
  // treat it as a safety net to catch during sandbox testing, not something to rely on long-term.
  const totalMinorUnits = payload.data?.details?.totals?.total;
  const amountUsd = totalMinorUnits ? Number(totalMinorUnits) / 100 : order.amountUsd;

  await markOrderPaid(order, amountUsd);

  return NextResponse.json({ ok: true, note: "matched and upgraded" });
}
