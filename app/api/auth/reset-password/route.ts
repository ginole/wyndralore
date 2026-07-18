import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, passwordProblem } from "@/lib/password";
import { hashResetToken } from "@/lib/passwordReset";
import { setSessionCookie } from "@/lib/auth";
import { serializeUser } from "@/lib/serializeUser";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!token) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const tokenHash = hashResetToken(token);
  const user = await prisma.user.findFirst({ where: { resetTokenHash: tokenHash } });

  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  // Same strength rules as registration. This used to check only the length, which meant a reset
  // could quietly walk a good password back down to "12345678" — and reset is also the path every
  // creator-invite and orphan-payment placeholder account uses to set its FIRST password, so it is
  // not the rare branch it looks like. Checked after the token, so it can name the account's own
  // email without revealing whether an arbitrary token was valid.
  const pwProblem = passwordProblem(password, user.email);
  if (pwProblem) {
    return NextResponse.json({ error: pwProblem }, { status: 400 });
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
