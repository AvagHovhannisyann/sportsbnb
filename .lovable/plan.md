## Goal

Turn Sportsbnb into a hands-off autopilot. You never open the app. Every 5 minutes, agents discover venues, research them, draft + send outreach, follow up, onboard owners, run bookings ops, and ping you on Telegram + email when something needs your eyes (read-only — no approval clicks required).

## Architecture

```text
       ┌──────────────────────┐
cron → │ autopilot-tick (5m)  │ ──► fans out events to Inngest
       └──────────────────────┘
                 │
   ┌─────────────┼──────────────┬───────────────┬────────────────┐
   ▼             ▼              ▼               ▼                ▼
discover-     research-      outreach-       onboarding-     bookings-
venues        target         send-followup   agent           ops-agent
(Google Maps) (Firecrawl +   (Resend)        (auto-listing,  (confirms,
              Gemini)                         pricing, cal)   reminders,
                                                              refunds)
                 │
                 ▼
          notify-agent ──► Telegram bot + daily email digest
```

Orchestration: **Inngest** connector (durable, retries, schedules, fan-out). It replaces the manual "click prepare → click draft → click send" loop.

OpenClaw note: OpenClaw isn't an official Lovable connector. We'll keep the agent logic in our edge functions (already written: `outreach-prepare`, `outreach-draft`) and call Lovable AI Gateway (Gemini 2.5 Flash / GPT-5). If you later want OpenClaw to host the TaskFlow, we swap the `outreach-prepare` body for an HTTPS call to your OpenClaw endpoint — no other change needed.

## What gets built

### 1. Connectors to enable
- **Inngest** — orchestration, retries, 5-min cron, fan-out
- **Telegram** — bot for real-time pings + webhook for your replies (`/pause`, `/resume`, `/status`)
- **Resend** — already connected, used for outreach + daily digest email

### 2. New edge functions
- `autopilot-tick` — runs every 5 min via pg_cron, emits `autopilot/tick` event to Inngest
- `autopilot-orchestrator` — Inngest serve endpoint. Defines durable functions:
  - `discoverVenues` — Google Maps Places nearby search in target cities, inserts new rows into `outreach_targets`
  - `researchTarget` — wraps existing `outreach-prepare` (Firecrawl + Gemini, finds email/phone/socials)
  - `draftAndSend` — wraps `outreach-draft`, then sends via Resend immediately (no human approval)
  - `followUp` — re-sends day 3 / day 7 / day 14 if no reply
  - `handleReply` — parses inbound webhook from Resend, classifies sentiment, triggers onboarding or marks lost
  - `onboardOwner` — auto-creates venue listing, sets default pricing, opens calendar, sends Stripe Connect link
  - `bookingsOps` — confirms new bookings, sends T-24h reminders, auto-refunds cancellations, escalates disputes
  - `notify` — sends Telegram message + appends to daily digest
- `telegram-webhook` — receives `/pause`, `/resume`, `/status`, `/digest now` commands
- `resend-inbound` — receives email replies, feeds to `handleReply`
- `daily-digest` — runs 08:00 your TZ, sends one email summary

### 3. New database tables
- `autopilot_runs` — log every tick: started_at, finished_at, counts (discovered, researched, sent, replies, bookings_handled), errors
- `autopilot_config` — single row: `is_paused`, `target_cities[]`, `daily_send_cap`, `telegram_chat_id`, `digest_email`, `last_digest_at`
- `outreach_events` — append-only log: `target_id`, `kind` (researched|sent|opened|replied|bounced|followup_1|followup_2|won|lost), `at`, `payload`
- `notifications_outbox` — pending Telegram/email messages with retry

### 4. New thin UI (operator-only, optional)
One page `/operator/autopilot` showing:
- Big switch: Autopilot ON / OFF
- Live counters from `autopilot_runs` (last 24h)
- Stream of recent events
- Target cities editor + daily send cap slider
- "Send digest now" button

You won't need to open it — Telegram covers everything — but it's there for visibility.

### 5. Existing UI cleanup
- `OutreachConsole` and `TargetDrawer` stay as a read-only inspector — all the manual buttons (Prepare, Draft, Send) get hidden behind a "Manual override" toggle, since the autopilot now drives the flow.

## Schedule
- `autopilot-tick`: every 5 minutes (pg_cron + pg_net)
- `followUp` checks: piggybacks on tick
- `daily-digest`: 08:00 in your timezone

## Notifications you'll receive
- **Telegram (realtime)**: new positive reply, new booking, Stripe payout, refund issued, error spike, unreachable venue added
- **Email (daily 08:00)**: counts, top 5 replies, owners onboarded, revenue, anything that needs your attention

## Safety rails (since this is fully autonomous)
- Daily cap on outbound emails (default 50/day, editable from Telegram)
- Per-domain throttle so one venue can't be spammed
- Hard pause via `/pause` Telegram command — flips `autopilot_config.is_paused`, every function checks it first
- All sends logged in `outreach_events` for audit
- Refunds capped at booking amount, anything above escalates to Telegram instead of auto-acting

## Out of scope for this plan
- OpenClaw hosting (kept as a swap-in option — say the word and we wire one function to it)
- Multi-language outreach beyond EN/HY (already in)
- Live phone calling

## Technical notes
- Inngest connector secrets (`LOVABLE_API_KEY`, `INNGEST_API_KEY`, `INNGEST_SIGNING_KEY`) are injected once the connector is linked
- Telegram chat_id captured on first `/start` message to your bot
- `resend-inbound` requires setting up an inbound route in Resend pointing to the edge function URL
- `verify_jwt = false` for `autopilot-tick`, `telegram-webhook`, `resend-inbound`
- pg_cron + pg_net extensions enabled via a one-time SQL insert (not migration, since it contains the anon key)

Approve and I'll build it.