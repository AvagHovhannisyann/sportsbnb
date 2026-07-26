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

## Owner listing-health score — coaching toward a removed feature

The score owners are shown and told to optimise had two rules working against
them.

| Finding | Detail |
|---|---|
| **10 points for enabling WhatsApp or phone contact** | With the field unset it told the owner "Enable WhatsApp or phone contact". Players book and pay in-app; the WhatsApp handoff was removed in Phase 2 and `booking_intents` is read-only history. The score was steering owners back toward the flow the product had just abandoned. Replaced with whether the listing is actually live (`is_active`), which is the current make-or-break for getting booked. |
| **15 points for a review count nothing maintains** | `venues.review_count` is `DEFAULT 0` with no writer anywhere in the codebase. Every venue therefore lost that entire category permanently — a listing that was perfect in every other respect could not score above 85 — and was told "No reviews yet" no matter how many reviews it actually had. |

The second fix needed a structural change rather than a deletion. The function
accumulated a running total against a hard-coded 100, so a category with no
usable data silently became a penalty. It now tracks earned against possible
and omits a category from the denominator when the platform cannot judge it,
so a venue is measured only on things it can control. Reputation returns to
the score automatically the moment `review_count` is maintained.

Seven tests cover it, including that no advice mentions WhatsApp or phone,
that a fully-configured venue can reach 100, and that reputation still scores
once a venue genuinely has reviews.

**The same defect was in the response-rate category and I missed it on the
first pass.** That rate is derived from `booking_intents` — the WhatsApp / SMS
/ Call handoff table Phase 2 retired. No new rows are ever written, so the
seven-day window is always empty, the rate is always 0, and every owner was
docked the full 15 points *and* told "Reply faster — 0% response rate" about a
channel players can no longer use. Identical semantics to `review_count`,
which is what makes missing it worth recording: the first fix carried a
comment calling this signal "always meaningful". The score now takes
`number | null`, and the card passes `null` when there is nothing in the
window, so an unmeasurable rate is excluded rather than scored as failure. A
genuine 0% still counts.

## Dead-data sweep — a promise of money nothing could pay

Three fixes in a row had the same shape: user-facing logic driven by a column
or table nothing maintains. Rather than keep finding them one at a time, this
pass enumerated every table the app reads and checked which have no writer
anywhere — app code, edge functions, or SQL.

44 tables touched, 9 never written from app code. Seven are explained: views
(`owner_balances`, `profiles_public`), migration-seeded reference data
(`achievements`), and tables written through RPCs rather than `.from()`
(`chat_rooms`, `referral_codes`, `user_achievements`, `outreach_messages`).

| Finding | Detail |
|---|---|
| **`referral_credits` has no writer at all** | Not in app code, not in an edge function, not in a migration trigger. The card advertised **"Invite friends and both get ֏2,000 booking credit!"** under a "Refer & Earn" heading, and generates a real, shareable code. The credit could never be granted. This is worse than the unevidenced stats removed earlier: those were boasts, this is an offer a user can act on by sharing the code widely. Copy now describes what actually happens; the credit badge is already guarded on `> 0`, so it lights up by itself if fulfilment is ever built. |

### Left alone

`venue_promotions` also has no writer, but reads clean: `DiscoverPage` uses it
to sort promoted venues first, and an empty set simply means no venue is
falsely flagged. The plumbing is correct and inert, so deleting it would only
remove working groundwork for an unbuilt feature.

### The first scan was wrong again

The initial heuristic reported **31** read-only tables, including `profiles`
and `game_participants`, which are obviously written. It matched
`.insert(`/`.update(` only within 200 characters *on one line*, and Supabase
chains span lines. Made multi-line-aware, the count fell to 9. Two crude
scanners in three passes have now produced mostly false positives; both were
still worth running to narrow the search, and neither was worth trusting.

## Google Maps loaded on every page in the app

Found by smoke-testing all 19 public routes after 41 commits, to check for
regressions in my own work. Four routes timed out on `waitUntil: "load"`, and
the reason was the same on every one: the Maps script was being fetched and
failing, on pages that have no map.

