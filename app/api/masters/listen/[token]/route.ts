import { NextRequest, NextResponse } from "next/server";
import { findOrderByListenToken } from "@/lib/masters";

// GET: fetches the order's public-facing info for the (no-login) listen page — master's name,
// order code — never the raw Blob URL, so the browser never sees or caches a link that could
// outlive this token.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await findOrderByListenToken(token);
  if (!order) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 410 });
  }
  return NextResponse.json({ orderCode: order.code, masterName: order.master.displayName });
}
