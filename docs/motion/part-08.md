## Payment result & confirmation

Scope: the two screens the user lands on after the bank hands them back —
`src/features/booking/BookingStatusPage.tsx` (route `/booking/:bookingId/status`)
and `src/features/booking/GameJoinStatusPage.tsx` (route
`/game/:id/join-status`) — plus the redirect seam that gets them there
(`JoinSuccessRedirect` and `PageLoader`, both in `src/App.tsx`) and the dev-only
bank stand-in `src/features/booking/MockPayPage.tsx` (`/pay/mock/:paymentId`).

### What this section is built from

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
`font-mono uppercase`). Case 67 animates that block and nothing else — no
invented download, no invented email preview.

**Motion tokens** — `src/index.css:136-140`:
`--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`,
`--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`,
`--dur-fast: 150ms`, `--dur-base: 250ms`, `--dur-slow: 400ms`.
`--shadow-ring-primary` is at `src/index.css:130`.

**Brand.** Dark is the shipped theme. `--primary: 151 90% 47%`,
`--success: 151 80% 44%`, `--warning: 42 95% 55%`,
`--destructive: 358 72% 68%`, `--radius: 0.875rem`.
Note both success icons are hardcoded `text-green-600`
(`BookingStatusPage.tsx:118`, `GameJoinStatusPage.tsx:81`) — raw Tailwind, not
`--success`. Case 66 ships the token swap with the animation, because animating
attention onto an off-brand green is worse than leaving it static.

**Existing keyframes** — `tailwind.config.ts:101-124`: `fade-in`
(`opacity 0 + translateY(8px) → opacity 1 + translateY(0)`, `0.4s
cubic-bezier(0.25, 0.1, 0.25, 1)`), `shimmer`, `accordion-down/up`.
`tailwindcss-animate` is a registered plugin (`tailwind.config.ts:158`), so
`animate-in`, `fade-in-0`, `zoom-in-95` and `motion-reduce:animate-none` are
available.

**framer-motion `^12.34.3`** is a dependency, already imported by
`src/pages/HomePage.tsx` (including `useReducedMotion()` at line 83),
`src/pages/ForOwnersPage.tsx` and
`src/components/ui/container-scroll-animation.tsx`, and wrapped by the shared
vocabulary `src/lib/motion.ts:22-56` (`easeOutExpo = [0.16, 1, 0.3, 1]`,
`transitionFast/Base/Slow`, `fadeUp`, `scaleIn`, `pageTransition`).
So it is proposable. **Remotion is not a dependency** — nothing below uses it.

**Reduced motion today** — `src/index.css:619-630` covers exactly two things,
`.live-dot::after` and `.card-lift`. Every CSS fallback below extends that
block; every JS fallback branches on `useReducedMotion()`.

---

### 64. Poll heartbeat and the 60-second budget
- **Where**: `/booking/:bookingId/status` →
  `src/features/booking/BookingStatusPage.tsx:106-113`, and
  `/game/:id/join-status` → `src/features/booking/GameJoinStatusPage.tsx:73-78`.
  Both render `<Loader2 className="animate-spin">` under
  "Confirming your payment…".
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
  shares the same component.
- **Reduced motion**: `useReducedMotion()` → no arc animation, no pulse, no
  spin. Render the ring at a static 25 % stroke and add a text line inside the
  existing `role="status"` container that updates every 10 s
  ("Still checking — 20s"). The status region is already `role="status"`, so a
  10 s cadence is polite; a 2 s cadence would flood a screen reader.
- **Perf**: `pathLength` compiles to `stroke-dashoffset`, which **paints** every
  frame — it is not a compositor property. Acceptable only because the element
  is a single ≤56 px SVG on an otherwise static card; do not reuse this on a
  list. The tick pulse is `transform` only.

### 65. The answer landing — pending → terminal body swap
- **Where**: `src/features/booking/BookingStatusPage.tsx:105-226` (`renderBody`
  returns three different subtrees into one `<CardContent>` at line 232), and
  the same shape at `src/features/booking/GameJoinStatusPage.tsx:72-103`.
- **Motion**: wrap `renderBody()` in `<AnimatePresence mode="wait">` keyed on
  `finalStatus ?? "pending"`. Outgoing body: `opacity 1 → 0`, `y 0 → -6px`.
  Incoming body: `opacity 0 → 1`, `y 8px → 0` — the same shape as `fadeUp` in
  `src/lib/motion.ts:28-31`. The `<Card>` itself grows with `layout`: the
  pending body is ~140 px (`py-8`, icon, two lines) and the paid body is
  ~420 px once the receipt `<dl>` and the cancel row are in. What the user
  understands: the wait ended and this is the *replacement* for it, not a
  second, unrelated screen — today the card snaps height and the eye has to
  re-find the heading.
