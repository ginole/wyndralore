"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Incorrect password.");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xs flex-col justify-center px-6">
      <h1 className="font-display text-center text-2xl text-moon">Admin</h1>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="rounded-xl border border-ink-line bg-ink-raised/60 p-3 text-sm text-moon focus:border-gold-dim focus:outline-none"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-gold px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold-bright disabled:opacity-60"
        >
          {submitting ? "Checking…" : "Enter"}
        </button>
      </form>
    </section>
  );
}
