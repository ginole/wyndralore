// Zero-dependency flags safe to import from both server and client components (no server-only
// imports here, unlike lib/masters.ts, which pulls in node:crypto and would break client bundles).

// Paused ahead of a payment-processor application (Lemon Squeezy/Paddle both prohibit "marketplaces
// where you partner to sell others' products" and "services of any kind" — the live_voice product
// and the public multi-creator storefront both match those bans). Gates every public entry point;
// flip back to true once a marketplace-capable processor (e.g. Airwallex) is wired up.
export const MASTERS_MARKETPLACE_ENABLED = false;

// Our self-built creator commission program (?via= links, 50% first / 20% recurring for 6 months,
// manual batch payouts). Retired in favour of Whop's native affiliate program, which pays 30% of
// every payment for as long as the referral keeps paying, tracks it itself, and — the actual reason
// — pays creators automatically. Ours required the admin to PayPal/Wise every creator by hand twice
// a month, which does not scale and asks a stranger to trust a solo founder to keep doing it.
//
// Retired, not deleted, and safe to revive: the engine (lib/affiliate.ts, 31 DB assertions), the
// schema, the partner dashboard and the admin panels are all intact. Flipping this back to true
// restores the whole thing. It cost nothing to switch away — there were zero partners and zero
// commissions ever recorded, so there was no migration.
//
// Reasons it might come back: Whop's affiliate code IS the creator's Whop username, so every creator
// must sign up for Whop; and Whop's attribution starts at checkout, whereas ours captured ?via= on
// landing and held it through registration for 60 days.
export const CREATOR_AFFILIATE_ENABLED = false;

/** Where creators get their Whop affiliate link while CREATOR_AFFILIATE_ENABLED is false. */
export const WHOP_STORE_URL = "https://whop.com/wyndralore/";
