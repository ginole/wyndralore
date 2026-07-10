import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { findOrderByListenToken } from "@/lib/masters";

// Streams the private recording through our own token-gated route, so the browser's <audio>/
// <video> `src` is always this URL — never the raw private Blob URL, which would leak the moment
// it's cached, shared, or shows up in devtools.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await findOrderByListenToken(token);
  if (!order || !order.deliveryUrl) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 410 });
  }

  const result = await get(order.deliveryUrl, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Length": String(result.blob.size),
      "Cache-Control": "private, no-store",
    },
  });
}
