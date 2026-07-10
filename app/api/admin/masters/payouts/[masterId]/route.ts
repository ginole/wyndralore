import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { payoutsDue, markMasterPaidOut } from "@/lib/masters";
import { sendEmail, masterPayoutSentEmail } from "@/lib/email";
import { trackEvent } from "@/lib/analytics";

// Admin confirms they've actually sent a master her commission (PayPal/Wise, by hand) — flips
// every `available` ledger entry for her to `paid_out` and emails her a confirmation with the
// amount, so she has her own record without needing to check the dashboard. This never moves
// money itself; it's the bookkeeping step after the real transfer, same spirit as the admin
// manual-grant fallback.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ masterId: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { masterId } = await params;

  // Capture what's owed BEFORE flipping the ledger, so the confirmation email states the exact
  // amount that's about to be marked paid.
  const due = (await payoutsDue()).find((d) => d.master.id === masterId);
  const count = await markMasterPaidOut(masterId);
  await trackEvent("admin_manual_grant", { props: { kind: "master_payout", masterId, entriesFlipped: count } });

  if (count > 0 && due) {
    const master = await prisma.masterProfile.findUnique({ where: { id: masterId }, include: { user: true } });
    if (master) {
      const { subject, html } = masterPayoutSentEmail(master.displayName, due.totalUsd);
      const sent = await sendEmail({ to: master.user.email, subject, html });
      if (!sent.ok) console.error(`[admin/masters/payouts] payout-confirmation email failed for master ${masterId}:`, sent.error);
    }
  }

  return NextResponse.json({ ok: true, entriesFlipped: count });
}
