"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { MASTERS_MARKETPLACE_ENABLED } from "@/lib/featureFlags";
import { localeFromPathname, getDict, TW_PREFIX } from "@/lib/i18n";

export default function SiteHeader() {
  const { user, loading } = useAuth();
  const pathname = usePathname() ?? "/";
  const locale = localeFromPathname(pathname);
  const t = getDict(locale).nav;
  const tw = locale === "zh-TW";

  // Content pages that exist in 繁體 get /tw links; account/journal have no 繁體 version yet, so
  // they stay on the English routes (functional, just English — a known MVP gap).
  const home = tw ? TW_PREFIX : "/";
  const cards = tw ? `${TW_PREFIX}/cards` : "/cards";
  const pricing = tw ? `${TW_PREFIX}/pricing` : "/pricing";
  const account = tw ? `${TW_PREFIX}/account` : "/account";
  const journal = tw ? `${TW_PREFIX}/journal` : "/journal";

  return (
    <header className="relative z-20 flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-10 sm:py-6">
      <div className="flex items-center justify-between">
        <Link href={home} aria-label="Wyndralore">
          <Image src="/wyndralore-wordmark.png" alt="Wyndralore" width={647} height={117} className="h-7 w-auto sm:h-8" priority />
        </Link>
        {!loading && (
          <Link href={account} className="font-accent text-xs uppercase tracking-[0.15em] text-moon-dim transition-colors hover:text-gold sm:hidden">
            {user ? t.account : t.signIn}
          </Link>
        )}
      </div>
      <nav className="font-accent flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs uppercase tracking-[0.15em] text-moon-dim sm:justify-end sm:tracking-[0.2em]">
        {/* Explicit Home link: the clickable wordmark returns here, but not every visitor knows that
            convention (the founder flagged it) — an inner-page reader looking to start over needs an
            obvious way back. Shown on every page for a stable nav; on "/" it's the current page. */}
        <Link href={home} className="transition-colors hover:text-gold">
          {t.home}
        </Link>
        {MASTERS_MARKETPLACE_ENABLED && !tw && (
          <Link href="/masters" className="transition-colors hover:text-gold">
            Masters
          </Link>
        )}
        <Link href={cards} className="transition-colors hover:text-gold">
          {t.cards}
        </Link>
        {!loading && user?.isPremium && (
          <Link href={journal} className="transition-colors hover:text-gold">
            {t.journal}
          </Link>
        )}
        <Link href={pricing} className="transition-colors hover:text-gold">
          {t.pricing}
        </Link>
        {!loading && (
          <Link href={account} className="hidden transition-colors hover:text-gold sm:inline">
            {user ? t.account : t.signIn}
          </Link>
        )}
      </nav>
    </header>
  );
}
