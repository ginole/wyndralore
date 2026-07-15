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
        netAvailableUsd: bal.netAvailableUsd,
        clawbackUsd: bal.clawbackUsd,
        paidUsd: bal.paidUsd,
        referredUsers: bal.referredUsers,
        payingUsers: bal.payingUsers,
      };
    })
  );
  return NextResponse.json({ partners: rows });
}
