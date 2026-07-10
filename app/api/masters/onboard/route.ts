import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, setSessionCookie } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { hashResetToken } from "@/lib/passwordReset";

const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

/** Resolves which User this request is acting as: a claim token (new/placeholder account,
 * from the invite email) or an existing session (already has her own password). */
async function resolveActor(token: string | null): Promise<{ userId: string; email: string; isTokenClaim: boolean } | null> {
  if (token) {
    const user = await prisma.user.findFirst({ where: { resetTokenHash: hashResetToken(token) } });
    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt.getTime() < Date.now()) return null;
    return { userId: user.id, email: user.email, isTokenClaim: true };
  }
  const user = await getCurrentUser();
  if (!user) return null;
  return { userId: user.id, email: user.email, isTokenClaim: false };
}

// Lets a creator check her invite link (or session) is valid before she starts filling the form,
// and see whether she already has a profile (e.g. re-visiting to edit a pending submission).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const actor = await resolveActor(token);
  if (!actor) return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 401 });

  const existing = await prisma.masterProfile.findUnique({ where: { userId: actor.userId } });
  return NextResponse.json({
    email: actor.email,
    needsPassword: actor.isTokenClaim,
    existingStatus: existing?.status ?? null,
    existingProfile: existing,
  });
}

// Self-service submission — creates (or, if still pending_review, updates) her storefront
// profile as `pending_review`. Never goes live on her own submission; an admin approves it
// (components/admin/MastersPanel's review queue) before it's bookable.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;
  const actor = await resolveActor(token);
  if (!actor) return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 401 });

  if (actor.isTokenClaim) {
    const password = typeof body?.password === "string" ? body.password : "";
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: actor.userId },
      data: { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null, isPlaceholder: false },
    });
    await setSessionCookie(actor.userId);
  }

  const handle = typeof body?.handle === "string" ? body.handle.trim().toLowerCase() : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  if (!HANDLE_RE.test(handle)) return NextResponse.json({ error: "Handle must be lowercase letters, numbers, and hyphens (3-32 chars)." }, { status: 400 });
  if (!displayName) return NextResponse.json({ error: "Display name is required." }, { status: 400 });

  const existing = await prisma.masterProfile.findUnique({ where: { userId: actor.userId } });
  if (existing && existing.status !== "pending_review") {
    return NextResponse.json({ error: "You already have a live storefront — email us if you'd like to change something." }, { status: 409 });
  }

  const focusAreas = typeof body?.focusAreas === "string"
    ? JSON.stringify(body.focusAreas.split(",").map((s: string) => s.trim()).filter(Boolean))
    : "[]";
  const voiceSamples = typeof body?.voiceSamples === "string"
    ? JSON.stringify(body.voiceSamples.split("\n").map((s: string) => s.trim()).filter(Boolean))
    : "[]";

  const data = {
    handle,
    displayName,
    tagline: typeof body?.tagline === "string" ? body.tagline.trim() || null : null,
    photoUrl: typeof body?.photoUrl === "string" ? body.photoUrl.trim() || null : null,
    channelUrl: typeof body?.channelUrl === "string" ? body.channelUrl.trim() || null : null,
    styleTone: typeof body?.styleTone === "string" && body.styleTone ? body.styleTone : "gentle",
    focusAreas,
    voiceSamples,
    avoidTopics: typeof body?.avoidTopics === "string" ? body.avoidTopics.trim() || null : null,
    dailyCapacity: Number.isFinite(Number(body?.dailyCapacity)) && Number(body?.dailyCapacity) > 0 ? Math.floor(Number(body.dailyCapacity)) : 5,
    slaHours: Number.isFinite(Number(body?.slaHours)) && Number(body?.slaHours) > 0 ? Math.floor(Number(body.slaHours)) : 48,
    deepLinkUrl: typeof body?.deepLinkUrl === "string" ? body.deepLinkUrl.trim() || null : null,
    payoutMethod: body?.payoutMethod === "paypal" || body?.payoutMethod === "wise" ? body.payoutMethod : null,
    payoutHandle: typeof body?.payoutHandle === "string" ? body.payoutHandle.trim() || null : null,
    status: "pending_review",
  };

  try {
    const master = existing
      ? await prisma.masterProfile.update({ where: { id: existing.id }, data })
      : await prisma.masterProfile.create({ data: { ...data, userId: actor.userId } });
    return NextResponse.json({ master }, { status: existing ? 200 : 201 });
  } catch (err: unknown) {
    const isUniqueViolation = typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
    if (isUniqueViolation) {
      return NextResponse.json({ error: "That handle is already taken — please choose another." }, { status: 409 });
    }
    throw err;
  }
}
