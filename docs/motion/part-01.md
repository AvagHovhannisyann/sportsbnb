## App boot, splash & route transitions

Scope: `src/App.tsx`, `src/components/SplashScreen.tsx`, the Suspense boundary
around `<Routes>`, the auth gates (`ProtectedRoute` / `RequireRole` /
`AdminRoute`), and `src/components/ui/skeleton.tsx` plus its largest consumer,
the `/venues` grid.

### What the repo already gives us

Read before proposing anything; every case below is built from these and
nothing else.

**Motion tokens** — `src/index.css:135-140`:

```
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);
--dur-fast: 150ms;  --dur-base: 250ms;  --dur-slow: 400ms;
```

**Brand surfaces (dark, the shipped theme — `index.html` has `class="dark"` on
`<html>`)** — `src/index.css:156-199`: `--background: 160 22% 5%`,
`--surface-1: 160 18% 10%`, `--surface-2: 160 15% 14%`,
`--surface-3: 158 13% 18%`, `--primary: 151 90% 47%` (electric court green),
`--muted: 158 13% 13%`.

**Tailwind keyframes** — `tailwind.config.ts:101-124`: `accordion-down/up`,
`fade-in` (`opacity 0 + translateY(8px)` → `0.4s cubic-bezier(0.25,0.1,0.25,1)`),
and `shimmer` (`background-position -200% → 200%`, `2s linear infinite`).
`animate-fade-in` is used **once** in the whole app
(`src/components/home/NearbyPlayers.tsx:135`); `animate-shimmer` is used
**zero** times. `tailwindcss-animate` is a plugin, so `animate-in`,
`fade-in-0`, `zoom-in-95`, `duration-*`, `delay-*` and `fill-mode-backwards`
are all available (21 uses of `animate-in` today).

**framer-motion `^12.34.3` is installed** (`package.json:55`) and imported by
exactly four files: `src/lib/motion.ts`, `src/pages/HomePage.tsx`,
`src/pages/ForOwnersPage.tsx`,
`src/components/ui/container-scroll-animation.tsx`. So it is proposable.
**Remotion is not a dependency** — nothing below proposes it.

`src/lib/motion.ts:52-56` already exports the exact variant this section
needs, and it is dead code:

```ts
/** Page-level enter transition (use with AnimatePresence in layouts). */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: transitionBase },
  exit:    { opacity: 0, transition: transitionFast },
};
```

`AnimatePresence` appears in the repository **only inside that comment** — grep
returns one hit, line 51 of the same file. No route has ever animated.

**Standing reduced-motion note.** framer-motion is covered: `src/lib/motion.ts`
documents a measured check (17 elements staged at `no-preference`, 0 at
`reduce`) and `HomePage.tsx:83` uses `useReducedMotion()` to render the final
state outright. CSS is **not** covered: the `@media (prefers-reduced-motion:
reduce)` block at `src/index.css:619-630` handles exactly two things,
`.live-dot::after` and `.card-lift`. Every Tailwind `animate-*` class in this
section — `animate-spin` (×2 in boot code), `animate-pulse` (×5) — runs
unguarded today. Each case below states its own fallback; they belong in that
same block.

---

### 1. Cold-boot-only splash gate **[HIGH IMPACT]**

- **Where**: every route in the app. `src/App.tsx:118-123` (`useState(true)`,
  no condition) and `src/components/SplashScreen.tsx:6-12`.
- **Motion**: today the splash is a `fixed inset-0 z-[9999]` sheet held opaque
  for 1800ms, then faded for 500ms — **2300ms of flat `bg-background` over
  every page, on every load, including deep links to `/venue/:id` and returns
  from the Ameria payment callback at `/game/:id/join-status`**. There is no
  session gate; `sessionStorage` appears nowhere in `src/`. The change is to
  make the sheet's presence itself the animation: mount it only when
  `sessionStorage.getItem("sbnb.booted") === null`, dismiss it the moment the
  first route's Suspense chunk resolves (cap 900ms, floor 400ms so it never
  strobes), then write the key. What the user understands: *the app is
  starting* on their first visit of the session, and *this page is already
  here* on every navigation and every re-entry after a payment redirect.
