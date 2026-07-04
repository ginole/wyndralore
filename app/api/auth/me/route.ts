import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { serializeUser } from "@/lib/serializeUser";
import { getQuotaStatus } from "@/lib/quota";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  const clientDate = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const quota = getQuotaStatus(user, clientDate);

  return NextResponse.json({ user: serializeUser(user), quota });
}
