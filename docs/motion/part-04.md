## Search, filters & discovery

Scope: `/venues` (`src/pages/DiscoverPage.tsx`), its search box
(`src/components/search/SmartSearch.tsx`), its chip row
(`src/components/ui/filter-chips.tsx`), its sort control, and the one real
map/list toggle in the app (`src/pages/NearbyFieldsPage.tsx`).

What is actually available to build with, checked against the repo rather than
assumed:

- **framer-motion `^12.34.3` is installed** and already used in
  `src/pages/HomePage.tsx`, `src/pages/ForOwnersPage.tsx` and
  `src/components/ui/container-scroll-animation.tsx`. A shared vocabulary
  already exists in `src/lib/motion.ts` (`easeOutExpo = [0.16, 1, 0.3, 1]`,
  `transitionFast/Base/Slow` = 150/250/400ms, `fadeUp`, `scaleIn`,
  `staggerChildren` at 0.07s, `tapScale`). Reuse it; do not invent a second one.
- **Remotion is not in `package.json`.** Nothing below proposes it.
- CSS motion primitives live in `src/index.css:135-140`:
  `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`,
  `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`,
  `--dur-fast: 150ms`, `--dur-base: 250ms`, `--dur-slow: 400ms`.
- `tailwindcss-animate` is a plugin (`tailwind.config.ts:158`), so
  `animate-in / fade-in-0 / zoom-in-95 / slide-in-from-top-1 / duration-*` are
  available without new dependencies. Existing keyframes are only `fade-in`,
  `shimmer`, `accordion-down/up` (`tailwind.config.ts:101-124`).
- The global reduced-motion block is `src/index.css:619-630` and currently
  covers exactly two things: `.live-dot::after` and `.card-lift`. Every new CSS
  animation below must be added to that block — it is the app's only CSS-side
  escape hatch. framer-motion cases use `useReducedMotion()`, the pattern
  already in `HomePage.tsx:11`.

---

### 28. Suggestion panel: open and close

- **Where**: `/venues` (and anywhere `SmartSearch` is mounted — it is mounted at
  `src/pages/DiscoverPage.tsx:372-376`). The panel is
  `src/components/search/SmartSearch.tsx:317-360`.
- **Motion**: The dropdown currently appears by raw mount — `{isOpen &&
  suggestions.length > 0 && <div class="absolute z-50 …">}` — so four grouped
  sections and a footer hint materialise in one frame, 2px below a 48px input.
  Instead: the panel's `opacity` goes `0 → 1` and `translateY` goes `-6px → 0`,
  while the inner `max-h-80` scroller's first paint is already complete. The
  user understands *this list belongs to the field I am typing in* — the
  downward travel makes the input the origin, which matters because the panel is
  `position: absolute` and otherwise reads as an unattached overlay floating
  over the sticky results header. On close (Escape, click-outside, or a
  selection at `SmartSearch.tsx:212-215`) it is opacity `1 → 0` only, no
  travel: leaving is not a place the eye needs to follow.
- **Timing**: In 160ms `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease-out-expo`).
  Out 110ms `cubic-bezier(0.4, 0, 1, 1)` — deliberately faster and
  ease-in, because on selection the route change at
  `SmartSearch.tsx:219-233` fires immediately and a lingering panel would sit
  over the next page.
- **Build**: Tailwind + `tailwindcss-animate` — `animate-in fade-in-0
  slide-in-from-top-1 duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]` on the
  existing panel `div`. No framer-motion: the exit only matters on select, and
  wrapping this in `AnimatePresence` would mean holding `suggestions` in state
  past `setSuggestions([])` (`SmartSearch.tsx:214`) purely to animate it out.
  Not worth the state complication; accept an instant close on select.
- **Reduced motion**: Add `.search-panel-enter { animation: none; }` to the
  `@media (prefers-reduced-motion: reduce)` block at `src/index.css:619`, or
  gate the classes off `matchMedia`. Panel appears at final opacity and
  position — no fade, no travel. Nothing is lost; the panel is already
  announced by content, and the keyboard hint row (`SmartSearch.tsx:356-358`)
  carries the affordance.
