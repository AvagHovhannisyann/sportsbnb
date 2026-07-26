# SportsBnB

A marketplace for booking sports venues in Armenia — players discover courts,
book and pay in-app (Ameriabank vPOS cards or Idram), join pickup games, and
build teams; owners manage schedules, earnings, and payouts.

## Stack

- **Frontend**: Vite + React 18 + TypeScript, Tailwind (custom "court at night"
  design system), shadcn/ui primitives, TanStack Query, framer-motion
- **Backend**: Supabase — Postgres (RLS everywhere), Deno edge functions,
  Realtime for chat
- **Payments**: provider-abstraction layer (`supabase/functions/_shared/providers/`)
  with Ameriabank vPOS, Idram, and a mock adapter for development.
  See [docs/payments.md](docs/payments.md) for architecture, ledger invariants,
  and the payout runbook.

## Development

```sh
npm install
cp .env.example .env        # fill in Supabase project values
npm run dev                 # http://localhost:8080
```

Checks (all must pass; CI runs them on every PR):

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Payments can be exercised end-to-end locally with the mock provider
(`PAYMENTS_MOCK_ENABLED=true` on the functions side): reserve a slot →
checkout → "Test payment" → mock bank page → confirmed booking + ledger entries.

## Structure

```
src/
  features/booking/    booking flow (panel, checkout, status, payment hooks)
  features/venues/     shared venue form
  pages/               route pages (data access via hooks only — lint-enforced)
  hooks/               data hooks (venues, games, teams, chat, admin, …)
  components/          UI building blocks (shadcn primitives re-skinned via tokens)
  index.css            design tokens — dark-first theme, glass, motion primitives
supabase/
  migrations/          schema (RLS-first; money tables + booking state machine)
  functions/           Deno edge functions
  functions/_shared/   auth, CORS allowlist, email, payment providers
docs/payments.md       payments architecture + ops runbooks
docs/audits.md         the eighteen browser audits, and how to run one
scripts/               those audits; each header says what it was written for
```

## Security model (summary)

- Every table has RLS; PII and money tables are owner/admin-scoped.
- Edge functions: `verify_jwt=true` by default; machine endpoints require a
  cron secret or provider webhook signatures (`supabase/config.toml` documents
  the posture).
- Prices, commissions, XP, and referral codes are computed server-side —
  clients only pick slots and pay.
