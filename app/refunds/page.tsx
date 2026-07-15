import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — Wyndralore",
  description: "How refunds and cancellations work for Wyndralore memberships and one-off purchases.",
  alternates: { canonical: "/refunds" },
};

export default function RefundsPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl text-moon">Refund &amp; Cancellation Policy</h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-moon-dim">Last updated: July 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-moon-dim">
        <p>
          This policy explains how refunds and cancellations work for everything we sell: Premium memberships and one-off
          purchases such as a single AI deep reading. It sits alongside our{" "}
          <a href="/terms" className="underline decoration-gold-dim underline-offset-2 hover:text-moon">
            Terms of Service
          </a>
          .
        </p>

        <div>
          <h2 className="font-display text-xl text-moon">1. Digital content, delivered immediately</h2>
          <p className="mt-2">
            Premium access and AI readings are digital content that is unlocked or generated for you the moment your
            payment completes. Because delivery is immediate and the content is personal to your reading, all sales are
            final and payments are generally non-refundable. By completing a purchase you expressly request that delivery
            begin right away and acknowledge that you thereby lose any statutory right of withdrawal or cooling-off period
            — including, where applicable, the 14-day right of withdrawal under EU/UK consumer law — once delivery has
            begun.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">2. If something went wrong, tell us</h2>
          <p className="mt-2">
            The policy above is not a way to keep money for something that didn&apos;t work. If you were charged in error,
            charged twice, never received what you paid for, or something genuinely went wrong with your order, email us at{" "}
            <a href="mailto:hello@wyndralore.com" className="underline decoration-gold-dim underline-offset-2 hover:text-moon">
              hello@wyndralore.com
            </a>{" "}
            with your order details and we will look into it and make it right. We aim to reply within 2 business days.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">3. Cancelling an auto-renewing membership</h2>
          <p className="mt-2">
            If you chose an auto-renewing subscription, you can cancel it at any time from your{" "}
            <a href="/account" className="underline decoration-gold-dim underline-offset-2 hover:text-moon">
              account page
            </a>{" "}
            — no email, no phone call, no retention hoops. Cancelling stops all future charges immediately. You keep full
            Premium access until the end of the billing period you have already paid for, and it simply doesn&apos;t renew
            after that. We do not refund the remainder of a period that is already underway.
          </p>
          <p className="mt-2">
            If you chose a one-time payment instead, there is nothing to cancel: it never renews and you are never charged
            again. It simply ends when its term is up.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">4. Who processes your payment</h2>
          <p className="mt-2">
            Card payments are processed by our payment provider, Paddle, which acts as the Merchant of Record for those
            transactions. Paddle&apos;s own refund, chargeback, and dispute policies also apply to your purchase, and
            Paddle may contact you about billing matters.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">5. Contact</h2>
          <p className="mt-2">
            Questions about a charge, a cancellation, or this policy? Email{" "}
            <a href="mailto:hello@wyndralore.com" className="underline decoration-gold-dim underline-offset-2 hover:text-moon">
              hello@wyndralore.com
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
