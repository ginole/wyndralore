import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.affiliateCode) return NextResponse.json({ error: "Not a partner." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const method = body?.method === "wise" ? "wise" : body?.method === "paypal" ? "paypal" : null;
  const handle = typeof body?.handle === "string" ? body.handle.trim() : "";
  if (!method || !handle) {
    return NextResponse.json({ error: "Choose a method and enter your payout handle." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { affiliatePayoutMethod: method, affiliatePayoutHandle: handle.slice(0, 200) },
  });
  return NextResponse.json({ ok: true });
}