`GoogleMapsProvider` called `useJsApiLoader` unconditionally at the App root.
Because it is a hook it cannot be called conditionally, so the Maps JS API was
requested on **every route** — `/privacy`, `/terms`, `/faq`, `/login`, `/blog`,
the landing page — when only two screens actually show a map. Each of those is
a third-party request, a **billable Maps JS API load**, and a connection to
Google from a page with no reason to make one.

The provider now mounts the loader only once something asks for Maps state.
`useGoogleMaps()` registers that interest itself, so `<MapsReady>` and every
existing consumer keep working unchanged.

Measured before and after by counting requests to `maps.googleapis.com`:

| Route | Before | After |
|---|---|---|
| `/privacy`, `/terms`, `/faq`, `/login`, `/` | 1 each | **0** |
| `/venues/map`, `/nearby` | 1 | 1 |

Seven of seven routes loaded Maps before; two of seven after, and both are
routes that render a map.

### Not defects

The other smoke failures were not the app. `leaderboard.map is not a function`
on `/login` and `/signup` is the stub returning a single object where the
leaderboard query expects an array — the error boundary caught it, which is
the boundary working. And "Failed to load Google Maps script, retrying in 2
ms" comes from `@react-google-maps/api`'s own backoff, not from any retry code
in this repo.

## Full-app smoke sweep — 47 routes, all three roles

After 42 commits, a regression check on my own work: load every route with a
stubbed session, and fail it if it throws, trips the error boundary, renders
blank, or scrolls horizontally.

| Role | Routes | Result |
|---|---|---|
| player | 23 | 23 clean |
| owner | 16 | 16 clean |
| admin | 8 | 8 clean |

The four routes that timed out on the first run — `/community`, `/contact`,
`/nearby`, `/privacy` — pass now. They were failing because the Maps script
was being fetched on every page and never resolving; that fix closed them out.

The harness is now `scripts/smoke-routes.mjs` rather than a throwaway. It had
been rewritten from scratch several times across this branch, which is how the
stub-shape mistake behind the phantom "leaderboard.map is not a function"
crash kept recurring.

**It now runs in CI on every pull request**, as a `smoke` job. It needs no
secrets — every REST call is intercepted and the session is stubbed, so
placeholder env is enough to boot the Supabase client. That matters because
the existing `e2e` job is gated on secrets nobody has set and has therefore
*never run*, leaving the browser entirely uncovered.

Two bugs in the harness itself were fixed to make that possible, and the first
is the more instructive:

- **The localStorage auth key was hardcoded to one project ref.** Supabase
  namespaces the session by ref, so against any other project the stub simply
  did nothing: every guarded route redirected to `/login` and the script
  reported them **clean**, having tested the login page 16 times. The key is
  now derived from `VITE_SUPABASE_URL`.
- The script now fails a route that lands on `/login` when it did not ask for
  it, so that silent-pass mode cannot come back.

Verified against a dev server booted with the exact placeholder env the CI job
uses: guarded routes resolve under a *different* project ref, and forcing the
old hardcoded ref reproduces the redirect failure.

## Mobile sweep — two real overflows

"Mobile layout quality" sat in the open list from the beginning as *confirmed
not broken, not yet designed for*, on the strength of spot-checks at a handful
of pages. The smoke harness already measures horizontal overflow per route, so
sweeping all 23 player routes at 375px cost one extra pass and settled it.

| Finding | Detail |
|---|---|
| `/nearby` toolbar did not wrap | The heading and a three-control toolbar shared a `justify-between` row with no wrapping. At 375px they came to **438px**, so the whole page scrolled sideways. Both the outer row and the inner control group now wrap. |
| **Every toast gave the page horizontal scroll** | Sonner's mobile breakpoint sets the toast list to `width: 100%` while keeping `left: 16px; right: 16px`, so the container measured 375px starting at x=16 and ran 16px past the viewport. Not specific to one page — toasts fire on errors and confirmations throughout the app. |

