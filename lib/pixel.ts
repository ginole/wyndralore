// Thin, SSR-safe wrapper around the Meta (Facebook) Pixel `fbq` global. Every call no-ops
// unless the pixel actually loaded (i.e. NEXT_PUBLIC_META_PIXEL_ID was set and MetaPixel
// injected the base code), so callers can fire conversion events unconditionally.

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Fbq = (...args: unknown[]) => void;

function getFbq(): Fbq | null {
  if (typeof window === "undefined") return null;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  return typeof fbq === "function" ? fbq : null;
}

/** Fire a Meta *standard* event (PageView, CompleteRegistration, Purchase, …). */
export function pixelTrack(event: string, params?: Record<string, unknown>) {
  getFbq()?.("track", event, params);
}

/** Fire a Meta *custom* event (anything not in the standard set). */
export function pixelTrackCustom(event: string, params?: Record<string, unknown>) {
  getFbq()?.("trackCustom", event, params);
}
