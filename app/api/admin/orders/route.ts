import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status")?.trim();
  const q = req.nextUrl.searchParams.get("q")?.trim();

  const orders = await prisma.order.findMany({
    where: {
      ...(status && status !== "all" ? { status } : {}),
      ...(q ? { OR: [{ code: { contains: q } }, { user: { email: { contains: q } } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      code: true,
      plan: true,
      kind: true,
      amountUsd: true,
      status: true,
      createdAt: true,
      paidAt: true,
      paidAmountUsd: true,
      user: { select: { email: true } },
    },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      code: o.code,
      email: o.user.email,
      plan: o.plan,
      kind: o.kind,
      amountUsd: o.amountUsd,
      status: o.status,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      paidAmountUsd: o.paidAmountUsd,
    })),
  });
}
