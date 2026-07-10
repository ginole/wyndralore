import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { MASTER_PRICE_USD } from "@/lib/masters";
import MasterAltarActions from "@/components/MasterAltarActions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const master = await prisma.masterProfile.findUnique({ where: { handle } });
  if (!master) return { title: "Master Not Found — Wyndralore" };
  return {
    title: `Reading with ${master.displayName} — Wyndralore Masters`,
    description: master.tagline ?? `A personal tarot reading from ${master.displayName}.`,
  };
}

export default async function MasterAltarPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const master = await prisma.masterProfile.findUnique({ where: { handle } });
  if (!master || master.status !== "active") notFound();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayCount = await prisma.masterOrder.count({
    where: { masterId: master.id, kind: "live_voice", status: { in: ["paid", "delivered", "released"] }, createdAt: { gte: startOfDay } },
  });
  const spotsLeft = Math.max(0, master.dailyCapacity - todayCount);

  return (
    <section className="mx-auto max-w-2xl px-6 py-16 text-center">
      <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border border-gold bg-ink-raised">
        {master.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={master.photoUrl} alt={master.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-gold-dim/40 to-ink" />
        )}
      </div>

      <h1 className="font-display mt-5 text-3xl italic text-moon sm:text-4xl">Reading with {master.displayName}</h1>
      {master.tagline && <p className="mt-2 text-sm text-moon-dim">&ldquo;{master.tagline}&rdquo;</p>}
      {master.channelUrl && (
        <a href={master.channelUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs uppercase tracking-[0.2em] text-gold hover:text-gold-bright">
          ✦ As seen on her channel
        </a>
      )}

      {master.deepLinkUrl && (
        <p className="mx-auto mt-6 max-w-md rounded-lg border-l-2 border-gold bg-gold/5 px-4 py-3 text-left text-xs text-moon-dim">
          {master.displayName} also offers private 1:1 depth sessions —{" "}
          <a href={master.deepLinkUrl} target="_blank" rel="noreferrer" className="text-gold underline">
            see her deepest offering
          </a>
          .
        </p>
      )}

      <MasterAltarActions
        handle={master.handle}
        displayName={master.displayName}
        aiPriceLabel={`$${MASTER_PRICE_USD.ai_style.toFixed(2)}`}
        voicePriceLabel={`$${MASTER_PRICE_USD.live_voice.toFixed(2)}`}
        spotsLeft={spotsLeft}
        dailyCapacity={master.dailyCapacity}
        vacationMode={master.vacationMode}
        deepLinkUrl={master.deepLinkUrl}
      />
    </section>
  );
}
