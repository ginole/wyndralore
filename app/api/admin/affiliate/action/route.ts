import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { payoutPartner } from "@/lib/affiliate";
import { sendEmail, masterPayoutSentEmail } from "@/lib/email";
import { trackEvent } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const action = body?.action;

  if (action === "pay") {
    const creatorId = typeof body?.creatorId === "string" ? body.creatorId : "";
    const partner = await prisma.user.findUnique({ where: { id: creatorId } });
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    const amount = await payoutPartner(creatorId);
    if (amount > 0) {
      const { subject, html } = masterPayoutSentEmail(partner.email, amount);
      await sendEmail({ to: partner.email, subject, html });
      await trackEvent("affiliate_payout_sent", { userId: creatorId, props: { amountUsd: amount } });
    }
    return NextResponse.json({ ok: true, amount });
  }

  if (action === "pause" || action === "reactivate") {
    const creatorId = typeof body?.creatorId === "string" ? body.creatorId : "";
    const updated = await prisma.user.update({
      where: { id: creatorId },
      data: { affiliateStatus: action === "pause" ? "paused" : "active", ...(action === "reactivate" ? { affiliateStrikes: 0 } : {}) },
    });
    return NextResponse.json({ ok: true, status: updated.affiliateStatus });
  }

  if (action === "blacklist" || action === "unblacklist") {
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) return NextResponse.json({ error: "No customer with that email" }, { status: 404 });
    await prisma.user.update({ where: { id: target.id }, data: { affiliateBlacklisted: action === "blacklist" } });
    return NextResponse.json({ ok: true, blacklisted: action === "blacklist" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