- **Timing**: out `150ms cubic-bezier(0.16, 1, 0.3, 1)` (`--dur-fast`), in
  `400ms cubic-bezier(0.16, 1, 0.3, 1)` (`--dur-slow`), card height
  `300ms cubic-bezier(0.16, 1, 0.3, 1)`. `mode="wait"` serialises them, so the
  total is 550 ms — long enough to read as a transition, short enough that the
  outcome is on screen inside 200 ms of it being known.
- **Build**: framer-motion. `AnimatePresence mode="wait"` plus `layout` is the
  only thing here that can animate an unknown-to-unknown height; CSS
  `height: auto` cannot.
- **Reduced motion**: `useReducedMotion()` → set both durations to `0` and drop
  `layout` from the card (pass `layout={!prefersReduced}`). The new body
  replaces the old one on the same frame at final height. Do not substitute a
  crossfade — a crossfade is still motion.
- **Perf**: the body transition is `transform`/`opacity` only. The `layout`
  prop is the flag: framer-motion 12 animates size by scale-correcting, which
  visibly softens glyphs mid-flight unless children opt in. Put
  `layout="position"` on the heading and paragraph so the text translates
  instead of being scaled, and leave the `<dl>` out of `layout` entirely
  (see case 67).

### 66. Confirmation mark — draw, then settle **[HIGH IMPACT]**
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
  starting at `+90ms`. Total 410 ms, beginning after case 65's incoming body
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

### 67. Receipt reveal — amount before reference
- **Where**: `src/features/booking/BookingStatusPage.tsx:134-149` — the
  `<dl>` holding `Paid` (`formatAmd(booking.amount_minor)`, `.stat-numeral
  tabular-nums`) and `Reference` (`booking.id.slice(0, 8)`). This block exists
  precisely because an email receipt is not guaranteed (see the comment at lines
  128-133), so it is the user's only artefact.
- **Motion**: the `<dl>` container fades `opacity 0 → 1` and translates
  `y 10px → 0`; then the two `<dd>` values fade in on a short stagger, amount
  first, reference second. What the user understands: the reading order. The
  amount is what to check against the card statement; the reference is what to
  quote if it does not match. Staggering them in that order is the whole
  argument for animating this block at all. Explicitly **no digit count-up** on
  the amount — a price the user has already been charged must not appear to be
  still resolving.
