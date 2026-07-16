"use client";

import { useCallback, useEffect, useRef } from "react";
import { DeckCard } from "@/lib/types";
import CardBack from "./CardBack";

interface CardFanProps {
  cards: DeckCard[];
  takenIds: Set<number>;
  onSelect: (card: DeckCard) => void;
  disabled: boolean;
}

// Drag physics for the arc carousel. Offsets are measured in "card units"
// (1 = one card of spacing), so the math is resolution-independent.
const FRICTION = 0.94; // momentum decay per frame — the "damping" feel
const MIN_VELOCITY = 0.004; // below this the glide is considered settled
const DRAG_CLICK_THRESHOLD = 8; // px of movement that separates a tap from a drag
const OVERSCROLL = 1.1; // how many card-widths the edges give before the spring pulls back

export default function CardFan({ cards, takenIds, onSelect, disabled }: CardFanProps) {
  const n = cards.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef((n - 1) / 2); // start centered mid-deck
  const targetRef = useRef((n - 1) / 2); // where a wheel glide is easing toward
  const glidingRef = useRef(false);
  const velocityRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastTRef = useRef(0);
  const movedRef = useRef(0);
  const pressedCardIdRef = useRef<number | null>(null);

  const spacingOf = (track: HTMLElement) => Math.min(72, Math.max(46, track.clientWidth / 10));

  // Transforms are written to the DOM directly (no React re-render per frame) so the
  // drag/momentum loop stays comfortably at 60fps even with all 78 cards mounted.
  const applyTransforms = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const spacing = spacingOf(track);
    const off = offsetRef.current;
    const children = track.children;
    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement;
      const pos = i - off;
      const abs = Math.abs(pos);
      if (abs > 7.5) {
        el.style.visibility = "hidden";
        continue;
      }
      el.style.visibility = "visible";
      const x = pos * spacing;
      const y = Math.pow(abs, 1.45) * 10; // cards dip away from the center — the ring arc
      const rot = pos * 6.5;
      const scale = Math.max(0.8, 1 - abs * 0.04);
      el.style.transform = `translateX(calc(-50% + ${x}px)) translateY(${y}px) rotateY(${pos * -5}deg) rotate(${rot}deg) scale(${scale})`;
      el.style.zIndex = String(300 - Math.round(abs * 12));
      el.style.opacity = String(Math.min(1, Math.max(0, 1 - Math.max(0, abs - 4.5) * 0.34)));
    }
  }, []);

  const cancelMomentum = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startMomentum = useCallback(() => {
    cancelMomentum();
    const max = n - 1;
    const step = () => {
      let off = offsetRef.current + velocityRef.current;
      velocityRef.current *= FRICTION;
      // Spring back when gliding past either end of the deck.
      if (off < 0) {
        off += (0 - off) * 0.18;
        velocityRef.current *= 0.7;
      } else if (off > max) {
        off += (max - off) * 0.18;
        velocityRef.current *= 0.7;
      }
      offsetRef.current = off;
      targetRef.current = off;
      applyTransforms();
      const settled = Math.abs(velocityRef.current) < MIN_VELOCITY && off >= -0.02 && off <= max + 0.02;
      rafRef.current = settled ? null : requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [n, applyTransforms, cancelMomentum]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    draggingRef.current = true;
    glidingRef.current = false;
    movedRef.current = 0;
    lastXRef.current = e.clientX;
    lastTRef.current = performance.now();
    velocityRef.current = 0;
    cancelMomentum();

    // Remember which card was actually under the finger/cursor at press time — once we
    // call setPointerCapture below, the browser may re-target the eventual "click" at the
    // capturing element instead of this button, so selection can't rely on that click.
    const pressedEl = (e.target as HTMLElement).closest<HTMLElement>("[data-card-id]");
    pressedCardIdRef.current = pressedEl ? Number(pressedEl.dataset.cardId) : null;

    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const track = trackRef.current;
    if (!track) return;
    const spacing = spacingOf(track);
    const dx = e.clientX - lastXRef.current;
    const now = performance.now();
    const dt = Math.max(8, now - lastTRef.current);
    lastXRef.current = e.clientX;
    lastTRef.current = now;
    movedRef.current += Math.abs(dx);

    const max = n - 1;
    let off = offsetRef.current - dx / spacing;
    off = Math.max(-OVERSCROLL, Math.min(max + OVERSCROLL, off));
    offsetRef.current = off;
    targetRef.current = off;
    velocityRef.current = (-dx / spacing) * (16 / dt);
    applyTransforms();
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const wasTap = movedRef.current <= DRAG_CLICK_THRESHOLD;
    if (wasTap && e.type === "pointerup" && pressedCardIdRef.current !== null) {
      const card = cards.find((c) => c.id === pressedCardIdRef.current);
      if (card && !takenIds.has(card.id)) onSelect(card);
    } else if (movedRef.current > DRAG_CLICK_THRESHOLD) {
      startMomentum();
    }
    pressedCardIdRef.current = null;
  }

  // Pointer-driven taps are resolved directly above (pointer capture can retarget the
  // browser's synthesized click away from the actual card button). Keyboard activation
  // (Enter/Space) produces a click with no pointer behind it — detail === 0 — so let those
  // through to the button's own onClick; swallow every other (pointer-originated) click.
  function handleClickCapture(e: React.MouseEvent) {
    if (e.detail !== 0) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // Wheel over the fan: scroll the PAGE whenever the page still has room to scroll in that
  // direction, and only browse the fan when it doesn't. So a mouse wheel scrolls to the
  // results below when there's more page, and — on a screen where everything already fits —
  // it browses the deck instead of doing nothing. A horizontal trackpad swipe always browses.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    // Nudge the target and let a rAF loop ease the fan toward it, so a wheel notch glides
    // smoothly like a drag does instead of hard-jumping a card at a time. Repeated notches
    // accumulate on the target and the same loop keeps easing — continuous, not stuttery.
    const browse = (delta: number) => {
      targetRef.current = Math.max(-0.3, Math.min(n - 0.7, targetRef.current + delta * 0.01));
      if (glidingRef.current) return;
      cancelMomentum();
      glidingRef.current = true;
      const step = () => {
        const diff = targetRef.current - offsetRef.current;
        if (Math.abs(diff) < 0.002) {
          offsetRef.current = targetRef.current;
          applyTransforms();
          glidingRef.current = false;
          rafRef.current = null;
          return;
        }
        offsetRef.current += diff * 0.18;
        applyTransforms();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        browse(e.deltaX);
        return;
      }
      const doc = document.documentElement;
      const canScrollDown = e.deltaY > 0 && window.scrollY + window.innerHeight < doc.scrollHeight - 1;
      const canScrollUp = e.deltaY < 0 && window.scrollY > 0;
      if (canScrollDown || canScrollUp) return; // page has room → let it scroll normally
      e.preventDefault();
      browse(e.deltaY);
    };
    track.addEventListener("wheel", onWheel, { passive: false });
    return () => track.removeEventListener("wheel", onWheel);
  }, [n, applyTransforms]);

  // Re-apply after every render (selection changes re-render the buttons) and on resize.
  useEffect(() => {
    applyTransforms();
  });

  useEffect(() => {
    const onResize = () => applyTransforms();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelMomentum();
    };
  }, [applyTransforms, cancelMomentum]);

  return (
    <div className="w-full select-none pb-4 pt-8">
      <div
        ref={trackRef}
        role="listbox"
        aria-label="Face-down deck — drag to browse, tap a card to draw it"
        className="relative mx-auto h-60 w-full max-w-3xl cursor-grab touch-pan-y overflow-hidden active:cursor-grabbing sm:h-72"
        style={{ perspective: "1200px" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClickCapture={handleClickCapture}
      >
        {cards.map((card) => {
          const taken = takenIds.has(card.id);
          return (
            <button
              key={card.id}
              type="button"
              data-card-id={card.id}
              disabled={disabled || taken}
              onClick={() => onSelect(card)}
              aria-label="Draw a card"
              className="group invisible absolute bottom-8 left-1/2 h-40 w-24 origin-bottom will-change-transform focus:outline-none disabled:cursor-default sm:h-48 sm:w-28"
            >
              <span
                className={`block h-full w-full rounded-[10px] ring-1 ring-gold-dim/40 transition-all duration-300 ${
                  taken
                    ? "translate-y-10 scale-90 opacity-0"
                    : disabled
                      ? ""
                      : "group-hover:-translate-y-2 group-hover:shadow-[0_-4px_28px_-4px_rgba(228,200,148,0.45)] group-hover:ring-gold group-focus-visible:-translate-y-2 group-focus-visible:ring-gold"
                }`}
              >
                <CardBack shine="hover" />
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] uppercase tracking-[0.25em] text-moon-dim/70">
        Drag to browse · tap to draw
      </p>
    </div>
  );
}
