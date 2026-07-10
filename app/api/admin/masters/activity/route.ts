import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

// Unified "达人动态" feed: dashboard logins, storefront orders placed, payments confirmed, and
// payouts sent — the 4 master-related AnalyticsEvent shapes, filtered out of the site-wide event
// stream by a distinguishing marker in each one's `props` (see the trackEvent call sites: the
// checkout route, the LS webhook's master branch, the dashboard page, and the payout route).
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [events, masters] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: {
        OR: [
          { name: "master_dashboard_viewed" },
          { name: "order_created", props: { contains: '"masterHandle"' } },
          { name: "payment_completed", props: { contains: '"masterOrder":true' } },
          { name: "admin_manual_grant", props: { contains: '"master_payout"' } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    prisma.masterProfile.findMany({ select: { id: true, handle: true, displayName: true } }),
  ]);

  const byId = new Map(masters.map((m) => [m.id, m.displayName]));
  const byHandle = new Map(masters.map((m) => [m.handle, m.displayName]));

  const log = events.map((e) => {
    const props = e.props ? JSON.parse(e.props) : {};
    const masterName = (props.masterId && byId.get(props.masterId)) || (props.masterHandle && byHandle.get(props.masterHandle)) || "—";
    return { id: e.id, name: e.name, createdAt: e.createdAt, masterName, props };
  });

  return NextResponse.json({ log });
}
