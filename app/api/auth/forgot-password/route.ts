import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidEmail } from "@/lib/password";
import { generateResetToken } from "@/lib/passwordReset";
import { sendEmail, passwordResetEmail } from "@/lib/email";

// Always responds the same way regardless of whether the email exists, so this endpoint
// can't be used to enumerate registered accounts.
export async function POST(req: NextRequest) {
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
