"use client";

import { useDeckPrefs, cardBackSrc } from "./DeckPrefs";

interface CardBackProps {
  className?: string;
  /** "loop" = ambient sweep every few seconds; "hover" = one sweep when a parent .group is hovered. */
  shine?: "loop" | "hover" | "none";
}

export default function CardBack({ className = "", shine = "none" }: CardBackProps) {
  const { cardBackStyle } = useDeckPrefs();
  return (
    <div className={`relative h-full w-full ${className}`}>
      <img
        src={cardBackSrc(cardBackStyle)}
        alt=""
        width={400}
        height={640}
        // NOT lazy. A creator reported every card image broken on his PC, his phone and several
        // browsers, and it reproduced on production: the card backs sat at complete=false /
        // naturalWidth=0 indefinitely while the Performance timeline showed **no network request
        // ever issued** for them. They are on-screen (93×136 at top 140), the file returns 200, and
        // flipping this single attribute to eager made all three load instantly.
        //
        // The stack renders these inside CSS-transformed, animated containers; a lazily-loaded image
        // whose box is produced that way can be evaluated once, judged out of view, and never
        // re-checked — so the deck simply never appears. There is nothing to save here anyway: the
        // card back IS the first thing on the draw page, so deferring it is backwards.
        loading="eager"
        fetchPriority="high"
        decoding="async"
        draggable={false}
        className="h-full w-full rounded-[10px] object-cover shadow-[0_14px_32px_-10px_rgba(0,0,0,0.6)]"
      />
      {shine !== "none" && (
        <span aria-hidden className={`card-shine ${shine === "loop" ? "card-shine-loop" : "card-shine-hover"}`} />
      )}
    </div>
  );
}
