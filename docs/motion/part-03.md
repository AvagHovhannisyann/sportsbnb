## Landing scroll storytelling

Scope: everything on `/` **below** the search bar at the hero seam — the four
content bands and the closing CTA, plus the one piece of global chrome whose
state is written by scrolling this page.

**Ground truth for this section**

| Thing | Where it actually lives |
| --- | --- |
| Route | `/` → `<Layout showMobileNav={false}><HomePage /></Layout>` — `/home/user/sportsbnb/src/App.tsx:145` |
| Section shell (`base` / `raised` / `invert`) | `/home/user/sportsbnb/src/pages/HomePage.tsx:45-65` |
| Reveal + stagger variants | `/home/user/sportsbnb/src/pages/HomePage.tsx:25-37` |
| "How it works" (`<ol>`, 3 steps) | `/home/user/sportsbnb/src/pages/HomePage.tsx:282-318` |
| Sports grid (4 image cards) | `/home/user/sportsbnb/src/pages/HomePage.tsx:323-380` |
| "Why it's different" + slot-grid demo | `/home/user/sportsbnb/src/pages/HomePage.tsx:386-497` |
| Owner stat tiles (the single `invert` band) | `/home/user/sportsbnb/src/pages/HomePage.tsx:503-547` |
| Closing CTA + ambient glow | `/home/user/sportsbnb/src/pages/HomePage.tsx:552-595` |
| Sticky header | `/home/user/sportsbnb/src/components/layout/Header.tsx:51` |
| Motion tokens + reduced-motion block | `/home/user/sportsbnb/src/index.css:136-140`, `:619-630` |

`framer-motion@^12.34.3` is in `package.json` dependencies, and
`HomePage.tsx:11` already imports `motion` and `useReducedMotion` — so
`useScroll` / `useTransform` / `useInView` / `animate` are legitimate build
targets. Remotion is **not** installed and is proposed nowhere below.

Existing vocabulary these cases extend rather than replace:

```
--ease-out-expo: cubic-bezier(.16,1,.3,1)      /* index.css:136 */
--ease-spring:   cubic-bezier(.34,1.56,.64,1)  /* index.css:137 */
--dur-fast 150ms  --dur-base 250ms  --dur-slow 400ms   /* index.css:138-140 */
EASE = cubic-bezier(.22,1,.36,1)               /* HomePage.tsx:25 */
reveal: {opacity 0, y 24} → {opacity 1, y 0}, 700ms EASE  /* HomePage.tsx:27-30 */
stagger: staggerChildren 70ms, delayChildren 50ms         /* HomePage.tsx:32-35 */
viewportOnce: { once: true, margin: "-80px" }             /* HomePage.tsx:37 */
```

**The structural bug every case below has to work around.** `revealProps`
(`HomePage.tsx:102-104`) puts `whileInView` on the *band wrapper*, not on the
items. Each wrapper contains its heading **and** its whole grid, so the trigger
fires the moment the band's top edge crosses `viewportBottom - 80px` and the
`70ms` stagger empties in ~330ms. On desktop that is mostly fine — the grids are
single rows. On mobile every grid stacks (`sm:grid-cols-2 lg:grid-cols-4` at
`:350`, `md:grid-cols-3` at `:294`, `grid-cols-2` at `:532`), so cards 2–4 finish
animating while they are still one to three screens below the fold. The visitor
scrolls down to a page that has already stopped moving. Cases 19, 20 and 23 all
depend on moving the trigger down to the item.

Reduced motion is handled the same way the file already handles it
(`HomePage.tsx:100-104`): under `useReducedMotion()` the props object is empty,
no `initial` is applied, and the markup renders in its final state. Every case
below states its own concrete fallback; none of them leave content gated behind
an animation that never runs.

---

### 19. The three steps arrive as a sequence, not as a row

- **Where**: `/` — `/home/user/sportsbnb/src/pages/HomePage.tsx:294-316`, the
  `<ol>` of `steps` (`:113-129`). Each `<li>` opens with a mono ordinal
  (`01`/`02`/`03`) followed by `<span className="h-px flex-1 bg-border" />`
  (`:297-302`).
- **Motion**: the hairline rule after each ordinal draws left→right —
  `scaleX(0) → scaleX(1)`, `transform-origin: left` — and only when a step's
  rule has finished does the next step's ordinal fade in. What the user
  understands: these are three *stages of one booking*, in order, not three
  parallel features laid out in a row. Right now the numbers say "01 02 03" and
  the motion says "all at once", which cancels the numbering. The rule already
  exists in the markup as a divider; animating it costs no new DOM.