The toast fix took two attempts. The first set `--width` to
`min(356px, calc(100vw - 2rem))`, which looked right and did nothing: that
variable is ignored at Sonner's mobile breakpoint. Measuring the computed style
rather than trusting the change showed `--width` correctly applied and the
element still 375px wide. Overriding `width` in that media query is what
actually works — the container is now 343px, exactly the viewport minus both
insets.

All 23 player routes are clean at 375px, and the mobile pass now runs in CI
alongside the desktop one, so this cannot regress unnoticed.

### The owner header clipped its own title on every page

The overflow sweep passed all 16 owner routes at 375px, so by that measure the
owner surface was fine. Looking at it was a different answer: `OwnerLayout`
gave its sticky header a fixed `h-16` while the subtitle wrapped to three lines
at phone width. With `items-center` the excess split above and below, and
**"My Venues" was sliced off the top of the screen** — on every owner page.

Worth recording as a limit of the harness rather than a gap in it. Horizontal
overflow is measurable and now guarded in CI; vertical clipping inside a
fixed-height container is not, because nothing overflows the *document*. The
check said clean and was right about the thing it checks.

Fixed with `min-h-16` plus padding so the bar grows, `min-w-0` and a
`line-clamp-1` subtitle so it never forces the row wider, and the "Back to
site" label reduced to its chevron below `sm` with the text kept for screen
readers. Desktop is unchanged — full subtitle, full label.

### Owner mobile drawer — checked, and correct

The only owner surface no sweep can reach, since it exists only after tapping
the hamburger. Opened and driven directly: all 13 nav items reachable, active
state correct, no overflow, no page errors, a real `rgba(0,0,0,0.5)` backdrop,
and it dismisses both on the close button and on an outside tap.

