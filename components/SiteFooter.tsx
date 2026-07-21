"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MASTERS_MARKETPLACE_ENABLED } from "@/lib/featureFlags";
import { localeFromPathname, getDict, TW_PREFIX } from "@/lib/i18n";

export default function SiteFooter() {
  const pathname = usePathname() ?? "/";
  const locale = localeFromPathname(pathname);
  const t = getDict(locale).footer;
  const tw = locale === "zh-TW";

  const cards = tw ? `${TW_PREFIX}/cards` : "/cards";
  const pricing = tw ? `${TW_PREFIX}/pricing` : "/pricing";
  const P = (p: string) => (tw ? `${TW_PREFIX}${p}` : p);

  return (
    <footer className="relative z-10 mt-auto border-t border-ink-line/60 px-6 py-8 text-center sm:px-10">
      <nav className="font-accent mb-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.2em] text-moon-dim">
        <Link href={cards} className="transition-colors hover:text-gold">
          {t.cardMeanings}
        </Link>
        {MASTERS_MARKETPLACE_ENABLED && !tw && (
          <Link href="/masters" className="transition-colors hover:text-gold">
            Masters
          </Link>
        )}
        <Link href={pricing} className="transition-colors hover:text-gold">
          {t.pricing}
        </Link>
        <Link href={P("/terms")} className="transition-colors hover:text-gold">
          {t.terms}
        </Link>
        <Link href={P("/privacy")} className="transition-colors hover:text-gold">
          {t.privacy}
        </Link>
        <Link href={P("/refunds")} className="transition-colors hover:text-gold">
          {t.refunds}
        </Link>
        <a href="mailto:hello@wyndralore.com" className="transition-colors hover:text-gold">
          {t.contact}
        </a>
      </nav>
      <p className="mx-auto max-w-xl text-xs leading-relaxed text-moon-dim">{t.disclaimer}</p>
      <p className="mt-3 text-xs text-moon-dim/70">© {new Date().getFullYear()} Wyndralore</p>
    </footer>
  );
}