- **Perf**: `transform` + `opacity` only. The panel is `absolute`, so it never
  reflows the sticky search header (`DiscoverPage.tsx:367`) or the results grid
  below it. No layout-thrash risk.

---

### 29. Keyboard cursor rail in the suggestion list

- **Where**: `/venues` → `src/components/search/SmartSearch.tsx:326-350` (the
  `<li>` whose class flips to `bg-accent text-accent-foreground` when
  `globalIndex === selectedIndex`).
- **Motion**: Today Arrow-Down repaints the highlight in a new row with only
  `transition-colors` — one block goes grey, another goes accent, and across a
  grouped list (Sports / Venues / Games / Locations headers interleaved,
  `SmartSearch.tsx:320-324`) the eye loses which row it was on. Add a single
  3px-wide `bg-primary` rail pinned to the left inside-edge of the highlighted
  row that *slides* vertically from the old row to the new one, and let the
  background wash keep its existing colour crossfade. The user understands the
  cursor is one object moving through a list, not a list of independently
  lighting rows — which is the whole point of a keyboard cursor and the reason
  the row-height jumps across group headers stop being disorienting.
- **Timing**: 120ms `cubic-bezier(0.16, 1, 0.3, 1)` for the rail's `y`.
  Background wash stays on the existing `transition-colors` (Tailwind default
  150ms). 120ms is deliberately under the wash so the rail leads and the colour
  settles behind it; anything above ~160ms lags behind held Arrow-Down key
  repeat (~30ms interval after the initial delay) and the rail visibly trails
  the selection.
- **Build**: framer-motion. `<motion.span layoutId="smartsearch-cursor" />`
  rendered inside the highlighted `<li>` only. This is precisely the case where
  a shared-layout id beats CSS: the rail's target `y` is whatever the DOM
  happens to be after grouping, and CSS would need a measured `transform` on a
  single absolutely-positioned element plus a `getBoundingClientRect` on every
  keystroke. `layoutId` does the FLIP for free.
- **Reduced motion**: `const reduce = useReducedMotion();` then
  `transition={reduce ? { duration: 0 } : { duration: 0.12, ease: easeOutExpo }}`.
  The rail still renders and still marks the selected row — it teleports
  instead of sliding. The affordance survives, only the travel is dropped.
- **Perf**: framer-motion's `layout` animates `transform` only here (the rail is
  a fixed 3px × row-height element, so no scale correction is needed). One
  measured element per keystroke inside a list capped at ~12 suggestions
  (2 sports + 3 venues + 3 games + 4 locations, `SmartSearch.tsx:77-113`). No
  thrash.

---

### 30. Debounce-to-network progress hairline under the search input

- **Where**: `/venues` → `src/components/search/SmartSearch.tsx:290-315`.
- **Motion**: There is a 250ms debounce (`SmartSearch.tsx:209`) before
  `searchAll` even fires, and then three parallel round-trips — a `venues`
  query, a `games` query and a `geosuggest` edge-function call
  (`SmartSearch.tsx:89-113`) — before `setIsLoading(false)`. So the spinner at
  `SmartSearch.tsx:302-304` appears *after* a dead 250ms in which the app looks
  broken. Replace the dead interval with a 2px `bg-primary` hairline pinned to
  the input's bottom edge, `transform-origin: left`, animating `scaleX`:
  `0 → 0.25` across the debounce window, then `0.25 → 0.9` while the requests
  are in flight, then `0.9 → 1` and fade out on resolve. The user understands
  *the app heard the keystroke and is working* — the current design tells them
  nothing for a quarter of a second and then shows a spinner that also spins
  when the network is fine.
