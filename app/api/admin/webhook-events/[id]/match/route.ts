import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { markOrderPaid } from "@/lib/paymentProcessing";
import { PAYMENT_TOLERANCE_USD } from "@/lib/pricing";

// Admin manually links an unmatched/underpaid Wise payment to an order (PRD §5.4).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const event = await prisma.wiseWebhookEvent.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const orderCode = typeof body?.orderCode === "string" ? body.orderCode.trim().toUpperCase() : "";
  const order = orderCode ? await prisma.order.findUnique({ where: { code: orderCode } }) : null;
  if (!order) return NextResponse.json({ error: "Order not found for that code." }, { status: 404 });

  const amount = event.amountUsd ?? order.amountUsd;
  const nowStatus = amount >= order.amountUsd - PAYMENT_TOLERANCE_USD ? "paid" : "underpaid";

  if (nowStatus === "paid") {
    await markOrderPaid(order, amount);
  } else {
    await prisma.order.update({ where: { id: order.id }, data: { status: "underpaid", paidAmountUsd: amount } });
  }

  const updatedEvent = await prisma.wiseWebhookEvent.update({
    where: { id: event.id },
    data: { status: nowStatus === "paid" ? "matched" : "underpaid", orderId: order.id, note: `manually matched by admin` },
  });

  return NextResponse.json({ event: updatedEvent });
}
