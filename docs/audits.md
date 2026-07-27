# The audits

Twenty-three scripts in `scripts/` measure this app: sixteen drive a real
browser, across five parallel CI suites, and seven are static and run with the
lint job. They can all be run by hand.

Every one of them exists because something was wrong and nothing noticed. The
header of each script says what that was, with the number it measured. Read
the header before changing a script — several encode a specific trap, and
"simplifying" them has reintroduced the bug more than once.

## Running one

They need the dev server, and nothing else — no secrets, no database. The
harness stubs the Supabase session and intercepts every REST call.

```bash
npx vite --host 127.0.0.1 --port 4173 &
node scripts/rendered-contrast.mjs player / /venues /venue/:venue
```

Placeholders like `:venue`, `:game`, `:team`, `:booking`, `:payment` and
`:slug` resolve to the stub ids. `SMOKE_WIDTH` / `SMOKE_HEIGHT` change the
viewport; the mobile passes in CI use `375x812`.

The route lists live in `scripts/lib/routes.sh`. Source it and they are
yours too:

```bash
source scripts/lib/routes.sh
node scripts/heading-outline.mjs owner $OWNER
```

When a check legitimately cannot look at a page, say so by subtracting, not by
writing a second list:

```bash
PLAYER_OUTLINE="$(without "$PLAYER" /auth/callback /pay/mock/:payment)"
```

That is not a style preference. `heading-outline` used to take a hand-copied
`$PLAYER` with the exclusions edited out, inline in `scripts/ci/semantics.sh`,
and by the time anyone looked it had drifted: three routes added to `$PLAYER`
never reached the check, and the copy's own comment said "minus three routes"
while excluding two. `route-coverage.mjs` could not catch it either, because it
reads `routes.sh` and the second list lived somewhere else — a check with a
blind spot exactly the shape of the thing it exists to prevent.

The other inline lists in the suite scripts are not copies of anything.
`focus-visible` samples ten routes because it costs ~19s each and the shells
repeat; `loading-status` takes the routes that have a loading state;
`glass-contrast` takes what `glass-risk` ranks. Those are purpose-built and
say so. The test is whether a list *claims* to be another list minus
something — if it does, subtract it.

## Running a whole suite

CI runs the audits as five parallel suites, each a script you can run the same
way it does:

```bash
bash scripts/ci/semantics.sh
```

`routes`, `semantics`, `contrast`, `surface`, `states`. They were one step
until it reached twenty minutes and kept growing — a check nobody waits for is
a check nobody keeps. Split by what each measures, so a red square names its
own area, and with `fail-fast: false` so one failure does not hide the rest.

## Who the page thinks you are

The first argument is a user type. It selects a role, and optionally a shape
for the data:

| argument | what renders |
| --- | --- |
| `player` / `owner` / `admin` | signed in, with populated fixtures |
| `anon` | signed out |
| `…-empty` | signed in, no content rows |
| `…-error` | signed in, every content query returns 500 |
| `…-slow` | signed in, every content response held open |

A typo throws rather than falling through — see `parseUserType`. That matters
more than it sounds: a role the app does not recognise renders something
subtly wrong, and an audit will report a clean run against it.

## What the fixtures do not serve

The harness answers every Supabase REST call from a table of fixtures in
`scripts/lib/stub-page.mjs`. A table with no fixture gets the generic `[]`, so
its section of UI renders empty — and the controls inside a row do not exist
for `a11y-names`, `tap-targets` or `rendered-contrast` to find. A check reports
nothing, which reads exactly like nothing being wrong.

That is not theoretical. `outreach_targets` had no fixture, so the operator
console's table rendered with no rows, and it was hiding three delete buttons
with no accessible name and a native `confirm()` where the rest of the app uses
`AlertDialog`. Adding one row surfaced all of it immediately. `blocked_dates`
then did the same for six more unnamed controls on `/owner/hours` and
`/venue/:id/availability`.

Counting `.from("…")` against the fixture table: **44 tables queried, 28 now
served, 16 still empty in every check.** (An earlier count said 45 and 22; it
wrongly included `avatars`, which is a storage bucket rather than a table.)

The sixteen are not one kind of thing, and the distinction matters more than
the number:

- **Tables behind UI that is unreachable anyway.** `candidate_fields`,
  `field_submissions` and `public_fields` feed `CandidateFieldsTab` and
  `FieldSubmissionsTab`, which have no tab trigger, no content and no route —
  see `AdminDashboard.tsx` and §5 of `docs/handover.md`. `booking_waitlist`
  feeds `useWaitlist`, which nothing imports at all. A fixture would not make
  these visible to an audit, because nothing renders them.
