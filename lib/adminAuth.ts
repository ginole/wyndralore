import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "wl_admin";
const ADMIN_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected) && password === expected;
}

export async function setAdminSessionCookie() {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_TTL_SECONDS}s`)
    .sign(getSecret());
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_TTL_SECONDS,
  });
}

export async function clearAdminSessionCookie() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}
