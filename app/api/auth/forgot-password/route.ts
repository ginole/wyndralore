import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidEmail } from "@/lib/password";
import { generateResetToken } from "@/lib/passwordReset";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { clientIpFrom } from "@/lib/adminThrottle";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";

// Per-IP cap so this can't be used to email-bomb a victim or burn the Resend sending quota.
// 5 per hour is plenty for a real user who mistyped or lost the first email.
const RESET_LIMIT = 5;
const RESET_WINDOW_MS = 60 * 60 * 1000;

// Always responds the same way regardless of whether the email exists, so this endpoint
// can't be used to enumerate registered accounts.
export async function POST(req: NextRequest) {
  const rl = await checkRateLimit("forgot_password", clientIpFrom(req), RESET_LIMIT, RESET_WINDOW_MS);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds);

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (isValidEmail(email)) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const { token, tokenHash, expiresAt } = generateResetToken();
      await prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt },
      });

      const origin = req.nextUrl.origin;
      const resetLink = `${origin}/reset-password?token=${token}`;
      const { subject, html } = passwordResetEmail(resetLink);
      const result = await sendEmail({ to: user.email, subject, html });
      if (!result.ok) {
        console.error(`[forgot-password] reset email failed to send for user ${user.id}:`, result.error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
