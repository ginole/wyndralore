import { Orientation } from "@/lib/types";

interface CardFaceProps {
  src: string;
  alt: string;
  orientation?: Orientation;
  priority?: boolean;
  className?: string;
  /** "hover" = gloss sweep when a parent .group is hovered; "loop" = ambient sweep. */
  shine?: "loop" | "hover" | "none";
}

export default function CardFace({ src, alt, orientation = "upright", priority = false, className = "", shine = "none" }: CardFaceProps) {
  const img = (
    <img
      src={src}
      alt={alt}
      width={400}
      height={640}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      className={`h-full w-full rounded-[10px] object-cover shadow-[0_18px_40px_-12px_rgba(0,0,0,0.65)] transition-transform ${
        orientation === "reversed" ? "rotate-180" : ""
      } ${className}`}
    />
  );

  if (shine === "none") return img;

  return (
    <div className="relative h-full w-full">
      {img}
      <span aria-hidden className={`card-shine ${shine === "loop" ? "card-shine-loop" : "card-shine-hover"}`} />
    </div>
  );
}
