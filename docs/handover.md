# Handover — what still needs you

Everything on this branch that cannot be done from code. It was previously
spread across the pull request body, individual commit messages,
`docs/lovable-migration.md` and `docs/design-audit.md`; this is the single
list.

Ordered by consequence, not effort. The security section is first because two
of its items are live exposures rather than tidy-ups.

---

## Start here

The sections below accumulated as I found things, which is not the order to do
them in. This is:

**Do first — everything else waits on these**

1. **Revoke the Supabase PAT** (§1a). One click, and it currently carries full
   account authority.
2. **Sign up in the app and send me the email** (§3). It unblocks seed data,
   which unblocks the remaining design work. Sign up against *this branch* —
   the owner redirect loop is fixed here and not on `main`.

**Do before anyone else uses the app**

3. **Rotate and referrer-restrict the Maps and Yandex keys** (§1b, §1c). Both
   are billable and both are in git history. The referrer restriction matters
   more than the rotation.
4. **Finish the Supabase migration** (§2) — blog seed, edge functions, secrets,
   auth URLs, Vercel env. The app cannot serve real traffic until this is done.

**Decisions only you can make** — I deliberately did not make these, and each
says why at the section

5. Partial-day blocking, or not (§5). Owners currently cannot close two hours.
6. The leaderboard: publish XP, or remove it (§6). It renders one row today.
7. Two admin tabs: wire up or delete (§5).
8. Check-in counts: the aggregate RPC, which also closes a privacy gap (§7).

**Optional** — §8.

Nothing in the code is waiting on items 5–8. They are written up with the SQL
where SQL is needed, so each is a short job once you have decided.

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

## 5. Seven product calls I did not make for you

None of these is a bug I could fix without deciding something that is yours to
decide.

**Partial-day blocking.** The schedule's Block Time dialog offered "Specific
time range", and it could not work: blocks are stored in `blocked_dates`, which
holds a date and nothing else, and `get_available_slots` drops every slot on a
date it finds there. Blocking 18:00–20:00 therefore closed the whole day while
reporting success. The dialog now says the option is unavailable, so nobody
loses a day by accident — but owners closing two hours for maintenance is a
normal thing to want. Supporting it needs a new table (venue, date, start, end),
RLS on it, and a change to `get_available_slots` to subtract those ranges. That
touches the availability path the whole booking flow depends on, so I left it
for you to schedule rather than doing it unprompted.

**Two admin tabs that exist but are unreachable.** `FieldSubmissionsTab` and
`CandidateFieldsTab` were lazy-imported into the admin dashboard with no tab
trigger, no content and no route. The components work. Either they were pulled
deliberately and should be deleted, or they were never finished being wired up —
I could not tell from the repository, and guessing wrong either adds an
unfinished surface to the admin console or deletes work you wanted.

**A finished waitlist feature that nothing uses.** `src/hooks/useWaitlist.ts`
is 88 lines exporting four hooks — `useWaitlist`, `useMyWaitlistEntries`,
`useJoinWaitlist`, `useLeaveWaitlist` — against a `booking_waitlist` table.
Nothing in the app imports any of them, so there is no way for a player to join
a waitlist and no way for an owner to see one. The same shape as the two admin
tabs above: working code with no way in. "Tell me when this slot frees up" is a
normal thing to want on a venue whose evenings are full, so this may be a
feature to finish rather than delete — but that is a product call, and the
table it writes to needs its RLS checked before anything writes to it.

**The "When" column in the home page search bar.** The hero bar has three
fields. Two of them now work: Sport was emitting a lower-cased value at a
case-sensitive filter and finding nothing, and Location was being written to a
URL parameter Discover has never read — both fixed, with `search-handoff`
guarding them. The third, When, offers Today / Tomorrow / This week / This
weekend, holds the choice in state and never writes it anywhere. Discover has
no date filter to receive it either, so making it work is not wiring, it is a
feature: availability filtering across the whole catalogue, which means asking
`get_available_slots` about every venue for a date range. The alternative is
removing the column. That is a change to the composition of the hero bar, and
per `CLAUDE.md` the layout belongs to Fabel — so I have left the field in
place, working exactly as much as it did before, and `search-handoff` names it
as INERT on every run rather than letting it pass quietly.

**Editing a game.** `GameDetailsPage` offered the host a full-width "Edit Game"
button pointing at `/game/:id/edit`, and that route has never existed — React
Router matched its catch-all and served the 404 page. I removed the button
rather than building the page, which is the one place in this batch I chose
subtraction, so here is the reasoning. A team has no time-sensitive
commitments, `useUpdateTeam` already existed unused, and `EditTeamPage` was
straightforwardly the missing half of something already built. A game is not
that: people join it on its stated time, price and player count, and changing
those under them needs a rule about who gets told and what happens to anyone
who no longer agrees — plus a `useUpdateGame` that does not exist. Cancel is
the host's honest recourse until that rule is decided. `dead-routes.mjs` will
fail the build if the button comes back before the page does.