- **Tables read for a number or a flag**, where there is no row-level UI to
  miss: `owner_balances`, `field_checkins`, `referral_codes`,
  `referral_credits`, `verified_fields`, `platform_policies`.
- **Tables that probably should be populated** and simply have not been:
  `venue_promotions`, `outreach_messages`, `blocked_users`, `review_prompts`,
  `achievements`, `booking_intents`. Each is a candidate for the same treatment
  that found nine unnamed controls in an afternoon.

RPCs have the same problem and it is easier to miss, because there is no table
to count. `get_available_slots` — the function the entire booking flow turns on
— was answered by the generic `[]` catch-all, so every audit that loaded a venue
page or the embeddable widget saw a booking panel with **no slots in it**.
`a11y-names`, `tap-targets`, `focus-visible` and `rendered-contrast` had never
once seen the control a customer clicks to book. Giving it a fixture made the
widget and the venue page disagree by four hours within a minute, which is how
the timezone bug in the booking chain was found.

Adding a fixture is cheap and the payoff is disproportionate. It is the first
thing to try when an audit is suspiciously quiet about a screen.

**Each of those four shapes was added because it found something the default
could not see.** Signed out: two unnamed controls and two AA contrast failures
on /login and /signup, which redirect to /dashboard under a stubbed session
and so had never been loaded by any check here. Empty: /owner/equipment
rendering no `h1` at all before a first venue exists. Error: five pages telling
the user they had no venues, no transactions, no bookings, when the request had
simply failed. Slow: forty-six loading spinners with nothing to announce them.

## What each one checks

### Static — no browser

| script | checks |
| --- | --- |
| `palette-contrast` | raw Tailwind palette colours in class strings, against every surface in the theme |
| `no-emoji-icons` | emoji used where a Lucide icon belongs |
| `prod-bundle-check` | the production shape of DEV-gated code, which every other check sees only in its development form |
| `param-handoff` | a URL parameter one part of the app writes and no part of it reads |
| `dead-routes` | an internal link pointing at a route `src/App.tsx` does not declare |
| `route-coverage` | a route that appears in no audit list, so nothing here has ever loaded it |
| `crawlable` | what a crawler receives — the bytes in `dist/`, with no JavaScript executed |

### Structure and semantics

| script | checks |
| --- | --- |
| `smoke-routes` | every route loads: no thrown error, no tripped boundary, no blank render, no horizontal overflow |
| `a11y-names` | every control has an accessible name, asked of Chrome rather than reimplemented |
| `heading-outline` | one `h1` per page, no skipped levels |
| `page-titles` | WCAG 2.4.2 — every route has a title of its own, and no two pages share one |
| `input-purpose` | WCAG 1.3.5 — email, tel and password fields say what they collect |

### Colour

| script | checks |
| --- | --- |
| `contrast-audit` | every design token against every surface, both themes |
| `rendered-contrast` | WCAG 1.4.3 and 1.4.11 — the text and icons actually on screen, against the backdrop they actually land on |
| `glass-contrast` | text on the translucent header, against what is scrolling under it |
| `glass-risk` | which routes are worth the expensive glass check, ranked by how much the backdrop under the bar varies |

### Interaction

| script | checks |
| --- | --- |
| `tap-targets` | WCAG 2.5.8 at phone width, including the spacing exception |
| `focus-visible` | WCAG 2.4.7 and 2.4.11 — a focus indicator that is both drawn and not covered |
| `layout-shift` | content that moves after it lands |

### Honesty

| script | checks |
| --- | --- |
| `error-affordance` | that a failed request is not reported to the user as "you have nothing" |
| `loading-status` | WCAG 4.1.3 — that a spinner or skeleton is announced, not just drawn |
| `numeral-glyphs` | that nothing in a monospaced numeral run reaches outside the font's repertoire |
| `search-handoff` | that the home page's search bar actually searches — the values it emits, and the results the next page shows |

## The one that reads bytes, not pages

Every other check here drives a browser, so all of them measure the app as a
*user* meets it. `crawlable` measures it as GPTBot meets it: the files in
`dist/`, with no JavaScript run at all.

That distinction was worth about the whole site. Measured against production
before it existed, four different public URLs — `/`, `/venues`, `/faq`,
`/for-owners` — returned **byte-identical documents**: 3885 bytes, the same
SHA-256, the home page's title on every one, no canonical link, and **zero
characters of body text**. Googlebot renders JavaScript on a second pass and
eventually saw the real pages. GPTBot, OAI-SearchBot, ClaudeBot,
PerplexityBot, Amazonbot and every social scraper do not, and for all of them
this marketplace was one blank page repeated at fifteen URLs — no venue, no
city, no price, nothing to quote and nothing to tell two pages apart.

