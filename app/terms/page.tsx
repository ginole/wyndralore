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
          <h2 className="font-display text-xl text-moon">3. Premium plans, add-ons, and payment</h2>
          <p className="mt-2">
            Premium plans and one-off purchases (such as a single AI deep reading) are one-time payments — there is no
            automatic renewal. A Premium plan simply ends when its term is up, and your account returns to the free tier.
            We&apos;ll email you before a plan expires so you can choose to renew.
          </p>
          <p className="mt-2">
            Card payments are processed by our payment provider, Lemon Squeezy, which acts as the Merchant of Record for
            those transactions. We also accept manual bank transfer through Wise: to pay this way, include your order
            reference exactly as shown in your transfer. Overpayments are accepted and the difference is not refundable;
            payments below the plan amount will not activate Premium until the balance is settled. If a payment cannot be
            matched to your order automatically, we will match it manually — this may take longer.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">4. Refunds and immediate delivery</h2>
          <p className="mt-2">
            Premium access and AI readings are digital content that is unlocked or delivered to you immediately. Because
            of this, all sales are final and payments are non-refundable. By completing a purchase, you expressly request
            that delivery and access begin right away, and you acknowledge that you thereby lose any statutory right of
            withdrawal or cooling-off period — including, where applicable, the 14-day right of withdrawal under EU/UK
            consumer law — once delivery has begun.
          </p>
          <p className="mt-2">
            Where a card payment is handled by Lemon Squeezy as Merchant of Record, Lemon Squeezy&apos;s own refund and
            dispute policies also apply. If something has genuinely gone wrong with your order, contact us at
            hello@wyndralore.com and we&apos;ll make it right.
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
