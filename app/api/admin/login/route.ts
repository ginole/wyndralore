import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, setAdminSessionCookie } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  await setAdminSessionCookie();
  return NextResponse.json({ ok: true });
}
