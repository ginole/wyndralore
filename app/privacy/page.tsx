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
          We keep Wyndralore&apos;s data practices simple and respectful. This policy explains what we collect, why, and
          what choices you have.
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
              <strong className="text-moon">Payment records:</strong> order details and the payment confirmations we
              receive from Wise, kept for accounting and support.
            </li>
            <li>
              <strong className="text-moon">Anonymous analytics:</strong> we record basic events (page visits, readings
              completed, funnel steps) tied to an anonymous cookie id — never sold, never shared, and never linked to
              third-party advertising profiles.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">What we don&apos;t do</h2>
          <p className="mt-2">
            We don&apos;t sell your data. We don&apos;t send marketing spam. The only emails we send are transactional:
            account verification, payment confirmations, and plan-expiry reminders.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">Cookies</h2>
          <p className="mt-2">
            We use a small number of first-party cookies: one to keep you signed in, and one anonymous id for
            privacy-friendly analytics. We don&apos;t use third-party advertising or tracking cookies.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">Your choices</h2>
          <p className="mt-2">
            You can request a copy of your data or ask us to delete your account and associated data at any time by
            emailing hello@wyndralore.com.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">Third parties</h2>
          <p className="mt-2">
            We rely on a few trusted providers to run the service: Wise (payments) and a transactional email provider.
            They process only the data needed to perform their function.
          </p>
        </div>

        <p>Questions about your privacy? Email hello@wyndralore.com.</p>
      </div>
    </section>
  );
}
