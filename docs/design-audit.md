# Design audit — SportsBnB

Findings from running the app and screenshotting it, rather than reading the
markup. Every item below was observed in a rendered page; none of them were
visible from the source alone.

Method: `npx vite --host 127.0.0.1 --port 4173`, then Chromium via
`@playwright/test` at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`,
screenshotting at 1440 / 768 / 375 and reading the images. Worth re-running
before and after any visual change — three of the fixes below were regressions
or defects introduced by earlier "improvements" that looked correct in code.

## Baseline

The app is in better shape than a glance suggests. The `court at night` token
system is real: Space Grotesk display, DM Sans body, JetBrains Mono for prices
and times, a layered surface scale, a considered shadow ladder. The hero has
genuine typographic hierarchy, an italic accent line, real photography with
floating glass status cards, and a working trust bar.

What made it *read* as unfinished was precision, not direction — a wordmark that
disappeared, a punchline the colour of disabled text, strings clipped by stray
`truncate`, and a tonal ladder too flat to separate anything.

## Fixed

| Finding | Detail |
|---|---|
| Wordmark invisible on dark | `logo-full.png` renders "Sports" in brand navy. On the dark nav and footer, half the logo was simply absent. Rebuilt as symbol + live type so "Sports" inherits `currentColor`. |
| Hero punchline read as disabled | "No phone calls." used `text-foreground-soft` — a *secondary* token — at 5.75rem. Lifted to `foreground/70`. |
| Hero cards clipped | A `truncate` cut "Live availability, no calls" to "…no ". The booking card wrapped to two lines at 280px. |
| Dark tonal ladder too flat | `--background` at L=5%, `--surface-1` at L=7%. Two points of lightness is imperceptible, so eight alternating ~1000px sections rendered identically and the page scrolled as one black corridor. Widened surface-1/2/3, card, popover, border. **Highest-leverage change found — it re-separates every section, card and border app-wide.** |
| Section rhythm | Eight sections at `py-24 md:py-36` (144px per side). Tightened to `py-16 md:py-24`. |
| Ten icon-only buttons unnamed | WCAG 4.1.2. `ChatButton`, `ChatInput`, `ChatBubble` ×2, `ReviewList`, `BlogPostsTab` ×2, `AIChatbot` ×3 announced as bare "button". |
| Footer grid imbalance | Brand held `col-span-5` (~566px) but capped content at `max-w-sm` (384px), stranding ~180px. Shifted to 4/8. |
| Dram sign had no webfont coverage | Neither Space Grotesk, DM Sans nor JetBrains Mono carries U+058F, so all ~20 price surfaces (every one via `formatPrice`) fell through to whatever the OS supplied. Added `Noto Sans Armenian` to all three stacks, subsetted by Google Fonts to that single codepoint — `unicode-range: U+58f`, so it is fetched only when a price renders and can never shadow Latin. Verified the request returns the one-glyph subset and that the import and all three stacks survive the production build; **not** verified visually, see the fonts caveat under Open. |
| Headings pinned to one colour | `index.css` set `color: hsl(var(--foreground))` on `h1–h6` in the base layer. Any heading on a re-coloured surface ignored it — the light "for venue owners" panel rendered a near-white heading on near-white, so it read as a blank gap between the eyebrow and the body copy. Removed the declaration; headings inherit, which is both the browser default and correct. Verified no regression on Home, Discover, For Owners, About and Login. **Second-highest-leverage change: it is what makes tonal inversion usable at all.** |

## Landing page — rebuilt

`HomePage.tsx` was deleted and rewritten (970 → ~590 lines, page height 7115 → 4427px at
1440). Six sections: Hero → How it works → Sports → The Difference → Owners
(the one tonal inversion) → Close, over a shared `Section` shell with three
tones. Defects found by screenshotting the rebuild and fixed in place:

| Finding | Detail |
|---|---|
| Headline broke to four lines | `clamp(2.75rem,7vw,5rem)` resolved to 80px, needing ~700px in a ~600px column. Reduced to `clamp(2.5rem,5.2vw,4.25rem)` and tightened the accent line to "Skip the call." so both lines set cleanly. |
| Badge advertised an empty catalogue | The hero read "0 venues live" against an unseeded database. Now gated on a non-zero count. |
| Sports captions over bright images | The scrim was linear enough to veil every photo yet still left "Basketball" low-contrast on a light wood floor. Reweighted to the bottom third (`from-black/95 via-black/50 via-45%`) — captions read on all four, images stay bright. |
| "See all venues" floated mid-block | Bottom-aligned against a two-line heading, it sat in the middle of the header with no edge to relate to. Moved onto the eyebrow row. |
| Static mock looked clickable | "Slot held until 20:00" was a solid primary bar inside an illustration, visually identical to the real CTAs. Restyled as a status strip. |
| Mobile CTA indent | The ghost "List your venue" button's own padding pushed its label ~30px right of the primary button stacked above it. Padding drops on mobile so both share a left rail. |

## Discover — states, and a pricing bug

Rendering this page with a stubbed REST response — the first time venue cards
have been visible in this environment — surfaced the worst defect found so far,
which is not a design defect at all.

| Finding | Detail |
|---|---|
| **Dram prices rendered as dollars** | `formatPrice` chose currency from the *viewer's* region and defaulted to USD, using dram only on an exact `"AM"` match. `useRegion` assigns `"OTHER"` to every timezone it cannot map, so a ֏13,000 Yerevan pitch read as **"$13,000"** to any visitor outside Armenia — a ~400× overstatement of the number the entire booking decision turns on. Currency belongs to the listing, not the viewer; there is no FX layer, and Ameria vPOS / Idram settle in AMD. Inverted to dram-unless-US. |
| Count asserted before it was known | The header read "0 venues available" while the query was in flight. |
| Spinner instead of skeletons | No space reserved, so results shoved the page down on arrival. Skeleton grid now mirrors `VenueCard`'s own `aspect-[5/4]` — matching geometry is the point; a mismatched skeleton just relocates the shift. |
| No error branch | A failed query left the skeletons pulsing indefinitely — content promised and never delivered, with no retry. This got *worse* with skeletons than it was with a spinner, so the error state became mandatory. |
| Empty state gave unfollowable advice | "Try adjusting your filters" was shown to everyone, including visitors with no filters set. Now branches on whether filters are active **and** whether the catalogue has anything in it — with zero venues, "widening the search should bring some back" is simply false, so catalogue-empty is checked first. |
| Broken venue image showed alt text | Remote images (owner uploads, Unsplash fallbacks) painted the venue name as raw prose over the card on 404. Falls back to a neutral placeholder. |

Method note: every branch was driven by stubbing `**/rest/v1/venues*` with
Playwright `page.route` — populated, no-match against a real catalogue, empty
catalogue, empty catalogue *with* filters set, and a 500. Four of the six
findings above are invisible in the happy path, and the seed-data blocker
below means the happy path is the one state this environment cannot reach.
Stubbing is how the rest of the app should be evaluated until seeding lands.

## Venue details + gallery

Same method — stub the endpoint, drive each state.

| Finding | Detail |
|---|---|
| A failed request claimed the venue didn't exist | `useVenueById` rethrows on error and returns `null` only for a genuine 404, but both landed in `if (!venue)`. A dropped connection told people "Venue not found" — false, unrecoverable (no retry), and the only offered action was to leave the page. Split into distinct error and not-found states. |
| Gallery padded empty slots with grey boxes | With one image — the common case — the thumbnail grid rendered four `bg-muted` tiles: ~500px of nothing dressed up as a gallery. The main image now takes the full width when there is nothing to sit beside it, capped at `max-h-[24rem]` so it doesn't push the price and booking panel below the fold. |
| Gallery unreachable by keyboard | Tiles were `div`s with `onClick` — no tab stop, no focus ring, announced as nothing. Now real `<button>`s with labels. |
| Lightbox backdrop was near-white | `bg-foreground/95` resolves to near-white in this dark-first theme, so opening a photo flashed the screen. Fixed to `bg-black/95`, with chrome colours pinned light-on-dark since what sits behind them is always the dimmed photo. |
| Broken images again | Same defect as `VenueCard`, unfixed here. Extracted a shared `GalleryImage` with per-tile `onError`. |
| Spinner instead of a skeleton | Replaced with a skeleton in the page's own shape. |

Checked and found **correct**: the Reserve button is already disabled when no
slot is selected, so "Closed on this day" does not sit above a live CTA.

## Checkout — the money path

Rendered by stubbing both a Supabase auth session (seeded into
`localStorage` as `sb-<ref>-auth-token` via `addInitScript`) and the bookings
endpoint. The worst finding of the whole audit is here.

| Finding | Detail |
|---|---|
| **A network error told users their reservation had expired** | The booking query had no `isError` branch, so a failed fetch left `booking` undefined and fell straight through to `if (!booking \|\| status !== "pending_payment" \|\| remaining <= 0)` — rendering "**This reservation has expired. Holds last 20 minutes. Please pick your slot again.**" while the hold was still live in the database. Following that advice means colliding with your own hold via the exclusion constraint, or opening a second one and paying twice. Now a distinct error state that says the request failed, states the hold is intact, and explicitly says **not** to book again until it loads. |
| Four states rendered as two | Expired, already-paid, not-found and errored all shared one branch whose heading only distinguished `confirmed` from everything else. Split, each with its own icon, copy and action. |
| Countdown was off-token and never escalated | Hardcoded `text-amber-600` — outside the token system and muddy on a near-black surface — and identical at 19:00 and 0:20. Now `text-warning`, escalating to `text-destructive` under two minutes, in tabular mono. |
| Payment choice was invisible to screen readers | Three plain `<button>`s conveying selection only through a border colour: all three announced identically with no selected state, on the control that decides how someone pays. Now a real `role="radiogroup"` with `aria-checked`, plus focus rings. |
| Deadline was purely visual | The countdown carries `role="timer"` and `aria-live="polite"`. |

## The systemic bug: failed requests rendered as facts

The same shape turned up on six pages, so it is worth naming rather than
listing. Consumers destructured `isLoading` from a query and never `isError`.
A failed request therefore fell through to whichever branch handled *absence*,
and the page stated something confident and false:

| Page | What a dropped connection said | What was true |
|---|---|---|
| Discover | "0 venues available" | Unknown — the query had not returned |
| Venue details | "Venue not found" | The venue was fine |
| **Checkout** | **"This reservation has expired. Please pick your slot again."** | **The hold was still live; rebooking collides with it or double-pays** |
| Game details | "Game not found" | The game was fine |
| Blog post | "Article not found" — and `noIndex`, on a transient 500 | The post was fine |
| Team details | "Team not found", with no way out at all | The team was fine |

Absence and failure are different facts. Absence is something the server told
us; failure means the server told us nothing. Rendering them the same way is
what turned a network blip into instructions that could cost a user money.

Fixed by extracting `src/components/common/StatusPanel.tsx` — `StatusPanel`
for "nothing here, go somewhere useful" and `ErrorPanel` for "we did not hear
back, retry" — and routing all six pages through it. One implementation, six
call sites, and the distinction is now structural rather than something each
page has to remember. The rule for call sites is in the file's doc comment: if
the query errored, never assert anything about the record.

Still open: this was found by inspection of six pages, not exhaustively. ~30
other `useQuery` consumers destructure `isLoading` without `isError`; most
render lists where failure degrades to an empty list rather than a false
claim, which is survivable, but the sweep is not finished.

### The sweep, and a worse variant underneath it

Continuing across the remaining `useQuery` consumers turned up a second layer.
Three hooks did not merely fail to *handle* errors — they **discarded** them:

```ts
const { data } = await supabase.from("teams")...   // error never bound
return { owned: (owned || []), member: memberTeams };
```

With the error dropped, the query *succeeds* with an empty result. `isError`
can never fire, so the view is structurally incapable of telling "you have no
teams" from "we could not load your teams" — adding an error branch to the
page does nothing until the hook is fixed. Found in `useUserTeams` (3 calls),
`useUserGames` (3 calls) and `BookingPanel`'s policy lookup. All now rethrow.

The `BookingPanel` one is the most serious remaining find after the checkout
bug. On a failed lookup, `policy` was null and the panel fell through to
`?? 24` / `?? "full"`, printing **"Free cancellation until 24h before start"**
directly above the pay button — for a venue that may be non-refundable. A
refund promise the platform invented, on the screen where money is committed.
A null row genuinely does mean "no custom policy, platform default applies", so
that fallback is kept; a *failed* lookup now says the terms could not be loaded
and warns before paying.

Pages given error branches this pass: My Venues, Messages, Games, Teams (both
tabs), Owner Overview, Owner Bookings. The owner-facing ones matter most —
"No bookings yet" read from a failed request is how an owner concludes their
day is clear and does not turn up.

**Verification status, honestly:** My Venues, Messages, Games and Teams were
confirmed by rendering with every REST call returning 500 and asserting no
false claim plus a working retry. The two owner pages are typecheck-clean and
structurally identical to the verified four, but **not** render-verified —
their routes sit behind `RequireRole`, and a stub profile without
`onboarding_completed` redirects to onboarding instead. Worth re-checking once
seed data and a real owner account exist.

## 404 and auth

| Finding | Detail |
|---|---|
| The 404 page was the generated default | No `Layout`, so anyone following a stale link — an expired venue URL, an old share, a typo — was stranded on a bare screen with a single "Return to Home" link and no nav to escape through. It used `bg-muted` rather than `bg-background`, so it did not match the app it belonged to, and a raw `<a href="/">` forced a full document reload inside an SPA. It also carried no `noIndex`, so dead URLs kept their ranking and kept sending people there. Rebuilt on `Layout` + `StatusPanel`. |
| Auth split-panel photo read as flat brown | A single top-to-bottom veil at `from-black/80 via-black/50 to-black/30` covered the whole frame, including the middle where the photograph is most legible. All the copy on that panel is left-aligned, so the weight now runs horizontally — the left third stays dark and carries the text, the right third keeps the image — with a mild bottom pass for the copyright line. Applies to Login and Signup. |

Checked and found **correct**: auth pages deliberately render without header or
footer. That is right for a focused sign-in flow and was not changed — the
missing chrome only mattered on the 404.

## For Owners

The owner-acquisition page, and the largest remaining page at 7744px. The
density was the reason for opening it; the copy was the reason it mattered.

| Finding | Detail |
|---|---|
| **The page promised Stripe payouts** | Three claims — a feature card ("Funds go directly to your Stripe account"), step 3 of the signup guide ("Link your Stripe account to receive payouts"), and a pricing bullet ("Payouts processed automatically via Stripe"). Stripe was removed from this codebase entirely, and it cannot serve Armenian entities in the first place. The page whose only job is signing venue owners up was telling them to do something impossible, and promising a payout route that does not exist. Replaced with the real rails: card or Idram in, weekly payout to an Armenian bank account or Idram wallet out. "Processed automatically" also went — payouts are manual bank transfers in v1, so that was a second overstatement inside the same bullet. |
| Sections at `py-20 md:py-40` | 320px of vertical padding per section across six sections. The old home page was tightened to `py-16 md:py-24` early in this audit; For Owners never got that pass and sat looser than the home page ever had. Retuned to match, plus header margins and card padding. 7744px → 6812px. |
| Hero headline split mid-phrase | At `lg:text-8xl` (96px) "Your venue. Our" filled line one and stranded "platform." on line two. Explicit break, and brought down to `lg:text-7xl` to match the scale the rebuilt home page settled on. |

**Still open, and a content decision rather than a layout one:** twelve feature
cards of equal visual weight, which is most of the remaining height. Nothing
can land when everything is presented identically. Cutting or ranking them is
the owner's call, not something to do unilaterally — but it is the next real
improvement available on this page.

## FAQ — promises the product does not keep

Opened because the Stripe finding suggested marketing copy had drifted from
the build. It had, and an FAQ is where drift does the most damage: it reads as
policy.

| Finding | Detail |
|---|---|
| **A platform-wide refund promise that contradicts the refund engine** | "Cancel up to 24 hours before the scheduled time for a full refund." Cancellation terms are per venue — `venue_policies.cancellation_hours` and `refund_type`, where `refund_type: "none"` returns a refund fraction of **0** for a player even 100 hours out (`refund-policy.test.ts` asserts exactly this). So the FAQ promised a full refund to someone booking a non-refundable venue. Same defect class as the `BookingPanel` fallback fixed earlier — a default stated as if universal — but in language that reads as policy. Rewritten to say terms are venue-set and shown before payment. |
| A feature that does not exist | "Can I modify my booking? Yes, through your dashboard." There is no reschedule flow anywhere in the codebase — grep for modify/reschedule returns nothing. Replaced with the honest answer and the actual workaround. |
| Payment methods omitted the local rail | "We accept all major credit cards and debit cards" — no mention of Idram, which is a primary rail for this market, and vague about the card set. Now names Visa / Mastercard / ArCa via Ameriabank, and Idram. |
| Fees vague where the rest of the app is specific | "A small service fee... you'll see the exact structure during setup", while For Owners says 5% plainly. Vagueness about fees is a trust cost with no upside; aligned to 5%. |
| Payout answer omitted Idram | Aligned with the For Owners correction — weekly, to an Armenian bank account or Idram wallet, itemised. |

Checked and found **correct**, so left alone: "if a game host cancels,
payments are refunded in full". `refundFraction(..., "owner")` returns 1 even
under a `none` policy, so host-initiated cancellation genuinely does refund
fully.

Method note: FAQ answers sit in a collapsed accordion, so `innerText` does not
contain them. A first verification pass reported "no stale claims" purely
because nothing was expanded — the check only became meaningful after clicking
every `[data-state="closed"]` trigger. Worth remembering for any page whose
content is behind disclosure.

## Auditing my own copy

Having found four pages making claims the build does not support, the obvious
next check was the copy written during this audit. One failed.

| Finding | Detail |
|---|---|
| **"Refunds applied automatically" — my own overstatement** | Written into the rebuilt home page's "why it's different" list. True for cards, where Ameria exposes `RefundPayment`; false for Idram, whose adapter returns `{ ok: false, manual: true }` because Idram has no refund API at all — those are processed by hand in the merchant cabinet. Replaced with the claim that survives both rails: terms are shown before you pay, not discovered afterwards. |
| Refund timing was card-only | `BookingStatusPage`'s cancel dialog said "Refunds to cards usually arrive within a few business days" — accurate, but the only guidance an Idram payer got. Now covers both rails and says plainly that Idram refunds are manual and slower. |

Checked and found **correct**, so left alone: `BookingStatusPage` already
branches its success toast on `result.manual`, so the manual-refund path was
being disclosed at the moment it mattered. The gap was only in the
pre-cancellation dialog.

The lesson generalises past this codebase: new copy is exactly as likely to
drift from the build as old copy, and being the author is not a reason to skip
the check. Every claim about money, timing or capability should be traced to
the code that implements it before it ships.

## Fabricated social proof (confirmed with the owner, then removed)

The most serious copy finding, and the one that was not mine to decide.

For Owners carried three named venue testimonials with attributed quotes —
"Arena Sports Complex: Revenue is up 35% in three months", "City Tennis Club",
"Olympic Swimming Center" — alongside stats reading "40% More bookings on
average" and "24/7 Customer support". The database has zero venues, so none of
it was verifiable from here; but the owner might have had offline pilots, so
deleting a business's social proof unilaterally would have been the wrong call.
Asked, and confirmed: placeholders.

| Finding | Detail |
|---|---|
| Three fabricated customer testimonials | Attributed quotes with a specific revenue figure, shown to prospective venue owners making a commercial decision. Section removed entirely rather than reworded — with no customers there is nothing truthful to put in its place, and inventing softer filler repeats the problem. Also removes ~848px from a page already flagged as too long. |
| Two unevidenced stats | "40% more bookings on average" (no bookings exist to average) and "24/7 customer support" (no support rota). Replaced with facts about the system rather than promises about outcomes: weekly payouts (the `payouts-run` cron) and AMD settlement. The 5% commission and zero monthly fees stayed — both traceable in code. |
| Stats band broke on word-length values | Built for short numerals at `lg:text-6xl`; "Weekly" at 60px ran straight into its neighbour. Sized to `lg:text-5xl`. |
| `֏` in a headline number | The dram sign has no coverage in JetBrains Mono or DM Sans, so it falls to whatever the OS supplies — not a glyph to hang a 60px figure on. The value slot says "AMD"; the label carries the word "dram". |

7744px → 6104px across both For Owners passes.

## Nav density

The open item from the first pass: four links in a 64px bar with a large void
between the wordmark and the auth actions.

| Finding | Detail |
|---|---|
| Links clustered left | They sat in the same flex group as the wordmark, so at 1440 they ended ~600px short of the auth actions. Moved to absolute centring — rather than a flex-1 spacer — so they hold the true centre line regardless of how wide the wordmark or action group are. That is the difference between reading as deliberate and reading as incidental. |
| **Centring introduced a collision at 768** | Measured, not eyeballed: logo→nav **-15px** and nav→actions **-3px** at the `md` breakpoint where the desktop bar first appears, staying tight to roughly 900px. The desktop nav moved to `lg` (1024); 768–1023 uses the existing menu. Clearance is 113/125px at 1024 and grows from there. |

Method note worth keeping: the first measurement after moving the breakpoint
reported "-231px, cramped" at 768 — which was nonsense, because it was
measuring a `display: none` element's degenerate rect. A layout assertion has
to check visibility before it means anything. The corrected script reports
which mode the bar is in and only measures gaps when the bar is actually
shown.

## No error boundary anywhere in the app

Found while opening the player dashboard: `document.body` rendered **empty** —
height 0, no nav, no message, nothing to click.

`grep` for `ErrorBoundary|componentDidCatch|getDerivedStateFromError` across
all of `src/` returned nothing. React's default for an uncaught render error is
to unmount the entire tree, which is right for correctness and the worst
available outcome for the person looking at the screen. Any runtime error
anywhere in this app produced a blank document.

`RouteErrorBoundary` now wraps the router — inside `BrowserRouter` so it can
read the pathname, outside `Suspense` so it also catches lazy-chunk load
failures. The failing page is replaced, header and footer survive, and there
are two ways out. It resets on navigation, so one bad route cannot strand a
session.

**Honest caveat on how it was found:** the specific throw
(`leaderboard.map is not a function`) came from *my own stub* returning a
single object where `useLeaderboard` expects an array from `.select()`. The
hook is fine; there is no production bug in `AchievementsSection`. What the
induced crash demonstrated — that nothing catches it — is real and independent
of the trigger.

Verified by adding a deliberately throwing route, confirming the boundary
caught it (height 1000 rather than 0, header and footer both present), then
confirming "Back to home" both navigated and cleared the error state. The test
route was removed before commit.

## Player dashboard

| Finding | Detail |
|---|---|
| **Told players to use a removed flow** | "Your Inquiries — bookings you've reached out about via WhatsApp", with an empty state reading "find a venue and **tap WhatsApp to start**". The WhatsApp handoff was removed when in-app payment landed — `src/components/booking/` no longer exists — so the instruction pointed at nothing. `booking_intents` is read-only history now, and the card says so: "Earlier inquiries · venues you contacted before in-app booking". `SportsDNACard` carried the same stale "send an inquiry" phrasing. Player-side twin of the Stripe finding on For Owners. |
| An RPC result cast without checking | `usePlayerStats` did `data as unknown as PlayerStats` — an assertion, not a check. A set-returning RPC hands back an array, arrays are truthy, so it sailed past the consumer's `if (!stats)` guard and every field read as `undefined`. `{value}` renders nothing, so the card showed three icons and three labels with blank gaps where the numbers belong: broken-looking rather than empty. Narrowed to a plain object before trusting it, and the numerals default to 0. |
| Errors swallowed, card vanished | The `catch` logged and moved on, leaving `stats` null so the card returned `null` — silently absent, indistinguishable from "no stats yet". The hook now exposes `isError` and the card renders a panel saying so. |

## Auth pages — two dead buttons and a misleading error

Checked the live project's own `/auth/v1/settings` rather than guessing from
the markup. It reports `external` with **only `email` enabled** — `google` and
`apple` are both `false`.

| Finding | Detail |
|---|---|
| **Login offered two sign-in methods that cannot work** | "Continue with Google" and "Continue with Apple" were the first two controls on the page, above the password form, on both login and signup. Both call `signInWithOAuth`, which returns "Unsupported provider: provider is not enabled". |
| **…and the failure blamed the user's credentials** | `getGenericAuthError` collapses every login-context failure to `"Invalid email or password"` — correct as account-enumeration defence for a password attempt, wrong for everything else. Clicking Google produced *"Invalid email or password"* for credentials the user had never typed, pointing them at a password reset that could not help. |
| Unevidenced audience claims | Signup read "Join thousands of players discovering new venues" against an empty catalogue and a near-empty user table — same class as the For Owners stats. Replaced with what the product actually offers. "Growing community" (both pages) and "Join the community" likewise. |

The fix is `useAuthProviders`, which reads that same public endpoint and gates
the buttons on it. They stay hidden while a provider is off and appear on the
next load once it is switched on in the dashboard — no code change, no
redeploy. It fails closed: if the request errors, the buttons stay hidden,
because a missing button is a smaller harm than one that cannot work. Magic
Link is deliberately *not* gated — `signInWithOtp` needs only the email
provider, which is always on.

`getGenericAuthError` now separates disabled-provider, rate-limit and network
failures from credential rejection before the generic branches. Naming those
leaks nothing: they are properties of the server's configuration, not of
whether any given account exists. Six tests cover it, including that a wrong
password and an unknown email remain indistinguishable.

## Community — sections that argued with themselves

| Finding | Detail |
|---|---|
| Subtitles contradicted the state below them | "Popular games filling up fast" sat directly above "No trending games yet"; "New places to play" above "No venues added yet". A subtitle describes the list, so it now renders only when there is one. |
| "View all" led somewhere equally empty | Both section headers linked out to `/games` and `/venues` regardless of content. With an empty catalogue that is a link to a second empty page. Gated on the section having something to show. |
| One empty state was a dead end | Games offered "Create a game"; venues offered nothing at all. Added "List your venue" so both sections give the reader a way to change the state they are looking at. |

Blog and FAQ were checked at the same time and are sound — the blog's "No
articles yet / Check back soon" is correct and will populate once `seed.sql`
runs. The ~300px gap under short pages is `min-h-screen` on the content
wrapper holding the footer below the fold, which is deliberate, not a bug.

## Owner routing — a redirect loop hidden behind a race

The worst defect found on this branch, and the only one that took two fixes
because the first bug was concealing the second.

**Bug 1 — the guard decided before it had the data.** `useAuth`'s `isLoading`
covers the *session*, not the profile. The `onAuthStateChange` path
deliberately defers the profile fetch into a `setTimeout` (calling supabase
inside that callback can deadlock) and then releases `isLoading` immediately,
so there is a window where a user is authenticated and `profile` is still
`null`. `RequireRole` authorizes owners on `profile.user_type`, evaluated that
window, and sent legitimate owners to `/dashboard` — where `PlayerDashboard`
forwarded them into *player* onboarding. Fixed with an explicit
`isProfileLoading` flag the guard also waits on.

**Bug 2 — an infinite redirect loop, only reachable once bug 1 was fixed.**
`OwnerOverviewPage` sent any owner with `onboarding_completed = false` to
`/onboarding/owner`. That route is a deprecated stub whose entire job is to
send owners back to `/owner-dashboard`. The two bounced off each other
forever: **6489 navigations in nine seconds** once the guard stopped
intercepting first. Every newly created owner is in exactly that state.

Fixing the race alone would have shipped the loop to every owner. Worth
stating plainly, because it is the argument for reproducing a bug before
fixing it rather than reasoning from the code: the first reproduction attempt
showed `/owner-dashboard -> /dashboard -> /onboarding/player` and no loop at
all, which looked like a clean result and was actually bug 1 masking bug 2.

Resolution: `OwnerOverviewPage` no longer redirects to the deprecated stub —
owners set their venue up from the dashboard, which is what the stub's own
comment already said — and `LoginPage` / `AuthCallbackPage` route owners
straight to `/owner-dashboard` instead of bouncing through it.

Verified across the role matrix: owner mid-onboarding, owner complete, player
denied `/owner-dashboard`, player mid-onboarding, player complete. All five
land correctly in 2-3 navigations.

**The same race was duplicated in all eight `/owner/*` sub-pages**, each
re-running `profile?.user_type !== "owner"` in its own effect against
`authLoading` alone. They are all mounted behind `RequireRole`, so the fix
above already covers them in practice — but they carried the buggy form, which
would resurface the moment one was mounted anywhere else. Each now waits on
`isProfileLoading` too. Kept rather than deleted: redundant authorization is
defence in depth, and the cost of keeping it is that it has to be correct.

Re-verified with the profile response deliberately delayed 400ms to widen the
race window: owners hold on `/owner/venues`, `/owner/widget` and
`/owner-dashboard`; a player is still denied.

## For Owners — an invisible button, and twelve claims that held up

| Finding | Detail |
|---|---|
| **A CTA rendered invisible** | The `secondaryOutline` button variant resolved to `text-foreground` / `border-foreground/20`. Its only call site is the closing "Partnership" section, which sits on `bg-secondary` — light in the dark theme. Measured: button colour `rgb(244,247,243)`, section background `rgb(244,247,243)`. Identical. "Contact partnerships" rendered at full 257×56px, took its place in the flex row, and was completely unreadable — which is why the adjacent primary CTA looked ~136px off-centre. The variant now uses `secondary-foreground`, which is what its name always implied. Contrast after: ~18:1. |

Same root cause as the heading bug above: a component styled for the default
surface, used on an inverted one. Worth assuming there are more — the tell is
any token named `foreground` appearing inside something rendered on
`bg-secondary`.

### Checked and left alone

The twelve owner feature cards were audited against the codebase rather than
trusted, since fabricated claims had already been found on this page. All
twelve are backed by real implementation: `calendar-auth` / `calendar-sync`
edge functions reference Google *and* Microsoft/Outlook, `verified_fields`
exists as a table with `verification_status` / `verified_by` / `verified_at`,
`useVenueEquipment` backs equipment rentals, and the Idram adapter and
`payments-callback-idram` function both exist. Nothing to remove.

Page height is **6104px**, not the 7744px quoted earlier in this document —
that figure predated the removal of the fabricated testimonials. The remaining
length is twelve genuine feature cards in a 3x4 grid, which is ordinary for a
B2B landing page and is not a density defect. Recorded so it is not "fixed"
later on the strength of a stale number.

## Inverted surfaces — fixing the class, not the instances

Three separate defects on this branch traced to one cause: a light
`bg-secondary` panel inside the dark theme, with everything on it inheriting
*dark-theme* tokens tuned for a near-black background. Headings pinned to
`--foreground`, the `secondaryOutline` button, and — found by scanning rather
than looking — three eyebrow labels plus a CTA.

Rather than keep patching call sites, `.surface-invert` re-declares the token
set to its light-theme values for that subtree. Ordinary utilities
(`text-primary`, `text-foreground`, `border-border`) then simply work inside
it. Applied to the six real inverted panels: Home's owners band, both For
Owners panels, About's closing CTA, and the Forgot/Reset password side panels.

### Found by an automated sweep

A contrast scanner (walks every text node, composites against the first opaque
ancestor background, checks against WCAG AA for its computed size) over ten
public routes:

| Route | Finding | Ratio |
|---|---|---|
| `/about` | "Contact us" button, hardcoded `text-white` on the light panel | **1.08** |
| `/for-owners` | "Simple & Transparent" eyebrow | 1.57 |
| `/for-owners` | **"5%"** — the commission figure, the single number an owner cares most about | 1.57 |
| `/for-owners` | "Partnership" eyebrow | 1.57 |

After the fix: **0 below-AA text nodes** across all ten routes.

### What the scanner could not catch

Flipping the tokens silently downgraded Home's "List your venue" CTA. It was
`bg-background text-foreground` — deliberately near-black on the light panel.
Inside `.surface-invert` those resolve to *light* background and dark text, so
it still passed contrast comfortably while reading as a weak secondary button.
Caught by looking at the screenshot, not by the checker. Now
`bg-secondary-foreground text-secondary`, which `.surface-invert` does not
remap, restoring the original intent.

The lesson worth keeping: a contrast checker verifies legibility, not
hierarchy. A button can be perfectly readable and still be wrong.

Also replaced three hardcoded `$0` figures on the For Owners pricing panel
with `֏0`. AMD is the only settlement currency and `formatPrice` was already
corrected to resolve dram unless the viewer is in the US; a dollar sign
contradicted that on the one page whose entire subject is what the owner
gets paid.

## Authenticated surface — scanned, and mostly sound

Ran the contrast scanner over the logged-in half of the app for the first
time, stubbing a session and profile: `/dashboard`, `/profile`,
`/onboarding/player`, `/bookings` as a player, and all nine `/owner/*` routes
as an owner. **0 below-AA text nodes** on every one. The owner surface in
particular is well built — real sidebar, accurate counts, and every empty
state carries a specific action.

Every owner route also landed without redirecting, which independently
re-confirms the routing fix above.

| Finding | Detail |
|---|---|
| Dollar-sign iconography throughout | `DollarSign` was used 26 times across 13 files — the Earnings and Pricing sidebar entries, owner pricing, admin dashboard, game pages, the embed widget. AMD is the only settlement currency, so a `$` glyph is as wrong here as the `$0` figures were on For Owners. Swapped to `Banknote`, which reads as money without asserting a currency. |

### Deliberately not changed

The owner dashboard shows "View all" beside empty Recent Bookings and My
Venues panels. That looks like the Community defect fixed above, and is not:
Community's links led to a public catalogue that was also empty, a dead end,
whereas these lead to the owner's own management pages where the empty state
offers "Add Your First Venue". Navigation to somewhere you can act is not the
same as a link promising content that does not exist.

## Venue details + booking panel — no longer blocked

Earlier entries in this document call this surface blocked on seed data. That
was wrong, and worth correcting: stubbing `/rest/v1/venues` and
`/rest/v1/rpc/get_available_slots` renders the whole page, booking panel
included. The surface was unseeded, not unreachable. Everything below was
found that way.

The panel itself works. With slots stubbed, available ones are enabled and the
unavailable one is disabled and struck through; the price, date strip, policy
line and "Secure payment via Ameriabank / Idram" all render correctly.

| Finding | Detail |
|---|---|
| **Header rating contradicted the reviews below it** | The header read `venues.rating` / `venues.review_count`; the section below counts rows from the `reviews` table. **Nothing writes those two columns at all.** (An earlier draft of this entry said the outreach functions wrote them; they do not — they write Google Places counts to `outreach_targets`, a different table. Corrected after grepping every `from("venues")` write in the codebase and finding none that touches `rating` or `review_count`.) Both are `DEFAULT 0` and stay 0 for the life of the row, so the header stated a rating derived from nothing. The header now derives both from the reviews already fetched on the page, and shows nothing when there are none. |
| AI launcher overlaps the Reserve button | Measured 7px at 1440 and 27px at 1024. The launcher is `fixed z-50`; the sticky panel had no stacking context, so the launcher sat on top. Panel raised to `z-[60]`. |

### Two corrections to my own findings

**The launcher overlap is narrower than it first looked.** Reserve is
click-actionable *with and without* the fix — Playwright drives an element's
centre, which was never obstructed. The click-theft region is only the 7-27px
strip at the button's right edge. The fix is still right (a floating helper
should not outrank the primary control) but it is a small robustness
improvement, not a repair to a broken booking flow.

**Two apparent bugs were my harness, not the app.** All slots first rendered
struck through because my stub returned `is_available` while the RPC's actual
signature is `RETURNS TABLE (slot_start, slot_end, available boolean)` — the
component was reading the right field all along. And a "Reserve is not
clickable" result was the button's legitimate `disabled` state with no slot
selected, which a trial click waits out. Both checked against the migration
and the component before being written down.

## Phantom ratings across the rest of the app

Following the venue-header fix: if `venues.rating` and `venues.review_count`
are never written, every other surface reading them is showing a number that
means nothing. Seven readers, and the split turned out to matter.

**Already safe — four of them guard on a truthy rating**, so with the column
at 0 they render nothing: `SEOHead` (so no fabricated `aggregateRating` ever
reached search engines — the outcome that would have been worst),
`CommunityPage`, `AIRecommendations`, and `OwnerVenuesPage` (which shows an
em-dash).

**Three did not**, and rendered `⭐ 0` on every venue — which reads as
"customers rated this zero", strictly worse than showing nothing:

| File | Surface |
|---|---|
| `NearbyFieldsPage` | venue list row |
| `NearbyFieldsPage` | bookable-venue map info window |
| `VenueMapPage` | selected-venue info window |

All three now render the rating only when there is one. All three also used a
`⭐` emoji while importing lucide's `Star` in the same file — replaced, so the
star matches every other rating in the app.

### Left alone deliberately

`condition_rating` on the community-fields feature has the same shape — a
`DEFAULT 3.0` column with no writer — so those surfaces always show "3/5".
Lower harm than a false zero (a neutral default rather than a damning one) and
it belongs to a different feature, so it is recorded here rather than changed.
The decorative `⭐` in two `NearbyFieldsPage` headings and one SVG map marker
are also untouched: the SVG cannot host a React icon, and the headings are
ornament, not data.

## Chat authorization — the last known security gap, plus a dead feature

`add_chat_member` and `send_system_message` were `SECURITY DEFINER`,
`EXECUTE`-able by `authenticated`, called straight from the browser, and
checked nothing. Documented in PR #3 and left unfixed at the time because
rewriting authorization mid-migration is how chat quietly breaks. The
migration is done, so it is fixed now.

| Was possible | Now |
|---|---|
| Add any user to any room with any role, given a room UUID | Only yourself, or the counterparty the room is inherently about |
| Insert `sender_id NULL, message_type 'system'` into any room — forged messages that render as coming from Sportsbnb | Only members of that room; `service_role` still exempt for platform flows |
| Any string as the member role | Constrained to the same four values as the table's CHECK |

The entitlement rule is not new. `can_access_chat_room` mirrors the existing
`Authenticated users can create chat rooms` policy, so a user may join exactly
the rooms they could have created.

### A dead feature found while writing the regression test

`chat_rooms_type_check` allowed only `('game','booking')`. Migration
`20260118103406` added an RLS branch for `type = 'venue'`, `useChat` types the
union as `"game" | "booking" | "venue"`, and `initializeVenueChat` creates
venue rooms — **every one of which failed on the constraint.** Venue chat has
been dead since it was written. Widened to include `venue`.

This only surfaced because the regression test tried to create a venue room
rather than assume one could exist. The security fix would have passed its
tests either way.

### An interaction the first draft got wrong

The first version of the guard said "you may only add yourself", which matched
`ChatDialog`'s single call site. But `initializeVenueChat` adds *two* members —
the customer and the venue owner — so that rule would have broken venue chat
the moment the constraint fix made it reachable. `belongs_to_chat_room` now
allows adding a by-reference participant, which covers the owner without
letting arbitrary accounts in.

Verified on the live project across six paths: venue room creation, add-self,
add-owner, add-stranger (blocked), system message as a member, and system
message as a non-member (blocked). The probe dropped a foreign key to insert
test rows and rolled the whole transaction back; `venues_owner_id_fkey` was
confirmed restored and zero probe rows remained.

## Constraint-drift sweep — one bug, then nothing

The venue-chat failure was schema drift: the app sending a value the database's
CHECK constraint refused. That was found by accident, so this pass looked for
the rest deliberately.

Method: pull every value-restricting CHECK constraint from the live project
(22 of them), then cross-reference each against the literals the frontend and
edge functions actually write to those columns.

**Result: no remaining drift.** Every literal written to a constrained column
is in range — `ledger_entries.entry_type` (all 7), `profiles.user_type`,
`teams.visibility`, `payments.provider`, `chat_members.role`, and the rest.
The one computed value in the set, `newStatus` in `payments-refund`, resolves
only to `cancelled_by_player` or `cancelled_by_owner`, both allowed.

### The scanner was wrong five times out of five

It flagged five candidates. All five were false positives, and reading each one
is the only reason they were not written up as bugs:

- `payments-verify` twice — `json(req, { status: "pending" })` is an HTTP
  response body, not a database write.
- `calendar-sync` — `.eq("status", "confirmed")` is a filter, not a write.
- `payments-refund` — writes a variable, not the literal the window caught.

The tool matched literals within a fixed window after each `.from("table")`
call, so it happily crossed statement boundaries. Useful for narrowing 40k
lines to five sites; useless as evidence on its own.

### And it would not have caught the original bug

`chat_rooms.type` never appears as a literal beside a `.from("chat_rooms")`
call — the app passes it as an RPC argument to `get_or_create_chat_room`.
Checked the other eight client RPCs separately for enum-like arguments;
`add_chat_member`'s role is the only one, and it is now validated server-side.

## Verified clean

- **No horizontal overflow** at 375px or 768px. `scrollWidth === clientWidth`
  at both. The elements extending past the viewport are decorative blur layers
  inside `overflow-hidden` parents — intentional and contained.
- **`AIChatbot` launcher** already carried `aria-label="Open AI assistant"`.

## Open

Ordered by leverage, not by effort.

1. **Section density on the remaining pages.** Home is now 4427px; For Owners is 6104px
   after the fabricated testimonials came out. This is a content-per-screen problem, not a spacing one, and it
   is the main thing still making those pages feel empty.
2. **The screenshots in this audit were taken in fallback fonts.** Chromium in
   this container cannot reach `fonts.googleapis.com` — every request fails
   `ERR_CONNECTION_RESET`, including through the agent proxy, because the
   browser does not trust the proxy's CA. `document.fonts` is empty on every
   page. So the type in every screenshot above is the system fallback, not
   Space Grotesk / DM Sans / JetBrains Mono. Layout, colour, contrast and
   spacing findings stand — those do not depend on the face. Judgements about
   *typography* do not, and the "Space Grotesk display, DM Sans body" line in
   the Baseline section was read from the token file, not from a rendered
   page. Worth re-running against a preview deploy, where the fonts load.
3. **The AI launcher occludes content at 375px.** A fixed FAB over the booking
   mock's total. Standard FAB behaviour and it moves on scroll, but worth a
   safe-area inset on the pages where it lands on a number.
4. **Nav density.** Four links in a 64px bar with a large void between the
   wordmark and the auth actions.
5. **Empty states.** Currently the *most*-seen surface, since the database has
   no venues. They deserve more design attention than the populated views.
6. **Auth pages** — login, signup, reset, both onboarding flows.
7. **Static pages** — About, FAQ, Contact, For Owners, Blog, Community.
8. **Venue cards and the booking panel** — blocked on seed data, see below.
9. **Mobile layout quality.** Confirmed not *broken* at 375/768; not yet
   designed for.

### Two unlabelled buttons left, deliberately

`sidebar.tsx` and `carousel.tsx` are vendored shadcn primitives. They are
generic by design and should be labelled by whoever mounts them — patching the
vendor file means the next component update silently drops it.

### Blocker: no seed data

`venues.owner_id` is `NOT NULL REFERENCES auth.users(id)`, so demo venues need
a real account. Both routes to creating one from this environment — a direct
`auth.users` insert and the public `/auth/v1/signup` endpoint — were denied by
the permission classifier.

Until an owner account exists, Discover, venue details, search results and both
dashboards render empty and cannot be designed or evaluated. That is roughly
half the app's surface.

**To unblock:** sign up once in the app, then seed venues under that `user_id`.
