import { SpreadConfig } from "./types";

export const SPREADS: Record<string, SpreadConfig> = {
  daily: {
    slug: "daily",
    title: "Card of the Day",
    subtitle: "One card to carry with you today — or three piles to choose from.",
    count: 1,
    free: true,
    positions: ["Today"],
  },
  "yes-no": {
    slug: "yes-no",
    title: "Yes / No",
    subtitle: "A quick, honest answer to sit with.",
    count: 1,
    free: true,
    positions: ["Answer"],
  },
  // The format every tarot-TikTok viewer already knows — three parallel piles, choose the one
  // that calls to you. Also what our own short-videos film with (the position labels ARE the
  // pile numbers, so recordings need no editing to hide a timeline). Deliberately NOT in
  // SPREAD_ORDER: it shares the "Card of the Day" homepage tile, reached via the mode toggle
  // on the intro screen (a 7th tile orphaned the 3-column grid). Both modes count the streak.
  "pick-a-card": {
    slug: "pick-a-card",
    title: "Pick a Card",
    subtitle: "Three piles, one choice. Trust the pull.",
    count: 3,
    free: true,
    positions: ["Pile One", "Pile Two", "Pile Three"],
  },
  "three-card": {
    slug: "three-card",
    title: "Past · Present · Future",
    subtitle: "See the shape of where you've been, where you are, and where you're headed.",
    count: 3,
    free: true,
    positions: ["Past", "Present", "Future"],
  },
  love: {
    slug: "love",
    title: "Love Spread",
    subtitle: "A closer look at the heart of a relationship.",
    count: 5,
    free: false,
    positions: ["You", "Them", "The Connection", "Challenge", "Potential"],
  },
  career: {
    slug: "career",
    title: "Career Path",
    subtitle: "Clarity on the work that's calling you.",
    count: 5,
    free: false,
    positions: ["Current Path", "Obstacle", "Strength", "Advice", "Outcome"],
  },
  "celtic-cross": {
    slug: "celtic-cross",
    title: "Celtic Cross",
    subtitle: "The full ten-card ritual for a deep, layered question.",
    count: 10,
    free: false,
    positions: [
      "Present",
      "Challenge",
      "Foundation",
      "Recent Past",
      "Above",
      "Near Future",
      "Yourself",
      "Environment",
      "Hopes & Fears",
      "Outcome",
    ],
  },
};

export const SPREAD_ORDER = ["daily", "yes-no", "three-card", "love", "career", "celtic-cross"];

export function getSpread(slug: string): SpreadConfig | undefined {
  return SPREADS[slug];
}