- **Timing**: per step — ordinal + icon + text `520ms cubic-bezier(.16,1,.3,1)`
  with `y: 16 → 0`; the rule `scaleX` `340ms cubic-bezier(.22,1,.36,1)` starting
  `120ms` into the step. Step-to-step stagger `180ms` (not the global `70ms` —
  `70ms` reads as simultaneous). Whole band: `~1.06s`, and it is the only band
  on the page allowed to run that long.
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

---

### 20. Sports cards reveal when *they* cross, not when the band does

- **Where**: `/` — `/home/user/sportsbnb/src/pages/HomePage.tsx:350-378`, the
  four `<motion.div variants={reveal}>` wrappers around the sport `<Link>`s.
- **Motion**: move `whileInView` off the band wrapper (`:324`) and onto each
  card, with `viewport={{ once: true, amount: 0.35 }}`. A card lifts and fades
  in when 35% of it is on screen. What the user understands: the page is still
  going. On mobile today, Football animates and the other three are already
  finished by the time you reach them, so the scroll feels like it hit the end
  of the content. With per-card triggers, four separate arrivals tell you the
  catalogue continues past the fold — which is the exact message the "See all
  venues" link at `:331-340` is making in words.
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
  final. The card's own hover zoom (`duration-700 ease-out group-hover:scale-[1.04]`,
  `:361`) is a separate concern — see case 21.
- **Perf**: `transform` + `opacity` only. Four observers instead of one; each
  disconnects on first fire because `once: true`. The `<img>`s are already
  `loading="lazy"` (`:360`), so a card that reveals may decode in the same
  frame — set `amount: 0.35` rather than `0` so the decode has ~200ms of scroll
  distance to land before the reveal starts.

---

### 21. Parallax inside the sport card crop

- **Where**: `/` — `/home/user/sportsbnb/src/pages/HomePage.tsx:357-362`, the
  `aspect-[4/5]` image inside the `overflow-hidden rounded-2xl` link.
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
  The existing hover `scale-[1.04]` (`:361`) must move to a wrapper element —
  framer-motion owns `transform` on the animated node, and a Tailwind
  `group-hover:scale` on the same element is silently overwritten.

---

### 22. The closing glow drifts as the page ends

- **Where**: `/` — `/home/user/sportsbnb/src/pages/HomePage.tsx:552-556`, the
  `aria-hidden` blob: `bottom-[-30%] h-[500px] w-[800px] rounded-full
  bg-primary/12 blur-[130px]`.
