"use client";

import CardBack from "./CardBack";

const STACK = [
  { rot: -6, x: -10, y: 4 },
  { rot: -2, x: -4, y: 2 },
  { rot: 3, x: 3, y: 1 },
  { rot: 7, x: 9, y: 3 },
  { rot: -4, x: 6, y: -2 },
];

const STAGGER_MS = 45;
// The last card's shuffle animation doesn't start until its stagger delay has elapsed, so it
// doesn't finish until this long after the first card does. Callers must wait at least this
// long before flipping isShuffling off, or the trailing cards get cut off mid-animation and
// snap into place instead of settling smoothly.
export const SHUFFLE_SETTLE_MS = 1400 + (STACK.length - 1) * STAGGER_MS;

interface DeckStackProps {
  isShuffling: boolean;
}

export default function DeckStack({ isShuffling }: DeckStackProps) {
  return (
    <div className="relative mx-auto h-64 w-44 sm:h-72 sm:w-48">
      <div
        aria-hidden
        className={`absolute -inset-8 rounded-full bg-gold/10 blur-3xl transition-opacity duration-700 ${
          isShuffling ? "opacity-100" : "opacity-50"
        }`}
      />
      {/* Idle wrapper: once the shuffle settles the whole stack gently breathes,
          so the deck never looks frozen while waiting for the next action. */}
      <div className={`absolute inset-0 ${isShuffling ? "" : "deck-idle"}`}>
        {STACK.map((s, i) => (
          <div
            key={i}
            className={`stack-card absolute inset-0 ${isShuffling ? "shuffling" : ""}`}
            style={
              {
                transform: `rotate(${s.rot}deg) translate(${s.x}px, ${s.y}px)`,
                "--stack-rot": `${s.rot}deg`,
                "--sx": `${s.x * 6 + (i % 2 === 0 ? -30 : 30)}px`,
                "--sy": `${-18 - i * 6}px`,
                "--sr": `${s.rot * 3 + (i % 2 === 0 ? -14 : 14)}deg`,
                animationDelay: `${i * 45}ms`,
                zIndex: i,
              } as React.CSSProperties
            }
          >
            <CardBack shine={i === STACK.length - 1 ? "loop" : "none"} />
          </div>
        ))}
      </div>
    </div>
  );
}
