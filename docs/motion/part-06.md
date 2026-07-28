## Availability & calendar

Scope: the slot picker (`src/features/booking/BookingPanel.tsx`), the owner's
availability editor (`src/pages/VenueAvailabilityPage.tsx` +
`src/components/ui/calendar.tsx`), the owner's week grid
(`src/components/owner/schedule/WeekCalendar.tsx`), the embeddable widget
(`src/pages/EmbedBookingPage.tsx`), and the price breakdown that hangs off a
slot selection.

### What this section is built from

**Motion tokens** — `src/index.css:135-140`:
`--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`,
`--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`,
`--dur-fast: 150ms`, `--dur-base: 250ms`, `--dur-slow: 400ms`.

**Brand** — dark is the shipped theme (`index.html:2` carries `class="dark"`).
`--primary: 151 90% 47%` (electric court green) is the selected-slot fill,
`--muted: 158 13% 13%` the skeleton block, `--warning: 42 95% 55%` and
`--destructive: 358 72% 68%` the escalation colours. `--radius: 0.875rem`.

**Existing keyframes** — `tailwind.config.ts:101-124`: `shimmer`
(`background-position -200% 0 → 200% 0`, `2s linear infinite`, exposed as
`animate-shimmer` and used **zero** times in `src/` today), `fade-in`,
`accordion-down/up`. `tailwindcss-animate` is registered as a plugin
(`tailwind.config.ts:158`), so `animate-in`, `fade-in-0`, `zoom-in-95`,
`slide-in-from-top-1` and the `data-[state=…]` variants are available.

**Reduced motion today** — `src/index.css:619-630` handles exactly two things,
`.live-dot::after` and `.card-lift`. Every fallback below either extends that
block or branches on framer-motion's `useReducedMotion()`.

**framer-motion `^12.34.3`** is a dependency (`package.json`) and is already
imported by four files, one of which is the shared vocabulary
`src/lib/motion.ts` (`easeOutExpo = [0.16, 1, 0.3, 1]`, `transitionFast/Base/Slow`,
`fadeUp`, `scaleIn`, `staggerChildren`, `tapScale`). So it is proposable.
**Remotion is not a dependency** — nothing below proposes it.

**The current state of the picker**: `BookingPanel.tsx` uses `transition-colors`
twice (lines 218 and 288) with no duration, i.e. Tailwind's default 150ms, and
nothing else. There is no other motion anywhere in this section.

---

### 46. Date pill that travels

- **Where**: `/venue/:id` → `src/features/booking/BookingPanel.tsx:208-229`, the
  14-day `flex gap-2 overflow-x-auto` date strip.
- **Motion**: today selection is a class flip — `border-primary bg-primary
  text-primary-foreground` under `transition-colors` (150ms) — so the emerald
  fill blinks off one pill and on another, and the two events are unrelated on
  screen. Replace with a single shared fill: an absolutely-positioned
  `<motion.span layoutId="booking-date-fill" className="absolute inset-0
  rounded-xl bg-primary" />` rendered only inside the selected button, with the
  weekday/day/month labels sitting above it at `relative z-10`. Framer projects
  the span from its old rect to its new one, so the fill slides along the strip.
  The user understands that the strip holds exactly one selection, that it is
  one control rather than fourteen, and which direction in time they just moved.
- **Timing**: 260ms `cubic-bezier(0.16, 1, 0.3, 1)` for the travel (between
  `--dur-base` and `--dur-slow`, because the pill can cross 600px). The
  departing label returns to `text-foreground` immediately over 120ms linear;
  the arriving label goes to `text-primary-foreground` over 120ms with a 130ms
  delay, so it flips as the fill lands under it rather than sitting light on a
  dark background for a quarter second.
- **Build**: framer-motion. `layoutId` is the only mechanism that moves a box
  between two DOM parents; CSS would need a manually measured translate on a
  strip whose items scroll.
- **Reduced motion**: `const reduce = useReducedMotion()` → when true, drop the
  `layoutId` prop entirely and put `bg-primary` back on the button itself with
  `transition-none`. The fill appears on the new pill in one frame. No travel,
  no label delay (both colours flip immediately).
