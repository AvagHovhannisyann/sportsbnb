# Sending this to Ameriabank — what is ready and what is not

Written to be read before the site is shown to the bank, because the single
most important fact is easy to miss: **none of this work is on the live site
yet.**

---

## 1. www.sportsbnb.org is not this

`https://www.sportsbnb.org` serves the `main` branch. Every change described
here is on `claude/app-review-restructure-cccb22`, which is **162 commits ahead
of `main` and behind it by none.** Verified just now: the live `/faq` does not
contain the prerendered copy, and the live `/llms.txt` does not mention
Ameriabank.

So if you send the bank the live URL today, they will review the old site — no
in-app payment, the fabricated review rating on the home page, the search bar
that returns nothing, and the pages that were byte-identical to a crawler.

**Merge the pull request first.** Nothing else in this document matters until
that is done.

---

## 2. What the bank's technical reviewer will look for, and where it stands

Ameriabank's vPOS integration review is mostly about one question: does the
merchant confirm a payment on the bank's word, or on the browser's? The answer
here is the right one, and it is worth pointing them at.

**The flow** (`supabase/functions/_shared/providers/ameria.ts`):

1. `InitPayment` with `ClientID` / `Username` / `Password`, a unique `OrderID`,
   the amount as a decimal, and `Currency` as the ISO 4217 **numeric** code
   (`051` for dram). Success is `ResponseCode === "1"` plus a `PaymentID`.
2. The customer is redirected to `{base}/Payments/Pay?id={PaymentID}`.
3. The bank calls `BackURL`, which lands on `payments-callback-ameria`.
4. **The callback never trusts the redirect parameters.** It calls
   `GetPaymentDetails` and requires `ResponseCode === "00"` *and* an amount
   equal to the amount on the booking row. A mismatch is recorded as a failure,
   never as a partial capture.

Other things a reviewer tends to check:

- **The amount is never taken from the client.** `payments-init` reads it from
  the `bookings` row in the database; the browser cannot influence what is
  charged.
- **`OrderID` is unique per attempt.** It comes from a Postgres sequence
  (`payment_order_ref_seq`). A retry after a decline creates a new payment row
  and therefore a new order reference, because the bank will not accept a
  repeated one. (This was broken until recently — a declined card used to make
  every subsequent attempt fail with a 500. Fixed on this branch.)
- **Callbacks are idempotent.** `ledger_entries` has `UNIQUE(payment_id,
  entry_type)`, so a callback replayed five times produces one ledger triple.
- **Double booking is impossible at the database level**, not by convention: a
  `btree_gist` exclusion constraint on `(venue, court, time range)`.
- **Money is stored in integer minor units** and converted to the bank's
  decimals in exactly one place. That conversion now has tests — see
  `src/features/booking/provider-money.test.ts`, which checks all 200,000
  two-decimal amounts up to ֏2,000 round-trip exactly.
- **Credentials come from environment variables**, never from the repository.
  `AMERIA_BASE_URL`, `AMERIA_CLIENT_ID`, `AMERIA_USERNAME`, `AMERIA_PASSWORD`,
  and `AMERIA_TEST_CARDHOLDER_ID` for sandbox. Documented in
  `migration-bundle/SECRETS.md`.

---

## 3. What has never been run

This is the part to be straight about, with them and with yourself.

**The Ameria adapter has never made a real request.** Not to production, not to
`servicestest.ameriabank.am`. There are no `AMERIA_*` credentials set anywhere,
so every line of that flow is unexercised code. It is written against the vPOS
documentation and it is internally consistent, but "should work" and "has
worked" are different claims and only one of them is true here.

What has been tested is everything around it: the ledger arithmetic, the refund
policy, the payout batching, the booking status machine, the currency
conversion. The development flow runs end to end on a `mock` provider.

**The edge functions are not deployed.** `supabase functions deploy` has not
been run against the project — see `docs/handover.md` §2. Until it is, the
payment endpoints do not exist at a URL the bank could call back to.

**One migration is unapplied**, also §2, though it concerns field check-ins
rather than payments.

---

## 4. The order to do this in

1. **Merge the pull request.** Everything else depends on it.
2. **Revoke the Supabase personal access token** (`docs/handover.md` §1a). It
   carries full account authority and is currently live. Do this before anyone
   outside the project is looking at anything.
3. **Deploy the edge functions and finish the migration** (§2), so the payment
   endpoints exist.
4. **Ask Ameriabank for sandbox credentials** and set `AMERIA_BASE_URL` to
   `https://servicestest.ameriabank.am/VPOS` with the test cardholder id.
5. **Make one sandbox payment end to end** — book a slot, pay, watch the
   callback confirm it, check the ledger balances to zero, then refund it. That
   run is what turns section 3 from "unexercised" into "verified", and it is
   the thing worth telling the bank you have done.
6. Only then show them the live site.

Two smaller items that are not blockers but will be noticed:
`sportsbnb.org` redirects to `www` with a **302 where it should be a 301**
(§9), and venue pages are still invisible to non-JavaScript crawlers (§10).

---

## 5. What to actually send them

A bank reviewing an integration wants the flow, not a tour of the app. Worth
including:

- The live URL, **after** the merge.
- That settlement is in AMD, that Sportsbnb charges no platform fee — the
  player is charged exactly the venue's rate and the owner receives all of it —
  and that funds are tracked in a double-entry ledger with scheduled payouts to
  Armenian bank accounts and Idram wallets.
- That confirmation is always via `GetPaymentDetails` and never via the
  redirect parameters — this is the answer to the question they are really
  asking.
- That Idram is implemented alongside vPOS as a second provider behind the same
  interface, so the two settle through the same ledger.

Do not tell them the integration is tested against their sandbox until step 5
above has actually happened.
