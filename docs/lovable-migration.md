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

## Database migration — done

The app now runs on an independent Supabase project:

| | |
|---|---|
| Project ref | `skwzaxqhgrysbsuqkuyp` |
| Name / region | `sportsbnb` · `eu-central-1` (Frankfurt) |
| Postgres | 17.6 |

Applied via the Supabase connector: all 49 migrations (51 tables, 2 views, 189
RLS policies, 4 storage buckets), extensions `pg_cron` / `pg_net` /
`btree_gist` / `pgcrypto`, and the achievements + cancellation-policy seed rows
that the migrations themselves insert.

Frankfurt was chosen over the default region because the primary market is
Armenia — it roughly halves round-trip latency for users and for the
Ameria/Idram payment callbacks compared with a North American region.

`supabase/config.toml` and the local `.env` now point at this project.

## What still requires you (can't be done from code)

1. **Blog posts**: run `migration-bundle/seed.sql` (5 rows) in the SQL editor.
   It is the only seed data no migration creates. Everything else is loaded.
2. **Edge functions + secrets**: see "Deploying the functions" below.
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

## Deploying the functions

The 34 edge functions are best deployed with the Supabase CLI in one shot —
it uploads them all and is byte-exact, unlike pasting sources one at a time:

```bash
supabase login                                  # opens a browser
supabase link --project-ref skwzaxqhgrysbsuqkuyp
supabase functions deploy                       # deploys all of supabase/functions/
supabase secrets set OPENROUTER_API_KEY=... RESEND_API_KEY=... # etc, see SECRETS.md
```

`supabase/config.toml` already carries the correct `project_id` and the
per-function `verify_jwt` posture set in Phase 1, so the deploy picks up the
right auth settings automatically.

## Known advisor findings on the new project

`get_advisors` after the migration returned one ERROR and a set of WARNs. All
of them are inherited from the original schema rather than introduced by the
move — they would have been reported identically on the Lovable project:

- **`profiles_public` is a SECURITY DEFINER view** (ERROR). Deliberate, from the
  Phase 1 migration: with `security_invoker = on` the view returned only the
  caller's own row and silently broke public profile lookups. It projects a
  non-PII column whitelist, which is what makes the definer form safe here.
- **`btree_gist` is installed in `public`** (WARN). Moving it means dropping and
  recreating the `bookings_no_overlap` exclusion constraint that depends on it;
  not worth the churn.
- **`booking_intents` INSERT policy is `WITH CHECK (true)`** (WARN). Intentional
  — the policy is scoped to the `authenticated` role, so the check *is* "must be
  signed in".
- **Public buckets allow listing** (WARN ×4). Pre-existing; tightening this is a
  behaviour change, not a migration step.
- **`add_chat_member` and `send_system_message` are SECURITY DEFINER with no
  internal authorization check** (WARN). This one is a real gap worth its own
  change: both are called from the browser (`src/hooks/useChat.ts`), so they
  can't simply have EXECUTE revoked — they need the same treatment `notify_user`
  got in Phase 1, i.e. verifying `auth.uid()` is a member of the target room
  before writing. Filed here rather than fixed silently during a migration.

Fixed as part of the migration: `enforce_booking_transitions` and
`protect_profile_xp` had a role-mutable `search_path`
(`20260725150000_pin_search_path_trigger_functions.sql`).
