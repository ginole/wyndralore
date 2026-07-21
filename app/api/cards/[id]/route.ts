import { NextRequest, NextResponse } from "next/server";
import { getCardById } from "@/lib/cards";
import { LOCALES, type Locale } from "@/lib/i18n";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The 繁體 draw fetches ?locale=zh-TW so the revealed meaning matches the page it's rendered on.
  const raw = req.nextUrl.searchParams.get("locale");
  const locale: Locale = (LOCALES as string[]).includes(raw ?? "") ? (raw as Locale) : "en";
  const card = getCardById(Number(id), locale);
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  return NextResponse.json(card, {
    // Vary by the locale query so the CDN doesn't serve an EN card body for a zh-TW request.
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
