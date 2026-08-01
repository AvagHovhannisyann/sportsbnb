# Deploying the frontend to Vercel

The SportsBnB frontend is a Vite SPA. The backend (Postgres, edge functions,
auth) stays on Supabase — Vercel only hosts the static frontend. `vercel.json`
in the repo root configures the build, SPA routing rewrites, caching, and
security headers.

## One-time setup (Git integration — recommended)

1. In the Vercel dashboard: **Add New → Project → Import** the
   `AvagHovhannisyann/sportsbnb` GitHub repo.
2. Framework preset auto-detects as **Vite** (confirmed by `vercel.json`).
   Build command `npm run build`, output `dist` — no changes needed.
3. Add **Environment Variables** (Production + Preview). These are the
   client-exposed `VITE_` values (safe in the browser bundle by design):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_YANDEX_MAPS_API_KEY`
   - `VITE_YANDEX_GEOCODER_KEY`
   Copy them from your local `.env` (or your team's secret store). Both
   Yandex keys must be **HTTP-referrer restricted** to the Vercel domain(s)
   in the Yandex Developer Dashboard — they ship in the bundle and both are
   billable. They are separate products: the Maps key does not authorise the
   Geocoder. Omitting the Maps key is survivable — maps render a "Map
   unavailable" panel and the rest of every page works.

   `VITE_GOOGLE_MAPS_BROWSER_KEY` and `VITE_GOOGLE_MAPS_TRACKING_ID` are no
   longer read by anything. Delete them from Vercel and revoke the key.
4. Deploy. Every push to `main` ships to production; PRs get preview URLs.

## After the first deploy

- Point Supabase Auth **Site URL** and **Redirect URLs** at the Vercel domain
  (and preview domains if you use magic links / OAuth there).
- Set `APP_BASE_URL` on the Supabase edge functions to the production Vercel
  URL so payment redirects and emails link back correctly.
- Add the Vercel domain(s) to the edge functions' `ALLOWED_ORIGINS`.

## Backend must be ready first

The frontend expects the Phase 2/3 schema. Before a production deploy is
useful, apply the `supabase/migrations/20260723*` migrations and set the
edge-function secrets from `docs/payments.md` — otherwise booking/payments
will error against the old schema.
