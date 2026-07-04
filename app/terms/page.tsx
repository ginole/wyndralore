import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Wyndralore",
  description: "The terms that govern your use of Wyndralore.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl text-moon">Terms of Service</h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-moon-dim">Last updated: July 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-moon-dim">
        <p>
          Welcome to Wyndralore. By using this website, you agree to these terms. Please read them carefully. If you do not
          agree, please do not use the service.
        </p>

        <div>
          <h2 className="font-display text-xl text-moon">1. For entertainment and self-reflection only</h2>
          <p className="mt-2">
            Wyndralore provides tarot readings and card meanings for entertainment and personal reflection. Our content is
            not a substitute for professional advice — medical, legal, financial, psychological, or otherwise. Never
            disregard professional guidance because of something you read here. You are responsible for the decisions you
            make.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">2. Accounts</h2>
          <p className="mt-2">
            You are responsible for keeping your account credentials secure and for all activity under your account. You
            must provide a valid email address. You must be at least 18 years old to create an account.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">3. Premium plans and payment</h2>
          <p className="mt-2">
            Premium plans are one-time payments made via bank transfer through Wise. There is no automatic renewal — your
            plan simply ends when its term is up, and your account returns to the free tier. We&apos;ll email you before a
            plan expires so you can choose to renew.
          </p>
          <p className="mt-2">
            To pay, include your order reference exactly as shown in your transfer. Payments that overpay the plan amount
            are accepted, and the difference is not refundable. Payments below the plan amount will not activate Premium
            until the balance is settled. If a payment cannot be automatically matched to your order, we will match it
            manually — this may take longer.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">4. Refunds</h2>
          <p className="mt-2">
            Because Premium unlocks digital content immediately, payments are generally non-refundable. If something has
            gone wrong with your order, contact us and we&apos;ll make it right.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">5. Your content</h2>
          <p className="mt-2">
            Notes you save to your journal belong to you. We store them so you can read them later, and we keep them even
            if your Premium plan lapses, so they&apos;re waiting for you if you return.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">6. Changes</h2>
          <p className="mt-2">
            We may update these terms from time to time. Continued use of Wyndralore after changes means you accept the
            updated terms.
          </p>
        </div>

        <p>Questions? Reach us at hello@wyndralore.com.</p>
      </div>
    </section>
  );
}
