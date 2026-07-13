import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { getMasterBalances } from "@/lib/masters";

// Manual onboarding used to live here (admin typing every field for her). Replaced by the
// self-service flow: POST /api/admin/masters/invite sends her a setup link, she fills her own
// profile via POST /api/masters/onboard, and it lands here as `pending_review` for approval
// (see components/admin/MastersPanel).
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const masters = await prisma.masterProfile.findMany({ orderBy: { createdAt: "desc" } });
  // "All masters" needs at-a-glance earnings so admin isn't blind to a balance until she requests
  // it (the payouts panel only surfaces `requested` entries) — see the master's own dashboard for
  // getMasterBalances' definition.
  const withBalances = await Promise.all(
    masters.map(async (m) => ({ ...m, balances: await getMasterBalances(m.id) }))
  );
  return NextResponse.json({ masters: withBalances });
}
