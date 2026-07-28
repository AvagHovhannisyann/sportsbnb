## Games, teams & community

Scope: the seven real routes this section can touch, all declared in
`src/App.tsx:152-173` —

```
/games              src/pages/GamesPage.tsx              (public)
/community          src/pages/CommunityPage.tsx          (public)
/game/:id           src/pages/GameDetailsPage.tsx        (public)
/game/:id/join-status  src/features/booking/GameJoinStatusPage.tsx  (protected)
/teams              src/pages/TeamsPage.tsx              (public)
/create-team        src/pages/CreateTeamPage.tsx         (protected)
/team/:id           src/pages/TeamDetailsPage.tsx        (public)
```

Every one of them except `HomePage` is `lazy()` (`App.tsx:23-33`) behind the
`PageLoader` spinner at `App.tsx:111-115`.

### What this section is built from

**Real components, cited by path.** The two this section leans on hardest are
`src/pages/GameDetailsPage.tsx` (652 lines — the join panel, the pending-request
queue and the player roster all live in it) and
`src/components/teams/TeamCard.tsx` (168 lines — the roster meter and its
skeleton twin).

**Real state.** Nothing below invents a state the app does not already render:

```
GamesPage.tsx:469   isLoading → 6 × GameCardSkeleton, else grid, else ErrorPanel, else EmptyState
           :174     viewMode "grid" | "map"
           :462-467 FilterChips, 0–4 chips, each individually removable
GameDetails.tsx:531-625  isCancelled | isHost | isParticipant | isPendingParticipant | (default)
           :398-454 pending queue — host only, mounts when pendingParticipants.length > 0
           :457-491 confirmed roster grid
           :48      isProcessingPayment
TeamCard.tsx:26-33  fill (0–1), isFull, rosterLabel "N spots open" | "Full squad" | "Roster unavailable"
TeamForm.tsx:62     isGeneratingLogo;  :193 logo preview mounts only when logoUrl is set
TeamDetails.tsx:139 isLoading → full-page Loader2, else team card + members
```

**framer-motion is installed** — `framer-motion: ^12.34.3` in
`package.json`. It is currently imported by exactly four files
(`src/lib/motion.ts`, `src/components/ui/container-scroll-animation.tsx`,
`src/pages/HomePage.tsx`, `src/pages/ForOwnersPage.tsx`), so every case below
that reaches for it is adding the first use of it in this part of the app —
weigh that against the CSS option each time. **Remotion is not installed** and
nothing here proposes it.

**The shared vocabulary already exists** in `src/lib/motion.ts`: `easeOutExpo =
[0.16, 1, 0.3, 1]`, `transitionFast` 150ms, `transitionBase` 250ms,
`transitionSlow` 400ms, plus `fadeUp`, `scaleIn`, `staggerChildren`
(`staggerChildren: 0.07`, `delayChildren: 0.05`) and `tapScale = { scale: 0.97
}`. Use these rather than restating numbers, and mirror them in CSS via the
tokens they were derived from — `src/index.css:135-140`:

```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);
--dur-fast: 150ms;  --dur-base: 250ms;  --dur-slow: 400ms;
```

**Brand.** Dark ships. `--primary: 151 90% 47%` (electric court-green),
`--success: 151 80% 44%`, `--warning: 42 95% 55%`, `--destructive: 358 72% 68%`,
`--radius: 0.875rem`, `--surface-3: 158 13% 18%` (`index.css:172,192-193,188,89,160`).
Existing keyframes worth reusing rather than rewriting: `fade-in` (opacity 0 +
`translateY(8px)` → 0, 0.4s) and `shimmer` (background-position −200% → 200%,
2s linear infinite) in `tailwind.config.ts:110-124`, and `live-ping` in
`index.css:578-581`.

**Reduced motion.** `index.css:619-630` already neutralises `.live-dot` and
`.card-lift`. `src/lib/motion.ts:3-20` records that framer-motion entrances in
this app resolve to their final state under `reduce`. Every case below still
gates explicitly with `useReducedMotion()` or a `@media (prefers-reduced-motion:
reduce)` block, so the fallback does not depend on that measurement continuing
to hold.

### One thing to fix before any of this

