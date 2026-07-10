import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Meet Our Masters — Wyndralore",
  description: "Readings from the tarot creators you already follow — an instant AI reading in her style, or a personal reading recorded just for you.",
};

export const dynamic = "force-dynamic";

export default async function MastersHallPage() {
  const masters = await prisma.masterProfile.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="mx-auto max-w-5xl px-6 py-20 text-center sm:px-10">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Meet Our Masters</p>
      <h1 className="font-display mt-4 text-4xl text-moon sm:text-5xl">The Hall</h1>
      <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-moon-dim">
        Readings from the tarot creators you already follow — her own voice, her own style, an altar of her own.
      </p>

      {masters.length === 0 ? (
        <p className="mt-16 text-sm text-moon-dim">No masters are taking readings right now — check back soon.</p>
      ) : (
        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-5 sm:grid-cols-3">
          {masters.map((m) => (
            <Link
              key={m.id}
              href={`/masters/${m.handle}`}
              className="group flex flex-col items-center rounded-2xl border border-ink-line bg-ink-raised/60 p-6 transition-colors hover:border-gold-dim"
            >
              <div className="relative h-20 w-20 overflow-hidden rounded-full border border-gold-dim bg-ink">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gold-dim/40 to-ink" />
                )}
                <span
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ink-raised ${
                    m.vacationMode ? "bg-moon-dim/40" : "bg-emerald-400"
                  }`}
                />
              </div>
              <p className="font-display mt-3 text-lg italic text-moon">{m.displayName}</p>
              {m.tagline && <p className="mt-1 line-clamp-2 text-xs text-moon-dim">{m.tagline}</p>}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
