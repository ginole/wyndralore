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
        loading="lazy"
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