- **Timing**: Phase 1 `scaleX 0 → 0.25` over 250ms `linear` (it is literally
  measuring the debounce — linear is honest, easing would lie about the rate).
  Phase 2 `0.25 → 0.9` over 900ms `cubic-bezier(0.16, 1, 0.3, 1)` — decelerating
  so it never reaches the end before the slowest of the three calls. Phase 3 on
  resolve: `→ 1` in 90ms `linear`, then `opacity 1 → 0` over 180ms with a 60ms
  hold. Total tail 330ms, short enough not to overlap the next keystroke's
  phase 1.
- **Build**: CSS/Tailwind, driven by two booleans. `isLoading` already exists at
  `SmartSearch.tsx:39`; add a `isDebouncing` set true in `handleInputChange`
  and false at the top of `searchAll`. Three utility classes with `@keyframes`
  in `src/index.css`. framer-motion would be heavier for what is one element on
  one axis with no layout involvement.
- **Reduced motion**: No hairline animation at all. Instead render the existing
  `Loader2` spinner (`SmartSearch.tsx:302-304`) from the moment
  `isDebouncing` is true rather than waiting for `isLoading` — same
  "we're working" information, delivered as a static-position element whose own
  `animate-spin` is a rotation the user has already accepted app-wide, or
  swapped for the text "Searching…" if you want to be strict. Add
  `.search-progress { animation: none; opacity: 0; }` to `src/index.css:619`.
- **Perf**: `transform: scaleX` + `opacity`, both compositor-only. The hairline
  is `absolute inset-x-0 bottom-0` inside the existing `relative` wrapper at
  `SmartSearch.tsx:290`, so it adds no layout box. Zero thrash.

---

### 31. Filter chips entering and leaving

- **Where**: `/venues` → `src/components/ui/filter-chips.tsx:46-60`, fed by
  `describeActiveFilters` (`src/features/venues/activeFilters.ts`) and rendered
  at `src/pages/DiscoverPage.tsx:606-611`.
- **Motion**: Five filters can be active (query, sport, city, price, location)
  and chips are added and removed from the middle of a wrapping row. Today a
  removal is an instant DOM delete: every chip to the right jumps left by the
  removed chip's width plus 8px gap, and on a wrap boundary a chip can jump an
  entire line. Give each chip an enter of `opacity 0 → 1` with
  `scale 0.92 → 1`, an exit of `opacity 1 → 0` with `scale 1 → 0.90`, and make
  the *surviving* chips slide into the vacated space rather than teleport. The
  user understands which filter they just dropped and that the others are
  untouched — which is the entire reason this component exists (see its own
  docstring at `filter-chips.tsx:5-18`: the page previously dropped all five at
  once).
- **Timing**: Enter 180ms `cubic-bezier(0.34, 1.56, 0.64, 1)` (`--ease-spring`)
  — a filter arriving is a small win and can overshoot 4%. Exit 120ms
  `cubic-bezier(0.4, 0, 1, 1)`, no overshoot. Sibling reflow 220ms
  `cubic-bezier(0.2, 0.8, 0.2, 1)`, starting at the exit's 120ms mark so the gap
  closes after the chip has gone rather than under it. Note the `Clear all`
  button appears and disappears at the 1→2 chip boundary
  (`filter-chips.tsx:64`); give it the same 180/120 enter/exit so it does not
  pop.
- **Build**: framer-motion. `<AnimatePresence mode="popLayout">` around the
  `chips.map`, `<motion.button layout … />` per chip. `popLayout` is the
  specific reason to use the library here: it removes the exiting chip from
  layout flow immediately so the siblings' slide is measured against the final
  positions, which is exactly the jump being fixed. Pure CSS cannot animate a
  removed element's siblings into position without manual FLIP bookkeeping.
- **Reduced motion**: `useReducedMotion()` → pass
  `transition={{ duration: 0 }}` and drop the `scale` keys, keeping the
  `opacity` targets at their final values. Chips appear and disappear instantly
  and siblings reposition instantly, i.e. exactly today's behaviour. That is the
  correct fallback: the chip's `aria-label` (`filter-chips.tsx:54`) already
  carries the semantics without motion.