- **Timing**: container `300ms cubic-bezier(0.16, 1, 0.3, 1)` at `delay 420ms`
  (immediately after case 66's 410 ms mark settles); amount `<dd>` `200ms` at
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
  `layout` set from case 65 for the same reason.

### 68. Failure mark — settles sideways, never bounces
- **Where**: `src/features/booking/BookingStatusPage.tsx:212`
  (`<XCircle className="h-14 w-14 text-destructive …" />`, covering
  `failed | cancelled | expired | no_payment`) and
  `src/features/booking/GameJoinStatusPage.tsx:93`.
- **Motion**: the icon fades `opacity 0 → 1` while translating on `x` through
  a damped two-beat: `x: [0, -4, 3, -2, 0]` px, `scale` pinned at 1 the whole
  time. What the user understands: the outcome, before reading a word. Case 66
  overshoots *outward* and settles; this settles *laterally* and stops dead.
  Two physics, two answers — and the visual difference survives at a glance,
  in a screenshot, and for a user who cannot distinguish the green from the red.
  Same motion for the "Payment not completed" and "Booking cancelled" copy
  branches (`BookingStatusPage.tsx:213-215`) because in both cases no money was
  taken (line 219).
- **Timing**: `260ms cubic-bezier(0.2, 0.8, 0.2, 1)` for the x keyframes,
  `160ms` linear for the opacity, both starting with the incoming body from
  case 65.
- **Build**: framer-motion — `animate={{ x: [0, -4, 3, -2, 0] }}` is a
  keyframe array, which CSS would need a bespoke `@keyframes` block for. There
  is no such keyframe in `tailwind.config.ts:101-124` today and adding one for a
  single element is not worth the global surface.
- **Reduced motion**: `useReducedMotion()` → `opacity 0 → 1` over `120ms`, `x`
  never leaves 0. **Never shake.** The x-array must be gated, not scaled down.
- **Perf**: `transform`/`opacity`, composited, no layout. The 4 px amplitude cap
  is deliberate — beyond that a 56 px icon reads as a rejected-form-field
  shudder, and lateral shakes are the class of motion vestibular-sensitive users
  report on even when they have not set the OS preference.

### 69. "Still processing" is not a failure
- **Where**: `src/features/booking/BookingStatusPage.tsx:209-220`, the
  `finalStatus === "timeout"` branch. It currently renders the same
  `XCircle text-destructive` as an outright failure (line 212) while the heading
  says "Payment still processing" and the body says the page will update
  (lines 214, 218) — the icon contradicts the copy.
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

### 70. Cancelling a confirmed booking — the receipt stays put
- **Where**: `src/features/booking/BookingStatusPage.tsx:160-205`. The
  `AlertDialog` sits *inside* the paid body; confirming calls
  `setFinalStatus(result.status)` (line 184), which flips `renderBody()` from
  the green confirmation straight to the red X branch, and fires a sonner toast
  carrying the refund amount (lines 186-193).
- **Motion**: three coordinated pieces. (a) The dialog closes on Radix's
  existing `data-[state=closed]` exit from `src/components/ui/alert-dialog.tsx`
  — unchanged. (b) The body swap reuses case 65's `AnimatePresence`, but the
  receipt `<dl>` is carried across with `layoutId="receipt-lines"` so the amount
  and reference the user was just reading translate to their new position
  instead of blinking out and back — it is the same reference, and a refund
  query needs it more than the booking did. (c) The refund toast enters
  bottom-right with sonner's own transition. What the user understands: this is
  the same booking changing state, not a new page reporting a new event.
- **Timing**: body swap as case 65 (150 ms out / 400 ms in); shared-element
  `<dl>` `300ms cubic-bezier(0.16, 1, 0.3, 1)`; toast `duration: 6000` rather
  than sonner's 4000 default, because a refund figure formatted by `formatAmd`
  is a number people re-read.
- **Build**: framer-motion for `layoutId` (nothing in CSS crosses a subtree
  boundary), Radix/`tailwindcss-animate` for the dialog, sonner for the toast —
  each already mounted (`<Sonner />` at `src/App.tsx:131`).
- **Reduced motion**: add `motion-reduce:animate-none` to `AlertDialogContent`;
  gate `layoutId` behind `useReducedMotion()` so the `<dl>` re-renders in place
  with no flight; keep the toast — its arrival is information, not decoration —
  but kill its travel with an override in the reduce block at
  `src/index.css:619-630`: `[data-sonner-toast] { transition: none !important; }`.
  sonner 1.7.4 animates through its own CSS transitions on that attribute;
  verify rather than assume the library reads the preference for you.
- **Perf**: `layoutId` measures both positions with `getBoundingClientRect`
  once per transition — two forced reflows at the swap, not per frame. That is
  the layout-thrash risk here and it is bounded; the flight itself is
  `transform`. Do not extend `layoutId` to the whole body.

### 71. Mock bank — which outcome is committing
- **Where**: `/pay/mock/:paymentId` → `src/features/booking/MockPayPage.tsx:48-55`.
  `busy` disables both buttons and puts a `<Loader2 className="animate-spin">`
  in the chosen one, but the unchosen button only goes flat-disabled with no
  explanation, for the 1-3 s the `payments-verify` round trip takes.
- **Motion**: on commit, the unchosen button drops `opacity 1 → 0.35` and
  `scale 1 → 0.98`, while the chosen one holds `scale 1` and gains
  `box-shadow: var(--shadow-ring-primary)` (`src/index.css:130`). What the user
  understands — and, more usefully, what a reviewer understands scrubbing a
  Playwright trace — is which of the two simulated outcomes is in flight. The
  page exists to make payment states reproducible; its own state should be
  legible in a still frame.
- **Timing**: `180ms cubic-bezier(0.2, 0.8, 0.2, 1)` on all three properties,
  starting at the `setBusy(outcome)` call (line 19).
- **Build**: Tailwind — `transition-[opacity,transform,box-shadow] duration-200`
  plus conditional classes off `busy`. This is a dev/E2E-only surface
  (`MockPayPage.tsx:10`) and earns the smallest possible budget; importing
  framer-motion here would put it in a chunk that only ever loads in
  development.
- **Reduced motion**: `motion-reduce:transition-none` on both buttons — the
  unchosen one still lands at `opacity 0.35` and the chosen one still shows the
  ring, they just arrive on the same frame. No scale change at all under
  reduce.
- **Perf**: opacity and transform composite; `box-shadow` **paints** for the
  length of the transition. Fine on two 48 px-tall buttons on an otherwise
  empty card — flag it so nobody copies this pattern onto a list of rows.

### 72. Coming back from the bank — the blank frame
- **Where**: `src/App.tsx:104-108` (`JoinSuccessRedirect`, mounted at
  `/game/:id/join-success`, renders `<Navigate replace>` and therefore no
  pixels) and `src/App.tsx:111-115` (`PageLoader` — a bare `min-h-screen`
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
  (`--dur-base`, matching `transitionBase` in `src/lib/motion.ts:25`).
- **Build**: CSS for the delayed spinner (it lives in a component with no state
  and no framer-motion import — keep `App.tsx`'s eager bundle clean);
  framer-motion for the page enter, reusing the already-exported
  `pageTransition` variants.
- **Reduced motion**: drop the 120 ms delay under
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
