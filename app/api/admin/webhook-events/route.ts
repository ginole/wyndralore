import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const events = await prisma.wiseWebhookEvent.findMany({
    where: { status: { in: ["unmatched", "underpaid", "duplicate"] } },
    orderBy: { receivedAt: "desc" },
    take: 100,
    include: { order: { select: { code: true, plan: true, amountUsd: true, userId: true } } },
  });

  return NextResponse.json({ events });
}