`scripts/prerender.mjs` fixes it at build time by writing a real
`dist/<route>/index.html` for each public page. Vercel checks the filesystem
before applying the SPA rewrite in `vercel.json`, so those files are served
directly. The prose goes *inside* `#root` on purpose: `main.tsx` uses
`createRoot().render()` rather than `hydrateRoot()`, so React replaces the
container outright and a human never sees it, while a crawler that never mounts
React keeps it. Measured after: 15 pages, 314–1090 characters each, every one a
different SHA.

It is not server rendering, and the header says so. Venue and game pages are
per-record and still serve the shell; making those crawlable needs SSR or an
edge renderer, which is an architecture decision rather than a build step.

## The four that span two places

Everything else in this directory reads one page and asks whether it is
correct. `param-handoff`, `dead-routes`, `route-coverage` and `search-handoff`
ask whether two parts of the app agree, because that is where eight live bugs
were hiding — in the space between files that were each fine on their own. The
last of them asks it about this directory rather than about `src`.

### `param-handoff`, and why it is worth its four hundred milliseconds

It collects every URL parameter the app writes into its own links, collects
every one it reads, and reports the difference. Run against the app as it was,
it named three:

| parameter | written by | what the user lost |
| --- | --- | --- |
| `?location=` | the home page search bar | typing a city returned the whole unfiltered catalogue, as the answer to a search |
| `?redirect=` | `BookingPanel`, `JoinTeamPage` | the venue they were about to book; the team invite code, which has no other route |
| `?venue=` | `OwnerVenuesPage` row menu | owner settings opened the *first* venue's form, and saved edits into it |

None threw. None logged. Every browser audit here passed all three routes,
because every page rendered exactly as designed.

It has a third outcome besides pass and fail. `?ref=` is written by the
referral card's "Share link" and read by nothing — but the referral programme
has no backend at all: `referral_credits` has two SELECT policies and no INSERT
policy, no function writes it, and nothing at checkout can spend a credit.
Reading the parameter would record nothing. Failing the build there would
demand that someone invent a product decision to get CI green; passing silently
would let a dead feature look healthy. So it prints as **UNFINISHED** every run,
with what is missing and a pointer to `docs/handover.md` §5. Entries in that
list have to say both — an entry without them is just an exemption, and
exemption lists are how checks rot.

What it cannot claim, and says so in its own header: a parameter read
*somewhere* counts as read, so it cannot tell that page A writes one only page
B reads. That needs the router graph and is a rarer bug than writing one nobody
reads at all. Computed keys are invisible to it and are listed rather than
skipped. It also blanks comments before scanning — the doc comment explaining
this very bug quotes `/login?redirect=/venue/:id`, and a check that reports its
own documentation is one people learn to ignore.

Adding the `?redirect=` reader meant adding `safeRedirect` in the same change.
A post-login destination that arrives in a URL is attacker controlled, and
`/login?redirect=https://not-sportsbnb.example/login` is our form, our domain
and someone else's landing page the moment the password is accepted. Reading
the parameter without validating it would have traded a lost booking for a
phishing primitive.

### `dead-routes`

The same question about the other half of a URL. Every `path=` in
`src/App.tsx` becomes a pattern; every internal link target in `src/` is tested
against them. Three were dead:

| target | linked from | what happened |
| --- | --- | --- |
| `/game/:id/edit` | the host's "Edit Game" button | 404 |
| `/team/:id/edit` | the captain's "Edit Team" menu item | 404 |
| `/my-activity` | "View my bookings" on the checkout error panel | 404 |

React Router's `path="*"` catch-all is why none of them threw, and why the
browser suites loaded all three screens and passed. `path="*"` is excluded from
the patterns on purpose: matching against it would make every link valid and
the check would pass forever without measuring anything.

The third one was the interesting one. `my-activity` is a tab id inside
`CommunityPage`, navigated to as though it were a route — but fixing the link
meant finding out where a player's bookings actually live, and the answer was
nowhere. `/booking/:id/status` shows one booking to whoever already has its id;
the dashboard tile reading "Confirmed bookings" counts `booking_intents`, the
WhatsApp handoff retired when in-app payment landed, and linked to `/profile`,
which has no bookings on it. A player could pay for a court and have nowhere in
the app that listed it. `MyBookingsPage` is that page. The broken link was the
symptom; the missing page was the defect.

