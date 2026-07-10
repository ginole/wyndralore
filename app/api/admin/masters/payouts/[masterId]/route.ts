import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { markMasterPaidOut } from "@/lib/masters";
import { trackEvent } from "@/lib/analytics";

// Admin confirms they've actually sent a master her commission (PayPal/Wise, by hand) — flips
// every `available` ledger entry for her to `paid_out`. This never moves money itself; it's the
// bookkeeping step after the real transfer, same spirit as the admin manual-grant fallback.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ masterId: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { masterId } = await params;
  const count = await markMasterPaidOut(masterId);
  await trackEvent("admin_manual_grant", { props: { kind: "master_payout", masterId, entriesFlipped: count } });
  return NextResponse.json({ ok: true, entriesFlipped: count });
}