`useGames` keys on the filter object itself — `queryKey: ["games", filters]`
(`src/hooks/useGames.ts:71`) — and `GamesPage.tsx:282-287` writes `searchQuery`
straight from `onChange` with no debounce. So typing `bas` mints three cold
query keys, and each one puts `isLoading: true` back on the page, which at
`GamesPage.tsx:469-480` tears the whole grid down and replaces it with six
skeletons. Per keystroke.

No transition survives that, and adding one would only make the strobing
prettier. Debounce the search term into the query key (250ms is the same
`--dur-base` everything else uses) and keep the previous page's rows on screen
while the next set resolves — react-query's `placeholderData: (prev) => prev`.
Cases 91 and 92 assume that has been done; without it they are unbuildable.

---

### 91. The grid answers the filter, instead of being replaced by one

- **Where**: `/games` → `src/pages/GamesPage.tsx` — result region `:469-490`,
  the count line `:444-446`, `useGames(...)` call `:178-189`.
- **Motion**: with `placeholderData` in place, `isFetching && !isLoading` is
  true while the new set resolves. During that window the grid container drops
  to `opacity: .5` and the count line above it (`{games.length} games looking
  for players`) drops to `opacity: 0`. When the new array lands, the count line
  returns to 1 and each card runs `opacity 0 → 1, translateY(8px) → 0`,
  staggered 30ms and capped at the first eight cards — cards nine onward appear
  at their final state, because a 40-result stagger is a 1.2-second wait for the
  bottom of the list. What the user understands: the rows in front of them are
  the answer to the filter they just changed, and the answer has finished
  arriving. Right now a filter change and a slow network are indistinguishable —
  both look like "the page is the same".
- **Timing**: dim out 120ms `cubic-bezier(.4,0,1,1)`; cards in 260ms
  `cubic-bezier(0.16,1,0.3,1)` (`--ease-out-expo`), 30ms stagger, 8 items max.
