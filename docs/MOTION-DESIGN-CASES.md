# SportsBnB — motion design cases

100 numbered cases, merged from twelve area drafts and renumbered contiguously.

## Motion principles

Motion here answers a question the interface would otherwise leave open: *did
that register, what changed, where did it go, how much longer.* A booking
marketplace is a sequence of commitments — pick a slot, hold it, pay a bank we
do not control, admit a person to a squad — and at each seam the user is
deciding whether to trust the screen. Motion carrying no such answer is cut;
several cases below exist purely to remove animation that lies.

Restraint is the method: one easing family (`--ease-out-expo` for arrivals,
`--ease-spring` for the rare completion, a fast ease-in for exits), durations
from `--dur-fast/base/slow`, and loops only where something is genuinely still
happening.

Performance is a constraint, not a preference — `transform` and `opacity` unless
a case names the exception and pays for it. Anything touching layout,
`box-shadow`, `background-position` or `backdrop-filter` flags its cost.

Accessibility is part of the case, not a coda. Every entry states its
`prefers-reduced-motion: reduce` behaviour, and no case is accepted if
information lives only in the movement.

## What every case is built from

Verified against the working tree, so the sections below do not restate it:

- **framer-motion `^12.34.3` is installed** (`package.json`) and is now imported
  by eleven files: the shared vocabulary `src/lib/motion.ts`, plus
  `src/pages/HomePage.tsx`, `src/pages/DiscoverPage.tsx`,
  `src/pages/VenueDetailsPage.tsx`, `src/pages/GamesPage.tsx`,
  `src/pages/LoginPage.tsx`, `src/pages/SignupPage.tsx`,
  `src/pages/ForOwnersPage.tsx`, `src/pages/owner/OwnerOverviewPage.tsx`,
  `src/components/venue/VenueGallery.tsx` and
  `src/components/ui/container-scroll-animation.tsx`. Any older note claiming it
  is unavailable, or used by "exactly four files", is out of date. Cases marked
  **Already built** below cite the file that ships them.
- **Shared JS vocabulary** — `src/lib/motion.ts`: `easeOutExpo = [0.16, 1, 0.3, 1]`
  (mirroring `--ease-out-expo` in `src/index.css:136`), `transitionFast/Base/Slow`
  = 150/250/400ms, `fadeUp` (`y: 16 → 0`), `fadeIn`, `scaleIn` (`0.96 → 1`),
  `staggerChildren` (`0.07` / `delayChildren: 0.05`), `tapScale = { scale: 0.97 }`
  and `pageTransition`.
- **CSS tokens** — `src/index.css:136-140`:
  `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`,
  `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`,
  `--dur-fast: 150ms`, `--dur-base: 250ms`, `--dur-slow: 400ms`.
  Plus `--shadow-ring-primary` (`:130` light, `:228` dark) and `.live-dot` /
  `@keyframes live-ping` (`:568-581`).
- **Brand.** Dark ships (`index.html` carries `class="dark"` on `<html>`).
  `--primary: 151 90% 47%` (electric court green), `--success: 151 80% 44%`,
  `--warning: 42 95% 55%`, `--destructive: 358 72% 68%`, `--radius: 0.875rem`.
- **Tailwind.** `tailwindcss-animate` is a registered plugin
  (`tailwind.config.ts:158`), so `animate-in`, `fade-in-0`, `zoom-in-95`,
  `slide-in-from-*`, `duration-*`, `delay-*` and `fill-mode-backwards` are
  available with no new dependency. Project keyframes are only `fade-in`,
  `shimmer`, `accordion-down/up` (`tailwind.config.ts:101-124`).
- **The CSS reduced-motion block is `src/index.css:619-630`** and covers exactly
  two selectors, `.live-dot::after` and `.card-lift`. Every CSS case below names
  what it has to add there; every JS case branches on `useReducedMotion()`.
- **Remotion is not a dependency.** Nothing below proposes it.

## Contents

