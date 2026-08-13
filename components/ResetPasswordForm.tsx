"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useAppT, useLocale } from "@/lib/useLocale";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { refresh } = useAuth();
  const t = useAppT().account;
  const locale = useLocale();
  // Stay in the tree they're already in. A creator claiming her account from a 繁體 letter must not
  // be dropped onto the English account page at the end of it.
  const accountHref = locale === "zh-TW" ? "/tc/account" : "/account";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t.passwordsNoMatchRetype);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.somethingWrong);
        return;
      }
      await refresh();
      setDone(true);
      setTimeout(() => router.push(accountHref), 1500);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl text-moon">{t.invalidLinkTitle}</h1>
        <p className="mt-3 text-sm text-moon-dim">{t.invalidLinkBody}</p>
        <Link href={accountHref} className="mt-6 text-sm uppercase tracking-[0.2em] text-gold underline underline-offset-4">
          {t.backToSignIn}
        </Link>
      </section>
    );
  }

  if (done) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl text-moon">{t.passwordUpdatedTitle}</h1>
        <p className="mt-3 text-sm text-moon-dim">{t.passwordUpdatedBody}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="font-display mb-6 text-center text-3xl text-moon">{t.chooseNewPassword}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">{t.newPassword}</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-ink-line bg-ink-raised/60 p-3 text-sm text-moon focus:border-gold-dim focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">{t.confirmNewPassword}</span>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`rounded-xl border bg-ink-raised/60 p-3 text-sm text-moon focus:outline-none ${
              confirmPassword && confirmPassword !== password
                ? "border-red-400/70 focus:border-red-400"
                : "border-ink-line focus:border-gold-dim"
            }`}
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
        >
          {submitting ? t.pleaseWait : t.updatePassword}
        </button>
      </form>
    </section>
  );
}