- **Build**: CSS/Tailwind. The dim is one class toggled off `isFetching`; the
  entrance is the existing `animate-fade-in` (`tailwind.config.ts:110-113,122`,
  already opacity + `translateY(8px)`) with an inline
  `style={{ animationDelay: `${Math.min(i,7)*30}ms` }}`. No new dependency for
  what is one keyframe the config already ships.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce) { .games-grid >
  * { animation: none; } }` — cards appear at final state, no delay. Keep the
  opacity dim: it is a 120ms fade with no transform and it is the only thing
  telling a user their filter is still in flight. Fading is not the class of
  motion `reduce` is about.
- **Perf**: opacity and transform only. The stagger cap matters — an
  uncapped `animationDelay` on 40 cards keeps 40 elements on the compositor for
  1.2s. No layout properties touched.

---

### 92. A filter chip leaves, and closes its own gap

- **Where**: `/games` → `FilterChips` rendered at `GamesPage.tsx:462-467`,
  component `src/components/ui/filter-chips.tsx:44-69`; removal handler
  `clearGameFilter` at `GamesPage.tsx:253-258`.
- **Motion**: pressing a chip removes it from `activeFilters`
  (`GamesPage.tsx:241-250`) and the row reflows instantly — the chips to its
  right jump left in one frame, and with four chips it is genuinely unclear
  which one went. Instead: the pressed chip scales `1 → 0.9` and fades `1 → 0`
  in place over 140ms, then the row closes the gap over 200ms with the survivors
  sliding to their new x. And when `chips.length` drops from 2 to 1, the "Clear
  all" button is unmounted by `filter-chips.tsx:64` — it should fade out on the
  same 140ms rather than vanishing mid-reflow. What the user understands: the
  filter they dropped was the one they pressed, and the ones still narrowing the
  list are the ones still on screen.
- **Timing**: chip exit 140ms `cubic-bezier(.4,0,1,1)`; reflow 200ms
  `cubic-bezier(0.16,1,0.3,1)`, starting as the exit ends.
- **Build**: framer-motion. `<AnimatePresence>` around the `chips.map`, each
  chip a `motion.button` with `layout` and `exit={{ opacity: 0, scale: 0.9 }}`.
  The horizontal reflow is the whole point and CSS cannot do it — an element
  leaving normal flow has no transition to animate, and a max-width collapse
  hack animates a layout property. `layout` writes transforms.
- **Reduced motion**: `const reduce = useReducedMotion()` in `FilterChips`;
  when true, drop `layout` off the chips and pass `exit={{ opacity: 0 }}` with
  `transition={{ duration: 0.1 }}`. The chip fades, the row snaps — which is
  exactly today's behaviour minus the abruptness.
- **Perf**: `layout` animates transform, but it does read
  `getBoundingClientRect()` for every chip on each removal. That is at most five
  elements on a single row and it happens on click, not on scroll — acceptable.
  Do not extend the same `layout` prop to the games grid below: 40 measured
  cards per keystroke is the layout thrash this is a warning about.

---

### 93. Grid and map are one set of games, not two pages

- **Where**: `/games` → `ToggleGroup` at `GamesPage.tsx:448-455`, branch at
  `:482-490`, map component `src/components/games/GamesMapView.tsx:41-98`.
- **Motion**: the map container is a fixed `height: "600px"`
  (`GamesMapView.tsx:43`); the grid is whatever six-to-forty cards need. Today
  the toggle swaps one for the other in a single frame and the page height jumps
  by a screen or more, so the scroll position lands somewhere unrelated. Fix the
  results region to the outgoing view's measured height, crossfade grid out
  (140ms) and map in (200ms, starting at 60ms so the two overlap), then animate
  the container height to the incoming view's height over 260ms and release it
  to `auto`. What the user understands: these are the same games, redrawn — not
  a navigation. The overlap is what carries that; a hard cut reads as a page
  change.
- **Timing**: out 140ms `cubic-bezier(.4,0,1,1)`; in 200ms `--ease-out-expo`
  delayed 60ms; height 260ms `--ease-out-expo`.
- **Build**: framer-motion. `<AnimatePresence mode="popLayout">` on the two
  branches plus a `motion.div` wrapper with `layout` for the height. Doing this
  in CSS needs the incoming height before it is rendered, which means measuring
  it yourself — that is the thing `layout` exists to stop you writing.
- **Reduced motion**: `useReducedMotion()` → skip `AnimatePresence` entirely and
  render the branch directly, as today. Keep one concession that is not motion:
  `scrollIntoView({ block: "start", behavior: "auto" })` on the results heading
  after the swap, so a 600px height change does not leave the user staring at
  the footer.
- **Perf**: the crossfade is opacity only. The height animation is the flagged
  risk — animating `height` triggers layout on every frame, and inside it sits a
  Google Maps canvas that reflows with its container. Mitigate by animating
  height on the *wrapper* while the map keeps its fixed 600px, so only one
  element relayouts and the map never sees an intermediate size.

---

### 94. The join panel is five screens in one slot

- **Where**: `/game/:id` → `src/pages/GameDetailsPage.tsx` — the sticky sidebar
  card `:496`, its title `:503`, the spots badge `:504-506`, and the action
  block `:531-625` which is a five-way ternary: `isCancelled` → `isHost` →
  `isParticipant` → `isPendingParticipant` → default.
- **Motion**: on a free game, pressing "Request to Join" resolves
  `requestToJoin` (`useGames.ts:306`), which invalidates `["game", id]`
  (`:348-352`); the refetch flips `isPendingParticipant` and the button is
  *replaced* — new label, new disabled state, new second button underneath, all
  in the frame the query settles. The only acknowledgement is a sonner toast
  that is gone in four seconds. Instead: the outgoing block fades `1 → 0` and
  lifts `0 → -6px` over 130ms; the incoming block fades in and settles from
  `+6px` over 220ms; the card's own height animates between the two (the pending
  state is two buttons tall, the default is one). In parallel the title at `:503`
  crossfades "Join Game" → "You're in" on the same 220ms — same slot, so it must
  not slide. What the user understands: the request landed, this panel is now
  about waiting rather than joining, and the change is a consequence of what
  they just pressed.
- **Timing**: out 130ms `cubic-bezier(.4,0,1,1)`; in 220ms
  `cubic-bezier(0.16,1,0.3,1)`; height 220ms, same easing, run concurrently with
  the incoming block.
- **Build**: framer-motion. `<AnimatePresence mode="wait">` keyed on a derived
  `panelState` string (`"cancelled" | "host" | "in" | "pending" | "open"`), with
  the card body wrapped in a `layout` motion.div for the height. `mode="wait"`
  is what buys the clean 130ms/220ms sequence; CSS would need both blocks mounted
  and absolutely positioned, which breaks the sticky card's height.
- **Reduced motion**: `useReducedMotion()` → `transition={{ duration: 0 }}` on
  the height and `exit`/`initial` reduced to opacity `0 → 1` over 100ms. The
  panel still visibly changes; it just does not move. The toast at `:165` stays
  either way — it is the only thing that reaches a screen reader, and it should
  not be load-bearing for sighted users either.
- **Perf**: opacity + transform on the blocks; the height animation is a real
  layout cost, but it is one sticky card, once per state change, and the card is
  `position: sticky` so it does not push page content. Do not put `layout` on
  the whole sidebar — the `<ChatButton>` at `:629` and the share button below it
  do not need measuring.

---

### 95. Pay & Join: the last frame before the bank

- **Where**: `/game/:id` → `GameDetailsPage.tsx:121-160` (`handleRequestToJoin`,
  paid branch), button at `:604-624`, `isProcessingPayment` state `:48`.
- **Motion**: for a paid game this does not open a page — it either builds a
  hidden `<form>` and calls `form.submit()` (`:131-147`) or assigns
  `window.location.href` (`:149-151`). Either way the next paint belongs to
  Ameria or Idram, and there is no interstitial to animate. Between the click
  and that paint the app currently shows a spinner inside a button on an
  otherwise fully live page, so a second click, a filter, or the back gesture
  all still look available. Instead: on `setIsProcessingPayment(true)`, a scrim
  fades in over the sidebar card only (`hsl(var(--background) / 0.72)`, opacity
  `0 → 1` over 160ms), the button label crossfades to "Taking you to the bank…",
  and the card's border colour transitions to `hsl(var(--primary) / 0.4)` over
  the same 160ms. Nothing pulses and nothing loops — a looping animation on a
  handoff that may complete in 400ms reads as a hang. What the user understands:
  this page has stopped being interactive because it is about to stop being
  this page.
- **Timing**: 160ms `cubic-bezier(0.16,1,0.3,1)` for scrim, label and border,
  all one transition.
- **Build**: CSS/Tailwind. Three properties on two elements, driven by one
  boolean already in state. Reaching for framer-motion here would add the
  library to `GameDetailsPage` for a fade.
- **Reduced motion**: the scrim appears at `opacity: 1` with no transition —
  `@media (prefers-reduced-motion: reduce) { .pay-scrim { transition: none; } }`.
  The block itself is not decoration; removing it would remove the only signal
  that the page is now inert.
- **Perf**: opacity and `border-color`. `border-color` is a paint, not a
  layout — safe on a single card. Do not animate `backdrop-filter` here even
  though `.glass` exists (`index.css:430-439`): the scrim covers a sticky
  element and blur on a sticky container forces a new stacking context mid-
  transition on Safari.

---

### 96. Approve moves a person into the squad **[HIGH IMPACT]**

- **Where**: `/game/:id` → `GameDetailsPage.tsx` — pending queue `:398-454`
  (host only), confirmed roster `:457-491`, handler `handleApprove` `:193-204`,
  mutation `useApproveParticipant` (`src/hooks/useGames.ts:385-416`).
- **Motion**: this is the same person rendered twice, sixty pixels apart, by two
  different loops — avatar plus name in a pending row at `:413-449`, avatar plus
  name in a roster tile at `:472-485`. Approving invalidates `["game", id]`
  (`:412-415`) and on refetch the row disappears from one list and a tile
  appears in the other, with no relationship drawn between them. Instead: give
  the avatar+name pair a shared identity so approval *moves* it — the pending
  row's approve/reject buttons fade out (110ms), the row's avatar and name
  travel to their position in the roster grid (320ms), the roster grid reflows
  to make room, the vacated row height collapses, and the "Players (n/max)"
  heading at `:458-460` increments as the traveller lands. What the user
  understands: approving is not a form submission, it is admitting a person to
  the squad — and the roster is now one closer to full. This is the moment the
  whole feature exists for, and today it is indistinguishable from a list
  refresh.
- **Timing**: buttons out 110ms `cubic-bezier(.4,0,1,1)`; travel 320ms
  `cubic-bezier(0.16,1,0.3,1)`; queue row collapse 200ms same easing, starting
  at 120ms; heading count crossfade 180ms at the end of the travel.
- **Build**: framer-motion, and only framer-motion. `layoutId={`p-${participant.user_id}`}`
  on the avatar+name element in *both* loops, both wrapped in `<AnimatePresence>`
  — that is the entire mechanism, and it is the one thing CSS cannot express,
  because the two elements are in different DOM subtrees with different
  ancestors. Requires optimistic handling: `useApproveParticipant` currently
  waits for a server round trip before either list changes, so add
  `onMutate` that moves the participant between `participants` and
  `pending_participants` in the `["game", id]` cache and rolls back on error.
  Without that the travel starts ~400ms after the click and reads as unrelated.
- **Reduced motion**: `useReducedMotion()` → drop `layoutId` from both elements
  (passing `layoutId={reduce ? undefined : ...}` disables the shared transition
  cleanly) and let the row and tile swap instantly. The count still updates and
  the toast at `:200` still fires, so nothing is lost but the travel.
- **Perf**: `layoutId` animates transform and opacity — no layout properties on
  the moving element. The measured cost is the FLIP read on both lists at the
  start of the transition: with a 22-player roster that is ~25
  `getBoundingClientRect()` calls in one frame, on a click. Fine. It would not
  be fine if it ran on every refetch, so key the transition to the mutation, not
  to data identity.

---

### 97. The roster meter fills from where it was

- **Where**: `/teams` → `src/components/teams/TeamCard.tsx` — meter `:113-124`,
  `fill` computed `:26`, `rosterLabel` `:29-33`, skeleton twin `:144-165`.
  Also rendered on the "My Teams" and "Browse" grids at
  `src/pages/TeamsPage.tsx:145-162,259-263`.
- **Motion**: the bar carries `transition-[width] duration-300` (`:119`) but its
  width comes from an inline style on an element that mounts with that width
  already set — so the transition never fires on first paint. Coming out of
  `TeamCardSkeleton`, six meters snap from 0 to their value with no motion at
  all, and the one time the class *does* fire is a re-render, where it animates
  a layout property. Both halves are wrong. Rebuild the bar as a full-width
  child with `transform: scaleX(var(--fill)); transform-origin: left`, mounted at
  `scaleX(0)` and raised to its real value on the frame after mount; then
  `rosterLabel` ("7 spots open") crossfades in as the bar settles. What the user
  understands: how full this squad is, as a quantity that grew to that point —
  and, across a grid, which teams are nearly full at a glance, because six bars
  growing at once are readable in a way six static bars are not.
- **Timing**: 520ms `cubic-bezier(0.16,1,0.3,1)` for the scale, 40ms stagger per
  card capped at six; label crossfade 200ms starting at 300ms.
- **Build**: CSS/Tailwind. `transition: transform 520ms var(--ease-out-expo)`
  plus a `--fill` custom property set inline from the existing
  `Math.min(members / size, 1)`. A `useEffect`-free version works: render at
  `scaleX(0)` and add the value in a `requestAnimationFrame`. No library, and
  the component stays presentational.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce) { .roster-meter
  { transition: none; } }` — the bar paints at its final width immediately, and
  the label appears with it. The numeric roster is already stated as text
  directly above (`:98-101`), so nothing is only carried by the bar; the
  existing `aria-hidden="true"` at `:116` stays correct.
