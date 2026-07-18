// Server-side normalisation for the first-touch source captured in
// components/TrafficSourceCapture.tsx. Every order endpoint runs its request body through this
// rather than trusting what arrives: these values are set from a URL a stranger controls, they are
// written to our database, and they are later rendered in the admin panel.
//
// Shared by all three order-creating routes (plan checkout, AI read, specials) so attribution can't
// end up recorded differently depending on which thing someone bought.

const MAX_LEN = 120;

export interface OrderTrafficSource {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
}

const EMPTY: OrderTrafficSource = { utmSource: null, utmMedium: null, utmCampaign: null, referrer: null };

/** Drops control characters by code point rather than with a regex, so this file needs no literal
 *  control characters of its own. A newline or escape sequence in a "campaign name" has no
 *  legitimate use, and these strings are rendered in the admin table. */
function stripControlChars(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 32 && code !== 127) out += ch;
  }
  return out;
}

function field(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = stripControlChars(value).trim().slice(0, MAX_LEN);
  return cleaned || null;
}

/** Reads `source` off a request body into columns safe to persist. Never throws; unknown or
 *  malformed input degrades to "no attribution", because a bad UTM must not cost a sale. */
export function parseTrafficSource(raw: unknown): OrderTrafficSource {
  if (typeof raw !== "object" || raw === null) return EMPTY;
  const src = raw as Record<string, unknown>;
  return {
    utmSource: field(src.utmSource),
    utmMedium: field(src.utmMedium),
    utmCampaign: field(src.utmCampaign),
    referrer: field(src.referrer),
  };
}