- **Perf**: framer's layout projection writes `transform` only. One real trap:
  the strip is `overflow-x-auto`, so once the user has scrolled to day 12 the
  measured origin rect is wrong and the fill flies in from off-screen. Put
  `layoutScroll` on the scrolling `div` so framer measures against scroll
  offset.

### 47. Slot grid answers the date **[HIGH IMPACT]**

- **Where**: `/venue/:id` → `src/features/booking/BookingPanel.tsx:275-299`, the
  `grid grid-cols-3` of hour buttons fed by `useAvailableSlots(venueId,
  selectedDate)` (`src/features/booking/hooks/useBookingFlow.ts`).
- **Motion**: changing the date replaces the grid contents in place with no
  transition at all. `09:00 … 22:00` becomes `09:00 … 22:00` — same labels, same
  positions, different `available` flags — so the one signal that the app
  re-read availability for a different day is a handful of strikethroughs moving
  around. Wrap the grid in `<AnimatePresence mode="popLayout">` keyed on
  `selectedDate`. Outgoing grid: `opacity 1→0`. Incoming: each button
  `opacity 0→1, translateY 6px→0`, staggered. The user understands that this
  list belongs to the date they just pressed and that it is fresh, not the
  previous day's grid with a few cells repainted.
- **Timing**: out 90ms linear. In 160ms per button,
  `cubic-bezier(0.16, 1, 0.3, 1)`, `staggerChildren: 0.012` (12ms). A 15-slot
  day settles at 160 + 14×12 = 328ms. Guard it: if `slots.length > 18`, set the
  stagger to 0 and fade the container as one block, otherwise a long-hours venue
  spends half a second assembling.
- **Build**: framer-motion, reusing the `staggerChildren` variant shape from
  `src/lib/motion.ts` but with `y: 6` rather than `fadeUp`'s `y: 16` — these are
  36px-tall buttons in a tight grid, and 16px reads as the row falling in.
- **Reduced motion**: no stagger, no `y`. On key change the whole grid
  crossfades `opacity 0.55→1` over 120ms linear — still marks "this refreshed",
  carries zero movement. Branch the variants object on `useReducedMotion()`
  rather than wrapping in `<MotionConfig>`; `src/lib/motion.ts` documents why
  that wrapper convention was never actually followed here.
- **Perf**: transform and opacity only. The risk is layout, not paint: with
  `mode="wait"` the old grid unmounts before the new one mounts, the panel
  collapses by up to 5 rows for 90ms, and because it lives in
  `sticky top-24 z-[60]` (`src/pages/VenueDetailsPage.tsx:410`) the whole
  sidebar jumps. Use `mode="popLayout"` as specified, and set a `min-height` on
  the slot container from the previous render (`Math.ceil(prevCount / 3) * 44px`).
- **Why this one**: it is the only place in the booking flow where identical
  pixels change meaning. The date pill (46) confirms the press; nothing confirms
  that the thing the booking decision is actually made from — which hours are
  free — was recomputed. A user who taps Thursday and sees the same twelve
  numbers has no evidence the app did anything.

### 48. Slot skeleton instead of a spinner

- **Where**: `/venue/:id` → `src/features/booking/BookingPanel.tsx:236-239`, the
  `slotsLoading` branch: a centred `Loader2` at `py-6`.
- **Motion**: replace the spinner with 9 placeholders in the same
  `grid grid-cols-3 gap-2`, each at the slot buttons' exact height and
  `rounded-lg bg-muted`, carrying `animate-shimmer` over
  `linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.06),
  transparent)` at `background-size: 200% 100%`. When the query resolves, the
  skeleton crossfades to the real grid. The user understands roughly how many
  slots are coming and where they will be — and, more importantly, that the app
  is fetching rather than reporting an empty day, which is currently
  indistinguishable from the "Closed on this day." branch two lines below
  (line 272).
