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