- **Timing**: floor 400ms hold, cap 900ms; exit 260ms `cubic-bezier(0.16,1,0.3,1)`
  (`--ease-out-expo`). Down from 2300ms to a 660ms worst case.
- **Build**: plain state + `sessionStorage` in `App.tsx`, CSS transition for
  the fade — no library needed for a component that must run before any bundle
  work, and pulling framer-motion into the boot path would defeat the point.
- **Reduced motion**: under `reduce`, skip the fade entirely — unmount on the
  same timer with `transition: none`. The splash is a cover, not information;
  there is nothing to lose by cutting it.
- **Perf**: `opacity` only on a `position: fixed` layer — composited, no
  reflow. The real perf win is negative work: the sheet stops occluding LCP
  content for 2.3s.
- **Why this one**: `scripts/prerender.mjs` writes real crawler-facing HTML
  into `dist/<route>/index.html`, and `scripts/lib/stub-page.mjs:517-536`
  documents the splash silently invalidating two audits —
  `focus-visible.mjs` reported the logo link "entirely covered" on 27 routes,
  and `glass-contrast.mjs` sampled backdrop luminance off a flat splash. A
  2.3s opaque sheet on every load is the single largest motion defect in the
  app, and it is also the cheapest to fix.

### 2. Splash-to-content handoff

- **Where**: boot on any route. `src/components/SplashScreen.tsx:14-19` (the
  sheet) against whatever `src/App.tsx:143` renders under it.
- **Motion**: the sheet currently blinks out — `opacity-100 → opacity-0` over
  500ms with the page underneath completely static, so the transition reads as
  "one screen deleted" rather than "this screen became that screen". Instead:
  the sheet fades `opacity 1 → 0` **while** its logo group scales `1 → 1.06`
  (it recedes, like a lens pull), and the app root beneath animates
  `opacity 0 → 1` starting 80ms in. What the user understands: the thing they
  were waiting for has arrived *behind* the loader, not replaced it.
- **Timing**: sheet `opacity` 260ms `cubic-bezier(0.16,1,0.3,1)`; logo `scale`
  320ms same curve; app root `opacity` 240ms linear, `delay: 80ms`. Total
  overlap window 400ms.
- **Build**: Tailwind + CSS transitions on both layers. The app root fade is
  one `animate-in fade-in-0 duration-200 delay-75 fill-mode-backwards` on the
  wrapper — `tailwindcss-animate` supplies all four utilities, no new
  dependency and no re-render.
- **Reduced motion**: sheet unmounts with `transition: none`; the app root gets
  no entrance class at all, so content is at `opacity: 1` from its first paint.
- **Perf**: `opacity` + `transform: scale` only. Do **not** animate the app
  root's `filter` or `backdrop-filter` here — `Header` is
  `glass sticky` (`src/components/layout/Header.tsx:51`) and a blur crossfade
  behind a `backdrop-filter: blur(16px)` bar re-rasterises the whole viewport
  every frame.

### 3. Splash logo: indefinite pulse → determinate settle

- **Where**: `src/components/SplashScreen.tsx:22-33`.
- **Motion**: `className="w-16 h-16 object-contain animate-pulse"` runs
  `opacity: 1 → .5 → 1` on a 2s loop forever, alongside a second spinner at
  line 32 (`animate-spin`). Two indefinite loops saying the same nothing. It
  reads as "stalled". Replace with: the mark **arrives once** (`scale 0.94 → 1`,
  `opacity 0 → 1`), then a 2px rail under it fills left-to-right via
  `transform: scaleX(0) → scaleX(1)` with `transform-origin: left`, driven by
  the actual boot progress from case 1 — and the spinner at line 32 is deleted.
  What the user understands: how much longer, instead of merely that something
  is happening.
- **Timing**: mark 420ms `cubic-bezier(0.16,1,0.3,1)` (matches `--dur-slow:
  400ms`); rail `scaleX` 900ms `cubic-bezier(0.16,1,0.3,1)` — the same cap as
  the splash hold, so the rail finishes exactly as the sheet leaves.
- **Build**: Tailwind + a CSS custom property for the rail's scale. The rail is
  `bg-primary` (`151 90% 47%`) on `bg-surface-2`; no library, because this must
  paint before any lazy chunk resolves.
