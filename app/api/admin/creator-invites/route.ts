import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const invites = await prisma.creatorInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { isPlaceholder: true, plan: true, planExpiresAt: true } } },
  });

  return NextResponse.json({
    invites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      affiliateLink: i.affiliateLink,
      wasNewAccount: i.wasNewAccount,
      planGranted: i.planGranted,
      emailSent: i.emailSent,
      createdAt: i.createdAt,
      // A placeholder that's since flipped to false means the creator claimed their account.
      claimed: i.wasNewAccount ? !i.user.isPlaceholder : true,
      currentPlan: i.user.plan,
      planExpiresAt: i.user.planExpiresAt,
    })),
  });
}
