"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { MASTERS_MARKETPLACE_ENABLED } from "@/lib/featureFlags";

export default function SiteHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="relative z-20 flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-10 sm:py-6">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="Wyndralore">
          <Image src="/wyndralore-wordmark.png" alt="Wyndralore" width={647} height={117} className="h-7 w-auto sm:h-8" priority />
        </Link>
        {/* Account stays pinned in the top row on mobile so it's never buried below the fold of a
            wrapping nav; the nav below repeats it at sm+ where everything fits on one line. */}
        {!loading && (
          <Link href="/account" className="font-accent text-xs uppercase tracking-[0.15em] text-moon-dim transition-colors hover:text-gold sm:hidden">
            {user ? "Account" : "Sign In"}
          </Link>
        )}
      </div>
      <nav className="font-accent flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs uppercase tracking-[0.15em] text-moon-dim sm:justify-end sm:tracking-[0.2em]">
        {MASTERS_MARKETPLACE_ENABLED && (
          <Link href="/masters" className="transition-colors hover:text-gold">
            Masters
          </Link>
        )}
        <Link href="/cards" className="transition-colors hover:text-gold">
          Cards
        </Link>
        {!loading && user?.isPremium && (
          <Link href="/journal" className="transition-colors hover:text-gold">
            Journal
          </Link>
        )}
        <Link href="/pricing" className="transition-colors hover:text-gold">
          Pricing
        </Link>
        {!loading && (
          <Link href="/account" className="hidden transition-colors hover:text-gold sm:inline">
            {user ? "Account" : "Sign In"}
          </Link>
        )}
      </nav>
    </header>
  );
}
