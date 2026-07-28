## Owner dashboard & earnings

Scope: the five owner screens where an owner reads money and commitments —
`/owner/bookings` (`src/pages/owner/OwnerBookingsPage.tsx`), `/owner/earnings`
(`src/pages/owner/OwnerEarningsPage.tsx`), `/owner/analytics`
(`src/pages/owner/OwnerAnalyticsPage.tsx`), `/owner-dashboard`
(`src/pages/owner/OwnerOverviewPage.tsx`) and the calendar-sync pair
`/owner/integrations` + `/owner/integrations/callback`
(`src/pages/owner/OwnerIntegrationsPage.tsx`,
`src/pages/owner/CalendarCallbackPage.tsx`). All five are mounted behind
`ProtectedRoute` + `RequireRole role="owner"` in `src/App.tsx:182-195` and all
five render inside `src/components/owner/OwnerLayout.tsx`.

### What this section is built from

**Motion tokens** — `src/index.css:134-139`:
`--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`,
`--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`,
`--dur-fast: 150ms`, `--dur-base: 250ms`, `--dur-slow: 400ms`.
Plus `--shadow-ring-primary` (`index.css:130` light, `:228` dark).

**Existing keyframes** — `tailwind.config.ts:101-124`: `fade-in`
(opacity 0→1 + `translateY(8px)`→0, 0.4s `cubic-bezier(0.25,0.1,0.25,1)`),
`shimmer` (`backgroundPosition -200% 0 → 200% 0`, 2s linear infinite),
`accordion-down`/`accordion-up` (0.2s ease-out). `Skeleton`
(`src/components/ui/skeleton.tsx`) uses Tailwind's built-in `animate-pulse`,
not `shimmer` — the two are different animations and the analytics loading
state at `OwnerAnalyticsPage.tsx:36-45` gets the pulse one.

**framer-motion is installed** — `^12.34.3` in `package.json`. It is used today
in exactly four files (`src/lib/motion.ts`, `src/pages/HomePage.tsx`,
`src/pages/ForOwnersPage.tsx`,
`src/components/ui/container-scroll-animation.tsx`). `src/lib/motion.ts`
already exports `easeOutExpo`, `transitionFast/Base/Slow`, `fadeUp`, `fadeIn`,
`scaleIn`, `staggerChildren`, `tapScale` and `pageTransition` — reuse those
rather than inventing new curves. **Nothing in the owner tree imports it yet.**

**Reduced motion, honestly.** `src/lib/motion.ts:6-8` claims reduced motion is
"already honoured" without a `<MotionConfig>`. Do not build new owner motion on
that assumption: framer-motion only auto-degrades when `MotionConfig
reducedMotion` says so, and no owner page wraps anything. Every case below
gates explicitly on `useReducedMotion()` — the pattern already in
`src/pages/HomePage.tsx:11,83` — and every CSS-side fallback belongs in the
existing `@media (prefers-reduced-motion: reduce)` block at
`src/index.css:619-629`.

**recharts** `^2.15.4` drives both charts. Chart colours are already tokens
(`CHART_COLORS` at `OwnerAnalyticsPage.tsx:19-25` → `--chart-1..5`,
`index.css:102-106` / `:211-220`), so nothing below needs to name a hex.

---

### 82. Filtering the bookings table narrows a list, it does not reload one **[HIGH IMPACT]**

- **Where**: `/owner/bookings` — `src/pages/owner/OwnerBookingsPage.tsx:85-97`
  (the `filteredBookings` computation driven by `searchQuery`,
  `selectedVenueId`, `statusFilter`) and the `<TableBody>` it feeds at
  `:232-283`.
- **Motion**: rows dropped by the filter fade `opacity 1 → 0` and slide
  `translateX(0 → -8px)`; rows that survive slide to their new row position
  instead of teleporting; rows newly admitted enter `opacity 0 → 1`,
  `translateY(6px → 0)` with **no** stagger — a filter result is one set, not a
  sequence, and staggering it would imply arrival order that does not exist.
  What the owner understands: the four summary cards above (`:112-147`) are
  computed from `allBookings` and `analytics`, and deliberately never respond
  to the filter. With nothing moving, "Total Bookings 63" sitting over a
  four-row table reads as a contradiction and the owner re-checks their
  filters. Watching 59 rows leave makes the 63 read as *of* 63.
