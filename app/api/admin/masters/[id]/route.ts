import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

// Admin pause/reactivate toggle, strike reset, and — since a live master can no longer edit her
// own profile (app/api/masters/onboard blocks self-edits once status !== "pending_review") —
// full storefront-field edits so support can fix a typo or update her bio without her needing a
// new invite link.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const data: Record<string, unknown> = {};
  if (body?.status === "active" || body?.status === "paused") data.status = body.status;
  if (body?.clearStrikes === true) data.strikeCount = 0;

  if (body?.profile && typeof body.profile === "object") {
    const p = body.profile as Record<string, unknown>;
    const handle = typeof p.handle === "string" ? p.handle.trim().toLowerCase() : "";
    const displayName = typeof p.displayName === "string" ? p.displayName.trim() : "";
    if (!HANDLE_RE.test(handle)) {
      return NextResponse.json({ error: "Handle must be lowercase letters, numbers, and hyphens (3-32 chars)." }, { status: 400 });
    }
    if (!displayName) return NextResponse.json({ error: "Display name is required." }, { status: 400 });

    data.handle = handle;
    data.displayName = displayName;
    data.tagline = typeof p.tagline === "string" ? p.tagline.trim() || null : null;
    data.photoUrl = typeof p.photoUrl === "string" ? p.photoUrl.trim() || null : null;
    data.channelUrl = typeof p.channelUrl === "string" ? p.channelUrl.trim() || null : null;
    data.styleTone = typeof p.styleTone === "string" && p.styleTone ? p.styleTone : "gentle";
    data.focusAreas = typeof p.focusAreas === "string"
      ? JSON.stringify(p.focusAreas.split(",").map((s: string) => s.trim()).filter(Boolean))
      : "[]";
    data.voiceSamples = typeof p.voiceSamples === "string"
      ? JSON.stringify(p.voiceSamples.split("\n").map((s: string) => s.trim()).filter(Boolean))
      : "[]";
    data.avoidTopics = typeof p.avoidTopics === "string" ? p.avoidTopics.trim() || null : null;
    data.dailyCapacity = Number.isFinite(Number(p.dailyCapacity)) && Number(p.dailyCapacity) > 0 ? Math.floor(Number(p.dailyCapacity)) : 5;
    data.slaHours = Number.isFinite(Number(p.slaHours)) && Number(p.slaHours) > 0 ? Math.floor(Number(p.slaHours)) : 48;
    data.vacationMode = p.vacationMode === true;
    data.deepLinkUrl = typeof p.deepLinkUrl === "string" ? p.deepLinkUrl.trim() || null : null;
    data.payoutMethod = p.payoutMethod === "paypal" || p.payoutMethod === "wise" ? p.payoutMethod : null;
    data.payoutHandle = typeof p.payoutHandle === "string" ? p.payoutHandle.trim() || null : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    const master = await prisma.masterProfile.update({ where: { id }, data });
    return NextResponse.json({ master });
  } catch (err: unknown) {
    const isUniqueViolation = typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
    if (isUniqueViolation) {
      return NextResponse.json({ error: "That handle is already taken — please choose another." }, { status: 409 });
    }
    throw err;
  }
}

// Rejects a self-submitted (`pending_review`) storefront — since a rejected profile never went
// live and has no orders/ledger history yet, a clean delete is safe. Refuses to touch anything
// that's already `active`/`paused` (use PATCH's status toggle for that instead).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const master = await prisma.masterProfile.findUnique({ where: { id } });
  if (!master) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (master.status !== "pending_review") {
    return NextResponse.json({ error: "Only a pending submission can be rejected — pause an active one instead." }, { status: 409 });
  }
  await prisma.masterProfile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
