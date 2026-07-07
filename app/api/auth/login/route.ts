import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/auth";
import { serializeUser } from "@/lib/serializeUser";
import { clientIpFrom } from "@/lib/adminThrottle";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";

// Brute-force / credential-stuffing protection (OWASP A07). The admin login had a lockout but
// user login did not — a per-IP cap closes that gap. 10 attempts per 10 minutes stops both
// single-account guessing and password-spraying many emails from one IP, while staying well
// clear of a legitimate user fat-fingering their password a few times.
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit("login", clientIpFrom(req), LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds);

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
