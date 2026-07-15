import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 30;

// Unified "达人动态" feed: dashboard logins, storefront orders placed, payments confirmed, and
// payouts sent — the 4 master-related AnalyticsEvent shapes, filtered out of the site-wide event
// stream by a distinguishing marker in each one's `props` (see the trackEvent call sites: the
// checkout route, the LS webhook's master branch, the dashboard page, and the payout route).
// Paginated (30/page, newest first) so the recent month sits on the first pages; page back for older.
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const page = Math.max(0, parseInt(req.nextUrl.searchParams.get("page") ?? "0", 10) || 0);
  const where = {
    OR: [
      { name: "master_dashboard_viewed" },
      { name: "order_created", props: { contains: '"masterHandle"' } },
      { name: "payment_completed", props: { contains: '"masterOrder":true' } },
      { name: "admin_manual_grant", props: { contains: '"master_payout"' } },
    ],
  };

  const [total, events, masters] = await Promise.all([
    prisma.analyticsEvent.count({ where }),
    prisma.analyticsEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
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

  return NextResponse.json({ log, page, total, hasMore: (page + 1) * PAGE_SIZE < total });
}
