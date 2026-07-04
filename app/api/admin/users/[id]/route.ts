import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { isPlanId } from "@/lib/pricing";

// Support-desk override for plan/expiry (PRD §5.4).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const data: { plan?: string; planExpiresAt?: Date | null } = {};
  if (body?.plan !== undefined) {
    if (body.plan !== "free" && !isPlanId(body.plan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }
    data.plan = body.plan;
  }
  if (body?.planExpiresAt !== undefined) {
    data.planExpiresAt = body.planExpiresAt ? new Date(body.planExpiresAt) : null;
  }

  const user = await prisma.user.update({ where: { id }, data });
  return NextResponse.json({
    user: { id: user.id, email: user.email, plan: user.plan, planExpiresAt: user.planExpiresAt },
  });
}
