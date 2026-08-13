/**
 * Which creator gets credited for a purchase.
 *
 * Two sources, and the order between them is the whole point:
 *
 *  1. `User.referredByWhopCode` — locked onto the account at first touch (see
 *     /api/whop-affiliate/claim). Durable, and the only one that survives the buyer switching
 *     device between the click and the payment.
 *  2. The code the client just read out of its own localStorage.
 *
 * The account wins. It was written first (that's what first-touch means), it can't be edited by
 * whoever is posting to the endpoint, and preferring the request body would let a later link — or a
 * hand-crafted POST — overwrite a referral another creator already earned.
 *
 * The body is still honoured as a fallback for the one case the account can't cover: a buyer whose
 * claim hasn't landed yet (they arrived and purchased inside the same page load).
 */
export function resolveWhopAffiliate(
  accountCode: string | null | undefined,
  bodyCode: unknown
): string | undefined {
  if (accountCode && accountCode.trim()) return accountCode.trim();
  if (typeof bodyCode !== "string") return undefined;
  const trimmed = bodyCode.trim();
  return trimmed || undefined;
}
