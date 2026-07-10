import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { prisma } from "@/lib/db";
import { findOrderByUploadToken, recordDelivery } from "@/lib/masters";
import { sendEmail, buyerReadingDeliveredEmail } from "@/lib/email";

// GET: lets the (no-login) upload page confirm the link is live and show context before the
// master records anything — never exposes the buyer's identity, only what she needs to read for.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await findOrderByUploadToken(token);
  if (!order) {
    return NextResponse.json({ error: "This link has expired or was already used." }, { status: 410 });
  }
  return NextResponse.json({
    orderCode: order.code,
    question: order.question,
    deliverBy: order.deliverBy,
    masterName: order.master.displayName,
  });
}

// POST: implements @vercel/blob's client-upload protocol. The browser uploads the recording
// directly to Blob storage (never through this serverless function, so there's no request-body
// size limit to worry about) — this route only issues a short-lived, tightly-scoped upload token
// and then gets notified once the upload actually finishes.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        const order = await findOrderByUploadToken(token);
        if (!order) throw new Error("This delivery link has expired or was already used.");
        return {
          allowedContentTypes: ["audio/*", "video/*"],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB — generous for a few minutes of audio/video
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ orderId: order.id }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) return;
        const { orderId } = JSON.parse(tokenPayload) as { orderId: string };
        const result = await recordDelivery(orderId, blob.url);
        if (!result.ok || !result.listenToken) return; // already delivered by another path — fine

        const order = await prisma.masterOrder.findUnique({ where: { id: orderId }, include: { master: true, buyer: true } });
        if (!order) return;
        const listenLink = `https://wyndralore.com/r/${result.listenToken}`;
        const { subject, html } = buyerReadingDeliveredEmail(order.master.displayName, listenLink);
        const sent = await sendEmail({ to: order.buyer.email, subject, html });
        if (!sent.ok) console.error(`[masters/deliver] delivered-notification email failed for order ${order.code}:`, sent.error);
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