- **Timing**: `shimmer 2s linear infinite` — the keyframe already exists in
  `tailwind.config.ts:114-117` and animates `background-position -200% 0 →
  200% 0`. Crossfade to real data: 140ms `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Build**: Tailwind/CSS. The keyframe and the `animate-shimmer` utility both
  ship already (zero uses today), and keeping the loading path free of
  framer-motion means the skeleton paints without waiting on any JS this
  component does not already need.
- **Reduced motion**: extend the existing block at `src/index.css:619-630` with
  `.animate-shimmer { animation: none; background-position: 50% 0; }`. Static
  muted blocks in the same layout, and the swap to real data is instant rather
  than a crossfade.
- **Perf**: `shimmer` animates `background-position`, which is a main-thread
  paint every frame, not a composited transform. Nine ~110×36px boxes is fine;
  do not reuse this for a full-page skeleton. The composited alternative, if it
  ever needs to scale, is one absolutely-positioned gradient child per box
  animated with `translateX(-100% → 100%)` inside `overflow-hidden`.

### 49. The slot that was just taken

- **Where**: `/venue/:id` → `src/features/booking/BookingPanel.tsx:130-151`
  (`handleReserve`), triggered by the `slot_taken` branch in
  `src/features/booking/hooks/useBookingFlow.ts` — `create_booking_hold` throws
  `"That slot was just taken — please pick another time."`
- **Motion**: today this is toast-only, and the button the user chose stays
  selected and emerald while the toast says it is gone — the panel contradicts
  itself. On that error, the selected button plays a horizontal shake
  (`translateX: 0 → -4 → 4 → -2 → 0`), then morphs into the taken state:
  `opacity 1→0.4`, and `line-through` applied at the end (both classes already
  exist at line 289). `setSelectedSlot(null)` fires with the morph, and the
  query refetches. The user understands which specific button died, that the
  system took it rather than that they mis-tapped, and that a new choice is
  required before Reserve will do anything.
- **Timing**: shake 200ms `cubic-bezier(0.36, 0.07, 0.19, 0.97)`. Morph starts
  at +200ms and runs 180ms on `cubic-bezier(0.16, 1, 0.3, 1)`, so the two reads
  do not overlap. 380ms total, inside the refetch window.
- **Build**: framer-motion — `animate={justTaken ? "shake" : "rest"}` on the one
  button. A CSS keyframe would need a class remove/reflow/re-add dance to replay
  if the same slot errors twice.
- **Reduced motion**: no shake. The button crossfades straight to the taken
  style over 250ms, and the information moves into text: add an
  `aria-live="assertive"` line under the grid ("18:00 was just taken — pick
  another time"). The existing `toast.error` stays either way. Nothing here is
  carried by movement alone.
- **Perf**: `transform: translateX` and `opacity` on one 36px button — no layout
  cost. `text-decoration: line-through` is not animatable and forces a repaint;
  apply it as a discrete class flip at the end of the morph, never as part of a
  transition.

### 50. Price breakdown as a consequence

- **Where**: `/venue/:id` → `src/features/booking/BookingPanel.tsx:303-318`, the
  `{selected && …}` block holding "1 hour", "Service fee (5%)" and "Total".
- **Motion**: the block currently appears in one frame and shoves the Reserve
  button roughly 76px down the panel. Animate the wrapper `height 0 → 76px` with
  `opacity 0→1`; the three rows enter with `translateY 4px→0`; the Total row's
  `border-t` is the last thing to appear. The user understands that the money
  showed up *because* of the slot they just pressed, and that the Reserve button
  moved for a reason rather than jumping under their thumb.
- **Timing**: wrapper 220ms `cubic-bezier(0.16, 1, 0.3, 1)`. Rows 140ms each,
  30ms stagger, starting at +80ms. Collapse (deselecting, or changing date,
  which nulls `selectedSlot` at line 215) is 140ms with no row stagger —
  removal should not be ceremonious.
- **Build**: framer-motion `<AnimatePresence>`. Radix Collapsible is installed
  and would do this in pure CSS via `--radix-collapsible-content-height`, but
  this block is derived state, not a disclosure the user toggles, so presence is
  the honest model.
- **Reduced motion**: no height animation, no stagger. The block renders at full
  height immediately and the Reserve button reaches its new position in one
  frame — which is the current behaviour, so the fallback is literally "ship
  what exists today".
- **Perf**: **this is the layout-thrash case in the section.** Animating
  `height: "auto"` makes framer measure and write `height` every frame, and this
  panel is `sticky top-24 z-[60]` (`src/pages/VenueDetailsPage.tsx:410`) with
  `.glass` on it — `backdrop-filter: blur(18px) saturate(1.4)`
  (`src/index.css:430-439`) — so every height frame re-rasterises the blurred
  backdrop behind a ~380px card. Animate a **fixed** pixel height instead: the
  block is deterministically three rows plus padding, so `auto` buys nothing.
  Add `contain: layout paint` on the wrapper.
- **Note for whoever owns checkout**: the same three rows reappear at
  `/book/:bookingId` (`src/features/booking/CheckoutPage.tsx:239-251`) reading
  real `owner_amount_minor` / `platform_fee_minor` / `amount_minor`. Do not
  animate them there. That block is a receipt for money already held, and motion
  on a settled figure reads as the number changing.

### 51. Embed widget: tap confirmation, CSS only

- **Where**: `/embed/booking/:venueId` → `src/pages/EmbedBookingPage.tsx:260-275`
  (the `grid grid-cols-7` day cells) and `:293-311` (the `grid grid-cols-4` time
  cells).
- **Motion**: the same two ideas as 46 and 47, built without a JS animation
  library. Day cell: `transform: scale(0.94)` on `:active`, released to `1`,
  with the `bg-primary` fill fading in underneath. Time cell on select: an inset
  ring grows before the fill lands —
  `box-shadow: inset 0 0 0 0 hsl(var(--primary))` →
  `inset 0 0 0 2px hsl(var(--primary))` — so on a four-column grid of
  near-identical two-digit numbers the eye is told which one it hit. Both
  currently have `transition-colors` and nothing else. The user understands
  their tap registered: inside an iframe on a stranger's website there is no
  page chrome to orient by, and the widget's only other feedback is the Book
  button relabelling itself at the bottom of the card (line 320).
- **Timing**: ring 140ms `cubic-bezier(0.16, 1, 0.3, 1)`; fill 150ms linear
  (matches the `transition-colors` default already in place); `:active` scale
  90ms `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Build**: Tailwind/CSS, deliberately. This route is embedded in third-party
  pages and its bundle is the *owner's visitor's* download; it imports nothing
  from framer-motion today and should keep it that way.