- **Reduced motion**: no arrival animation and no rail motion — render the mark
  at final scale/opacity and the rail at `scaleX(1)`, i.e. a static primary
  underline. Add `.splash-rail { animation: none; transform: scaleX(1); }` to
  the `reduce` block in `src/index.css:619`.
- **Perf**: `transform` + `opacity` only. Specifically **not** `width: 0% →
  100%`, which would lay out and paint the rail every frame; `scaleX` on a
  fixed-width element is composited.

### 4. Route skeleton replaces the full-screen `PageLoader`

- **Where**: every lazy route — 60+ of them, everything except `/`
  (`HomePage` is the one eager import, `src/App.tsx:20`). The fallback is
  `src/App.tsx:111-115`:
  `<div className="min-h-screen flex items-center justify-center bg-background">`
  wrapping a spinning ring.
- **Motion**: navigating `/venues → /venue/:id` currently blanks the entire
  viewport — `Header`, `Footer` and `MobileNav` all unmount, because `Layout`
  lives *inside* each page, not around `<Routes>`. Replace with a fallback that
  renders `<Layout>` chrome plus a body-shaped skeleton, so what animates is
  only the content column: skeleton blocks fade `opacity 0 → 1`, nothing else
  moves. What the user understands: navigation succeeded and the page is
  filling in — not that the app fell over. It also fixes a real a11y gap: this
  fallback has no `role="status"` and no `aria-label`, while ~20 other loaders
  in the app do (`AdminRoute.tsx:17`, `RequireRole.tsx:31`,
  `DiscoverPage.tsx:617-621`, …), so route changes are currently announced to
  screen readers as silence.
- **Timing**: skeleton container `opacity 0 → 1` over 150ms linear (`--dur-fast`);
  no `y` offset — a translate here fights the browser's scroll restoration on
  back-navigation.
- **Build**: Tailwind, inside `App.tsx`. Keeping the fallback dependency-free
  matters: it renders while a chunk is still in flight, so it must be in the
  entry bundle.
- **Reduced motion**: drop the fade — render the skeleton at `opacity: 1`. The
  skeleton's own shimmer is handled in case 8.
- **Perf**: `opacity` only. The layout-thrash risk is on the other side —
  the skeleton's box sizes must match the real page's, or you have simply
  moved the CLS. `scripts/layout-shift.mjs` already measures this; see case 9
  for the precedent (a 5/4 vs 3/2 mismatch shifted every card 43px).

### 5. Delay-gated Suspense fallback

- **Where**: the single `<Suspense fallback={<PageLoader />}>` at
  `src/App.tsx:143` wrapping all of `<Routes>`.
- **Motion**: with a warm HTTP cache most lazy chunks resolve in 20-80ms, so
  today the loader appears and vanishes inside two frames — a white flash that
  reads as a glitch, not as loading. Gate it: the fallback mounts immediately
  (it must, React gives no choice) but is `opacity: 0` until 250ms have
  passed, then fades in. What the user understands: fast navigations feel
  instant; only genuinely slow ones get a loading state, and that state
  therefore means something.
- **Timing**: `opacity 0 → 1`, 150ms linear, `animation-delay: 250ms`,
  `animation-fill-mode: backwards`. 250ms is the standard "user has noticed a
  delay" threshold and sits just above `--dur-base`.
- **Build**: one Tailwind string on the fallback wrapper —
  `animate-in fade-in-0 duration-150 delay-[250ms] fill-mode-backwards`. All
  four utilities come from `tailwindcss-animate`, already a dependency
  (`package.json:70`); `fill-mode-backwards` is what holds it at `opacity: 0`
  during the delay rather than flashing at 1 first.
- **Reduced motion**: keep the *delay*, drop the *fade* — under `reduce` the
  fallback should still stay invisible for 250ms and then appear at full
  opacity instantly. The delay is anti-flash, which reduced-motion users want
  more than anyone, not decoration.
- **Perf**: `opacity` only, on an element that is alone on screen. Zero layout
  cost.

### 6. Route enter transition (the dead `pageTransition` variant)

