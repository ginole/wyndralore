import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOwnedOrder } from "@/lib/orders";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { code } = await params;
  const order = await getOwnedOrder(code, userId);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { code } = await params;
  const order = await getOwnedOrder(code, userId);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (body?.action !== "mark_paid_attempt") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }
  if (order.status !== "pending") {
    return NextResponse.json({ order }); // idempotent no-op for awaiting_confirmation/paid/expired
  }

  const updated = await prisma.order.update({ where: { id: order.id }, data: { status: "awaiting_confirmation" } });
  return NextResponse.json({ order: updated });
}
