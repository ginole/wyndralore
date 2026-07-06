import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, setAdminSessionCookie } from "@/lib/adminAuth";
import { clientIpFrom, getLockStatus, recordFailedAttempt, clearThrottle } from "@/lib/adminThrottle";

function lockedResponse(retryAfterSeconds: number) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  const label = minutes >= 60 ? `${Math.ceil(minutes / 60)} hour(s)` : `${minutes} minute(s)`;
  return NextResponse.json(
    { error: `Too many failed attempts. Try again in ~${label}.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function POST(req: NextRequest) {
  const ip = clientIpFrom(req);

  // Reject early if this IP is already locked out — don't even check the password.
  const lock = await getLockStatus(ip);
  if (lock.locked) return lockedResponse(lock.retryAfterSeconds ?? 3600);

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!checkAdminPassword(password)) {
    const afterFail = await recordFailedAttempt(ip);
    if (afterFail.locked) return lockedResponse(afterFail.retryAfterSeconds ?? 3600);
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  await clearThrottle(ip);
  await setAdminSessionCookie();
  return NextResponse.json({ ok: true });
}
