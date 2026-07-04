const CARDS = [
  { src: "/cards/major-17-star.svg", className: "left-[4%] top-[12%] w-36 sm:w-44 md:w-52", rotA: "-8deg", rotB: "4deg", x: "16px", y: "-26px", delay: "0s", mobile: true },
  { src: "/cards/major-18-moon.svg", className: "right-[2%] top-[46%] w-32 sm:w-40 md:w-48 hidden md:block", rotA: "6deg", rotB: "-5deg", x: "-14px", y: "20px", delay: "-8s", mobile: false },
  { src: "/cards/major-21-world.svg", className: "left-[22%] bottom-[6%] w-28 sm:w-36 md:w-44 hidden md:block", rotA: "-4deg", rotB: "7deg", x: "10px", y: "-16px", delay: "-15s", mobile: false },
];

export default function BackgroundFloatingCards() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {CARDS.map((c) => (
        <div
          key={c.src}
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
          <div className="relative h-full w-full overflow-hidden rounded-xl opacity-[0.22] blur-[0.5px]">
            <img src={c.src} className="h-full w-full object-cover" alt="" />
            <div className="float-card-gloss absolute inset-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
