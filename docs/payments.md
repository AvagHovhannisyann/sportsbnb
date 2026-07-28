# Payments architecture

SportsBnB uses an Airbnb-style **collect-then-payout** model built for Armenian
legal entities: the platform collects the full booking amount from the player,
tracks owner earnings and platform commission in an internal ledger, and pays
owners out in batches.

## Providers

| Provider | Flow | Verify | Refunds |
|---|---|---|---|
| `lemonsqueezy` | `POST /v1/checkouts` with `custom_price` → redirect to hosted checkout → `redirect_url` back to the app's status page | Webhook `payments-callback-lemonsqueezy`: `X-Signature` hex HMAC-SHA256 over the **raw** body (verified before parsing) + `data.attributes.total` must equal `payments.amount_minor`. `payments-verify` polling additionally does `GET /v1/orders/<id>` once the webhook has recorded the order id. | API (`POST /v1/orders/<id>/refund`, `attributes.amount` in minor units) |
| `mock` | fake bank page at `/pay/mock/:paymentId` | Tester chooses outcome via `payments-verify` `mockOutcome` | instant |

The mock provider only works with `PAYMENTS_MOCK_ENABLED=true`. Never enable in production.

Server env: `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_VARIANT_ID`,
`LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_STORE_ID` (default `440378`),
`LEMONSQUEEZY_STORE_CURRENCY` (default `AMD`). Products/variants cannot be
created through the API — the variant is made in the dashboard and its id set
in env.

### Retired providers

Ameria vPOS (`ameria`) and Idram (`idram`) are **no longer live**. Their
adapters (`_shared/providers/ameria.ts`, `idram.ts`) and their callback
functions are still on disk and still deployed, but they were removed from
`getProvider()` and from the `payments-init` allow-list, so no new payment can
be created against them. Re-enabling either means re-adding its `case` in
`registry.ts` and its key in `payments-init`. A pre-existing `ameria`/`idram`
payment row could not be refunded through `payments-refund` any more
(`getProvider()` throws for it) — there were none when the switch was made.

## Money representation

All amounts are stored as **integer minor units** (AMD × 100, `bigint`).
Conversion to provider decimals happens only inside the adapters
(`supabase/functions/_shared/providers/money.ts`). Display uses
`formatAmd()` client-side.

## Booking lifecycle

```
create_booking_hold() RPC          payments-init            provider redirect
  (price derived from DB,   →   (amount from DB row,   →   (bank page / wallet)
   20-min hold, exclusion         payments row with
   constraint = no overlap)       unique order_ref)
                                        │
              callback / payments-verify polling
                                        │
                              settlePaidPayment()
              (idempotent: status flip guard + unique ledger triple)
                                        │
        booking → confirmed · ledger: payment_received / owner_earning /
        platform_commission · notifications + confirmation email
```

- Holds expire after 20 minutes (`bookings-expire` cron → `expire_stale_holds()`),
  freeing the slot.
- Double-booking is impossible: `bookings_no_overlap` GiST exclusion constraint
  on `(venue_uuid, court_id, tstzrange(starts_at, ends_at))` for active statuses.
- Game capacity is enforced with a row lock in `join_game` / `join_game_paid`.
- Clients cannot modify money columns or make arbitrary status jumps
  (`enforce_booking_transitions` trigger); all transitions run through RPCs or
  the service role.

## Ledger invariants

`ledger_entries` is append-only (no client write policies; no UPDATE/DELETE path).

- The confirmation triple (`payment_received`, `owner_earning`,
  `platform_commission`) is unique per payment (partial unique index) — replayed
  callbacks are no-ops.
- Owner balance = `SUM(amount_minor)` for that owner (view `owner_balances`).
- Refunds write `refund` (platform out) + `owner_refund_debit`
  (owner's proportional share reversed).
- Payouts write a negative `payout` entry when created; a failed payout is
  reversed with a positive `adjustment`.
- Invariant: platform cash = Σ payment_received + Σ refund (≤0) — owner payouts.

Commission comes from `platform_settings.commission_bps`, read server-side
only. It is currently `0` — Sportsbnb takes no commission, so every booking
writes a zero-value `platform_commission` entry and the owner's earning equals
the amount the player paid. The setting and the ledger entry type are kept so a
future non-zero rate needs no schema change; `create_booking_hold()` falls back
to 0, not 500, if the setting row is missing.

## Refund policy engine

`_shared/refund-policy.ts` computes entitlement from the **policy snapshot
taken at booking time** (never the venue's current policy):

- owner-initiated cancel → 100%
- `refund_type=none` → 0
- outside `cancellation_hours` cutoff → 100%
- inside cutoff: `partial` → 50%, `full` → 0
- after start time → 0

## Payout runbook (v1 — manual bank transfers)

1. `payouts-run` (cron weekly or admin-triggered) creates `pending` payouts for
   owners with balance ≥ ₸10,000 and debits the ledger.
2. Admin calls `payouts-run` with `{action: "export"}` → CSV rows
   (amount, IBAN/Idram destination snapshot).
3. Execute the transfers in the bank / Idram cabinet.
4. Confirm each: `{action: "mark-paid", payoutId, reference}` (owner gets a
   notification). A failed transfer: `{action: "mark-failed", payoutId}`
   (ledger debit reversed).

## Idram manual refund SOP

1. Player/owner cancels → `payments-refund` computes the amount and marks the
   payment `refund_pending` (player is notified "1-3 business days").
2. Ops refunds the transaction in the Idram merchant cabinet.
3. Mark the payment refunded (admin update; ledger entries as in the API path).

## Required environment (edge functions)

- `AMERIA_BASE_URL` (`https://servicestest.ameriabank.am/VPOS` for sandbox),
  `AMERIA_CLIENT_ID`, `AMERIA_USERNAME`, `AMERIA_PASSWORD`,
  `AMERIA_TEST_CARDHOLDER_ID` (sandbox only)
- `IDRAM_MERCHANT_ID`, `IDRAM_SECRET_KEY`, `IDRAM_PAYMENT_URL` (optional override)
- `APP_BASE_URL` — user-facing origin for redirects
- `PAYMENTS_MOCK_ENABLED` — dev/E2E only
- `CRON_SECRET` — sent as `x-cron-secret` by schedulers to `bookings-expire`,
  `payouts-run`, `autopilot-tick`, `daily-digest`
- `EMAIL_FROM`, `EMAIL_REPLY_TO`, `RESEND_API_KEY` — transactional email
