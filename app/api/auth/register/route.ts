import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, isValidEmail } from "@/lib/password";
import { setSessionCookie } from "@/lib/auth";
import { serializeUser } from "@/lib/serializeUser";
import { trackEvent, getAnonId } from "@/lib/analytics";
import { clientIpFrom } from "@/lib/adminThrottle";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";

// Cap account creation per-IP so the users table (and each bcrypt hash's CPU cost) can't be
// flooded by a script. 10 signups per hour is generous for shared/NAT IPs but stops abuse.
const REGISTER_LIMIT = 10;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit("register", clientIpFrom(req), REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds);

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
