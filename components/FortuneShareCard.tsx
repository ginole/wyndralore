"use client";

import { useEffect, useRef, useState } from "react";
import { TarotCard, Orientation } from "@/lib/types";
import { track } from "@/lib/track";
import { renderFortuneCard, canvasToBlob, FortuneCardCard } from "@/lib/shareCard";

const SITE_URL = "https://wyndralore.com";

interface FortuneShareCardProps {
  spreadTitle: string;
  cards: FortuneCardCard[];
  /** The first drawn card — its keywords become the card's distilled "fortune keyword". */
  firstCardId: number;
  /** The signed-in user's referral code, so the QR/link doubles as their invite. */
  referralCode: string | null;
}

// Result-page "flaunt" card (裂变模块一): renders the reading into a polished 1080×1920 black-gold
// image — distilled keyword, the actual cards drawn, and a QR that encodes the sharer's referral
// link — then offers one-tap share/save so posting it to TikTok/Instagram also invites friends.
export default function FortuneShareCard({ spreadTitle, cards, firstCardId, referralCode }: FortuneShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saved, setSaved] = useState(false);

  const shareUrl = referralCode ? `${SITE_URL}/?ref=${referralCode}` : SITE_URL;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        // Lazy-load the QR generator only when a share card is actually built (keeps it out of
        // the main reading bundle), and fetch the hero card's keywords for the headline line.
        const [{ default: QRCode }, card] = await Promise.all([
          import("qrcode"),
          fetch(`/api/cards/${firstCardId}`).then((r) => r.json() as Promise<TarotCard>),
        ]);
        const orientation: Orientation = cards[0]?.orientation ?? "upright";
        const words = orientation === "upright" ? card.keywords_upright : card.keywords_reversed;
        const keyword = words.slice(0, 3).join(" · ") || card.name;

        const qrDataUrl = await QRCode.toDataURL(shareUrl, {
          margin: 2,
          width: 240,
          color: { dark: "#0b0e1a", light: "#f4f1ea" },
        });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        await renderFortuneCard(canvas, { spreadTitle, keyword, cards, qrDataUrl, urlLabel: "wyndralore.com" });
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
    // Rebuild if the reading (or the user's referral code) changes.
  }, [spreadTitle, firstCardId, referralCode, shareUrl, cards]);

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
          title: "My Wyndralore Reading",
          text: "My reading on Wyndralore. Draw your own — free.",
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
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Share your fortune</p>
      <h3 className="font-display mt-2 text-2xl text-moon">A keepsake worth sharing</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-moon-dim">
        Save this and share it to your story — the QR brings friends straight to their own free reading.
      </p>

      <div className="mx-auto mt-6 w-full max-w-[260px]">
        <canvas ref={canvasRef} className="hidden" />
        {status === "loading" && (
          <div className="flex aspect-[9/16] w-full items-center justify-center rounded-xl border border-ink-line text-sm text-moon-dim">
            Creating your card…
          </div>
        )}
        {status === "error" && (
          <div className="flex aspect-[9/16] w-full items-center justify-center rounded-xl border border-ink-line text-sm text-red-400">
            Couldn&apos;t build the card.
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
          Share
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={status !== "ready"}
          className="rounded-full border border-gold-dim px-8 py-3 text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
        >
          {saved ? "Saved ✓" : "Save Image"}
        </button>
      </div>
    </div>
  );
}
