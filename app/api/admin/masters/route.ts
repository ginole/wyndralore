import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { isValidEmail, hashPassword } from "@/lib/password";
import crypto from "node:crypto";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const masters = await prisma.masterProfile.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ masters });
}

const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

// Onboards a master's storefront profile. Finds or creates the underlying User by email — same
// find-or-create-placeholder pattern as the creator-outreach flow, minus the claim-link email:
// masters operate entirely through the tokenised /deliver/[token] link, so there's nothing yet
// that requires her to actually log in.
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
  if (!user) {
    const placeholderPasswordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));
    user = await prisma.user.create({ data: { email, passwordHash: placeholderPasswordHash, isPlaceholder: true } });
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
    return NextResponse.json({ master }, { status: 201 });
  } catch (err: unknown) {
    const isUniqueViolation = typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
    if (isUniqueViolation) {
      return NextResponse.json({ error: "That handle is already taken (or this user already has a master profile)." }, { status: 409 });
    }
    throw err;
  }
}
