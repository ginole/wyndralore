import { Resend } from "resend";

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

// Falls back to a console log when RESEND_API_KEY isn't set, so local/dev environments
// (and this one, with no real key) can exercise the full flow without a live provider.
export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Wyndralore <hello@wyndralore.com>";

  if (!apiKey) {
    console.log(`[email:dev-fallback] To: ${to} | Subject: ${subject}\n${html}`);
    return { ok: true };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) {
    console.error(`[email:resend-error] To: ${to} | Subject: ${subject} |`, error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export function paymentConfirmationEmail(planLabel: string, orderCode: string): { subject: string; html: string } {
  return {
    subject: "You're Premium — welcome to Wyndralore",
    html: `
      <div style="font-family: Georgia, serif; color: #0b0e1a; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">Payment confirmed</h1>
        <p>Your ${planLabel} plan (order ${orderCode}) is now active. Unlimited readings, every premium spread, and your
        reading journal are unlocked.</p>
        <p>No sneaky auto-renewals — you're always in control. We'll email you before this plan expires so you can renew
        by hand if you'd like to keep going.</p>
        <p>With warmth,<br/>Wyndralore</p>
      </div>
    `,
  };
}

/**
 * For someone who bought on Whop rather than on our site, so there was no Wyndralore account to
 * credit and we made one for them. They have paid and cannot log in until they follow this link, so
 * it leads with that rather than with a greeting. See lib/whopOrphanPayment.ts.
 */
export function whopOrphanClaimEmail(purchaseLabel: string, claimLink: string): { subject: string; html: string } {
  return {
    subject: "Set your password to open your Wyndralore purchase",
    html: `
      <div style="font-family: Georgia, serif; color: #0b0e1a; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">Your ${purchaseLabel} is waiting</h1>
        <p>Thank you — your payment went through, and we've set up your Wyndralore account at this email address.</p>
        <p>There's one step left: choose a password, and everything you bought is unlocked.</p>
        <p style="margin: 24px 0;">
          <a href="${claimLink}" style="background: #0b0e1a; color: #e4c894; padding: 13px 30px; border-radius: 999px; text-decoration: none; font-size: 14px;">Set my password</a>
        </p>
        <p style="font-size: 13px; color: #6b6b6b;">This link is good for 7 days. If it expires, use “Forgot password” on the sign-in page with this email — your purchase stays attached to the account either way.</p>
        <p>With warmth,<br/>Wyndralore</p>
      </div>
    `,
  };
}

export function aiReadPurchaseEmail(): { subject: string; html: string } {
  return {
    subject: "Your AI deep reading is unlocked",
    html: `
      <div style="font-family: Georgia, serif; color: #0b0e1a; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">Payment confirmed</h1>
        <p>Your AI deep reading credit is ready — head back to your reading to reveal it.</p>
        <p>With warmth,<br/>Wyndralore</p>
      </div>
    `,
  };
}

export function creatorInviteEmail(email: string, affiliateLink: string, actionLink: string): { subject: string; html: string } {
  // A soft, rounded, centered layout — rounded card, circular number badges, pill button — so
  // it reads as a polished brand email rather than a hard-edged template.
  const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const serif = "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif";

  const benefit = (n: string, title: string, bodyHtml: string) => `
    <div style="background: rgba(201,169,110,0.07); border: 1px solid rgba(201,169,110,0.16); border-radius: 18px; padding: 20px 22px; margin: 0 0 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 10px;">
        <tr>
          <td style="width: 30px; height: 30px; background: #e4c894; border-radius: 50%; text-align: center; vertical-align: middle; font-family: ${sans}; font-size: 15px; font-weight: 700; color: #0b0e1a;">${n}</td>
          <td style="padding-left: 12px; font-family: ${sans}; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #e4c894;">${title}</td>
        </tr>
      </table>
      <p style="margin: 0; font-family: ${sans}; font-size: 14px; line-height: 1.65; color: #d8d2c6;">${bodyHtml}</p>
    </div>`;

  return {
    subject: "You're invited: Wyndralore Creator Partnership",
    html: `
      <div style="background: #0b0e1a; padding: 32px 16px; font-family: ${sans};">
        <div style="max-width: 480px; margin: 0 auto; background: #12162a; border: 1px solid #232a45; border-radius: 26px; overflow: hidden;">

          <div style="padding: 40px 32px 4px; text-align: center;">
            <p style="margin: 0 0 18px; font-family: ${sans}; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: #c9a96e;">&#10022;&nbsp; Wyndralore &nbsp;&#10022;</p>
            <h1 style="margin: 0 0 14px; font-family: ${serif}; font-size: 27px; font-weight: 500; color: #e4c894;">Hello from Wyndralore!</h1>
            <p style="margin: 0 auto; max-width: 380px; font-size: 15px; line-height: 1.6; color: #cfc9bf;">We love your content and have customized an elite partnership just for you.</p>
          </div>

          <div style="padding: 26px 28px 4px;">
            ${benefit(
              "1",
              "Free Premium, on us",
              `Your Wyndralore account (<span style="color: #e4c894;">${email}</span>) has been automatically upgraded to a <strong style="color: #f4f1ea;">1-Month Premium Membership</strong> — free. Log in to experience our AI-Powered Personal Insight Engine.`,
            )}
            ${benefit(
              "2",
              "Earn 30% — every month, not just once",
              `Most affiliate deals pay you once and forget you. Ours pays you <strong style="color: #f4f1ea;">30% of every payment</strong>, for as long as the person you referred stays subscribed. Ten people who stick around is income that arrives whether or not you posted that week. Whop tracks it and pays you directly — no invoices, and you never have to chase us.<br/><br/>
              Two steps. First, create a free account at <a href="${affiliateLink}" style="color: #e4c894;">${affiliateLink}</a> — that's where your commission gets paid. Then share our homepage with <span style="color: #e4c894;">?a=</span> and your Whop username on the end.<br/>
              <span style="display: inline-block; margin: 8px 0 4px; color: #8f897c; font-size: 13px;">So if your Whop username were <em>lunatarot</em>, your link would be:</span><br/>
              <span style="display: inline-block; margin: 0 0 8px; color: #e4c894; word-break: break-all;">wyndralore.com/?a=lunatarot</span><br/>
              <strong style="color: #f4f1ea;">Share that, not a Whop link.</strong> A Whop link drops your audience on a product card and asks them for money before they've drawn a single card — that traffic bounces and you earn nothing. Ours lands them on the site so they read first. Same 30%, tracked the same, it just converts.`,
            )}
          </div>

          <div style="text-align: center; padding: 12px 28px 4px;">
            <a href="${actionLink}" style="display: inline-block; background: #e4c894; color: #0b0e1a; padding: 15px 40px; border-radius: 999px; text-decoration: none; font-family: ${sans}; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">Log In Now</a>
          </div>

          <div style="text-align: center; padding: 26px 28px 34px;">
            <p style="margin: 0; font-family: ${serif}; font-size: 14px; line-height: 1.7; color: #8f897c;">Blessed be.<br/>Wyndralore</p>
          </div>

        </div>
      </div>
    `,
  };
}

export function masterDeliveryRequestEmail(buyerFirstQuestion: string | undefined, deliverByLabel: string, uploadLink: string): { subject: string; html: string } {
  return {
    subject: "New reading request — record within 48 hours",
    html: `
      <div style="font-family: Georgia, serif; color: #0b0e1a; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">You have a new reading to record</h1>
        <p>Someone just requested a personal reading from you. ${
          buyerFirstQuestion ? `They asked: <em>"${buyerFirstQuestion}"</em>` : "They didn't leave a specific question — read generally."
        }</p>
        <p>Record a short voice or video reading and upload it here — takes about five minutes:</p>
        <p><a href="${uploadLink}" style="color: #c9a96e;">Record and deliver the reading</a></p>
        <p>Please deliver by <strong>${deliverByLabel}</strong> so the reading stays automatic and your payout isn't affected.</p>
        <p>With warmth,<br/>Wyndralore</p>
      </div>
    `,
  };
}

export function buyerReadingDeliveredEmail(masterName: string, listenLink: string): { subject: string; html: string } {
  return {
    subject: `${masterName} sent you a reading`,
    html: `
      <div style="font-family: Georgia, serif; color: #0b0e1a; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">Your reading has arrived</h1>
        <p>${masterName} recorded a personal reading just for you.</p>
        <p><a href="${listenLink}" style="color: #c9a96e;">Listen to your reading</a></p>
        <p style="font-size: 13px; color: #6b6558;">This recording is available for 7 days — download or save it if you'd like to keep it longer.</p>
        <p>With warmth,<br/>Wyndralore</p>
      </div>
    `,
  };
}

export interface PayoutReminderLine {
  masterName: string;
  totalUsd: number;
  payoutMethod: string | null;
  payoutHandle: string | null;
}

export function payoutReminderEmail(lines: PayoutReminderLine[]): { subject: string; html: string } {
  const totalUsd = Math.round(lines.reduce((sum, l) => sum + l.totalUsd, 0) * 100) / 100;
  const rows = lines
    .map(
      (l) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e0d5;">${l.masterName}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e0d5;">$${l.totalUsd.toFixed(2)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e0d5;">${
            l.payoutMethod && l.payoutHandle ? `${l.payoutMethod} — ${l.payoutHandle}` : "not set"
          }</td>
        </tr>`
    )
    .join("");

  return {
    subject: lines.length ? `Masters payout reminder — $${totalUsd.toFixed(2)} requested across ${lines.length}` : "Masters payout reminder — nothing requested",
    html: `
      <div style="font-family: Georgia, serif; color: #0b0e1a; max-width: 560px; margin: 0 auto;">
        <h1 style="font-size: 22px;">Masters payout reminder</h1>
        ${
          lines.length
            ? `<p>These masters have requested a withdrawal and are still waiting on you. Send these before marking them paid in the admin dashboard:</p>
               <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
                 <thead><tr>
                   <th style="text-align:left; padding: 8px 12px; border-bottom: 2px solid #0b0e1a;">Master</th>
                   <th style="text-align:left; padding: 8px 12px; border-bottom: 2px solid #0b0e1a;">Amount</th>
                   <th style="text-align:left; padding: 8px 12px; border-bottom: 2px solid #0b0e1a;">Send via</th>
                 </tr></thead>
                 <tbody>${rows}</tbody>
               </table>
               <p style="margin-top: 16px;"><strong>Total: $${totalUsd.toFixed(2)}</strong></p>
               <p><a href="https://wyndralore.com/admin">Open the payouts dashboard</a></p>`
            : `<p>No masters have an outstanding withdrawal request right now — nothing to send.</p>`
        }
      </div>
    `,
  };
}

