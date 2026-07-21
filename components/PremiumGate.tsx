"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { localeFromPathname, getDict, TW_PREFIX } from "@/lib/i18n";

// Wraps the deep-dive (love/career/wellness) sections of a card page. The content is always
// in the DOM for SEO, but visually locked behind a Premium upsell for non-premium visitors.
export default function PremiumGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const unlocked = Boolean(user?.isPremium);

  if (loading) {
    // Assume locked during load to avoid a flash of unlocked content.
    return <LockedShell>{children}</LockedShell>;
  }

  if (unlocked) return <>{children}</>;

  return <LockedShell>{children}</LockedShell>;
}

function LockedShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const locale = localeFromPathname(pathname);
  const t = getDict(locale).premium;
  const pricing = locale === "zh-TW" ? `${TW_PREFIX}/pricing` : "/pricing";

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-ink/70 p-6 text-center backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{t.label}</p>
        <p className="mt-2 max-w-xs text-sm text-moon-dim">{t.blurb}</p>
        <Link
          href={pricing}
          className="mt-4 rounded-full bg-gold px-6 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold-bright"
        >
          {t.cta}
        </Link>
      </div>
    </div>
  );
}
