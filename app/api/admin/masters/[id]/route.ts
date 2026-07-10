import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

// Admin pause/reactivate toggle — a paused master disappears from checkout eligibility
// (app/api/masters/checkout already checks `status === "active"`) without deleting her profile
// or history. Also lets an admin manually clear strikes after resolving whatever caused them.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const data: { status?: string; strikeCount?: number } = {};
  if (body?.status === "active" || body?.status === "paused") data.status = body.status;
  if (body?.clearStrikes === true) data.strikeCount = 0;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const master = await prisma.masterProfile.update({ where: { id }, data });
  return NextResponse.json({ master });
}
