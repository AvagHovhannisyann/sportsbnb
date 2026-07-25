# Migrating off Lovable

This document tracks what changed when the app was decoupled from the
Lovable platform (Lovable Cloud / connector gateway / AI gateway / build
tooling), and what's still required on your end.

## What changed in code (done)

- **AI**: every edge function that called `ai.gateway.lovable.dev` with
  `LOVABLE_API_KEY` now calls **OpenRouter** (`_shared/ai.ts`) with
  `OPENROUTER_API_KEY`. Affected: `ai-chat`, `generate-ai-image`, `owner-coach`,
  `player-insights`, `ai-game-matchmaking`, `ai-venue-recommendations`,
  `admin-pulse`, `discover-fields`, `outreach-prepare`, `outreach-draft`,
  `outreach-research`, `resend-inbound`.
- **Telegram**: calls to `connector-gateway.lovable.dev/telegram/*` replaced
  with direct Telegram Bot API calls (`_shared/telegram.ts`). `TELEGRAM_API_KEY`
  is now used directly as the bot token (issued by @BotFather) rather than a
  Lovable connection key. Affected: `telegram-webhook`, `daily-digest`,
  `autopilot-tick`, `resend-inbound`.
- **Slack**: calls to `connector-gateway.lovable.dev/slack/*` replaced with
  direct Slack Web API calls (`_shared/slack.ts`). `SLACK_API_KEY` is now used
  directly as a bot token (`xoxb-...`). Affected: `slack-notify`.
- **Google Places**: calls to `connector-gateway.lovable.dev/google_maps/*`
  replaced with direct Google Places API (New) calls (`_shared/google-places.ts`).
  Affected: `outreach-prepare`, `outreach-enrich`, `autopilot-tick`
  (`discover-fields` already called Google Places directly).
- **Resend (raw HTML sends)**: cold-outreach and digest emails, which compose
  their own full HTML, now go through `sendRawEmail()` in `_shared/email.ts`
  directly against `api.resend.com` instead of the Lovable connector proxy.
  Affected: `outreach-send`, `daily-digest`, `autopilot-tick`.
- **OAuth (Google/Apple sign-in)**: replaced `@lovable.dev/cloud-auth-js` with
  Supabase's native `supabase.auth.signInWithOAuth()`. The `src/integrations/lovable/`
  wrapper is deleted.
- **Build tooling**: removed `lovable-tagger` (dev-only Vite plugin that
  injected component tags for Lovable's visual editor) from `vite.config.ts`
  and `package.json`.
- **Branding/URLs**: removed the `sportsbnb.lovable.app` domain from the CORS
  allowlist and all fallback URLs (now `sportsbnb.org`); OG/Twitter meta tags
  point at the local `public/og-image.png` instead of an externally-hosted
  Lovable file-upload URL; `.lovable/plan.md` (Lovable-specific planning doc)
  removed; env vars `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_*` renamed to
  `VITE_GOOGLE_MAPS_*`.

## What still requires you (can't be done from code)

1. **Database migration — copy Lovable Cloud's Supabase project to a new,
   independent Supabase project.** This needs direct access this session
   doesn't have: the source project's `service_role` key and database
   connection string/password (Project Settings → API / Database in the
   Supabase dashboard). Once provided, the migration is: `pg_dump` schema +
   data from the source → `pg_restore`/apply into the new project → copy
   storage buckets/objects → redeploy all edge functions and their secrets →
   point the app's `.env` at the new project.
2. **New Supabase org**: only one org (`Ecolingo`) is currently visible to
   this session. Create/authorize the org you want the new project in.
3. **`OPENROUTER_API_KEY`**: set as a secret on the new project's edge
   functions (Project Settings → Edge Functions → Secrets, or `supabase
   secrets set`).
4. **Telegram/Slack tokens**: confirm `TELEGRAM_API_KEY` is the real
   @BotFather bot token and `SLACK_API_KEY` is a real Slack bot token
   (`xoxb-...`) with `chat:write` — not Lovable connection keys, if those
   ever differed.
5. **Detaching from Lovable's platform itself** (stopping billing/build
   syncing through Lovable's dashboard) is a Lovable-account action — do this
   in Lovable's project settings once the new Supabase project is live.

## New/changed environment variables (edge functions)

| Old | New |
|---|---|
| `LOVABLE_API_KEY` | `OPENROUTER_API_KEY` |
| (Telegram via Lovable connector) | `TELEGRAM_API_KEY` = real bot token |
| (Slack via Lovable connector) | `SLACK_API_KEY` = real bot token |
| (Google Maps via Lovable connector) | `GOOGLE_MAPS_API_KEY_1` / `GOOGLE_MAPS_API_KEY` (unchanged — now called directly) |
| (Resend via Lovable connector) | `RESEND_API_KEY` (unchanged — now called directly) |

Frontend (`VITE_` build-time vars, see `.env.example`):

| Old | New |
|---|---|
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` | `VITE_GOOGLE_MAPS_BROWSER_KEY` |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID` | `VITE_GOOGLE_MAPS_TRACKING_ID` |