- **Perf**: `transform` + `opacity` for the chips themselves. The `layout` prop
  does force a `getBoundingClientRect` per chip per change, but the row is
  bounded at 5 chips + 1 button by `activeFilters.ts` — six measured elements,
  not a list. Safe. Do **not** put `layout` on the results grid children from
  this same commit without reading case 32 first.

---

### 32. Result grid closes the gap when a filter is removed **[HIGH IMPACT]**

**Why this one**: it is the only case here that changes what the user
*believes about the data*. Removing a filter re-runs `filteredVenues`
(`DiscoverPage.tsx:263-295`) and repaints the whole grid in one frame. A player
who drops "Basketball" and sees a different set of cards has no way to tell
which venues survived and which are new — so the honest read is "the page
reloaded", not "my search widened by nine venues". Everything else in this
section is polish on a control; this one is the difference between a filter
that feels like a query and a filter that feels like a navigation.

- **Where**: `/venues` → `src/pages/DiscoverPage.tsx:661-678` (the
  `grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` mapping
  `filteredVenues` to `src/components/venues/VenueCard.tsx`).
- **Motion**: On any change to query / sport / city / price / location, cards
  that are leaving fade `opacity 1 → 0` and drop `translateY 0 → 6px`; cards
  that stay glide from their old grid cell to their new one; cards that are
  newly matching fade `0 → 1` and rise `translateY 8px → 0` after the survivors
  have landed. The three phases must not overlap or the read inverts — a new
  card appearing while survivors are still moving looks like the grid shuffled
  randomly. Pair it with the existing `aria-live="polite"` count at
  `DiscoverPage.tsx:568-574`, which already announces "24 venues available" for
  screen readers; this is the visual equivalent of that sentence.
- **Timing**: Exit 140ms `cubic-bezier(0.4, 0, 1, 1)`. Survivor reposition
  320ms `cubic-bezier(0.16, 1, 0.3, 1)` beginning at t=140ms. Enter 200ms
  `cubic-bezier(0.16, 1, 0.3, 1)` beginning at t=340ms, with a 25ms per-card
  stagger capped at 6 cards (150ms) so a widening from 3 to 40 results does not
  run for four seconds. Total worst case 690ms.
- **Build**: framer-motion — `<AnimatePresence>` + `layout="position"` on a
  `motion.div` wrapping each `<VenueCard>`. `layout="position"` rather than bare
  `layout` is load-bearing: bare `layout` animates size too, which scales the
  card's `rounded-2xl` corners and resamples the `aspect-[3/2]` image
  (`VenueCard.tsx:63`) mid-flight. Since every card in this grid is the same
  size, position-only is both correct and cheaper. CSS cannot do this at all —
  grid reflow is not animatable.
- **Reduced motion**: `useReducedMotion()` → skip `AnimatePresence` entirely and
  render the plain `filteredVenues.map` that exists today. Not a shortened
  animation, a *removed* one: the count line at `DiscoverPage.tsx:568` and the
  chip row already state the outcome in text, so nothing is lost. Implement as
  an early branch, not as `duration: 0` on 40 motion components — the reduced
  path should also cost less.
- **Perf**: Flag. `layout` measures every animating child on every commit; at
  `xl:grid-cols-4` an unfiltered Yerevan catalogue could be 60+ cards and that
  is 60 `getBoundingClientRect` calls per filter change, synchronously, on the
  main thread. Two mitigations, both required: (a) cap the animated set — if
  `filteredVenues.length > 40`, render the plain map and skip the transition,
  because past ~40 the movement is off-screen anyway; (b) add
  `will-change: transform` only while the transition is running, via
  framer-motion's `onAnimationStart/Complete`, never as a static class — a
  permanent `will-change` on 40 cards costs a compositor layer each. The
  animation itself is transform+opacity; the measurement is the risk.

---

### 33. Sort re-rank