- **Timing**: exit 140ms `cubic-bezier(.4,0,1,1)`; enter 200ms
  `cubic-bezier(.16,1,.3,1)` (`--ease-out-expo`); survivors reflow 240ms
  `cubic-bezier(.2,.8,.2,1)`.
- **Build**: framer-motion. `AnimatePresence initial={false}` around
  `motion(TableRow)` is the only way to hold a `<tr>` on screen after React has
  unmounted it — CSS cannot animate an element that no longer exists.
- **Reduced motion**: `useReducedMotion()` → drop `AnimatePresence` and render
  the plain `<TableRow>` list. Because the motion was carrying real
  information, replace it with text: an `aria-live="polite"` line above the
  table reading `Showing {filteredBookings.length} of {allBookings.length}`.
  That line is worth shipping unconditionally.
- **Perf**: exit and enter are opacity + transform only. The survivor reflow is
  the risk — framer's `layout` measures every row every frame, and this table
  is unpaginated. Gate it: apply `layout` only when
  `filteredBookings.length <= 40`; above that, let survivors jump and keep just
  the fade-out.

### 83. The clicked row stays marked while the drawer is open

- **Where**: `/owner/bookings` — the row at `OwnerBookingsPage.tsx:234`
  (`cursor-pointer hover:bg-muted/50`) and its View button at `:273-279`, which
  sets `selectedBooking` and opens
  `src/components/owner/schedule/BookingDetailDrawer.tsx` (a shadcn `Sheet`,
  `side="right"`). Same pairing on `/owner-dashboard` via
  `OwnerOverviewPage.tsx:397-401`.
- **Motion**: the source row takes a persistent selected treatment for as long
  as the sheet is open — a 2px rule in `hsl(var(--primary))` on its leading
  edge scales `scaleY(0) → scaleY(1)` from `transform-origin: center`, and the
  row background settles to `hsl(var(--muted) / 0.5)` and stays there (today
  the hover tint vanishes the moment the pointer moves to the sheet). The sheet
  itself slides in from the right, retimed. The owner understands *which* of
  sixty near-identical six-column rows the panel is describing, and can find
  their place again when it closes.
- **Timing**: rule 180ms `cubic-bezier(.16,1,.3,1)`; background 120ms linear;
  sheet in 260ms `cubic-bezier(.2,.8,.2,1)`; rule out 120ms.
- **Build**: Tailwind/CSS — a `data-selected` attribute on the row plus
  `transition-transform`. The sheet is already Radix + `tailwindcss-animate`
  (`tailwind.config.ts:158`); `src/components/ui/sheet.tsx:32` currently
  hardcodes `data-[state=open]:duration-500` / `data-[state=closed]:duration-300`,
  and 500ms is slow enough that owners click the row twice. Retiming that one
  class is the whole change — no new dependency.
- **Reduced motion**: the rule renders at full height with `transition: none`
  and the background changes instantly — the identity signal is the colour and
  the rule, not their arrival, so nothing is lost. The sheet swaps its
  translate for `opacity 0 → 1` over 120ms.
- **Perf**: `scaleY` + `opacity` only. Do not animate `border-left-width` or
  the row's `width` — either reflows all six cells on every frame, and the
  table is unvirtualised.

### 84. Revenue bars grow from the axis, so height reads as magnitude

- **Where**: `/owner/analytics` —
  `src/pages/owner/OwnerAnalyticsPage.tsx:88-111`, the `<BarChart
  data={analytics?.revenueByMonth}>` with `<Bar dataKey="revenue"
  fill="hsl(var(--chart-1))" radius={[4,4,0,0]} />`. Six months, built by
  `src/hooks/useOwnerAnalytics.ts`.
