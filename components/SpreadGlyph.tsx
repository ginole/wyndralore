/**
 * A hairline diagram of a spread's real card arrangement.
 *
 * The homepage listed every spread as an identical rounded rectangle with a title and two lines
 * of grey text, so a page about seven visually distinct rituals looked like one repeated row.
 * These glyphs fix that without decoration: each one draws the actual geometry of that spread, so
 * the cards differ *because the spreads differ*. Two spreads that both use three cards still read
 * differently — pick-a-card overlaps (you choose one of three), three-card spaces them out (three
 * positions you receive) — which is exactly the distinction a newcomer needs to see.
 *
 * Every glyph draws its cards at the SAME physical size and sizes its own box to fit, so a
 * ten-card spread is visibly wider than a one-card spread. That width difference is information,
 * not styling.
 *
 * Purely presentational and inert: `aria-hidden`, no interactivity, no layout thrash. Geometry
 * lives here rather than in lib/spreads.ts because it is a drawing concern, not reading data.
 */

type Card = { x: number; y: number; r?: number };

const W = 3.4; // card width in layout units — a 2:3 card
const H = 5.1;
const PX_PER_UNIT = 3.6; // one shared scale, so a card is the same size in every glyph
const PAD = 1.1;

const LAYOUTS: Record<string, Card[]> = {
  // One card, centred. The whole ritual is a single draw.
  daily: [{ x: 0, y: 0 }],
  // One card — the marks beside it carry the binary answer.
  "yes-no": [{ x: 0, y: 0 }],
  // Three overlapping face-down cards: you pick ONE of them.
  "pick-a-card": [
    { x: -2.6, y: 0.3, r: -12 },
    { x: 0, y: 0 },
    { x: 2.6, y: 0.3, r: 12 },
  ],
  // Three cards laid apart: past, present, future — three positions you receive.
  "three-card": [
    { x: -4.4, y: 0 },
    { x: 0, y: 0 },
    { x: 4.4, y: 0 },
  ],
  // Two people facing each other, the bond between them, its challenge below, direction above.
  love: [
    { x: -5.2, y: 0 },
    { x: 5.2, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 5.6 },
    { x: 0, y: -5.6 },
  ],
  // A path that climbs — the spread is called "the road of work".
  career: [
    { x: -6.4, y: 3.4 },
    { x: -3.2, y: 1.7 },
    { x: 0, y: 0 },
    { x: 3.2, y: -1.7 },
    { x: 6.4, y: -3.4 },
  ],
  // The Celtic Cross: a crossed centre, four cardinal cards, and the staff of four beside it.
  "celtic-cross": [
    { x: -4, y: 0 },
    { x: -4, y: 0, r: 90 },
    { x: -4, y: -6.2 },
    { x: -4, y: 6.2 },
    { x: -9.6, y: 0 },
    { x: 1.6, y: 0 },
    { x: 7.4, y: 6.9 },
    { x: 7.4, y: 2.3 },
    { x: 7.4, y: -2.3 },
    { x: 7.4, y: -6.9 },
  ],
};

/** Half-extent of a card once rotated, so a 90°-turned card doesn't get clipped. */
function halfExtent(c: Card) {
  const rad = ((c.r ?? 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return { hx: (W * cos + H * sin) / 2, hy: (W * sin + H * cos) / 2 };
}

export default function SpreadGlyph({ slug, className = "" }: { slug: string; className?: string }) {
  const cards = LAYOUTS[slug] ?? LAYOUTS.daily;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of cards) {
    const { hx, hy } = halfExtent(c);
    minX = Math.min(minX, c.x - hx);
    maxX = Math.max(maxX, c.x + hx);
    minY = Math.min(minY, c.y - hy);
    maxY = Math.max(maxY, c.y + hy);
  }
  if (slug === "yes-no") {
    minX -= 4.2; // room for the ✕ / ✓ marks flanking the card
    maxX += 4.2;
  }
  minX -= PAD; maxX += PAD; minY -= PAD; maxY += PAD;
  const vw = maxX - minX;
  const vh = maxY - minY;

  return (
    <svg
      aria-hidden
      viewBox={`${minX} ${minY} ${vw} ${vh}`}
      width={Math.round(vw * PX_PER_UNIT)}
      height={Math.round(vh * PX_PER_UNIT)}
      className={className}
      fill="none"
    >
      <g stroke="currentColor" strokeWidth="1" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
        {cards.map((c, i) => (
          <rect
            key={i}
            x={-W / 2}
            y={-H / 2}
            width={W}
            height={H}
            rx="0.55"
            transform={`translate(${c.x} ${c.y})${c.r ? ` rotate(${c.r})` : ""}`}
            fill="currentColor"
            fillOpacity="0.07"
          />
        ))}
        {slug === "yes-no" && (
          <g strokeLinecap="round" opacity="0.85">
            <path d="M-5.3 -0.9 l1.9 1.9 M-3.4 -0.9 l-1.9 1.9" />
            <path d="M3.4 0.2 l0.9 0.9 l1.6 -1.8" />
          </g>
        )}
      </g>
    </svg>
  );
}
