# Edge-function secrets to set on the new project

These are the environment variables the edge functions read. **Names only** —
set the values yourself on the new project (Supabase dashboard → Edge Functions
→ Secrets, or `supabase secrets set NAME=value`). Supabase auto-injects
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and
`SUPABASE_DB_URL`, so those are **not** listed and must not be set manually.

## Required for core booking + payments

| Secret | What it is |
|---|---|
| `APP_BASE_URL` | Public site origin (e.g. your Vercel URL) — used in payment redirects and email links |
| `CRON_SECRET` | Shared secret cron jobs send as `x-cron-secret` to `bookings-expire`, `payouts-run`, `autopilot-tick`, `daily-digest` |
| `RESEND_API_KEY` | Resend API key (transactional + outreach email) |
| `EMAIL_FROM` | Verified sender, e.g. `SportsBnB <no-reply@sportsbnb.org>` |
| `EMAIL_REPLY_TO` | Optional reply-to address |
| `AMERIA_BASE_URL` | Ameriabank vPOS base URL (test vs prod) |
| `AMERIA_CLIENT_ID`, `AMERIA_USERNAME`, `AMERIA_PASSWORD` | Ameria vPOS credentials |
| `AMERIA_TEST_CARDHOLDER_ID` | Sandbox only |
| `IDRAM_MERCHANT_ID`, `IDRAM_SECRET_KEY` | Idram merchant credentials |
| `IDRAM_PAYMENT_URL` | Optional Idram endpoint override |
| `PAYMENTS_MOCK_ENABLED` | `true` only in dev to enable the mock payment provider |

## AI / integrations

| Secret | What it is |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter key (replaces the old Lovable AI gateway) |
| `GOOGLE_MAPS_API_KEY` / `GOOGLE_MAPS_API_KEY_1` | Server-side Google Maps/Places key |
| `YANDEX_GEOSUGGEST_API_KEY` | Yandex geosuggest (address autocomplete) |
| `FIRECRAWL_API_KEY` | Firecrawl (outreach research) |

## Notifications / calendar (optional features)

| Secret | What it is |
|---|---|
| `RESEND_WEBHOOK_SECRET` | Svix signing secret for the Resend inbound webhook |
| `TELEGRAM_API_KEY` | Telegram bot token (@BotFather) |
| `TELEGRAM_ALLOWED_CHAT_IDS`, `TELEGRAM_LINK_CODE` | Telegram command authorization |
| `SLACK_API_KEY` | Slack bot token (`xoxb-…`) |
| `OUTREACH_FROM_EMAIL` | Autopilot outreach sender |
| `ALLOWED_ORIGINS` | Extra CORS origins (comma-separated) beyond the built-in list |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Calendar OAuth |
| `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET` | Outlook Calendar OAuth |

## Frontend build vars (set in Vercel, not Supabase)

`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`,
`VITE_GOOGLE_MAPS_BROWSER_KEY`, `VITE_GOOGLE_MAPS_TRACKING_ID` — these come from
the **new** project (Settings → API) and your Google Cloud console.
