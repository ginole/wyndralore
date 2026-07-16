import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DECK_STYLES = ["minimal", "classic"] as const;
const BACK_STYLES = ["lunar", "damask"] as const;

/**
 * Saves account preferences: deck appearance (face/back style) and the premium-only daily
 * reminder opt-in. Guests keep the same deck choices in localStorage (components/DeckPrefs.tsx);
 * this is what makes a signed-in user's choice follow them across devices.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const data: { deckStyle?: string; cardBackStyle?: string; dailyReminderOptIn?: boolean } = {};

  if (body?.deckStyle !== undefined) {
    if (!DECK_STYLES.includes(body.deckStyle)) return NextResponse.json({ error: "Invalid deck style." }, { status: 400 });
    data.deckStyle = body.deckStyle;
  }
  if (body?.cardBackStyle !== undefined) {
    if (!BACK_STYLES.includes(body.cardBackStyle)) return NextResponse.json({ error: "Invalid card back style." }, { status: 400 });
    data.cardBackStyle = body.cardBackStyle;
  }
  if (body?.dailyReminderOptIn !== undefined) {
    if (typeof body.dailyReminderOptIn !== "boolean") return NextResponse.json({ error: "Invalid reminder setting." }, { status: 400 });
    data.dailyReminderOptIn = body.dailyReminderOptIn;
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ ok: true, ...data });
}
