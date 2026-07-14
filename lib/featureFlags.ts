// Zero-dependency flags safe to import from both server and client components (no server-only
// imports here, unlike lib/masters.ts, which pulls in node:crypto and would break client bundles).

// Paused ahead of a payment-processor application (Lemon Squeezy/Paddle both prohibit "marketplaces
// where you partner to sell others' products" and "services of any kind" — the live_voice product
// and the public multi-creator storefront both match those bans). Gates every public entry point;
// flip back to true once a marketplace-capable processor (e.g. Airwallex) is wired up.
export const MASTERS_MARKETPLACE_ENABLED = false;