- **Motion**: every bar grows from the zero baseline to its value. Recharts
  animates one `<Bar>` series as a unit, so all six rise together — do not
  claim a left-to-right stagger, `animationBegin` is per-series and there is
  one series. What the owner understands: the Y axis is formatted
  `֏${(v/1000).toFixed(0)}k` (`:103`) with `axisLine={false}`, so there is no
  drawn baseline; bars that visibly start at zero are what tells the owner the
  axis starts at zero and that a bar twice as tall is twice the revenue.
- **Timing**: `animationDuration={520}`, `animationEasing="ease-out"`. Runs
  once on data arrival.
- **Build**: recharts props only (`isAnimationActive`, `animationDuration`,
  `animationEasing`). No framer-motion — the thing being animated is an SVG
  `<rect>` recharts already owns and re-renders.
- **Reduced motion**: `isAnimationActive={!prefersReduced}` from
  `useReducedMotion()`; recharts then paints final geometry on the first frame.
  The `Skeleton` states at `:39-43` keep `animate-pulse`, which should also be
  neutralised — add `.animate-pulse { animation: none; }` to the block at
  `index.css:619-629`, since `Skeleton` is used on ten screens.
- **Perf**: recharts animates the SVG `height`/`y` attributes, not `transform`
  — every frame is a layout + paint inside the SVG. Fine for 6 rects at 250px
  tall; it would not be for a 30-day series, so do not reuse this treatment if
  the range picker ever ships. `ResponsiveContainer` re-measures on resize, so
  key the chart on data identity rather than width or the animation replays
  every time the sidebar collapses at the `lg` breakpoint.

### 85. The donut sweeps once, then hover isolates the wedge the tooltip means

- **Where**: `/owner/analytics` — `OwnerAnalyticsPage.tsx:121-152`, the `<Pie
  innerRadius={60} outerRadius={100} dataKey="count" nameKey="venue">` with one
  `<Cell>` per venue cycling `CHART_COLORS` (`:19-25`, five tokens).
- **Motion**: on mount the ring sweeps clockwise from 12 o'clock
  (`startAngle={90} endAngle={-270}`). On hover, the pointed-at wedge's
  `outerRadius` grows 100 → 106 and every other cell drops to `opacity 0.55`.
  The sweep says the wedges sum to a whole, so a wedge is a share of total
  bookings and not a count. The isolate answers the real defect here: the
  `<Tooltip>` at `:143-150` prints a venue and a number with no visual tie to
  any arc, and with `label={({venue, count}) => ...}` at `:136` also printing
  venue names around the ring, there are two places showing the same venue and
  nothing linking them.
- **Timing**: sweep 600ms `ease-out` (recharts easing keyword); hover in 160ms
  `cubic-bezier(.2,.8,.2,1)`; hover out 220ms — leaving is slower than
  arriving so a pointer crossing wedges does not strobe.
- **Build**: recharts props only — `activeIndex` + `activeShape` are built in,
  and the arc geometry is recharts'. Reaching for framer-motion here would mean
  re-implementing the arc.
- **Reduced motion**: `isAnimationActive={false}` kills the sweep; the hover
  isolate keeps its `opacity` change but applies it instantly and drops the
  radius growth. Opacity-as-state survives, opacity-as-motion does not.
- **Perf**: five arcs maximum (`CHART_COLORS[i % CHART_COLORS.length]`), so the
  per-frame path recomputation during the sweep is bounded. The sibling dim is
  paint-only. Do not animate `innerRadius` — that moves every `labelLine`
  (`:137`) and re-lays the label text around the ring.

### 86. Occupancy fills to its figure; the month-over-month claim lands after it

- **Where**: `/owner-dashboard` — `src/pages/owner/OwnerOverviewPage.tsx:373-378`
  (the "This Week" `<Progress value={analytics?.occupancyRate} className="h-2" />`)
  and `:150-161` (the change `<Badge>` produced by `changeOf()` at `:76-80`).