### `route-coverage`, the check on the checks

Every browser check here takes a list of routes, those lists are maintained by
hand in `scripts/lib/routes.sh`, and a route added to `src/App.tsx` and not to
them is not partly covered or covered later. It is covered by nothing, for as
long as nobody notices, while five parallel suites report green beside it.

That is this document's own recurring lesson one level up — a check reports
nothing because it never saw the thing, not because the thing was fine — and
it is worse than the fixture version, because a missing fixture at least leaves
the page loading in CI.

Sixty-four of sixty-five routes were listed, which is better than expected. The
sixty-fifth was `/game/:id/join-success`, the screen a player lands on after
paying to join a game. Loading it found the reason it mattered: it mounted the
same component as `/game/:id/join-status`, so the app had one screen under two
URLs sharing one title — a WCAG 2.4.2 duplicate. Nothing in the app links to
it and the Ameria callback builds `/join-status`, so it is now a redirect
rather than a second mount: anything configured to it outside this repository
keeps working, and the payment's `?paymentId=` is carried across, which is the
part that would have been easy to drop and expensive to lose.

Comment lines in the shell file are excluded from the match. An example route
in a comment standing in for real coverage is precisely the way this check
would quietly stop meaning anything.

### `search-handoff`

The browser half of the same idea, for the one path where the parameters were
right and the values in them were not.

`HeroSearch` built its Sport options as `value={s.toLowerCase()}` and put that
in the URL. `DiscoverPage` filtered with `venue.sports.includes(sport)` — an
exact, case-sensitive match against the capitalised strings venues are tagged
with. The primary call to action on the landing page therefore reported **0
venues found for a catalogue where 3 matched**, while the category tiles a few
hundred pixels below it, which passed the same strings through untouched,
found all three. The same bar wrote its Location field to `?location=`, a
parameter Discover has never read, so typing a city and pressing Search
returned the whole unfiltered catalogue as the answer to a search.

`a11y-names` saw a labelled control. `smoke-routes` saw a page that loaded.
`rendered-contrast` saw legible text. Nothing was asking whether the button did
what it said.

It has to click things, and that is worth knowing before anyone tries to make
it cheaper. **Radix puts a `SelectItem`'s value nowhere in the DOM** — the
rendered option carries `role`, `aria-labelledby`, `data-state`,
`data-radix-collection-item` and its label, and nothing else. The value is in
React state and is observable only through what the app does after you pick it.
So the obvious version of this check, comparing the two pickers' option values,
cannot be written at all. That is precisely why this class of bug is invisible
to every other check in this directory.

Run against the pre-fix app it reports three failures, and one instructive
pass: the Sport narrowing case still passed while broken, because a filter that
matches nothing ever and a filter that correctly excludes look identical from a
count of zero. The agreement loop is what caught that one.

Two more things fell out of fixing it, both found by the check rather than by
reading the code:

- A controlled Radix `Select` whose value matches no item renders **neither the
  value nor its placeholder**. So `?sport=football` emptied the results *and*
  blanked the picker: the filter doing the damage was invisible to the person
  it was filtering for. `canonicalSport` returns `""` for anything it does not
  recognise specifically to make that state unreachable.
- Discover's own text search read `venue.address || venue.city` — a fallback
  where the intent was a union. Every venue with a street address was
  unsearchable by the city it is in. It stayed hidden while the only route to
  that filter was Discover's own search box, sitting beside a City dropdown
  that works; wiring the hero bar's Location field to it made a search for your
  own city the first thing a new user would try.

## Adding one

Two rules, both learned the hard way.

**Prove it can fail before believing that it passes.** Every script here that
skipped this shipped with a measurement bug. Most take a `*_SELFTEST=1`
environment variable that injects probes whose answers are fixed by
construction; the rest were proved by breaking the app on purpose and watching
the check catch it.

**Compute the expected number, do not remember it.** Comments in this
directory have asserted 4.83, 3.95, 5.71, 4.68 and 2.44 where the correct
answers were 6.92, 4.62, 17.49, 4.34 and 2.48. The check was right every time.

And a third, less about correctness than about being read: when a script
cannot measure something soundly, it should say so in its own column rather
than fold it into a pass or a fail. `rendered-contrast` reports what it
refuses to score and why; `loading-status` separates indicators that are
deliberately `aria-hidden` from ones nobody thought about; `input-purpose`
lists fields whose purpose is a judgement call instead of guessing. A pass
means something only if the things it could not see are visible too.
