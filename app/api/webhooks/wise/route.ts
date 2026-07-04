import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWiseSignature, normalizeWisePayload } from "@/lib/wise";
import { extractOrderCode } from "@/lib/orderCode";
import { markOrderPaid } from "@/lib/paymentProcessing";

// PRD §5.2: HTTPS, always 200, verify Wise signature, idempotent, raw payload archived.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature-sha256") ?? req.headers.get("x-signature");

  if (!verifyWiseSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // Malformed body isn't something Wise will fix by retrying differently — ack it away.
    return NextResponse.json({ ok: true, note: "invalid json, ignored" });
  }

  const { eventKey, amountUsd, referenceText } = normalizeWisePayload(rawBody, payload);

  const existing = await prisma.wiseWebhookEvent.findUnique({ where: { eventKey } });
  if (existing) {
    return NextResponse.json({ ok: true, note: "duplicate delivery, already processed" });
  }

  const orderCode = referenceText ? extractOrderCode(referenceText) : null;
  const order = orderCode ? await prisma.order.findUnique({ where: { code: orderCode } }) : null;

  if (!order) {
    await prisma.wiseWebhookEvent.create({
      data: { eventKey, rawPayload: rawBody, status: "unmatched", amountUsd, referenceText, note: "no matching order code found" },
    });
    return NextResponse.json({ ok: true, note: "unmatched" });
  }

  if (order.status === "paid") {
    await prisma.wiseWebhookEvent.create({
      data: {
        eventKey,
        rawPayload: rawBody,
        status: "duplicate",
        amountUsd,
        referenceText,
        orderId: order.id,
        note: "order already paid — second payment queued for manual review",
      },
    });
    return NextResponse.json({ ok: true, note: "order already paid" });
  }

  if (order.status === "expired") {
    await prisma.wiseWebhookEvent.create({
      data: {
        eventKey,
        rawPayload: rawBody,
        status: "unmatched",
        amountUsd,
        referenceText,
        orderId: order.id,
        note: "payment arrived after the order expired",
      },
    });
    return NextResponse.json({ ok: true, note: "order expired" });
  }

  if (amountUsd === null) {
    await prisma.wiseWebhookEvent.create({
      data: { eventKey, rawPayload: rawBody, status: "unmatched", referenceText, orderId: order.id, note: "could not parse amount from payload" },
    });
    return NextResponse.json({ ok: true, note: "amount unparseable" });
  }

  if (amountUsd < order.amountUsd) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "underpaid", paidAmountUsd: amountUsd } });
    await prisma.wiseWebhookEvent.create({
      data: { eventKey, rawPayload: rawBody, status: "underpaid", amountUsd, referenceText, orderId: order.id },
    });
    return NextResponse.json({ ok: true, note: "underpaid" });
  }

  // amountUsd >= order.amountUsd: overpayment is accepted, difference isn't refunded (PRD §4.3/§5.3).
  await markOrderPaid(order, amountUsd);
  await prisma.wiseWebhookEvent.create({
    data: { eventKey, rawPayload: rawBody, status: "matched", amountUsd, referenceText, orderId: order.id },
  });

  return NextResponse.json({ ok: true, note: "matched and upgraded" });
}