/**
 * ONE combined invitation, replacing what used to be two separate creator programs (the
 * affiliate/free-premium invite and a standalone "your storefront is live" email) — a creator
 * who's becoming a Master gets a single email, single action link, covering both. If she doesn't
 * have an affiliate link yet, that section is simply omitted rather than shown empty.
 */
export function masterInviteEmail(affiliateLink: string | null, setupLink: string): { subject: string; html: string } {
  return {
    subject: "You're invited: Wyndralore Creator Partnership",
    html: `
      <div style="font-family: Georgia, serif; color: #0b0e1a; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">Welcome to Wyndralore</h1>
        <p>We'd love to partner with you. Here's what that includes:</p>
        <p>✦ <strong>Free Premium membership</strong>, on us${
          affiliateLink
            ? `, plus your own affiliate link — earn 50% cash commission any time someone subscribes through it:<br/><a href="${affiliateLink}" style="color: #c9a96e; word-break: break-all;">${affiliateLink}</a>`
            : "."
        }</p>
        <p>✦ <strong>Your own "Meet Our Masters" storefront</strong> — a page with your name, your style, where your audience can get a reading directly from you.</p>
        <p>One last step: set up your storefront (takes about five minutes — your photo, your reading style, how you'd like to be paid). We'll review it and it'll go live shortly after.</p>
        <p><a href="${setupLink}" style="color: #c9a96e;">Set up your partnership</a></p>
        <p>With warmth,<br/>Wyndralore</p>
      </div>
    `,
  };
}