**A false positive worth recording.** My first check reported that tapping
outside did *not* close it, and I was one step from "fixing" working code. The
check asked whether a nav link still had non-zero width and height — which
stays true for a drawer that is translated off-screen rather than unmounted.
Measuring the element's actual position instead (`left: -256`, `onScreen:
false`, backdrop gone) showed it closing exactly as intended.

That is the third crude check on this branch to produce a false positive, after
the constraint-drift scanner and the read-only-table scan. The pattern is
consistent enough to state plainly: these scans are good at narrowing where to
look and unreliable as evidence. Every one of them needed the specific case
verified by hand before it was worth acting on.

### Fixed-height containers holding wrapping text

Searched for the shape behind the clipped owner header — a fixed `h-*` on a
flex row containing text — across the codebase. Two other candidates, both
sound: the main `Header` (already covered by the 375px sweeps, and its nav
collapses to a hamburger) and the drawer's own logo row (short, non-wrapping
content). No further instances.

## Discover with real content — venue fallbacks were hot-linked

First look at Discover populated (six stubbed venues) rather than empty.

| Finding | Detail |
|---|---|
| **Fallback venue images were hot-linked from Unsplash** | `getVenueImage` fell back to nine `images.unsplash.com` URLs for venues with no photo of their own. That is a third-party request per photoless card, and if those URLs rot or Unsplash blocks hotlinking, every photoless venue breaks at once. The app already ships bundled photos for four of those sports — the landing page uses them. Now served from the bundle; sports without one share the generic image rather than reaching out to a third party. |
| Rating star was off-palette | `fill-warning` amber, where the venue-details rating and every other star in the app use `fill-primary`. |
| Missing image never reached the placeholder | `imageFailed` was only ever set by `onError`, but an empty `image_url` renders `<img src="">`, which resolves to the page itself and never errors. Seeded from the prop instead, with an effect to reset it. In practice `getVenueImage` always returns something, so this is belt-and-braces — but the earlier 404 fallback quietly did not cover the empty case it appeared to. |

### What the screenshot appeared to show, and did not

Every card first rendered as a black void, which looked like a serious defect.
It was the container: Unsplash is unreachable here, so the images hung at
`complete: false, naturalWidth: 0` — never loading, never erroring. In
production they would have loaded fine. Reading `currentSrc` and
`naturalWidth` off the elements is what separated an environment artifact from
a real problem, and the real problem turned out to be the hot-linking itself
rather than anything visible.

### Noted, not changed

Every card carries an "Instant Book" pill. Since Phase 2 every venue books the
same way, so it is universally true and therefore tells the reader nothing.
Removing it would also remove a genuine trust signal. That is a design
judgement rather than a defect, so it is recorded here instead of decided.

## Third-party hosts — a hardcoded API key

The Unsplash hot-linking found on Discover suggested a class worth sweeping, so
I enumerated every external host referenced anywhere in `src`. Most are inert:
`w3.org` and `schema.org` are XML/JSON-LD namespaces, `calendar.google.com` is
an add-to-calendar link, `fonts.googleapis.com` is expected. `wa.me` survives
only inside `src/lib/phone.ts` and its test, not on any live booking path.

One is not inert.

| Finding | Detail |
|---|---|
| **Yandex Geocoder API key hardcoded in source** | `SmartSearch.tsx` carried `const YANDEX_GEOCODER_API_KEY = "0182c04c-…"` as a literal, committed and present in git history. A browser-callable geocoder key is necessarily public — it ships in the bundle either way — but hardcoding it meant it could not be swapped per environment or rotated without a code change, and the quota is billable, so an abused key costs the owner money. Phase 0 covered secrets hygiene and rotated the Google Maps key; this one was missed. |

Now read from `VITE_YANDEX_GEOCODER_KEY`, matching how
`VITE_GOOGLE_MAPS_BROWSER_KEY` is handled, and added to `.env.example`. Both
call sites are guarded so an unset key skips the geocoder instead of firing a
request Yandex will reject — venue and game suggestions keep working, only
location suggestions drop out. The CI smoke job deliberately leaves it unset,
which exercises that path on every run. Verified the literal no longer appears
in the build output.

**This needs action beyond the code change:** the key is in git history, so
moving it does not un-expose it. It should be rotated in the Yandex console
and the replacement restricted by HTTP referrer.

### Canonical URL disagrees with itself

`SEOHead` sets `SITE_URL = "https://sportsbnb.org"` while `AboutPage`'s JSON-LD
publishes `https://www.sportsbnb.org`. Search engines treat those as different
origins. Left alone rather than guessed at — which of the two is the real
production domain is not something I can determine from the repo, and picking
wrong is worse than flagging it.

## Secrets hygiene — verified, and one item is still live

Phase 0 recorded secrets hygiene as done: `.env` gitignored and untracked, and
the Google Maps key to be rotated. Since Phase 0 also missed the hardcoded
Yandex key above, the rest of that claim was worth checking rather than
trusting.

**What holds.** `.env` is untracked — only `.env.example` is in the index — and
`.gitignore` covers `.env` and `.env.*`. A sweep for credential-shaped literals
across `src` and `supabase/functions` (KEY/TOKEN/SECRET/PASSWORD assignments,
UUID, JWT and `sk_`/`pk_`/`sb_` prefixes) found nothing beyond the Yandex key
already fixed.

**What does not.** `.env` remains in git history from before its removal. It
held five values, all `VITE_*` and browser-exposed by design — and, reassuringly,
**no service-role key and no secret**. Three are the old Lovable Supabase
project's publishable credentials, which are public by nature and belong to a
project being decommissioned.

The fourth matters: **the Google Maps browser key currently in use is
byte-identical to the one in git history.** Compared by SHA-256 fingerprint
rather than by reading either value; they match. The rotation Phase 0
recommended has not happened, the key is retrievable by anyone with repository
access, and Maps JS API loads are billable.

Nothing further can be fixed in code — the key is already env-configured. The
remaining action is in the Google Cloud console: rotate it, and restrict the
replacement by HTTP referrer. Restriction matters more than rotation here,
since a browser key ships in the bundle regardless and referrer-locking is what
actually prevents third-party use.