- **Perf**: this case is here *because* of layout thrash. `transition-[width]`
  on the current markup relayouts the meter's parent chain on every frame, and
  `TeamsPage` renders up to nine of these at once. `scaleX` is composited. Flag
  the same pattern anywhere else it appears before copying it.

---

### 98. The logo slot exists before the logo does

- **Where**: `/create-team` (and `/team/:id/edit`, same component) →
  `src/features/teams/TeamForm.tsx` — `handleGenerateLogo` `:68-92`,
  `isGeneratingLogo` `:62`, preview `:193-201`, generate button `:212-225`.
- **Motion**: the preview block is mounted only when `values.logoUrl` is truthy
  (`:193`), so an AI generation that takes several seconds ends with a 96px
  image plus its wrapper appearing above the prompt field and shoving the whole
  card — prompt, upload target, visibility radios, submit button — down by
  ~120px. If the user was reaching for "Upload image" they now miss it. Instead:
  mount the 96×96 slot the moment `isGeneratingLogo` goes true, filled with a
  `bg-surface-3` rounded-xl block running the existing `shimmer` animation
  (`tailwind.config.ts:114-117,123`); when `logoUrl` arrives, the image
  crossfades over the placeholder in the same box — opacity `0 → 1` over 260ms
  with a `scale(1.03) → 1` settle. Nothing below it ever moves. What the user
  understands: the thing being generated will appear *there*, it is 96px square,
  and the page is not about to rearrange itself under their cursor.