export function masterPayoutSentEmail(displayName: string, amountUsd: number): { subject: string; html: string } {
  return {
    subject: `You've been paid — $${amountUsd.toFixed(2)}`,
    html: `
      <div style="font-family: Georgia, serif; color: #0b0e1a; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">Payout sent</h1>
        <p>Hi ${displayName}, your commission of <strong>$${amountUsd.toFixed(2)}</strong> has been sent to your payout account.</p>
        <p>You can see your full earnings history any time in your dashboard: <a href="https://wyndralore.com/masters/dashboard" style="color: #c9a96e;">wyndralore.com/masters/dashboard</a></p>
        <p>With warmth,<br/>Wyndralore</p>
      </div>
    `,
  };
}

/** Sent to the admin the moment a master clicks "Request Withdrawal" — the on-demand counterpart
 * to payoutReminderEmail's twice-monthly digest, so a request doesn't just sit silently unnoticed. */
export function masterWithdrawalRequestedEmail(
  displayName: string,
  amountUsd: number,
  payoutMethod: string | null,
  payoutHandle: string | null
): { subject: string; html: string } {
  return {
    subject: `Withdrawal requested — ${displayName}, $${amountUsd.toFixed(2)}`,
    html: `
      <div style="font-family: Georgia, serif; color: #0b0e1a; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">New withdrawal request</h1>
        <p><strong>${displayName}</strong> just requested a payout of <strong>$${amountUsd.toFixed(2)}</strong>.</p>
        <p>Send via ${payoutMethod && payoutHandle ? `${payoutMethod} — ${payoutHandle}` : "her payout method (not set — email her)"}, then mark it paid in the admin dashboard.</p>
        <p><a href="https://wyndralore.com/admin">Open the payouts dashboard</a></p>
      </div>
    `,
  };
}