## Correction — `venues.review_count` is maintained after all

Several entries in this document, and the commits behind them, asserted that
nothing writes `venues.review_count` or `venues.rating`. **That is false.**

The `update_venue_rating` trigger recomputes both from the `reviews` table on
insert, update and delete. It is in this repository at
`supabase/migrations/20260114060648_…sql` and is live on the project — four
triggers on `reviews`, three of them wired to that function.

How the error survived several passes is the useful part. The grep that
"proved" the absence filtered migration matches through
`grep -iE "trigger|update venues|set rating|set review_count"`, which requires
those phrases on a single line. The trigger's statement spans lines:

```sql
UPDATE public.venues
SET
  rating = ...,
  review_count = (SELECT COUNT(*) ...)
```

`SET` and `review_count =` are on different lines, so the filter discarded the
one line that disproved the claim, and the empty result read as confirmation. A
negative result from a line-oriented filter is not evidence of absence — that
is the fourth time on this branch a crude check has misled, and the first time
it did so in the direction of a false *finding* rather than a false alarm.

### What this changes, and what it does not

| Fix | Still correct? |
|---|---|
| Guarding `⭐ 0` on NearbyFieldsPage and VenueMapPage | **Yes.** A venue with genuinely zero reviews has `rating = 0`; rendering that as a zero-star score is wrong regardless of who maintains the column. |
| Venue header derived from the fetched reviews | **Yes**, but as a consistency choice rather than a repair — it cannot drift from the list directly below it. `venues.rating` was never broken. |
| Listing-health excluding reputation at zero reviews | **Yes**, on different grounds: a new venue has no reputation to judge, and scoring an absence as failure caps it below 85 for something outside its control. Not, as claimed, because the column is dead. |

Code comments in `listingHealth.ts`, `listingHealth.test.ts` and
`VenueDetailsPage.tsx` have been corrected, since a comment asserting a
falsehood is worse than no comment.

### Re-verifying the rest of the "no writer" claims

The `review_count` error came from trusting a line-oriented grep over
migrations. Every other claim of that shape on this branch was made the same
way, so all of them were re-checked against the live database — querying
`pg_trigger` and every `pg_proc` body, which is precisely what a source grep
cannot see.

| Claim | Verified against the database | Result |
|---|---|---|
| `venues.review_count` / `rating` unmaintained | 4 triggers on `reviews`, 3 running `update_venue_rating` | **False — corrected above** |
| `referral_credits` has no writer | 0 triggers, no function writes | Holds |
| `venue_promotions` has no writer | 0 triggers, no function writes | Holds |
| `condition_rating` is a `DEFAULT 3.0` column nothing maintains | 0 triggers, no function mentions, on both `public_fields` and `verified_fields` | Holds |
| `add_chat_member` / `send_system_message` unauthorized | Probed directly; all three attack paths raised | Held (fixed) |
| `chat_rooms_type_check` rejected `venue` | Reproduced the constraint violation | Held (fixed) |

Five of six stand. The one that did not is the one where the evidence was a
*negative* grep result rather than a positive observation — which is the
distinction worth carrying forward. The chat and constraint findings were
never in doubt because they were demonstrated by making the database refuse
something, not by failing to find a string.

That also means the referral finding is safe: the ֏2,000 credit really was
unfulfillable, and removing the promise was right.

## Discover density — a browse page that showed three venues

With the defect queue worked out, this is design rather than repair. Discover
is where the landing page's primary CTA lands, and it had never been looked at
as a browsing surface.

Measured before: cards 437x536 with the photo taking 348px — 65% of a card
whose job is comparing venues by name, price and rating. The grid capped at
`lg:grid-cols-3`, so **1920px showed the same three columns as 1440px**, and
only three cards were fully visible above the fold.

After: a fourth column from `xl`, and the image aspect from `5/4` to `3/2`.

