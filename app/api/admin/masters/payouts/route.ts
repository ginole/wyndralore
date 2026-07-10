import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { payoutsDue } from "@/lib/masters";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const due = await payoutsDue();
  return NextResponse.json({
    due: due.map((d) => ({
      masterId: d.master.id,
      displayName: d.master.displayName,
      handle: d.master.handle,
      payoutMethod: d.master.payoutMethod,
      payoutHandle: d.master.payoutHandle,
      totalUsd: d.totalUsd,
      entryCount: d.entryIds.length,
    })),
  });
}