1. [App boot, splash & route transitions](#1-app-boot-splash--route-transitions) — cases 1–7
2. [Landing hero & above-the-fold](#2-landing-hero--above-the-fold) — cases 8–15
3. [Landing scroll storytelling](#3-landing-scroll-storytelling) — cases 16–24
4. [Search, filters & discovery](#4-search-filters--discovery) — cases 25–33
5. [Venue detail & gallery](#5-venue-detail--gallery) — cases 34–42
6. [Availability & calendar](#6-availability--calendar) — cases 43–51
7. [Booking flow & hold timer](#7-booking-flow--hold-timer) — cases 52–57
8. [Payment result & confirmation](#8-payment-result--confirmation) — cases 58–65
9. [Auth: login, signup, reset](#9-auth-login-signup-reset) — cases 66–74
10. [Owner dashboard & earnings](#10-owner-dashboard--earnings) — cases 75–83
11. [Games, teams & community](#11-games-teams--community) — cases 84–91
12. [Empty states, errors & micro-interactions](#12-empty-states-errors--micro-interactions) — cases 92–100

Closing: [Implement these 12 first](#implement-these-12-first)

---

## 1. App boot, splash & route transitions

Scope: `src/App.tsx`, `src/components/SplashScreen.tsx`, the Suspense boundary
around `<Routes>`, the auth gates (`ProtectedRoute` / `RequireRole` /
`AdminRoute`), and `src/components/ui/skeleton.tsx`.

Two facts this section leans on. `src/lib/motion.ts:52-56` already exports the
exact variant it needs and it is dead code:

```ts
/** Page-level enter transition (use with AnimatePresence in layouts). */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: transitionBase },
  exit:    { opacity: 0, transition: transitionFast },
};
```

And `AnimatePresence` appears at route level nowhere — no route has ever
animated. Separately, `animate-fade-in` is used **once** in the whole app
(`src/components/home/NearbyPlayers.tsx:135`) and `animate-shimmer` **zero**
times, so both existing keyframes are effectively unclaimed.

### 1. Cold-boot-only splash gate **[HIGH IMPACT]**

- **Where**: every route in the app. `src/App.tsx:119-124` (`useState(true)`,
  no condition) and `src/components/SplashScreen.tsx:6-12`.
- **Motion**: today the splash is a `fixed inset-0 z-[9999]` sheet held opaque
  for 1800ms, then faded for 500ms — **2300ms of flat `bg-background` over
  every page, on every load, including deep links to `/venue/:id` and returns
  from the Ameria payment callback at `/game/:id/join-status`**. There is no
  session gate; `sessionStorage` appears nowhere in `src/`. The change is to
  make the sheet's presence itself the animation: mount it only when
  `sessionStorage.getItem("sbnb.booted") === null`, dismiss it the moment the
  first route's Suspense chunk resolves (cap 900ms, floor 400ms so it never
  strobes), then write the key. Fold the hand-off into the same commit: the
  sheet fades `opacity 1 → 0` while its logo group scales `1 → 1.06` (it
  recedes, like a lens pull) and the app root beneath animates `opacity 0 → 1`
  starting 80ms in — so the loader is replaced *by* content rather than deleted
  in front of it. What the user understands: *the app is starting* on their
  first visit of the session, and *this page is already here* on every
  navigation and every re-entry after a payment redirect.
- **Timing**: floor 400ms hold, cap 900ms; exit 260ms `cubic-bezier(0.16,1,0.3,1)`
  (`--ease-out-expo`); logo `scale` 320ms same curve; app root `opacity` 240ms
  linear at `delay: 80ms`. Down from 2300ms to a 660ms worst case.
- **Build**: plain state + `sessionStorage` in `App.tsx`, CSS transition for
  the fade — no library needed for a component that must run before any bundle
  work, and pulling framer-motion into the boot path would defeat the point.
  The app-root fade is one `animate-in fade-in-0 duration-200 delay-75
  fill-mode-backwards` on the wrapper.
- **Reduced motion**: under `reduce`, skip the fade entirely — unmount on the
  same timer with `transition: none`, and give the app root no entrance class at
  all so content is at `opacity: 1` from its first paint. The splash is a cover,
  not information; there is nothing to lose by cutting it.
- **Perf**: `opacity` only on a `position: fixed` layer — composited, no
  reflow. Do **not** animate the app root's `filter` or `backdrop-filter` here:
  `Header` is `glass sticky` (`src/components/layout/Header.tsx:51`) and a blur
  crossfade behind a `backdrop-filter: blur(16px)` bar re-rasterises the whole
  viewport every frame. The real perf win is negative work — the sheet stops
  occluding LCP content for 2.3s.
- **Why this one**: `scripts/prerender.mjs` writes real crawler-facing HTML
  into `dist/<route>/index.html`, and `scripts/lib/stub-page.mjs:517-536`
  documents the splash silently invalidating two audits —
  `focus-visible.mjs` reported the logo link "entirely covered" on 27 routes,
  and `glass-contrast.mjs` sampled backdrop luminance off a flat splash. A
  2.3s opaque sheet on every load is the single largest motion defect in the
  app, and it is also the cheapest to fix.

### 2. Splash logo: indefinite pulse → determinate settle

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

### 3. Route skeleton replaces the full-screen `PageLoader`

- **Where**: every lazy route — 60+ of them, everything except `/`
  (`HomePage` is the one eager import, `src/App.tsx:20`). The fallback is
  `src/App.tsx:112-116`:
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
  skeleton's own shimmer is handled in case 7.
- **Perf**: `opacity` only. The layout-thrash risk is on the other side —
  the skeleton's box sizes must match the real page's, or you have simply
  moved the CLS. `scripts/layout-shift.mjs` already measures this; see case 31
  for the precedent (a 5/4 vs 3/2 mismatch shifted every card 43px).

### 4. Delay-gated Suspense fallback

- **Where**: the single `<Suspense fallback={<PageLoader />}>` at
  `src/App.tsx:144` wrapping all of `<Routes>`.
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

### 5. Route enter transition (the dead `pageTransition` variant)

- **Where**: around `<Routes>` in `src/App.tsx:145-251`, keyed on
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
  the variants, matching the pattern `HomePage.tsx:132` already uses
  (`revealProps = prefersReduced ? {} : {...}`). Content renders at its final
  position with no interpolation.
- **Perf**: `opacity` + `transform: translateY` only, both composited. Two
  cautions: (a) the 8px `y` must not be applied on `POP` navigations or it
  fights scroll restoration — read `useNavigationType()` and use
  `initial={false}` for `POP`; (b) `RouteErrorBoundary` (`src/App.tsx:137`)
  sits *outside* the Suspense boundary and resets on pathname change, so the
  animated wrapper must go **inside** it — otherwise a caught render error
  animates the error panel as if it were a route.

### 6. One loader language across the three auth gates

- **Where**: `src/components/auth/ProtectedRoute.tsx:12-18` (31 route
  wrappings in `App.tsx`), `src/components/auth/RequireRole.tsx:31` (14 owner
  routes), `src/components/admin/AdminRoute.tsx:17` (3 operator/admin routes).
- **Motion**: there are currently three different spinners on the boot path.
  `PageLoader` uses `border-3 border-primary/30 border-t-primary`;
  `ProtectedRoute` uses `border-b-2 border-primary` — a different ring, a
  different weight, on a `min-h-screen` blank. Hitting `/my-bookings` cold can
  show all three in sequence: splash, chunk spinner, auth spinner. Collapse
  them to one shared component and one entrance, delay-gated exactly as in
  case 4, so a session that resolves from local storage in <100ms shows
  nothing at all. What the user understands: one wait, not three; and if it is
  quick, no wait happened.
- **Timing**: identical to case 4 — `opacity 0 → 1`, 150ms linear, 250ms delay,
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
  `--background`; scoping it to the content area (case 3's `Layout` fallback)
  removes that.

### 7. Skeleton: `animate-pulse` → composited shimmer sweep

- **Where**: `src/components/ui/skeleton.tsx` —
  `cn("animate-pulse rounded-md bg-muted", className)` — the base for every
  skeleton in the app, most visibly the 6-card grid on `/venues`.
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

---

## 2. Landing hero & above-the-fold

Scope: everything a visitor sees at `/` before the first scroll — the hero band,
the headline, the primary CTA, the proof card, and the search bar at the seam.
Route: `/` → `<Layout showMobileNav={false}><HomePage /></Layout>`
(`src/App.tsx:146`). Hero markup `src/pages/HomePage.tsx:196-346`; search bar
`src/components/home/HeroSearch.tsx`; CTA base styles
`src/components/ui/button.tsx:8`.

`HomePage.tsx:11` already imports `motion` and `useReducedMotion`, and the page
declares its own local `EASE = [0.16, 1, 0.3, 1]` (`HomePage.tsx:31`) plus a
`reveal` variant with a **capped** stagger (`HomePage.tsx:37-51`) and a
`revealProps = prefersReduced ? {} : {...}` guard (`:132`). Cases below extend
that vocabulary rather than inventing a second one.

### 8. Splash-to-hero handoff **[HIGH IMPACT]**

- **Where**: `/` — `src/components/SplashScreen.tsx` and the hero block at
  `src/pages/HomePage.tsx:196-201`.
- **Motion**: Today the hero entrance **plays where nobody can see it**.
  `HomePage` is eagerly imported (`App.tsx:20`), so it mounts immediately;
  framer-motion fires `initial="hidden" → animate="visible"` at mount, and the
  whole stagger finishes long before `SplashScreen` starts its fade at `1800ms`
  and unmounts at `2300ms` (`SplashScreen.tsx:7-11`). The visitor's first frame
  of the hero is the *finished* state — a static page. Fix: hold the hero at
  `hidden` until the splash begins lifting, then run the existing stagger
  through the last `380ms` of the splash fade. What the user understands: the
  page is assembling itself *for them*, headline first, then the promise, then
  the button, then the proof — reading order made temporal. Right now they
  understand nothing, because they see no motion at all.
- **Timing**: Splash fade-out is `500ms` (`transition-opacity duration-500`,
  starting at `1800ms`). Start the hero stagger at **`1920ms`** — `120ms` into
  the fade, so the two overlap and the handoff has no dead frame. Children keep
  their existing duration and capped stagger; the image column keeps its
  `900ms` / `150ms` delay and is re-anchored to the same `1920ms` origin. Once
  case 1 lands, "1920ms" becomes "120ms after the sheet starts lifting" — the
  two cases must ship in that order or the number is wrong.
- **Build**: framer-motion. `SplashScreen` already owns the `fadeOut` boolean;
  lift it into a tiny context (`SplashProvider` around the tree in `App.tsx`)
  exposing `splashLifting: boolean`, then in `HomePage`:
  `animate={prefersReduced ? undefined : (splashLifting ? "visible" : "hidden")}`.
  Do **not** solve this with `delayChildren: 2.4` — it hardcodes one component's
  timer into another file, and it keeps firing after the splash logic changes.
- **Reduced motion**: unchanged from today's correct behaviour — `useReducedMotion()`
  returns true, `revealProps` is `{}`, the hero renders in its final state with
  no gating at all. Additionally gate the splash itself: under reduced motion
  drop the `1800ms` hold to `0ms` and unmount immediately, so a reduced-motion
  visitor is not made to wait through an animation they opted out of.
  `SplashScreen.tsx` also uses `animate-pulse` and `animate-spin`, neither of
  which is covered by the `prefers-reduced-motion: reduce` block at
  `index.css:619-630` — add `motion-reduce:animate-none` to both.
- **Perf**: transform + opacity only; no layout involvement. One caveat worth
  knowing: `initial="hidden"` writes inline `opacity: 0` on the h1, and
  `npm run postbuild` runs `scripts/prerender.mjs` — verify the prerendered `/`
  snapshot does not ship the headline at `opacity: 0`. That risk exists today
  and this change does not add to it, but gating makes it worth re-checking.
- **Why this one is strongest**: the entire hero choreography is already built,
  already tuned, already reduced-motion-correct — and currently 100% of it is
  played behind an opaque `z-[9999]` overlay. This is the only case in the
  section where the fix is pure recovered value: no new motion vocabulary, no
  new frames, no new perf cost.

### 9. Headline lands in two beats

- **Where**: `/` — the `motion.h1` at `src/pages/HomePage.tsx:216-224`.
- **Motion**: The headline is already two deliberate lines split by an explicit
  `<br />` — "Book the court." in `--foreground`, "Skip the call." in
  `text-primary`. Currently both rise together as one `reveal` block. Split them
  into two `motion.span` children so line 1 (the instruction) settles before
  line 2 (the payoff) arrives. Each line rises `20px` and fades in. What the
  user understands: these are two claims, not one long sentence — and the green
  one is the differentiator. The colour already says that; the `90ms` gap makes
  you *read* it that way instead of scanning both at once.
- **Timing**: line 1 at `t+0`, line 2 at `t+90ms`; each `620ms` with
  `var(--ease-out-expo)` = `cubic-bezier(.16,1,.3,1)`. Slightly faster and
  flatter than the page's shared reveal because the h1 is the largest object on
  the page — at `clamp(2.5rem, 5.2vw, 4.25rem)` the same duration reads sluggish
  on a 68px glyph.
- **Build**: framer-motion. Change the h1 from `variants={reveal}` to a local
  `headline` variant carrying `{ visible: { transition: { staggerChildren: 0.09 } } }`,
  with two `motion.span` children on `reveal`, `className="block"`, replacing the
  `<br />`. CSS can't do this cleanly — the lines need to inherit the parent's
  stagger position in the existing hero sequence, not run on their own clock.
- **Reduced motion**: `prefersReduced` already nulls the hero container's props
  (`HomePage.tsx:132`), so both spans render at final position with zero code.
  Keep `className="block"` on the spans unconditionally so the two-line layout is
  identical whether or not motion runs.
- **Perf**: `transform: translateY` + `opacity` only. Do **not** wrap each line
  in `overflow-hidden` for a mask-style reveal: `leading-[0.98]` on a
  `4.25rem` display face gives the box no descender room, and "Skip the call."
  has a `p` — the mask clips it for the length of the animation. If a mask
  reveal is wanted later, the clipping span needs `pb-[0.14em] -mb-[0.14em]`.

### 10. Primary CTA — arrow commits, button acknowledges

- **Where**: `/` — the "Browse venues" `Button asChild` at
  `src/pages/HomePage.tsx:236-263`, whose base classes come from
  `buttonVariants` in `src/components/ui/button.tsx:8`.
- **Motion**: Two separate signals on one control. (a) **Hover/focus**: the
  `lucide-react` `ArrowRight` slides `3px` right. The repo already does exactly
  this on the "See all venues" link — `group-hover:translate-x-0.5` — so the
  hero CTA is the *inconsistent* one, not the candidate for a new idea. The
  arrow moving toward the edge says "this leaves this page and goes to
  `/venues`", which distinguishes it from the ghost "List your venue" button
  sitting next to it. (b) **Press**: `active:scale-[0.98]` is already in
  `buttonVariants`, but it inherits `transition-all duration-200` — `200ms` for
  a press acknowledgement lands *after* the finger is gone and reads as lag.
  Tighten the press to `120ms` while leaving hover colour/shadow at `200ms`.
- **Timing**: arrow `translateX(0 → 3px)` over `180ms cubic-bezier(.2,.8,.2,1)`,
  reversing over `140ms` on exit (leaving is faster than arriving). Press
  `scale(1 → .98)` over `120ms cubic-bezier(.2,.8,.2,1)`; release `160ms`.
  Background `hover:bg-primary/92` and `shadow-sm → shadow` stay at the existing
  `200ms`.
- **Build**: Tailwind/CSS, not framer-motion. It is a pointer-state transition on
  a `<Link>` inside `Slot` — framer-motion here would mean wrapping in
  `motion.a`, losing the `asChild` composition, for zero gain. Add `group` to the
  Button and `transition-transform duration-[180ms] group-hover:translate-x-[3px]
  group-focus-visible:translate-x-[3px]` to the `ArrowRight`. Split the base
  `transition-all duration-200` in `button.tsx:8` into
  `transition-colors transition-shadow duration-200` plus
  `transition-transform duration-[120ms]`.
- **Reduced motion**: `motion-reduce:transform-none` on the arrow and
  `motion-reduce:active:scale-100` on the button — the colour and shadow changes
  survive, so hover, focus and press all remain visibly distinguishable without
  any movement. Note that `active:scale-[0.98]` is currently unguarded: the
  reduced-motion block at `index.css:619-630` covers only `.live-dot::after` and
  `.card-lift`, and its comment claims "nothing else in the app declares a hover
  transform" — that is true of *hover*, but `button.tsx` declares an `active`
  transform and the `hero` variant declares `hover:-translate-y-0.5`
  (`button.tsx:25`). Both need guarding.
- **Perf**: `transform` + `opacity` + `box-shadow`. `box-shadow` is a paint, not
  a layout — acceptable on a single 48px-tall element, but do not extend it to
  the shadow animating on hover for anything repeated in a grid.

### 11. "Live availability" pill — one pulse rate for the whole app

- **Where**: `/` — the eyebrow pill at `src/pages/HomePage.tsx:201-214`.
- **Motion**: A `1.5px` dot with a ring expanding out of it and fading, on loop.
  This is the only element above the fold making a real-time claim, and the
  pulse is what separates "we have availability data" from "we have a marketing
  badge". Two problems with the current implementation: it uses Tailwind's
  `animate-ping` (`scale(1) → scale(2)`, `1s cubic-bezier(0,0,.2,1)`), while the
  rest of the app uses `.live-dot` from `index.css:568-581` — `scale(1) →
  scale(2.6)`, `1.8s var(--ease-out-expo)`, opacity `0.6 → 0`. Two different
  pulses for one meaning. And `animate-ping` is **not** covered by the
  reduced-motion block, whereas `.live-dot::after` is. Switch the pill to
  `.live-dot` and both problems close at once.
- **Timing**: `1.8s` per cycle, `var(--ease-out-expo)` = `cubic-bezier(.16,1,.3,1)`,
  infinite; ring reaches full `2.6×` scale and zero opacity by `80%` of the
  cycle, leaving a `360ms` rest beat before it restarts. The rest beat is what
  makes it read as a heartbeat rather than a spinner.
- **Build**: CSS — the `@keyframes live-ping` and `.live-dot` class already
  exist in `index.css`. Replace the nested `<span className="relative flex h-1.5
  w-1.5">` + `absolute animate-ping` construction with a single
  `<span className="live-dot" aria-hidden="true" />`. No JS, no framer-motion:
  an infinite ambient loop should never own a React render.
- **Reduced motion**: already written and already correct —
  `index.css:620` sets `.live-dot::after { animation: none; }`. The static green
  dot remains, so the "live" signal survives as colour rather than movement.
  This is the entire reason to switch off `animate-ping`.
- **Perf**: `transform: scale` + `opacity` on a `::after` pseudo-element, GPU
  composited, 6px box. Safe. It is an infinite animation, so it will keep a
  compositor layer alive for the life of the page — acceptable for exactly one
  element; do not repeat the pattern per venue card.

### 12. Confirmation card lands after the photo settles

- **Where**: `/` — the `.glass` card at `src/pages/HomePage.tsx:306-325`
  ("Confirmed — Thursday, 19:00 / Ararat Arena · 90 min · ֏12,000").
- **Motion**: Currently this card is a child of the image column, so it arrives
  fused to the photo inside the same `scale(.97 → 1)`. Give it its own beat: the
  photo settles first, *then* the card rises `12px` into place with the green
  check mark scaling up inside it. The comment in the source says the intent is
  "the product is shown, not described" — the card is a booking *result*.
  Separating it in time is what makes it read as an outcome of the photo rather
  than a label stuck on it: pitch → confirmed booking, in that order, which is
  the product's whole proposition in two frames.
- **Timing**: image column finishes at its existing `150ms + 900ms = 1050ms`
  (relative to hero start). Card: `opacity 0 → 1`, `translateY(12px → 0)`,
  **`460ms var(--ease-out-expo)`, delay `760ms`** — it begins while the photo is
  still settling and lands at `1220ms`, just after. Check icon:
  `scale(.7 → 1)` over `380ms var(--ease-spring)` = `cubic-bezier(.34,1.56,.64,1)`,
  delay `900ms`. The spring overshoot is used once, here, on the single glyph
  that means "confirmed".
- **Build**: framer-motion — the delays have to be expressed relative to the
  hero's entrance origin (see case 8), which is React state, not a CSS class.
  Wrap the existing `div.glass` as `motion.div` with an explicit
  `transition={{ duration: 0.46, ease: [0.16,1,0.3,1], delay: 0.76 }}`; the
  `Check` icon's wrapper becomes its own `motion.div`.
- **Reduced motion**: pass `initial`/`animate` as `undefined` under
  `prefersReduced` exactly as the sibling column already does — card and check
  render in final position, full opacity, no delay. Every word stays readable;
  nothing is gated on an animation that never runs.
- **Perf**: **Flag.** `.glass` (`index.css:430-439`) sets
  `backdrop-filter: blur(18px) saturate(1.4)`. Animating `transform` on a
  backdrop-filtered element forces the browser to re-sample and re-blur the
  backdrop every frame — measurably worse than a plain transform, and worst on
  Safari. Mitigations, in order of preference: (a) animate `opacity` only and
  drop the `12px` rise; (b) keep the rise but add `will-change: transform` for
  the duration and remove it on animation complete; (c) if a frame drop is
  visible on a mid-range Android, animate a non-glass inner wrapper and leave the
  `.glass` box itself stationary. Do not ship (b) as a permanent
  `will-change` — a persistent hint on a backdrop-filter layer costs memory for
  the life of the page.

### 13. "N venues live" — the number counts up when it arrives

- **Where**: `/` — the conditional glass pill at `src/pages/HomePage.tsx:326-346`,
  fed by the Supabase count query in the `useEffect` at `HomePage.tsx:118-126`.
- **Already built, partially**: the pill's *landing* now exists — a `motion.div`
  with `transition={{ duration: FEEDBACK, ease: EASE }}`
  (`src/pages/HomePage.tsx:334-344`), with the source comment at `:328`
  explaining that the count arrives from the network long after the hero. What
  remains unbuilt is the numeral.
- **Motion**: This is the only genuinely live number above the fold — a
  `count: "exact", head: true` query against `venues` where `is_active`. Run the
  numeral from `0` to its real value as the pill lands. What the user
  understands: this figure was *fetched*, not printed into the page — it is the
  difference between a marketing number and a live one.
- **Timing**: pill `opacity 0 → 1` + `translateY(-6px → 0)` over
  **`320ms var(--ease-out-expo)`**. Numeral count-up starts at `+120ms`, runs
  `900ms`, eased `cubic-bezier(.16,1,.3,1)` so it decelerates into the final
  value instead of stopping dead. Cap the tick rate at ~30 updates regardless of
  the target so the count reads rather than blurs.
- **Build**: reuse the `useCountUp` helper already written for the owner
  dashboard (`src/pages/owner/OwnerOverviewPage.tsx:93-130`) rather than adding a
  second counting mechanism — it already assigns `target` itself on the last
  frame rather than a rounded interpolation, tweens from whatever is currently
  displayed, and gates on the data having arrived. framer-motion's `animate()`
  on a `MotionValue` is the alternative and is fewer lines, but adds a second
  animation-runtime concept for one number.
- **Reduced motion**: under `prefersReduced`, render the pill at final opacity
  and position and print `venueCount` directly — no count-up, no fade.
  `useCountUp` already does exactly this. The number is information; it must
  never be mid-animation when someone reads it.
- **Perf**: `transform` + `opacity` for the pill. The numeral is a text-content
  mutation ~30 times over `900ms` — that *is* a layout+paint per tick, but the
  span already carries `font-mono … tabular-nums`, so every digit is the same
  advance width and the box never reflows its neighbours. Note the pill is
  `hidden … sm:flex`, so none of this runs below `640px`.

### 14. The search bar arrives last, and arrives as an invitation

- **Where**: `/` — `<HeroSearch />` mounted at the hero seam,
  `src/pages/HomePage.tsx:343-346`; component at
  `src/components/home/HeroSearch.tsx:183-219`.
- **Motion**: `HeroSearch` currently sits **outside** the hero's motion tree
  entirely — it is a plain `div` in a sibling container and has no entrance at
  all. The source comment above it says it is "the first thing you can actually
  do", which is precisely the thing not being communicated: it appears fully
  formed while everything above it animates, so it reads as page furniture. Give
  it the last beat of the hero sequence: rise `16px` and fade in *after* the
  copy column has finished, so the eye's final resting place is the control it
  is meant to use. On desktop the whole `rounded-2xl` bar moves as one object; on
  mobile it is the single sheet-trigger button (`HeroSearch.tsx:189-204`).
- **Timing**: `opacity 0 → 1`, `translateY(16px → 0)`, **`560ms`** on the page's
  shared `EASE`, because this is the last member of the hero sequence and should
  not sound like a different instrument. Start it as the copy column's capped
  stagger ends — read the last `step(i)` value rather than hardcoding a number,
  so retuning `reveal` cannot desynchronise the two.
- **Build**: framer-motion, driven from `HomePage` so the delay stays expressed
  in one place. Wrap the existing container at `HomePage.tsx:343` as `motion.div`
  with `initial={prefersReduced ? undefined : { opacity: 0, y: 16 }}`. Do **not**
  put the animation inside `HeroSearch.tsx` — that component is also rendered
  elsewhere in the app's surface area, and an entrance baked into it would fire
  in contexts that have no hero sequence.
- **Reduced motion**: `prefersReduced` → pass `initial`/`animate` as `undefined`;
  the bar renders in place immediately, which is also the fastest path to an
  interactive control. Critically: the bar must be **focusable and clickable from
  first paint regardless**, so never gate `pointer-events` or `visibility` on the
  animation — only `opacity` and `transform`.
- **Perf**: `transform` + `opacity` only. The desktop bar carries `shadow-2xl`
  and `ring-1` (`HeroSearch.tsx:216`) — both are paint-time, both are static, and
  neither is animated, so translating the box is a straight composite. No layout
  thrash.

### 15. "Near me" — the locating state stops jumping

- **Where**: `/` — the geolocation button in
  `src/components/home/HeroSearch.tsx:163-171`, state from
  `isLocating` (`HeroSearch.tsx:27`, `44-67`).
- **Motion**: Two defects, one fix each. (a) The label swaps `"Near me"` →
  `"Locating…"` while the button is `h-12 px-4` with auto width, so the button
  **grows about 18px mid-interaction** and shoves the adjacent Search button
  right — a layout shift caused by a loading state, on the primary above-the-fold
  control. Lock the width. (b) The spinner signal is `animate-pulse` on the
  `Navigation` icon — a whole-element opacity throb that reads as "disabled", the
  opposite of "working". Replace with a shimmer sweep across the button surface,
  which reads as progress. What the user understands: the browser's permission
  prompt is coming and the app is waiting on *them*, not stalled.
- **Timing**: shimmer `2s linear infinite` — the `shimmer` keyframe already
  exists in `tailwind.config.ts:114-117` and `:123`
  (`backgroundPosition: -200% 0 → 200% 0`). Label cross-fade on state change:
  `opacity 1 → 0 → 1` over `2 × 110ms cubic-bezier(.2,.8,.2,1)` so the text
  swaps rather than snaps.
- **Build**: Tailwind/CSS. Width lock is `min-w-[9.5rem] sm:min-w-[10.5rem]`
  measured against the longer of the two labels — no JS. Shimmer is the existing
  `animate-shimmer` utility over a
  `bg-gradient-to-r from-transparent via-foreground/8 to-transparent
  bg-[length:200%_100%]` overlay, applied only when `isLocating`. framer-motion
  is unnecessary: the trigger is one boolean already in component state.
- **Reduced motion**: `motion-reduce:animate-none` on the shimmer overlay, and
  when it is off the `"Locating…"` text carries the whole signal — which is why
  the label change must stay, not be replaced by the animation. Same guard on the
  `animate-pulse` currently at `HeroSearch.tsx:169` if it is kept during
  migration; it is unguarded today.
- **Perf**: **Flag — this is the layout-thrash case in this section.** The
  current behaviour animates *nothing* but does mutate intrinsic width, which is
  the expensive kind of change (reflow of the flex row, potentially of the whole
  `FormBody`). After the `min-w` lock it becomes zero-layout. The shimmer itself
  animates `background-position`, which is a paint on a ~150×48px box — cheap,
  but strictly worse than `transform`; if it shows up in a profile, swap to a
  `translateX` on an absolutely-positioned gradient child inside
  `overflow-hidden`.

**Cross-cutting notes for this section.** One easing family: the page's `EASE`
for entrance sequencing, `var(--ease-out-expo)` for single-element arrivals,
`cubic-bezier(.2,.8,.2,1)` for pointer feedback under `200ms`, and
`var(--ease-spring)` exactly once, on the confirmation check in case 12. Three
unguarded animations exist above the fold today and are named above:
`animate-ping` on the live pill, `animate-pulse` on the locating icon, and
`animate-pulse` + `animate-spin` in `SplashScreen.tsx` — plus
`active:scale-[0.98]` and the `hero` variant's `hover:-translate-y-0.5` in
`button.tsx:8,25`. And never gate content on an animation: every case above uses
`opacity` and `transform` exclusively; none touches `visibility`, `display` or
`pointer-events`.

---

## 3. Landing scroll storytelling

Scope: everything on `/` **below** the search bar at the hero seam — the four
content bands and the closing CTA, plus the one piece of global chrome whose
state is written by scrolling this page. Section shell (`base` / `raised` /
`invert`) at `src/pages/HomePage.tsx:82-93`; "How it works" `<ol>` at `:363-399`;
sports grid at `:401-462`; "Why it's different" + slot-grid demo at `:468-586`;
owner stat tiles (the single `invert` band) at `:592-644`; closing CTA + ambient
glow at `:646-695`; sticky header `src/components/layout/Header.tsx:51`.

**The structural bug every case below has to work around.** `revealProps`
puts `whileInView` on the *band wrapper*, not on the items. Each wrapper
contains its heading **and** its whole grid, so the trigger fires the moment the
band's top edge crosses `viewportBottom - 80px` and the stagger empties in a few
hundred milliseconds. On desktop that is mostly fine — the grids are single
rows. On mobile every grid stacks, so cards 2–4 finish animating while they are
still one to three screens below the fold. The visitor scrolls down to a page
that has already stopped moving. Cases 16, 17 and 20 all depend on moving the
trigger down to the item.

### 16. The three steps arrive as a sequence, not as a row

- **Where**: `/` — `src/pages/HomePage.tsx:372-399`, the `<ol>` of `steps`
  (`:158-176`). Each `<li>` opens with a mono ordinal (`01`/`02`/`03`) followed
  by a `<span className="h-px flex-1 bg-border" />` divider.
- **Motion**: the hairline rule after each ordinal draws left→right —
  `scaleX(0) → scaleX(1)`, `transform-origin: left` — and only when a step's
  rule has finished does the next step's ordinal fade in. What the user
  understands: these are three *stages of one booking*, in order, not three
  parallel features laid out in a row. Right now the numbers say "01 02 03" and
  the motion says "all at once", which cancels the numbering. The rule already
  exists in the markup as a divider; animating it costs no new DOM.
- **Timing**: per step — ordinal + icon + text `520ms cubic-bezier(.16,1,.3,1)`
  with `y: 16 → 0`; the rule `scaleX` `340ms` on the page's `EASE` starting
  `120ms` into the step. Step-to-step stagger `180ms` (not the page's default —
  a ~70ms stagger reads as simultaneous). Whole band: `~1.06s`, and it is the
  only band on the page allowed to run that long.
- **Build**: framer-motion. The `<motion.li variants={reveal}>` nodes are
  already there; this is a second variant (`revealStep`) plus a `motion.span`
  for the rule, and a `staggerChildren: 0.18` override on that band's wrapper.
  CSS `@keyframes` cannot do "start when the list scrolls into view" without a
  JS observer anyway, and framer-motion's `whileInView` already is that observer.
- **Reduced motion**: rules render at `scaleX(1)`, ordinals and text at final
  opacity, no stagger — i.e. exactly the static markup that ships today.
- **Perf**: `transform` + `opacity` only. `scaleX` on a 1px `flex-1` divider
  composites; it does **not** relayout the flex row, because scale is applied
  after layout. Do not animate `width` here — that would relayout the `<li>`
  three times per step.

### 17. Sports cards reveal when *they* cross, not when the band does

- **Where**: `/` — `src/pages/HomePage.tsx:433-460`, the four
  `<motion.div variants={reveal}>` wrappers around the sport `<Link>`s.
- **Motion**: move `whileInView` off the band wrapper and onto each card, with
  `viewport={{ once: true, amount: 0.35 }}`. A card lifts and fades in when 35%
  of it is on screen. What the user understands: the page is still going. On
  mobile today, Football animates and the other three are already finished by
  the time you reach them, so the scroll feels like it hit the end of the
  content. With per-card triggers, four separate arrivals tell you the catalogue
  continues past the fold — which is the exact message the "See all venues" link
  in the same band is making in words.
- **Timing**: `460ms cubic-bezier(.16,1,.3,1)`, `opacity 0 → 1`, `y 20 → 0`.
  Cards that enter within the same frame batch (the desktop 4-up row) keep a
  `60ms` stagger via `delay: index * 0.06`; stacked mobile cards each fire on
  their own crossing with no delay, because a delay on a card you are already
  looking at reads as lag.
- **Build**: framer-motion — `whileInView` + `viewport.amount` is per-element
  IntersectionObserver with thresholds, which is precisely the primitive needed.
  A CSS-only version would need `animation-timeline: view()`, unsupported in
  Safari as of this repo's browser targets.
- **Reduced motion**: `useReducedMotion()` → drop `initial`/`whileInView`
  entirely (the existing `revealProps = {}` pattern); all four cards render
  final. The card's own hover zoom is a separate concern — see case 18.
- **Perf**: `transform` + `opacity` only. Four observers instead of one; each
  disconnects on first fire because `once: true`. The `<img>`s are already
  `loading="lazy"`, so a card that reveals may decode in the same frame — set
  `amount: 0.35` rather than `0` so the decode has ~200ms of scroll distance to
  land before the reveal starts.

### 18. Parallax inside the sport card crop

- **Where**: `/` — `src/pages/HomePage.tsx:437-448`, the `aspect-[4/5]` image
  inside the `overflow-hidden rounded-2xl` link.
- **Motion**: as a card travels through the viewport, its photo translates
  `translateY: -5% → 5%` against the card frame while the frame itself holds
  still. What the user understands: the tile is a *window onto a real place*,
  not a flat thumbnail — the same reason the caption sits on a scrim over the
  photo rather than beside it. It also separates the four tiles from the flat
  card grid used everywhere else in the app, so "pick your sport" reads as
  browsing rather than as a form control.
- **Timing**: not a duration — a scroll mapping. `useScroll({ target: cardRef,
  offset: ["start end", "end start"] })` → `useTransform(scrollYProgress, [0, 1],
  ["-5%", "5%"])`, with `useSpring(…, { stiffness: 120, damping: 30, mass: 0.4 })`
  so the photo lags the scroll by ~90ms instead of tracking it rigidly. Total
  travel is 10% of a `4/5` box ≈ 34px at a 340px card — visible, not seasick.
- **Build**: framer-motion (`useScroll` + `useTransform` + `useSpring`). CSS
  `background-attachment: fixed` is the classic alternative and is broken on
  iOS Safari; scroll-linked CSS animations are not available here.
- **Reduced motion**: `useReducedMotion()` → skip the hook wiring and render a
  plain `<img>` with no `style.y`. Vestibular-triggering motion is exactly what
  this preference is for, so this is a full opt-out, not a shortened version.
- **Perf**: `transform` only, and the image must be pre-scaled `scale(1.12)` so
  the ±5% travel never exposes the card's background — that scale is static, set
  once in a class, not animated. Flag: this runs a scroll handler per card, so
  cap it at these four cards on `/` and do not generalise it to `/venues`
  listings, where 20+ observers on a virtualised grid would cost real frames.
  The existing hover `scale` on the image must move to a wrapper element —
  framer-motion owns `transform` on the animated node, and a Tailwind
  `group-hover:scale` on the same element is silently overwritten.

### 19. The closing glow drifts as the page ends

- **Where**: `/` — `src/pages/HomePage.tsx:646-650`, the `aria-hidden` blob:
  `bottom-[-30%] h-[500px] w-[800px] rounded-full bg-primary/12 blur-[130px]`.
- **Motion**: as the closing band enters, the blob rises `y: 60px → 0` and its
  opacity goes `0 → 1` over the scroll range; it is otherwise static. What the
  user understands: the page has a floor. This is the second and last blob on
  the page (the first is the hero's, `:191`), and making the closing one
  *arrive* rather than simply be there marks the end of the scroll — the visual
  bookend to the CTA that says "one tap away". **The hero blob stays static.**
  Two oversized filtered layers animating across one scroll is how a decorative
  gradient becomes the page's frame budget, and the hero already works as a
  static gradient, which is what it is today.
- **Timing**: scroll-mapped over the band's first 40% of travel —
  `useTransform(scrollYProgress, [0, 0.4], [60, 0])` and `[0, 0.35] → [0, 1]` for
  opacity. If built as a one-shot instead: `900ms cubic-bezier(.16,1,.3,1)` on
  `whileInView`, which is the cheaper and perfectly acceptable version.
- **Build**: framer-motion for the scroll-mapped variant, or plain Tailwind +
  the existing `fade-in` keyframe (`tailwind.config.ts:110-113`) for the
  one-shot. Prefer the one-shot unless the scroll-linked version is measured to
  hold 60fps on a mid-range Android — see Perf.
- **Reduced motion**: blob renders at final position and full opacity. It is
  decorative and `aria-hidden`, so nothing is lost.
- **Perf**: **flag.** `blur(130px)` over an `800×500` layer is the single most
  expensive paint on the page. Animating `transform`/`opacity` on it is safe —
  the blur is rasterised once and the composited layer is moved. Animating the
  blur *radius*, the blob's `width`/`height`, or its `bottom` offset is not:
  each frame re-runs a 130px gaussian. So: `translate` + `opacity` only, add
  `will-change: transform, opacity` for the duration and remove it after, and
  never touch `filter`.

### 20. Owner stats count up — the two numbers, never the two words

- **Where**: `/` — `src/pages/HomePage.tsx:620-640`, the `<motion.dl>` of four
  tiles inside the single `invert` band: `Commission 5%`, `Payouts Weekly`,
  `Setup 10 min`, `Support Direct`.
- **Motion**: when the `dl` is 50% on screen, `5%` counts `0 → 5` and `10 min`
  counts `0 → 10`. `Weekly` and `Direct` do not animate at all — they are words,
  and a word that shuffles into place is a slot machine, not a fact. What the
  user understands: these are *measured quantities*, and the small ones are the
  point (5%, ten minutes). A counter draws the eye to the digit, which is the
  whole argument of this band to a venue owner.
- **Timing**: `800ms cubic-bezier(.16,1,.3,1)`, both counters starting together
  (they are diagonal neighbours in a 2×2 grid; staggering them makes the grid
  feel like it is loading). Values are integers, so `5%` steps through 6 states
  and `10 min` through 11 — no fractional flicker to suppress.
- **Build**: reuse `useCountUp` from `src/pages/owner/OwnerOverviewPage.tsx:93-130`
  — it already writes through a `useState` gated on the data being real and
  lands on the exact target rather than a rounded interpolation. If a per-frame
  `textContent` write is preferred instead, use framer-motion's `useInView` +
  `animate(motionValue, …)` with `motionValue.on("change")`; do **not** use React
  state per frame, which re-renders the whole band ~48 times. The suffix (`%`,
  ` min`) stays as static text outside the animated node.
- **Reduced motion**: `useReducedMotion()` → render the final number as plain
  text on first paint. Never render `0`.
- **Perf**: `opacity`/`transform` are not involved — this is a text mutation, so
  **flag it honestly**: each write invalidates layout for that node.
  Mitigations, both cheap: the `dd` already carries `tabular-nums`, so digit
  width never changes, and adding `min-w-[3ch]` to the animated span means
  `5 → 10` gaining a digit cannot reflow the tile. Two nodes × ~48 frames is
  well inside budget; twenty would not be.

### 21. Each claim gets stamped, and the text does not move

- **Where**: `/` — `src/pages/HomePage.tsx:489-515`, the three-item `<ul>` under
  "The slot is yours the moment you pay", each row a `<Check>` icon plus a line
  of copy.
- **Motion**: the check icons scale `0.6 → 1` with `opacity 0 → 1`; the copy
  beside them fades `opacity 0 → 1` with **no** `y` offset. What the user
  understands: three separate guarantees being ticked off, one at a time —
  matching the semantics of a check mark. The copy stays put because these
  lines are 60–70 characters and a `y: 24` slide on a long line makes the reader
  re-find the baseline three times.
- **Timing**: icon `260ms cubic-bezier(.34,1.56,.64,1)` (`--ease-spring`,
  `index.css:137` — the slight overshoot is what makes it read as a stamp rather
  than a fade); copy `300ms` on the page's `EASE` starting `80ms` after its
  icon; row-to-row stagger `90ms`. Whole list: `~640ms`.
- **Build**: framer-motion. The `<motion.li variants={reveal} custom={i + 1}>`
  nodes already exist inside a wrapper carrying `revealProps`, so this is one
  nested variant node per `<li>` with its own `staggerChildren`. This is the one
  place `--ease-spring` should appear on this page — it is defined in
  `index.css:137` and currently used nowhere.
- **Reduced motion**: icons at `scale(1)`, all three rows at full opacity, no
  stagger. The overshoot is the first thing to cut and nothing depends on it.
- **Perf**: `transform` + `opacity` only. `scale` on a 20px SVG icon resamples
  a trivial area; the concern that makes `.card-lift` prefer translate over
  scale (`index.css:588-616`) is about scaling *text*, which this deliberately
  avoids.

### 22. The slot grid demonstrates the promise **[HIGH IMPACT]**

- **Where**: `/` — `src/pages/HomePage.tsx:518-584`, the mock booking panel: six
  time chips (`:526-556`), the price `<dl>` (`:558-575`), and the "Slot held
  until 20:00" status bar (`:580-583`).
- **Motion**: on reveal, the six chips fade in as a grid; then `19:00` — which
  ships already styled as `picked` — transitions *into* that state, cross-fading
  `bg-surface-2 → bg-primary` and `text-foreground → text-primary-foreground`
  with the border following; then the held-until bar fades and expands from
  `opacity 0, scaleY .96` to rest. `17:00` and `21:00` keep their static
  `line-through` taken state throughout. What the user understands: the sentence
  three inches to the left — "The slot is yours the moment you pay" — is not a
  claim, it is a mechanism, and they have now watched it happen. Every other
  band on this page *tells*; this one is the only chance to *show*, and today it
  shows a still frame.
- **Why high impact**: it converts the page's single differentiating claim from
  copy into evidence, using markup that already exists — no new component, no
  new asset, no data. It is also the moment most likely to be remembered when
  the visitor hits a real slot grid on `/venue/:id`, because the interaction
  language will already be familiar.
- **Timing**: chips `220ms cubic-bezier(.2,.8,.2,1)` each, `45ms` stagger
  (6 × 45 = `270ms`); hold `400ms`; picked-state cross-fade `240ms
  cubic-bezier(.2,.8,.2,1)`; held bar `320ms cubic-bezier(.16,1,.3,1)` starting
  `120ms` after the chip commits. Total `~1.35s`, fires **once**
  (`viewport={{ once: true, amount: 0.4 }}`). It must never loop — a looping
  demo turns a product proof into an advertisement.
- **Build**: framer-motion, driven by one variant sequence on the panel. The
  chip's picked/taken/open classes are computed inline from a literal array
  (`:527-544`); the animated version needs those three states expressed as
  variants rather than a ternary over class strings, since Tailwind class swaps
  cannot be cross-faded. Keep the `<span className="sr-only">` state suffixes
  (`:549-555`) exactly as they are — they are what makes the demo legible with
  no motion at all.
- **Reduced motion**: render the panel exactly as it ships today — `19:00`
  already picked, held bar already present, no sequence. The fallback is
  literally the current component, which is the strongest possible guarantee
  that no information lives only in the animation.
- **Perf**: chips animate `opacity` + `transform` on entry (composited). The
  picked-state change is `background-color` + `border-color` + `color` — paint,
  not layout, on one 60×36px element for 240ms. Acceptable at this size. Do
  **not** animate the chip's `padding` or the grid's `gap` to make it "pop":
  either would relayout the whole `grid-cols-3` list every frame.

### 23. The header admits you have left the top

- **Where**: `/` — `src/components/layout/Header.tsx:51`:
  `className="glass sticky top-0 z-50 w-full rounded-none border-x-0 border-t-0"`.
  `.glass` is defined at `src/index.css:430-448` and carries a backdrop blur, a
  1px inner highlight and `--shadow-md` **unconditionally**.
- **Motion**: at `scrollY > 72` (past the hero eyebrow row), raise the header's
  own opacity/elevation — cross-fade a pseudo-layer from `opacity 0 → 1` carrying
  `--shadow-lg` and a stronger `hsl(var(--border-strong))` bottom rule; reverse
  below `56px` (hysteresis, so a header does not flicker at the threshold).
  What the user understands: the bar has detached from the page and is now
  floating over content. Today it looks identical at `scrollY 0` and at
  `scrollY 3000`, so at the top of the page it reads as a heavy chrome band
  sitting on the hero for no reason, and mid-page it gives no depth cue at all.
- **Timing**: `180ms cubic-bezier(.2,.8,.2,1)` — fast enough that it is over
  before the scroll gesture ends, slow enough not to strobe on a trackpad
  flick. Threshold `72px` down, `56px` up.
- **Build**: framer-motion `useScroll` + `useMotionValueEvent` with a boolean
  `useState` flipped only on threshold crossings (two renders per page visit,
  not per frame). A raw `scroll` listener would work but would need manual
  `{ passive: true }` + rAF throttling that `useScroll` already does.
- **Reduced motion**: the state change **still happens**, at `0ms`. This is
  information (you are scrolled), not decoration; removing it removes a depth
  cue rather than removing motion. Only the transition duration is dropped.
- **Perf**: `opacity` on an absolutely-positioned overlay + `box-shadow` on the
  header. **Flag**: never animate `backdrop-filter: blur()` — `.glass` blurs a
  full-width strip, and interpolating its radius re-runs the blur over the whole
  viewport width each frame. Cross-fade a second layer instead, or step the
  blur instantly and animate only opacity.

### 24. One glow at the end, once

- **Where**: `/` — `src/pages/HomePage.tsx:665-690`, the closing primary CTA
  (`Get started` / `Find a court`, `:672`), with the secondary `Browse first`
  beside it.
- **Motion**: after the closing band's reveal settles, the primary CTA takes on
  `.glow-primary` — `box-shadow: 0 0 32px -8px hsl(var(--primary)/.45)`,
  defined at `src/index.css:583-586` and currently unused — ramping from `0` to
  full once, then holding. The outline button gets nothing. What the user
  understands: of the two buttons in front of them, one is the answer. The page
  has spent five bands widening the story; the last frame narrows it back to a
  single action, and the glow is what performs that narrowing without adding a
  word.
- **Timing**: `480ms cubic-bezier(.16,1,.3,1)`, starting `320ms` after the CTA
  row's own `reveal` completes — so `~1.02s` after the band triggers. One shot.
  No pulse, no breathing loop: a CTA that pulses forever stops being urgent
  after the second cycle and starts being noise.
- **Build**: Tailwind + CSS. It is a single one-shot `box-shadow` transition on
  an element framer-motion is not otherwise animating; a `motion` wrapper here
  would add a component for a class toggle. Trigger the class from the same
  `whileInView` variant the band already uses (`onAnimationComplete`), or with a
  CSS `animation-delay` if the band's reveal timing is pinned.
- **Reduced motion**: `.glow-primary` applied statically on first paint, no
  ramp — the emphasis survives, the animation does not. Add the rule to the
  existing `@media (prefers-reduced-motion: reduce)` block at
  `src/index.css:619-630`, next to `.live-dot` and `.card-lift`, so all three
  reduced-motion overrides stay in one place.
- **Perf**: `box-shadow` is a paint-only property — no layout, no reflow of the
  button row. It is a 48px-tall element and the transition runs once, so the
  repaint cost is negligible. Do not substitute an animated `filter:
  drop-shadow`, which would rasterise the button's glyphs every frame.

**Calibration note for the whole scroll.** The page's existing `reveal` is tuned
for the hero, where the visitor is stationary. Below the fold the visitor is
*moving*, and a long tail means content finishes arriving after the eye has
already read it. Cases 16–17 use `460–520ms` with `y: 16–20` for that reason.
Adding a second variant (`revealTight`) beside the existing one keeps a single
vocabulary with two registers — stationary and scrolling — rather than eight
independent timings, which is the same argument the comment at
`HomePage.tsx:20-24` already makes.

---

## 4. Search, filters & discovery

Scope: `/venues` (`src/pages/DiscoverPage.tsx`), its search box
(`src/components/search/SmartSearch.tsx`), its chip row
(`src/components/ui/filter-chips.tsx`), its sort control, and the one real
map/list toggle in the app (`src/pages/NearbyFieldsPage.tsx`).

`DiscoverPage` is now one of the framer-motion pages: it imports
`AnimatePresence, motion, useReducedMotion` plus `easeOutExpo, transitionBase,
transitionFast` from `src/lib/motion.ts` (`DiscoverPage.tsx:4-6`), and its
results region is an `<AnimatePresence mode="wait">` over five keyed branches
(`:753-884`). Several cases below are therefore partly shipped and say so.

### 25. Suggestion panel: open and close

- **Where**: `/venues` (and anywhere `SmartSearch` is mounted — it is mounted at
  `src/pages/DiscoverPage.tsx:498`). The panel is
  `src/components/search/SmartSearch.tsx:317-360`.
- **Motion**: The dropdown currently appears by raw mount — `{isOpen &&
  suggestions.length > 0 && <div class="absolute z-50 …">}` — so four grouped
  sections and a footer hint materialise in one frame, 2px below a 48px input.
  Instead: the panel's `opacity` goes `0 → 1` and `translateY` goes `-6px → 0`,
  while the inner `max-h-80` scroller's first paint is already complete. The
  user understands *this list belongs to the field I am typing in* — the
  downward travel makes the input the origin, which matters because the panel is
  `position: absolute` and otherwise reads as an unattached overlay floating
  over the sticky results header (`DiscoverPage.tsx:493`). On close (Escape,
  click-outside, or a selection at `SmartSearch.tsx:212-215`) it is opacity
  `1 → 0` only, no travel: leaving is not a place the eye needs to follow.
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
  reflows the sticky search header or the results grid below it. No
  layout-thrash risk.

### 26. Keyboard cursor rail in the suggestion list

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

### 27. Debounce-to-network progress hairline under the search input

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
  `SmartSearch.tsx:39`; add an `isDebouncing` set true in `handleInputChange`
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

### 28. Filter chips entering and leaving

- **Where**: `src/components/ui/filter-chips.tsx:44-69`, fed by
  `describeActiveFilters` (`src/features/venues/activeFilters.ts`) and rendered
  at `src/pages/DiscoverPage.tsx:732-742`. The same component is rendered on
  `/games` (`src/pages/GamesPage.tsx:462-467`), so this case covers both rows —
  do not build a second version there.
- **Already built, partially**: `DiscoverPage` now ships a CSS entrance for its
  own chips — a `venues-chip-in` keyframe applied through `[data-venues-chips]
  button` with `animation-fill-mode: backwards` and a longhand
  `transition-property` list (`DiscoverPage.tsx:114-140`). The comment there
  explains the two scoping decisions: `FilterChips` is shared with `/games`, and
  a chip's entrance is triggered by node creation, which is exactly when a CSS
  animation fires. What is **not** built is the exit and the sibling reflow.
- **Motion**: Five filters can be active (query, sport, city, price, location)
  and chips are added and removed from the middle of a wrapping row. Today a
  removal is an instant DOM delete: every chip to the right jumps left by the
  removed chip's width plus 8px gap, and on a wrap boundary a chip can jump an
  entire line. Give each chip an exit of `opacity 1 → 0` with `scale 1 → 0.90`,
  and make the *surviving* chips slide into the vacated space rather than
  teleport. The user understands which filter they just dropped and that the
  others are untouched — which is the entire reason this component exists (see
  its own docstring at `filter-chips.tsx:5-18`: the page previously dropped all
  five at once).
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
  removed element's siblings into position without manual FLIP bookkeeping. If
  this lands, retire the `[data-venues-chips]` CSS entrance rather than running
  both.
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
  this same commit without reading case 29 first.

### 29. Result grid closes the gap when a filter is removed **[HIGH IMPACT]**

**Why this one**: it is the only case here that changes what the user
*believes about the data*. Removing a filter re-runs `filteredVenues`
(`DiscoverPage.tsx:358-390`) and repaints the whole grid. A player who drops
"Basketball" and sees a different set of cards has no way to tell which venues
survived and which are new — so the honest read is "the page reloaded", not "my
search widened by nine venues". Everything else in this section is polish on a
control; this one is the difference between a filter that feels like a query and
a filter that feels like a navigation.

- **Where**: `/venues` → `src/pages/DiscoverPage.tsx:805-837`, the
  `grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` mapping
  `filteredVenues` to `src/components/venues/VenueCard.tsx`.
- **Already built, partially**: each card is already a keyed `motion.div` with
  `cardMotion(index)` (`DiscoverPage.tsx:467-468, 821`), driven by `cardVariants`
  whose delay is `Math.min(index, CARD_STAGGER_CAP) * CARD_STAGGER_STEP`
  (`:101-112`) — so the capped enter stagger exists. The **exit** and the
  **survivor reposition** do not; the grid is inside `AnimatePresence mode="wait"`
  keyed by branch, not by card identity.
- **Motion**: On any change to query / sport / city / price / location, cards
  that are leaving fade `opacity 1 → 0` and drop `translateY 0 → 6px`; cards
  that stay glide from their old grid cell to their new one; cards that are
  newly matching fade `0 → 1` and rise `translateY 8px → 0` after the survivors
  have landed. The three phases must not overlap or the read inverts — a new
  card appearing while survivors are still moving looks like the grid shuffled
  randomly. Pair it with the existing `aria-live="polite"` count at
  `DiscoverPage.tsx:694-700`, which already announces "24 venues available" for
  screen readers; this is the visual equivalent of that sentence.
- **Timing**: Exit 140ms `cubic-bezier(0.4, 0, 1, 1)`. Survivor reposition
  320ms `cubic-bezier(0.16, 1, 0.3, 1)` beginning at t=140ms. Enter 200ms
  `cubic-bezier(0.16, 1, 0.3, 1)` beginning at t=340ms, reusing the existing
  `CARD_STAGGER_CAP` so a widening from 3 to 40 results does not run for four
  seconds. Total worst case 690ms.
- **Build**: framer-motion — `layout="position"` on the existing per-card
  `motion.div`, and an inner `<AnimatePresence>` keyed on `venue.id` rather than
  on the branch. `layout="position"` rather than bare `layout` is load-bearing:
  bare `layout` animates size too, which scales the card's `rounded-2xl` corners
  and resamples the `aspect-[3/2]` image mid-flight. Since every card in this
  grid is the same size, position-only is both correct and cheaper. CSS cannot
  do this at all — grid reflow is not animatable.
- **Reduced motion**: `useReducedMotion()` → the existing `cardMotion` already
  returns `{}` under `reduce`; extend the same branch to skip `layout` and the
  inner `AnimatePresence` entirely. Not a shortened animation, a *removed* one:
  the count line and the chip row already state the outcome in text, so nothing
  is lost. Implement as an early branch, not as `duration: 0` on 40 motion
  components — the reduced path should also cost less.
- **Perf**: Flag. `layout` measures every animating child on every commit; at
  `xl:grid-cols-4` an unfiltered Yerevan catalogue could be 60+ cards and that
  is 60 `getBoundingClientRect` calls per filter change, synchronously, on the
  main thread. Two mitigations, both required: (a) cap the animated set — if
  `filteredVenues.length > 40`, render without `layout`, because past ~40 the
  movement is off-screen anyway; (b) add `will-change: transform` only while the
  transition is running, via framer-motion's `onAnimationStart/Complete`, never
  as a static class — a permanent `will-change` on 40 cards costs a compositor
  layer each. The animation itself is transform+opacity; the measurement is the
  risk.

### 30. Sort re-rank

- **Where**: `/venues` → sort `Select` at `src/pages/DiscoverPage.tsx:706-730`,
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
  deliberately longer than case 29's 320ms because every card moves at once and
  a fast whole-grid shuffle reads as a glitch. Per-card delay
  `min(index * 12ms, 96ms)`, so the top-left settles first and the eye is led
  to it. The new-leader ring: `opacity 0 → 1` over 160ms at t=420ms, hold
  400ms, `1 → 0` over 300ms. Do not tint the card body; the ring is enough and
  a fill would fight the `isPromoted` treatment in `VenueCard`.
- **Build**: framer-motion, and it shares case 29's machinery — same
  `layout="position"` wrappers, different `transition` object selected by which
  state changed (`sortBy` vs. the filter set). Build 29 first; 30 is then a
  transition variant and a ring, not a second implementation.
- **Reduced motion**: `useReducedMotion()` → no movement, no ring animation.
  Instead render a static `ring-1 ring-primary/40` on the first card for
  ~1.2s using a state flag and `setTimeout`, or drop it entirely and rely on the
  existing `aria-live` region. The critical part is that the *ordering itself*
  is the answer and is fully visible without motion.
- **Perf**: Same measurement cost as case 29 and the same 40-card cap applies,
  with one addition: `compareVenues` (`sortVenues.ts`) runs inside the
  `filteredVenues` `useMemo` (`DiscoverPage.tsx:389`), so a sort change
  re-filters as well as re-sorts. That is JS cost before the animation starts —
  keep the transition's `initial` frame from being scheduled until after the
  commit, or the first 1-2 frames drop and the 420ms reads as 380ms of motion
  after a stutter.

### 31. Skeleton grid hands off to real cards

- **Where**: `/venues` → skeleton branch `src/pages/DiscoverPage.tsx:756-791`,
  results branch `:805-837`, header copy `:690-700`.
- **Already built**: this one ships. `DiscoverPage` wraps both branches in
  `<AnimatePresence mode="wait">` (`:753`), gives the skeleton grid
  `skeletonMotion` — `{ initial: false, exit: { opacity: 0 }, transition:
  transitionFast }` (`:455-457`) — and gives each real card
  `cardMotion(index)` with the capped stagger from `cardVariants` (`:101-112`).
  Two decisions in the source are worth preserving verbatim if this is ever
  touched: `initial: false` on the skeletons, because "fading a placeholder in
  delays the one thing it exists to do" (`:452-454`), and *not* passing
  `initial={false}` to `AnimatePresence`, because react-query serves this page
  from cache and suppressing the first branch would drop the stagger on exactly
  the loads fast enough to enjoy it (`:459-462`).
- **Motion**: the geometry match is the reason the handoff reads as one object
  becoming another — the skeletons carry the same `rounded-2xl border
  border-border bg-card` and the same `aspect-[3/2]` image box as `VenueCard`,
  and the comment at `:769-775` records the 43px shift caused by getting that
  wrong, now measured by `scripts/layout-shift.mjs`. What remains unbuilt is the
  header line: "Finding venues near you…" still substitutes for "24 venues
  available" as a text swap. Give it a 120ms opacity crossfade at t=0 so the
  count arrives with the cards rather than before them.
- **Timing**: as shipped — skeleton out on `transitionFast` (150ms), cards in
  400ms `easeOutExpo` with the capped per-card delay. Header text crossfade
  120ms `linear` at t=0.
- **Build**: framer-motion, already in place. Note this must not fight the
  existing `.card-lift` transition (`src/index.css:613-616`,
  `transition-all duration-200`) — the entrance is on the wrapper `motion.div`,
  not on the `<article>` that carries `card-lift`, or a pointer arriving
  mid-entrance produces a compound transform.
- **Reduced motion**: `prefersReduced` already collapses `skeletonMotion`,
  `gridMotion` and `cardMotion` to `{}` (`:455-468`). Skeletons vanish and cards
  appear at full opacity — the geometry match means there is no layout shift
  either way, so the fallback loses nothing but the dissolve. The header text
  still swaps (it is a content change, not an animation) and `aria-live="polite"`
  still announces it.
- **Perf**: `opacity` + `transform` only, on wrappers already in the grid flow.
  Watch one thing: the entrance runs during the same commit that mounts 6-60
  `<img loading="lazy">` elements, so the decode work and the animation compete.
  Keeping the stagger capped means the animated set is the above-the-fold set,
  which is also the set the browser is decoding first — they finish together
  rather than the animation outliving the decode.

### 32. Mobile filter panel expand

- **Where**: `/venues` on `md:` and below → `src/pages/DiscoverPage.tsx:609-680`,
  toggled by the Filters button at `:594-601`.
- **Motion**: `{showFilters && <div className="md:hidden pt-4 …">}` is a bare
  conditional mount inside a header that is `sticky top-16 z-40` (`:493`).
  Tapping Filters therefore grows the sticky header by roughly 200px in one
  frame and shoves the entire results grid down under it — the most jarring
  interaction on the page, and on a phone it can push the first row of cards
  clean off screen. Animate the panel's height `0 → auto` while its contents
  fade `opacity 0 → 1`, so the grid is pushed down at a rate the eye can track.
  The user understands *the filters expanded out of this button and the results
  are still there, below* — rather than experiencing a page jump with no visible
  cause.
- **Timing**: Height 240ms `cubic-bezier(0.16, 1, 0.3, 1)`. Contents
  `opacity 0 → 1` over 160ms starting at t=80ms — content that fades in at the
  same rate as the container grows looks like it is being stretched. Collapse:
  contents out 100ms `linear` at t=0, height 200ms
  `cubic-bezier(0.4, 0, 1, 1)` at t=60ms. Collapse is faster than expand
  because the user has already decided.
- **Build**: CSS/Tailwind, using the `grid-template-rows: 0fr → 1fr` technique
  on a wrapper with `overflow: hidden` — it animates to intrinsic height without
  JS measurement and without hardcoding a pixel value that breaks when the
  available sport list yields a different number of options. framer-motion's
  `animate={{ height: "auto" }}` is the alternative and would work, but this
  panel is a leaf with no exit choreography and the CSS version costs nothing to
  ship. Note: the Radix `Slider` inside (`:643`) must not be inside a
  `height: 0` container at mount time or its thumb positions measure wrong —
  render the panel always and toggle the wrapper's row-size, rather than
  conditionally mounting.
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

### 33. Map / list view toggle

- **Where**: `/nearby` → `src/pages/NearbyFieldsPage.tsx:183-233` (the two-button
  segmented control, `view` state at `:87`) and the branch it drives at `:243`.
  Stated plainly because it matters for scoping: **this is the app's only
  map/list toggle.** `/venues` and `/venues/map` (`src/pages/VenueMapPage.tsx`)
  are two separate routes with no toggle between them and no shared component —
  a shared-element transition there would be a routing change, not a motion
  change, and is out of scope.
- **Motion**: Two things, and only two. (a) The active-state fill currently jumps
  between the buttons via `transition-colors`; replace it with a single
  `bg-primary` pill that *slides* horizontally between the two segments, the
  icons crossfading their colour over it. (b) The incoming panel — map or list —
  fades `opacity 0 → 1` on mount. The user understands the toggle is one switch
  with two positions, not two independent buttons that happen to be adjacent —
  which is what `aria-pressed` already says semantically (`:208, :222`) and what
  the visuals currently do not.
- **Timing**: Pill slide 180ms `cubic-bezier(0.16, 1, 0.3, 1)`. Explicitly
  **not** `--ease-spring` (`cubic-bezier(0.34, 1.56, 0.64, 1)`): that curve
  overshoots by ~10%, and the container is
  `rounded-lg border border-border overflow-hidden` (`:183`) — the overshoot
  would be cropped by the same `overflow-hidden` that already crops the focus
  ring, per the comment at `:186-204`. Icon colour crossfade 150ms, concurrent.
  Incoming panel fade-in 200ms `cubic-bezier(0.16, 1, 0.3, 1)`, starting at
  t=60ms.
- **Build**: framer-motion for the pill (`<motion.span layoutId="view-pill" />`
  inside whichever button is active — same shared-layout trick as case 26,
  same reason: the target position is whatever the DOM measures). Tailwind
  `animate-in fade-in-0` for the incoming panel. **Do not crossfade the two
  panels.** A crossfade requires both mounted, and mounting the `GoogleMap`
  (`:259`) is a tile fetch and a canvas init — holding it alive under a fading
  list, or double-mounting it, is far more expensive than the transition is
  worth. Fade the incoming panel in over the empty space the outgoing one left;
  the unmount stays instant, exactly as it is today.
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

---

## 5. Venue detail & gallery

Scope: `/venue/:id` — route registered at `src/App.tsx:176`, page at
`src/pages/VenueDetailsPage.tsx`. The two components covered in depth are
`src/components/venue/VenueGallery.tsx` (hero grid, lightbox dialog, dot rail)
and the page itself (loading skeleton, amenities panel, the fixed mobile action
bar, the desktop sticky booking column). Supporting components touched but not
owned here: `src/features/booking/BookingPanel.tsx`,
`src/components/venue/VenueChatButton.tsx`,
`src/components/venue/WeatherWidget.tsx`.

Both files are now framer-motion consumers —
`VenueDetailsPage.tsx:5-7` and `VenueGallery.tsx:2-4` import `motion`,
`useReducedMotion` and `easeOutExpo`, and both gate every animated prop through
a `prefersReduced ? {} : {...}` object. Four cases below are already shipped and
are marked as such.

### 34. Gallery tile: the picture moves, the frame does not

- **Where**: `/venue/:id` → `src/components/venue/VenueGallery.tsx:150-152`
  (`imgClass`), applied to the main tile at `:194` and every thumbnail at
  `:222-226`.
- **Motion**: The image scales `1 → 1.05` inside a crop that does not move —
  the tile is `overflow-hidden rounded-xl` (`tileBase`, `:143`) and the grid row
  is a stated 384px at md and up (`galleryHeight`, `:181`). That distinction
  is the whole message: in this app a *card* that lifts means "this navigates
  somewhere else" (`.card-lift`, `src/index.css:614-616`), and a *picture* that
  moves inside a fixed frame means "this opens the photo". The zoom is currently
  `group-hover` only while the tile is a real `<button>` with
  `focus-visible:ring-2` — so a keyboard user gets the ring and no zoom, and the
  two affordance states disagree about what the tile is. Add
  `group-focus-visible:` alongside `group-hover:` so pointer and keyboard say
  the same thing.
- **Timing**: 250ms `cubic-bezier(0.16, 1, 0.3, 1)` in and out (`--dur-base` +
  `--ease-out-expo`). Currently `duration-300 ease-out` — neither value is in the
  token set, so the gallery is the one surface in the app running its own timing.
  Note the component already declares `{ duration: 0.25, ease: easeOutExpo }` for
  its lightbox photo motion (`:126`); the hover should agree with it.
- **Build**: Tailwind only. `imgClass` already branches on `prefersReduced`
  (`:150-152`), so this is a change to the appended string: swap
  `duration-300 ease-out group-hover:scale-105` for
  `duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]
  group-focus-visible:scale-[1.04]`. No framer-motion: this is a two-state
  transform on a static element with no presence or layout involved.
- **Reduced motion**: already correct in structure — the transition and scale
  classes are simply not emitted when `prefersReduced` is true (`:152`), so the
  image never scales and never transitions. Also correct the stale comment at
  `src/index.css:622-623` claiming nothing else in the app declares a hover
  transform; leaving it there is how the next one gets missed too.
- **Perf**: `transform` only, composite-only, no reflow (the `<img>` is
  `object-cover` filling a definite box). One flag: a transform under
  `overflow-hidden` + `rounded-xl` makes the browser clip a composited layer
  against a rounded path, which WebKit re-rasterises per frame on some builds.
  Do **not** add `will-change: transform` to fight it — the transform creates the
  layer for its own duration and a permanent `will-change` on up to five tiles
  costs more than it saves.

### 35. The clicked photo becomes the lightbox photo **[HIGH IMPACT]**

**Why this one**: it is the only case here that changes what the user *knows*
rather than how it feels. The gallery shows up to five tiles; the lightbox shows
one, chrome-less, on black. Right now there is nothing connecting them, so after
opening you cannot tell which of the five you are in, and the next/prev arrows
move you through a set whose starting point you have already lost. This is the
screen where someone decides to spend money on a venue; "which photo am I
looking at" should never be a question.

- **Where**: `/venue/:id` → `src/components/venue/VenueGallery.tsx` —
  `openLightbox` (`:92-96`), the tile buttons (`:188-194` and `:214-232`), the
  `DialogContent` (`:243`) and the lightbox image (`:277-291`).
- **Motion**: The clicked tile's `<img>` *is* the lightbox image. It travels and
  rescales from its grid rectangle to its `max-h-[80vh] max-w-full object-contain`
  rectangle, over the black backdrop fading in beneath it. On close it returns to
  the tile for the **currently selected** index — not the one you opened — so if
  you arrowed from photo 1 to photo 4, closing lands you on thumbnail 4 and your
  next click is where your eye already is. If the selected photo is not one of
  the five on screen (`thumbnails = allImages.slice(1, 5)`, `:129`), the image
  fades out at `scale(0.98)` in place instead of flying to a tile that does not
  exist.
- **Timing**: Travel 280ms `cubic-bezier(0.16, 1, 0.3, 1)` — deliberately longer
  than `--dur-base` (250ms), because the photo crosses up to 60% of the viewport
  and an object covering that much distance in 250ms reads as a cut, not a move.
  Backdrop `opacity 0 → 1` in 180ms `cubic-bezier(0.4, 0, 0.2, 1)`, starting with
  the travel so the photo is never mid-flight over an undimmed page. Close: 200ms
  same easing both.
- **Build**: framer-motion, unavoidably. `<LayoutGroup>` around the component,
  `motion.img layoutId={`venue-photo-${img.id}`}` on both the tile image and the
  lightbox image. CSS cannot do this — two separate elements in two subtrees, one
  of them behind a Radix portal. Three implementation constraints, all real:
  1. The shadcn `DialogContent` already animates itself —
     `zoom-in-95`, `slide-in-from-left-1/2`, `slide-in-from-top-[48%]`,
     `duration-200` at `src/components/ui/dialog.tsx:39`. That is a second
     transform source on the ancestor of the projected image and the two will
     fight. Keep those classes on the *overlay* (`dialog.tsx:22`) and render the
     lightbox image outside the animated content box, or neutralise them with
     `data-[state=open]:animate-none` on the wrapper for this dialog only.
  2. The crops differ — `object-cover` in the tile, `object-contain` in the
     lightbox. A pure layout projection scales the box and the image stretches
     mid-flight. Render the lightbox image with `object-cover` for the duration
     and swap to `object-contain` in `onLayoutAnimationComplete`.
  3. The lightbox photo is currently a `motion.div` keyed on `selectedIndex`
     (`:277-281`) — see case 36. A `layoutId` and a keyed remount on the same
     node will conflict; the shared element has to be the `<img>` inside that
     wrapper, not the wrapper.

  `layoutId` matching survives the Radix portal because framer-motion pairs
  through `LayoutGroup` React context, and a portal moves the DOM node without
  breaking the React tree. Verify it in the browser rather than trusting that;
  if projection misbehaves, the fallback is a hand-rolled FLIP — read
  `getBoundingClientRect()` on the tile inside `openLightbox`, stash it, and
  animate `transform` from that delta.
- **Reduced motion**: `useReducedMotion()` is already in scope (`:59`) → drop
  `layoutId` entirely, render a plain `<img>`, and strip the dialog's travel
  classes with
  `motion-reduce:!zoom-in-100 motion-reduce:!slide-in-from-top-0 motion-reduce:!slide-in-from-left-0`.
  The photo appears at final size and position; only the backdrop opacity moves,
  `0 → 1` in 120ms. No travel, no scale, nothing that crosses the viewport.
- **Perf**: `transform` + `opacity` throughout. The honest cost is one forced
  reflow at click time — layout projection reads `getBoundingClientRect()` on
  both nodes before the first frame. That is once per open, on a user gesture,
  not per frame. Never animate `width`/`height` here as a "simpler" alternative;
  that is layout on every frame, on an element containing a decoded bitmap.

### 36. Next / prev move the set, not the `src`

- **Where**: `/venue/:id` → `src/components/venue/VenueGallery.tsx:98-105`
  (`next` / `prev`), the photo wrapper at `:277-291`, the chevron buttons at
  `:256-266` and `:293-303`.
- **Already built**: the photo is a `motion.div` **keyed on `selectedIndex`**
  with `photoMotion` (`:121-127, 277-281`), so each photo is its own node and
  plays its own entrance instead of the browser holding the previous frame while
  a new `src` decodes. The source comment at `:268-276` records a second reason
  the key is load-bearing: as one reused element, `GalleryImage`'s `failed` flag
  (`:27`) stayed set after a 404, so the photo *after* a broken one showed the
  placeholder too.
- **Motion**: what remains is direction. Today the entrance is the same
  regardless of which arrow was pressed, so the arrows feel like a re-render
  rather than travel through a finite list. Give it a sign: the outgoing photo
  goes `x: 0 → -32px, opacity 1 → 0`; the incoming goes `x: +32px → 0,
  opacity 0 → 1`; flipped for `prev`. Only 32px, not a full-width slide — the
  image sits in a `max-w-4xl` dialog and dragging an 896px-wide bitmap across
  the compositor buys no extra meaning over a nudge that says "one step, that
  way".
- **Timing**: Enter 220ms `cubic-bezier(0.16, 1, 0.3, 1)`. Exit 140ms
  `cubic-bezier(0.4, 0, 1, 1)` — ease-*in*, because the photo you are leaving
  should get out of the way rather than linger. Overlapping (AnimatePresence
  default `mode="sync"`), so a held arrow key steps at ~220ms without queueing.
- **Build**: framer-motion. Wrap the existing keyed `motion.div` in
  `<AnimatePresence custom={direction} initial={false}>`, with a `direction` ref
  set in `next`/`prev` (`:98-105`). CSS cannot hold the outgoing image in the
  tree once `selectedIndex` changes — that is exactly what a presence system is
  for, and it is the only reason to reach for one here.
- **Reduced motion**: `photoMotion` already collapses to `{}` under
  `prefersReduced` (`:121-127`); keep that branch and add nothing. If a fade is
  wanted even under `reduce`, a 120ms opacity-only crossfade is defensible — a
  fade is not vestibular motion and it is what tells the user the image changed
  when the new photo is visually similar to the old one. The `x` offsets must
  never survive the branch.
- **Perf**: `transform` + `opacity`. The real risk is not the animation — it is
  two full-resolution photos decoded and held in memory simultaneously for
  220ms. On owner-uploaded 4000px originals that is tens of MB. Set
  `decoding="async"` and preload only `selectedIndex ± 1`, not `allImages`.

### 37. The dot rail stops relaying out the row

- **Where**: `/venue/:id` → `src/components/venue/VenueGallery.tsx:305-330`.
- **Already built**: this is shipped and the source records why. The active mark
  used to be a `w-6` dot against `w-1.5` siblings under `transition-all`, which
  animates `width` — a layout property, so every dot after the active one was
  re-laid-out on each frame of a transition whose whole purpose is decorative
  (comment at `:306-317`). It is now the same two sizes reached by scaling a
  24px pill down to a quarter, with the colour step riding along as opacity.
  A second fix shipped with it: the button around each dot is now a 24px square,
  where it used to be the 6×1.5px pill itself — well under the 24×24 minimum, on
  the control that steps through a venue's photos.
- **Motion**: every dot is a fixed box; the active mark is a single pill that
  *slides* along the rail and the dots recolour underneath it. The user reads
  position in a finite set — twelve equal dots are the scale, the travelling pill
  is the needle. A row where the boxes themselves resize communicates the same
  thing while also moving everything that is not the answer.
- **Timing**: Pill travel 200ms `cubic-bezier(0.16, 1, 0.3, 1)`. Dot colour 120ms
  `linear` (colour has no inertia to model).
- **Build**: CSS/Tailwind — `transform` driven inline from `selectedIndex`.
  Deliberately *not* framer-motion `layoutId`: case 35 introduces a `LayoutGroup`
  to this component, and a second projected element inside it means two
  independent layout animations sharing one measurement pass. A `translateX` on
  one span needs no measurement at all.
- **Reduced motion**: `motion-reduce:transition-none` on the pill. It still jumps
  to the correct dot instantly, and the dot colour still changes — position
  remains fully communicated, only the travel is dropped. Nothing needs adding to
  `src/index.css:619-630` because the `motion-reduce:` variant handles it inline.
  `aria-current={i === selectedIndex}` (`:325`) carries it non-visually.
- **Perf**: This case *is* the perf fix. It replaces an animated `width` (layout
  + paint on every frame, on N siblings) with a `transform` on one element
  (composite only). Keep `transition-all` off the dots permanently — narrowed to
  `transition-colors`, it cannot animate whatever layout property someone adds
  next.

### 38. A tile that is loading and a tile that has failed stop looking identical

- **Where**: `/venue/:id` → the `GalleryImage` component,
  `src/components/venue/VenueGallery.tsx:18-38`, used at `:194`, `:222` and
  `:283`.
- **Motion**: The component renders a bare `<img>` with an `onError` handler
  (`:37`) and no `onLoad` and no placeholder, so a tile is empty until the
  network returns and then the photo snaps in at full opacity; on failure it
  swaps to a `bg-surface-3` box with an `ImageOff` icon (`:29-36`), also
  instantly, and after whatever partial paint the browser already did. Instead:
  the tile paints `bg-surface-3` on mount — already the exact colour the page's
  own loading skeleton uses for this box (`src/pages/VenueDetailsPage.tsx:170`)
  — and the `<img>` starts at `opacity: 0`, going `0 → 1` on `load`. **Opacity
  only, no translate, no scale**: the frame is already the right size and in the
  right place (`galleryHeight`, `:181`), and moving the photo into a box that
  never moved would contradict the one thing this layout was carefully made to
  guarantee. On `onError` the `ImageOff` panel fades in over 160ms rather than
  appearing mid-swap. What the user then understands: grey and still = still
  coming; grey with an icon = not coming. Those two states are currently
  indistinguishable for the first second, on the hero of a listing page.
- **Timing**: Load-in 260ms `cubic-bezier(0.16, 1, 0.3, 1)`, with a per-tile
  delay of `Math.min(i, 3) * 60ms` so a five-photo gallery served from cache
  resolves as a left-to-right sweep (max 180ms of stagger) instead of five
  simultaneous flashes. Failure panel 160ms, no delay — bad news should not be
  staged.
- **Build**: Tailwind + one `useState`. The component already holds `failed`
  (`:27`); add `loaded` and switch on
  `cn(className, "motion-safe:transition-opacity motion-safe:duration-[260ms]", loaded ? "opacity-100" : "opacity-0")`.
  No framer-motion: a two-state opacity change on an element the browser owns the
  lifecycle of.
- **Reduced motion**: the `motion-safe:` prefix means the transition and the
  delay chain are simply not emitted under `reduce` — the image is at
  `opacity-100` the moment `loaded` flips. Critically, the stagger delay must be
  inside the `motion-safe:` set too; a reduced-motion user must never be made to
  *wait* 180ms for a photo in the name of accessibility.
- **Perf**: `opacity` only, composite-only. One implementation landmine that will
  bite if ignored, and the file's own comment at `:63` already names it: an
  image already complete in the memory cache by the time React attaches the
  handler never fires `onLoad`, so a cached gallery would stay at `opacity: 0`
  permanently. Guard it — a `ref` plus
  `if (el.complete && el.naturalWidth > 0) setLoaded(true)` in a mount effect.
  That is the real failure mode of this pattern, not the animation.

### 39. Skeleton hands off to content without moving anything

- **Where**: `/venue/:id` → `src/pages/VenueDetailsPage.tsx:158-186` (the
  `venueLoading` skeleton) handing off to the real page.
- **Already built, partially**: the gallery container is now a `motion.div` with
  `galleryMotion` (`:230-232, 313`) and its own `galleryVariants` (`:60`), so the
  hero does arrive rather than snap. The **crossfade** — skeleton out while
  content comes in — is not built; the skeleton branch still returns early
  (`:158`) and React swaps two whole trees in one frame.
- **Motion**: The skeleton was measured to match the gallery precisely — read the
  comment at `:161-169`: 4/3 stacked below md, a flat 384px hero at md and up,
  and a note that it was previously 69px out. None of that precision is currently
  visible, because nothing is on screen long enough to show that the boxes line
  up. Fix: crossfade in place. Skeleton `opacity 1 → 0`, content `opacity 0 → 1`,
  overlapping. **No `translateY`.** Every other entrance in this app uses
  `fadeUp` with `y: 16` (`src/lib/motion.ts:28-31`), and that is right for content
  arriving from nowhere — but here it would be a lie. Movement says "this is new";
  staying put says "this is the same box you were already looking at, now filled
  in". That is what makes the measured skeleton pay off.
- **Timing**: Skeleton out 140ms `cubic-bezier(0.4, 0, 1, 1)`. Content in 200ms
  `cubic-bezier(0.16, 1, 0.3, 1)` starting at 80ms — a 60ms overlap, enough that
  the page is never blank and short enough that no ghost double-image is legible.
- **Build**: CSS/Tailwind, with one new keyframe. The existing `fade-in`
  (`tailwind.config.ts:110-113`) cannot be reused: it carries
  `translateY(8px)`, which is the exact thing this case must not do. Add a
  sibling opacity-only keyframe next to it —
  `"fade-in-flat": { from: { opacity: "0" }, to: { opacity: "1" } }` and
  `"fade-in-flat": "fade-in-flat 200ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both"`.
  Not framer-motion: `AnimatePresence mode="wait"` serialises (no overlap) and
  `mode="sync"` needs the exiting skeleton pulled out of flow with
  `position: absolute`, which is a lot of scaffolding for two opacity ramps.
- **Reduced motion**: Add `.animate-fade-in-flat { animation: none; }` to the
  block at `src/index.css:619-630`. Content appears at final opacity in the frame
  it mounts — which is today's behaviour, and is already correct for `reduce`.
  `galleryMotion` is separately gated at `:230`.
- **Perf**: `opacity` only. The flag is not the animation, it is what it runs
  alongside: the content commit mounts `VenueGallery`, `BookingPanel`,
  `ReviewList`, `WeatherWidget` and `VenueChatButton` together. A 200ms fade
  competing with that render will drop frames and look worse than no fade. Kick
  the animation off on the frame *after* mount (`requestAnimationFrame`, or an
  `animation-delay` that outlasts the commit) so it plays on an idle main thread.

### 40. The mobile action bar steps aside when the real panel arrives

- **Where**: `/venue/:id` → the fixed bar at `src/pages/VenueDetailsPage.tsx:575-602`,
  and the booking column it points at, `id="booking"`, at `:529-541`.
- **Already built, partially**: the bar is now a `motion.div` with
  `bookingBarMotion` (`:246-248, 575-578`) — it has an entrance. What it does not
  have is the *exit*, which is the actual case.
- **Motion**: The bar is `fixed inset-x-0 bottom-14 … lg:hidden` and mounted for
  the whole page life. Its own comment (`:565-574`) explains why it exists: on a
  375px screen the booking panel starts far down a very long page. But when you
  do reach the bottom, the panel's real Reserve button
  (`src/features/booking/BookingPanel.tsx:320-323`) and the bar's Reserve
  (`:598-600`) are on screen simultaneously — two identical primary buttons, and
  the bar's is an `<a href="#booking">` that jumps to where the reader already
  is. It also permanently occupies ~64px on top of the 56px mobile nav. Instead:
  when `#booking` crosses 40% into the viewport the bar translates
  `translateY(0) → translateY(100%)` and fades `1 → 0`; it comes back when the
  panel leaves. What the user understands: the shortcut existed because the
  destination was far away; the destination is here now, so the shortcut yields.
  Two Reserve buttons never compete, and 64px of a small screen comes back.
- **Timing**: Out 200ms `cubic-bezier(0.4, 0, 1, 1)`. In 260ms
  `cubic-bezier(0.16, 1, 0.3, 1)`. Asymmetric on purpose — leaving should be
  quick and unremarkable, returning is the app handing you something back
  mid-scroll and wants to be noticeable without being startling.
- **Build**: a boolean class toggle (`translate-y-0` / `translate-y-full`) driven
  by a short `IntersectionObserver` effect watching the element that already
  carries `id="booking"`. The bar is already a `motion.div`, so a second
  `variants` entry on `bookingBarVariants` also works — either is fine; what
  matters is that the node stays mounted, which is what lets the
  `body.has-mobile-action-bar` contract stay honest.
  **Coupled change, do not skip it**: that body class (set at
  `VenueDetailsPage.tsx:152-156`) drives `--fab-lift: 4.75rem` at
  `src/index.css:359-363`, which lifts the floating AI launcher clear of the
  Reserve button. If the bar hides and the class stays on, the launcher floats
  74px above nothing. Toggle the class in the same state change, and give the
  launcher's own offset a matching 260ms transition so the two do not cross.
- **Reduced motion**: No travel. Under `reduce` the bar switches to
  `opacity 1 → 0` over 120ms and then `visibility: hidden`, with `translate-y-0`
  pinned, and `--fab-lift` changes with no transition. A bar sliding off the
  bottom edge of a phone while the user is scrolling is precisely the class of
  motion `reduce` exists to remove.
- **Perf**: `transform` + `opacity` only — never animate `bottom`, which is
  layout. The genuine risk is on the element itself: `:576` carries
  `backdrop-blur-xl` with a `supports-[backdrop-filter]:bg-card/85` fallback. A
  backdrop filter on a *translating* fixed element re-samples the region behind it
  every frame and is by a distance the most expensive thing on this page on
  mid-range Android. Either drop the blur for the duration (set a
  `data-animating` attribute and `data-[animating]:backdrop-blur-none`, restoring
  it on `transitionend`) or accept it and hold the transition at 200ms so the
  cost is bounded.

### 41. Reserve travels to the panel and the panel says it arrived

- **Where**: `/venue/:id` → `src/pages/VenueDetailsPage.tsx:598-600`
  (`<a href="#booking">Reserve</a>`) and its target at `:529`, which already
  carries `scroll-mt-24`.
- **Motion**: A bare fragment link today, so the browser cuts instantly — up to
  a couple of thousand pixels on the mobile page the code comment at `:565-574`
  measures. A jump that size is not navigation the eye can follow: you were
  reading reviews, now you are looking at a date strip, with no evidence the two
  are the same page. Two parts. **(a) Travel**:
  `scrollIntoView({ behavior: "smooth", block: "start" })`, which respects the
  existing `scroll-mt-24` and so lands the panel below the sticky header rather
  than under it. **(b) Arrival**: the booking panel takes a single ring pulse —
  `box-shadow` from `var(--shadow-md)` to `var(--shadow-ring-primary)` and back.
  That token already exists (`src/index.css:130`, and `:228` for dark) and is
  this app's own "this is the thing you asked for" mark. One pass, never a loop.
  Together they answer the two questions a jump leaves open: *did I move?* and
  *to what?*
- **Timing**: The smooth scroll is browser-controlled and not settable —
  empirically ~400-500ms in Chrome for this distance; do not pretend otherwise in
  the implementation. The ring: 180ms in `cubic-bezier(0.16, 1, 0.3, 1)`, 120ms
  hold, 320ms out `cubic-bezier(0.4, 0, 0.2, 1)`. Start it on `scrollend` where
  supported, otherwise a 450ms timeout — firing it early means the highlight
  plays off-screen and the arrival is unmarked.
- **Build**: CSS keyframe (`booking-arrive`) toggled by a class from a click
  handler; the scroll itself is the platform's. Not framer-motion — nothing here
  is presence or layout, and driving the scroll from JS would mean replacing
  native scrolling, which breaks both the `sticky top-24` sidebar (`:535`) and
  the URL fragment. Keep the `href="#booking"` on the anchor and only
  `preventDefault()` when `scrollIntoView` is available, so the control still
  works as a link with JS off and still shows a real target in the status bar.
- **Reduced motion**: `scroll-behavior: auto` — an instant jump, i.e. today's
  behaviour. Smooth scrolling over two thousand pixels is a documented nausea
  trigger and is exactly what `reduce` is asking you not to do. Keep the ring,
  which is a shadow/colour change with no movement, but drop the 120ms hold and
  play it as a flat 200ms in/out so the destination is still marked. Both lines
  go in the block at `src/index.css:619-630`:
  `html { scroll-behavior: auto; }` and a shortened `booking-arrive`.
- **Perf**: `box-shadow` is a paint property, not a composited one — it repaints
  the panel's bounding box each frame. Acceptable for one ~620ms pass on one
  element; unacceptable looped. One specific hazard: `BookingPanel`'s root is
  `glass rounded-2xl p-6` (`src/features/booking/BookingPanel.tsx:192`), and a
  repaint under a backdrop filter forces the blur to re-sample. Safer variant —
  put the ring on an absolutely-positioned `::after` on the sticky wrapper
  (`:535`) and animate its `opacity` instead, so the paint happens on a separate
  transparent layer and never touches the glass.

### 42. Amenities get a reading order

- **Where**: `/venue/:id` → the Amenities panel,
  `src/pages/VenueDetailsPage.tsx:446-466`, with icons from the `amenityIcons`
  map at `:250-256` (`Parking`, `Showers`, `Lockers`, `Wifi`, plus a
  `CheckCircle` default).
- **Already built**: the entry half ships. The grid is a `motion.div` carrying
  `amenityListMotion` — `variants` + `initial: "hidden"` + `whileInView:
  "visible"` + `viewport: amenityViewport` (`:234-241, 450-453`) — and each row
  is a `motion.div` with `amenityMotion(index)` (`:244-245, 455-461`). Both
  collapse to `{}` under `prefersReduced`.
- **Motion**: rows enter `opacity 0 → 1` and `translateY 8px → 0`, staggered in
  DOM order, which gives the eye a sequence a three-column grid otherwise
  withholds. What remains unbuilt is the **hover/focus** half: only the *icon*
  should respond — `scale(1) → scale(1.12)` and
  `text-muted-foreground → text-primary`. The label does not move. On a 375px
  two-column list this is what confirms which line your finger or cursor is on
  without reflowing the text beside it.
- **Timing**: Entry 300ms `cubic-bezier(0.16, 1, 0.3, 1)` per row, stagger
  `min(45ms, 360ms / n)` so a nine-amenity venue still finishes inside 400ms —
  a fixed stagger turns a long amenity list into a slow crawl, which is the usual
  way this effect goes wrong. Icon response 150ms (`--dur-fast`)
  `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Build**: the entry is framer-motion, in place. The icon response is pure
  Tailwind on the row's `group` —
  `motion-safe:transition-transform motion-safe:duration-150
  motion-safe:group-hover:scale-110 group-hover:text-primary` — no JS at all.
- **Reduced motion**: the variants already collapse via the `prefersReduced`
  branch, matching the measured behaviour documented at `src/lib/motion.ts:12-16`
  (0 elements left at opacity 0 under `reduce`). The icon keeps its colour change
  and loses the scale via the `motion-safe:` prefix — the affordance survives,
  the movement does not.
- **Perf**: `transform` + `opacity`. Flag: `venue.amenities` is unbounded, so up
  to a dozen children each get a composited layer for ~400ms. That is fine on its
  own — but do **not** also animate the `.panel` wrapper
  (`src/index.css:539-541`). Nesting a staggered child animation inside a moving
  parent doubles the layer work and, worse, makes the stagger unreadable, since
  the children's offsets are measured against a container that is itself sliding.
  Animate the children or the panel, never both.

---

## 6. Availability & calendar

Scope: the slot picker (`src/features/booking/BookingPanel.tsx`), the owner's
availability editor (`src/pages/VenueAvailabilityPage.tsx` +
`src/components/ui/calendar.tsx`), the owner's week grid
(`src/components/owner/schedule/WeekCalendar.tsx`), the embeddable widget
(`src/pages/EmbedBookingPage.tsx`), and the price breakdown that hangs off a
slot selection.

**The current state of the picker**: `BookingPanel.tsx` uses `transition-colors`
twice (`:218` and `:288`) with no duration, i.e. Tailwind's default 150ms, and
nothing else. There is no other motion anywhere in this section — none of these
files imports framer-motion today, so every JS case below is that file's first
use of it and should be weighed against the CSS option. The escalation palette
here is `--warning: 42 95% 55%` and `--destructive: 358 72% 68%`.

### 43. Date pill that travels

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

### 44. Slot grid answers the date **[HIGH IMPACT]**

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
  rather than wrapping in `<MotionConfig>`; `src/lib/motion.ts:3-20` documents
  why that wrapper convention was never actually followed here.
- **Perf**: transform and opacity only. The risk is layout, not paint: with
  `mode="wait"` the old grid unmounts before the new one mounts, the panel
  collapses by up to 5 rows for 90ms, and because it lives in
  `sticky top-24 z-[60]` (`src/pages/VenueDetailsPage.tsx:535`) the whole
  sidebar jumps. Use `mode="popLayout"` as specified, and set a `min-height` on
  the slot container from the previous render (`Math.ceil(prevCount / 3) * 44px`).
- **Why this one**: it is the only place in the booking flow where identical
  pixels change meaning. The date pill (43) confirms the press; nothing confirms
  that the thing the booking decision is actually made from — which hours are
  free — was recomputed. A user who taps Thursday and sees the same twelve
  numbers has no evidence the app did anything.

### 45. Slot skeleton instead of a spinner

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
  (`:272`).
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
  do not reuse this for a full-page skeleton — case 7 makes the transform-based
  argument for the shared `Skeleton`. The composited alternative here, if it ever
  needs to scale, is one absolutely-positioned gradient child per box animated
  with `translateX(-100% → 100%)` inside `overflow-hidden`.

### 46. The slot that was just taken

- **Where**: `/venue/:id` → `src/features/booking/BookingPanel.tsx:130-151`
  (`handleReserve`), triggered by the `slot_taken` branch in
  `src/features/booking/hooks/useBookingFlow.ts` — `create_booking_hold` throws
  `"That slot was just taken — please pick another time."`
- **Motion**: today this is toast-only, and the button the user chose stays
  selected and emerald while the toast says it is gone — the panel contradicts
  itself. On that error, the selected button plays a horizontal shake
  (`translateX: 0 → -4 → 4 → -2 → 0`), then morphs into the taken state:
  `opacity 1→0.4`, and `line-through` applied at the end (both classes already
  exist at `:289`). `setSelectedSlot(null)` fires with the morph, and the
  query refetches. The user understands which specific button died, that the
  system took it rather than that they mis-tapped, and that a new choice is
  required before Reserve will do anything. This is the one place in the app
  where a shake is right, and only because the object being shaken is the thing
  that was removed — cases 62, 72 and 100 all argue against shaking a form the
  user is still filling in.
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

### 47. Price breakdown as a consequence

- **Where**: `/venue/:id` → `src/features/booking/BookingPanel.tsx:303-318`, the
  `{selected && …}` block holding "1 hour", "Service fee (5%)" and "Total".
- **Motion**: the block currently appears in one frame and shoves the Reserve
  button (`:320-323`) roughly 76px down the panel. Animate the wrapper
  `height 0 → 76px` with `opacity 0→1`; the three rows enter with
  `translateY 4px→0`; the Total row's `border-t` is the last thing to appear.
  The user understands that the money showed up *because* of the slot they just
  pressed, and that the Reserve button moved for a reason rather than jumping
  under their thumb.
- **Timing**: wrapper 220ms `cubic-bezier(0.16, 1, 0.3, 1)`. Rows 140ms each,
  30ms stagger, starting at +80ms. Collapse (deselecting, or changing date,
  which nulls `selectedSlot` at `:215`) is 140ms with no row stagger —
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
  panel is `sticky top-24 z-[60]` (`src/pages/VenueDetailsPage.tsx:535`) with
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

### 48. Embed widget: tap confirmation, CSS only

- **Where**: `/embed/booking/:venueId` → `src/pages/EmbedBookingPage.tsx:260-275`
  (the `grid grid-cols-7` day cells) and `:293-311` (the `grid grid-cols-4` time
  cells).
- **Motion**: the same two ideas as cases 43 and 44, built without a JS animation
  library — and the constraint, not the idea, is why this has its own entry. Day
  cell: `transform: scale(0.94)` on `:active`, released to `1`, with the
  `bg-primary` fill fading in underneath. Time cell on select: an inset ring
  grows before the fill lands —
  `box-shadow: inset 0 0 0 0 hsl(var(--primary))` →
  `inset 0 0 0 2px hsl(var(--primary))` — so on a four-column grid of
  near-identical two-digit numbers the eye is told which one it hit. Both
  currently have `transition-colors` and nothing else. The user understands
  their tap registered: inside an iframe on a stranger's website there is no
  page chrome to orient by, and the widget's only other feedback is the Book
  button relabelling itself at the bottom of the card (`:320`).
- **Timing**: ring 140ms `cubic-bezier(0.16, 1, 0.3, 1)`; fill 150ms linear
  (matches the `transition-colors` default already in place); `:active` scale
  90ms `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Build**: Tailwind/CSS, deliberately. This route is embedded in third-party
  pages and its bundle is the *owner's visitor's* download; it imports nothing
  from framer-motion today and should keep it that way. That is the whole reason
  cases 43 and 44 are not simply reused here.
- **Reduced motion**: `motion-reduce:transition-none` on both button sets and
  `motion-reduce:active:scale-100` on the day cells. Fill and ring apply
  instantly. One utility per element, no media query needed.
- **Perf**: `transform` composites; `box-shadow` repaints every frame. Bounded
  here because exactly one cell animates at a time (selection is single-value in
  both grids). If this ever needs to run across the whole grid at once, swap the
  ring for an `::after` overlay animated on `opacity`.

### 49. Blocked-date calendar grows from its trigger

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
  `CalendarComponent` (`:265`) moves focus into the grid regardless, so a
  keyboard user's orientation does not depend on the animation.
- **Perf**: transform and opacity on a portalled node with its own layer.
  Explicitly **do not** add a transition to the day cells: `day_selected` in
  `src/components/ui/calendar.tsx` puts `bg-primary` on a 36×36 cell, and 42
  cells transitioning while the popover scales gives 43 simultaneously animating
  elements for one arrow key. Day selection stays instant.

### 50. Blocked-date chips enter and leave

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

### 51. Week navigation with a direction

- **Where**: `/owner/schedule` →
  `src/components/owner/schedule/WeekCalendar.tsx` — prev / Today / next at
  `:116-143`, the date `Badge` at `:103-105`, the grid at `:148-259`.
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
  prints (`:104`) rather than being shortened once the shift exists.
- **Perf**: the missing horizontal translate is the point. The grid sits in
  `overflow-x-auto` around a `min-w-[800px]` child (`:148-149`); translating
  x inside that container extends `scrollWidth`, so the horizontal scrollbar
  appears and vanishes on every week change. Y and opacity do not. Separately,
  while in this file: the booking blocks at `:217` use `transition-all
  hover:ring-2` on a node that also carries an inline `height`
  (`:237`, `duration_hours * 60 - 4`), so any re-render that changes a
  booking's duration animates its height through the hover transition. Narrow it
  to `transition-[box-shadow] duration-150`.

---

## 7. Booking flow & hold timer

Scope: the three screens money passes through — `src/features/booking/CheckoutPage.tsx`
(`/book/:bookingId`), `src/features/booking/BookingStatusPage.tsx`
(`/booking/:bookingId/status`), and the hand-off out of
`src/features/booking/BookingPanel.tsx` that creates the hold.

**The real flow**, from `src/App.tsx:242-244`:

```
BookingPanel.handleReserve  →  create_booking_hold RPC  →  navigate(`/book/${hold.booking_id}`)
  → CheckoutPage            →  payments-init            →  submitProviderForm() | location.href
    → Ameria vPOS / Idram   →  provider returns          →  /booking/:bookingId/status
      → BookingStatusPage   →  payments-verify polled every 2s, max 30 attempts
```

There is **no multi-step wizard and no step indicator** in this repo. "Checkout
steps" means these route hand-offs, and the cases below animate the hand-offs,
not an invented stepper.

**The hold is 20 minutes.** The number is not in the client — `expires_at` comes
back on the booking row and `CheckoutPage.tsx:81-90` diffs it against
`Date.now()` on a 1000ms `setInterval`. The string "Holds last 20 minutes" is
written once, in the expiry copy at `CheckoutPage.tsx:176`.

**Current state of these files**: `transition-colors` with no duration at
`CheckoutPage.tsx:220` (the timer) and `:271` (the provider cards);
`animate-spin` on `Loader2` at `CheckoutPage.tsx:119,296`,
`BookingPanel.tsx:321`, `BookingStatusPage.tsx:109`. Nothing else moves anywhere
in the payment path.

### 52. Reserve → hold acquired

- **Where**: `/venue/:id` → `/book/:bookingId`.
  `src/features/booking/BookingPanel.tsx:130-151` (`handleReserve`) and the
  button at `:320-323`.
- **Motion**: Three beats on one press. (a) The `Reserve` button takes
  `whileTap={tapScale}` — `scale(1) → scale(0.97)`, straight from
  `src/lib/motion.ts:49` — so the press registers before the network does.
  (b) While `createHold.isPending`, the existing `Loader2` stays, but the button
  also gets `aria-busy` and its width is pinned so the spinner does not reflow
  the label. (c) On success, before `navigate()`, the `.glass` panel plays a
  160ms exit: `opacity 1 → 0`, `translateY(0) → translateY(-6px)`. The user
  understands that the slot is now *theirs and held* — the panel leaves rather
  than being replaced, so the next screen reads as the same task continuing, not
  a new page they were thrown to. Without it, an instant route swap at 1200ms of
  latency looks like the click failed and then something happened.
- **Timing**: tap 90ms `cubic-bezier(.2,.8,.2,1)`; exit 160ms
  `cubic-bezier(0.16, 1, 0.3, 1)` (`easeOutExpo` from `src/lib/motion.ts`), then
  `navigate()` on the exit's completion callback.
- **Build**: framer-motion. `handleReserve` is already `async`, so
  `await controls.start(...)` before `navigate()` is one line; a CSS class toggle
  would need its own `transitionend` plumbing to sequence against the promise.
- **Reduced motion**: `useReducedMotion()` → skip both the tap scale and the
  exit, and call `navigate()` immediately. The 160ms delay is motion, so it must
  not be charged to someone who opted out.
- **Perf**: `transform` + `opacity` only. One caveat worth stating: the panel is
  `.glass` (`src/index.css:430-438`), i.e. `backdrop-filter: blur(18px)`.
  Animating opacity on a backdrop-filtered element re-composites the blur each
  frame. At one 160ms exit per booking that is fine; do not extend this to a
  loop.

### 53. Minute rollover on the hold timer

- **Where**: `/book/:bookingId`, the timer chip in `CardTitle` —
  `src/features/booking/CheckoutPage.tsx:215-226`, fed by `countdown` (`:92-97`).
- **Motion**: The timer fires every 1000ms (`:88`) but only animates on the
  **minute boundary** (`remaining % 60 === 0`): the chip does
  `scale(1) → scale(1.04) → scale(1)` and the `Timer` icon rotates
  `0deg → -8deg → 0deg`. Nothing moves on the other 59 ticks. What the user
  understands: time is being *spent*, in units they can count, and there are a
  small number of units left. A per-second flicker would say the same thing 1200
  times and become wallpaper within ten seconds; twenty distinct events over
  twenty minutes stay legible in peripheral vision while they read the price
  breakdown.
- **Timing**: 260ms total, `cubic-bezier(0.34, 1.56, 0.64, 1)` (`--ease-spring`,
  `src/index.css:137`) — the slight overshoot is what makes a 4% scale readable
  at all.
- **Build**: framer-motion `useAnimationControls` keyed off the existing effect
  at `:81-90`; a CSS keyframe would need the class removed and re-added per
  minute, which is a re-render either way.
- **Reduced motion**: `useReducedMotion()` → no scale, no rotation. The digits
  still change, which is the actual information; only the emphasis is dropped.
- **Perf**: `transform` only, on a chip with no children that lay out. Flag: the
  chip is inside `flex items-center justify-between` (`:207`) and the string
  loses a character at `9:59`, so its box narrows once per session and the icon
  jumps ~8px left. Fix that with `min-w-[5.5ch] justify-end` on the span, not
  with motion — it is a layout bug the animation would otherwise draw attention
  to.

### 54. Two-minute escalation **[HIGH IMPACT]**

- **Where**: `/book/:bookingId`. `isUrgent` at
  `src/features/booking/CheckoutPage.tsx:99` (`remaining <= 120`) driving the
  `cn()` at `:219-222`.
- **Motion**: Today the colour swaps `text-warning → text-destructive` under a
  bare `transition-colors` (default 150ms) and nothing else marks the crossing.
  Add a one-shot at the boundary: the chip's `box-shadow` goes
  `0 0 0 0 hsl(var(--destructive) / 0.35)` → `0 0 0 10px hsl(var(--destructive) / 0)`
  — a single ring leaving the chip — while the colour travels over a slower
  320ms. It fires **once**, at `remaining === 120`, never again. The user
  understands that a threshold was crossed, not that a value changed: a colour
  that snaps reads as a re-render, a colour that travels with a ring behind it
  reads as the system escalating. This is the difference between someone
  finishing checkout and someone losing the slot they picked.
- **Timing**: ring 520ms `cubic-bezier(0.16, 1, 0.3, 1)`; colour 320ms
  `cubic-bezier(.2,.8,.2,1)` (deliberately slower than the current 150ms so the
  change is perceived as a transition rather than a repaint).
- **Build**: CSS. A `@keyframes urgency-ring` in `index.css` next to `live-ping`
  (`:578`), applied by a class the existing `cn()` already toggles — no new JS
  state, since `isUrgent` is already computed.
- **Reduced motion**: extend the `@media (prefers-reduced-motion: reduce)` block
  at `src/index.css:619` with `.urgency-ring { animation: none }`. The colour
  change stays (it is information, and `--destructive` at `358 72% 68%` was
  contrast-checked, per the note at `index.css:55-65`), and the escalation is
  additionally carried by text.
- **Perf**: `box-shadow` animation is a paint, not a composite — this is the one
  case here that is not transform/opacity. It is bounded to a single 520ms play
  on a 90×24px element, so the repaint area is negligible; using
  `transform: scale` on a pseudo-element instead would composite, but then the
  ring is clipped by the `CardHeader` overflow. Accepted trade, once per session.
  Adjacent, not motion: `aria-live="polite"` at `:217` announces this timer on
  every tick; if that is ever tightened, the 120s crossing is the moment that
  deserves an assertive announcement, and this ring is its visual twin.

### 55. Hold expiry hand-off

- **Where**: `/book/:bookingId`. The branch at
  `src/features/booking/CheckoutPage.tsx:154-196` — when `remaining <= 0` the
  whole `<Card>` is replaced by `<StatusPanel icon={Timer} … "This reservation
  has expired">` (`src/components/common/StatusPanel.tsx:37-60`).
- **Motion**: Today the payment form vanishes and the expiry panel appears in one
  frame, indistinguishable from a crash. Crossfade instead: the `CardContent`
  goes `opacity 1 → 0` and `scale(1) → scale(0.985)` over 140ms, then the
  `StatusPanel` enters `opacity 0 → 1`, `translateY(8px) → 0` over 220ms, with
  its icon chip scaling `0.9 → 1`. The user understands that *the deadline
  arrived* — the form was withdrawn on purpose, in an order they can see —
  rather than that the page broke while they had their card out. That
  distinction decides whether they re-book or leave.
- **Timing**: out 140ms `cubic-bezier(.4,0,1,1)` (accelerate — the form is
  leaving), in 220ms `cubic-bezier(0.16, 1, 0.3, 1)` starting at 140ms. Total
  360ms.
- **Build**: framer-motion `<AnimatePresence mode="wait">` around the two
  branches. `mode="wait"` is exactly the sequencing here, and CSS cannot express
  "unmount only after the exit finishes".
- **Reduced motion**: `useReducedMotion()` → both variants collapse to
  `{ opacity: 1 }` with `duration: 0`; `AnimatePresence` still swaps, just
  instantly. Same as today's behaviour, which is the correct floor.
- **Perf**: `transform` + `opacity`. The card is not `.glass` (it is `<Card>`,
  opaque per the note at `index.css:427-429`), so no backdrop-filter recomposite
  here.

### 56. Payment provider selection

- **Where**: `/book/:bookingId`, the `role="radiogroup"` at
  `src/features/booking/CheckoutPage.tsx:262-292`.
- **Motion**: Selection currently changes only `border-primary` +
  `ring-1 ring-primary` under `transition-colors` (`:271`) — a 1px edge, no
  movement. Add: on select, the chosen card's ring grows from the token
  `--shadow-ring-primary` (`0 0 0 4px hsl(var(--primary) / 0.18)`,
  `src/index.css:228`) out of `0 0 0 0`, and its `lucide` icon scales
  `1 → 1.12 → 1`; the two deselected cards drop `opacity 1 → 0.72` over the same
  window. The user understands which card their money will go through — the
  selected one gains presence *while the others recede*, which a border colour
  alone cannot do on a dark surface where `--border: 157 12% 22%` and
  `--primary` differ mostly in hue.
- **Timing**: ring + opacity 180ms `cubic-bezier(.2,.8,.2,1)`; icon 220ms
  `cubic-bezier(0.34, 1.56, 0.64, 1)`.
- **Build**: Tailwind/CSS. `provider === key` already drives a `cn()` branch, so
  this is `transition-[box-shadow,opacity] duration-180` plus a
  `shadow-ring-primary` class on the selected branch — no JS.
- **Reduced motion**: keep the ring and the dimming (both are state, not
  decoration) but set `transition-duration: 0ms` and drop the icon scale, via
  the existing reduce block at `src/index.css:619`. Selection must never become
  invisible to someone who opted out of motion.
- **Perf**: `opacity` composites; `box-shadow` repaints a 3-row region once per
  click, at human click rate. No layout property touched — `ring` is drawn
  outside the box model and does not reflow the `space-y-2` stack.

### 57. Redirect commit — the moment the app hands off

- **Where**: `/book/:bookingId`, `handlePay` at
  `src/features/booking/CheckoutPage.tsx:101-113` and the pay button at
  `:295-298`, terminating in either `submitProviderForm()`
  (`src/features/booking/hooks/useBookingFlow.ts:139-154`, a synthetic form POST
  for Idram) or `window.location.href = result.redirectUrl` (Ameria). The
  dev-only `src/features/booking/MockPayPage.tsx` (`/pay/mock/:paymentId`,
  `:48-55`) shares this commit pattern and both its buttons already gate on
  `busy !== null` — give it the same treatment rather than its own case.
- **Motion**: Between the click and the browser unloading there is one
  `supabase.functions.invoke("payments-init")` round-trip — on a 3G Yerevan
  connection, one to three seconds — during which the only feedback is a 16px
  spinner inside a button whose label still reads `Pay ֏12,500`. Replace with a
  commit sequence: the button label crossfades (120ms) to a redirect state, a
  2px indeterminate bar sweeps `translateX(-100%) → translateX(100%)` across the
  bottom edge of the `<Card>` on a 1.1s loop, and the provider radiogroup dims to
  `opacity 0.5` and stops accepting pointer events. The user understands that
  the decision is *made and in flight* — the choice is frozen, the app is
  leaving, and pressing anything again will not help. This is the only place in
  the app where the far side of a transition is a third party we do not control,
  and the only place where a confused second click is a second payment.
- **Timing**: label crossfade 120ms `cubic-bezier(.2,.8,.2,1)`; radiogroup dim
  200ms `cubic-bezier(0.16, 1, 0.3, 1)`; sweep 1100ms `cubic-bezier(.4,0,.2,1)`
  infinite until unload.
- **Build**: CSS/Tailwind, driven by the `initPayment.isPending` flag the button
  already reads. `translateX` on an absolutely-positioned 2px child of the card;
  no framer-motion needed because there is no enter/exit sequencing — the page is
  about to be destroyed.
- **Reduced motion**: the sweep is replaced by a static 2px `--primary` rule at
  40% opacity across the card's bottom edge — present, not moving — plus the
  (already present) `disabled` state and the label change. Extend the
  `src/index.css:619` block with
  `.redirect-sweep { animation: none; opacity: .4; transform: none }`.
- **Perf**: `transform` + `opacity` only, on a 2px strip. Flag the failure mode
  instead of a layout one: if `payments-init` rejects, `handlePay` catches and
  toasts (`:110-112`) but the animation must be torn down in the same branch —
  `isPending` returns to `false`, so binding purely to that flag is what makes it
  self-correcting.

---

## 8. Payment result & confirmation

Scope: the two screens the user lands on after the bank hands them back —
`src/features/booking/BookingStatusPage.tsx` (route `/booking/:bookingId/status`)
and `src/features/booking/GameJoinStatusPage.tsx` (route
`/game/:id/join-status`) — plus the redirect seam that gets them there
(`JoinSuccessRedirect` at `src/App.tsx:105-109` and `PageLoader` at `:112-116`).

**The real state machine.** `BookingStatusPage.tsx:51-103` polls
`payments-verify` every **2000 ms**, up to **30 attempts** — a hard **60 s**
budget — then sets `finalStatus = "timeout"`. `finalStatus` is `null` while
polling, `"paid"` on success, and one of
`failed | cancelled | expired | timeout | no_payment` otherwise
(`BookingStatusPage.tsx:209`). `GameJoinStatusPage.tsx:21-66` runs the same
2000 ms × 30 loop, collapsed to `loading | success | error`. There are exactly
three bodies to animate between; everything below is about those three and the
seams around them.

**There is no receipt page and no PDF.** The receipt in this app is the `<dl>`
at `BookingStatusPage.tsx:134-149`: `Paid` (`formatAmd(booking.amount_minor)`,
`.stat-numeral tabular-nums`) and `Reference` (`booking.id.slice(0, 8)`,
`font-mono uppercase`). Case 61 animates that block and nothing else — no
invented download, no invented email preview.

Note both success icons are hardcoded `text-green-600`
(`BookingStatusPage.tsx:118`, `GameJoinStatusPage.tsx:81`) — raw Tailwind, not
`--success`. Case 60 ships the token swap with the animation, because animating
attention onto an off-brand green is worse than leaving it static.

### 58. Poll heartbeat and the 60-second budget

- **Where**: `/booking/:bookingId/status` →
  `src/features/booking/BookingStatusPage.tsx:106-113`, and
  `/game/:id/join-status` → `src/features/booking/GameJoinStatusPage.tsx:73-78`.
  Both render `<Loader2 className="animate-spin">` under "Confirming your
  payment…".
- **Motion**: two things replace one undifferentiated spinner. (a) A 56 px SVG
  ring behind the icon whose `pathLength` runs `0 → 1` **once, linearly, over
  60 s** — the real `attempts.current < 30` × 2000 ms budget from
  `BookingStatusPage.tsx:92`. (b) On each poll tick, the icon scales
  `1 → 1.06 → 1`. What the user understands: this is bounded, it is actively
  retrying right now, and the arc's remaining gap is how much patience is left
  before the page says something different. Today the spinner at second 3 and
  the spinner at second 55 are pixel-identical, which is why the 60 s wait feels
  like a hang.
- **Timing**: arc `60000ms linear` (it must be linear — eased would misreport
  remaining time). Tick pulse `260ms cubic-bezier(0.34, 1.56, 0.64, 1)`
  (`--ease-spring`), fired from the `attempts.current += 1` site.
- **Build**: framer-motion. `motion.circle` with `animate={{ pathLength: 1 }}`
  is the only clean way to drive a 60 s stroke from React state that also
  cancels correctly when the `stopped` flag flips in the effect cleanup
  (`BookingStatusPage.tsx:99-101`). The tick pulse alone could be CSS, but it
  shares the same component. **Cost note, say it plainly**: `attempts` is a
  `useRef` (`:35`) and does not currently trigger renders, so the per-tick pulse
  needs it promoted to state or a second `useState` counter incremented beside
  it — one small refactor. If that is not wanted, the cheaper variant is a
  linear 2px hairline under the heading whose fill is
  `scaleX(attempts / 30)`, advancing in 30 discrete 2000 ms steps; same
  information, one composited property, no SVG.
- **Reduced motion**: `useReducedMotion()` → no arc animation, no pulse, no
  spin. Render the ring at a static 25 % stroke and add a text line inside the
  existing `role="status"` container that updates every 10 s
  ("Still checking — 20s"). The status region is already `role="status"`, so a
  10 s cadence is polite; a 2 s cadence would flood a screen reader.
- **Perf**: `pathLength` compiles to `stroke-dashoffset`, which **paints** every
  frame — it is not a compositor property. Acceptable only because the element
  is a single ≤56 px SVG on an otherwise static card; do not reuse this on a
  list. The hairline variant is `transform: scaleX`, composited, one change per
  2 s — and must never animate `width`, which reflows the centred `text-center
  py-8` block and its heading on every step. The tick pulse is `transform` only.

### 59. The answer landing — pending → terminal body swap

- **Where**: `src/features/booking/BookingStatusPage.tsx:105-226` (`renderBody`
  returns three different subtrees into one `<CardContent>` at `:232`), and
  the same shape at `src/features/booking/GameJoinStatusPage.tsx:72-103`.
- **Motion**: wrap `renderBody()` in `<AnimatePresence mode="wait">` keyed on
  `finalStatus ?? "pending"`. Outgoing body: `opacity 1 → 0`, `y 0 → -6px`.
  Incoming body: `opacity 0 → 1`, `y 8px → 0` — the same shape as `fadeUp` in
  `src/lib/motion.ts:28-31`. The `<Card>` itself grows with `layout`: the
  pending body is ~140 px (`py-8`, icon, two lines) and the paid body is
  ~420 px once the receipt `<dl>` and the cancel row are in. Inside the incoming
  paid body the order is fixed and is the whole argument for staging: the check
  mark (case 60) draws first, the `h1` and venue line follow, then the receipt
  (case 61), then the two `Button`s last — so the eye finishes on the reference
  rather than on the largest element. What the user understands: the wait ended
  and this is the *replacement* for it, not a second, unrelated screen — today
  the card snaps height and the eye has to re-find the heading.
- **Timing**: out `150ms cubic-bezier(0.16, 1, 0.3, 1)` (`--dur-fast`), in
  `400ms cubic-bezier(0.16, 1, 0.3, 1)` (`--dur-slow`), card height
  `300ms cubic-bezier(0.16, 1, 0.3, 1)`; the buttons land at `+480ms` from the
  body's own start. `mode="wait"` serialises the swap, so the total is 550 ms —
  long enough to read as a transition, short enough that the outcome is on
  screen inside 200 ms of it being known.
- **Build**: framer-motion. `AnimatePresence mode="wait"` plus `layout` is the
  only thing here that can animate an unknown-to-unknown height; CSS
  `height: auto` cannot.
- **Reduced motion**: `useReducedMotion()` → set both durations to `0` and drop
  `layout` from the card (pass `layout={!prefersReduced}`). The new body
  replaces the old one on the same frame at final height, buttons included. Do
  not substitute a crossfade — a crossfade is still motion.
- **Perf**: the body transition is `transform`/`opacity` only. The `layout`
  prop is the flag: framer-motion 12 animates size by scale-correcting, which
  visibly softens glyphs mid-flight unless children opt in. Put
  `layout="position"` on the heading and paragraph so the text translates
  instead of being scaled, and leave the `<dl>` out of `layout` entirely
  (see case 61).

### 60. Confirmation mark — draw, then settle **[HIGH IMPACT]**

- **Where**: `src/features/booking/BookingStatusPage.tsx:118`
  (`<CheckCircle2 className="h-14 w-14 text-green-600 …" />`) and
  `src/features/booking/GameJoinStatusPage.tsx:81` (identical markup, above
  "You're in!").
- **Motion**: lucide's `CheckCircle2` is a `<circle cx="12" cy="12" r="10">`
  plus a `<path d="m9 12 2 2 4-4">` on a 24-unit viewBox. Animate them
  separately: the circle scales `0.7 → 1` with an overshoot, then the tick path
  draws left-to-right via `stroke-dasharray: 12; stroke-dashoffset: 12 → 0`.
  What the user understands: the confirmation was *produced by* the wait that
  just ended, in that order — money left, the venue is held. A check that is
  simply present when the spinner vanishes reads as a page swap; a check that
  draws reads as an outcome. Ship the token fix in the same commit:
  `text-green-600` → `text-success` (`151 80% 44%` dark / `158 64% 28%` light),
  or the one moment the app draws the eye lands on a green used nowhere else.
- **Timing**: circle `320ms cubic-bezier(0.34, 1.56, 0.64, 1)` (`--ease-spring`,
  the overshoot is the point); tick path `220ms cubic-bezier(0.16, 1, 0.3, 1)`
  starting at `+90ms`. Total 410 ms, beginning after case 59's incoming body
  has committed.
- **Build**: framer-motion, on a local inline SVG rather than the lucide
  component — `<CheckCircle2>` renders its own children, so there is no handle
  on the path. Copy the two elements into the page as `motion.circle` /
  `motion.path` and drive `pathLength`. (Do not add a dependency for this; it is
  eight lines of SVG.)
- **Reduced motion**: `useReducedMotion()` → render the plain lucide
  `<CheckCircle2>` at full scale, opacity 1, `pathLength: 1`, zero duration. The
  token swap still applies. Nothing draws, nothing overshoots.
- **Perf**: the circle is `transform` (composited). The tick is
  `stroke-dashoffset` — paint, but for 220 ms on one 56 px SVG. No layout is
  touched: the icon keeps its `h-14 w-14` box throughout, so the heading beneath
  it never moves.
- **Why this one**: it is the only frame in the product where money has
  irreversibly left the user's account. Everything else on these two screens can
  be re-read; this beat is the difference between "did that go through?" and
  "that went through", and it costs 410 ms of one SVG.

### 61. Receipt reveal — amount before reference

- **Where**: `src/features/booking/BookingStatusPage.tsx:134-149` — the
  `<dl>` holding `Paid` (`formatAmd(booking.amount_minor)`, `.stat-numeral
  tabular-nums`) and `Reference` (`booking.id.slice(0, 8)`). This block exists
  precisely because an email receipt is not guaranteed (see the comment at
  `:128-133`), so it is the user's only artefact.
- **Motion**: the `<dl>` container fades `opacity 0 → 1` and translates
  `y 10px → 0`; then the two `<dd>` values fade in on a short stagger, amount
  first, reference second. What the user understands: the reading order. The
  amount is what to check against the card statement; the reference is what to
  quote if it does not match. Staggering them in that order is the whole
  argument for animating this block at all. Explicitly **no digit count-up** on
  the amount — a price the user has already been charged must not appear to be
  still resolving.
- **Timing**: container `300ms cubic-bezier(0.16, 1, 0.3, 1)` at `delay 420ms`
  (immediately after case 60's 410 ms mark settles); amount `<dd>` `200ms` at
  `+0ms`; reference `<dd>` `200ms` at `+80ms`. Receipt fully legible at ~700 ms
  from the result landing.
- **Build**: framer-motion, `variants` + `staggerChildren: 0.08` — the same
  pattern as `staggerChildren` in `src/lib/motion.ts:43-46`. Reusing the shared
  vocabulary keeps this consistent with the entrances on `/` and `/for-owners`.
- **Reduced motion**: `useReducedMotion()` → the `<dl>` renders at final state
  on the first paint of the paid body, **delay 0**. This is a hard rule, not a
  convenience: evidentiary content must never sit behind a 420 ms delay for a
  user who asked for less motion.
- **Perf**: `transform` and `opacity` only. Do not animate the `<dl>`'s height
  or width — it carries `tabular-nums` money, and any size interpolation makes
  the digits jitter against their own advance widths. Keep it out of the
  `layout` set from case 59 for the same reason.

### 62. Failure mark — settles sideways, never bounces

- **Where**: `src/features/booking/BookingStatusPage.tsx:212`
  (`<XCircle className="h-14 w-14 text-destructive …" />`, covering
  `failed | cancelled | expired | no_payment`) and
  `src/features/booking/GameJoinStatusPage.tsx:93`.
- **Motion**: the icon fades `opacity 0 → 1` while translating on `x` through
  a damped two-beat: `x: [0, -4, 3, -2, 0]` px, `scale` pinned at 1 the whole
  time. What the user understands: the outcome, before reading a word. Case 60
  overshoots *outward* and settles; this settles *laterally* and stops dead.
  Two physics, two answers — and the visual difference survives at a glance,
  in a screenshot, and for a user who cannot distinguish the green from the red.
  Same motion for the "Payment not completed" and "Booking cancelled" copy
  branches (`:213-215`) because in both cases no money was taken (`:219`). The
  panel around it gets the same 260 ms fade-and-rise as the success panel — no
  red flash, no error choreography — because the copy at `:219` says "No money
  was taken. You can try booking the slot again", and shake-on-error reads as
  *you did something wrong*, which is both false and expensive when the honest
  next action is "press the button again".
- **Timing**: `260ms cubic-bezier(0.2, 0.8, 0.2, 1)` for the x keyframes,
  `160ms` linear for the opacity, both starting with the incoming body from
  case 59.
- **Build**: framer-motion — `animate={{ x: [0, -4, 3, -2, 0] }}` is a
  keyframe array, which CSS would need a bespoke `@keyframes` block for. There
  is no such keyframe in `tailwind.config.ts:101-124` today and adding one for a
  single element is not worth the global surface. If case 55's `AnimatePresence`
  has not landed, `animate-in fade-in-0 slide-in-from-bottom-2` from
  `tailwindcss-animate` covers the panel with no new CSS.
- **Reduced motion**: `useReducedMotion()` → `opacity 0 → 1` over `120ms`, `x`
  never leaves 0. **Never shake.** The x-array must be gated, not scaled down.
- **Perf**: `transform`/`opacity`, composited, no layout. The 4 px amplitude cap
  is deliberate — beyond that a 56 px icon reads as a rejected-form-field
  shudder, and lateral shakes are the class of motion vestibular-sensitive users
  report on even when they have not set the OS preference.

### 63. "Still processing" is not a failure

- **Where**: `src/features/booking/BookingStatusPage.tsx:209-220`, the
  `finalStatus === "timeout"` branch. It currently renders the same
  `XCircle text-destructive` as an outright failure (`:212`) while the heading
  says "Payment still processing" and the body says the page will update
  (`:214, :218`) — the icon contradicts the copy.
- **Motion**: swap this branch to a `Clock` in `text-warning`
  (`42 95% 55%` dark / `35 92% 32%` light) and give it a slow breathing
  `opacity 0.55 → 1 → 0.55`, infinite. Deliberately no scale ping — that is the
  `.live-dot` treatment (`src/index.css:567-581`) and it means "live data
  arriving", which is exactly what has stopped. What the user understands: the
  60 s poll gave up, the payment did not; this page is worth coming back to and
  their money is not lost. Today the red X tells them the opposite of what the
  sentence under it says.
- **Timing**: `2400ms cubic-bezier(0.16, 1, 0.3, 1)` per breath, `infinite`,
  `alternate` — roughly half the tempo of `live-ping`'s `1.8s`
  (`src/index.css:576`), because slower reads as "waiting" and faster reads as
  "working".
- **Build**: CSS. It is one keyframe on one element with no React state — add
  `breathe` alongside `fade-in` and `shimmer` in `tailwind.config.ts:101-124`
  and use `animate-breathe`. Pulling framer-motion in for an infinite opacity
  loop would keep a JS animation frame alive for the life of the page.
- **Reduced motion**: extend the existing block at `src/index.css:619-630` —
  `.animate-breathe { animation: none; opacity: 1; }`. The warning colour and
  the copy still carry the whole message; the breathing was only ever the
  redundant channel.
- **Perf**: `opacity` only — composited, no paint, no layout. It is infinite,
  so gate it on `document.visibilityState !== "hidden"` (or accept that Chrome
  throttles background rAF but not CSS compositor animations on some platforms)
  rather than leaving it running on a backgrounded tab for the length of a
  football match.

### 64. Cancelling a confirmed booking — the receipt stays put

- **Where**: `src/features/booking/BookingStatusPage.tsx:160-205`. The
  `AlertDialog` sits *inside* the paid body; confirming calls
  `setFinalStatus(result.status)` (`:184`), which flips `renderBody()` from
  the green confirmation straight to the red X branch, and fires a sonner toast
  carrying the refund amount (`:186-193`).
- **Motion**: three coordinated pieces. (a) The dialog closes on Radix's
  existing `data-[state=closed]` exit from `src/components/ui/alert-dialog.tsx`
  — unchanged. (b) The body swap reuses case 59's `AnimatePresence`, but the
  receipt `<dl>` is carried across with `layoutId="receipt-lines"` so the amount
  and reference the user was just reading translate to their new position
  instead of blinking out and back — it is the same reference, and a refund
  query needs it more than the booking did. (c) The refund toast enters
  bottom-right with sonner's own transition. What the user understands: this is
  the same booking changing state, not a new page reporting a new event.
- **Timing**: body swap as case 59 (150 ms out / 400 ms in); shared-element
  `<dl>` `300ms cubic-bezier(0.16, 1, 0.3, 1)`; toast `duration: 6000` rather
  than sonner's 4000 default, because a refund figure formatted by `formatAmd`
  is a number people re-read.
- **Build**: framer-motion for `layoutId` (nothing in CSS crosses a subtree
  boundary), Radix/`tailwindcss-animate` for the dialog, sonner for the toast —
  each already mounted (`<Sonner />` at `src/App.tsx:132`).
- **Reduced motion**: add `motion-reduce:animate-none` to `AlertDialogContent`;
  gate `layoutId` behind `useReducedMotion()` so the `<dl>` re-renders in place
  with no flight; keep the toast — its arrival is information, not decoration —
  but kill its travel with an override in the reduce block at
  `src/index.css:619-630`: `[data-sonner-toast] { transition: none !important; }`.
  sonner 1.7.4 animates through its own CSS transitions on that attribute;
  verify rather than assume the library reads the preference for you, and read
  case 92 before writing that rule — a blanket `transition: none` on toasts is
  the exact defect case 92 fixes.
- **Perf**: `layoutId` measures both positions with `getBoundingClientRect`
  once per transition — two forced reflows at the swap, not per frame. That is
  the layout-thrash risk here and it is bounded; the flight itself is
  `transform`. Do not extend `layoutId` to the whole body.

### 65. Coming back from the bank — the blank frame

- **Where**: `src/App.tsx:105-109` (`JoinSuccessRedirect`, mounted at
  `/game/:id/join-success`, renders `<Navigate replace>` and therefore no
  pixels) and `src/App.tsx:112-116` (`PageLoader` — a bare `min-h-screen`
  centred spinner on `bg-background`, with no header, no text). Both status
  pages are `lazy()` (`src/App.tsx:34, 36`), so the first frame after Ameria or
  Idram redirects the user back is that chunk-loading spinner, and a provider
  configured to the legacy `/join-success` URL adds a second mount on top.
- **Motion**: give `PageLoader`'s spinner a `120ms` entrance delay with
  `animation-fill-mode: backwards`, so a chunk that resolves in 40 ms shows no
  spinner at all; and let the status page enter with `pageTransition` from
  `src/lib/motion.ts:52-56` (`opacity 0 → 1`, `y 8px → 0`). What the user
  understands: one continuous "we're on it" from the moment the bank released
  them, instead of blank → spinner → different spinner → content. This is the
  most fragile moment in the funnel — the user has already been charged and is
  looking at a page that is not the bank's and not yet ours.
- **Timing**: spinner fade-in `150ms cubic-bezier(0.16, 1, 0.3, 1)` at
  `delay 120ms`; page enter `250ms cubic-bezier(0.16, 1, 0.3, 1)`
  (`--dur-base`, matching `transitionBase` in `src/lib/motion.ts:25`). Note case
  4 proposes a 250 ms gate on the same component for ordinary navigation; pick
  one number and apply it once — 120 ms here is the more conservative choice for
  a post-payment return, where withholding feedback is riskier than a brief
  flash.
- **Build**: CSS for the delayed spinner (it lives in a component with no state
  and no framer-motion import — keep `App.tsx`'s eager bundle clean);
  framer-motion for the page enter, reusing the already-exported
  `pageTransition` variants.
- **Reduced motion**: drop the delay under
  `@media (prefers-reduced-motion: reduce)` — withholding feedback is worse than
  showing it — and render the spinner immediately at opacity 1. Replace
  `animate-spin` with a static ring in the same block at `src/index.css:619-630`,
  and because the spin is then the only "still working" signal that has been
  removed, `PageLoader` needs an `<span className="sr-only">Loading</span>`
  inside a `role="status"` wrapper, which it does not have today. The page
  enter resolves to its final state via `useReducedMotion()`.
- **Perf**: `opacity` and `transform` only on both halves. `animate-spin` is a
  transform on one 32 px div — composited. No layout risk; the flag here is
  correctness, not cost.

---

## 9. Auth: login, signup, reset

Scope: the five real auth routes in `src/App.tsx:202,220-223` —
`/login` (`src/pages/LoginPage.tsx`), `/signup` (`src/pages/SignupPage.tsx`),
`/forgot-password` (`src/pages/ForgotPasswordPage.tsx`), `/reset-password`
(`src/pages/ResetPasswordPage.tsx`) and `/auth/callback`
(`src/pages/AuthCallbackPage.tsx`). All five are `lazy()` behind the
`PageLoader` spinner at `src/App.tsx:112-116`.

**The real state machines.** Nothing here is invented; these are the branches
the components already render.

```
/login          LoginPage.tsx:448,501  magicLinkSent ? … : mfaRequired ? … : form
                          :113         authMode "password" | "magic-link"
                          :115-116     magicLinkSent, resendCooldown (30 → 0, 1000ms tick at :175-179)
                          :121-123     mfaRequired, mfaFactorId, totpCode
/signup         SignupPage.tsx:738     password strength block, mounts on first keystroke
                          :600         RadioGroup player | owner
/forgot         ForgotPasswordPage.tsx:91   isEmailSent ? sent panel : form
/reset          ResetPasswordPage.tsx:148   isSuccess ? panel : form, then signOut+navigate at :105-108 (3000ms)
/auth/callback  AuthCallbackPage.tsx:108,114,122  loading | success | error, redirects at 1500ms / 3000ms
```

`/login` and `/signup` are both framer-motion pages now, with locally declared
literals rather than CSS variables because framer needs values: `LoginPage.tsx:37-42`
defines `EASE`, `EASE_SPRING`, `ENTER 0.42`, `EXIT 0.16`, `FEEDBACK 0.28`,
`STAGGER 0.05`, and its header comment states the rule this section follows —
"motion on this page has three jobs and no others: bring the form in in reading
order, answer a focus, and answer a failure". `SignupPage.tsx:102-107` ships its
own scoped reduce block, `SIGNUP_MOTION_CSS`, because `Progress` and `Button`
carry unguarded transitions from shared components that page does not own.

Bundle note that matters here: `HomePage` is **eagerly** imported
(`src/App.tsx:20`) and imports framer-motion, so the library is already in the
initial bundle before anyone reaches `/login` — a `motion` import in an auth
chunk adds no download.

### 66. The /login panel is three screens in one slot **[HIGH IMPACT]**

- **Where**: `/login`, the top-level ternary in `src/pages/LoginPage.tsx:446-554`
  — sign-in form, "Check your email" (`:449`), "Two-factor authentication"
  (`:502`). All three render into the same `max-w-md` slot.
- **Already built**: this ships. The ternary is wrapped in
  `<AnimatePresence mode="wait">` (`:446`) with one `motion.div` per branch keyed
  `"magic-sent" | "mfa" | "form"`, driven by the `swap` / `swapOut` prop objects
  at `:150-163`, both of which collapse to `{}` under `prefersReduced`. The
  typographic half was fixed earlier — `.auth-hero-title` / `.auth-form-title`
  exist at `index.css:496-502` precisely because "the form heading changes size
  *within* a page" (`index.css:479-483`).
- **Motion**: what remains is **direction**. Forward (form → magic-link-sent,
  form → MFA) and backward (the "Back to login" buttons at `:451` and `:504`,
  both calling `handleBackToLogin` at `:313`, which *signs the user out*)
  currently animate identically. Give the slot a sign: forward, outgoing panel
  `translateX(0 → -24px)` and incoming from `+24px`; backward, mirrored. The user
  understands that the credentials screen was not destroyed, it was stepped away
  from, and that the back arrow returns to the same place it left.
- **Timing**: exit `EXIT` (160ms) `cubic-bezier(0.16, 1, 0.3, 1)`, enter 250ms
  same curve, enter delayed 120ms so the two do not overlap into a cross-dissolve
  mush. These are `--dur-fast` / `--dur-base` verbatim (`index.css:138-139`) and
  match the page's own constants.
- **Build**: framer-motion, already in place — this is one `custom` prop on
  `AnimatePresence` and a direction `useRef` holding the previous key. `mode="wait"`
  is why the library is here rather than CSS: the three branches have very
  different heights and must not be in flow simultaneously.
- **Reduced motion**: `swap`/`swapOut` already return `{}`; add
  `initial={false}` on `AnimatePresence` under the same flag. The panel swaps
  instantly, exactly as it did before any of this; the focus move still happens
  because it is not motion.
- **Perf**: `transform` + `opacity` only. Two real risks, both nameable. (1) The
  parent is `flex items-center justify-center`, so the wrapper's height change
  still reflows that one centred column — acceptable at this scale, but do
  **not** animate `height` on top of it. (2) During the 120ms overlap gap the
  slot is empty, so the card visibly recentres; pin a `min-height` on the
  `max-w-md` wrapper for the duration, or accept the settle. **Why this one**:
  it is the single highest-traffic signed-out surface in the app, and the only
  place where a user is silently signed out by a "Back" control.

### 67. Password ↔ magic-link, inside the card

- **Where**: `/login`, `authMode` (`src/pages/LoginPage.tsx:113`) switching the
  two forms inside the `"form"` branch, driven by the "Send Magic Link" button
  and the "Sign in with password instead" link.
- **Motion**: This swap removes or adds the entire password field group —
  roughly 92px of the card. Today the card jumps and every button below it
  teleports. Animate the card's height from its measured old value to its new
  one while the departing field group fades `opacity 1 → 0` and the arriving one
  fades in, both without translation. Height is the whole point: the user
  understands that one field was added or removed from a form they are still in,
  rather than that the form was replaced. Keep the shared email field mounted and
  untouched — it is the same input with the same value, and anything it does
  during the swap says otherwise.
- **Timing**: height 260ms `cubic-bezier(0.16, 1, 0.3, 1)`; the field group's
  opacity 150ms `linear`, out first, in on completion.
- **Build**: framer-motion `<motion.div layout>` on the card, with a nested
  `<AnimatePresence mode="wait">` inside the existing `"form"` branch. Hand-rolled
  CSS height animation needs a measured pixel value and a `ResizeObserver`;
  `layout` does the FLIP for free and the library is already imported on this
  page.
- **Reduced motion**: `useReducedMotion()` → drop the `layout` prop entirely and
  render the swap instantly. Do not leave `layout` on with `duration: 0` — it
  still runs a measure pass each render for no visible benefit.
- **Perf**: this is the one case in the section that is *not* transform-only.
  `layout` animates via `transform: scaleY` and counter-scales children, so it
  composites, but it forces a layout read on every swap. It is a single card, on
  user click, at most a few times per session — bounded and worth it. Do **not**
  extend the same treatment to `/signup`, whose card is twice as tall and whose
  strength block (case 70) changes height on every keystroke.

### 68. The six OTP slots, and arming the verify button

- **Where**: `/login`, MFA branch — `InputOTP` at `src/pages/LoginPage.tsx:523-540`
  over `src/components/ui/input-otp.tsx:24-50`, and the gated Verify button
  (`disabled={totpCode.length !== 6 || isVerifyingMfa}`).
- **Already built, partially**: failure is answered. The page holds an
  `otpShake` `useAnimationControls` (`:132`) applied to the OTP group (`:522`)
  and fired from both invalid-code paths (`:260`, `:273`), through a `shake()`
  helper that returns early under `prefersReduced` (`:138-141`). What is not
  built is per-digit confirmation and the arming of the button.
- **Motion**: Three linked pieces. (1) On each digit, that slot's character
  enters `opacity 0 → 1` with `scale(0.8) → 1` — the slot confirms it took the
  character, which matters when a 6-digit code is pasted or typed fast. (2) The
  active slot's `ring-2 ring-ring` (`input-otp.tsx:36`) currently appears through
  an undurated `transition-all`; give it 120ms so the ring reads as *moving*
  left-to-right across the group rather than blinking in six places. (3) When the
  sixth digit lands, the Verify button crosses from `disabled:opacity-50`
  (`button.tsx:8`) to full with a 220ms `box-shadow: var(--shadow-ring-primary)`
  pulse that decays to none. The user understands the code is complete before
  reading the button label — the common failure here is typing five digits and
  pressing a dead button.
- **Timing**: character 140ms `cubic-bezier(0.34, 1.56, 0.64, 1)` (`EASE_SPRING`
  at `LoginPage.tsx:38` — the slight overshoot reads as a key press); ring 120ms
  `cubic-bezier(0.16, 1, 0.3, 1)`; button arm 220ms same curve.
- **Build**: CSS/Tailwind. Add `duration-150` to the slot's existing
  `transition-all`, and one keyframe pair in the `@layer components` block of
  `index.css`; the character animation keys off `char` becoming non-empty, which
  is a class toggle in `InputOTPSlot`, not a new library. `input-otp` already
  supplies `hasFakeCaret` / `isActive` (`input-otp.tsx:29`).
- **Reduced motion**: extend `index.css:619-630` with
  `.animate-caret-blink { animation: none; }` (the caret at `input-otp.tsx:44` is
  a 1000ms blink that reduce users currently still get), slot character
  transitions to `none`, and the button's arming pulse replaced by the instant
  opacity change it already has. The ring is a focus indicator and must never be
  suppressed — it just stops being timed.
- **Perf**: `transform`, `opacity`, `box-shadow`. `box-shadow` is a paint, not a
  layout — on a 48px-tall button, once. The slot `scale` is on a 40×40 box with
  one glyph.

### 69. The 30-second resend cooldown, shown rather than counted

- **Where**: `/login`, "Check your email" panel — the resend Button at
  `src/pages/LoginPage.tsx:478-490`, `resendCooldown` decremented by the
  `setTimeout` at `:175-179`, guarded at `:237`.
- **Motion**: The label already ticks `Resend in 30s … 29s …` (`:484-485`), which
  is a number changing once a second and reads as a stopwatch the user is being
  made to watch. Add a depleting hairline: a 2px rule pinned to the bottom edge
  of the disabled outline button, `transform: scaleX(1) → scaleX(0)` with
  `transform-origin: left`, driven off the same `resendCooldown` value —
  `scaleX(resendCooldown / 30)`. The user understands *how much* waiting is left
  at a glance and when the button becomes live, without reading a number. On
  reaching 0 the rule is unmounted and the button's own 200ms `transition-all`
  (`button.tsx:8`) carries it from `disabled:opacity-50` to full.
- **Timing**: each step 1000ms `linear`, matching the real tick at `:176`.
  Linear is deliberate — it is a clock; easing it would misreport how much time
  is left mid-step.
- **Build**: CSS/Tailwind. `style={{ transform: 'scaleX(' + resendCooldown / 30 + ')' }}`
  on an absolutely-positioned `div` plus `transition-transform duration-1000
  ease-linear`. React already re-renders on every tick, so there is no new state
  and no new dependency.
- **Reduced motion**: `transition: none` on the rule — it still steps down once
  per second (that is information, not decoration), it just does not glide.
  Nothing else changes; the numeric label at `:485` is unaffected and remains
  the accessible source of truth.
- **Perf**: `transform: scaleX` on a composited 2px layer, one change per
  second, inside a `relative` button — no reflow of the centred panel. Do
  **not** animate `width` here; the button is inside a `text-center` column and a
  width change on a child would relayout the block on every tick.

### 70. Password strength: the bar, the label, and the four ticks

- **Where**: `/signup`, `src/pages/SignupPage.tsx:738-770` — `Progress
  data-strength-meter` at `:740`, the strength word beside it, the requirement
  grid below, scored by the `useMemo` at `:142-159` in 20-point steps. A second,
  differently built version of the same block is at
  `src/pages/ResetPasswordPage.tsx:213-225`.
- **Already built, partially**: the panel's *mount* is animated —
  `strengthPanelMotion` (`:325`) on a keyed `motion.div` (`:738`) — and the reduce
  path for the shared `Progress` indicator is already handled by the page's own
  scoped block, `[data-signup] [data-strength-meter] > * { transition: none; }`
  (`SignupPage.tsx:104`). The `data-strength-meter` attribute exists exactly so
  that rule can reach a component the page does not own.
- **Motion**: The bar already moves — `progress.tsx:23-25` transitions
  `translateX(-N%)` — but at Tailwind's default 150ms `cubic-bezier(0.4, 0, 0.2, 1)`,
  which for a 20-point jump lands flat and unnoticed. Retime it to 250ms
  `--ease-out-expo` so a keystroke that earns a criterion produces a visible
  advance. Then stage the tick: when a `checks.*` flips true (`:145-157`), its
  `X` → `Check` swap scales `0.7 → 1` over 160ms and its label crossfades
  `text-muted-foreground → text-foreground` over 200ms, **delayed 120ms** behind
  the bar. The user understands *which* rule they just satisfied — the bar says
  "better", the tick says "because of this".
- **Timing**: bar 250ms `cubic-bezier(0.16, 1, 0.3, 1)`; tick 160ms
  `cubic-bezier(0.34, 1.56, 0.64, 1)`; label colour 200ms
  `cubic-bezier(0.16, 1, 0.3, 1)`; tick delay 120ms.
- **Build**: CSS/Tailwind. Pass the retimed transition through `className` at the
  call site (`:740`) so `progress.tsx` stays shared and the ten other consumers
  are unaffected. One flag while in here, not a motion issue but adjacent:
  `ResetPasswordPage.tsx:223` passes `getStrengthColor()` (`bg-destructive` …
  `bg-green-500`) to `Progress`'s **Root**, so tailwind-merge overrides the
  `bg-surface-3` *track* while the indicator stays `bg-primary` — the wrong
  element is coloured. Do not animate a colour onto that class until it lands on
  the indicator.
- **Reduced motion**: the existing `SIGNUP_MOTION_CSS` rule already zeroes the
  indicator's transition; add a sibling
  `[data-signup] [data-strength-tick] { transition: none; transform: none; }` to
  the same block. The bar still jumps to its new value, the tick still turns
  green: both are state, and state must survive.
- **Perf**: `transform: translateX` on the indicator (already the mechanism at
  `progress.tsx:24`) and `transform: scale` on a 12px icon. No layout property.
  The block itself mounts on the first keystroke into the field, and that first
  mount does change page height — leave it un-animated rather than fight it;
  `strengthPanelMotion` is an opacity/offset entrance, not a height animation,
  which is the right call.

### 71. Player vs owner — the choice that changes the form

- **Where**: `/signup`, the `RadioGroup` at `src/pages/SignupPage.tsx:600-640`;
  the two visible controls are `Label`s (the radios are `peer sr-only`).
- **Already built, partially**: the downstream half ships. The name field's label
  is a keyed `motion.span` — `<motion.span key={userType} {...swapMotion}>`
  rendering "Full name" or "Business name" (`:649-651`) — with `swapMotion`
  defined at `:352-358` and gated on `prefersReduced`. The comment at `:335-345`
  is explicit that text replaced by other text in the same slot is what this
  motion is for.
- **Motion**: what remains is the *cause*. Selecting a card is not cosmetic — it
  rewrites that label and placeholder and changes where submit lands
  (`/onboarding/player` vs `/owner-dashboard`, `:255`). Give the click its own
  answer: the chosen card's border goes
  `border-border-interactive → border-primary` and its fill
  `transparent → bg-primary/5` over 200ms, and its icon scales `1 → 1.08` and
  back over 240ms — the existing `transition-all` on the `peer-data-[state=checked]:`
  chain has no duration, so this is a retime, not a new mechanism. The user
  understands the second change was caused by the first, which is otherwise easy
  to miss because it happens 200px below the click.
- **Timing**: card 200ms `cubic-bezier(0.16, 1, 0.3, 1)`; icon 240ms
  `cubic-bezier(0.34, 1.56, 0.64, 1)`; the label crossfade is already
  `transitionFast` via `swapMotion`, starting when the keyed span remounts.
- **Build**: CSS/Tailwind — `duration-200` on the existing
  `peer-data-[state=checked]:` chain. No library needed for this half; the
  framer-motion half is already there.
- **Reduced motion**: colour and border still change (they are the selected
  state, and the `peer-focus-visible:ring-2` must stay intact); the icon scale
  drops to none via the page's own `SIGNUP_MOTION_CSS` block, and `swapMotion`
  already returns `{}`. The label's new text simply appears.
- **Perf**: `border-color` and `background-color` are paint-only on a 2-up grid;
  the icon `scale` is a 24px transform. No reflow — both cards keep their box,
  and the comment at `:369` records that this is deliberate: transforms do not
  affect layout, so the row's text never moves.

### 72. Inline errors that do not shake, and one that celebrates

- **Where**: `/signup` — the per-field error paragraphs at
  `src/pages/SignupPage.tsx:667-673` and the sibling blocks for email, password
  and confirmation, written by `validateField` on **every keystroke** (`:216`),
  plus the "Passwords match" line. Same pattern at
  `ForgotPasswordPage.tsx:141-143` and `ResetPasswordPage.tsx:208-210,254-256`.
- **Already built**: the error half ships, and correctly. Each error `<p>` is a
  keyed `motion.p` inside `<AnimatePresence initial={false}>` (`:667-673`), using
  `errorMotion` (`:315-322`): `initial { opacity: 0, y: -4 }`, `animate
  { opacity: 1, y: 0 }`, `exit { opacity: 0, y: -2 }` on `transitionBase`. No
  shake, which is the point — `validateField` fires on keydown, so "Passwords
  don't match" appears the instant the first character of the confirmation is
  typed, and shaking the field for an error that is usually about to be resolved
  by the next keystroke is a punishment for typing.
- **Motion**: what remains is the positive counterpart. "Passwords match" should
  earn more than an error does: `opacity 0 → 1`, `translateY(4px) → 0` **and**
  its `Check` icon scaling `0.6 → 1` over 220ms on `EASE_SPRING`. The user
  understands the difference between "keep going" and "this one is done". Note
  the file's own header comment at `:36` already names this as one of the two
  moments worth marking.
- **Timing**: error 160ms `cubic-bezier(0.16, 1, 0.3, 1)` (as shipped, via
  `transitionBase`); border colour 160ms same curve — currently
  `transition-colors` with no duration, so this is nearly a no-op and can be
  left alone if the 10ms is not worth the diff; match line 220ms
  `cubic-bezier(0.34, 1.56, 0.64, 1)`.
- **Build**: framer-motion for the match line, matching the shape of
  `errorMotion` rather than reaching for `tailwindcss-animate` on a page that
  already has a presence tree open for exactly this.
- **Reduced motion**: `errorMotion` already collapses to `{}`; give the match
  line the same branch. The text still appears and the border still turns red;
  only the 4px slide and the icon pop are removed.
- **Perf**: `transform` + `opacity`, but flag the real cost honestly — mounting
  an error `<p>` under a field pushes every field below it down by ~24px, and
  there is no transition on that reflow. It is a genuine layout shift on a form
  that validates per keystroke. If it becomes objectionable, reserve the line's
  height with `min-h-[1.25rem]` on the error slot rather than animating the
  shift; do not animate the container's height on a per-keystroke event.

### 73. Two confirmation panels, and the 3-second exit nobody sees coming

- **Where**: `/forgot-password`, `isEmailSent` panel at
  `src/pages/ForgotPasswordPage.tsx:91-112`; `/reset-password`, `isSuccess`
  panel at `src/pages/ResetPasswordPage.tsx:148-160` — which then calls
  `signOut()` and `navigate("/login")` from a `setTimeout` at `:105-108`, 3000ms
  later, with nothing on screen saying so.
- **Motion**: Both panels replace a form with a centred tick in one frame. Stage
  the entry so the eye lands in reading order: (1) the icon circle
  (`ForgotPasswordPage.tsx:93-95`, `ResetPasswordPage.tsx:150-152`) scales
  `0.6 → 1` over 380ms; (2) the `h2` and body copy rise `translateY(8px) → 0`
  with `opacity 0 → 1` starting at 140ms; (3) the actions last, at 280ms. On
  `/reset-password` add the missing piece — a 2px rule under the "Go to login"
  button depleting `scaleX(1) → scaleX(0)` over exactly the 3000ms the
  `setTimeout` runs. The user understands they are about to be moved *and signed
  out*, instead of having the page change under them mid-sentence.
- **Timing**: icon 380ms `cubic-bezier(0.34, 1.56, 0.64, 1)`; text stages 260ms
  `cubic-bezier(0.16, 1, 0.3, 1)` with a 140ms stagger; the redirect rule 3000ms
  `linear`, started in the same effect that arms the timeout so the two cannot
  drift.
- **Build**: CSS/Tailwind for the entrance (`animate-in fade-in-0
  slide-in-from-bottom-2` with `delay-150` / `delay-300` on the two later stages
  — `tailwindcss-animate`, `tailwind.config.ts:158`). The countdown rule is a
  single `transition-transform duration-[3000ms] ease-linear` toggled by a
  `useState` flipped in the same `useEffect`. Neither of these two pages imports
  framer-motion today and neither needs to: these panels never animate *out*,
  they navigate away.
- **Reduced motion**: `motion-reduce:animate-none` on all three stages — the
  tick, the heading and the button appear together, instantly. The countdown
  rule keeps its 3000ms `transition` even under reduce, because it is a timer and
  removing it would leave the user with no warning at all; if that is judged too
  strict, replace it with a static "Redirecting in 3 seconds" line, but do not
  simply delete it.
- **Perf**: `transform` + `opacity` throughout; the countdown is `scaleX` on a
  composited 2px layer. Note the panel swap itself changes the centred column's
  height (form → short panel) and that reflow is not animated in this case —
  deliberately, since the user's next action is elsewhere on the page.

### 74. /auth/callback: a page that is 100% waiting

- **Where**: `/auth/callback`, `src/pages/AuthCallbackPage.tsx:105-131` —
  `loading` (`:108-113`), `success` (`:114-121`), `error` (`:122-130`). The
  success state holds for 1500ms before `navigate` (`:75,80-88`); the error
  states hold 3000ms (`:21,40,47,92,98`).
- **Motion**: This is where a magic-link click lands, and it currently offers a
  48px `Loader2` on `animate-spin` (`:110`) against a bare background. Two
  changes. (1) The `loading` → `success` transition: the spinner scales
  `1 → 0.8` and fades out over 150ms, then the emerald tick circle (`:116-118`)
  scales `0.7 → 1` over 320ms in its place, and `message` crossfades in 200ms —
  the user understands the check that just completed *succeeded*, rather than
  seeing one round green thing replaced by another. (2) The `success` state's
  1500ms dead wait gets the same depleting 2px rule as case 73, and the `error`
  state's 3000ms one too, under the "Redirecting to login..." line already at
  `:128`. Landing here from an email client is the most disorienting entry point
  in the app; a page that visibly counts down is a page that has not hung.
- **Timing**: spinner out 150ms `cubic-bezier(0.16, 1, 0.3, 1)`; tick in 320ms
  `cubic-bezier(0.34, 1.56, 0.64, 1)`; message 200ms
  `cubic-bezier(0.16, 1, 0.3, 1)`; the rules 1500ms / 3000ms `linear`, matching
  the real `setTimeout` values exactly — if either is retimed, both must move
  together.
- **Build**: CSS/Tailwind. The three states are already mutually exclusive JSX
  branches; `animate-in fade-in-0 zoom-in-95 duration-300` on the success and
  error blocks plus `animate-out fade-out-0 zoom-out-95 duration-150` on the
  spinner covers it via `tailwindcss-animate` (`tailwind.config.ts:158`).
  framer-motion would buy an exit animation this page does not need — it
  navigates away rather than unmounting into another state.
- **Reduced motion**: `motion-reduce:animate-none` on the state blocks, and the
  spinner's `animate-spin` (`:110`) swapped for a static `Loader2` at 60% opacity
  beside the existing message text — that `animate-spin` is uncovered by
  `index.css:619-630` today and is the most aggressive motion on any auth route.
  The countdown rules keep their linear transition for the same reason as case
  73. Add `role="status" aria-live="polite"` to the message paragraph while here
  — the state change is currently announced to nobody.
- **Perf**: `transform` + `opacity` only; the whole page is one centred
  `text-center` block with at most three children, so even the swap costs nothing
  measurable. The countdown rule is `scaleX` on a composited layer, one
  transition per page visit.

---

## 10. Owner dashboard & earnings

Scope: the five owner screens where an owner reads money and commitments —
`/owner/bookings` (`src/pages/owner/OwnerBookingsPage.tsx`), `/owner/earnings`
(`src/pages/owner/OwnerEarningsPage.tsx`), `/owner/analytics`
(`src/pages/owner/OwnerAnalyticsPage.tsx`), `/owner-dashboard`
(`src/pages/owner/OwnerOverviewPage.tsx`) and the calendar-sync pair
`/owner/integrations` + `/owner/integrations/callback`. All five are mounted
behind `ProtectedRoute` + `RequireRole role="owner"` in `src/App.tsx:183-196`
and all five render inside `src/components/owner/OwnerLayout.tsx`.

**`OwnerOverviewPage` is the one owner page with motion already.** It imports
`motion` and `useReducedMotion` (`:3`) plus `easeOutExpo` (`:22`), wraps `Card`
as `MotionCard` (`:50`), staggers the four stat cards through `statVariants`
(`:74-78`, `STAT_STAGGER_STEP = 0.05`), staggers the activity feed rows through
`feedVariants` with a cap (`:80-91`, `FEED_STAGGER_CAP = 8`), and ships a
`useCountUp` helper (`:93-160`) already driving four figures (`:168-171`). Its
docstring records the two decisions worth keeping: the last frame assigns
`target` itself rather than a rounded interpolation, "a count-up that settled on
its own approximation would be a dashboard quietly reporting the wrong revenue";
and the tween starts from whatever is currently displayed, so a react-query
refetch animates the difference instead of dropping to zero and climbing back.
No other owner page imports framer-motion yet.

**Reduced motion, honestly.** `src/lib/motion.ts:6-8` claims reduced motion is
"already honoured" without a `<MotionConfig>`. Do not build new owner motion on
that assumption: framer-motion only auto-degrades when `MotionConfig
reducedMotion` says so, and no owner page wraps anything. Every case below gates
explicitly on `useReducedMotion()`, as `OwnerOverviewPage.tsx:110,162` already
does, and every CSS-side fallback belongs in the existing block at
`src/index.css:619-630`.

**recharts** `^2.15.4` drives both charts. Chart colours are already tokens
(`CHART_COLORS` at `OwnerAnalyticsPage.tsx:19-25` → `--chart-1..5`,
`index.css:102-106` / `:211-220`), so nothing below needs to name a hex.

### 75. Filtering the bookings table narrows a list, it does not reload one **[HIGH IMPACT]**

- **Where**: `/owner/bookings` — `src/pages/owner/OwnerBookingsPage.tsx:85-97`
  (the `filteredBookings` computation driven by `searchQuery`,
  `selectedVenueId`, `statusFilter`) and the `<TableBody>` it feeds at
  `:232-283`.
- **Motion**: rows dropped by the filter fade `opacity 1 → 0` and slide
  `translateX(0 → -8px)`; rows that survive slide to their new row position
  instead of teleporting; rows newly admitted enter `opacity 0 → 1`,
  `translateY(6px → 0)` with **no** stagger — a filter result is one set, not a
  sequence, and staggering it would imply arrival order that does not exist.
  (Contrast the activity feed on `/owner-dashboard`, which *is* chronological and
  therefore does stagger, capped at 8.) What the owner understands: the four
  summary cards above (`:112-147`) are computed from `allBookings` and
  `analytics`, and deliberately never respond to the filter. With nothing moving,
  "Total Bookings 63" sitting over a four-row table reads as a contradiction and
  the owner re-checks their filters. Watching 59 rows leave makes the 63 read as
  *of* 63.
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

### 76. The clicked row stays marked while the drawer is open

- **Where**: `/owner/bookings` — the row at `OwnerBookingsPage.tsx:234`
  (`cursor-pointer hover:bg-muted/50`) and its View button at `:273-279`, which
  sets `selectedBooking` and opens
  `src/components/owner/schedule/BookingDetailDrawer.tsx` (a shadcn `Sheet`,
  `side="right"`). Same pairing on `/owner-dashboard` via the activity feed rows
  at `OwnerOverviewPage.tsx:380-403`, whose drawer is mounted at `:539`.
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

### 77. Revenue bars grow from the axis, so height reads as magnitude

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
  `index.css:619-630`, since `Skeleton` is used on ten screens (and see case 7,
  which replaces the pulse outright).
- **Perf**: recharts animates the SVG `height`/`y` attributes, not `transform`
  — every frame is a layout + paint inside the SVG. Fine for 6 rects at 250px
  tall; it would not be for a 30-day series, so do not reuse this treatment if
  the range picker ever ships. `ResponsiveContainer` re-measures on resize, so
  key the chart on data identity rather than width or the animation replays
  every time the sidebar collapses at the `lg` breakpoint.

### 78. The donut sweeps once, then hover isolates the wedge the tooltip means

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

### 79. Occupancy fills to its figure; the month-over-month claim lands after it

- **Where**: `/owner-dashboard` — `src/pages/owner/OwnerOverviewPage.tsx:515-519`
  (the "This Week" `<Progress value={analytics?.occupancyRate || 0} className="h-2" />`)
  and `:289-298` (the change `<Badge>` produced by `changeOf()` at `:209-217`).
- **Already built, partially**: the *figure* half ships — `occupancyCount` is one
  of the four `useCountUp` values (`:171`), and the stat cards arrive on
  `statVariants` with a 50ms stagger (`:74-78`). What is not built is the bar and
  the badge's separate landing.
- **Motion**: the progress indicator slides
  `translateX(-100%) → translateX(-(100 − occupancyRate)%)` on first data
  arrival only, not on every background refetch. Separately, each stat card's
  value paints immediately while its change badge arrives 180ms later with
  `opacity 0 → 1` and `translateX(6px → 0)`. What the owner understands: the
  figure and the comparison are two assertions, not one string. The code
  comment at `:63-72` records that these badges used to be hardcoded `+12%`
  literals; now they are real month-over-month, and `title="Compared with last
  month"` is the only thing saying so. Landing the badge separately is the
  visual half of that sentence.
- **Timing**: progress 640ms `cubic-bezier(.16,1,.3,1)`; badge 200ms
  `cubic-bezier(.16,1,.3,1)` at a 180ms delay. A negative change gets the same
  curve as a positive one — no `--ease-spring` overshoot on a number that means
  the owner lost revenue.
- **Build**: CSS/Tailwind for the bar. `src/components/ui/progress.tsx:22-24`
  already sets `style={{ transform: translateX(-${100 - value}%) }}` with a bare
  `transition-all` and no stated duration, so it currently animates at
  Tailwind's 150ms default and transitions colour and shadow along with it. Pass
  `transition-transform duration-[640ms] ease-[cubic-bezier(.16,1,.3,1)]` at the
  call site (`:519`), not inside `progress.tsx` — case 70 needs a different
  number on the same component. The badge can reuse `statVariants`' shape as a
  third variant rather than the CSS `animate-fade-in` keyframe.
- **Reduced motion**: `prefersReduced` (`:162`) already gates the card stagger
  and `useCountUp` (`:110`). For the bar, add to `index.css:619-630` —
  `[role="progressbar"] > * { transition: none }` — Radix's `Progress.Root`
  carries that role and the indicator is its only child, so the bar paints at
  its final width. Both figures are text and remain readable with neither
  running.
- **Perf**: `translateX` on the indicator is compositor-only; the badge is
  opacity + transform. Never animate the indicator by `width`: that reflows the
  card on every frame. `Progress` is used in ten places per the comment at
  `progress.tsx:12-19`, so any retiming written *inside* that file is a shared
  change — check password strength (case 70) and listing health before shipping
  one.

### 80. The balance leaves the figure the owner last saw

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
- **Build**: the `useCountUp` helper at `OwnerOverviewPage.tsx:93-160` already
  implements the two hard parts — tween from the currently displayed value, and
  assign the exact target on the last frame — so lift it to a shared hook rather
  than writing a second one. It returns a number, so wrap `formatAmd()` around
  the result at render; do not interpolate the formatted string. `tabular-nums`
  is already on the element, which is what holds the glyph advance steady while
  it counts.
- **Reduced motion**: `useCountUp` already returns `target` immediately under
  `prefersReduced`. Either way, the counting span must be `aria-hidden` with a
  visually-hidden sibling carrying the final value in an `aria-live="polite"`
  region — thirty per-frame text updates read aloud is worse than no
  announcement.
- **Perf**: one text node repainting ~30 times over 520ms, no layout because
  `tabular-nums` fixes the advance width. Keep it inside the existing
  `CardHeader` so the card's height cannot change mid-count; a height change
  would push the whole `lg:grid-cols-3` row at `:130`.

### 81. Only the payout that is actually in flight moves

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
- **Reduced motion**: in `index.css:619-630`, `.payout-inflight { animation:
  none; background-image: none; }`. The state survives intact — the warning
  tone keeps its own audited colour pair (`border-warning/20 bg-warning/10
  text-warning`) and the `title` attribute at `:280` already carries
  `payoutStatusDescriptor(...).hint`, the full sentence.
- **Perf**: `background-position` is paint-only, not composited. Scoped to a
  ~90×22px badge that repaints continuously — acceptable at that size, and
  bounded because the query at `:76-89` is `.limit(20)`. Do not extend the
  gradient to the whole `<TableRow>`: that repaints the date, status and amount
  text every frame.

### 82. Switching payout method re-labels the field you already typed in

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
  which CSS transitions cannot bridge. This is the same shape as the keyed
  `motion.span` already shipping on `/signup` (`SignupPage.tsx:649`); copy that
  pattern rather than inventing one. The ring is a Tailwind class toggled for
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

### 83. Calendar sync: leaving for the provider, and the timed return

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

---

## 11. Games, teams & community

Scope: the seven real routes declared in `src/App.tsx:153-174` —

```
/games                 src/pages/GamesPage.tsx                      (public)
/community             src/pages/CommunityPage.tsx                  (public)
/game/:id              src/pages/GameDetailsPage.tsx                (public)
/game/:id/join-status  src/features/booking/GameJoinStatusPage.tsx  (protected)
/teams                 src/pages/TeamsPage.tsx                      (public)
/create-team           src/pages/CreateTeamPage.tsx                 (protected)
/team/:id              src/pages/TeamDetailsPage.tsx                (public)
```

**Real state.** Nothing below invents a state the app does not already render:
`GamesPage.tsx:312` `viewMode "grid" | "map"`; `:641` FilterChips, 0–4 chips,
each individually removable; `GameDetailsPage.tsx:531-625` the five-way join
panel (`isCancelled | isHost | isParticipant | isPendingParticipant | default`),
`:398-454` the host-only pending queue, `:457-491` the confirmed roster;
`TeamCard.tsx:26-33` `fill` (0–1), `isFull`, `rosterLabel`; `TeamForm.tsx:62`
`isGeneratingLogo`.

`GamesPage` is a framer-motion page (`:4-6`) with the same results-region shape
as `/venues`: `<AnimatePresence mode="wait">` at `:652` over skeleton, map, grid,
error and empty branches, with `skeletonMotion` / `gridMotion` / `cardMotion` at
`:411-425`. `GameDetailsPage`, `TeamsPage`, `TeamCard` and `TeamForm` do not
import it, so cases reaching for it there add the first use in that file — weigh
that against the CSS option each time.

### One thing to fix before cases 84 and 85

`useGames` keys on the filter object itself — `queryKey: ["games", filters]`
(`src/hooks/useGames.ts:71`) — with no `placeholderData`, and `GamesPage.tsx:325`
passes `search: searchQuery || undefined` straight from the input's `onChange`
(`:463`) with no debounce. So typing `bas` mints three cold query keys, and each
one puts `isLoading: true` back on the page, which tears the grid down and
replaces it with six skeletons. Per keystroke. The `AnimatePresence` now in place
animates that strobing rather than fixing it. Debounce the search term into the
query key (250ms, the same `--dur-base` everything else uses) and add
`placeholderData: (prev) => prev` so the previous rows stay on screen while the
next set resolves. `isFetching` is already destructured at `:321` and ready to
drive case 84.

### 84. The grid answers the filter, instead of being replaced by one

- **Where**: `/games` → `src/pages/GamesPage.tsx` — result region `:652-718`,
  the count line above it, `useGames(...)` call `:322-330`.
- **Already built, partially**: the branch swap and the capped card stagger ship
  — `cardMotion(index)` on each keyed `motion.div` (`:424-425, 691-693`) and the
  same two source comments as `/venues` explaining `initial: false` on the
  skeletons and the deliberate absence of `initial={false}` on `AnimatePresence`
  (`:409-420`). What is missing is the *in-flight* state, which needs the
  `placeholderData` fix above.
- **Motion**: with `placeholderData` in place, `isFetching && !isLoading` is
  true while the new set resolves. During that window the grid container drops
  to `opacity: .5` and the count line above it (`{games.length} games looking
  for players`) drops to `opacity: 0`. When the new array lands, the count line
  returns to 1 and the existing card stagger runs. What the user understands:
  the rows in front of them are the answer to the filter they just changed, and
  the answer has finished arriving. Right now a filter change and a slow network
  are indistinguishable — both look like "the page is the same", or, worse, both
  look like a full teardown.
- **Timing**: dim out 120ms `cubic-bezier(.4,0,1,1)`; cards in 260ms
  `cubic-bezier(0.16,1,0.3,1)` (`--ease-out-expo`) with the existing 30ms
  stagger capped at eight — cards nine onward appear at their final state,
  because a 40-result stagger is a 1.2-second wait for the bottom of the list.
- **Build**: CSS/Tailwind for the dim — one class toggled off `isFetching`, no
  new dependency for a single opacity change on a container framer-motion is
  already inside.
- **Reduced motion**: `cardMotion` already returns `{}` under `prefersReduced`.
  Keep the opacity dim even then: it is a 120ms fade with no transform and it is
  the only thing telling a user their filter is still in flight. Fading is not
  the class of motion `reduce` is about.
- **Perf**: opacity and transform only. The stagger cap matters — an
  uncapped delay on 40 cards keeps 40 elements on the compositor for
  1.2s. No layout properties touched.

### 85. Grid and map are one set of games, not two pages

- **Where**: `/games` → `ToggleGroup` at `GamesPage.tsx:627-634`, branch at
  `:668-696`, map component `src/components/games/GamesMapView.tsx:41-98`.
- **Already built, partially**: both branches now live inside the same
  `<AnimatePresence mode="wait">`, the map as a keyed `motion.div` with
  `mapMotion` (`:669-671`), so the crossfade exists. The **height** does not.
- **Motion**: the map container is a fixed `height: "600px"`
  (`GamesMapView.tsx:43`); the grid is whatever six-to-forty cards need. Today
  the toggle swaps one for the other and the page height jumps by a screen or
  more, so the scroll position lands somewhere unrelated. Fix the results region
  to the outgoing view's measured height, keep the existing crossfade — grid out
  140ms, map in 200ms starting at 60ms so the two overlap — then animate the
  container height to the incoming view's height over 260ms and release it to
  `auto`. What the user understands: these are the same games, redrawn — not a
  navigation. The overlap is what carries that; a hard cut reads as a page
  change.
- **Timing**: out 140ms `cubic-bezier(.4,0,1,1)`; in 200ms `--ease-out-expo`
  delayed 60ms; height 260ms `--ease-out-expo`.
- **Build**: framer-motion — a `motion.div` wrapper with `layout` around the
  existing `AnimatePresence`. Doing this in CSS needs the incoming height before
  it is rendered, which means measuring it yourself; that is the thing `layout`
  exists to stop you writing.
- **Reduced motion**: `mapMotion` and `gridMotion` already collapse to `{}`;
  pass `layout={!prefersReduced}` on the wrapper so the height snaps too. Keep
  one concession that is not motion: `scrollIntoView({ block: "start", behavior:
  "auto" })` on the results heading after the swap, so a 600px height change does
  not leave the user staring at the footer.
- **Perf**: the crossfade is opacity only. The height animation is the flagged
  risk — animating `height` triggers layout on every frame, and inside it sits a
  Google Maps canvas that reflows with its container. Mitigate by animating
  height on the *wrapper* while the map keeps its fixed 600px, so only one
  element relayouts and the map never sees an intermediate size.

### 86. The join panel is five screens in one slot

- **Where**: `/game/:id` → `src/pages/GameDetailsPage.tsx` — the sticky sidebar
  card `:496`, its title `:503`, the spots badge `:504-506`, and the action
  block `:531-625`, which is a five-way ternary: `isCancelled` → `isHost` →
  `isParticipant` → `isPendingParticipant` → default.
- **Motion**: on a free game, pressing "Request to Join" resolves
  `requestToJoin` (`src/hooks/useGames.ts:306`), which invalidates `["game", id]`
  (`:349`); the refetch flips `isPendingParticipant` and the button is
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
  the card body wrapped in a `layout` motion.div for the height — the same shape
  as `/login`'s three-branch slot (case 66), which is worth copying rather than
  re-deriving. `mode="wait"` is what buys the clean 130ms/220ms sequence; CSS
  would need both blocks mounted and absolutely positioned, which breaks the
  sticky card's height.
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

### 87. Pay & Join: the last frame before the bank

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
  this page. This is case 57's argument applied to the one other place in the
  app where a confused second click is a second payment.
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

### 88. Approve moves a person into the squad **[HIGH IMPACT]**

- **Where**: `/game/:id` → `GameDetailsPage.tsx` — pending queue `:398-454`
  (host only), confirmed roster `:457-491`, handler `handleApprove` `:193-204`,
  mutation `useApproveParticipant` (`src/hooks/useGames.ts:385-416`).
- **Motion**: this is the same person rendered twice, sixty pixels apart, by two
  different loops — avatar plus name in a pending row at `:413-449`, avatar plus
  name in a roster tile at `:472-485`. Approving invalidates `["game", id]`
  (`useGames.ts:378`) and on refetch the row disappears from one list and a tile
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
- **Why this one**: it is the only case in this section that changes what the
  user *believes* rather than how smoothly they see it. `/games`, `/teams` and
  `/create-team` are browse and form surfaces where motion improves comprehension
  at the margin; the approve action is the product's core transaction — a host
  deciding who plays — and it currently renders as two unrelated lists changing
  at once. Making the person visibly move from the request queue into the squad
  is the difference between "the data updated" and "I just let someone into my
  game", and the `layoutId` that does it is roughly fifteen lines across two
  existing loops.

### 89. The roster meter fills from where it was

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
  `TeamsPage` renders up to nine of these at once. `scaleX` is composited. It is
  the same defect the gallery dot rail already fixed (case 37) — flag the
  pattern anywhere else it appears before copying it.

### 90. The logo slot exists before the logo does

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

### 91. The team you just made is already there

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

## 12. Empty states, errors & micro-interactions

Scope: the app-wide feedback layer rather than any one route — the two toasters
mounted at `src/App.tsx:131-132`, the shared `Button` at
`src/components/ui/button.tsx`, `Switch` at `src/components/ui/switch.tsx`, the
`.focus-ring` utility at `src/index.css:418-420`, the two "nothing / broken"
panels (`src/components/ui/empty-state.tsx`,
`src/components/common/StatusPanel.tsx`), the route-level crash screen
(`src/components/common/RouteErrorBoundary.tsx`) and `/*` →
`src/pages/NotFound.tsx` (`src/App.tsx:250`).

Nothing here is a route-specific idea. These components render on almost every
one of the ~60 routes declared in `App.tsx:146-250`, which is the argument for
treating them as one system.

**Two toasters, both mounted, both live** — `src/App.tsx:131-132`:

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

### 92. The toast is the app's whole answer to "did that work?" **[HIGH IMPACT]**

- **Where**: every route. `src/components/ui/sonner.tsx:10-42`, mounted at
  `src/App.tsx:132`. Representative call sites:
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
  motion, not no feedback. Case 64 proposes a blanket
  `transition: none !important` on the same selector; this rule supersedes it.
- **Perf**: `transform` + `opacity` for everything added here. Flag inherited
  from sonner, not introduced here: its base transition includes `height 400ms`,
  which is a layout-animated property on every toast that stacks or collapses.
  Leave it — overriding sonner's height animation breaks its stack maths — but
  do not add a second height-animated element inside the toast.
- **Why this is the strongest case**: it is the only motion in the app that
  fires from 55 different modules, it is the sole confirmation channel for
  bookings and payments, and the fix is confined to one file's `classNames` map.

### 93. Two toasters, two corners, two curves

- **Where**: `src/App.tsx:131-132`. The Radix stack —
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
  Radix call sites through sonner and drop `<Toaster />` from `App.tsx:131`, so
  that "the app told me something" has one arrival, one corner, one curve.
  Until that lands, at minimum pin the Radix viewport to `bottom-0 right-0` at
  all breakpoints and swap `slide-in-from-top-full` for
  `slide-in-from-bottom-full` in `toast.tsx:26`, so the two at least agree about
  which edge messages come from.
- **Timing**: If reconciled to sonner, this case has no timings of its own — it
  inherits case 92. If kept, match Radix to it: `duration-[400ms]
  ease-[cubic-bezier(0.16,1,0.3,1)]` on open, `duration-200` on close, replacing
  `tailwindcss-animate`'s defaults.
- **Build**: Neither CSS nor framer-motion — a deletion. Three imports change
  from `@/hooks/use-toast` to `sonner`, one mount goes, and
  `ui/toast.tsx` + `ui/toaster.tsx` + `hooks/use-toast.ts` become dead code.
  Cheapest motion fix in this document.
- **Reduced motion**: falls out for free once there is one toaster — it inherits
  the opacity-only override from case 92. If the Radix stack survives, its
  `animate-in`/`animate-out` classes need the same `@media (prefers-reduced-motion:
  reduce)` treatment, which they do not currently have anywhere in `index.css`.
- **Perf**: `transform`/`opacity` only, both stacks. No risk either way; the
  cost of keeping both is bundle weight (`@radix-ui/react-toast` stays) and user
  confusion, not frames.

### 94. A button entering its pending state changes two things at two speeds

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
  solve a problem a `min-width` solves. Note that narrowing `transition-all` is
  also what case 95 needs, and case 71 separately relies on the `active:scale`
  and `peer-data-[state=checked]` chains surviving — keep `transform` in the
  list.
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

### 95. The focus ring should appear, not fade in

- **Where**: `src/components/ui/button.tsx:8` — the same base string carries
  `transition-all duration-200` and `focus-visible:ring-2 focus-visible:ring-ring
  focus-visible:ring-offset-2`. Every `Button` in the app, on every route.
- **Motion**: Tailwind implements `ring-2` as `box-shadow`. `transition-all`
  transitions `box-shadow`. So focusing a button interpolates the ring from
  transparent to `--ring` (`151 90% 47%` in the shipped dark theme,
  `index.css:200`) over 200ms — the indicator arrives *after* the focus does,
  and a user tabbing at speed through a form runs ahead of their own ring. The
  correct motion here is none: the ring must be at full strength on the frame
  focus lands. Excluding `box-shadow` from the transition list (see case 94's
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

### 96. A switch that moves but has not saved anything

- **Where**: `/profile` → `src/features/profile/NotificationsTab.tsx:70-76`
  (four `Switch`es) and the "Save Preferences" button at `:79-88`. Component:
  `src/components/ui/switch.tsx:12,20`.
- **Motion**: The thumb already translates 20px (`translate-x-5` — track `w-11`
  44px, less `border-2` ×2, less thumb `w-5` 20px) in Tailwind's default
  `transition-transform` 150ms `cubic-bezier(0.4, 0, 0.2, 1)`, with the track
  colour crossfading to `--primary` under `transition-colors`. That reads as
  "done". It is not done: `onCheckedChange` only calls `setNotifications`
  (`:72-74`) and nothing persists until the button below is pressed. So four
  switches can sit in a state the server has never heard of, looking exactly
  like four saved switches. Motion is where to say so. On the first change, the
  Save button — which is static and easy to miss under a `Separator` — rises
  `translateY(6px) → 0` with `opacity 0.55 → 1` and its label changes to
  "Save 2 changes"; each subsequent toggle re-runs a 1px settle on it. Nothing
  about the switch itself changes, because the switch is telling the truth about
  the *control*; the button is what has to say the *record* is behind. On
  successful save (`useProfileSettings.ts:134`), the button returns to
  `opacity 0.55` in 250ms as the sonner toast arrives — two channels, one fact.
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

### 97. The empty state arrives as one thought, in order

- **Where**: `src/components/ui/empty-state.tsx:63-127`, rendered at
  `src/pages/MyBookingsPage.tsx:157-163` ("No bookings yet" → "Find a venue"),
  `src/pages/GamesPage.tsx:702-716`, `src/pages/TeamsPage.tsx`,
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
  `HomePage`, so this adds no bytes to any route. Note that on `/venues` and
  `/games` the empty branch is already inside an `AnimatePresence`
  (`DiscoverPage.tsx:867`, `GamesPage.tsx:702`) with `panelMotion` on the
  wrapper — this case adds the *internal* stagger, and the two must not both
  animate the same node.
- **Reduced motion**: `useReducedMotion()` → render without the `variants` props,
  matching the `prefersReduced ? {} : {...}` shape every other animated page in
  this repo uses. The measurement recorded at `src/lib/motion.ts:3-20` (17
  elements staged at `no-preference`, 0 at `reduce`) says framer resolves
  entrances to their final state anyway, but gate it explicitly rather than
  depending on that measurement continuing to hold.
- **Perf**: `transform` + `opacity` only. Both are composited; a four-child
  stagger on a mounting panel has no layout implications because the panel's
  height is fixed by `py-12`/`py-16` before any child animates
  (`empty-state.tsx:67`).

### 98. A failed request and an empty shelf must not arrive the same way

- **Where**: `src/components/common/StatusPanel.tsx:37-62` (the shared shell,
  `tone: "neutral" | "danger" | "positive"`) and
  `StatusPanel.tsx:75-104` (`ErrorPanel`, which is `tone="danger"` + `WifiOff` +
  a retry button). Live on `/venue/:id`, `/my-bookings`, `/games`, `/messages`,
  `/team/:id`, `/blog/:slug`, `/owner/*` — 23 files import one of the two.
- **Motion**: The component exists precisely because these two facts kept
  getting merged — the docstring records pages rendering "Venue not found" when
  the venue was fine and only the request had failed. The rendering is now
  separate; the *arrival* is not. Split it. **Empty** (`tone="neutral"`) uses
  case 97's staggered rise: unhurried, finished, nothing wrong. **Error**
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
  place all call sites pass through. No JS, because these panels render on
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

### 99. The 404 should be the first thing seen, not the second

- **Where**: `/*` → `src/pages/NotFound.tsx:29-42`, mounted at `App.tsx:250`.
  `NotFound` is `lazy()` (`App.tsx:60`) inside the `Suspense` whose fallback is
  the full-screen spinner at `App.tsx:112-116`.
- **Motion**: Following a dead venue link today gives you a centred spinner on
  `bg-background`, then — cut, no transition — a compass and "We can't find that
  page". The spinner is a lie about a page that is already decided: nothing is
  being fetched, only a chunk. Two changes. (a) Delay the `PageLoader`'s own
  appearance: it renders at `opacity 0` and animates to `1` starting at 250ms,
  so a chunk that loads in 80ms — the common case for a warm cache — shows no
  spinner at all and the 404 panel is the first frame. This is the same fix as
  case 4 and should be one implementation, not two. (b) When the panel does
  follow a visible spinner, hand over instead of cutting: spinner
  `opacity 1 → 0` over 120ms, panel `opacity 0 → 1` with `translateY(8px) → 0`
  over 300ms, overlapping by 60ms. The compass icon (`NotFound.tsx:31`) rotates
  `-12deg → 0deg` across the same 300ms — a compass settling on a bearing, which
  is the one place in this app where an icon's own metaphor earns its motion.
  The two `Button`s (`NotFound.tsx:35-40`) come in on case 97's stagger, so
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
  delay). framer-motion for the panel, reusing `staggerChildren` from case 97
  so the 404 and every empty state in the app share one entrance. The Suspense
  boundary cannot cross-fade its fallback out without `AnimatePresence` around
  `<Routes>`, which is case 5's territory — the delayed loader gets ~90% of the
  benefit with none of that.
- **Reduced motion**: gate the panel and the compass rotation on
  `useReducedMotion()` alongside case 97's branch. The loader's delay is *kept*
  under `reduce` — a 250ms delay is not motion, it is a decision not to render —
  but its fade becomes instant via the
  `@media (prefers-reduced-motion: reduce)` block, where `animate-in` utilities
  need an explicit `animation: none`.
- **Perf**: `opacity` + `transform` (`rotate` is a transform) only. The 404 is
  inside `<Layout>` (`NotFound.tsx:25`) under a sticky glass header
  (`index.css:427-448`), so keep the animated subtree to the `StatusPanel` and
  never animate the container — a `backdrop-filter: blur(18px)` bar composited
  above a large animating element is the one combination in this app that
  reliably costs frames on mobile.

### 100. Retry has to look like it happened, even when it fails again

- **Where**: `src/components/common/RouteErrorBoundary.tsx:53-69` — the
  route-level crash screen, wrapping every route (`App.tsx:137`). The retry
  button is `RouteErrorBoundary.tsx:62`:
  `onClick={() => this.setState({ error: null })}`.
- **Motion**: If the child throws again — the likely outcome, since the docstring
  records a bad data shape reaching `AchievementsSection` and blanking the
  dashboard — React re-runs `getDerivedStateFromError` and the boundary renders
  the *identical* panel. Zero pixels change. The user has no way to tell whether
  the button did nothing, or did everything and failed. Give the attempt a
  visible duration and a visible outcome. On press: the button enters case 94's
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
  throttled. Explicitly **no shake, no horizontal displacement**: `/signup`
  already decided against shaking on validation error (case 72), the payment
  result screens decided against it too (case 62), and a crash screen is the
  worst place to reintroduce it.
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

## Implement these 12 first

The cases marked **[HIGH IMPACT]** across the twelve areas. They are the ones
where motion changes what the user *believes* rather than how smoothly they see
it — and, in four instances, where the fix is removing motion that lies.

| # | Case | Why it goes first |
| --- | --- | --- |
| 1 | Cold-boot-only splash gate | Deletes 2.3s of opaque sheet from every single page load, including deep links and payment returns; the largest motion defect in the app and among the cheapest to fix. |
| 8 | Splash-to-hero handoff | The entire hero choreography is already built and tuned, and 100% of it currently plays behind that overlay — pure recovered value, no new motion. |
| 22 | The slot grid demonstrates the promise | Converts the landing page's one differentiating claim from copy into evidence, using markup that already exists. |
| 29 | Result grid closes the gap when a filter is removed | The difference between a filter that reads as a query and one that reads as a page reload; the only `/venues` case that changes what the user believes about the data. |
| 35 | The clicked photo becomes the lightbox photo | On the screen where someone decides to spend money, "which photo am I looking at" stops being an open question. |
| 44 | Slot grid answers the date | The only place in the booking flow where identical pixels change meaning — without it, tapping Thursday looks like nothing happened. |
| 54 | Two-minute escalation | Marks a threshold crossing rather than a value change, on the timer that decides whether a held slot is paid for or lost. |
| 60 | Confirmation mark — draw, then settle | The one frame in the product where money has irreversibly left the account; 410ms of one SVG turns "did that go through?" into "that went through". |
| 66 | The /login panel is three screens in one slot | Highest-traffic signed-out surface, and the only place a user is silently signed out by a control labelled "Back". Already shipped; add direction. |
| 75 | Filtering the bookings table narrows a list | Summary cards deliberately ignore the filter, so a static repaint makes "Total Bookings 63" over four rows read as a contradiction. |
| 88 | Approve moves a person into the squad | The product's core transaction — a host deciding who plays — currently renders as two unrelated lists changing at once. ~15 lines of `layoutId`. |
| 92 | The toast is the app's whole answer to "did that work?" | Fires from 55 modules, is the sole confirmation channel for bookings and payments, and the entire fix lives in one file's `classNames` map. |

Suggested order within the twelve, if they ship one at a time: **92** (one file,
most-fired motion) → **1** and **8** together (they are one change to the boot
path) → **60** and **54** (the payment path, in the order the user meets them) →
**44** and **35** (the venue screen) → **29** and **75** (the two filtered lists,
sharing `layout="position"` machinery) → **66** and **88** (`AnimatePresence`
direction and `layoutId`, the two framer-motion primitives not yet used in the
app) → **22** last, since it is the only one on the marketing surface.