| | Before | After |
|---|---|---|
| Card height | 536px | **403px** |
| Image height | 348px | 215px |
| Cards per row (1440 / 1920) | 3 / 3 | **4 / 4** |
| Fully visible above the fold | 3 | 4 |

Tablet stays at two columns and mobile at one, both without overflow.

### Nearly a third false positive

The first render with twelve venues showed truncated names — "Kent…", "Aq…" —
which read as a regression from narrower cards. It was not. My stub generated
ratings as `4.1 + (i%9)/10`, which produces `4.199999999999999`; seventeen
characters of rating in a row shared with the title. With properly rounded
values, matching the `NUMERIC(2,1)` the database actually stores, **zero titles
truncate**.

Worth checking before changing anything, and it did surface something real: the
card printed `rating` raw. Every current caller passes a database numeric so
nothing was broken, but the venue-details header derives its rating in
JavaScript, and any future caller doing the same would have reproduced exactly
what my stub did. Now formatted to one decimal, with the em-dash retained so an
unrated venue does not show a zero.

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
9. ~~**Mobile layout quality.**~~ Swept at 375px across all 23 player routes;
   two overflows found and fixed, and the pass now runs in CI. See "Mobile
   sweep" above.

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

---

## Round: the half of the router CI had never opened

Every smoke pass so far walked *static* routes only. The dynamic ones —
`/venue/:id`, `/game/:id`, `/team/:id`, `/blog/:slug`, `/venue/:id/edit`,
`/venue/:id/availability`, and the entire checkout chain `/book/:id` →
`/pay/mock/:id` → `/booking/:id/status` — had never been loaded in CI once.
That is the venue page and the money path.

They could not simply be added to the list. The smoke harness answered every
REST call with `[]`, and a detail page handed an empty array renders its
not-found branch: the route "passes" while the code under test never runs. So
the harness now serves one plausible row per table (`venues`, `games`, `teams`,
`blog_posts`, `bookings`, `payments`, `profiles_public`), returning an object
for a primary-key lookup and an array otherwise.

The regex for that is `[?&](id|slug)=eq\.`, not `id=eq\.` — `venue_id=eq.`
contains the latter, and answering a foreign-key filter with a bare object
produces `x.map is not a function`, which reads as an app bug and is not one.
The same trap the `profiles` stub had already fallen into once.

Coverage went from 39 route-loads per width to 62, and `:venue`-style tokens in
the route list expand to the stub ids so the workflow stays readable.

### What it found

Populating the stubs also gave the *existing* routes data for the first time,
which is where most of this came from. Nine defects, none of which reproduce on
an empty database:

| Where | Symptom |
|---|---|
| `/embed/booking/:id` | Rendered a bare spinner and never resolved |
| `/venue/:id` @375 | Page scrolled sideways — 958px wide on a 375px screen |
| `/dashboard` @375 | 381px |
| `/owner-dashboard` @375 | 818px |
| `/owner/hours` @375 | 563px |
| `/owner/pricing` @375 | 378px |
| `/venue/:id/edit` @375 | 486px |
| `/venue/:id/availability` @375 | 559px |
| `/admin`, `/operator`, `/operator/outreach` @375 | 422 / 526 / 603px |

**The embed one is the worst of them**, because of where it runs. The page
awaited `supabase.functions.invoke("widget-data")`, destructured the result,
and never read it — and could not have: the function takes `venueId` from the
query string and the call passed `body: null` with no params, so it answered
400 every time. Nothing on the page renders until that settles, and this is the
page owners paste into their own websites. A dead round trip in front of first
paint on somebody else's domain, and a permanent spinner whenever the function
is slow or unreachable. Deleted.

### One cause behind seven of the others

`min-width: auto` on grid and flex items. An item's default minimum is its
*min-content*, so anything inside that refuses to shrink sizes the track — and
a single-column grid on a phone then becomes as wide as its widest descendant,
scrolling the whole page rather than the element.

The tell is that every fix is `min-w-0` or `flex-wrap`, and that several of the
offenders had already tried to handle it:

