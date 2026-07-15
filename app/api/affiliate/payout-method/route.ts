import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CREATOR_AFFILIATE_ENABLED } from "@/lib/featureFlags";

export async function POST(req: NextRequest) {
  // Retired — see lib/featureFlags.ts. Whop holds creators' payout details now.
  if (!CREATOR_AFFILIATE_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
