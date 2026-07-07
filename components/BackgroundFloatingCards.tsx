// Homepage hero atmosphere (PRD §6.2). Everything here is pure CSS/SVG — no image requests
// beyond the 3 card SVGs that are already part of the deck — so the "mysterious" feel costs
// nothing extra to load. Three depth layers: a slow constellation sigil far behind, drifting
// stardust + twinkling points in the mid-ground, and parallax floating cards up front.

const CARDS = [
  { src: "/cards/major-17-star.svg", className: "left-[3%] top-[10%] w-36 sm:w-44 md:w-52", rotA: "-8deg", rotB: "4deg", x: "18px", y: "-28px", delay: "0s", depth: 3 },
  { src: "/cards/major-18-moon.svg", className: "right-[2%] top-[42%] w-32 sm:w-40 md:w-48 hidden sm:block", rotA: "6deg", rotB: "-5deg", x: "-16px", y: "22px", delay: "-8s", depth: 2 },
  { src: "/cards/major-21-world.svg", className: "left-[20%] bottom-[5%] w-28 sm:w-36 md:w-44 hidden md:block", rotA: "-4deg", rotB: "7deg", x: "12px", y: "-18px", delay: "-15s", depth: 2 },
  { src: "/cards/major-17-star.svg", className: "right-[24%] top-[6%] w-24 sm:w-28 md:w-32 hidden lg:block", rotA: "5deg", rotB: "-6deg", x: "-12px", y: "20px", delay: "-20s", depth: 1 },
  { src: "/cards/major-18-moon.svg", className: "left-[8%] top-[52%] w-24 sm:w-28 md:w-32 hidden lg:block", rotA: "-6deg", rotB: "5deg", x: "14px", y: "-16px", delay: "-4s", depth: 1 },
];

// A few hand-placed twinkling stars — kept sparse so they read as accents, not noise.
const TWINKLES = [
  { className: "left-[18%] top-[22%]", size: 3, delay: "0s" },
  { className: "left-[70%] top-[16%]", size: 2, delay: "-1.4s" },
  { className: "left-[82%] top-[54%]", size: 3, delay: "-2.6s" },
  { className: "left-[30%] top-[70%]", size: 2, delay: "-3.1s" },
  { className: "left-[52%] top-[30%]", size: 2, delay: "-0.7s" },
  { className: "left-[12%] top-[46%]", size: 2, delay: "-2.0s" },
  { className: "left-[62%] top-[76%]", size: 3, delay: "-1.1s" },
];

// Champagne-gold, so it sits inside the existing palette rather than fighting it.
const GOLD = "#c9a96e";

export default function BackgroundFloatingCards() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Layer 1 — a large, faint constellation sigil that rotates almost imperceptibly. */}
      <svg
        className="constellation absolute left-1/2 top-[38%] h-[130vmin] w-[130vmin] -translate-x-1/2 -translate-y-1/2 opacity-[0.14]"
        viewBox="0 0 400 400"
        fill="none"
      >
        <circle cx="200" cy="200" r="150" stroke={GOLD} strokeWidth="0.5" />
        <circle cx="200" cy="200" r="118" stroke={GOLD} strokeWidth="0.4" opacity="0.7" />
        <circle cx="200" cy="200" r="176" stroke={GOLD} strokeWidth="0.3" opacity="0.5" />
        {/* 12-point star ring — draw spokes + outer nodes */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (Math.PI / 6) * i - Math.PI / 2;
          const x = 200 + 150 * Math.cos(a);
          const y = 200 + 150 * Math.sin(a);
          const x2 = 200 + 176 * Math.cos(a);
          const y2 = 200 + 176 * Math.sin(a);
          return (
            <g key={i}>
              <line x1="200" y1="200" x2={x} y2={y} stroke={GOLD} strokeWidth="0.3" opacity="0.35" />
              <circle cx={x2} cy={y2} r="1.6" fill={GOLD} />
            </g>
          );
        })}
        {/* Interlaced hexagram at the core */}
        <polygon points="200,86 298,255 102,255" stroke={GOLD} strokeWidth="0.5" />
        <polygon points="200,314 102,145 298,145" stroke={GOLD} strokeWidth="0.5" />
      </svg>

      {/* Layer 2 — drifting stardust (two offset radial-dot fields moving in opposite directions). */}
      <div className="stardust absolute inset-0" />
      <div className="stardust stardust-slow absolute inset-0" />

      {/* Twinkling accent stars */}
      {TWINKLES.map((t, i) => (
        <span
          key={i}
          className={`twinkle absolute rounded-full ${t.className}`}
          style={{ width: t.size, height: t.size, background: GOLD, animationDelay: t.delay }}
        />
      ))}

      {/* Layer 3 — parallax floating cards. Deeper cards are smaller, dimmer and blurrier. */}
      {CARDS.map((c, i) => {
        // Opacity floor raised (was 0.3/0.22/0.14) so the cards survive a dimmed screen instead
        // of sinking into the near-black ink; blur eased a touch so the gloss/texture still reads.
        const opacity = c.depth === 3 ? 0.5 : c.depth === 2 ? 0.38 : 0.26;
        const blur = c.depth === 3 ? "0.3px" : c.depth === 2 ? "0.7px" : "1.4px";
        return (
          <div
            key={`${c.src}-${i}`}
            className={`float-card absolute aspect-[5/8] ${c.className}`}
            style={
              {
                "--float-rot-a": c.rotA,
                "--float-rot-b": c.rotB,
                "--float-x": c.x,
                "--float-y": c.y,
                animationDelay: c.delay,
              } as React.CSSProperties
            }
          >
            <div
              className="relative h-full w-full overflow-hidden rounded-xl"
              style={{ opacity, filter: `blur(${blur})` }}
            >
              <img src={c.src} className="h-full w-full object-cover" alt="" />
              <div className="float-card-gloss absolute inset-0" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
