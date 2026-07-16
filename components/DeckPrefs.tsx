"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

export type DeckStyle = "minimal" | "classic";
export type CardBackStyle = "lunar" | "damask";

const DECK_KEY = "wl_deck_style";
const BACK_KEY = "wl_back_style";

interface DeckPrefsState {
  deckStyle: DeckStyle;
  cardBackStyle: CardBackStyle;
  setDeckStyle: (s: DeckStyle) => void;
  setCardBackStyle: (s: CardBackStyle) => void;
}

const DeckPrefsContext = createContext<DeckPrefsState | null>(null);

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Deck appearance preferences: which card-face art set and which card back to render.
 * Guests keep the choice in localStorage; signed-in users get it from their account (and we
 * mirror changes to both, so the choice survives sign-out and follows them across devices).
 *
 * SSR note: the server always renders the defaults; the stored choice applies on hydration.
 * A one-frame swap for the minority who changed styles beats blocking paint for everyone.
 */
export function DeckPrefsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [deckStyle, setDeckState] = useState<DeckStyle>("minimal");
  const [cardBackStyle, setBackState] = useState<CardBackStyle>("lunar");

  // Hydrate from localStorage first (covers guests and the gap before /api/auth/me returns).
  useEffect(() => {
    setDeckState(readStored(DECK_KEY, ["minimal", "classic"] as const, "minimal"));
    setBackState(readStored(BACK_KEY, ["lunar", "damask"] as const, "lunar"));
  }, []);

  // Once the signed-in user arrives, their account preference wins.
  useEffect(() => {
    if (!user) return;
    if (user.deckStyle === "minimal" || user.deckStyle === "classic") setDeckState(user.deckStyle);
    if (user.cardBackStyle === "lunar" || user.cardBackStyle === "damask") setBackState(user.cardBackStyle);
  }, [user]);

  const persist = useCallback(
    (patch: { deckStyle?: DeckStyle; cardBackStyle?: CardBackStyle }) => {
      try {
        if (patch.deckStyle) localStorage.setItem(DECK_KEY, patch.deckStyle);
        if (patch.cardBackStyle) localStorage.setItem(BACK_KEY, patch.cardBackStyle);
      } catch {
        /* private mode — session-only preference is fine */
      }
      if (user) {
        // Fire-and-forget; the UI already updated. Worst case the next device misses it.
        fetch("/api/account/prefs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(() => {});
      }
    },
    [user]
  );

  const setDeckStyle = useCallback(
    (s: DeckStyle) => {
      setDeckState(s);
      persist({ deckStyle: s });
    },
    [persist]
  );
  const setCardBackStyle = useCallback(
    (s: CardBackStyle) => {
      setBackState(s);
      persist({ cardBackStyle: s });
    },
    [persist]
  );

  return (
    <DeckPrefsContext.Provider value={{ deckStyle, cardBackStyle, setDeckStyle, setCardBackStyle }}>
      {children}
    </DeckPrefsContext.Provider>
  );
}

export function useDeckPrefs(): DeckPrefsState {
  const ctx = useContext(DeckPrefsContext);
  if (!ctx) throw new Error("useDeckPrefs must be used within DeckPrefsProvider");
  return ctx;
}

/** Maps a card's canonical image path (always the minimal-set /cards/*.svg from cards.json)
 * to the active art set. The classic set mirrors the same basenames as webp under /cards/classic/. */
export function deckImageSrc(image: string, style: DeckStyle): string {
  if (style === "classic") {
    const m = image.match(/^\/cards\/([\w-]+)\.svg$/);
    if (m) return `/cards/classic/${m[1]}.webp`;
  }
  return image;
}

export function cardBackSrc(style: CardBackStyle): string {
  return style === "damask" ? "/cards/back-damask.svg" : "/cards/back-lunar.svg";
}
