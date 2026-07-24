import { NextRequest, NextResponse } from "next/server";
import {
  authorizeUrl,
  isOAuthProvider,
  newPendingLogin,
  providerConfigured,
  safeNext,
  OAUTH_COOKIE,
  OAUTH_COOKIE_MAX_AGE,
} from "@/lib/oauth";

/** Kick off a social login. The client links here (rather than fetch()ing) because the browser has
 *  to make a top-level navigation to the provider. `?next=` is where to land afterwards — the
 *  register wall passes the reading the visitor was on; `?ref=`/`?via=` are the referral and
 *  affiliate codes the client reads out of localStorage, parked in the cookie because the callback
 *  can't read localStorage. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isOAuthProvider(provider) || !providerConfigured(provider)) {
    return NextResponse.redirect(new URL("/account", req.nextUrl.origin));
  }

  const sp = req.nextUrl.searchParams;
  const pending = newPendingLogin(
    safeNext(sp.get("next")),
    sp.get("ref") ?? undefined,
    sp.get("via") ?? undefined,
  );

  const res = NextResponse.redirect(authorizeUrl(provider, pending));
  res.cookies.set(OAUTH_COOKIE, JSON.stringify(pending), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // "lax" (not "strict"): the callback arrives as a top-level GET navigation from the provider's
    // domain, and a strict cookie would not be sent on it — the login would fail every time.
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE,
  });
  return res;
}
