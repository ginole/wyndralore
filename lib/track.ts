// Client-side fire-and-forget analytics. Uses sendBeacon when available so events aren't
// dropped on navigation; falls back to fetch with keepalive.
export function track(name: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ name, props });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // fall through to fetch
  }
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
