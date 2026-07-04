import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/auth";
import { serializeUser } from "@/lib/serializeUser";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  await setSessionCookie(user.id);
  return NextResponse.json({ user: serializeUser(user) });
}
