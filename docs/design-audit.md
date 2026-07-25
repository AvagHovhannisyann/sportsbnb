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

## Verified clean

- **No horizontal overflow** at 375px or 768px. `scrollWidth === clientWidth`
  at both. The elements extending past the viewport are decorative blur layers
  inside `overflow-hidden` parents — intentional and contained.
- **`AIChatbot` launcher** already carried `aria-label="Open AI assistant"`.

## Open

Ordered by leverage, not by effort.

1. **Section density on the remaining pages.** Home is now 4427px; For Owners is
   still 7744px. This is a content-per-screen problem, not a spacing one, and it
   is the main thing still making those pages feel empty.
2. **`֏` depends on system font fallback.** Neither JetBrains Mono nor DM Sans
   carries U+058F, so every price falls through to whatever the OS supplies —
   in this headless container that renders as a wrong glyph. It affects the
   whole app equally (`src/lib/pricing.ts` is the single source), so the fix is
   one webfont subset with Armenian coverage, not per-page edits. Left alone
   rather than diverging the landing page from `formatPrice`.
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
