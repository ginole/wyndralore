import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";
import { releaseMaturedCommissions } from "@/lib/affiliate";

// Daily: move affiliate commissions out of their 30-day refund hold into "available" so partners
// can withdraw them.
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const released = await releaseMaturedCommissions();
  return NextResponse.json({ ok: true, released });
}