- **Where**: `/venues` → sort `Select` at `src/pages/DiscoverPage.tsx:585-596`,
  options from `src/features/venues/sortVenues.ts` (Recommended, Price low→high,
  Price high→low, Top rated).
- **Motion**: This is the case with no other feedback available. Changing sort
  changes neither the count, nor the chips, nor the URL in a visible way — the
  *same* 24 cards stay on screen in a different order, so a static repaint is
  genuinely indistinguishable from the control having done nothing. Every card
  travels from its old cell to its new one, and the card that becomes first
  arrives last with a 1px `ring-primary/40` that fades out. The user understands
  *the list was re-ranked and here is the new leader* — and specifically that
  nothing was filtered out, because no card left.
- **Timing**: 420ms `cubic-bezier(0.16, 1, 0.3, 1)` for the reposition —
  deliberately longer than case 32's 320ms because every card moves at once and
  a fast whole-grid shuffle reads as a glitch. Per-card delay
  `min(index * 12ms, 96ms)`, so the top-left settles first and the eye is led
  to it. The new-leader ring: `opacity 0 → 1` over 160ms at t=420ms, hold
  400ms, `1 → 0` over 300ms. Do not tint the card body; the ring is enough and
  a fill would fight the `isPromoted` treatment at `VenueCard.tsx:58-60`.
- **Build**: framer-motion, and it shares case 32's machinery — same
  `layout="position"` wrappers, different `transition` object selected by which
  state changed (`sortBy` vs. the filter set). Build 32 first; 33 is then a
  transition variant and a ring, not a second implementation.
- **Reduced motion**: `useReducedMotion()` → no movement, no ring animation.
  Instead render a static `ring-1 ring-primary/40` on the first card for
  ~1.2s using a state flag and `setTimeout`, or drop it entirely and rely on the
  existing `aria-live` region. The critical part is that the *ordering itself*
  is the answer and is fully visible without motion.
- **Perf**: Same measurement cost as case 32 and the same 40-card cap applies,
  with one addition: `compareVenues` (`sortVenues.ts`) runs inside the
  `filteredVenues` `useMemo` over the whole catalogue, so a sort change
  re-filters as well as re-sorts. That is JS cost before the animation starts —
  keep the transition's `initial` frame from being scheduled until after the
  commit, or the first 1-2 frames drop and the 420ms reads as 380ms of motion
  after a stutter.

---

### 34. Skeleton grid hands off to real cards

- **Where**: `/venues` → skeleton branch `src/pages/DiscoverPage.tsx:617-648`,
  results branch `DiscoverPage.tsx:661-678`, header copy
  `DiscoverPage.tsx:568-574`.
- **Motion**: The skeletons already match `VenueCard`'s geometry exactly — same
  `rounded-2xl border border-border bg-card`, same `aspect-[3/2]` image box
  (there is a comment at `DiscoverPage.tsx:626-632` about a 43px shift caused by
  getting that wrong). That work is wasted at the moment of handoff, because the
  swap is a hard cut. Cross-dissolve instead: skeletons `opacity 1 → 0`, real
  cards `opacity 0 → 1` with `translateY 6px → 0`, staggered. Simultaneously the
  header line swaps "Finding venues near you…" for "24 venues available" with a
  120ms opacity crossfade rather than a text substitution. The user understands
  *these placeholders became these venues* — that the six grey boxes were a
  promise about this specific grid, not unrelated loading furniture.
- **Timing**: Skeleton out 140ms `linear` (a placeholder leaving needs no
  character). Cards in 260ms `cubic-bezier(0.16, 1, 0.3, 1)`, per-card stagger
  40ms capped at the first 6 cards (240ms), starting at t=100ms so the two
  overlap by 40ms and there is never an empty frame. Header text crossfade 120ms
  `linear` at t=0. Note this must not fight the existing `.card-lift`
  transition (`src/index.css:613-616`, `transition-all duration-200`) — set the
  entrance on a wrapper `div`, not on the `<article>` that carries `card-lift`,
  or a pointer arriving mid-entrance produces a compound transform.