- `WeekCalendar` sets `min-w-[800px]` inside `overflow-x-auto` precisely so it
  scrolls on a phone. An explicit `min-width` still counts toward min-content,
  so the 800px propagated out through `lg:col-span-2` and scrolled the owner
  dashboard instead of the calendar.
- `BookingPanel`'s date strip carries `overflow-x-auto` and simply never got
  the chance to use it.
- The dashboard's game location has `truncate`, which is decorative on a flex
  item without `min-w-0` — it kept full intrinsic width instead.

The rest were fixed-width rows that never fitted: the opening-hours editor
(a 112px day label, a toggle and two 128px time inputs ≈ 520px, in two separate
files), the pricing base-rate row, and four page headers whose action buttons
sat on one unbreakable line with the title.

Verified: 62 routes × 3 roles × 2 widths, all clean. Both widths now run in CI.

### What this does not do

It does not unblock *design* review. The stub rows are one venue named "Smoke
Arena" with three amenities — enough to prove a layout holds, not enough to
judge whether it is any good. The seed-data blocker below still stands.

---

## Round: the venue page, finally seen with something on it

The seed-data blocker below is about *judging* design. It turned out not to
block *looking*: the smoke harness already renders populated pages, so pointing
a camera at the same stubs gives a venue page with a name, a description, seven
days of opening hours, five amenities and three reviews. Not enough to say
whether the design is good. More than enough to see what is broken.

Five findings at 1440px and 375px. One was mine and I nearly shipped it as a
defect report.

**An empty card under the booking panel.** `VenueChatButton` returns `null`
when the viewer owns the venue — but the `rounded-2xl border bg-card p-4`
wrapper was at the call site and rendered regardless, so an owner looking at
their own listing got a bordered grey box with nothing in it. The chrome now
lives inside the component, where the early return takes it with it.

**"Closed on this day." for a venue that is open.** The panel printed that
sentence whenever the slot list came back empty, which collapses three
different situations into one wrong one: shut that weekday, open but fully
booked, and the availability lookup failing outright. The third is the same
class of bug as `OwnerVenuesPage` telling an owner they have no venues because
a request errored. The page even contradicted itself on screen — "Closed on
this day" in the panel, `08:00 – 23:00` under Operating Hours an inch to the
left. Now: an error state with a retry, "Fully booked on this date" when the
hours say the venue is open, and "Closed on this day" only when it actually is.

**Operating Hours read across the columns instead of down them.** Seven
`flex justify-between` cells in a three-column grid push every time hard right,
against the *next* day's label, so the block scanned as "08:00 – 23:00 Monday".
Two columns, each row on its own tinted background to bind label to value, and
today marked — which is the question anyone reading opening hours is asking.

**The Reserve button was 1,190px down a 3,342px page on a phone**, below the
description, the hours, the amenities and every review. The only call to action
on the venue's own listing, four screens below the fold. There is now a sticky
bottom bar with the price and a Reserve link, `lg:hidden` because the sticky
sidebar covers desktop.

That bar immediately re-created a collision this file already documents: the
floating AI launcher is `fixed` bottom-right at `z-50` and landed on top of the
new Reserve button, clipping the label to "Rese…" and taking the taps — exactly
what the desktop sidebar's `z-[60]` was added to prevent. Rather than another
one-off z-index, the launcher now reads a `--fab-lift` variable that a page
opts into with `body.has-mobile-action-bar`, scoped by media query so the lift
does not exist at `lg` where there is no bar.

### The one I nearly got wrong

The header showed "4.3 (3 reviews)" while the stub venue row said `rating: 4.8`
and `review_count: 37`, and I started writing it up as the venue page
disagreeing with the venue card. It is not. The page derives the headline from
the reviews it renders, deliberately, and the reason is in a comment directly
above the code. The mismatch was my *stub* being internally inconsistent — I
had written a venue row and a review list that did not agree with each other.
Fifth false positive of this kind; the pattern is always the same, which is
that a discrepancy on screen is evidence of a discrepancy somewhere, not
evidence of which side is wrong.

