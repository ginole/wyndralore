import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, isValidEmail } from "@/lib/password";
import { setSessionCookie } from "@/lib/auth";
import { serializeUser } from "@/lib/serializeUser";
import { trackEvent, getAnonId } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash } });
  await setSessionCookie(user.id);
  await trackEvent("signup", { anonId: await getAnonId(), userId: user.id });

  return NextResponse.json({ user: serializeUser(user) }, { status: 201 });
}
