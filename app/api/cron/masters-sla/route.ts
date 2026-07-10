import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";
import { getOverdueUndeliveredOrders, markOrderRefunded, releaseDueLedger } from "@/lib/masters";
import { refundLemonSqueezyOrder } from "@/lib/lemonsqueezy";

// Daily SLA sweep for the "Meet Our Masters" live_voice product — the automated half of the
// hold-and-release fund architecture (see the Masters marketplace fund-architecture brainstorm):
//
// 1. Any live_voice order whose SLA deadline passed without a delivery gets refunded through
//    Lemon Squeezy proactively — before the buyer has any reason to dispute with their bank.
//    The refund call happens FIRST; markOrderRefunded (which voids the ledger + strikes the
//    master) only runs if the refund actually succeeded, so a transient LS API failure can't
//    silently strand a buyer who never got their money back.
// 2. Any delivered order whose 72h dispute window has closed gets its held commission released
//    to the master's `available` balance, ready for the next twice-monthly payout.
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overdue = await getOverdueUndeliveredOrders();
  let refunded = 0;
  let refundFailed = 0;
  for (const order of overdue) {
    // One bad order (missing lsOrderId, a thrown config/network error, an LS-side rejection)
    // must never abort the whole sweep — every other overdue order, and the release step below,
    // still has to run. A stuck refund gets retried tomorrow; a stuck sweep helps no one.
    try {
      if (!order.lsOrderId) {
        console.error(`[cron/masters-sla] order ${order.code} is overdue but has no lsOrderId — cannot refund automatically`);
        refundFailed += 1;
        continue;
      }
      const result = await refundLemonSqueezyOrder(order.lsOrderId);
      if (!result.ok) {
        console.error(`[cron/masters-sla] refund failed for order ${order.code}:`, result.error);
        refundFailed += 1;
        continue;
      }
      await markOrderRefunded(order.id);
      refunded += 1;
    } catch (err) {
      console.error(`[cron/masters-sla] unexpected error refunding order ${order.code}:`, err);
      refundFailed += 1;
    }
  }

  const released = await releaseDueLedger();

  return NextResponse.json({ ok: true, overdueFound: overdue.length, refunded, refundFailed, released });
}
