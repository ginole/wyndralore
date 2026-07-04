import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto border-t border-ink-line/60 px-6 py-8 text-center sm:px-10">
      <nav className="mb-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.2em] text-moon-dim">
        <Link href="/cards" className="transition-colors hover:text-gold">
          Card Meanings
        </Link>
        <Link href="/pricing" className="transition-colors hover:text-gold">
          Pricing
        </Link>
        <Link href="/terms" className="transition-colors hover:text-gold">
          Terms
        </Link>
        <Link href="/privacy" className="transition-colors hover:text-gold">
          Privacy
        </Link>
        <a href="mailto:hello@wyndralore.com" className="transition-colors hover:text-gold">
          Contact Us
        </a>
      </nav>
      <p className="mx-auto max-w-xl text-xs leading-relaxed text-moon-dim">
        For entertainment and self-reflection purposes only. Not a substitute for professional advice.
      </p>
      <p className="mt-3 text-xs text-moon-dim/70">© {new Date().getFullYear()} Wyndralore</p>
    </footer>
  );
}
