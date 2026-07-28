## Empty states, errors & micro-interactions

Scope: the app-wide feedback layer rather than any one route — the two toasters
mounted at `src/App.tsx:130-131`, the shared `Button` at
`src/components/ui/button.tsx`, `Switch` at `src/components/ui/switch.tsx`, the
`.focus-ring` utility at `src/index.css:418-420`, the two "nothing / broken"
panels (`src/components/ui/empty-state.tsx`,
`src/components/common/StatusPanel.tsx`), the route-level crash screen
(`src/components/common/RouteErrorBoundary.tsx`) and `/*` →
`src/pages/NotFound.tsx` (`App.tsx:248`).

Nothing here is a route-specific idea. These components render on almost every
one of the ~60 routes declared in `App.tsx:145-248`, which is the argument for
treating them as one system.

### What this section is built from

**Two toasters, both mounted, both live** — `src/App.tsx:130-131`:

```tsx
<Toaster />   // Radix — src/components/ui/toaster.tsx → ui/toast.tsx
<Sonner />    // sonner — src/components/ui/sonner.tsx
```

Sonner is the app's real one: 56 modules under `src/` import `from "sonner"`,
55 of them call sites (the 56th is the wrapper itself). The Radix one has
exactly three consumers — `src/hooks/useBlogPosts.ts`,
`src/hooks/useOutreach.ts`, `src/components/operator/outreach/TargetDrawer.tsx`
— all behind `AdminRoute` on `/admin` and `/operator/outreach`.

**Sonner's shipped motion**, read from `node_modules/sonner/dist/styles.css`:
entry/exit is `transition: transform 400ms, opacity 400ms, height 400ms,
box-shadow 200ms` on `[data-sonner-toast]`, position defaults to
`bottom-right`, lifetime defaults to `4000ms` (`4e3` in `dist/index.mjs`), with
a `200ms` unmount delay after removal. Its reduced-motion block is:

```css
@media (prefers-reduced-motion) {
  [data-sonner-toast], [data-sonner-toast] > *, .sonner-loading-bar {
    transition: none !important; animation: none !important;
  }
}
```

**Radix toast motion** — `src/components/ui/toast.tsx:26`: `data-[state=open]`
→ `slide-in-from-top-full`, `sm:slide-in-from-bottom-full`; `data-[state=closed]`
→ `fade-out-80 slide-out-to-right-full`; swipe follows the pointer through
`--radix-toast-swipe-move-x`. Viewport is `fixed top-0 … sm:bottom-0
sm:right-0` (`toast.tsx:17`). Queue config at `src/hooks/use-toast.ts:5-6`:
`TOAST_LIMIT = 1`, `TOAST_REMOVE_DELAY = 1000000`.

**Motion tokens** — `src/index.css:135-140`:

```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);
--dur-fast: 150ms;  --dur-base: 250ms;  --dur-slow: 400ms;
```

**JS vocabulary** — `src/lib/motion.ts:22-49`: `easeOutExpo = [0.16, 1, 0.3, 1]`,
`transitionFast` 150ms, `transitionBase` 250ms, `transitionSlow` 400ms,
`fadeUp` (`y: 16 → 0`), `scaleIn` (`0.96 → 1`), `staggerChildren: 0.07` /
`delayChildren: 0.05`, `tapScale = { scale: 0.97 }`.

**framer-motion `^12.34.3` is installed** (`package.json:55`) and imported by
four files: `src/lib/motion.ts`, `src/pages/HomePage.tsx`,
`src/pages/ForOwnersPage.tsx`, `src/components/ui/container-scroll-animation.tsx`.
`HomePage` is the one eagerly-imported page (`App.tsx:20`), so framer-motion is
already in the entry chunk — adding it to a shared component below costs bytes
that are already paid for. **Remotion is not a dependency**; nothing here
proposes it.

**The reduced-motion block is small and must be kept current** —
`src/index.css:619-630` currently covers `.live-dot::after` and `.card-lift`
only. Every CSS keyframe or transition proposed below names what it adds there.

**Existing brand keyframes** — `tailwind.config.ts:101-124`: `fade-in`
(`opacity 0 + translateY(8px)` → `0.4s cubic-bezier(0.25,0.1,0.25,1)`, used
once, at `src/components/home/NearbyPlayers.tsx:135`), `shimmer` (used zero
times), `accordion-up/down`. `tailwindcss-animate` supplies `animate-in`,
`fade-in-0`, `zoom-in-95`, `slide-in-from-*`, `duration-*`, `delay-*`.