- **Where**: around `<Routes>` in `src/App.tsx:144-249`, keyed on
  `useLocation().pathname`. Uses `pageTransition` from `src/lib/motion.ts:52`.
- **Motion**: route changes are currently instantaneous swaps with no
  continuity — `/venues → /games → /teams` all look like the page was replaced
  by a different app. Wrap `<Routes>` in `<AnimatePresence mode="sync">` with a
  `motion.div` keyed by pathname, running **enter only**: `opacity 0 → 1`,
  `y: 8px → 0`. Deliberately no exit animation, despite `pageTransition.exit`
  existing — an exit under `mode="wait"` adds its full duration to every
  navigation's perceived latency, which is the classic way route transitions
  make an app feel slower than no transition at all. What the user understands:
  this is new content arriving in the same app, and it arrived just now.
- **Timing**: 250ms `cubic-bezier(0.16,1,0.3,1)` — exactly `transitionBase` in
  `src/lib/motion.ts:25`, which mirrors `--dur-base` / `--ease-out-expo`. No
  stagger; the page's own sections handle that.
- **Build**: framer-motion. `AnimatePresence` keyed on a route is the one thing
  CSS genuinely cannot express (it must keep the outgoing tree mounted), and
  the variant is already written and exported — this case is wiring, not new
  vocabulary.
- **Reduced motion**: `useReducedMotion()` → pass `initial={false}` and drop
  the variants, matching the pattern `HomePage.tsx:102-104` already uses
  (`revealProps = prefersReduced ? {} : {...}`). Content renders at its final
  position with no interpolation.
- **Perf**: `opacity` + `transform: translateY` only, both composited. Two
  cautions: (a) the 8px `y` must not be applied on `POP` navigations or it
  fights scroll restoration — read `useNavigationType()` and use
  `initial={false}` for `POP`; (b) `RouteErrorBoundary` (`src/App.tsx:136`)
  sits *outside* the Suspense boundary and resets on pathname change, so the
  animated wrapper must go **inside** it — otherwise a caught render error
  animates the error panel as if it were a route.

### 7. One loader language across the three auth gates

- **Where**: `src/components/auth/ProtectedRoute.tsx:12-18` (31 route
  wrappings in `App.tsx`), `src/components/auth/RequireRole.tsx:31` (14 owner
  routes), `src/components/admin/AdminRoute.tsx:17` (3 operator/admin routes).
- **Motion**: there are currently three different spinners on the boot path.
  `PageLoader` uses `border-3 border-primary/30 border-t-primary`;
  `ProtectedRoute` uses `border-b-2 border-primary` — a different ring, a
  different weight, on a `min-h-screen` blank. Hitting `/my-bookings` cold can
  show all three in sequence: splash, chunk spinner, auth spinner. Collapse
  them to one shared component and one entrance, delay-gated exactly as in
  case 5, so a session that resolves from local storage in <100ms shows
  nothing at all. What the user understands: one wait, not three; and if it is
  quick, no wait happened.
- **Timing**: identical to case 5 — `opacity 0 → 1`, 150ms linear, 250ms delay,
  `fill-mode-backwards`. Spinner rotation stays at Tailwind's `animate-spin`
  default (`1s linear infinite`).
- **Build**: Tailwind + a shared `<RouteFallback>` component. These render
  during auth resolution, before any page code — keep them dependency-free.
- **Reduced motion**: `animate-spin` is unguarded today. Under `reduce`,
  replace rotation with a static ring plus a 3-dot opacity cycle at 1200ms, or
  — simpler and safer — a static ring and the existing `role="status"` text,
  since the announcement carries the meaning. Add the rule to
  `src/index.css:619`.
