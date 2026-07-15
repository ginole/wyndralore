import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { CreatorCommission } from "@prisma/client";

const PAGE_SIZE = 30;

async function emailsFor(commissions: CreatorCommission[]): Promise<Record<string, string>> {
  const ids = [...new Set(commissions.flatMap((c) => [c.creatorId, c.customerId]))];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } });
  return Object.fromEntries(users.map((u) => [u.id, u.email]));
}

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;

  // Full CSV export (for the admin's own 6-month archive, after which the rows can be pruned).
  if (sp.get("export") === "csv") {
    const all = await prisma.creatorCommission.findMany({ orderBy: { createdAt: "desc" } });
    const emailById = await emailsFor(all);
    const header = "created,partner,customer,tier,rate,gross,net,commission,status,paid,orderCode\n";
    const body = all
      .map((c) =>
        [
          c.createdAt.toISOString(),
          emailById[c.creatorId] ?? c.creatorId,
          emailById[c.customerId] ?? c.customerId,
          c.tier,
          c.rate,
          c.grossUsd,
          c.netUsd,
          c.commissionUsd,
          c.status,
          c.paidAt ? c.paidAt.toISOString() : "",
          c.orderCode,
        ].join(",")
      )
      .join("\n");
    return new NextResponse(header + body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="affiliate-commissions.csv"`,
      },
    });
  }

  const page = Math.max(0, parseInt(sp.get("page") ?? "0", 10) || 0);
  const [total, commissions] = await Promise.all([
    prisma.creatorCommission.count(),
    prisma.creatorCommission.findMany({ orderBy: { createdAt: "desc" }, skip: page * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const emailById = await emailsFor(commissions);
  const rows = commissions.map((c) => ({
    id: c.id,
    createdAt: c.createdAt,
    partner: emailById[c.creatorId] ?? c.creatorId,
    customer: emailById[c.customerId] ?? c.customerId,
    tier: c.tier,
    commissionUsd: c.commissionUsd,
    status: c.status,
    paidAt: c.paidAt,
    orderCode: c.orderCode,
  }));
  return NextResponse.json({ rows, page, pageSize: PAGE_SIZE, total, hasMore: (page + 1) * PAGE_SIZE < total });
}