---

### 100. The toast is the app's whole answer to "did that work?" **[HIGH IMPACT]**

- **Where**: every route. `src/components/ui/sonner.tsx:10-42`, mounted at
  `src/App.tsx:131`. Representative call sites:
  `src/features/profile/hooks/useProfileSettings.ts:112,116,134,137` (`/profile`),
  `src/features/booking/CheckoutPage.tsx` and
  `src/features/booking/BookingPanel.tsx` (`/book/:bookingId`, `/venue/:id`),
  `src/pages/GamesPage.tsx` (`/games`).
- **Motion**: Today success and failure enter identically — sonner's default
  rise from below at `bottom-right`, same 400ms, same curve, distinguished only
  by the words. Split them on arrival, because the two demand different amounts
  of attention. **Success**: `translateY(14px) → 0` with `opacity 0 → 1`, the
  default lift, nothing else. **Error**: no lift at all — `opacity 0 → 1` plus
  `scale 0.97 → 1` from the toast's own bottom-right corner (`transform-origin:
  100% 100%`), so it arrives *in place* rather than sliding past the eye, and
  the left edge picks up a 3px `--destructive-solid` rule that wipes down over
  the same interval. The user reads urgency before they read the sentence: a
  thing that grew where it is has stopped, a thing that slid in is passing
  through. This matters most on `/book/:bookingId`, where the difference between
  "Booking confirmed" and a payment failure is the difference between leaving
  the page and not.
- **Timing**: Success `400ms cubic-bezier(0.16, 1, 0.3, 1)` (sonner's own 400ms,
  re-curved to `--ease-out-expo`). Error `250ms cubic-bezier(0.16, 1, 0.3, 1)`
  for opacity+scale, with the edge rule wiping `scaleY(0) → 1` over the same
  250ms, `transform-origin: 0 0`. Error lifetime raised from the 4000ms default
  to `6000ms` via `toastOptions.duration`; exit stays sonner's 400ms.
- **Build**: CSS, in the `classNames` map already open at `sonner.tsx:34-38`
  (add `error:` and `success:` keys, which sonner applies alongside `toast:`).
  No new dependency, no wrapper around 55 call sites, and it stays inside the
  file that already owns toast presentation.
- **Reduced motion**: sonner's own `@media (prefers-reduced-motion)` block kills
  `transition` and `animation` on `[data-sonner-toast]` **and all its children**
  with `!important` — so today a reduced-motion user gets toasts that appear and
  vanish with zero transition, which is easier to miss than a fade, not harder.
  Fix it deliberately: in `src/index.css`, inside a
  `@media (prefers-reduced-motion: reduce)` block, re-enable opacity only —
  `[data-sonner-toast] { transition: opacity 200ms linear !important; }` — and
  leave `transform` and `height` unset so nothing moves. Reduced motion means no
  motion, not no feedback.
- **Perf**: `transform` + `opacity` for everything I am adding. Flag inherited
  from sonner, not introduced here: its base transition includes `height 400ms`,
  which is a layout-animated property on every toast that stacks or collapses.
  Leave it — overriding sonner's height animation breaks its stack maths — but
  do not add a second height-animated element inside the toast.
- **Why this is the strongest case**: it is the only motion in the app that
  fires from 55 different modules, it is the sole confirmation channel for
  bookings and payments, and the fix is confined to one file's `classNames` map.

### 101. Two toasters, two corners, two curves

- **Where**: `src/App.tsx:130-131`. The Radix stack —
  `src/components/ui/toaster.tsx` → `src/components/ui/toast.tsx` — fires from
  `src/hooks/useBlogPosts.ts`, `src/hooks/useOutreach.ts` and
  `src/components/operator/outreach/TargetDrawer.tsx` (`/admin`,
  `/operator/outreach`).
- **Motion**: On `/operator/outreach` an admin saving a target gets a Radix
  toast, and any sonner call on the same screen gets a sonner toast. On a phone
  those arrive from **opposite edges** — Radix's viewport is `fixed top-0` below
  `sm` (`toast.tsx:17`) while sonner sits bottom-right — with different exits
  (Radix leaves rightward via `slide-out-to-right-full`, sonner drops downward)
  and different queue rules (`TOAST_LIMIT = 1` at `use-toast.ts:5` replaces the
  previous message; sonner stacks). Two notification systems in one viewport is
  not a motion problem you can style away. The change is to route the three
  Radix call sites through sonner and drop `<Toaster />` from `App.tsx:130`, so
  that "the app told me something" has one arrival, one corner, one curve.
  Until that lands, at minimum pin the Radix viewport to `bottom-0 right-0` at
  all breakpoints and swap `slide-in-from-top-full` for
  `slide-in-from-bottom-full` in `toast.tsx:26`, so the two at least agree about
  which edge messages come from.
- **Timing**: If reconciled to sonner, this case has no timings of its own — it
  inherits case 100. If kept, match Radix to it: `duration-[400ms]
  ease-[cubic-bezier(0.16,1,0.3,1)]` on open, `duration-200` on close, replacing
  `tailwindcss-animate`'s defaults.
- **Build**: Neither CSS nor framer-motion — a deletion. Three imports change
  from `@/hooks/use-toast` to `sonner`, one mount goes, and
  `ui/toast.tsx` + `ui/toaster.tsx` + `hooks/use-toast.ts` become dead code.
  Cheapest motion fix in this document.
- **Reduced motion**: falls out for free once there is one toaster — it inherits
  the opacity-only override from case 100. If the Radix stack survives, its
  `animate-in`/`animate-out` classes need the same `@media (prefers-reduced-motion:
  reduce)` treatment, which they do not currently have anywhere in `index.css`.
- **Perf**: `transform`/`opacity` only, both stacks. No risk either way; the
  cost of keeping both is bundle weight (`@radix-ui/react-toast` stays) and user
  confusion, not frames.

### 102. A button entering its pending state changes two things at two speeds

- **Where**: `src/components/ui/button.tsx:8` (the shared base string), as seen
  at `src/components/common/StatusPanel.tsx:91-100` ("Try again" → spinner +
  "Retrying…", rendered by every `ErrorPanel` in the app) and
  `src/features/profile/NotificationsTab.tsx:79-88` ("Save Preferences" →
  spinner + "Saving..." on `/profile`).
- **Motion**: The base class carries `transition-all duration-200` *and*
  `disabled:opacity-50`. So when `isRetrying` flips, the opacity change
  interpolates over 200ms while the label — a different string, a different
  intrinsic width — snaps in a single frame, because `width: auto → auto` has no
  interpolable computed value and no transition fires on it. The result is a
  button that jumps size instantly and then dims slowly: one state change
  rendered as two events. Make it one. Give the pending label the same box:
  measure the widest of the two labels once and set `min-width` on the button,
  then crossfade the label content — resting label `opacity 1 → 0` over 90ms,
  spinner+pending label `opacity 0 → 1` over 90ms starting at 60ms, both
  absolutely positioned in the same grid cell so nothing reflows. The dimming
  drops to 120ms to land with them. What the user understands: the button they
  pressed is still the same button, now working — not a new control that
  appeared where the old one was.
- **Timing**: Label crossfade `90ms linear`, incoming delayed `60ms`; opacity to
  the disabled state `120ms cubic-bezier(0.16, 1, 0.3, 1)`. Total settle 150ms,
  matching `--dur-fast`. The `Loader2 animate-spin` already in place
  (`StatusPanel.tsx:94`, `NotificationsTab.tsx:82`) keeps Tailwind's 1s linear
  rotation — do not re-time it, it is the one thing in the app that already
  reads as "still going".
- **Build**: CSS/Tailwind, inside `buttonVariants`. Replace the blanket
  `transition-all` with
  `transition-[background-color,border-color,color,box-shadow,opacity,transform]`
  and add a `pending` treatment via a small wrapper (a `grid` with both labels in
  `grid-area: 1/1`). framer-motion's `layout` prop would animate the width for
  free but would put a layout-animating library on every button in the app to
  solve a problem a `min-width` solves.
- **Reduced motion**: in the `@media (prefers-reduced-motion: reduce)` block at
  `src/index.css:619`, set the crossfade to `transition: none` and swap labels
  instantly. The `min-width` stays — it is layout, not motion, and it is what
  stops the jump. The spinner also stops: add
  `.animate-spin { animation: none; }` scoped to buttons and replace it with a
  static `Loader2` at 60% opacity, since an infinite rotation is exactly what
  this media query exists to suppress.
- **Perf**: `opacity` only, on two absolutely-stacked text nodes. Explicitly
  avoids the layout thrash of animating `width`, which is the naive fix and
  would reflow the flex row the button sits in (`StatusPanel.tsx:60` — a
  `flex-wrap` row of two buttons, so a width animation can trigger a wrap
  mid-transition).

### 103. The focus ring should appear, not fade in

- **Where**: `src/components/ui/button.tsx:8` — the same base string carries
  `transition-all duration-200` and `focus-visible:ring-2 focus-visible:ring-ring
  focus-visible:ring-offset-2`. Every `Button` in the app, on every route.
- **Motion**: Tailwind implements `ring-2` as `box-shadow`. `transition-all`
  transitions `box-shadow`. So focusing a button interpolates the ring from
  transparent to `--ring` (`151 90% 47%` in the shipped dark theme,
  `index.css:200`) over 200ms — the indicator arrives *after* the focus does,
  and a user tabbing at speed through a form runs ahead of their own ring. The
  correct motion here is none: the ring must be at full strength on the frame
  focus lands. Excluding `box-shadow` from the transition list (see case 102's
  replacement) fixes it for every button at once. If a settle is wanted, animate
  only the **offset** — `ring-offset-width 0 → 2px` over 120ms — while the ring
  itself is opaque from frame one; the indicator is never absent, it just
  breathes outward.
  This is read from the class string rather than measured; a two-shot screenshot
  diff at focus + 1 frame is the check, and it is worth running before and after.
  Note the surrounding code is already careful here for good reasons —
  `src/components/ui/sonner.tsx:16-33` and
  `src/pages/NearbyFieldsPage.tsx:184-204` both document focus indicators that
  were painted and then invisible. This is the same class of defect arriving
  through timing instead of colour.
- **Timing**: Ring opacity 0ms (instant). Optional offset growth `120ms
  cubic-bezier(0.16, 1, 0.3, 1)`, i.e. under `--dur-fast`.
- **Build**: CSS/Tailwind — one class string in `buttonVariants`. Not
  framer-motion: a focus indicator that depends on JS having hydrated is a worse
  indicator than one that does not.
- **Reduced motion**: instant is already the reduced-motion answer, so the fixed
  version needs no fallback. If the optional offset growth is adopted, add
  `.focus-ring, [class*="focus-visible:ring"] { transition-property: none; }`
  to the block at `src/index.css:619`.
- **Perf**: `box-shadow` is a paint-only property — no layout, no thrash — but
  it is not compositor-accelerated, so animating it on a long list of focusable
  rows would repaint each one. Another reason the answer is "don't animate it".
  Note the `.focus-ring` utility (`index.css:418-420`) is *not* affected: its
  eight call sites (`VenueCard.tsx:55`, `TeamCard.tsx:36`, `filter-chips.tsx:55`,
  `Footer.tsx:62`, `PlayerDashboard.tsx:103`, `NearbyFieldsPage.tsx` ×2) all sit
  on elements carrying `transition-colors` or no transition at all, and
  `transition-colors` does not include `box-shadow`. The bug is specific to
  `Button`.

### 104. A switch that moves but has not saved anything

- **Where**: `/profile` → `src/features/profile/NotificationsTab.tsx:70-76`
  (four `Switch`es) and the "Save Preferences" button at
  `NotificationsTab.tsx:79-88`. Component:
  `src/components/ui/switch.tsx:12,20`.
- **Motion**: The thumb already translates 20px (`translate-x-5` — track `w-11`
  44px, less `border-2` ×2, less thumb `w-5` 20px) in Tailwind's default
  `transition-transform` 150ms `cubic-bezier(0.4, 0, 0.2, 1)`, with the track
  colour crossfading to `--primary` under `transition-colors`. That reads as
  "done". It is not done: `onCheckedChange` only calls `setNotifications`
  (`NotificationsTab.tsx:72-74`) and nothing persists until the button below is
  pressed. So four switches can sit in a state the server has never heard of,
  looking exactly like four saved switches. Motion is where to say so. On the
  first change, the Save button — which is static and easy to miss under a
  `Separator` — rises `translateY(6px) → 0` with `opacity 0.55 → 1` and its
  label changes to "Save 2 changes"; each subsequent toggle re-runs a 1px
  settle on it. Nothing about the switch itself changes, because the switch is
  telling the truth about the *control*; the button is what has to say the
  *record* is behind. On successful save (`useProfileSettings.ts:134`), the
  button returns to `opacity 0.55` in 250ms as the sonner toast arrives — two
  channels, one fact.
- **Timing**: Thumb stays at 150ms `cubic-bezier(0.4, 0, 0.2, 1)` — it is
  already correct and already matches `--dur-fast`; do not re-curve it to
  `--ease-out-expo`, a switch thumb should not overshoot its own track. Button
  entrance `250ms cubic-bezier(0.16, 1, 0.3, 1)` (`--dur-base`). Per-toggle
  settle `translateY(-1px) → 0`, `120ms`. Return to rest `250ms`.
- **Build**: CSS/Tailwind, driven off a derived `isDirty` boolean compared
  against `profile.notification_preferences` (already read at
  `NotificationsTab.tsx:48`). No framer-motion: it is one element, two states,
  and a class toggle.
- **Reduced motion**: the button's opacity change survives (0.55 → 1 is
  information, not decoration); the `translateY` and the per-toggle settle both
  go to `transform: none` in the `src/index.css:619` block. The changed-count in
  the label is the non-visual carrier and works regardless.
- **Perf**: `transform` + `opacity` only. One caveat worth stating: do **not**
  implement the "unsaved" cue by mounting or unmounting a bar under the switch
  list — the card is inside a tabbed panel on `/profile` and a mount would
  reflow the tab body on every toggle.

### 105. The empty state arrives as one thought, in order

- **Where**: `src/components/ui/empty-state.tsx:63-127`, rendered at
  `src/pages/MyBookingsPage.tsx:157-163` ("No bookings yet" → "Find a venue"),
  `src/pages/GamesPage.tsx:494-500`, `src/pages/TeamsPage.tsx`,
  `src/pages/CommunityPage.tsx`, `src/pages/MessagesPage.tsx`,
  `src/pages/BlogPage.tsx` — 17 call sites, eleven of them under `/owner/*`.
- **Motion**: The component's own docstring makes the case better than I can:
  sign up, and Games, Teams, the community feed and the dashboard are all empty
  at once, so these are the first four screens a new account meets. Today all of
  them snap in fully formed the instant the query resolves, which is
  indistinguishable from a page that failed to render its content. Stagger the
  four parts in reading order — icon tile, `h2`, description, action row — each
  `opacity 0 → 1` with `translateY(10px) → 0`. The eye is led from the symbol to
  the sentence to the button, which is the order the copy was written in, and
  the arrival makes clear the screen is *finished* rather than *loading*.
  Deliberately not a `scaleIn` on the icon tile: `scale` resamples the
  `rounded-2xl bg-primary/10` chip's edge, and `index.css:588-616` already
  settled the lift-not-scale argument for this codebase.
- **Timing**: `staggerChildren: 0.07`, `delayChildren: 0.05` and `transitionSlow`
  (400ms, `[0.16, 1, 0.3, 1]`) — i.e. `staggerChildren` + `fadeUp` from
  `src/lib/motion.ts:28-46` unchanged, but with `y: 10` instead of `16`, because
  a 16px rise on a centred panel with `py-16` reads as the whole page settling.
  Last element lands at ~610ms.
- **Build**: framer-motion. `EmptyState` renders a variable subtree (`hasPrimary`
  / `hasSecondary` / `tip` are all conditional, `empty-state.tsx:60-61,116`), and
  `staggerChildren` handles a variable child count without hard-coded
  `delay-[Nms]` classes per slot. It is already in the entry chunk via
  `HomePage`, so this adds no bytes to any route.
- **Reduced motion**: framer-motion honours `prefers-reduced-motion` natively —
  `src/lib/motion.ts:3-20` documents the measurement (17 elements staged → 0
  under `reduce`), so `fadeUp` resolves straight to its final state and the
  stagger collapses. No extra work, and no CSS block needed.
- **Perf**: `transform` + `opacity` only. Both are composited; a four-child
  stagger on a mounting panel has no layout implications because the panel's
  height is fixed by `py-12`/`py-16` before any child animates
  (`empty-state.tsx:67`).

### 106. A failed request and an empty shelf must not arrive the same way

- **Where**: `src/components/common/StatusPanel.tsx:37-62` (the shared shell,
  `tone: "neutral" | "danger" | "positive"`) and
  `StatusPanel.tsx:75-104` (`ErrorPanel`, which is `tone="danger"` + `WifiOff` +
  a retry button). Live on `/venue/:id`, `/my-bookings`, `/games`, `/messages`,
  `/team/:id`, `/blog/:slug`, `/owner/*` — 23 files import one of the two.
- **Motion**: The component exists precisely because these two facts kept
  getting merged — the docstring records pages rendering "Venue not found" when
  the venue was fine and only the request had failed. The rendering is now
  separate; the *arrival* is not. Split it. **Empty** (`tone="neutral"`) uses
  case 105's staggered rise: unhurried, finished, nothing wrong. **Error**
  (`tone="danger"`) does not rise at all — the whole panel is `opacity 0 → 1`
  over 180ms with no `translateY`, and the icon chip alone gets a single
  outward ring: a pseudo-element at `inset: 0`, `border: 2px solid
  hsl(var(--destructive) / 0.5)`, `scale(1) → scale(1.5)` with `opacity 0.5 → 0`,
  played **once**, not looped. The absence of the rise is the signal: an empty
  state settles into place, an error is already there and stopped. A user who has
  seen both twice can tell which one they are looking at before reading a word —
  which matters because the recovery differs (retry vs. go somewhere else).
- **Timing**: Error panel `opacity 180ms linear` — deliberately shorter than the
  empty state's 400ms and deliberately linear, since an ease-out curve is what
  makes the empty state feel settled. Ring pulse `520ms cubic-bezier(0.16, 1,
  0.3, 1)`, single iteration, starting at 80ms. Reuse the geometry of
  `live-ping` (`index.css:578-581`) but not its `infinite` — a looping pulse on
  an error reads as "still trying", which is false.
- **Build**: CSS. Add a `@keyframes status-ping` to `tailwind.config.ts:101-118`
  beside the existing `fade-in`/`shimmer`, and apply it from the `toneChip` map
  at `StatusPanel.tsx:31-35`, which already branches on tone and is the single
  place all 22 call sites pass through. No JS, because these panels render on
  the failure path and should not depend on anything more than the page already
  needed.
- **Reduced motion**: add `status-ping` to the block at `src/index.css:619-630`
  with `animation: none`, leaving the `bg-destructive/10 text-destructive` chip
  (`StatusPanel.tsx:33`) to carry the tone by colour — which already clears AA
  per the `--destructive` note at `index.css:55-65`. The panel's own opacity fade
  can stay: 180ms of opacity is not vestibular motion.
- **Perf**: `transform` + `opacity` on a pseudo-element that is `position:
  absolute` inside the `h-14 w-14` chip, so the ring cannot affect layout even
  as it scales past the chip's bounds. No `box-shadow` animation.

### 107. The 404 should be the first thing seen, not the second

- **Where**: `/*` → `src/pages/NotFound.tsx:29-42`, mounted at `App.tsx:248`.
  `NotFound` is `lazy()` (`App.tsx:60`) inside the `Suspense` whose fallback is
  the full-screen spinner at `App.tsx:111-115`.
- **Motion**: Following a dead venue link today gives you a centred spinner on
  `bg-background`, then — cut, no transition — a compass and "We can't find that
  page". The spinner is a lie about a page that is already decided: nothing is
  being fetched, only a chunk. Two changes. (a) Delay the `PageLoader`'s own
  appearance: it renders at `opacity 0` and animates to `1` starting at 250ms,
  so a chunk that loads in 80ms — the common case for a warm cache — shows no
  spinner at all and the 404 panel is the first frame. (b) When the panel does
  follow a visible spinner, hand over instead of cutting: spinner `opacity 1 → 0`
  over 120ms, panel `opacity 0 → 1` with `translateY(8px) → 0` over 300ms,
  overlapping by 60ms. The compass icon (`NotFound.tsx:31`) rotates
  `-12deg → 0deg` across the same 300ms — a compass settling on a bearing, which
  is the one place in this app where an icon's own metaphor earns its motion.
  The two `Button`s (`NotFound.tsx:35-40`) come in on case 105's stagger, so
  "Browse venues" and "Back to home" are the last things to land and the eye
  finishes on the way out.
- **Timing**: Loader delay 250ms then `opacity 0 → 1` over 150ms. Panel
  `300ms cubic-bezier(0.16, 1, 0.3, 1)` (between `--dur-base` and `--dur-slow`).
  Compass rotation same 300ms, same curve — no spring; `--ease-spring`
  overshoots ~10% and a compass needle that overshoots its bearing is a
  different, wronger idea.
- **Build**: CSS/Tailwind for the loader delay (`animate-in fade-in-0
  duration-150 delay-[250ms] fill-mode-backwards` — `tailwindcss-animate` is
  already a plugin and `fill-mode-backwards` keeps it invisible during the
  delay). framer-motion for the panel, reusing `staggerChildren` from case 105
  so the 404 and every empty state in the app share one entrance. The Suspense
  boundary cannot cross-fade its fallback out without `AnimatePresence` around
  `<Routes>`, which is a routing change and belongs to part 01 — the delayed
  loader gets ~90% of the benefit with none of that.
- **Reduced motion**: framer-motion resolves the panel and the compass rotation
  to their final state automatically (`src/lib/motion.ts:3-20`). The loader's
  delay is *kept* under `reduce` — a 250ms delay is not motion, it is a decision
  not to render — but its fade becomes instant via the
  `@media (prefers-reduced-motion: reduce)` block, where `animate-in` utilities
  need an explicit `animation: none`.
- **Perf**: `opacity` + `transform` (`rotate` is a transform) only. The 404 is
  inside `<Layout>` (`NotFound.tsx:25`) under a sticky glass header
  (`index.css:427-448`), so keep the animated subtree to the `StatusPanel` and
  never animate the container — a `backdrop-filter: blur(18px)` bar composited
  above a large animating element is the one combination in this app that
  reliably costs frames on mobile.

### 108. Retry has to look like it happened, even when it fails again

- **Where**: `src/components/common/RouteErrorBoundary.tsx:53-69` — the
  route-level crash screen, wrapping every route (`App.tsx:136`). The retry
  button is `RouteErrorBoundary.tsx:62`:
  `onClick={() => this.setState({ error: null })}`.
- **Motion**: If the child throws again — the likely outcome, since the docstring
  records a bad data shape reaching `AchievementsSection` and blanking the
  dashboard — React re-runs `getDerivedStateFromError` and the boundary renders
  the *identical* panel. Zero pixels change. The user has no way to tell whether
  the button did nothing, or did everything and failed. Give the attempt a
  visible duration and a visible outcome. On press: the button enters case 102's
  pending state, the panel drops to `opacity 0.5` over 140ms and holds; after
  360ms the error clears and the child remounts. If it succeeds, the panel
  unmounts and the page arrives on its own terms. If it throws again, the panel
  returns to `opacity 1` over 200ms and its description gains a line that was not
  there before — "Tried twice. If this keeps happening, the pages in the nav
  above still work." — driven by an `attempts` counter on state. The words are
  what carry the failure; the dim-and-return is what carries "your press was
  received".
- **Timing**: Dim `140ms linear` to `opacity 0.5`; hold `220ms`; restore
  `200ms cubic-bezier(0.16, 1, 0.3, 1)`. Total 360ms before the remount — long
  enough to perceive, short enough that a successful retry does not feel
  throttled. Explicitly **no shake, no horizontal displacement**: `/login` and
  `/signup` already decided against shaking on error (part 09, case 79) and a
  crash screen is the worst place to reintroduce it.
- **Build**: CSS/Tailwind on a `retrying` boolean added to the boundary's `State`
  (`RouteErrorBoundary.tsx:28-30`), plus one `setTimeout` in the click handler.
  This is a class component that must keep working when the tree below it is
  broken — do not put framer-motion inside an error boundary's fallback, because
  the fallback's job is to render when other things have failed.
- **Reduced motion**: the opacity dim stays (it is opacity, not movement, and it
  is the only feedback a keyboard user gets before the text updates); the 360ms
  delay stays, since it is timing rather than motion. Nothing to add to the
  `index.css:619` block — but `attempts` must be surfaced non-visually too:
  render the new description line inside an `aria-live="polite"` region so a
  screen-reader user hears "Tried twice" rather than silence.
- **Perf**: `opacity` on a single container. Irrelevant to frame budget — the
  panel is roughly ten nodes — and the 360ms delay is deliberate cost, not
  incidental. Worth noting the remount itself is the expensive part and is
  unchanged by any of this.

---

### Ordering, if these ship one at a time

1. **103** — one class string, fixes the focus indicator on every button.
2. **101** — a deletion; removes a whole second notification system.
3. **100** — one file, the app's most-fired motion.
4. **102** — shared `Button`, unblocks 108.
5. **105 / 106** — the two panels, together, since the point is the contrast.
6. **107**, **104**, **108** — route- and page-local, in any order.