- **Timing**: slot appears instantly (no entrance — it is reserving space, not
  announcing itself); shimmer 2s linear infinite, already defined; image in
  260ms `cubic-bezier(0.16,1,0.3,1)`.
- **Build**: CSS/Tailwind. `animate-shimmer` is already in the config, the
  crossfade is two absolutely-positioned children in one 96px box. No library.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` sets
  `animation: none` on the shimmer — the slot becomes a flat `bg-surface-3`
  square, which still reserves the space, which is the entire point — and drops
  the image transition to `opacity 1`. Pair it with a `role="status"` on the
  slot carrying "Generating team logo", because today the only feedback for a
  multi-second wait is a spinner glyph inside a button (`:219-223`).
- **Perf**: opacity and transform only; `background-position` on the shimmer is
  a paint on a 96px box, which is the cheapest possible version of that effect.
  Reserving the box is itself the layout fix — it removes a ~120px reflow of the
  form rather than animating one.

---

### 99. The team you just made is already there

- **Where**: `/create-team` → `src/pages/CreateTeamPage.tsx:15-33`, submit
  button `src/features/teams/TeamForm.tsx:286-303`, arrival
  `src/pages/TeamDetailsPage.tsx:139-147` (loading) and `:180-278` (team card).
  Mutation `useCreateTeam` at `src/hooks/useTeams.ts:230-267`.
- **Motion**: `useCreateTeam` returns the full inserted row (`useTeams.ts:260`)
  but its `onSuccess` (`:262-265`) invalidates only `["teams"]` and
  `["user-teams"]` — it never seeds `["team", team.id]` (key at `:83`) or
  `["team-members", team.id]` (`:100`). So `navigate(\`/team/${team.id}\`)`
  (`CreateTeamPage.tsx:29`) lands on a lazy chunk, then a full-page 32px spinner
  (`TeamDetailsPage.tsx:142-144`), to fetch a team the client is holding in a
  local variable. Seed both caches in `onSuccess` — the team from the mutation
  result, the members array as the single captain row it just inserted
  (`useTeams.ts:254-258`) — and the destination renders populated on first
  paint. Then the motion is worth having: the team card at `:180` enters with
  opacity `0 → 1` and `translateY(12px) → 0`, and inside it the 80px avatar
  (`:183-188`) settles from `scale(0.92)` while the name, sport badge and
  member count follow on a 60ms stagger. What the user understands: creation
  succeeded and this is the thing they made — rather than "submitted, now wait,
  now here is a page".
- **Timing**: card 300ms `cubic-bezier(0.16,1,0.3,1)`; avatar 340ms
  `cubic-bezier(0.34,1.56,0.64,1)` (`--ease-spring` — the one place in this
  section where a slight overshoot is right, because this is a completion);
  children 220ms each, 60ms stagger.
- **Build**: framer-motion, using `staggerChildren` and `fadeUp` already
  exported from `src/lib/motion.ts:28-46` — a `motion.div variants={staggerChildren}`
  around the card with `motion.div variants={fadeUp}` on the three text rows.
  Reuses the app's existing vocabulary instead of inventing a second one in CSS.
- **Reduced motion**: `useReducedMotion()` → render the card without the
  `variants` props at all; everything is at its final state on first paint. The
  cache-seeding fix is independent of motion and stands on its own — a page that
  spins for a second before showing data you already have is a bug under any
  motion preference.
- **Perf**: transform and opacity. Gate the entrance on "arrived from create" —
  e.g. `navigate(..., { state: { justCreated: true } })` read via
  `useLocation()` — so `/team/:id` opened from a shared link or the teams grid
  does not replay a celebration for a team the visitor had no hand in making.

---

**[HIGH IMPACT] — case 96.** It is the only case here that changes what the user
believes rather than how smoothly they see it. `/games`, `/teams` and
`/create-team` are browse and form surfaces where motion improves comprehension
at the margin; the approve action on `GameDetailsPage` is the product's core
transaction — a host deciding who plays — and it currently renders as two
unrelated lists changing at once. Making the person visibly move from the
request queue into the squad is the difference between "the data updated" and "I
just let someone into my game", and the `layoutId` that does it is roughly
fifteen lines across two existing loops.
