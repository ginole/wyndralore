"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "./AuthProvider";

export default function SiteHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-6 sm:px-10">
      <Link href="/" aria-label="Wyndralore">
        <Image src="/wyndralore-wordmark.png" alt="Wyndralore" width={647} height={117} className="h-7 w-auto sm:h-8" priority />
      </Link>
      <nav className="font-accent flex items-center gap-5 text-xs uppercase tracking-[0.2em] text-moon-dim">
        <Link href="/masters" className="transition-colors hover:text-gold">
          Masters
        </Link>
        <Link href="/cards" className="hidden transition-colors hover:text-gold sm:inline">
          Cards
        </Link>
        {!loading && user?.isPremium && (
          <Link href="/journal" className="hidden transition-colors hover:text-gold sm:inline">
            Journal
          </Link>
        )}
        <Link href="/pricing" className="transition-colors hover:text-gold">
          Pricing
        </Link>
        {!loading && (
          <Link href="/account" className="transition-colors hover:text-gold">
            {user ? "Account" : "Sign In"}
          </Link>
        )}
      </nav>
    </header>
  );
}
