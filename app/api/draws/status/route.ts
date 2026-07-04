import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuotaStatus } from "@/lib/quota";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authenticated: false });

  const clientDate = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  return NextResponse.json({ authenticated: true, quota: getQuotaStatus(user, clientDate) });
}
