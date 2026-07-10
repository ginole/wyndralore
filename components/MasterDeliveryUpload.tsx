"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";

interface OrderInfo {
  orderCode: string;
  question: string | null;
  deliverBy: string | null;
  masterName: string;
}

// No-login delivery page a master reaches from her "new reading" email. Uploads go straight from
// the browser to Blob storage (handleUploadUrl handshake) — this route never sees the file bytes,
// so there's no serverless body-size limit to worry about for a few minutes of audio/video.
export default function MasterDeliveryUpload({ token }: { token: string }) {
  const [info, setInfo] = useState<OrderInfo | "loading" | "invalid">("loading");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/masters/deliver/${token}`);
      if (!res.ok) {
        setInfo("invalid");
        return;
      }
      setInfo(await res.json());
    })();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || info === "loading" || info === "invalid") return;
    setStatus("uploading");
    setError(null);
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      await upload(`masters/${info.orderCode}/reading.${ext}`, file, {
        access: "private",
        handleUploadUrl: `/api/masters/deliver/${token}`,
        contentType: file.type || undefined,
      });
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — please try again.");
      setStatus("error");
    }
  }

  if (info === "loading") {
    return <div className="min-h-[60vh]" />;
  }

  if (info === "invalid") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl text-moon">Link expired</h1>
        <p className="mt-3 text-sm text-moon-dim">
          This delivery link is no longer valid — it may have already been used, or the reading may have been refunded.
        </p>
      </section>
    );
  }

  if (status === "done") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Delivered</p>
        <h1 className="font-display mt-3 text-3xl text-moon">Sent — thank you</h1>
        <p className="mt-3 text-sm text-moon-dim">Your reading is on its way to them right now.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Order {info.orderCode}</p>
      <h1 className="font-display mt-3 text-3xl text-moon">Record their reading</h1>
      {info.question ? (
        <p className="mt-4 text-sm italic leading-relaxed text-moon-dim">&ldquo;{info.question}&rdquo;</p>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-moon-dim">They didn&apos;t leave a specific question — read generally.</p>
      )}
      {info.deliverBy && (
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-gold-dim">
          Deliver by {new Date(info.deliverBy).toLocaleString()}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Voice or video recording</span>
          <input
            type="file"
            accept="audio/*,video/*"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-xl border border-ink-line bg-ink-raised/60 p-3 text-sm text-moon file:mr-3 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-xs file:font-medium file:uppercase file:tracking-widest file:text-ink"
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={!file || status === "uploading"}
          className="mt-2 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
        >
          {status === "uploading" ? "Sending…" : "Deliver Reading"}
        </button>
      </form>
    </section>
  );
}
