"use client";

import { useEffect, useRef, useState } from "react";
import { TarotCard, Orientation } from "@/lib/types";
import { track } from "@/lib/track";
import { renderFortuneCard, canvasToBlob, FortuneCardCard } from "@/lib/shareCard";
import { useDeckPrefs, deckImageSrc } from "./DeckPrefs";
import { useLocale, useAppT } from "@/lib/useLocale";

const SITE_URL = "https://wyndralore.com";

interface FortuneShareCardProps {
  spreadTitle: string;
  cards: FortuneCardCard[];
  /** The first drawn card — its keywords become the card's distilled "fortune keyword". */
  firstCardId: number;
  /** The signed-in user's referral code, so the QR/link doubles as their invite. */
  referralCode: string | null;
  /** A creator partner's Whop username, when she has recorded one. Takes precedence over
   * referralCode: for a creator, this card IS her promo material, and it should carry the link that
   * pays her cash rather than the one that pays her spread credits. */
  whopUsername?: string | null;
}

// Result-page "flaunt" card (裂变模块一): renders the reading into a polished 1080×1920 black-gold
// image — distilled keyword, the actual cards drawn, and a QR that encodes the sharer's referral
// link — then offers one-tap share/save so posting it to TikTok/Instagram also invites friends.
export default function FortuneShareCard({ spreadTitle, cards, firstCardId, referralCode, whopUsername }: FortuneShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { deckStyle } = useDeckPrefs();
  const locale = useLocale();
  const t = useAppT();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saved, setSaved] = useState(false);

  // A creator's card carries her commission link (?a=, paid by Whop); everyone else's carries their
  // friend-invite link (?ref=, pays spread credits). Without this a creator's most natural promo
  // move — draw a reading, share the card — hands her audience the wrong link, and the only symptom
  // she'd ever see is that she never gets paid.
  const shareUrl = whopUsername
    ? `${SITE_URL}/?a=${whopUsername}`
    : referralCode
      ? `${SITE_URL}/?ref=${referralCode}`
      : SITE_URL;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        // Lazy-load the QR generator only when a share card is actually built (keeps it out of
        // the main reading bundle), and fetch the hero card's keywords for the headline line.
        const [{ default: QRCode }, card] = await Promise.all([
          import("qrcode"),
          fetch(`/api/cards/${firstCardId}${locale === "zh-TW" ? "?locale=zh-TW" : ""}`).then((r) => r.json() as Promise<TarotCard>),
        ]);
        const orientation: Orientation = cards[0]?.orientation ?? "upright";
        const keywords = (orientation === "upright" ? card.keywords_upright : card.keywords_reversed).slice(0, 4);

        const qrDataUrl = await QRCode.toDataURL(shareUrl, {
          margin: 2,
          width: 240,
          color: { dark: "#0b0e1a", light: "#f4f1ea" },
        });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        await renderFortuneCard(canvas, {
          spreadTitle,
          cardName: card.name,
          orientation,
          keywords: keywords.length ? keywords : [card.name],
          // Render the same deck art the reader chose — the share image is their keepsake.
          cards: cards.map((c) => ({ ...c, image: deckImageSrc(c.image, deckStyle) })),
          qrDataUrl,
          urlLabel: "wyndralore.com",
          uprightLabel: t.reading.upright,
          reversedLabel: t.reading.reversed,
          scanLabel: t.fortune.scanLabel,
        });
        if (cancelled) return;
        const blob = await canvasToBlob(canvas);
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // Rebuild if the reading, the user's link, the deck style, or the locale changes.
  }, [spreadTitle, firstCardId, referralCode, whopUsername, shareUrl, cards, deckStyle, locale, t]);

  async function handleShare() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    track("share_click", { context: "fortune_card" });
    try {
      const blob = await canvasToBlob(canvas);
      const file = new File([blob], "wyndralore-fortune.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: t.fortune.shareTitle,
          text: t.fortune.shareText,
        });
      } else {
        handleDownload();
      }
    } catch {
      /* share sheet dismissed — no-op */
    }
  }

  function handleDownload() {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = "wyndralore-fortune.png";
    a.click();
    setSaved(true);
  }

  return (
    <div className="mt-12 rounded-2xl border border-gold-dim bg-ink-raised/40 p-6 text-center sm:p-8">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{t.fortune.eyebrow}</p>
      <h3 className="font-display mt-2 text-2xl text-moon">{t.fortune.title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-moon-dim">{t.fortune.body}</p>

      <div className="mx-auto mt-6 w-full max-w-[260px]">
        <canvas ref={canvasRef} className="hidden" />
        {status === "loading" && (
          <div className="flex aspect-[9/16] w-full items-center justify-center rounded-xl border border-ink-line text-sm text-moon-dim">
            {t.fortune.creating}
          </div>
        )}
        {status === "error" && (
          <div className="flex aspect-[9/16] w-full items-center justify-center rounded-xl border border-ink-line text-sm text-red-400">
            {t.fortune.buildError}
          </div>
        )}
        {status === "ready" && previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Your shareable fortune card" className="w-full rounded-xl shadow-[0_0_40px_-8px_rgba(228,200,148,0.35)]" />
        )}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={handleShare}
          disabled={status !== "ready"}
          className="rounded-full bg-gold px-8 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
        >
          {t.fortune.share}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={status !== "ready"}
          className="rounded-full border border-gold-dim px-8 py-3 text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
        >
          {saved ? t.fortune.saved : t.fortune.saveImage}
        </button>
      </div>
    </div>
  );
}
