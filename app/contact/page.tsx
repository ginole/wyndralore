import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Contact Us — Wyndralore",
  description:
    "How to reach Wyndralore: one support inbox, what to include so we can help on the first reply, and how long we take to answer.",
  alternates: { canonical: "/contact", ...hreflangAlternates("/contact") },
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl text-moon">Contact us</h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-moon-dim">We read every message</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-moon-dim">
        <p>
          There is one inbox for everything — billing, your account, a reading that did not work, or anything else about
          the site:
        </p>

        <p className="text-lg text-moon">
          <a
            href="mailto:hello@wyndralore.com"
            className="underline decoration-gold-dim underline-offset-4 hover:text-gold"
          >
            hello@wyndralore.com
          </a>
        </p>

        <div>
          <h2 className="font-display text-xl text-moon">How long we take</h2>
          <p className="mt-2">
            We aim to reply within 2 business days. Anything about a charge — a payment you do not recognise, a double
            charge, a subscription you meant to cancel — is answered first.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">What to include</h2>
          <p className="mt-2">
            You will get a useful answer faster if the first email already has these. None of them are required.
          </p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            <li>The email address on your Wyndralore account.</li>
            <li>For anything about money: the order code, or the date and amount charged.</li>
            <li>
              For something that broke: what you were doing, and what you saw instead. A screenshot is worth more than a
              description.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">A few things you can do without writing in</h2>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            <li>
              <strong className="text-moon">Cancel a subscription</strong> — do it yourself from your{" "}
              <a href="/account" className="underline decoration-gold-dim underline-offset-2 hover:text-moon">
                account page
              </a>
              . No email, no retention screen.
            </li>
            <li>
              <strong className="text-moon">Refunds and cancellations</strong> — the rules are written out in the{" "}
              <a href="/refunds" className="underline decoration-gold-dim underline-offset-2 hover:text-moon">
                refund policy
              </a>
              .
            </li>
            <li>
              <strong className="text-moon">An unfamiliar charge</strong> — card statements show{" "}
              <span className="text-moon">WHOP*WYNDRALORE</span>. That is us.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">Creators and partnerships</h2>
          <p className="mt-2">
            Same inbox. Tell us where your audience is and what you make — we will reply with the actual numbers rather
            than a pitch deck.
          </p>
        </div>

        <p className="text-xs text-moon-dim/80">
          Wyndralore is an independent, self-funded site. Card payments are processed by Whop as Merchant of Record.
        </p>
      </div>
    </section>
  );
}
