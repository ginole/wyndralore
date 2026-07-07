import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { isValidEmail } from "@/lib/password";
import { grantExtraAiReads } from "@/lib/aiQuota";
import { trackEvent } from "@/lib/analytics";

// Manual fallback for the rare Lemon Squeezy webhook that never arrives: the buyer paid but the
// order was never credited. An admin enters the buyer's email and we grant exactly one AI
// deep-reading credit — the same effect grantExtraAiReads has when the webhook fires normally.
// Idempotency is deliberately left to the admin (each submit is +1, and the response echoes the
// new balance) so a double-click doesn't silently double-grant without them noticing.
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "没有找到该邮箱对应的账户" }, { status: 404 });
  }

  const updated = await grantExtraAiReads(user.id, 1);
  // Audit trail — a manual credit is a money-adjacent action, worth logging who/when.
  await trackEvent("admin_manual_grant", { userId: user.id, props: { kind: "ai_deep_read", amount: 1 } });

  return NextResponse.json({ ok: true, email, extraReadsAvailable: updated.aiExtraReadsAvailable });
}