- **Motion**: the progress indicator slides
  `translateX(-100%) → translateX(-(100 − occupancyRate)%)` on first data
  arrival only, not on every background refetch. Separately, each stat card's
  value at `:163` paints immediately while its change badge arrives 180ms later
  with `opacity 0 → 1` and `translateX(6px → 0)`. What the owner understands:
  the figure and the comparison are two assertions, not one string. The code
  comment at `:63-72` records that these badges used to be hardcoded `+12%`
  literals; now they are real month-over-month, and `title="Compared with last
  month"` (`:158`) is the only thing saying so. Landing the badge separately is
  the visual half of that sentence.
- **Timing**: progress 640ms `cubic-bezier(.16,1,.3,1)`; badge 200ms
  `cubic-bezier(.16,1,.3,1)` at a 180ms delay. A negative change gets the same
  curve as a positive one — no `--ease-spring` overshoot on a number that means
  the owner lost revenue.
- **Build**: CSS/Tailwind. `src/components/ui/progress.tsx:22-24` already sets
  `style={{ transform: translateX(-${100 - value}%) }}` with a bare
  `transition-all` and no stated duration, so it currently animates at
  Tailwind's 150ms default and transitions colour and shadow along with it.
  Change that one class to `transition-transform duration-[640ms]
  ease-[cubic-bezier(.16,1,.3,1)]`. The badge uses the existing
  `animate-fade-in` (`tailwind.config.ts:110-113`) with an inline
  `animationDelay: 180ms`.
- **Reduced motion**: add to `index.css:619-629` —
  `[role="progressbar"] > * { transition: none }` — Radix's `Progress.Root`
  carries that role and the indicator is its only child, so the bar paints at
  its final width — and `.animate-fade-in { animation: none; opacity: 1 }`.
  Both figures are text and remain readable with neither running.
- **Perf**: `translateX` on the indicator is compositor-only; the badge is
  opacity + transform. Never animate the
  indicator by `width`: that reflows the card on every frame. `Progress` is
  used in ten places per the comment at `progress.tsx:12-19`, so this retiming
  is a shared change — check password strength and listing health before
  shipping it.

### 87. The balance leaves the figure the owner last saw

- **Where**: `/owner/earnings` —
  `src/pages/owner/OwnerEarningsPage.tsx:136`,
  `<CardTitle as="h2" className="text-3xl tabular-nums">{formatAmd(balance?.balance_minor ?? 0)}</CardTitle>`,
  fed by the `owner-balance` query at `:45-53`.
- **Motion**: when `owner-balance` resolves to a value different from the one
  already on screen, the digits count from old to new, re-formatted through
  `formatAmd` (`src/features/booking/hooks/useBookingFlow.ts:49-51`) on every
  frame so the ֏ and the thousands grouping never flicker. A drop and a rise
  use the same curve; only the delta's sign differs. What the owner
  understands: the line beneath it (`:139-141`) reads "Paid out automatically
  when it reaches ֏10,000 · weekly runs". After a run the balance is ֏0, and
  with no motion ֏0-because-it-was-paid is indistinguishable from
  ֏0-because-nothing-was-earned. A number that visibly leaves ֏42,000 states
  that money moved, and pairs with the new "Scheduled" row appearing in the
  Payouts table at `:269-287`.
- **Timing**: 520ms `cubic-bezier(.16,1,.3,1)` (`--ease-out-expo`), no delay,
  once per mount. Skipped entirely when `|delta| < 100` minor units — `formatAmd`
  divides by 100, so that is under ֏1 and not worth animating.
- **Build**: framer-motion — `useMotionValue` + `animate()` +
  `useTransform(v => formatAmd(Math.round(v)))` into a `<motion.span>`. CSS
  cannot interpolate a formatted currency string, and `tabular-nums` is already
  on the element, which is what holds the glyph advance steady while it counts.
- **Reduced motion**: `useReducedMotion()` → render
  `formatAmd(balance.balance_minor)` directly with no motion value. Either way,
  the counting span must be `aria-hidden` with a visually-hidden sibling
  carrying the final value in an `aria-live="polite"` region — thirty
  per-frame text updates read aloud is worse than no announcement.
