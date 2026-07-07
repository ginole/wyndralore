import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Wyndralore",
  description: "How Wyndralore handles your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl text-moon">Privacy Policy</h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-moon-dim">Last updated: July 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-moon-dim">
        <p>
          We keep Wyndralore&apos;s data practices simple and respectful. This policy explains what we collect, why, who
          we share it with, and the choices you have.
        </p>

        <div>
          <h2 className="font-display text-xl text-moon">What we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="text-moon">Account data:</strong> your email address and a securely hashed password.
            </li>
            <li>
              <strong className="text-moon">Reading data:</strong> if you&apos;re a Premium member and choose to save a
              reading, we store the cards, your question, and your notes.
            </li>
            <li>
              <strong className="text-moon">AI reading content:</strong> when you request an AI-generated reading, the
              cards you drew and any question you type are sent to our AI provider (Anthropic) to produce that reading.
              This content is used only to generate your reading and is not used to train AI models.
            </li>
            <li>
              <strong className="text-moon">Payment records:</strong> order details and the payment confirmations we
              receive from our payment processors (Lemon Squeezy and, for bank transfers, Wise), kept for accounting
              and support. We never see or store your full card number.
            </li>
            <li>
              <strong className="text-moon">Usage &amp; advertising data:</strong> we record basic events (page visits,
              readings completed, funnel steps) for analytics, and we use advertising and measurement tools that set
              cookies to understand traffic and ad performance. See &ldquo;Cookies &amp; tracking&rdquo; below.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">Cookies &amp; tracking</h2>
          <p className="mt-2">
            <strong className="text-moon">First-party cookies</strong> we set ourselves: one to keep you signed in, and
            one anonymous id used for our own privacy-friendly analytics.
          </p>
          <p className="mt-2">
            <strong className="text-moon">Third-party cookies</strong> set by tools we use for analytics and
            advertising: Google Analytics, Google AdSense, and the Meta (Facebook) Pixel. These providers may set
            cookies and use them to measure traffic, show and measure ads, and — where they operate their own ad
            networks — build advertising profiles. We don&apos;t control those cookies directly.
          </p>
          <p className="mt-2">
            You can limit this: manage or block cookies in your browser settings, opt out of personalized Google ads at{" "}
            <a className="text-gold underline" href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
              adssettings.google.com
            </a>
            , and adjust Meta ad preferences in your Facebook account settings.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">Who we share data with</h2>
          <p className="mt-2">We rely on a small set of trusted providers, each processing only what it needs:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong className="text-moon">Lemon Squeezy &amp; Wise</strong> — payment processing.</li>
            <li><strong className="text-moon">Anthropic</strong> — generating AI readings from your cards and question.</li>
            <li><strong className="text-moon">Resend</strong> — sending transactional email (confirmations, password resets).</li>
            <li><strong className="text-moon">Google</strong> — analytics (Google Analytics) and advertising (AdSense).</li>
            <li><strong className="text-moon">Meta</strong> — ad performance and conversion measurement (Pixel &amp; Conversions API).</li>
          </ul>
          <p className="mt-2">
            Some of these providers are located outside your country (for example, in the United States), so your data
            may be processed there.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">What we don&apos;t do</h2>
          <p className="mt-2">
            We don&apos;t sell your personal data for money. We don&apos;t send marketing spam — the only emails we send
            are transactional: account verification, payment confirmations, and plan-expiry reminders. Note that the
            advertising cookies described above may, under some privacy laws, count as &ldquo;sharing&rdquo; data for
            targeted advertising; you can opt out using the controls above.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">Your choices</h2>
          <p className="mt-2">
            You can request a copy of your data, or ask us to delete your account and associated data, at any time by
            emailing hello@wyndralore.com. You can also control advertising and analytics cookies using the browser and
            provider controls described under &ldquo;Cookies &amp; tracking.&rdquo;
          </p>
        </div>

        <p>Questions about your privacy? Email hello@wyndralore.com.</p>
      </div>
    </section>
  );
}