- **Build**: Tailwind + `tailwindcss-animate` on the card wrappers
  (`animate-in fade-in-0 slide-in-from-bottom-1 duration-[260ms]`) with the
  stagger as inline `animationDelay` from the map index. No framer-motion: this
  fires once per page load, there is no exit to coordinate, and the skeleton
  branch and results branch are already separate JSX branches keyed by
  `isLoading` — `AnimatePresence` across a ternary of two different grids would
  need both mounted, which doubles the DOM for one frame.
- **Reduced motion**: Add the wrapper class to the `@media
  (prefers-reduced-motion: reduce)` block at `src/index.css:619` with
  `animation: none;`. Skeletons vanish and cards appear at full opacity, which
  is today's behaviour and is already correct — the geometry match means there
  is no layout shift either way, so the fallback loses nothing but the dissolve.
  The header text still swaps (it is a content change, not an animation) and
  `aria-live="polite"` still announces it.
- **Perf**: `opacity` + `transform` only, on wrappers that already exist in the
  grid flow. Watch one thing: the entrance runs during the same commit that
  mounts 6-60 `<img loading="lazy">` elements (`VenueCard.tsx:73-79`), so the
  decode work and the animation compete. Keeping the stagger capped at 6 means
  the animated set is the above-the-fold set, which is also the set the browser
  is decoding first — they finish together rather than the animation outliving
  the decode.

---

### 35. Mobile filter panel expand

- **Where**: `/venues` on `md:` and below →
  `src/pages/DiscoverPage.tsx:483-537`, toggled by the Filters button at
  `DiscoverPage.tsx:469-479`.
- **Motion**: `{showFilters && <div className="md:hidden pt-4 …">}` is a bare
  conditional mount inside a header that is `sticky top-16 z-40`
  (`DiscoverPage.tsx:367`). Tapping Filters therefore grows the sticky header by
  roughly 200px in one frame and shoves the entire results grid down under it —
  the most jarring interaction on the page, and on a phone it can push the first
  row of cards clean off screen. Animate the panel's height `0 → auto` while its
  contents fade `opacity 0 → 1`, so the grid is pushed down at a rate the eye
  can track. The user understands *the filters expanded out of this button and
  the results are still there, below* — rather than experiencing a page jump
  with no visible cause.
- **Timing**: Height 240ms `cubic-bezier(0.16, 1, 0.3, 1)`. Contents
  `opacity 0 → 1` over 160ms starting at t=80ms — content that fades in at the
  same rate as the container grows looks like it is being stretched. Collapse:
  contents out 100ms `linear` at t=0, height 200ms
  `cubic-bezier(0.4, 0, 1, 1)` at t=60ms. Collapse is faster than expand
  because the user has already decided.
- **Build**: CSS/Tailwind, using the `grid-template-rows: 0fr → 1fr` technique
  on a wrapper with `overflow: hidden` — it animates to intrinsic height without
  JS measurement and without hardcoding a pixel value that breaks when
  `availableSports` (`DiscoverPage.tsx:136-139`) yields a different number of
  options. framer-motion's `animate={{ height: "auto" }}` is the alternative and
  would work, but this panel is a leaf with no exit choreography and the CSS
  version costs nothing to ship. Note: the Radix `Slider` inside
  (`DiscoverPage.tsx:517-527`) must not be inside a `height: 0` container at
  mount time or its thumb positions measure wrong — render the panel always and
  toggle the wrapper's row-size, rather than conditionally mounting.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` in
  `src/index.css:619` → `grid-template-rows` transition `none`, contents
  transition `none`. The panel snaps open exactly as it does today. Worth
  saying plainly: the layout jump this case fixes is *not* an accessibility
  problem the animation solves — for a reduced-motion user the instant snap is
  the preferred behaviour, and the fix for the jolt is that the sticky header
  keeps its scroll position, which it does either way.