- **Perf**: one text node repainting ~30 times over 520ms, no layout because
  `tabular-nums` fixes the advance width. Keep it inside the existing
  `CardHeader` so the card's height cannot change mid-count; a height change
  would push the whole `lg:grid-cols-3` row at `:130`.

### 88. Only the payout that is actually in flight moves

- **Where**: `/owner/earnings` — `OwnerEarningsPage.tsx:278-283`, the
  `<Badge className={PAYOUT_TONE[payoutStatusDescriptor(payout.status).tone]}>`
  in the Payouts table. Four states from `src/features/booking/payout.ts`:
  Scheduled (`neutral`), On its way (`warning`), Paid (`positive`), Failed
  (`danger`); the tone→class map is `PAYOUT_TONE` at `:31-36`.
- **Motion**: exactly one tone animates. `warning` — "On its way", which
  `payout.ts` defines as *sent to the bank, usually arrives within a few
  working days* — carries a highlight travelling left→right across the badge:
  `background-image: linear-gradient(90deg, transparent, hsl(var(--warning) /
  0.28), transparent)` at `background-size: 200% 100%`, driven by the existing
  `shimmer` keyframe (`tailwind.config.ts:114-117`). Scheduled, Paid and Failed
  are completely static. Four badges in one column differ today only by a word
  and a hue; motion makes "in flight" a category the eye finds without reading
  — and, by its absence, says a Failed payout is not being retried and a
  Scheduled one has not left.
- **Timing**: 2400ms linear, infinite — an override of the config's 2s. The
  slower rate is the point: a 2s shimmer next to money reads as a loading
  skeleton, 2.4s reads as a background process that will finish on its own.
- **Build**: Tailwind. `animate-shimmer` already exists in the config, so this
  is `animate-shimmer [animation-duration:2400ms]` plus the gradient, added to
  the `warning` branch of `PAYOUT_TONE`. No JavaScript.
- **Reduced motion**: in `index.css:619-629`, `.payout-inflight { animation:
  none; background-image: none; }`. The state survives intact — the warning
  tone keeps its own audited colour pair (`border-warning/20 bg-warning/10
  text-warning`) and the `title` attribute at `:280` already carries
  `payoutStatusDescriptor(...).hint`, the full sentence.
- **Perf**: `background-position` is paint-only, not composited. Scoped to a
  ~90×22px badge that repaints continuously — acceptable at that size, and
  bounded because the query at `:76-89` is `.limit(20)`. Do not extend the
  gradient to the whole `<TableRow>`: that repaints the date, status and amount
  text every frame.

### 89. Switching payout method re-labels the field you already typed in

- **Where**: `/owner/earnings` — `OwnerEarningsPage.tsx:153-173`. The `<Select>`
  at `:156` flips `method` between `bank_transfer` and `idram`, which at the
  same instant changes the card's icon (`Banknote` ⇄ `Wallet`, `:148`), the
  field label ("IBAN" ⇄ "Idram ID", `:167`) and the placeholder ("AM…" ⇄
  "1000…", `:168`) — while the `iban` state at `:41` keeps whatever was typed.
- **Motion**: three coordinated beats. (1) Icon: outgoing `opacity 1→0, scale
  1→0.8`, incoming `opacity 0→1, scale 0.8→1`, crossfaded in place. (2) Label:
  outgoing `opacity 1→0, translateY(0→-6px)`, incoming `opacity 0→1,
  translateY(6px→0)`, offset so the old text is gone before the new arrives.
  (3) The `<Input>` at `:168` takes a single ring pulse —
  `box-shadow: var(--shadow-ring-primary)` (`index.css:130` / `:228`) in then
  out — and its value is not touched. What the owner understands: the field
  they already filled now expects a different kind of value. That matters
  because `saveAccount` at `:111-120` writes `details.destination` verbatim
  under the new `method`, so an IBAN left in the box is silently stored as an
  Idram ID, and the copy at `:178` promises verification only "before the first
  payout".
