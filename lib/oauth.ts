import crypto from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Social sign-in (Google + LINE), hand-rolled rather than pulled in with NextAuth: this app already
// owns its session (a jose JWT in `wl_session`, lib/auth.ts) and its user table, and NextAuth would
// mean a second session system to reconcile. The whole flow is ~two routes per provider.
//
// WHY THIS EXISTS (2026-07-23): the Taiwan ad cohort engages hard — 41% of visitors draw a card,
// nearly 4× the Philippines — but only 1 of 20 who hit the register wall filled in the
// email+password+confirm form. Taiwanese users expect a one-tap LINE/Google login, and the market
// is scam-wary about handing a password to a site it has never heard of. The friction is the form,
// not the offer.

export type OAuthProvider = "google" | "line";

export function isOAuthProvider(v: string): v is OAuthProvider {
  return v === "google" || v === "line";
}

/** The canonical origin. The redirect_uri must match what's registered with the provider EXACTLY,
 *  so it can't be derived from the request (a preview deployment would send a URL that isn't
 *  registered, and the provider would reject it). */
export function siteOrigin(): string {
  return process.env.NODE_ENV === "production" ? "https://wyndralore.com" : "http://localhost:3000";
}

export function redirectUri(provider: OAuthProvider): string {
  return `${siteOrigin()}/api/auth/oauth/${provider}/callback`;
}

/** Whether a provider is configured. The UI hides buttons for providers without credentials, so a
 *  half-finished setup can't show a button that dead-ends. */
export function providerConfigured(provider: OAuthProvider): boolean {
  return provider === "google"
    ? Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    : Boolean(process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET);
}

function credentials(provider: OAuthProvider): { id: string; secret: string } {
  const id = provider === "google" ? process.env.GOOGLE_CLIENT_ID : process.env.LINE_CHANNEL_ID;
  const secret = provider === "google" ? process.env.GOOGLE_CLIENT_SECRET : process.env.LINE_CHANNEL_SECRET;
  if (!id || !secret) throw new Error(`${provider} OAuth is not configured`);
  return { id, secret };
}

// ---------------------------------------------------------------------------
// The pending-login cookie
// ---------------------------------------------------------------------------

/** Everything the callback needs, parked server-side for the duration of the round trip. It is
 *  httpOnly so the browser can't rewrite it, and `state` is echoed by the provider and compared —
 *  that comparison is the CSRF defence. `ref`/`via` ride along because they live in the visitor's
 *  localStorage, which a server-side callback can't read (the password register POST forwards them
 *  in its body; an OAuth redirect has no body). */
export interface PendingLogin {
  state: string;
  verifier: string;
  next: string;
  ref?: string;
  via?: string;
}

export const OAUTH_COOKIE = "wl_oauth";
export const OAUTH_COOKIE_MAX_AGE = 10 * 60; // a login round trip is seconds; 10 min is slack

export function newPendingLogin(next: string, ref?: string, via?: string): PendingLogin {
  return {
    state: crypto.randomBytes(32).toString("base64url"),
    verifier: crypto.randomBytes(32).toString("base64url"),
    next,
    ...(ref ? { ref } : {}),
    ...(via ? { via } : {}),
  };
}

/** PKCE S256 challenge — protects the authorization code even if it leaks in transit. */
export function codeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

/** Only ever redirect to our own paths. "//evil.com" is a protocol-relative URL that browsers treat
 *  as absolute, so a leading "/" alone is NOT enough of a check (open-redirect). */
export function safeNext(raw: string | null | undefined, fallback = "/account"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

// ---------------------------------------------------------------------------
// Provider endpoints
// ---------------------------------------------------------------------------

export function authorizeUrl(provider: OAuthProvider, pending: PendingLogin): string {
  const { id } = credentials(provider);
  const common = {
    response_type: "code",
    client_id: id,
    redirect_uri: redirectUri(provider),
    state: pending.state,
    code_challenge: codeChallenge(pending.verifier),
    code_challenge_method: "S256",
  };

  if (provider === "google") {
    const params = new URLSearchParams({
      ...common,
      scope: "openid email",
      // Always show the picker: a shared machine otherwise silently signs in whoever is already
      // logged into Google, which on a phone passed between friends is a real account mix-up.
      prompt: "select_account",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  const params = new URLSearchParams({
    ...common,
    // `email` needs the Email address permission to be approved in the LINE Developers Console.
    // Until it is, LINE returns the id_token WITHOUT an email claim and we send the user back with
    // a "please use Google or email" message rather than inventing a fake address.
    scope: "openid email",
  });
  return `https://access.line.me/oauth2/v2.1/authorize?${params}`;
}

interface OAuthIdentity {
  sub: string;
  email: string | null;
}

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

/** Exchange the authorization code and return the verified identity. */
export async function exchangeCode(
  provider: OAuthProvider,
  code: string,
  verifier: string,
): Promise<OAuthIdentity> {
  const { id, secret } = credentials(provider);
  const tokenEndpoint =
    provider === "google" ? "https://oauth2.googleapis.com/token" : "https://api.line.me/oauth2/v2.1/token";

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(provider),
      client_id: id,
      client_secret: secret,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${provider} token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const token = (await res.json()) as { id_token?: string };
  if (!token.id_token) throw new Error(`${provider} returned no id_token`);

  if (provider === "google") {
    // Verify against Google's published keys — signature, issuer and audience.
    const { payload } = await jwtVerify(token.id_token, googleJwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: id,
    });
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    if (!sub) throw new Error("google id_token has no sub");
    // An UNVERIFIED address must never be trusted: matching on it would let someone who controls a
    // Workspace domain claim an existing Wyndralore account by signing up with its address.
    const emailVerified = payload.email_verified === true || payload.email_verified === "true";
    const email = typeof payload.email === "string" && emailVerified ? payload.email : null;
    return { sub, email };
  }

  // LINE's id_token is signed with the channel secret (HS256). Rather than hand-roll that
  // verification, use LINE's own verify endpoint — it checks the signature, the audience and the
  // expiry, and hands back the payload. Vendor-verified beats self-verified (this project has been
  // bitten before by a self-consistent reading of a vendor's docs).
  const verify = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: token.id_token, client_id: id }),
  });
  if (!verify.ok) {
    const text = await verify.text().catch(() => "");
    throw new Error(`line id_token verification failed (${verify.status}): ${text.slice(0, 200)}`);
  }
  const claims = (await verify.json()) as { sub?: string; email?: string };
  if (!claims.sub) throw new Error("line id_token has no sub");
  return { sub: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}
