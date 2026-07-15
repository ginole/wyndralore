import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { getAffiliateBalances } from "@/lib/affiliate";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const partners = await prisma.user.findMany({
    where: { affiliateCode: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  const rows = await Promise.all(
    partners.map(async (p) => {
      const bal = await getAffiliateBalances(p.id);
      return {
        id: p.id,
        email: p.email,
        affiliateCode: p.affiliateCode,
        status: p.affiliateStatus,
        strikes: p.affiliateStrikes,
        payoutMethod: p.affiliatePayoutMethod,
        payoutHandle: p.affiliatePayoutHandle,
        heldUsd: bal.heldUsd,
        availableUsd: bal.availableUsd,
        requestedUsd: bal.requestedUsd,
        netAvailableUsd: bal.netAvailableUsd,
        clawbackUsd: bal.clawbackUsd,
        paidUsd: bal.paidUsd,
        referredUsers: bal.referredUsers,
        payingUsers: bal.payingUsers,
      };
    })
  );

  // Commission & payout log — every commission, newest first, with partner + customer emails so the
  // admin can see who earned what and which have been paid out (status "paid" + a paidAt = a payout).
  const commissions = await prisma.creatorCommission.findMany({ orderBy: { createdAt: "desc" }, take: 60 });
  const involvedIds = [...new Set(commissions.flatMap((c) => [c.creatorId, c.customerId]))];
  const involved = await prisma.user.findMany({ where: { id: { in: involvedIds } }, select: { id: true, email: true } });
  const emailById = Object.fromEntries(involved.map((u) => [u.id, u.email]));
  const activity = commissions.map((c) => ({
    id: c.id,
    createdAt: c.createdAt,
    partner: emailById[c.creatorId] ?? c.creatorId,
    customer: emailById[c.customerId] ?? c.customerId,
    tier: c.tier,
    commissionUsd: c.commissionUsd,
    status: c.status,
    paidAt: c.paidAt,
  }));

  return NextResponse.json({ partners: rows, activity });
}
