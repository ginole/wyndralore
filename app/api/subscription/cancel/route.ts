import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelPaddleSubscription } from "@/lib/subscription";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (!user.subscriptionId || !user.autoRenew) {
    return NextResponse.json({ error: "No active auto-renewal to cancel." }, { status: 400 });
  }

  const ok = await cancelPaddleSubscription(user.subscriptionId);
  if (!ok) {
    return NextResponse.json({ error: "Could not cancel right now — please try again." }, { status: 502 });
  }

  // Flip auto-renew off immediately so the UI reflects it without waiting on the webhook; the
  // subscription.updated/canceled event will settle the final status + period end.
  await prisma.user.update({ where: { id: user.id }, data: { autoRenew: false, subscriptionStatus: "canceled" } });
  return NextResponse.json({ ok: true });
}
