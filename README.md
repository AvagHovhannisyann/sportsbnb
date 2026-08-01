# SportsBnB

A marketplace for booking sports venues by the hour in Armenia. Players find a
court, pitch or pool, see live availability, and pay in the app in Armenian
dram; owners list facilities, set hours and prices, manage bookings, and are
paid out from an internal ledger. The same platform hosts open pickup games and
player-run teams.

Live: **https://www.sportsbnb.org**

Production currently holds 12 venues across Yerevan, Gyumri, Vanadzor, Dilijan,
Abovyan and Ejmiatsin, 5 blog posts, 6 open games, and 2 user accounts. No
booking has been paid for yet — see [Current status](#current-status).

## Stack

- **Frontend** — Vite 5, React 18, TypeScript, React Router 6, TanStack Query,
  Tailwind (custom dark-first token system), shadcn/ui + Radix primitives,
  framer-motion, Recharts, react-hook-form + zod.
- **Backend** — Supabase: Postgres with RLS on every table (53 migrations),
  Deno edge functions, Realtime for chat, Supabase Auth.
- **Maps** — Yandex Maps JS API v3 (vector tiles, DOM markers), Yandex
  Geocoder for address lookup, Yandex Geosuggest — proxied through the
  `geosuggest` edge function — for search-box suggestions. Chosen over
  Google for coverage in Armenia, the launch market. Every map surface
  degrades to a "Map unavailable" panel when no key is configured.
- **Hosting** — Vercel (`vercel.json`: SPA rewrite to `app-shell.html`, asset
  caching, security headers).
- **Tests** — Vitest + Testing Library for units, Playwright for one e2e smoke
  spec (`e2e/smoke.spec.ts`), plus 24 browser audit scripts under `scripts/`.

## Running it locally

```sh
npm install
cp .env.example .env     # optional — see below
npm run dev              # http://localhost:8080
```

The `.env` is optional in practice: `src/integrations/supabase/client.ts`
carries the publishable Supabase URL and key as committed defaults, so a build
with no environment still boots against production data. Environment variables
override them. Fill in `.env` if you want a different project, and set
`VITE_YANDEX_MAPS_API_KEY` / `VITE_YANDEX_GEOCODER_KEY` if you need maps and
location search — they are separate Yandex products with separate keys. No
service-role key belongs in this file.

### Scripts (`package.json`)

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server on port 8080 |
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Same, development mode |
| `npm run postbuild` | Runs automatically after build: generates `sitemap.xml`, then prerenders the marketing routes |
| `npm run preview` | Serve the built output |
| `npm run lint` | ESLint (flat config; includes a rule keeping data access out of `pages/`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run sitemap` | Regenerate `public/sitemap.xml` on its own |

Playwright is configured but has no npm script — run `npx playwright test`. It
starts its own dev server on 127.0.0.1:8080.

## Routes

`src/App.tsx` mounts 67 route entries — 5 of them redirect aliases, one a
catch-all 404. Everything except the landing page is lazy-loaded, wrapped in a
route error boundary, and given a page title by a central `RouteMeta` table.

- **Public** — `/`, `/venues`, `/venues/map`, `/venue/:id`, `/nearby`,
  `/games`, `/game/:id`, `/teams`, `/team/:id`, `/join-team/:code`,
  `/community`, `/blog`, `/blog/:slug`, `/about`, `/contact`, `/faq`,
  `/for-owners`, `/privacy`, `/terms`, `/cookies`, `/embed/booking/:venueId`.
- **Auth** — `/login`, `/signup`, `/forgot-password`, `/reset-password`,
  `/auth/callback`, `/onboarding/player`, `/onboarding/owner`.
- **Player (login required)** — `/dashboard`, `/my-bookings`, `/messages`,
  `/profile`, `/create-game`, `/create-team`, `/team/:id/edit`,
  `/game/:id/join-status`, `/nearby/submit`.
- **Booking** — `/book/:bookingId` (checkout), `/booking/:bookingId/status`,
  `/pay/mock/:paymentId` (mock provider only).
- **Owner (login + `user_type = 'owner'`)** — `/owner-dashboard` and
  `/owner/{venues,schedule,bookings,hours,pricing,equipment,integrations,policies,settings,widget,analytics,earnings}`,
  plus `/add-venue`, `/venue/:id/edit`, `/venue/:id/availability`.
- **Admin** — `/admin`, `/operator`, `/operator/outreach`.

There is **no `/demo` route.** The demo path is: sign in with the seeded
accounts and walk the normal product — see [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md).
The only demo-specific screen in the app is `/pay/mock/:paymentId`, a fake bank
page that is unreachable unless the mock payment provider is enabled.

## Edge functions

33 Deno functions in `supabase/functions/`, all deployed and ACTIVE on the
production project. Shared code lives in `supabase/functions/_shared/` (auth
helpers, CORS allowlist, HTTP/logging, email, Slack, Telegram, Google Places,
the AI client, and the payment providers).

Auth posture is declared per function in `supabase/config.toml`. The default is
`verify_jwt = true` — the gateway rejects requests without a user JWT, and
functions additionally check authorization in-code (`requireUser` /
`requireAdmin`). `verify_jwt = false` is reserved for endpoints that must be
callable by machines, and each one verifies itself: cron jobs check a
`CRON_SECRET` header, webhooks verify provider signatures, and a small set is
deliberately public and read-only.

Roughly grouped:

- **Payments** — `payments-init`, `payments-verify`, `payments-refund`,
  `payments-callback-ameria`, `payments-callback-idram`, `payouts-run`,
  `bookings-expire`.
- **Notifications** — `booking-notifications`, `send-booking-confirmation`,
  `send-contact-email`, `resend-inbound`, `slack-notify`, `telegram-webhook`,
  `daily-digest`.
- **AI** — `ai-chat`, `ai-venue-recommendations`, `ai-game-matchmaking`,
  `player-insights`, `owner-coach`, `admin-pulse`, `generate-ai-image`.
- **Owner tooling** — `calendar-auth`, `calendar-sync`, `widget-data`.
- **Discovery / ops** — `discover-fields`, `geosuggest`, `get-weather`,
  `autopilot-tick`, and five `outreach-*` functions.

## Payments

Collect-then-payout: the platform takes the full amount from the player, tracks
owner earnings and a 5% platform commission in an append-only ledger, and pays
owners in batches. All amounts are integer minor units (AMD × 100); conversion
to a provider's decimals happens in exactly one file.

Three providers sit behind one interface
(`supabase/functions/_shared/providers/`, selected in `registry.ts`):

| Provider | Flow | Confirmation |
|---|---|---|
| `ameria` — Ameriabank vPOS | `InitPayment` → bank page → BackURL | Re-verified server-side via `GetPaymentDetails`; redirect parameters are never trusted |
| `idram` | form-POST → Idram wallet | Server-to-server callback with an MD5 checksum verified against the shared secret, plus an amount match. No refund API — refunds are manual |
| `mock` | Fake bank page at `/pay/mock/:paymentId` | Tester picks the outcome |

The mock provider throws unless `PAYMENTS_MOCK_ENABLED=true` is set on the
functions side, and the client only offers it in dev builds or when
`VITE_PAYMENTS_MOCK=true`. It is not enabled in production.

Guarantees worth knowing: the charged amount is read from the database, never
from the client; double booking is prevented by a GiST exclusion constraint on
(venue, court, time range) rather than by convention; callbacks are idempotent
via a unique index on the ledger triple; and the refund entitlement is computed
from the policy snapshot taken at booking time.

Full architecture, ledger invariants, the payout runbook and the required
environment variables are in [docs/payments.md](docs/payments.md).

## Video (Remotion)

`video/` is a self-contained Remotion 4.0.500 project (its own
`package.json`, `node_modules` and tsconfig) holding motion assets for the
product and for marketing. Nine compositions are registered in
`video/src/Root.tsx` — eight real ones plus the template placeholder that ships
with Remotion:

| Composition | Size | Length | For |
|---|---|---|---|
| `BrandLoader` | 600×600 | 2s @30 | Splash / loading states |
| `FeatureReel` | 1920×1080 | 24s @30 | Product tour |
| `VenuePromo` | 1080×1080 | 15s @30 | Per-venue advert (prop-driven) |
| `SkeletonLoop` | 1200×800 | 1.5s @60, seamless | Loading skeleton for the app shell |
| `StatCounter` | 1080×1080 | 8s @60 | Stats card with number roll-ups |
| `OwnerPitch` | 1920×1080 | 20s @30 | Pitch aimed at venue owners |
| `BookingFlow` | 1080×1920 | 12s @30 | Vertical booking walkthrough for stories |
| `HeroBackdrop` | 1920×1080 | 6s @30 | Ambient loop behind the marketing hero |

```sh
cd video
npm install
npm run dev                              # Remotion Studio
npx remotion render FeatureReel out/feature.mp4
npx remotion render BrandLoader out/brand.webm   # webm for alpha
```

Rendered files already sit in `video/out/`. Nothing in the web app imports from
`video/` — the outputs are used as assets, so the two projects build
independently.

**Licensing.** Remotion is not MIT. It is free for individuals and for
companies of up to three people; larger organisations need a paid company
licence from [remotion.pro](https://remotion.pro). That applies to using it at
all, including rendering internally. Worth deciding before the team grows past
three or before this pipeline is handed to a contractor.

## Repository layout

```
src/
  features/booking/    booking panel, checkout, status, ledger + payout logic and tests
  features/venues/     shared venue form, sorting, filters, search matching
  pages/               route pages (data access via hooks only — lint-enforced)
  pages/owner/         the owner dashboard surfaces
  hooks/               data hooks (venues, games, teams, chat, auth, admin, …)
  components/          UI, re-skinned shadcn primitives, layout, maps, SEO
  integrations/supabase/  generated types + the client
  index.css            design tokens
supabase/
  migrations/          53 migrations — schema, RLS, money tables, booking state machine
  functions/           33 edge functions
  functions/_shared/   auth, CORS, email, AI, payment providers
  config.toml          per-function JWT posture, documented inline
video/                 Remotion project (independent build)
scripts/               sitemap + prerender build steps, and 24 browser audit scripts
e2e/                   Playwright smoke spec
migration-bundle/      schema/seed/secrets bundle from the Supabase migration
docs/                  see below
```

### Docs

- `docs/payments.md` — payments architecture, ledger invariants, payout runbook.
- `docs/ameriabank-readiness.md` — what to send the bank, and what has not been
  run. Written before the edge functions were deployed; its section 3 is now
  partly out of date (they are deployed), the rest stands.
- `docs/handover.md` — everything that cannot be done from code: credentials to
  rotate, migration steps, open product decisions. Also partly worked through.
- `docs/audits.md` — the browser audits in `scripts/`, and how to run one.
- `docs/design-audit.md` — a long record of the design and accessibility pass.
- `docs/deploy-vercel.md`, `docs/lovable-migration.md`, `docs/motion/` (12 parts).
- `docs/DEMO-SCRIPT.md` — conference walkthrough, credentials, and the list of
  things that break if you click them.

## Current status

Honestly, where this stands:

**Working.** The site is live and serving the current build. The schema, RLS
and 53 migrations are applied; all 33 edge functions are deployed and
authenticating. Venue browsing, search and filters, maps, venue detail with
live availability, holds, checkout, games, teams, community, blog and the
owner dashboards all run against real production data.

**Not exercised.** No payment has ever been made — not against production
credentials and not against the Ameriabank sandbox. The vPOS and Idram adapters
are complete, deployed and unit-tested around the edges (ledger arithmetic,
refund policy, payout batching, currency conversion), but the network calls
themselves have never run. Until a sandbox transaction completes end to end,
treat that flow as written-but-unproven.

**Unset secrets, each with a visible consequence.**

- `OPENROUTER_API_KEY` — every AI feature errors: the site-wide chat bubble,
  the player dashboard's insight cards, matchmaking, venue recommendations, AI
  image generation.
- `RESEND_API_KEY` — no transactional email. A booking would confirm in the app
  and the player would never receive a confirmation.
- `APP_BASE_URL` — the functions fall back to `https://sportsbnb.org`, the apex,
  which 302-redirects to `www`. Payment return URLs and email links go through
  an extra hop rather than landing on the canonical origin.
- `AMERIA_*` and `IDRAM_*` — unset, which is why the payment flow cannot run.

**Thin data.** Two auth accounts exist, so game rosters cannot exceed two
players and community surfaces look sparse. There are zero completed bookings,
so every owner-side revenue, occupancy and customer figure reads zero. Those
are empty-state numbers, not bugs.

**Known rough edges.** `demo.owner`'s profile is still `user_type = 'player'`,
so the owner dashboard redirects away until that is corrected. The apex-to-www
redirect is a 302 where it should be a 301. Venue detail pages are not
prerendered, so they are invisible to non-JavaScript crawlers while the
marketing pages are not. `OwnerCoachCard` exists but is not mounted anywhere.
