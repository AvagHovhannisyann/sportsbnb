## Landing hero & above-the-fold

Scope: everything a visitor sees at `/` before the first scroll — the hero band,
the headline, the primary CTA, the proof card, and the search bar at the seam.

**Ground truth for this section**

| Thing | Where it actually lives |
| --- | --- |
| Route | `/` → `<Layout showMobileNav={false}><HomePage /></Layout>` — `/home/user/sportsbnb/src/App.tsx:145` |
| Hero markup | `/home/user/sportsbnb/src/pages/HomePage.tsx:143-277` |
| Search bar | `/home/user/sportsbnb/src/components/home/HeroSearch.tsx` |
| Splash overlay | `/home/user/sportsbnb/src/components/SplashScreen.tsx` (mounted from `App.tsx:123`) |
| CTA base styles | `/home/user/sportsbnb/src/components/ui/button.tsx:8` |
| Motion tokens | `/home/user/sportsbnb/src/index.css:135-140` |

`framer-motion@^12.34.3` **is** installed (`package.json` dependencies) and
`HomePage.tsx:11` already imports `motion` and `useReducedMotion`, so
framer-motion is a legitimate build target here. Remotion is not installed and
is not proposed anywhere below.

Motion primitives already declared in `/home/user/sportsbnb/src/index.css`:

```
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);
--dur-fast: 150ms;  --dur-base: 250ms;  --dur-slow: 400ms;
```

Plus a local constant in `HomePage.tsx:25` — `EASE = [0.22, 1, 0.36, 1]`, i.e.
`cubic-bezier(.22,1,.36,1)`. The existing `reveal` variant is
`{ opacity: 0, y: 24 } → { opacity: 1, y: 0 }` over `700ms`, staggered `70ms`
with a `50ms` lead-in (`HomePage.tsx:27-35`). Cases below extend that vocabulary
rather than inventing a second one.

The app ships dark-only (`<html lang="en" class="dark">` in `index.html`), so
`--primary: 151 90% 47%` — electric court green — is the accent every case
below refers to.

---

### 10. Splash-to-hero handoff **[HIGH IMPACT]**

- **Where**: `/` — `/home/user/sportsbnb/src/components/SplashScreen.tsx` and the
  hero block at `/home/user/sportsbnb/src/pages/HomePage.tsx:151-155`.
- **Motion**: Today the hero entrance **plays where nobody can see it**.
  `HomePage` is eagerly imported (`App.tsx:20`), so it mounts immediately;
  framer-motion fires `initial="hidden" → animate="visible"` at mount, and the
  whole stagger (`50ms` lead + 4 × `70ms` + `700ms` tail = **1.03s**)
  finishes long before `SplashScreen` starts its fade at `1800ms` and unmounts
  at `2300ms` (`SplashScreen.tsx:7-11`). The visitor's first frame of the hero
  is the *finished* state — a static page. Fix: hold the hero at `hidden` until
  the splash begins lifting, then run the existing stagger through the last
  `380ms` of the splash fade. What the user understands: the page is assembling
  itself *for them*, headline first, then the promise, then the button, then the
  proof — reading order made temporal. Right now they understand nothing,
  because they see no motion at all.
- **Timing**: Splash fade-out is `500ms` (`transition-opacity duration-500`,
  starting at `1800ms`). Start the hero stagger at **`1920ms`** — `120ms` into
  the fade, so the two overlap and the handoff has no dead frame. Children keep
  their current `700ms cubic-bezier(.22,1,.36,1)` with `70ms` stagger; last
  child lands at ≈`2.97s`. The image column keeps its `900ms` / `150ms` delay
  (`HomePage.tsx:227`) and is re-anchored to the same `1920ms` origin.
- **Build**: framer-motion. `SplashScreen` already owns the `fadeOut` boolean;
  lift it into a tiny context (`SplashProvider` around the tree in `App.tsx`)
  exposing `splashLifting: boolean`, then in `HomePage`:
  `animate={prefersReduced ? undefined : (splashLifting ? "visible" : "hidden")}`.
  Do **not** solve this with `delayChildren: 2.4` — it hardcodes one component's
  timer into another file, and it keeps firing after the splash logic changes.
- **Reduced motion**: unchanged from today's correct behaviour — `useReducedMotion()`
  returns true, `initial`/`animate` are passed as `undefined`, the hero renders
  in its final state with no gating at all. Additionally gate the splash itself:
  under reduced motion drop the `1800ms` hold to `0ms` and unmount immediately,
  so a reduced-motion visitor is not made to wait through an animation they
  opted out of. `SplashScreen.tsx:21` also uses `animate-pulse` and
  `animate-spin`, neither of which is covered by the
  `prefers-reduced-motion: reduce` block at `index.css:619-630` — add
  `motion-reduce:animate-none` to both.
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

