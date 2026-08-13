import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * The numbers behind a creator's own link, for the panel on /account.
 *
 * This exists because of a question the first seriously interested creator asked before agreeing to
 * anything: "是否有專屬的後台可以讓我查看點擊與轉換數據?" — and the honest answer at the time was no.
 * Whop shows a creator their conversions and pays them, but Whop never sees the CLICK: the link
 * points at our site (deliberately — the whole funnel is that the viewer draws a card before being
 * asked for money), so the click happens here. Without this a creator who sent a thousand viewers
 * and made no sale saw a blank screen and could not tell "nobody clicked" from "they clicked and
 * didn't buy" — opposite problems with opposite fixes, and the fastest way to lose them.
 *
 * Counted by DISTINCT anonId, never raw rows: an engaged visitor logs several pageviews, and the
 * project has already once drawn a wrong conclusion from raw visit rows.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!user.isCreator) return NextResponse.json({ error: "Not a creator account." }, { status: 403 });

  const code = user.whopUsername?.trim();
  // No username recorded yet: there is nothing to count, and that's a normal first state — the panel
  // shows the "save your username" step instead of an empty table.
  if (!code) return NextResponse.json({ hasCode: false });

  // props is a JSON string column, so this matches on the serialized pair. Exact-quoted to avoid a
  // prefix collision between e.g. "hao" and "hao2".
  const needle = `"aff":${JSON.stringify(code)}`;

  const [visitRows, drewRows, paidOrders] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { name: "visit", props: { contains: needle } },
      select: { anonId: true },
      distinct: ["anonId"],
    }),
    // Someone who arrived on the link AND finished a reading. Two events joined by anonId, which is
    // the same stitching the funnel panel uses.
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT v."anonId")::bigint AS count
      FROM "AnalyticsEvent" v
      JOIN "AnalyticsEvent" r
        ON r."anonId" = v."anonId" AND r."name" = 'reading_completed'
      WHERE v."name" = 'visit'
        AND v."props" LIKE ${`%${needle}%`}
        AND v."anonId" IS NOT NULL
    `,
    prisma.order.findMany({
      where: { whopAffiliate: code, status: "paid" },
      select: { amountUsd: true, paidAt: true },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  const clicks = visitRows.filter((v) => v.anonId).length;
  const drew = Number(drewRows[0]?.count ?? 0);
  const grossUsd = paidOrders.reduce((sum, o) => sum + (o.amountUsd ?? 0), 0);

  return NextResponse.json({
    hasCode: true,
    code,
    clicks,
    drew,
    conversions: paidOrders.length,
    // Their 30% share of what those sales grossed. Explicitly an estimate on our side — Whop is the
    // one that computes and pays the real figure on net, and a creator must never be left thinking
    // our number is the payable one.
    estimatedCommissionUsd: Math.round(grossUsd * 0.3 * 100) / 100,
    lastSaleAt: paidOrders[0]?.paidAt ?? null,
  });
}