### Correction: the right rail is not empty

An earlier version of this section said the rail was "roughly 1,100px of
nothing" below the sticky booking card, and called it an opportunity for a map,
an owner card and similar venues.

**That was wrong, and it is the same mistake as the rating one two paragraphs
up.** The card is `sticky top-24`; it follows the scroll. A `fullPage`
screenshot composites the page at scroll offset 0, which is exactly where a
sticky element looks abandoned at the top of a long column. Scrolled to
y=1100 in a real 900px viewport, the card is beside the reviews where it
belongs and the rail is doing its job.

Sixth false positive of the session, and the second in the same round. The
tell, every time, is that I read a rendering as evidence of a defect without
first asking what else could produce that rendering. Recorded here rather than
quietly deleted, because the pattern is the finding.

---

## Round: what a disabled lint rule was hiding

Deleting the dead `nextMove` object from `PlayerDashboard` should have dropped
the lint warning count by one. It did not move — 166 before, 166 after. That is
because `@typescript-eslint/no-unused-vars` was set to `"off"`.

Turned on, it reported **132 violations**. Most were unused imports. Six were
not.

**The owner's pricing page showed invented numbers.** `OwnerPricingPage` seeded
its Dynamic Pricing table with three hardcoded rules — "Standard Rate ֏10,000",
"Weekend Premium ֏15,000", "Morning Special ֏8,000" — rendered in a table with
an Actions column, directly beneath the venue's *real* base rate. Identical for
every owner and every venue, unrelated to `venues.price_per_hour`, and
`setPriceRules` was never called so they could not be edited or deleted either.
An owner reading that page would reasonably conclude their venue charges
֏15,000 at weekends. There is no pricing-rules table in the schema; the feature
does not exist. The page now shows the empty state that was already written and
never reachable, and the "Add Rule" button says it is unavailable instead of
doing nothing silently.

**Blocking two hours closed the venue for the whole day.** `BlockTimeDialog`
offers `blockType: "time" | "full_day"` and defaulted to `"time"`.
`handleBlockTime` ignored the field entirely: every block went to
`addBlockedDate`, which writes a row to `blocked_dates` — a table holding a date
and nothing else — with the requested range pasted into the free-text `reason`
column as `"Blocked: 18:00 - 20:00"`. `get_available_slots` returns zero rows
for any date it finds in that table. So an owner closing 18:00–20:00 for
maintenance lost every bookable hour that day, was told "Time blocked
successfully", and left no machine-readable record of what they actually meant.

`WeekCalendar` accepted a `blockedSlots` prop, defaulted it, never read it, and
no caller ever passed it — the residue of the partial-day feature that was
never built. Partial blocking now needs a schema change to support, so it is
written down in the handover; meanwhile the dialog says so rather than
destroying a day.

**Two admin tabs with no way in.** `FieldSubmissionsTab` and
`CandidateFieldsTab` were lazy-imported into `AdminDashboard` with no
`TabsTrigger`, no `TabsContent` and no route. Both components exist and work.
Wiring them up or deleting them is a product call, so the dead imports went and
the question is in the handover.

**Two queries whose results were thrown away.** `AdminDashboard` called
`useAllGames()` — every game in the system — on every load and read nothing
from it. `ai-game-matchmaking` fetched the caller's past games "for pattern
matching" and never referenced them, one round trip per invocation.

### The bug this round introduced, and caught

Wiring `blockedDates` — fetched by `VenueDetailsPage` and, per the same lint
rule, never used — exposed that the "Fully booked on this date" copy added
earlier *today* was wrong for owner-blocked dates. Weekly hours say open, slots
come back empty, so it confidently reported the wrong reason. There are now
three distinct messages for three distinct causes: closed that weekday, closed
by the owner on that date, and genuinely full.

The rule is now `"error"` rather than `"off"`, so the next one fails CI. 132 →
0. Prefix with `_` to keep something deliberately unused.
