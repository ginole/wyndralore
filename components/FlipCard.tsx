"use client";

import { ReactNode } from "react";

interface FlipCardProps {
  flipped: boolean;
  back: ReactNode;
  front: ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

export default function FlipCard({ flipped, back, front, onClick, className = "", ariaLabel }: FlipCardProps) {
  return (
    <div
      className={`flip-perspective ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`flip-inner ${flipped ? "flip-inner-flipped" : ""}`}>
        <div className="flip-face flip-face-back">{back}</div>
        <div className="flip-face flip-face-front">
          {front}
          {flipped && <span key="sweep" className="sheen-sweep" aria-hidden />}
        </div>
      </div>
    </div>
  );
}
