import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

export const SESSION_COOKIE = "wl_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string) {
  const token = await signSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  return session?.userId ?? null;
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}
