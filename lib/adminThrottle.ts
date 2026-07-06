import crypto from "node:crypto";
import { prisma } from "./db";

// Brute-force policy for the admin login: 3 consecutive failures triggers a lockout, and the
// lockout escalates — the 1st is 1 hour, the 2nd and beyond are 24 hours. A successful login
// clears everything for that IP.
const FAILS_PER_LOCKOUT = 3;
const FIRST_LOCKOUT_MS = 60 * 60 * 1000; // 1 hour
const REPEAT_LOCKOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Derives the client IP from proxy headers (Vercel sets x-forwarded-for; Next 16 removed req.ip). */
export function clientIpFrom(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Hash the IP with the session secret so we never persist a raw address. */
function hashIp(ip: string): string {
  const secret = process.env.SESSION_SECRET ?? "";
  return crypto.createHash("sha256").update(`${ip}::${secret}`).digest("hex");
}

export interface LockStatus {
  locked: boolean;
  retryAfterSeconds?: number;
}

/** Read-only check: is this IP currently locked out? Call before verifying the password. */
export async function getLockStatus(ip: string): Promise<LockStatus> {
  const row = await prisma.adminLoginThrottle.findUnique({ where: { ipHash: hashIp(ip) } });
  if (row?.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
    return { locked: true, retryAfterSeconds: Math.ceil((row.lockedUntil.getTime() - Date.now()) / 1000) };
  }
  return { locked: false };
}

/**
 * Record a failed attempt. Returns the resulting lock status so the caller can surface a
 * lockout that this very attempt triggered. Uses a transaction to avoid races between
 * concurrent attempts from the same IP.
 */
export async function recordFailedAttempt(ip: string): Promise<LockStatus> {
  const ipHash = hashIp(ip);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.adminLoginThrottle.findUnique({ where: { ipHash } });

    // If a previous lockout has expired, that window is over — start counting fresh, but keep
    // the escalation tier (lockoutCount) so repeat offenders jump straight to 24h.
    const priorFails = existing && (!existing.lockedUntil || existing.lockedUntil.getTime() <= now.getTime()) ? existing.failedCount : existing?.failedCount ?? 0;
    const failedCount = priorFails + 1;

    let lockedUntil: Date | null = existing?.lockedUntil ?? null;
    let lockoutCount = existing?.lockoutCount ?? 0;

    if (failedCount >= FAILS_PER_LOCKOUT) {
      lockoutCount += 1;
      const durationMs = lockoutCount >= 2 ? REPEAT_LOCKOUT_MS : FIRST_LOCKOUT_MS;
      lockedUntil = new Date(now.getTime() + durationMs);
    }

    const row = await tx.adminLoginThrottle.upsert({
      where: { ipHash },
      create: { ipHash, failedCount, lockoutCount, lockedUntil, lastAttemptAt: now },
      update: {
        // Reset the per-window counter to 0 once it triggered a lockout, so the next window
        // needs another full FAILS_PER_LOCKOUT misses.
        failedCount: failedCount >= FAILS_PER_LOCKOUT ? 0 : failedCount,
        lockoutCount,
        lockedUntil,
        lastAttemptAt: now,
      },
    });

    if (row.lockedUntil && row.lockedUntil.getTime() > now.getTime()) {
      return { locked: true, retryAfterSeconds: Math.ceil((row.lockedUntil.getTime() - now.getTime()) / 1000) };
    }
    return { locked: false };
  });
}

/** Clear all throttle state for an IP after a successful login. */
export async function clearThrottle(ip: string): Promise<void> {
  await prisma.adminLoginThrottle.deleteMany({ where: { ipHash: hashIp(ip) } });
}