---

### 11. Headline lands in two beats

- **Where**: `/` — the `motion.h1` at `/home/user/sportsbnb/src/pages/HomePage.tsx:166-173`.
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
  flatter than the shared `700ms cubic-bezier(.22,1,.36,1)` because the h1 is
  the largest object on the page — at `clamp(2.5rem, 5.2vw, 4.25rem)` the same
  duration reads sluggish on a 68px glyph.
- **Build**: framer-motion. Change the h1 from `variants={reveal}` to a local
  `headline` variant carrying `{ visible: { transition: { staggerChildren: 0.09 } } }`,
  with two `motion.span` children on `reveal`, `className="block"`, replacing the
  `<br />`. CSS can't do this cleanly — the lines need to inherit the parent's
  stagger position in the existing hero sequence, not run on their own clock.
- **Reduced motion**: `prefersReduced` already nulls `initial`/`animate` on the
  hero container (`HomePage.tsx:152-153`), so both spans render at final
  position with zero code. Keep `className="block"` on the spans unconditionally
  so the two-line layout is identical whether or not motion runs.
- **Perf**: `transform: translateY` + `opacity` only. Do **not** wrap each line
  in `overflow-hidden` for a mask-style reveal: `leading-[0.98]` on a
  `4.25rem` display face gives the box no descender room, and "Skip the call."
  has a `p` — the mask clips it for the length of the animation. If a mask
  reveal is wanted later, the clipping span needs `pb-[0.14em] -mb-[0.14em]`.

---

### 12. Primary CTA — arrow commits, button acknowledges

- **Where**: `/` — the "Browse venues" `Button asChild` at
  `/home/user/sportsbnb/src/pages/HomePage.tsx:185-190`, whose base classes come
  from `buttonVariants` in `/home/user/sportsbnb/src/components/ui/button.tsx:8`.
- **Motion**: Two separate signals on one control. (a) **Hover/focus**: the
  `lucide-react` `ArrowRight` slides `3px` right. The repo already does exactly
  this on the "See all venues" link — `group-hover:translate-x-0.5`
  (`HomePage.tsx:337`) — so the hero CTA is the *inconsistent* one, not the
  candidate for a new idea. The arrow moving toward the edge says "this leaves
  this page and goes to `/venues`", which distinguishes it from the ghost "List
  your venue" button sitting next to it. (b) **Press**: `active:scale-[0.98]` is
  already in `buttonVariants`, but it inherits `transition-all duration-200` —
  `200ms` for a press acknowledgement lands *after* the finger is gone and reads
  as lag. Tighten the press to `120ms` while leaving hover colour/shadow at
  `200ms`.
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

---

### 13. "Live availability" pill — one pulse rate for the whole app

- **Where**: `/` — the eyebrow pill at
  `/home/user/sportsbnb/src/pages/HomePage.tsx:157-163`.
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

---

### 14. Confirmation card lands after the photo settles