- **Reduced motion**: `motion-reduce:transition-none` on both button sets and
  `motion-reduce:active:scale-100` on the day cells. Fill and ring apply
  instantly. One utility per element, no media query needed.
- **Perf**: `transform` composites; `box-shadow` repaints every frame. Bounded
  here because exactly one cell animates at a time (selection is single-value in
  both grids). If this ever needs to run across the whole grid at once, swap the
  ring for an `::after` overlay animated on `opacity`.

### 52. Blocked-date calendar grows from its trigger

- **Where**: `/venue/:id/availability` →
  `src/pages/VenueAvailabilityPage.tsx:252-268`, a Radix `Popover` whose content
  is the shared `src/components/ui/calendar.tsx` (react-day-picker 8.10.1).
- **Motion**: a 7×6 grid currently materialises over the form with whatever
  `PopoverContent` ships. Anchor it to the button that opened it: set
  `transform-origin: var(--radix-popover-content-transform-origin)` and add
  `data-[state=open]:animate-in data-[state=open]:fade-in-0
  data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1`,
  with the matching `data-[state=closed]:animate-out fade-out-0 zoom-out-95`.
  The owner understands that the calendar belongs to "Select date" and not to
  the page, so dismissing it returns them to the row they were filling in.
- **Timing**: open 160ms `cubic-bezier(0.16, 1, 0.3, 1)` — `scale 0.95→1`,
  `opacity 0→1`, 4px slide from the trigger side. Close 120ms
  `cubic-bezier(0.4, 0, 1, 1)`. Asymmetric on purpose: dismissal should never
  make anyone wait.
- **Build**: Tailwind + `tailwindcss-animate` data-attribute variants, no JS.
  Radix already sets `data-state` and holds the node mounted through the exit,
  which is the hard part.
- **Reduced motion**: `motion-reduce:animate-none` on `PopoverContent`. It
  appears and disappears instantly. The `initialFocus` prop already on
  `CalendarComponent` (line 265) moves focus into the grid regardless, so a
  keyboard user's orientation does not depend on the animation.