- **Perf**: Flag — this one is **not** transform/opacity. `grid-template-rows`
  animates layout, so every frame relayouts the sticky header and everything
  below it. That is the accepted cost; the alternative (transform-based slide)
  would overlap the results grid instead of pushing it, which misrepresents the
  layout. Mitigations: keep it to 240ms, keep it `md:hidden` so it never runs on
  a desktop-sized tree, and put `contain: layout paint` on the panel wrapper so
  the relayout does not walk into the grid's own subtree. Measure on a mid-range
  Android before shipping — if it drops frames, the fallback is an instant
  expand plus a 200ms fade on contents only.

---

### 36. Map / list view toggle

- **Where**: `/nearby` → `src/pages/NearbyFieldsPage.tsx:183-233` (the two-button
  segmented control, `view` state at `NearbyFieldsPage.tsx:87`) and the branch
  it drives at `NearbyFieldsPage.tsx:243`. Stated plainly because it matters for
  scoping: **this is the app's only map/list toggle.** `/venues` and
  `/venues/map` (`src/pages/VenueMapPage.tsx`) are two separate routes with no
  toggle between them and no shared component — a shared-element transition
  there would be a routing change, not a motion change, and is out of scope.
- **Motion**: Two things, and only two. (a) The active-state fill currently jumps
  between the buttons via `transition-colors`; replace it with a single
  `bg-primary` pill that *slides* horizontally between the two segments, the
  icons crossfading their colour over it. (b) The incoming panel — map or list —
  fades `opacity 0 → 1` on mount. The user understands the toggle is one switch
  with two positions, not two independent buttons that happen to be adjacent —
  which is what `aria-pressed` already says semantically
  (`NearbyFieldsPage.tsx:208, 222`) and what the visuals currently do not.
- **Timing**: Pill slide 180ms `cubic-bezier(0.16, 1, 0.3, 1)`. Explicitly
  **not** `--ease-spring` (`cubic-bezier(0.34, 1.56, 0.64, 1)`): that curve
  overshoots by ~10%, and the container is
  `rounded-lg border border-border overflow-hidden`
  (`NearbyFieldsPage.tsx:183`) — the overshoot would be cropped by the same
  `overflow-hidden` that already crops the focus ring, per the comment at
  `NearbyFieldsPage.tsx:186-204`. Icon colour crossfade 150ms, concurrent.
  Incoming panel fade-in 200ms `cubic-bezier(0.16, 1, 0.3, 1)`, starting at
  t=60ms.
- **Build**: framer-motion for the pill (`<motion.span layoutId="view-pill" />`
  inside whichever button is active — same shared-layout trick as case 29,
  same reason: the target position is whatever the DOM measures). Tailwind
  `animate-in fade-in-0` for the incoming panel. **Do not crossfade the two
  panels.** A crossfade requires both mounted, and mounting the `GoogleMap`
  (`NearbyFieldsPage.tsx:259`) is a tile fetch and a canvas init — holding it
  alive under a fading list, or double-mounting it, is far more expensive than
  the transition is worth. Fade the incoming panel in over the empty space the
  outgoing one left; the unmount stays instant, exactly as it is today.
- **Reduced motion**: `useReducedMotion()` → the pill teleports
  (`transition={{ duration: 0 }}`) and the panel fade class is not applied. The
  active segment is still unambiguously filled `bg-primary text-primary-foreground`
  and still carries `aria-pressed`, so the state is fully readable. Also skip the
  panel fade for a second reason beyond preference: a fading map canvas is the
  exact class of large-area luminance change that reduced-motion users opt out
  of.
- **Perf**: Pill is `transform` on one element measured across two buttons —
  trivial. The panel fade is `opacity` on a container holding a map canvas;
  compositing a full-viewport canvas at partial opacity for 200ms is one
  extra layer for 12 frames, which is acceptable, but do not extend it past
  ~250ms and do not add a `transform` to it — transforming a Maps container
  makes the API's own hit-testing and its injected pan controls disagree with
  the painted position for the length of the animation.
