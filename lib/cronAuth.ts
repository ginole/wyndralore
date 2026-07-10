// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` on every invocation it makes — this is
// the only thing standing between "/api/cron/*" and anyone who finds the URL, since these routes
// move money (refunds) and send email, so they must never be triggerable by a bare public hit.
export function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed — an unset secret must never mean "accept anything"
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