- **Perf**: transform and opacity on a portalled node with its own layer.
  Explicitly **do not** add a transition to the day cells: `day_selected` in
  `src/components/ui/calendar.tsx` puts `bg-primary` on a 36×36 cell, and 42
  cells transitioning while the popover scales gives 43 simultaneously animating
  elements for one arrow key. Day selection stays instant.

### 53. Blocked-date chips enter and leave

- **Where**: `/venue/:id/availability` →
  `src/pages/VenueAvailabilityPage.tsx:285-317`, the `flex flex-wrap gap-2` list
  of blocked-date `Badge`s, mutated by `useAddBlockedDate` /
  `useRemoveBlockedDate` (`src/hooks/useAvailability.ts`).
- **Motion**: wrap the list in `<AnimatePresence initial={false}>` and give each
  badge `layout`. Enter: `opacity 0→1, scale 0.92→1`. Exit: `opacity 1→0,
  scale 1→0.92`, with the surviving chips sliding into the gap. The owner
  understands which chip the save produced — right now the only confirmation is
  a sonner toast in a different corner of the screen — and, because the list is
  driven by query invalidation rather than optimistic state, a chip actually
  leaving is proof the delete landed server-side.
- **Timing**: enter 200ms `cubic-bezier(0.34, 1.56, 0.64, 1)` (`--ease-spring`,
  the repo's only overshoot curve; a slight overshoot suits something being
  added to a set). Exit 140ms `cubic-bezier(0.4, 0, 1, 1)`. Sibling reflow 200ms
  `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Build**: framer-motion. `AnimatePresence` is the only way to hold a node
  through its removal from a mapped list — CSS cannot animate an unmount.
- **Reduced motion**: drop `layout` and drop the scale. Chips fade in and out
  over 100ms on opacity alone and the survivors jump to their new positions.
  Select the second variants object from `useReducedMotion()`.
- **Perf**: `layout` reflows via framer's transform projection, so it stays
  transform-only rather than touching real layout. But this list wraps, so
  removing a chip from line 1 re-projects every chip after it, and a busy venue
  accumulates 20–30 blocked dates over a season. Gate it: apply `layout` only
  when `blockedDates.length <= 12`; above that, animate just the entering or
  exiting chip and let the rest snap.

### 54. Week navigation with a direction

- **Where**: `/owner/schedule` →
  `src/components/owner/schedule/WeekCalendar.tsx` — prev / Today / next at
  lines 116-143, the date `Badge` at 103-105, the grid at 148-259.
- **Motion**: the header `Badge` ("Mar 3 - Mar 9, 2026") crossfades with a
  directional 8px x-shift — next week enters from `+8px`, previous from `-8px` —
  while the grid body fades `opacity 0.5→1` with a 6px `translateY` and **no**
  x. `Today` gets the crossfade with no shift at all, because it is a jump, not
  a step. The owner understands which way through time they moved: two identical
  chevrons a few pixels apart otherwise produce visually identical results, and
  the only difference is a date string that changes without ceremony.
- **Timing**: badge 200ms `cubic-bezier(0.16, 1, 0.3, 1)`; grid 180ms linear on
  opacity, 180ms `cubic-bezier(0.16, 1, 0.3, 1)` on the 6px y.
- **Build**: framer-motion `<AnimatePresence mode="popLayout">` on the badge,
  keyed by `weekStart.toISOString()` with the sign of the week delta held in a
  ref. The grid needs no library — re-trigger a CSS class on the same key.
- **Reduced motion**: no x on the badge, no y on the grid. The badge crossfades
  over 200ms and the grid does not move or fade. Direction then lives only in
  the text, which is why the badge must keep printing the full range it already
  prints (line 104) rather than being shortened once the shift exists.
- **Perf**: the missing horizontal translate is the point. The grid sits in
  `overflow-x-auto` around a `min-w-[800px]` child (lines 148-149); translating
  x inside that container extends `scrollWidth`, so the horizontal scrollbar
  appears and vanishes on every week change. Y and opacity do not. Separately,
  while in this file: the booking blocks at line 217 use `transition-all
  hover:ring-2` on a node that also carries an inline `height`
  (line 237, `duration_hours * 60 - 4`), so any re-render that changes a
  booking's duration animates its height through the hover transition. Narrow it
  to `transition-[box-shadow] duration-150`.
