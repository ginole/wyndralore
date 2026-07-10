"use client";

import { useEffect, useState } from "react";

interface OrderInfo {
  orderCode: string;
  masterName: string;
}

// No-login listen page a buyer reaches from their "reading delivered" email. The <audio> element
// points at our own token-gated proxy route — never the raw private Blob URL — so the link stays
// re-listenable without ever exposing an unauthenticated path to the recording.
export default function MasterListenPlayer({ token }: { token: string }) {
  const [info, setInfo] = useState<OrderInfo | "loading" | "invalid">("loading");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/masters/listen/${token}`);
      if (!res.ok) {
        setInfo("invalid");
        return;
      }
      setInfo(await res.json());
    })();
  }, [token]);

  if (info === "loading") {
    return <div className="min-h-[60vh]" />;
  }

  if (info === "invalid") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl text-moon">Link expired</h1>
        <p className="mt-3 text-sm text-moon-dim">This listening link is no longer valid.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Order {info.orderCode}</p>
      <h1 className="font-display mt-3 text-3xl text-moon">A reading from {info.masterName}</h1>
      <p className="mt-4 text-sm leading-relaxed text-moon-dim">Recorded just for you — take a quiet moment before you press play.</p>

      <div className="mt-10 rounded-2xl border border-gold-dim bg-ink-raised/60 p-6">
        <video controls className="w-full rounded-xl" src={`/api/masters/listen/${token}/media`}>
          Your browser doesn&apos;t support inline playback —{" "}
          <a href={`/api/masters/listen/${token}/media`} className="text-gold underline">
            download the recording
          </a>
          .
        </video>
      </div>
    </section>
  );
}
