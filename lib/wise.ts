import crypto from "node:crypto";

/**
 * Verifies the `X-Signature-SHA256` header Wise sends on webhook deliveries (RSA-SHA256
 * over the raw request body, base64-encoded). If WISE_WEBHOOK_PUBLIC_KEY isn't configured
 * (e.g. no live Wise account yet), verification is skipped and a warning is logged — this
 * MUST be set before accepting real traffic in production.
 */
export function verifyWiseSignature(rawBody: string, signatureHeader: string | null): boolean {
  const publicKeyPem = process.env.WISE_WEBHOOK_PUBLIC_KEY;
  if (!publicKeyPem) {
    console.warn("[wise] WISE_WEBHOOK_PUBLIC_KEY not set — skipping signature verification (dev mode only).");
    return true;
  }
  if (!signatureHeader) return false;
  try {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(rawBody);
    verifier.end();
    return verifier.verify(publicKeyPem, signatureHeader, "base64");
  } catch {
    return false;
  }
}

export interface NormalizedWiseEvent {
  eventKey: string;
  amountUsd: number | null;
  referenceText: string | null;
}

/**
 * Wise's webhook payload shape differs by event/subscription type (transfers#state-change,
 * balances#update, etc.) and the exact field paths should be confirmed against a live Wise
 * sandbox delivery before go-live. This parser is intentionally defensive: it searches common
 * field names for an amount and a reference string, and falls back to "not found" (which routes
 * the event to the unmatched queue for manual review, per PRD §5.3) rather than guessing.
 */
export function normalizeWisePayload(raw: string, payload: unknown): NormalizedWiseEvent {
  const obj = (payload ?? {}) as Record<string, unknown>;

  const idParts = [
    obj["subscription_id"],
    (obj["data"] as Record<string, unknown> | undefined)?.["resource"] &&
      ((obj["data"] as Record<string, unknown>)["resource"] as Record<string, unknown>)["id"],
    obj["id"],
  ].filter(Boolean);

  const eventKey = idParts.length > 0 ? idParts.join(":") : crypto.createHash("sha256").update(raw).digest("hex");

  const amountUsd = findFirstNumber(obj, ["amount", "value"]);
  const referenceText = findFirstString(obj, ["reference", "description", "details"]);

  return { eventKey, amountUsd, referenceText };
}

function findFirstNumber(obj: unknown, keys: string[], depth = 0): number | null {
  if (depth > 6 || obj === null || typeof obj !== "object") return null;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (keys.includes(key) && typeof value === "number") return value;
  }
  for (const value of Object.values(obj as Record<string, unknown>)) {
    const found = findFirstNumber(value, keys, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

function findFirstString(obj: unknown, keys: string[], depth = 0): string | null {
  if (depth > 6 || obj === null || typeof obj !== "object") return null;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (keys.includes(key) && typeof value === "string" && value.trim()) return value;
  }
  for (const value of Object.values(obj as Record<string, unknown>)) {
    const found = findFirstString(value, keys, depth + 1);
    if (found !== null) return found;
  }
  return null;
}
