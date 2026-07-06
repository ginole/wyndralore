import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { hashResetToken } from "@/lib/passwordReset";
import { setSessionCookie } from "@/lib/auth";
import { serializeUser } from "@/lib/serializeUser";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!token || password.length < 8) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const tokenHash = hashResetToken(token);
  const user = await prisma.user.findFirst({ where: { resetTokenHash: tokenHash } });

  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const updated = await prisma.user.update({
    where: { id: user.id },
    // Setting a password also claims a creator-outreach placeholder account (isPlaceholder→false).
    data: { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null, isPlaceholder: false },
  });

  await setSessionCookie(updated.id);
  return NextResponse.json({ user: serializeUser(updated) });
}
