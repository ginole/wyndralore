"use client";

import { useEffect, useRef, useState } from "react";
import { TarotCard } from "@/lib/types";
import { renderShareCard, canvasToBlob } from "@/lib/shareCard";
import { useDeckPrefs, deckImageSrc } from "./DeckPrefs";
import { useLocale, useAppT } from "@/lib/useLocale";

interface ShareCardModalProps {
  cardId: number;
  onShareGranted: () => void;
  onClose: () => void;
}

// Renders the drawn card into a 1080×1920 share image (PRD §6.4) and offers Web Share /
// download. The first drawn card of the reading is used as the shareable hero.
export default function ShareCardModal({ cardId, onShareGranted, onClose }: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { deckStyle } = useDeckPrefs();
  const locale = useLocale();
  const t = useAppT();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const fetched: TarotCard = await (
          await fetch(`/api/cards/${cardId}${locale === "zh-TW" ? "?locale=zh-TW" : ""}`)
        ).json();
        // The share image should show the same deck art the reader was just looking at.
        const card = { ...fetched, image: deckImageSrc(fetched.image, deckStyle) };
        const orientation = Math.random() < 0.5 ? "upright" : "reversed";
        const canvas = canvasRef.current;
        if (!canvas) return;
        // The reading already fixed an orientation, but the share image is a keepsake — we
        // render the card upright for a cleaner shareable by default.
        await renderShareCard(canvas, card, "upright", { upright: t.reading.upright, reversed: t.reading.reversed });
        void orientation;
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
  }, [cardId, deckStyle, locale, t]);

  async function handleShare() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await canvasToBlob(canvas);
      const file = new File([blob], "wyndralore-reading.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: t.shareModal.shareTitle,
          text: t.shareModal.shareText,
        });
      } else {
        // Fallback: trigger a download.
        const a = document.createElement("a");
        a.href = previewUrl ?? "";
        a.download = "wyndralore-reading.png";
        a.click();
        setMessage(t.shareModal.savedShare);
      }
      onShareGranted();
    } catch {
      // Share dismissed; still credit per PRD §4.1 contract.
      onShareGranted();
    }
  }

  function handleDownload() {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = "wyndralore-reading.png";
    a.click();
    setMessage(t.shareModal.saved);
    onShareGranted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 px-6 py-10" role="dialog" aria-modal>
      <div className="flex max-h-full w-full max-w-sm flex-col overflow-y-auto rounded-2xl border border-ink-line bg-ink-raised p-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{t.shareModal.eyebrow}</p>

        <div className="mx-auto mt-4 w-full max-w-[240px]">
          {/* Hidden full-res canvas; the preview img shows a scaled version. */}
          <canvas ref={canvasRef} className="hidden" />
          {status === "loading" && (
            <div className="flex aspect-[9/16] w-full items-center justify-center rounded-xl border border-ink-line text-sm text-moon-dim">
              {t.shareModal.creating}
            </div>
          )}
          {status === "error" && (
            <div className="flex aspect-[9/16] w-full items-center justify-center rounded-xl border border-ink-line text-sm text-red-400">
              {t.shareModal.error}
            </div>
          )}
          {status === "ready" && previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Your shareable reading card" className="w-full rounded-xl" />
          )}
        </div>

        {message && <p className="mt-4 text-xs uppercase tracking-[0.2em] text-gold">{message}</p>}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleShare}
            disabled={status !== "ready"}
            className="rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
          >
            {t.shareModal.share}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={status !== "ready"}
            className="rounded-full border border-gold-dim px-7 py-3 text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
          >
            {t.shareModal.download}
          </button>
          <button type="button" onClick={onClose} className="text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon">
            {t.shareModal.close}
          </button>
        </div>
      </div>
    </div>
  );
}
