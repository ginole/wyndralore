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
  return {
    subject: "You're invited: Wyndralore Creator Partnership",
    html: `
      <div style="font-family: Georgia, serif; background: #0b0e1a; color: #f4f1ea; max-width: 480px; margin: 0 auto; padding: 40px 32px; border: 1px solid #232a45;">
        <p style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #c9a96e; margin: 0 0 24px;">Wyndralore &middot; Creator Partnership</p>
        <h1 style="font-size: 24px; color: #e4c894; margin: 0 0 20px;">Hello from Wyndralore!</h1>
        <p style="margin: 0 0 20px; line-height: 1.6;">We love your content and have customized an elite partnership for you.</p>

        <div style="border-left: 2px solid #c9a96e; padding-left: 16px; margin: 0 0 24px;">
          <p style="margin: 0 0 8px; color: #e4c894; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">1. Free Premium, on us</p>
          <p style="margin: 0; line-height: 1.6;">Your Wyndralore account (<span style="color: #e4c894;">${email}</span>) has been automatically upgraded to a
          1-Month Premium Membership for free! Log in now to experience our AI-Powered Personal Insight Engine.</p>
        </div>

        <div style="border-left: 2px solid #c9a96e; padding-left: 16px; margin: 0 0 28px;">
          <p style="margin: 0 0 8px; color: #e4c894; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">2. Earn 50% cash commission</p>
          <p style="margin: 0; line-height: 1.6;">Here is your exclusive invitation to join our 50% cash commission affiliate program:<br/>
          <a href="${affiliateLink}" style="color: #c9a96e;">${affiliateLink}</a><br/>
          Share your unique referral link however your audience finds you best, and start earning instantly!</p>
        </div>

        <p style="margin: 0 0 28px;">
          <a href="${actionLink}" style="display: inline-block; background: #c9a96e; color: #0b0e1a; padding: 12px 24px; text-decoration: none; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Log In Now</a>
        </p>

        <p style="margin: 0; color: #a9a49a; font-size: 13px;">Blessed be.<br/>Wyndralore</p>
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
