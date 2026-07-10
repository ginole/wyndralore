import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { isValidEmail, hashPassword } from "@/lib/password";
import { generateResetToken } from "@/lib/passwordReset";
import { sendEmail, masterClaimAccountEmail } from "@/lib/email";
import crypto from "node:crypto";

const SITE_URL = "https://wyndralore.com";
const CLAIM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // same window as the creator-outreach claim link

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const masters = await prisma.masterProfile.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ masters });
}

const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

// Onboards a master's storefront profile. Finds or creates the underlying User by email — same
// find-or-create-placeholder pattern as the creator-outreach flow. She gets a claim-account email
// so she can log in to /masters/dashboard and see her own earnings — a new placeholder account
// gets a real claim link (set-your-password, reused resetToken plumbing); an account that already
// has a password just gets pointed at the normal login instead of silently resetting it.
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const handle = typeof body?.handle === "string" ? body.handle.trim().toLowerCase() : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";

  if (!isValidEmail(email)) return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  if (!HANDLE_RE.test(handle)) return NextResponse.json({ error: "Handle must be lowercase letters, numbers, and hyphens (3-32 chars)." }, { status: 400 });
  if (!displayName) return NextResponse.json({ error: "Display name is required." }, { status: 400 });

  const focusAreas = typeof body?.focusAreas === "string"
    ? JSON.stringify(body.focusAreas.split(",").map((s: string) => s.trim()).filter(Boolean))
    : "[]";
  const voiceSamples = typeof body?.voiceSamples === "string"
    ? JSON.stringify(body.voiceSamples.split("\n").map((s: string) => s.trim()).filter(Boolean))
    : "[]";

  let user = await prisma.user.findUnique({ where: { email } });
  let claimLink = `${SITE_URL}/account`;
  if (!user) {
    const placeholderPasswordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));
    user = await prisma.user.create({ data: { email, passwordHash: placeholderPasswordHash, isPlaceholder: true } });
    const { token, tokenHash, expiresAt } = generateResetToken(CLAIM_TOKEN_TTL_MS);
    await prisma.user.update({ where: { id: user.id }, data: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt } });
    claimLink = `${SITE_URL}/reset-password?token=${token}`;
  }

  try {
    const master = await prisma.masterProfile.create({
      data: {
        userId: user.id,
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
      },
    });

    const { subject, html } = masterClaimAccountEmail(displayName, claimLink);
    const sent = await sendEmail({ to: email, subject, html });
    if (!sent.ok) console.error(`[admin/masters] claim-account email failed for master ${handle}:`, sent.error);

    return NextResponse.json({ master, emailSent: sent.ok }, { status: 201 });
  } catch (err: unknown) {
    const isUniqueViolation = typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
    if (isUniqueViolation) {
      return NextResponse.json({ error: "That handle is already taken (or this user already has a master profile)." }, { status: 409 });
    }
    throw err;
  }
}
