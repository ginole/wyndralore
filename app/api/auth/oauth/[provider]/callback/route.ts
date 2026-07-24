import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/auth";
import { trackEvent, getAnonId } from "@/lib/analytics";
import { ensureReferralCode, attributeReferral } from "@/lib/referral";
import { attributeAffiliate } from "@/lib/affiliate";
import { sendMetaRegistrationEvent } from "@/lib/metaCapi";
import {
  exchangeCode,
  isOAuthProvider,
  providerConfigured,
  safeNext,
  OAUTH_COOKIE,
  type OAuthProvider,
  type PendingLogin,
} from "@/lib/oauth";

/** Bounce back to the account page with a reason the UI can show. Keeps the 繁體 visitor in the
 *  繁體 tree — `next` already carries the locale prefix. */
function fail(req: NextRequest, next: string, reason: string) {
  const tw = next.startsWith("/tc");
  const url = new URL(tw ? "/tc/account" : "/account", req.nextUrl.origin);
  url.searchParams.set("authError", reason);
  return NextResponse.redirect(url);
}

async function findOrCreateUser(
  provider: OAuthProvider,
  identity: { sub: string; email: string },
  pending: PendingLogin,
): Promise<{ userId: string; isNew: boolean; email: string }> {
  const subField = provider === "google" ? "googleSub" : "lineSub";
  const email = identity.email.trim().toLowerCase();

  // 1) Returning social user — matched on the provider's immutable subject id, not the address.
  const bySub = await prisma.user.findFirst({ where: { [subField]: identity.sub } });
  if (bySub) return { userId: bySub.id, isNew: false, email: bySub.email };

  // 2) The address already has an account (they registered with a password, or used the other
  //    provider). Link this provider to it rather than erroring or making a duplicate. Safe only
  //    because the address is verified — see the email_verified check in lib/oauth.ts.
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    await prisma.user.update({ where: { id: byEmail.id }, data: { [subField]: identity.sub } });
    return { userId: byEmail.id, isNew: false, email: byEmail.email };
  }

  // 3) Brand new. A random passwordHash keeps the column non-null and is unguessable; if they ever
  //    want a password, "forgot password" mails them a reset link (same shape as a Whop orphan).
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(crypto.randomBytes(32).toString("hex")),
      [subField]: identity.sub,
    },
  });
  const user = await ensureReferralCode(created);
  await attributeReferral(user, pending.ref);
  await attributeAffiliate(user, pending.via);
  return { userId: user.id, isNew: true, email: user.email };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const raw = req.cookies.get(OAUTH_COOKIE)?.value;

  let pending: PendingLogin | null = null;
  try {
    pending = raw ? (JSON.parse(raw) as PendingLogin) : null;
  } catch {
    pending = null;
  }
  const next = safeNext(pending?.next);

  if (!isOAuthProvider(provider) || !providerConfigured(provider)) return fail(req, next, "unavailable");
  // The visitor pressed cancel on the provider's consent screen — not an error, just a no.
  if (req.nextUrl.searchParams.get("error")) return fail(req, next, "canceled");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  // The state echoed by the provider must match the one in our httpOnly cookie. timingSafeEqual
  // needs equal lengths, so compare digests rather than the raw strings.
  const stateOk =
    pending != null &&
    state != null &&
    crypto.timingSafeEqual(
      crypto.createHash("sha256").update(state).digest(),
      crypto.createHash("sha256").update(pending.state).digest(),
    );
  if (!code || !stateOk) return fail(req, next, "expired");

  let identity: { sub: string; email: string | null };
  try {
    identity = await exchangeCode(provider, code, pending!.verifier);
  } catch (err) {
    console.error(`[oauth:${provider}] exchange failed:`, err);
    return fail(req, next, "failed");
  }

  // LINE only releases the address once the Email address permission is approved in the LINE
  // Developers Console. Without it we'd have to invent an address, which would silently break
  // receipts, password reset and every email we ever send them — better to say so and offer the
  // other doors.
  if (!identity.email) return fail(req, next, "noEmail");

  let result: { userId: string; isNew: boolean; email: string };
  try {
    result = await findOrCreateUser(provider, { sub: identity.sub, email: identity.email }, pending!);
  } catch (err) {
    console.error(`[oauth:${provider}] user upsert failed:`, err);
    return fail(req, next, "failed");
  }

  await setSessionCookie(result.userId);
  if (result.isNew) {
    await trackEvent("signup", {
      anonId: await getAnonId(),
      userId: result.userId,
      props: { method: provider },
    });
    // Server-side, because there is no reliable client moment here: the browser is mid-redirect
    // back from the provider, so the pixel's CompleteRegistration (fired inline on the password
    // form) has nowhere to run.
    await sendMetaRegistrationEvent({ email: result.email, eventId: `signup-${result.userId}` });
  }

  const res = NextResponse.redirect(new URL(next, req.nextUrl.origin));
  res.cookies.delete(OAUTH_COOKIE);
  return res;
}
