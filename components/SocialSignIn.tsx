"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/useLocale";
import { getAppDict } from "@/lib/i18nApp";
import { REF_STORAGE_KEY } from "@/lib/referral";
import { VIA_STORAGE_KEY } from "@/lib/affiliate";

/**
 * Google / LINE sign-in buttons above the email form.
 *
 * These are plain links, not fetch() calls: the browser has to make a top-level navigation to the
 * provider. The referral (?ref=) and affiliate (?via=) codes live in localStorage and are handed to
 * the start route here — the server-side OAuth callback can't read localStorage, and the password
 * register POST that normally forwards them has no equivalent in a redirect flow.
 */
export default function SocialSignIn({ next }: { next: string }) {
  const t = getAppDict(useLocale()).account;
  const [providers, setProviders] = useState<{ google: boolean; line: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/oauth/providers")
      .then((r) => r.json())
      .then((d) => alive && setProviders(d))
      .catch(() => alive && setProviders({ google: false, line: false }));
    return () => {
      alive = false;
    };
  }, []);

  // Render nothing until we know — a button that flashes in and then vanishes is worse than a
  // moment of nothing, and neither provider being configured is a legitimate state.
  if (!providers || (!providers.google && !providers.line)) return null;

  const startUrl = (provider: "google" | "line") => {
    const params = new URLSearchParams({ next });
    try {
      const ref = window.localStorage.getItem(REF_STORAGE_KEY);
      const via = window.localStorage.getItem(VIA_STORAGE_KEY);
      if (ref) params.set("ref", ref);
      if (via) params.set("via", via);
    } catch {
      /* private mode — the codes are a bonus, never a blocker */
    }
    return `/api/auth/oauth/${provider}/start?${params}`;
  };

  return (
    <div className="mb-6 flex flex-col gap-3">
      {providers.google && (
        <a
          href={startUrl("google")}
          className="flex items-center justify-center gap-3 rounded-full border border-ink-line bg-ink-raised/60 px-6 py-3 text-sm text-moon transition-colors hover:border-gold-dim hover:text-gold"
        >
          <svg aria-hidden="true" viewBox="0 0 18 18" className="h-[18px] w-[18px]">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
            />
          </svg>
          {t.continueWithGoogle}
        </a>
      )}
      {providers.line && (
        <a
          href={startUrl("line")}
          className="flex items-center justify-center gap-3 rounded-full border border-ink-line bg-ink-raised/60 px-6 py-3 text-sm text-moon transition-colors hover:border-gold-dim hover:text-gold"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="#06C755">
            <path d="M12 2C6.48 2 2 5.66 2 10.15c0 4.02 3.55 7.39 8.35 8.03.32.07.77.21.88.49.1.25.07.64.03.89l-.14.85c-.04.25-.2.98.86.53s5.7-3.36 7.78-5.75c1.43-1.57 2.12-3.17 2.12-4.95C21.88 5.66 17.4 2 12 2ZM7.6 13.1H5.62a.53.53 0 0 1-.53-.52V8.63a.53.53 0 0 1 1.06 0v3.42H7.6a.53.53 0 0 1 0 1.05Zm2.07-.52a.53.53 0 0 1-1.06 0V8.63a.53.53 0 0 1 1.06 0v3.95Zm4.76 0a.53.53 0 0 1-.95.32l-2.03-2.76v2.44a.53.53 0 0 1-1.06 0V8.63a.53.53 0 0 1 .95-.32l2.03 2.76V8.63a.53.53 0 0 1 1.06 0v3.95Zm3.19-2.5a.53.53 0 0 1 0 1.05h-1.45v.92h1.45a.53.53 0 0 1 0 1.05h-1.98a.53.53 0 0 1-.53-.52V8.63a.53.53 0 0 1 .53-.53h1.98a.53.53 0 0 1 0 1.06h-1.45v.92h1.45Z" />
          </svg>
          {t.continueWithLine}
        </a>
      )}
      <div className="mt-2 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink-line" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-moon-dim">{t.orUseEmail}</span>
        <span className="h-px flex-1 bg-ink-line" />
      </div>
    </div>
  );
}
