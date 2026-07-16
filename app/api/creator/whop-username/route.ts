import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isRealWhopUsername } from "@/lib/whop";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";

/**
 * Lets a creator record the Whop username her commission is paid to. Once set, her share card's QR
 * carries `?a=<username>` (commission) instead of `?ref=<code>` (friend credits).
 *
 * Creators only: this is the one thing that distinguishes a partner account from a normal one, and
 * being a creator is permanent — it long outlives the complimentary month the invite grants.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!user.isCreator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Each save asks Whop to validate the name, so this is a (cheap) outbound call an authenticated
  // user can trigger at will. Keyed by user id — the route is auth-gated, so IP isn't the identity.
  const rl = await checkRateLimit("whop_username", user.id, 10, 10 * 60 * 1000);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds);

  const body = await req.json().catch(() => null);
  const raw = typeof body?.whopUsername === "string" ? body.whopUsername.trim() : "";

  // Clearing it is allowed — she may want to stop being attributed, or fix a mistake by starting over.
  if (!raw) {
    await prisma.user.update({ where: { id: user.id }, data: { whopUsername: null } });
    return NextResponse.json({ ok: true, whopUsername: null });
  }

  // Tolerate what she'll actually paste: a profile URL with or without the scheme, a leading @, or
  // stray case/whitespace.
  //
  // The scheme must be optional. With `^https?://` required, "whop.com/lunatarot" fell through to
  // the trailing-path strip and became "whop.com" — which is itself a real Whop account, so it
  // validated clean and would have paid her commission to a stranger. Silently, with a green tick.
  const username = raw
    .replace(/^(https?:\/\/)?(www\.)?whop\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .toLowerCase();
  if (!/^[a-z0-9._-]{1,60}$/.test(username)) {
    return NextResponse.json({ error: "That doesn't look like a Whop username." }, { status: 400 });
  }

  let real: boolean;
  try {
    real = await isRealWhopUsername(username);
  } catch (err) {
    // Whop unreachable — don't reject a name we simply couldn't check, and don't save it either;
    // saving an unverified name is the exact failure this route exists to prevent.
    console.error("[creator] Whop username check errored:", err);
    return NextResponse.json({ error: "Couldn't reach Whop to check that username. Try again in a moment." }, { status: 503 });
  }
  if (!real) {
    return NextResponse.json(
      { error: `No Whop account called "${username}". Check the spelling on your Whop profile — commission is paid to that account.` },
      { status: 400 }
    );
  }

  await prisma.user.update({ where: { id: user.id }, data: { whopUsername: username } });
  return NextResponse.json({ ok: true, whopUsername: username });
}
