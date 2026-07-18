import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, isValidEmail, passwordProblem } from "@/lib/password";
import { setSessionCookie } from "@/lib/auth";
import { serializeUser } from "@/lib/serializeUser";
import { trackEvent, getAnonId } from "@/lib/analytics";
import { clientIpFrom } from "@/lib/adminThrottle";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";
import { ensureReferralCode, attributeReferral } from "@/lib/referral";
import { attributeAffiliate } from "@/lib/affiliate";

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
  const pwProblem = passwordProblem(password, email);
  if (pwProblem) {
    return NextResponse.json({ error: pwProblem }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const created = await prisma.user.create({ data: { email, passwordHash } });

  // Give the new account its own invite code, and record who referred them (if they arrived via
  // a ?ref= link the client forwarded). The referrer's reward is only paid once this account
  // actually completes a reading — see creditReferrerForReading in the draw-consume route.
  const referralCode = typeof body?.referralCode === "string" ? body.referralCode : undefined;
  const user = await ensureReferralCode(created);
  await attributeReferral(user, referralCode);
  // Also record a creator-affiliate referral (?via=), if any — this drives cash commission, separate
  // from the friend-referral credits above.
  await attributeAffiliate(user, typeof body?.viaCode === "string" ? body.viaCode : undefined);

  await setSessionCookie(user.id);
  await trackEvent("signup", { anonId: await getAnonId(), userId: user.id, props: referralCode ? { referred: true } : undefined });

  return NextResponse.json({ user: serializeUser(user) }, { status: 201 });
}
