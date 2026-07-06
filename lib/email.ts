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
              "Earn 50% cash commission",
              `Here is your exclusive invitation to our 50% cash commission affiliate program:<br/>
              <a href="${affiliateLink}" style="display: inline-block; margin: 8px 0 6px; color: #e4c894; word-break: break-all;">${affiliateLink}</a><br/>
              Share your unique referral link however your audience finds you best, and start earning instantly.`,
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
