# Wyndralore Tarot

A ritual-feeling online tarot reading web app (see `wyndralore-tarot-prd.md` for the full product spec). Built with Next.js (App Router), Tailwind CSS, and Prisma/Postgres.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4
- Prisma + Postgres for users, orders, and webhook events
- Auth: email/password, JWT session in an httpOnly cookie (`jose` + `bcryptjs`)
- Email: [Resend](https://resend.com) (falls back to console logging if `RESEND_API_KEY` is unset)
- Payments: manual Wise transfers matched via a webhook (no card processor)

## Local setup

```bash
npm install
cp .env.example .env   # fill in real secrets, see below
npx prisma migrate dev # applies migrations to DATABASE_URL
npm run dev
```

Open http://localhost:3000.

## Environment variables

See `.env.example` for the full list. At minimum for local dev you need `DATABASE_URL`, `SESSION_SECRET`, and `ADMIN_PASSWORD`. `RESEND_API_KEY` and the `WISE_*` vars can stay blank locally — emails log to the console and the webhook signature check is skipped (with a warning) when `WISE_WEBHOOK_PUBLIC_KEY` isn't set.

## Content & assets

- `data/cards.json` — all 78 tarot cards (generated once via `scripts/merge-cards.mjs` from the per-suit files in `data/cards/`). Edit the per-suit JSON and re-run the merge script rather than hand-editing `cards.json`.
- `public/cards/*.svg` — procedurally generated card art. Regenerate with `node scripts/generate-card-art.mjs`.

## Database

Postgres, via `DATABASE_URL`. Schema is in `prisma/schema.prisma`.

```bash
npx prisma migrate dev --name <change>   # after editing schema.prisma
npx prisma studio                         # inspect data in a browser
```

**Provisioning a database:** the simplest option is Vercel Storage — open the project in the Vercel
dashboard, go to the **Storage** tab, create a Postgres database, and Vercel will offer to add
`DATABASE_URL` (and a couple of pooled-connection variants) to the project's environment variables
automatically. Copy that same `DATABASE_URL` into your local `.env` to develop against the same
database (or provision a separate free instance on [neon.tech](https://neon.tech) for local dev if
you'd rather keep them apart).

Stop the dev server before running migrations on Windows if you were previously on SQLite and still
have a local `prisma/dev.db` around — file locks aside, migrations now target Postgres directly.

## Wise payments

API tokens/webhook subscriptions require a Wise **Business** account — a personal account can still
receive transfers and be used for `WISE_ACCOUNT_NAME`/`WISE_ACCOUNT_NUMBER` right away, but the
automated matching in steps 1-3 below waits until you have (or upgrade to) a Business account.
Until then, payments simply land in the `/admin` → Unmatched Payments queue for manual matching.

1. In the Wise dashboard: **Settings → Integrations and tools → API tokens** → create a token → set as `WISE_API_TOKEN`.
2. Register a webhook subscription (`trigger_on: balances#update`) pointing at `https://<your-domain>/api/webhooks/wise`, per PRD §5.2.
3. Set `WISE_WEBHOOK_PUBLIC_KEY` to the PEM public key Wise gives you for verifying the `X-Signature-SHA256` header — until this is set, signature verification is skipped in dev (see `lib/wise.ts`).
4. The payload field paths in `lib/wise.ts#normalizeWisePayload` are intentionally defensive/best-effort — confirm the exact shape against a real Wise sandbox delivery and tighten the field lookups before accepting live traffic.
5. Unmatched or underpaid payments land in the `/admin` dashboard for manual linking.

To simulate a payment locally without a real Wise account, POST a JSON body to `/api/webhooks/wise` shaped like:

```json
{ "id": "evt_test_1", "data": { "amount": { "value": 49, "currency": "USD" }, "resource": { "reference": "WL-AB12" } } }
```

## Admin panel

Visit `/admin` and sign in with `ADMIN_PASSWORD`. From there you can manually match unmatched Wise payments to orders, adjust a user's plan/expiry by hand, and see basic signup/draw/conversion stats.

## Deploying (Vercel + Namecheap)

1. Push this repo to GitHub, then in Vercel: **Add New → Project** → import the repo.
2. **Storage** tab → create a Postgres database → Vercel adds `DATABASE_URL` to the project's env vars for you.
3. **Settings → Environment Variables** → add the rest: `SESSION_SECRET`, `ADMIN_PASSWORD`, `WISE_ACCOUNT_NAME`, `WISE_ACCOUNT_NUMBER`, `WISE_API_TOKEN`, `WISE_WEBHOOK_PUBLIC_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`.
4. Deploy. Then run `npx prisma migrate deploy` once against the production `DATABASE_URL` (e.g. `vercel env pull` locally, then run the command) to create the tables.
5. **Settings → Domains** → add `wyndralore.com` → Vercel shows the exact DNS records to add.
6. In Namecheap: **Domain List → Manage → Advanced DNS** → add those records (usually an `A` record for the apex domain and a `CNAME` for `www`). DNS propagation is usually minutes, sometimes a few hours.
7. To send email from `hello@wyndralore.com`, verify the domain in Resend (**Domains → Add Domain**) — it gives you a few DNS records (SPF/DKIM) to add in Namecheap alongside the Vercel ones. Until verified, keep `EMAIL_FROM` on Resend's test sender or your own inbox.

For any other Node host (Railway, a VPS, etc.) instead of Vercel: set the same env vars, run `npx prisma migrate deploy`, then `npm run build && npm run start`.

## Premium features (Phase 3)

- **Premium spreads:** Love, Career, and Celtic Cross unlock for Premium members; free users see them on the homepage but hit an upsell (server-side gated in `app/reading/[spread]/page.tsx`).
- **Journal:** Premium members can save any reading (cards, question, and their own note) and revisit it at `/journal`. Entries are kept even if a plan lapses (re-subscribe recall hook, PRD §4.4).
- **Card library / SEO:** `/cards` index plus 78 statically-generated `/cards/[slug]` detail pages, each with its own title/meta/canonical and JSON-LD. Sitemap at `/sitemap.xml`, robots at `/robots.txt`. Free visitors see the primary meaning (indexable); the love/career/wellness deep-dive is visually gated behind Premium (`components/PremiumGate.tsx`) while remaining in the DOM for SEO.
- **Share card:** the result page generates a 1080×1920 shareable PNG on a `<canvas>` (`lib/shareCard.ts`) with the card, its name, the affirmation, and the brand watermark, offered via the Web Share API with a download fallback.

## Analytics

Lightweight self-hosted event tracking (PRD §9), no third-party trackers. An anonymous visitor id is set by `proxy.ts` (first-party cookie); events are written to the `AnalyticsEvent` table via `POST /api/track` (client) and `lib/analytics.ts` (server-side, at the source of truth for signup/order/payment). The `/admin` dashboard shows the 7-day funnel: visit → signup, readings, quota-exhausted, share/ad bonuses, pricing → order → payment, and paid plan mix.

## Project phases

Built in the phases described in `wyndralore-tarot-prd.md` §10. Phases 1–3 are complete: core reading experience; accounts, quotas, pricing, Wise payments, and admin; and premium spreads, journal, card-library SEO pages, share images, and analytics.
