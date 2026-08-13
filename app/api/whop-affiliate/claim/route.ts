import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WHOP_EXAMPLE_AFFILIATE } from "@/lib/featureFlags";

/**
 * Moves a creator's `?a=` code off localStorage and onto the account, once.
 *
 * The code arrives on a link and used to live only in the visitor's browser. That survives a
 * days-long gap (which is why localStorage and not a cookie) but NOT a change of device — and the
 * realistic path for this product is exactly that: someone taps a creator's link in the YouTube app
 * on their phone, draws a card, and pays later on a laptop. The attribution died in between and the
 * creator lost the commission with no trace anywhere. Once it's on the account, the account carries
 * it to whatever device the purchase happens on.
 *
 * Write-once and first-touch, deliberately: an existing value is never overwritten, so a creator
 * whose link is clicked later can't take a referral that an earlier creator already earned. Same
 * rule the localStorage capture already used, just now durable.
 *
 * Silent by design — the caller fires and forgets. There is nothing a visitor could do about a
 * failure here, and an error toast about affiliate bookkeeping mid-reading would be absurd.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  // No session yet: the code stays in localStorage and we'll pick it up on their next authed load.
  if (!user) return NextResponse.json({ ok: true, stored: false });

  // Already attributed — first touch wins, never reassign.
  if (user.referredByWhopCode) return NextResponse.json({ ok: true, stored: false });

  const body = await req.json().catch(() => null);
  const raw = typeof body?.code === "string" ? body.code.trim() : "";
  // Whop usernames are short and plain; anything else is junk or an injection attempt, not a typo
  // worth storing. A rejected code costs a commission, a stored garbage one costs a broken checkout.
  if (!raw || raw.length > 64 || !/^[A-Za-z0-9._-]+$/.test(raw)) {
    return NextResponse.json({ ok: true, stored: false });
  }
  // The invite email's worked example is a real stranger's Whop account (see WHOP_EXAMPLE_AFFILIATE)
  // — a creator who pasted it verbatim must not pay him forever.
  if (raw === WHOP_EXAMPLE_AFFILIATE) return NextResponse.json({ ok: true, stored: false });

  // Don't let a creator's own link credit themselves.
  if (user.whopUsername && user.whopUsername.toLowerCase() === raw.toLowerCase()) {
    return NextResponse.json({ ok: true, stored: false });
  }

  // updateMany with the null guard makes "write once" atomic — two tabs racing can't both win.
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, referredByWhopCode: null },
    data: { referredByWhopCode: raw },
  });

  return NextResponse.json({ ok: true, stored: count > 0 });
}
