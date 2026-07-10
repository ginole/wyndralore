import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isMasterProductKind, masterOrderCode, createPendingMasterOrder } from "@/lib/masters";
import { createMasterCheckout } from "@/lib/lemonsqueezy";
import { trackEvent, getAnonId } from "@/lib/analytics";

const SITE_URL = "https://wyndralore.com";

// Buyer-facing checkout for a master's storefront (the "Meet Our Masters" $9.90 AI-style /
// $39 live-voice products). Ready for the storefront page (still to be built) to call — creates
// the `pending` MasterOrder, then a Lemon Squeezy checkout; the webhook confirms payment and
// hands off to the settlement flow in lib/masters.ts.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const handle = typeof body?.masterHandle === "string" ? body.masterHandle : "";
  const kind = body?.kind;
  const question = typeof body?.question === "string" ? body.question.slice(0, 500) : undefined;

  if (!handle) return NextResponse.json({ error: "Missing master." }, { status: 400 });
  if (typeof kind !== "string" || !isMasterProductKind(kind)) {
    return NextResponse.json({ error: "Invalid purchase kind." }, { status: 400 });
  }

  const master = await prisma.masterProfile.findUnique({ where: { handle } });
  if (!master || master.status !== "active") {
    return NextResponse.json({ error: "This reader isn't taking orders right now." }, { status: 404 });
  }
  if (kind === "live_voice" && master.vacationMode) {
    return NextResponse.json({ error: "This reader has paused personal readings for now." }, { status: 409 });
  }

  // Daily capacity cap (anti-oversell — see the fund-architecture brainstorm): count today's
  // live_voice orders that are actually holding her time (paid or later), not abandoned pending
  // checkouts, so a buyer who starts-but-abandons checkout doesn't eat into her real capacity.
  if (kind === "live_voice") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCount = await prisma.masterOrder.count({
      where: { masterId: master.id, kind: "live_voice", status: { in: ["paid", "delivered", "released"] }, createdAt: { gte: startOfDay } },
    });
    if (todayCount >= master.dailyCapacity) {
      return NextResponse.json({ error: "This reader's spots for today are full — check back tomorrow." }, { status: 409 });
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = masterOrderCode();
    try {
      const order = await createPendingMasterOrder({ code, master, buyerId: user.id, kind, question });
      await trackEvent("order_created", { anonId: await getAnonId(), userId: user.id, props: { masterHandle: handle, kind } });

      const checkoutUrl = await createMasterCheckout({
        kind,
        orderCode: order.code,
        email: user.email,
        redirectUrl: `${SITE_URL}/account`,
      });

      return NextResponse.json({ order, checkoutUrl }, { status: 201 });
    } catch (err: unknown) {
      const isUniqueViolation = typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
      if (!isUniqueViolation) throw err;
    }
  }
  return NextResponse.json({ error: "Could not generate an order code, try again." }, { status: 500 });
}
