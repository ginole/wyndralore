import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const users = await prisma.user.findMany({
    where: q ? { email: { contains: q } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, email: true, plan: true, planExpiresAt: true, createdAt: true },
  });

  return NextResponse.json({ users });
}