- **Perf**: `transform: rotate` on a 32px element, composited. Note
  `min-h-screen` on `ProtectedRoute`'s wrapper forces a full-viewport paint of
  `--background`; scoping it to the content area (case 4's `Layout` fallback)
  removes that.

### 8. Skeleton: `animate-pulse` → composited shimmer sweep

- **Where**: `src/components/ui/skeleton.tsx` —
  `cn("animate-pulse rounded-md bg-muted", className)` — the base for every
  skeleton in the app, most visibly the 6-card grid at
  `src/pages/DiscoverPage.tsx:622-647`.
- **Motion**: `animate-pulse` breathes the whole block `opacity 1 → .5 → 1`
  over 2s, which at six cards × eight blocks is 48 elements throbbing in
  lockstep — legible as "broken", not "loading". Replace with a directional
  sweep: a `::after` gradient (`transparent → hsl(var(--surface-3)) →
  transparent`, 100deg) translated `translateX(-100%) → translateX(100%)` under
  `overflow: hidden`. Direction implies progress and reading order; a pulse
  implies a heartbeat. `tailwind.config.ts:114-117` **already defines a
  `shimmer` keyframe** (`background-position -200% → 200%`, `2s linear
  infinite`) and it is used zero times in `src/` — this case retires that dead
  definition in favour of a transform-based one.
- **Timing**: 1600ms `linear`, infinite, with a `400ms` gap between sweeps so
  it does not read as a continuous band. Stagger the sweep across the grid by
  `60ms × column` so the row reads left-to-right.
- **Build**: Tailwind + a new keyframe in `tailwind.config.ts`. CSS, not
  framer-motion: this animates on the compositor with no JS on the main thread
  during exactly the period when the main thread is busy parsing the chunk and
  running the query.
- **Reduced motion**: no sweep. Static `bg-muted` (`158 13% 13%`) blocks with a
  1px `border-border` (`157 12% 22%`) outline so they still read as placeholder
  boxes rather than filled content. Rule goes in the `reduce` block at
  `src/index.css:619`: `.skeleton::after { animation: none; display: none; }`.
- **Perf**: **this is the reason not to reuse the existing keyframe.**
  `background-position` repaints the element every frame — at 48 skeletons that
  is a real cost on a mid-range Android during chunk parse. `transform:
  translateX` on a `::after` layer is composited. Also cap it: elements below
  the fold should not shimmer (`content-visibility: auto` on the grid).

### 9. Skeleton → results crossfade on `/venues`

- **Where**: `/venues` → `src/pages/DiscoverPage.tsx:613-660`, the
  `isLoading ? skeletons : isError ? <ErrorPanel/> : cards` ladder, rendering
  `src/components/venues/VenueCard.tsx`.
- **Motion**: the swap is currently a hard cut — 6 skeletons vanish, N cards
  appear in the same frame. The geometry is already right (the comment at
  `DiscoverPage.tsx:627-632` records fixing `aspect-[5/4]` → `aspect-[3/2]` to
  match `VenueCard`, which had been shifting every card 43px, now measured by
  `scripts/layout-shift.mjs`), so the boxes do not move — but the *content*
  teleports. Crossfade instead: skeleton grid `opacity 1 → 0`, results
  `opacity 0 → 1` with `y: 6px → 0`, first 8 cards staggered. What the user
  understands: the placeholder they were looking at *became* this venue —
  same box, same position, real data now.
- **Timing**: skeletons out 120ms linear; results in 220ms
  `cubic-bezier(0.16,1,0.3,1)` starting at 60ms; stagger 40ms, **capped at 8
  items** (`staggerChildren: 0.04` — `staggerChildren: 0.07` from
  `src/lib/motion.ts:45` uncapped would take 2.8s on a 40-venue grid, which is
  slower than the query). Cards 9+ share card 8's delay.
- **Build**: framer-motion, reusing `fadeUp` and `staggerChildren` from
  `src/lib/motion.ts:28-46`. CSS cannot express "stagger the first 8 of an
  unknown-length list, then stop"; `custom={Math.min(i, 7)}` on a variant can.
- **Reduced motion**: `useReducedMotion()` → render the grid with no variants,
  same `revealProps = prefersReduced ? {} : {...}` shape as
  `HomePage.tsx:101-104`. Cards appear at final opacity and position, and the
  skeletons are removed in the same frame.
- **Perf**: `opacity` + `translateY` only, and the crossfade window is 60ms of
  overlap so both grids are mounted only briefly. Watch one thing: the two
  grids must be absolutely stacked or sequenced, never both in normal flow at
  once, or the page height doubles for those 60ms and you have re-introduced
  the exact CLS `layout-shift.mjs` was written to catch.
