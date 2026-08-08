# Payments: what exists, and what "make the store work" actually requires

Audited against the code on `main` (`d5204e2`). Every claim below cites the
file it came from. Nothing here is aspirational — the "missing" sections are
missing because a search found nothing, not because they looked incomplete.

---

## The constraint that shapes everything

**Lemon Squeezy is a Merchant of Record.** It sells to the customer as the
seller of record, handles VAT, and pays out to exactly one bank account —
yours. It has no equivalent of Stripe Connect: it cannot split a payment
between the platform and a third party, and it cannot pay a venue owner.

This is not a limitation to engineer around. It is a different shape of
business, and the code already assumes the right one:

- **Player → platform** is a Lemon Squeezy checkout. Works today.
- **Platform → owner** is a bank transfer you make, tracked by an internal
  ledger. Built, and deliberately manual.
- **Owner → platform** (subscriptions) is a second Lemon Squeezy product. Does
  not exist yet.

Anyone proposing "let Lemon Squeezy pay the owners directly" is proposing
something the product does not do.

---

## 1. Player pays for a booking — **works**

| Piece | State | Where |
|---|---|---|
| Booking hold, price read server-side | works | `create_booking_hold` RPC |
| Checkout creation | works | `supabase/functions/payments-init/` |
| Lemon Squeezy adapter | works | `_shared/providers/lemonsqueezy.ts` |
| Webhook, signature verified before parsing | works | `payments-callback-lemonsqueezy/index.ts:55` |
| Idempotent replay | works | ledger unique index |
| Refunds, both directions | works | webhook + `payments-refund` |

Lemon Squeezy is the only live provider; Ameria and Idram are unwired but still
on disk (`_shared/providers/registry.ts`), restorable in one line.

Commission is 0%, deliberately: the owner receives exactly the listed price.

**The one gap: no card has ever been charged.** The flow was proven with a
simulated webhook because a card form cannot be driven programmatically. That
is the single highest-value thing you can do this week — one real ֏200 booking,
end to end, with a real card.

### Known sharp edge

A refund issued from the Lemon Squeezy dashboard *is* handled — the webhook
writes the ledger pair when `payments-refund` did not
(`payments-callback-lemonsqueezy/index.ts`, the `order_refunded` branch). But a
legacy `ameria`/`idram` payment can no longer be refunded in-app at all, since
`getProvider()` throws for it. Those must be refunded in the old merchant
cabinet and reconciled by hand.

---

## 2. Owner gets paid — **built, and manual by design**

`supabase/functions/payouts-run/` has four actions:

- `run` — creates pending payouts for every owner above the minimum balance
- `export` — CSV of pending payouts for a bank transfer batch
- `mark-paid` — `{ payoutId, reference }` once the transfer clears; notifies
  the owner
- a reversal path for failed transfers

Backed by `ledger_entries` (append-only, signed minor units) and the
`owner_balances` view.

So the real payout loop is: **money lands in your Lemon Squeezy account → you
run the export → you make the bank transfers → you mark them paid.**

### What is missing here

- **Nothing reconciles your ledger against actual Lemon Squeezy payouts.** The
  ledger is a faithful record of what the app thinks it owes; nothing checks
  that against what Lemon Squeezy actually deposited, minus their fees. Until
  something does, a discrepancy shows up as a cash shortfall rather than an
  alert.
- **`payouts-run` is not scheduled.** It exists and is deployed; something has
  to invoke it. Weekly is the usual cadence.
- **Owners cannot enter bank details themselves** unless the payout-account UI
  is wired — check `/owner/earnings` before promising it in the guide.

### Decide before launch

1. **Payout cadence and minimum.** Weekly with a ֏10,000 floor is a reasonable
   default; too low and you spend your life making transfers.
2. **Who absorbs Lemon Squeezy's fee.** At 0% commission you are currently
   paying their ~5% + fixed fee out of your own pocket on every booking. That
   is a real cost per transaction, and it is worth being deliberate rather than
   surprised: either accept it as customer-acquisition spend, or reconsider 0%.

---

## 3. Subscriptions and paid placement — **does not exist**

Searched for `subscription`, `plan`, `tier`, `featured`, `boost`, `promoted`,
`premium`, `sponsor` across `supabase/migrations/` and `src/`. Findings:

- **No subscription table.** No plan or tier column anywhere.
- **The webhook ignores every subscription event.** It handles exactly
  `order_created` and `order_refunded`; everything else returns
  `{ ignored: eventName }` (`payments-callback-lemonsqueezy/index.ts:72`). So
  `subscription_created`, `subscription_payment_success`,
  `subscription_cancelled` and `subscription_expired` currently do nothing.
- **No featured concept in ranking.** `src/features/venues/sortVenues.ts`
  offers `recommended | price-asc | price-desc | rating`, and reads only price,
  rating, review count and distance. There is no hook a paid placement could
  use.
- **No pricing page, plan picker or upgrade CTA.**

This is net-new work, not wiring.

### What it takes to build it

**A. Schema** — one migration:

- `owner_subscriptions`: owner_id, plan, status, current_period_end,
  ls_subscription_id, ls_variant_id, cancel_at. RLS: owner reads own, service
  role writes.
- `venues.featured_until timestamptz` — a timestamp, not a boolean, so
  placement expires by itself when a subscription lapses instead of requiring a
  cleanup job to remember.

**B. Lemon Squeezy** — a subscription product with your plan variants. Same
store, same webhook secret.

**C. Webhook** — extend the event switch to handle
`subscription_created`, `subscription_payment_success`, `subscription_updated`,
`subscription_cancelled`, `subscription_expired`. Same discipline as the
existing handler: verify the signature before parsing, be idempotent on
replay, acknowledge unknown events.

The subtle one is `subscription_payment_success` — that is the renewal, and
it is what should push `featured_until` forward. Keying placement off
`subscription_created` alone means placement silently outlives a failed
renewal.

**D. Ranking** — `featured_until > now()` sorts first within the
`recommended` order, then existing rules apply. Two constraints worth
committing to now:

- **Cap the number of featured slots per city/sport**, or the top of the list
  becomes entirely paid and stops being useful — at which point people stop
  trusting the ordering, and the placement you sold is worth less.
- **Label it.** A "Featured" or "Sponsored" badge. Undisclosed paid ranking is
  the kind of thing that costs trust permanently the first time someone
  notices, and in a market the size of Yerevan, someone notices.

**E. Owner-facing surface** — a plans page, an upgrade CTA on the owner
dashboard, and subscription state in `/owner/settings` so an owner can see what
they are paying for and cancel it.

### On selling "top placement" honestly

Featured placement is worth paying for only if the marketplace has enough
demand that position matters. With a small number of venues and early traffic,
an owner who buys top placement and sees nothing will churn and tell other
owners. The order that actually works is: **get real bookings flowing first,
then sell placement against demand you can point to.**

A defensible first paid tier is usually not placement at all — it is the things
that make an owner money regardless of ranking: the embeddable widget,
analytics, multiple venues, priority support. Placement is the upsell once
there is traffic to place into.

---

## Suggested order

1. **One real card payment**, ֏200, end to end. Everything else is built on the
   assumption that this works, and it has never been proven.
2. **Schedule `payouts-run`** and do one real payout cycle, including the bank
   transfer and `mark-paid`.
3. **Reconciliation**: compare ledger totals against a Lemon Squeezy payout
   statement, even manually at first.
4. **Subscriptions**, once 1–3 are boring.

Steps 1 and 2 are the difference between a payment system that is written and
one that is working. Step 4 is a growth feature, and it sells much better after
steps 1–3 have produced numbers you can show an owner.