- **Where**: `/` — the `.glass` card at
  `/home/user/sportsbnb/src/pages/HomePage.tsx:243-258` ("Confirmed — Thursday,
  19:00 / Ararat Arena · 90 min · ֏12,000").
- **Motion**: Currently this card is a static child of the image column, so it
  arrives fused to the photo inside the same `scale(.97 → 1)` (`HomePage.tsx:225-227`).
  Give it its own beat: the photo settles first, *then* the card rises `12px`
  into place with the green check mark scaling up inside it. The comment in the
  source says the intent is "the product is shown, not described" — the card is
  a booking *result*. Separating it in time is what makes it read as an outcome
  of the photo rather than a label stuck on it: pitch → confirmed booking, in
  that order, which is the product's whole proposition in two frames.
- **Timing**: image column finishes at its existing `150ms + 900ms = 1050ms`
  (relative to hero start). Card: `opacity 0 → 1`, `translateY(12px → 0)`,
  **`460ms var(--ease-out-expo)`, delay `760ms`** — it begins while the photo is
  still settling and lands at `1220ms`, just after. Check icon:
  `scale(.7 → 1)` over `380ms var(--ease-spring)` = `cubic-bezier(.34,1.56,.64,1)`,
  delay `900ms`. The spring overshoot is used once, here, on the single glyph
  that means "confirmed".
- **Build**: framer-motion — the delays have to be expressed relative to the
  hero's entrance origin (see case 10), which is React state, not a CSS class.
  Wrap the existing `div.glass` as `motion.div` with an explicit
  `transition={{ duration: 0.46, ease: [0.16,1,0.3,1], delay: 0.76 }}`; the
  `Check` icon's wrapper (`HomePage.tsx:245-247`) becomes its own `motion.div`.
- **Reduced motion**: pass `initial`/`animate` as `undefined` under
  `prefersReduced` exactly as the sibling column already does at
  `HomePage.tsx:225-226` — card and check render in final position, full opacity,
  no delay. Every word stays readable; nothing is gated on an animation that
  never runs.
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

---

### 15. "N venues live" — the number counts up when it arrives

- **Where**: `/` — the conditional glass pill at
  `/home/user/sportsbnb/src/pages/HomePage.tsx:260-267`, fed by the Supabase
  count query in the `useEffect` at `HomePage.tsx:86-98`.
- **Motion**: This is the only genuinely live number above the fold — a
  `count: "exact", head: true` query against `venues` where `is_active`. It
  currently mounts from `null` to a rendered pill with no transition, so on a
  slow connection a hard-edged badge simply blinks into existence beside the
  photo, roughly a second after everything else stopped moving, and reads as a
  glitch. Give it a landing: fade in while dropping `6px`, then run the numeral
  from `0` to its real value. What the user understands: this figure was
  *fetched*, not printed into the page — it is the difference between a
  marketing number and a live one.
- **Timing**: pill `opacity 0 → 1` + `translateY(-6px → 0)` over
  **`320ms var(--ease-out-expo)`**. Numeral count-up starts at `+120ms`, runs
  `900ms`, eased `cubic-bezier(.16,1,.3,1)` so it decelerates into the final
  value instead of stopping dead. Cap the tick rate at ~30 updates regardless of
  the target so the count reads rather than blurs.
- **Build**: framer-motion for the pill (`motion.div`, one `AnimatePresence`-free
  mount transition); a small `requestAnimationFrame` loop for the numeral —
  framer-motion's `animate()` on a `MotionValue` also works and is fewer lines
  (`useMotionValue` + `useTransform(v => Math.round(v))`). Either is fine; the
  rAF version avoids adding a second animation runtime concept for one number.
- **Reduced motion**: under `prefersReduced`, render the pill at final opacity
  and position and print `venueCount` directly — no count-up, no fade. The
  number is information; it must never be mid-animation when someone reads it.
  Guard with the `prefersReduced` value already in scope at `HomePage.tsx:83`.
- **Perf**: `transform` + `opacity` for the pill. The numeral is a text-content
  mutation ~30 times over `900ms` — that *is* a layout+paint per tick, but the
  span already carries `font-mono ... tabular-nums` (`HomePage.tsx:263`), so
  every digit is the same advance width and the box never reflows its neighbours.
  Note the pill is `hidden ... sm:flex`, so none of this runs below `640px`.

---

### 16. The search bar arrives last, and arrives as an invitation

- **Where**: `/` — `<HeroSearch />` mounted at the hero seam,
  `/home/user/sportsbnb/src/pages/HomePage.tsx:274-276`; component at
  `/home/user/sportsbnb/src/components/home/HeroSearch.tsx:183-219`.
- **Motion**: `HeroSearch` currently sits **outside** the hero's motion tree
  entirely — it is a plain `div` in a sibling container and has no entrance at
  all. The source comment above it says it is "the first thing you can actually
  do", which is precisely the thing not being communicated: it appears fully
  formed while everything above it animates, so it reads as page furniture. Give
  it the last beat of the hero sequence: rise `16px` and fade in *after* the
  copy column has finished, so the eye's final resting place is the control it
  is meant to use. On desktop the whole `rounded-2xl` bar moves as one object; on
  mobile it is the single sheet-trigger button (`HeroSearch.tsx:189-204`).
- **Timing**: `opacity 0 → 1`, `translateY(16px → 0)`, **`560ms
  cubic-bezier(.22,1,.36,1)`** — the shared hero `EASE`, because this is the last
  member of the hero sequence and should not sound like a different instrument.
  Delay: hero copy stagger ends at ≈`50ms + 4×70ms + 700ms = 1030ms`; start the
  bar at **`1080ms`**, landing at `1640ms`.
- **Build**: framer-motion, driven from `HomePage` so the delay stays expressed
  in one place. Wrap the existing `<div className="container relative px-5 pb-14
  ...">` at `HomePage.tsx:274` as `motion.div` with
  `initial={prefersReduced ? undefined : { opacity: 0, y: 16 }}`. Do **not** put
  the animation inside `HeroSearch.tsx` — that component is also rendered
  elsewhere in the app's future surface area, and an entrance baked into it would
  fire in contexts that have no hero sequence.
- **Reduced motion**: `prefersReduced` → pass `initial`/`animate` as `undefined`;
  the bar renders in place immediately, which is also the fastest path to an
  interactive control. Critically: the bar must be **focusable and clickable from
  first paint regardless**, so never gate `pointer-events` or `visibility` on the
  animation — only `opacity` and `transform`.
- **Perf**: `transform` + `opacity` only. The desktop bar carries `shadow-2xl`
  and `ring-1` (`HeroSearch.tsx:216`) — both are paint-time, both are static, and
  neither is animated, so translating the box is a straight composite. No layout
  thrash.

---

### 17. "Near me" — the locating state stops jumping

- **Where**: `/` — the geolocation button in
  `/home/user/sportsbnb/src/components/home/HeroSearch.tsx:163-171`, state from
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
  exists in `/home/user/sportsbnb/tailwind.config.ts:114-117` and `:123`
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

---

### 18. Ambient court glow — slow, singular, and the first thing cut

- **Where**: `/` — the decorative blur blob at
  `/home/user/sportsbnb/src/pages/HomePage.tsx:144-147`
  (`-top-40 left-1/2 h-[560px] w-[900px] rounded-full bg-primary/12 blur-[130px]`).
- **Motion**: A very slow opacity drift on the green haze behind the headline, so
  the hero is never completely dead between interactions. Nothing translates,
  nothing scales — the light level breathes. The intent is atmospheric, not
  informational, which is exactly why it is the case with the strictest budget
  attached: it must be imperceptible as an event and only felt as the page not
  being a screenshot. If it is noticeable frame to frame, it is wrong.
- **Timing**: `opacity: 0.72 → 1 → 0.72` over **`9s ease-in-out`, infinite
  alternate**, with a `2s` initial delay so it never competes with the entrance
  sequence in cases 10-16. Nine seconds is chosen so that no two consecutive
  glances catch the same value, and so the per-frame delta at 60fps is
  ~0.00005 — below the threshold at which the change registers as motion.
- **Build**: CSS keyframe on the existing `aria-hidden` div. Not framer-motion —
  an ambient infinite loop must not be attached to a React component's lifecycle
  or hold a `MotionValue` subscription for the life of the page.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce) { animation: none; }`
  pinned at `opacity: 1` — the glow stays, it just stops changing. The element is
  `aria-hidden="true"` and `pointer-events-none`, so nothing is lost either way.
  Add the rule to the existing block at `/home/user/sportsbnb/src/index.css:619-630`
  alongside `.live-dot::after`, keeping all reduced-motion overrides in one place.
- **Perf**: **Flag, and be willing to drop this case entirely.** A `900×560px`
  layer with `blur(130px)` is a large, expensive raster. Animating `opacity`
  should let the compositor reuse the cached blurred texture — but "should" is
  doing real work in that sentence: some engines re-rasterise a filtered layer
  on opacity change, and on a low-end Android the cost lands squarely on the
  hero. Rules: (1) `will-change: opacity` on this element and nowhere else on the
  page; (2) profile on a real mid-range device before merging; (3) if the
  composite is not free, ship the glow static — it works perfectly well as a
  static gradient, which is what it is today. There is also a second identical
  blob in the closing section (`HomePage.tsx:553-556`); do **not** animate both,
  or two oversized filtered layers stay hot for the whole scroll.

---

**Cross-cutting notes for this section**

1. **One easing family.** `cubic-bezier(.22,1,.36,1)` (the `EASE` constant) for
   entrance sequencing; `var(--ease-out-expo)` for single-element arrivals;
   `cubic-bezier(.2,.8,.2,1)` for pointer feedback under `200ms`;
   `var(--ease-spring)` exactly once, on the confirmation check in case 14.
2. **Three unguarded animations exist above the fold today** and are named in
   the cases above: `animate-ping` on the live pill (`HomePage.tsx:159`),
   `animate-pulse` on the locating icon (`HeroSearch.tsx:169`), and
   `animate-pulse` + `animate-spin` in `SplashScreen.tsx:25,32`. Plus
   `active:scale-[0.98]` and the `hero` variant's `hover:-translate-y-0.5` in
   `button.tsx:8,25`. The reduced-motion block at `index.css:619-630` covers
   `.live-dot::after` and `.card-lift` only, and its comment asserting that
   "nothing else in the app declares a hover transform" is out of date.
3. **Never gate content on an animation.** Every case above uses `opacity` and
   `transform` exclusively; none touches `visibility`, `display` or
   `pointer-events`. The hero copy and the search bar must be readable and
   operable from first paint in every failure mode — reduced motion, JS error,
   prerendered snapshot.