export function passwordResetEmail(resetLink: string): { subject: string; html: string } {
  return {
    subject: "Reset your Wyndralore password",
    html: `
      <div style="font-family: Georgia, serif; color: #0b0e1a; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">Reset your password</h1>
        <p>We received a request to reset your Wyndralore password. Click below to choose a new one — this link expires
        in 1 hour and can only be used once.</p>
        <p><a href="${resetLink}" style="color: #c9a96e;">Reset your password</a></p>
        <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
        <p>With warmth,<br/>Wyndralore</p>
      </div>
    `,
  };
}

export function expiryReminderEmail(planLabel: string, expiresAt: Date, isExpiryDay: boolean): { subject: string; html: string } {
  return {
    subject: isExpiryDay ? "Your Wyndralore Premium expires today" : "Your Wyndralore Premium expires in 3 days",
    html: `
      <div style="font-family: Georgia, serif; color: #0b0e1a; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">${isExpiryDay ? "Expiring today" : "Expiring soon"}</h1>
        <p>Your ${planLabel} plan expires on ${expiresAt.toLocaleDateString()}. Renew any time to keep unlimited readings —
        your reading journal stays safe either way, even if you take a break.</p>
        <p><a href="https://wyndralore.com/pricing">Renew on wyndralore.com</a></p>
        <p>With warmth,<br/>Wyndralore</p>
      </div>
    `,
  };
}