- **Timing**: icon 140ms `cubic-bezier(.16,1,.3,1)`; label out 120ms, in 160ms
  starting at +60ms; ring 200ms in, 380ms out, once per switch.
- **Build**: framer-motion `AnimatePresence mode="wait"` keyed on `method` for
  the icon and the label — both are unmount/mount swaps of different nodes,
  which CSS transitions cannot bridge. The ring is a Tailwind class toggled for
  580ms with `transition-shadow`; no library needed for that part.
- **Reduced motion**: `useReducedMotion()` → both swaps render instantly with
  no `AnimatePresence`, and the ring becomes a static `ring-2 ring-primary`
  held for 1200ms then removed. The "this field changed meaning" signal
  survives as a state rather than a motion, which is the whole point of it. The
  `<Label>`/`<Input>` pairing already announces the new label text to screen
  readers on focus.
- **Perf**: opacity + transform on two ~16-20px nodes, plus one `box-shadow`
  transition. `box-shadow` is paint-only but it is one element, once per
  switch. Give the `<Label>` a `min-w` so "IBAN" → "Idram ID" cannot reflow the
  `sm:grid-cols-3` row at `:153`.

### 90. Calendar sync: leaving for the provider, and the timed return

- **Where**: `/owner/integrations` —
  `src/pages/owner/OwnerIntegrationsPage.tsx:206-224` (the Connect button,
  `isConnecting === integration.id`, ending in a full-page redirect from
  `initiateOAuth` in `src/hooks/useCalendarIntegrations.ts`) — and the return
  leg at `/owner/integrations/callback`,
  `src/pages/owner/CalendarCallbackPage.tsx:53-108`, whose `success` branch
  auto-navigates back after 2000ms (`:41-43`).
- **Motion**: **(a) leaving.** On press, the *other* integration card recedes:
  `opacity 1 → 0.55`. The pressed card is deliberately not animated out —
  the browser leaves the document, so an exit animation would be cut mid-frame
  — it only swaps its button label to "Connecting…" beside the existing
  `Loader2` spin at `:213-215`. **(b) returning.** The callback card holds all
  three bodies in one frame: `loading → success` crossfades while the card's
  height animates to the new body, and a 2px hairline in `hsl(var(--primary))`
  fills `scaleX(0) → scaleX(1)` along the card's bottom edge across exactly the
  2000ms of the pending `navigate()`. What the owner understands: (a) which of
  two providers they authorised, and that they are about to leave Sportsbnb;
  (b) that "Redirecting you back to integrations…" (`:79`) is a measured wait
  and not a hang, and that the connection had one outcome rather than three
  screens.
- **Timing**: sibling recede 200ms `cubic-bezier(.2,.8,.2,1)`; body crossfade
  200ms; card height 240ms `cubic-bezier(.16,1,.3,1)`; redirect hairline
  **2000ms linear** — it is a clock, and any easing would misreport how much
  time is left.
- **Build**: Tailwind/CSS for (a) — dimming a sibling is a class toggle driven
  by the `isConnecting` state that already exists. framer-motion for (b),
  because animating a card between three differently-sized bodies needs a
  measured `height: auto`, which CSS cannot do; `motion.div` with `layout` is
  the whole implementation.
- **Reduced motion**: (a) the sibling drops to `opacity 0.55` with
  `transition: none`. (b) bodies swap with no crossfade and no height
  animation, and the hairline is replaced by a static "Redirecting in 2
  seconds…" line in place of the `CardDescription` at `:78-80`. Both terminal
  states already carry non-motion signals — icon plus colour at `:71-96` — so
  nothing about success or failure depends on movement.
- **Perf**: (a) opacity only; if a saturation filter is ever added here it
  forces a full-card paint, so leave it out. (b) `layout` measures the card
  each frame — one node, bounded, but keep `layout` off the `<main>` wrapper in
  `src/components/owner/OwnerLayout.tsx:216`, or every owner page pays the
  measurement cost. The hairline is `scaleX` on a 2px element:
  compositor-only, and `transform-origin: left` so it grows rather than
  stretches its own pixels.