- **Motion**: as the closing band enters, the blob rises `y: 60px → 0` and its
  opacity goes `0 → 1` over the scroll range; it is otherwise static. What the
  user understands: the page has a floor. This is the second and last blob on
  the page (the first is the hero's, `:144-147`), and making the closing one
  *arrive* rather than simply be there marks the end of the scroll — the visual
  bookend to the CTA that says "one tap away".
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

---

### 23. Owner stats count up — the two numbers, never the two words

- **Where**: `/` — `/home/user/sportsbnb/src/pages/HomePage.tsx:532-545`, the
  `<motion.dl>` of four tiles inside the single `invert` band: `Commission 5%`,
  `Payouts Weekly`, `Setup 10 min`, `Support Direct`.
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
- **Build**: framer-motion `useInView` + `animate(motionValue, target, …)`, with
  `motionValue.on("change")` writing `ref.current.textContent`. Not React state:
  a `setState` per frame re-renders the whole band ~48 times. The suffix (`%`,
  ` min`) stays as static text outside the animated node. (The helper takes
  `{ to, suffix }` props, so the repo's `type Props = {}` ban — use
  `Record<string, never>` — does not arise here.)
- **Reduced motion**: `useReducedMotion()` → render the final number as plain
  text on first paint. Never render `0`.
- **Perf**: `opacity`/`transform` are not involved — this is a text mutation, so
  **flag it honestly**: each `textContent` write invalidates layout for that
  node. Mitigations, both cheap: the `dd` already carries `tabular-nums`
  (`:541`), so digit width never changes, and adding `min-w-[3ch]` to the
  animated span means `5 → 10` gaining a digit cannot reflow the tile. Two
  nodes × ~48 frames is well inside budget; twenty would not be.

---

### 24. Each claim gets stamped, and the text does not move

- **Where**: `/` — `/home/user/sportsbnb/src/pages/HomePage.tsx:402-426`, the
  three-item `<ul>` under "The slot is yours the moment you pay", each row a
  `<Check>` icon plus a line of copy.
- **Motion**: the check icons scale `0.6 → 1` with `opacity 0 → 1`; the copy
  beside them fades `opacity 0 → 1` with **no** `y` offset. What the user
  understands: three separate guarantees being ticked off, one at a time —
  matching the semantics of a check mark. The copy stays put because these
  lines are 60–70 characters and a `y: 24` slide on a long line makes the reader
  re-find the baseline three times.
- **Timing**: icon `260ms cubic-bezier(.34,1.56,.64,1)` (`--ease-spring`,
  index.css:137 — the slight overshoot is what makes it read as a stamp rather
  than a fade); copy `300ms cubic-bezier(.22,1,.36,1)` starting `80ms` after its
  icon; row-to-row stagger `90ms`. Whole list: `~640ms`.
- **Build**: framer-motion. The list is inside a wrapper that already has
  `variants={stagger}` (`:387`), so this is one nested variant node per `<li>`
  with its own `staggerChildren`. This is the one place `--ease-spring` should
  appear on this page — it is defined in `index.css:137` and currently used
  nowhere.
- **Reduced motion**: icons at `scale(1)`, all three rows at full opacity, no
  stagger. The overshoot is the first thing to cut and nothing depends on it.
- **Perf**: `transform` + `opacity` only. `scale` on a 20px SVG icon resamples
  a trivial area; the concern that makes `.card-lift` prefer translate over
  scale (`index.css:588-616`) is about scaling *text*, which this deliberately
  avoids.

---

### 25. The slot grid demonstrates the promise **[HIGH IMPACT]**

- **Where**: `/` — `/home/user/sportsbnb/src/pages/HomePage.tsx:429-495`, the
  mock booking panel: six time chips (`:438-468`), the price `<dl>` (`:470-485`),
  and the "Slot held until 20:00" status bar (`:490-493`).
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
  (`:439-456`); the animated version needs those three states expressed as
  variants rather than a ternary over class strings, since Tailwind class swaps
  cannot be cross-faded.
- **Reduced motion**: render the panel exactly as it ships today — `19:00`
  already picked, held bar already present, no sequence. The fallback is
  literally the current component, which is the strongest possible guarantee
  that no information lives only in the animation.
- **Perf**: chips animate `opacity` + `transform` on entry (composited). The
  picked-state change is `background-color` + `border-color` + `color` — paint,
  not layout, on one 60×36px element for 240ms. Acceptable at this size. Do
  **not** animate the chip's `padding` or the grid's `gap` to make it "pop":
  either would relayout the whole `grid-cols-3` list every frame.

---

### 26. The header admits you have left the top

- **Where**: `/` — `/home/user/sportsbnb/src/components/layout/Header.tsx:51`:
  `className="glass sticky top-0 z-50 w-full rounded-none border-x-0 border-t-0"`.
  `.glass` is defined at `/home/user/sportsbnb/src/index.css:430-448` and carries
  a backdrop blur, a 1px inner highlight and `--shadow-md` **unconditionally**.
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

---

### 27. One glow at the end, once

- **Where**: `/` — `/home/user/sportsbnb/src/pages/HomePage.tsx:570-585`, the
  closing primary CTA (`Get started` / `Find a court`), with the secondary
  `Browse first` beside it.
- **Motion**: after the closing band's reveal settles, the primary CTA takes on
  `.glow-primary` — `box-shadow: 0 0 32px -8px hsl(var(--primary)/.45)`,
  defined at `/home/user/sportsbnb/src/index.css:583-586` and currently unused —
  ramping from `0` to full once, then holding. The outline button gets nothing.
  What the user understands: of the two buttons in front of them, one is the
  answer. The page has spent five bands widening the story; the last frame
  narrows it back to a single action, and the glow is what performs that
  narrowing without adding a word.
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
  `/home/user/sportsbnb/src/index.css:619-630`, next to `.live-dot` and
  `.card-lift`, so all three reduced-motion overrides stay in one place.
- **Perf**: `box-shadow` is a paint-only property — no layout, no reflow of the
  button row. It is a 48px-tall element and the transition runs once, so the
  repaint cost is negligible. Do not substitute an animated `filter:
  drop-shadow`, which would rasterise the button's glyphs every frame.

---

**Calibration note for the whole scroll.** The existing `reveal` is `700ms` with
`y: 24` (`HomePage.tsx:27-30`), tuned for the hero where the visitor is
stationary. Below the fold the visitor is *moving*, and a `700ms` tail means
content finishes arriving after the eye has already read it. Cases 19–20 use
`460–520ms` with `y: 16–20` for that reason. Adding a second variant
(`revealTight`) beside the existing one keeps a single vocabulary with two
registers — stationary and scrolling — rather than eight independent timings,
which is the same argument the comment at `HomePage.tsx:19-24` already makes.
