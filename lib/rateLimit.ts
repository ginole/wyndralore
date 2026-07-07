import crypto from "node:crypto";
import { prisma } from "./db";

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the current window resets — only meaningful when `allowed` is false. */
  retryAfterSeconds: number;
}

/** Hash the identity with the session secret so a raw IP/email is never persisted (same stance
 * as lib/adminThrottle's IP hashing). The bucket keeps different endpoints' counters separate. */
function hashKey(bucket: string, identity: string): string {
  const secret = process.env.SESSION_SECRET ?? "";
  return crypto.createHash("sha256").update(`${bucket}::${identity}::${secret}`).digest("hex");
}

/**
 * Fixed-window rate limiter backed by a single Postgres row per (bucket, identity). Used to cap
 * abuse/cost on unauthenticated or high-risk endpoints (free AI reads, login, register, password
 * reset). The whole read-modify-write runs in a transaction so concurrent requests from the same
 * identity can't both slip past the limit via a race.
 *
 * Returns `{ allowed: false }` once `limit` requests have been made inside `windowMs`; the window
 * then rolls forward from the first request in it.
 */
export async function checkRateLimit(
  bucket: string,
  identity: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const key = hashKey(bucket, identity);
  const now = Date.now();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.rateLimit.findUnique({ where: { key } });

    // Window still open — count this request against it.
    if (existing && now - existing.windowStart.getTime() < windowMs) {
      if (existing.count >= limit) {
        const retryAfterSeconds = Math.max(1, Math.ceil((existing.windowStart.getTime() + windowMs - now) / 1000));
        return { allowed: false, retryAfterSeconds };
      }
      await tx.rateLimit.update({ where: { key }, data: { count: existing.count + 1 } });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    // First request, or the previous window has fully elapsed — start a fresh window at 1.
    await tx.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowStart: new Date(now) },
      update: { count: 1, windowStart: new Date(now) },
    });
    return { allowed: true, retryAfterSeconds: 0 };
  });
}

/** Standard 429 response for a tripped limit, including a Retry-After header. */
export function rateLimitedResponse(retryAfterSeconds: number) {
  return Response.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