**What "Confirmed bookings" counts.** The player dashboard tile has always
counted `booking_intents` — the WhatsApp handoff, retired when in-app payment
landed — and linked to `/profile`, which has no bookings on it. The link now
goes to the new `/my-bookings` page, but the *count* is still of legacy leads,
so the number beside the label and the list behind it are measuring different
things. Pointing it at `bookings` is a one-line change I did not make blind:
which statuses count as "confirmed" for a headline number (does an unpaid hold?
a completed game from last year?) is a question about what you want the tile to
say.

**The display-currency picker does not change any price.** The profile page
offers fifteen currencies under the words "Choose your preferred currency for
displaying prices", saves the choice to `profiles.preferred_currency`, and
every price on the site goes on rendering in dram. Nothing reads the preference
for display — `src/lib/pricing.ts` formats from the *region*, deliberately, and
that file carries a long comment about the 400x overstatement that happened the
last time a viewer's location picked the currency symbol.

I removed the dead `formatPrice` that sat in `useCurrency`, because it was that
same bug loaded and waiting: `Intl.NumberFormat(locale, { style: "currency" })`
relabels without converting, and there is no FX layer here to convert with. I
did not remove the picker. Doing this properly needs a rate source, a rule for
what happens when rates are stale, and a decision that the *charge* is still
shown in the currency it will settle in — Ameria and Idram settle in dram
whatever the viewer prefers. Until then the control makes a promise the app
does not keep. Removing it is a layout change and belongs to Fabel; making it
work is the product call.

What I did fix is that the two pickers disagreed. Owner settings had its own
hardcoded list of five while the profile page offered fifteen, and both write
the same column, so an owner who chose Georgian Lari found the field blank —
measured: `/profile` read "₾ Georgian Lari (GEL)", `/owner/settings` read "".
Both now derive from one list.

---

## 6. The leaderboard needs a decision from you

`useLeaderboard` reads `profiles` directly, ordered by `xp`. That table has
been own-row-only since the Phase 1 policy change, so the query returns at
most one row — yours. The leaderboard is a table of one, and has been since
that migration.

The other four social lookups that had the same problem are fixed: game hosts
on the games list, the host and participants on game details, and review
authors on every venue page all read `profiles_public` now, which is the view
created for exactly this. That view deliberately does **not** expose `xp` or
`level`, so the leaderboard cannot be fixed the same way.

**The decision is whether a player's XP and level are public** — but the
database has arguably already made it. `user_achievements` carries a policy
named, verbatim, "Anyone can view achievements for leaderboard", with
`USING (true)`. Every user's achievement rows are already readable by everyone,
explicitly for this feature. XP and level are the same category of data, so
adding them to `profiles_public` looks like completing a decision rather than
making a new one.

If you agree, the fix is a one-line migration adding `xp, level` to
`profiles_public`. If you do not, the leaderboard should be removed rather than
left rendering a single row.

I did not make that call, because widening a security view is not something
that should arrive inside a UI commit.

---

## 7. Check-in records nothing anyone can see

`/nearby` shows "N playing now" from `active_checkins` on `public_fields` and
`verified_fields`. Checking in inserts a row into `field_checkins` — and
nothing ever updates that counter.

Verified against the live database rather than by reading code: no trigger on
`field_checkins`, no function in `pg_proc` whose body mentions either
`field_checkins` or `active_checkins`, no edge function referencing it, and the
client only inserts. (I check exhaustively now because I once concluded
"nothing maintains this" from a grep and was wrong — see §4.)

The success toast used to say "Checked in! Others can see this field is
active." It now just says "Checked in.", because the first half was true and
the second was not.

**The fix I would suggest**, which also closes a privacy gap: drop the
denormalised counter and compute it at read time.

```sql
CREATE OR REPLACE FUNCTION public.active_checkin_counts(p_field_ids uuid[])
RETURNS TABLE (field_id uuid, active_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT field_id, count(*)
  FROM public.field_checkins
  WHERE field_id = ANY(p_field_ids)
    AND checked_out_at IS NULL
    AND checked_in_at > now() - interval '3 hours'
  GROUP BY field_id;
$$;

-- and then the raw rows no longer need to be readable by everyone:
DROP POLICY IF EXISTS "Authenticated users can view checkins" ON public.field_checkins;
CREATE POLICY "Users can view their own checkins"
  ON public.field_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
```

The second half matters on its own. `field_checkins` holds `user_id`,
`field_id`, `checked_in_at` and `checked_out_at`, and its current SELECT policy
is `USING (true)` for any authenticated user — so anyone with an account can
query the REST API directly and reconstruct where a given person plays and
when. Phase 1 narrowed this from anonymous to authenticated deliberately
("stop broadcasting who is where to anonymous visitors"); the aggregate RPC is
what lets it be narrowed the rest of the way without losing the feature.

I have not applied either half. It is a schema change on your live project that
alters what `/nearby` reads, and it wants your sign-off rather than arriving
inside a UI commit.

---

## 8. Small, optional

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
