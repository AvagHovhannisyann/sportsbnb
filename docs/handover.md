# Handover — what still needs you

Everything on this branch that cannot be done from code. It was previously
spread across the pull request body, individual commit messages,
`docs/lovable-migration.md` and `docs/design-audit.md`; this is the single
list.

Ordered by consequence, not effort. The security section is first because two
of its items are live exposures rather than tidy-ups.

---

## 1. Credentials to rotate

Three credentials are exposed in places that removing them from the current
code does not clean up. Each needs rotating at its source.

### 1a. Supabase personal access token — highest priority

A personal access token (`sbp_…`) was pasted into a chat message during this
work. It was never used, but a PAT is not scoped to one project — it carries
full account authority, including creating and deleting projects.

**Action:** revoke it at <https://supabase.com/dashboard/account/tokens>.
Nothing in the repository depends on it.

### 1b. Google Maps browser key — still the exposed one

`.env` was committed before Phase 0 removed it, and remains retrievable from
git history. Phase 0 recommended rotating the Maps key; that has not happened.
Verified by comparing SHA-256 fingerprints of the historical value and the one
currently in use — **they are identical**.

Maps JS API loads are billable, so a harvested key spends your quota.

**Action:** rotate the key in the Google Cloud console, and restrict the
replacement by HTTP referrer. The restriction matters more than the rotation:
a browser key ships inside the JavaScript bundle no matter what, so
referrer-locking is the only thing that actually prevents third-party use.

Nothing else in that historical `.env` is sensitive — the other four values are
`VITE_*` publishable credentials, three of them belonging to the old Lovable
Supabase project you are decommissioning. There was no service-role key and no
secret in it.

### 1c. Yandex Geocoder key

Was hardcoded as a literal in `src/components/search/SmartSearch.tsx` and is
therefore in git history. It now reads from `VITE_YANDEX_GEOCODER_KEY`, but
that does not un-expose the old value. The quota is billable.

**Action:** rotate it in the Yandex console, restrict by HTTP referrer, and set
`VITE_YANDEX_GEOCODER_KEY` in Vercel. Until it is set, location suggestions in
search are skipped; venue and game suggestions keep working.

---

## 2. Finish the Supabase migration

The schema, RLS, extensions and migration-inserted seed rows are already
applied to `skwzaxqhgrysbsuqkuyp` (eu-central-1). What remains:

1. **Blog posts** — run `migration-bundle/seed.sql` (5 rows) in the SQL editor.
   The only seed data no migration creates.
2. **Edge functions** — `supabase link --project-ref skwzaxqhgrysbsuqkuyp &&
   supabase functions deploy`. Deploys all of them in one shot.
3. **Function secrets** — set per `migration-bundle/SECRETS.md`. Includes
   `OPENROUTER_API_KEY`, and confirming `TELEGRAM_API_KEY` / `SLACK_API_KEY`
   are real bot tokens rather than Lovable connection keys.
4. **Auth → URL Configuration** — site URL and redirect allow-list.
5. **Vercel environment variables** — `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, plus the two
   rotated keys above.
6. **Delete the Montreal project** `ozdaobjemfakaclgrzkd`, created before the
   region was reconsidered and never used.
7. **Detach from Lovable** — a Lovable-dashboard action, once the new project
   is serving.

---

## 3. Unblock the last of the design work

`venues.owner_id` is `NOT NULL REFERENCES auth.users(id)`, so demo venues need
a real account. Creating one from this environment was denied by the
permission classifier, twice.

**Action:** sign up once in the app and send me the email address. Venue
seeding, and design review of the populated Discover / venue-detail /
dashboard surfaces, follow from that.

One thing to know before you do: the owner redirect loop fixed in `585302f`
would have hit that first owner account on its very first login —
`/owner-dashboard` and `/onboarding/owner` bounced off each other 6489 times in
nine seconds. It is fixed on this branch but not on `main`, so sign up against
a deployment of this branch, or merge first.

---

## 4. Nothing — this section was my mistake

An earlier version of this document, and several commit messages, claimed that
nothing maintains `venues.review_count` or `venues.rating`, and recommended you
add a trigger.

**That was wrong.** The `update_venue_rating` trigger already recomputes both
from the `reviews` table on insert, update and delete. It is in the repository
(`supabase/migrations/20260114060648_…sql`) and live on the project. I missed it
because I filtered a grep for `set review_count` on one line, and the trigger's
`UPDATE` spans several — `SET` on one line, `review_count =` on the next. The
filter excluded the only line that would have corrected me.

No action needed from you here. The fixes made on that false premise were
re-examined and stand on their own merits — a venue with genuinely zero reviews
should not display "0 stars", and a brand-new listing should not be permanently
capped below 85 for having no reviews yet — but their stated reasoning has been
corrected in the code comments and in `docs/design-audit.md`.

---

## 5. Small, optional

- **`e2e` CI job** — gated on an `E2E_ENABLED` repository variable and
  `VITE_SUPABASE_*` secrets that were never set, so it has never once run. The
  `smoke` job added on this branch needs no secrets and covers route health,
  error boundaries, blank renders and horizontal overflow at desktop and phone
  width; `e2e` would add real end-to-end flows on top.
- **Canonical domain** — `SEOHead` publishes `https://sportsbnb.org` while
  `AboutPage`'s JSON-LD publishes `https://www.sportsbnb.org`. Search engines
  treat those as different origins. Pick one; I could not tell which is real
  from the repository.
- **Stray branch** — `claude/supabase-eu-migration-9f2a` cannot be deleted from
  here; the git proxy refuses. Delete it from the GitHub UI.
