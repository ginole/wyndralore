import crypto from "node:crypto";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Raw token goes in the emailed link; only its hash is ever persisted. */
export function generateResetToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  return { token, tokenHash, expiresAt };
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
