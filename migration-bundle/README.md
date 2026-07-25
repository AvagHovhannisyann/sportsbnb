# Migration bundle → your own Supabase project

Everything needed to stand up SportsBnB on a **new Supabase project you fully
own**, using only artifacts derived from this repo and the public API. No admin
credentials from the old (Lovable-managed) project are needed or included.

## What's in here

| File | What it is |
|---|---|
| `schema.sql` | The complete database structure — all 49 migrations concatenated in apply order. Tables, RLS policies, functions, triggers, storage buckets, extensions. |
| `seed.sql` | Public/config seed data only (achievements catalog, cancellation-policy config, published blog posts). No PII, no user/booking/payment data. |
| `data/*.json` | The raw exports `seed.sql` was built from, for inspection. |
| `STORAGE_MANIFEST.md` | The four storage buckets (recreated by `schema.sql`) and how to copy objects if needed. |
| `SECRETS.md` | The edge-function env-var **names** to set on the new project (values are yours to fill in). |

## Why there's no user/booking/payment data

With only the public (anon) API key — the only access this bundle was built
from — Row-Level Security correctly hides all private data (profiles' PII,
bookings, payments, auth users, private tables). That's by design. The app is
also **pre-launch**, so there is no real customer data to move — the only rows
that exist are seed/config, which are all captured in `seed.sql`.

`auth.users` is intentionally **not** migrated: moving password hashes needs
privileged DB access, and pre-launch there are no real accounts to preserve.
The new project starts with a clean auth table.

## Steps

### 1. Create the new project
In **your own** Supabase org: New project → pick a region (Ameria/Idram traffic
is Armenia, so an EU region is a reasonable default) → save the DB password.

### 2. Apply the schema
Supabase dashboard → SQL Editor → paste `schema.sql` → Run. (Or, with the CLI
linked to the new project: `supabase db push` using this repo's
`supabase/migrations/` — same content.)

Then run `seed.sql` the same way.

> `seed.sql` contains **only the blog posts**. The achievements catalog and the
> platform cancellation policy are already inserted by `schema.sql` itself, with
> UUIDs generated on the target project. Do not re-add them here: their ids
> differ from the source project's, so `ON CONFLICT (id)` would not fire and
> you'd end up with 12 duplicate achievements plus a unique-constraint failure
> on `platform_policies.policy_type`.

> If the SQL editor errors on `cron.schedule`/`pg_net` calls, those come from
> the autopilot cron migration; enable the `pg_cron` and `pg_net` extensions
> (Database → Extensions) first, or comment out the `cron.schedule(...)` lines
> and set the schedules up from the dashboard afterward.

### 3. Deploy the edge functions
With the Supabase CLI linked to the new project:
```bash
supabase functions deploy    # deploys everything in supabase/functions/
```
Then set the secrets from `SECRETS.md`
(`supabase secrets set NAME=value …`).

### 4. Point the app at the new project
Update `.env` (local) and the Vercel env vars with the **new** project's values
(Settings → API):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`

Set the edge-function `APP_BASE_URL` and `ALLOWED_ORIGINS` to your Vercel
domain, and point Supabase Auth (Authentication → URL Configuration) Site URL +
redirect URLs at it.

### 5. Verify
- `npm run build` locally against the new `.env`
- Sign up a fresh account, confirm profile creation works
- Create a venue, reserve a slot, pay with the **mock** provider
  (`PAYMENTS_MOCK_ENABLED=true`) end-to-end
- Check the ledger/payout tables populate (see `docs/payments.md`)

### 6. Decommission the old project
Once verified, stop the old Lovable-managed project (and its billing) from
Lovable's side. Rotate any keys that were only ever used there.

---

**Regenerating this bundle:** the seed export was produced by reading the
public REST API with the anon key; `schema.sql` is just the migrations
concatenated. Nothing here requires privileged access, so it can be rebuilt any
time.
