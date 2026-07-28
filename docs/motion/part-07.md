## Booking flow & hold timer

Scope: the three screens money passes through — `src/features/booking/CheckoutPage.tsx`
(`/book/:bookingId`), `src/features/booking/BookingStatusPage.tsx`
(`/booking/:bookingId/status`), and the hand-off out of
`src/features/booking/BookingPanel.tsx` that creates the hold. The dev-only
`src/features/booking/MockPayPage.tsx` (`/pay/mock/:paymentId`) shares the
commit pattern in case 60 and is noted there rather than given its own case.

### What this section is built from

**The real flow**, from `src/App.tsx:241-243`:

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

**Motion tokens** — `src/index.css:136-140`: `--ease-out-expo:
cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-spring: cubic-bezier(0.34, 1.56, 0.64,
1)`, `--dur-fast: 150ms`, `--dur-base: 250ms`, `--dur-slow: 400ms`.

**Brand.** Dark ships (`index.html:2` is `class="dark"`). The escalation pair
this section lives on is `--warning: 42 95% 55%` and `--destructive: 358 72%
68%` (`index.css:188,193`), already wired to the timer via `isUrgent`
(`CheckoutPage.tsx:99`). `--primary: 151 90% 47%`, `--radius: 0.875rem`,
`--shadow-ring-primary: 0 0 0 4px hsl(var(--primary) / 0.18)`
(`index.css:228`).

**Existing keyframes to reuse, not re-author** — `.live-dot` /
`@keyframes live-ping` at `index.css:568-580` (a primary dot, `scale(1)→
scale(2.6)`, opacity `0.6→0`, `1.8s var(--ease-out-expo) infinite`) and
`shimmer` / `fade-in` in `tailwind.config.ts:114-123`. `tailwindcss-animate` is
registered (`tailwind.config.ts:158`), so `animate-in fade-in-0 zoom-in-95` is
available without new CSS.

**Reduced motion today** covers exactly two selectors, `index.css:619-630`:
`.live-dot::after { animation: none }` and `.card-lift`. Every fallback below
either extends that block or branches on `useReducedMotion()`.

**framer-motion `^12.34.3`** is installed and already imported by four files,
one of them the shared vocabulary `src/lib/motion.ts` (`easeOutExpo = [0.16, 1,
0.3, 1]`, `transitionFast` 150ms / `transitionBase` 250ms, `fadeUp`, `scaleIn`,
`tapScale = { scale: 0.97 }`). So framer-motion is proposable and every JS case
below reuses those constants. **Remotion is not a dependency** — nothing here
proposes it.

**The current state of these three files**: `transition-colors` with no
duration at `CheckoutPage.tsx:220` (the timer) and `:271` (the provider cards),
i.e. Tailwind's default 150ms; `animate-spin` on `Loader2` at
`CheckoutPage.tsx:119,296`, `BookingPanel.tsx:321`,
`BookingStatusPage.tsx:109`. Nothing else moves anywhere in the payment path.

---

### 55. Reserve → hold acquired

- **Where**: `/venue/:id` → `/book/:bookingId`. `src/features/booking/BookingPanel.tsx:130-151` (`handleReserve`) and the button at `:320-323`.
- **Motion**: Three beats on one press. (a) The `Reserve` button takes `whileTap={tapScale}` — `scale(1) → scale(0.97)` — so the press registers before the network does. (b) While `createHold.isPending`, the existing `Loader2` stays, but the button also gets `aria-busy` and its width is pinned so the spinner does not reflow the label. (c) On success, before `navigate()`, the `.glass` panel plays a 160ms exit: `opacity 1 → 0`, `translateY(0) → translateY(-6px)`. The user understands that the slot is now *theirs and held* — the panel leaves rather than being replaced, so the next screen reads as the same task continuing, not a new page they were thrown to. Without it, an instant route swap at 1200ms of latency looks like the click failed and then something happened.
- **Timing**: tap 90ms `cubic-bezier(.2,.8,.2,1)`; exit 160ms `cubic-bezier(0.16, 1, 0.3, 1)` (`easeOutExpo` from `src/lib/motion.ts`), then `navigate()` on the exit's completion callback.
- **Build**: framer-motion. `handleReserve` is already `async`, so `await controls.start(...)` before `navigate()` is one line; a CSS class toggle would need its own `transitionend` plumbing to sequence against the promise.
- **Reduced motion**: `useReducedMotion()` → skip both the tap scale and the exit, and call `navigate()` immediately. The 160ms delay is motion, so it must not be charged to someone who opted out.
- **Perf**: `transform` + `opacity` only. One caveat worth stating: the panel is `.glass` (`index.css:430-438`), i.e. `backdrop-filter: blur(18px)`. Animating opacity on a backdrop-filtered element re-composites the blur each frame. At one 160ms exit per booking that is fine; do not extend this to a loop.

### 56. Minute rollover on the hold timer

- **Where**: `/book/:bookingId`, the timer chip in `CardTitle` — `src/features/booking/CheckoutPage.tsx:215-226`, fed by `countdown` (`:92-97`).
- **Motion**: The timer fires every 1000ms (`:88`) but only animates on the **minute boundary** (`remaining % 60 === 0`): the chip does `scale(1) → scale(1.04) → scale(1)` and the `Timer` icon rotates `0deg → -8deg → 0deg`. Nothing moves on the other 59 ticks. What the user understands: time is being *spent*, in units they can count, and there are a small number of units left. A per-second flicker would say the same thing 1200 times and become wallpaper within ten seconds; twenty distinct events over twenty minutes stay legible in peripheral vision while they read the price breakdown.
- **Timing**: 260ms total, `cubic-bezier(0.34, 1.56, 0.64, 1)` (`--ease-spring`, `index.css:137`) — the slight overshoot is what makes a 4% scale readable at all.
- **Build**: framer-motion `useAnimationControls` keyed off the existing effect at `:81-90`; a CSS keyframe would need the class removed and re-added per minute, which is a re-render either way.
- **Reduced motion**: `useReducedMotion()` → no scale, no rotation. The digits still change, which is the actual information; only the emphasis is dropped.
- **Perf**: `transform` only, on a chip with no children that lay out. Flag: the chip is inside `flex items-center justify-between` (`:207`) and the string loses a character at `9:59`, so its box narrows once per session and the icon jumps ~8px left. Fix that with `min-w-[5.5ch] justify-end` on the span, not with motion — it is a layout bug the animation would otherwise draw attention to.

### 57. Two-minute escalation **[HIGH IMPACT]**

- **Where**: `/book/:bookingId`. `isUrgent` at `src/features/booking/CheckoutPage.tsx:99` (`remaining <= 120`) driving the `cn()` at `:219-222`.
- **Motion**: Today the colour swaps `text-warning → text-destructive` under a bare `transition-colors` (default 150ms) and nothing else marks the crossing. Add a one-shot at the boundary: the chip's `box-shadow` goes `0 0 0 0 hsl(var(--destructive) / 0.35)` → `0 0 0 10px hsl(var(--destructive) / 0)` — a single ring leaving the chip — while the colour travels over a slower 320ms. It fires **once**, at `remaining === 120`, never again. The user understands that a threshold was crossed, not that a value changed: a colour that snaps reads as a re-render, a colour that travels with a ring behind it reads as the system escalating. This is the difference between someone finishing checkout and someone losing the slot they picked.
- **Timing**: ring 520ms `cubic-bezier(0.16, 1, 0.3, 1)`; colour 320ms `cubic-bezier(.2,.8,.2,1)` (deliberately slower than the current 150ms so the change is perceived as a transition rather than a repaint).
- **Build**: CSS. A `@keyframes urgency-ring` in `index.css` next to `live-ping` (`:578`), applied by a class the existing `cn()` already toggles — no new JS state, since `isUrgent` is already computed.
- **Reduced motion**: extend the `@media (prefers-reduced-motion: reduce)` block at `index.css:619` with `.urgency-ring { animation: none }`. The colour change stays (it is information, and `--destructive` at `358 72% 68%` was contrast-checked, per the note at `index.css:56-65`), and the escalation is additionally carried by text.
- **Perf**: `box-shadow` animation is a paint, not a composite — this is the one case here that is not transform/opacity. It is bounded to a single 520ms play on a 90×24px element, so the repaint area is negligible; using `transform: scale` on a pseudo-element instead would composite, but then the ring is clipped by the `CardHeader` overflow. Accepted trade, once per session. Adjacent, not motion: `aria-live="polite"` at `:217` announces this timer on every tick; if that is ever tightened, the 120s crossing is the moment that deserves an assertive announcement, and this ring is its visual twin.

### 58. Hold expiry hand-off

- **Where**: `/book/:bookingId`. The branch at `src/features/booking/CheckoutPage.tsx:154-196` — when `remaining <= 0` the whole `<Card>` is replaced by `<StatusPanel icon={Timer} … "This reservation has expired">` (`src/components/common/StatusPanel.tsx:37-60`).
- **Motion**: Today the payment form vanishes and the expiry panel appears in one frame, indistinguishable from a crash. Crossfade instead: the `CardContent` goes `opacity 1 → 0` and `scale(1) → scale(0.985)` over 140ms, then the `StatusPanel` enters `opacity 0 → 1`, `translateY(8px) → 0` over 220ms, with its icon chip scaling `0.9 → 1`. The user understands that *the deadline arrived* — the form was withdrawn on purpose, in an order they can see — rather than that the page broke while they had their card out. That distinction decides whether they re-book or leave.
- **Timing**: out 140ms `cubic-bezier(.4,0,1,1)` (accelerate — the form is leaving), in 220ms `cubic-bezier(0.16, 1, 0.3, 1)` starting at 140ms. Total 360ms.
- **Build**: framer-motion `<AnimatePresence mode="wait">` around the two branches. `mode="wait"` is exactly the sequencing here, and CSS cannot express "unmount only after the exit finishes".
- **Reduced motion**: `useReducedMotion()` → both variants collapse to `{ opacity: 1 }` with `duration: 0`; `AnimatePresence` still swaps, just instantly. Same as today's behaviour, which is the correct floor.
- **Perf**: `transform` + `opacity`. The card is not `.glass` (it is `<Card>`, opaque per the note at `index.css:427-429`), so no backdrop-filter recomposite here.

### 59. Payment provider selection

- **Where**: `/book/:bookingId`, the `role="radiogroup"` at `src/features/booking/CheckoutPage.tsx:262-292`.
- **Motion**: Selection currently changes only `border-primary` + `ring-1 ring-primary` under `transition-colors` (`:271`) — a 1px edge, no movement. Add: on select, the chosen card's ring grows from the token `--shadow-ring-primary` (`0 0 0 4px hsl(var(--primary) / 0.18)`, `index.css:228`) out of `0 0 0 0`, and its `lucide` icon scales `1 → 1.12 → 1`; the two deselected cards drop `opacity 1 → 0.72` over the same window. The user understands which card their money will go through — the selected one gains presence *while the others recede*, which a border colour alone cannot do on a dark surface where `--border: 157 12% 22%` and `--primary` differ mostly in hue.
- **Timing**: ring + opacity 180ms `cubic-bezier(.2,.8,.2,1)`; icon 220ms `cubic-bezier(0.34, 1.56, 0.64, 1)`.
- **Build**: Tailwind/CSS. `provider === key` already drives a `cn()` branch, so this is `transition-[box-shadow,opacity] duration-180` plus a `shadow-ring-primary` class on the selected branch — no JS.
- **Reduced motion**: keep the ring and the dimming (both are state, not decoration) but set `transition-duration: 0ms` and drop the icon scale, via the existing reduce block at `index.css:619`. Selection must never become invisible to someone who opted out of motion.
- **Perf**: `opacity` composites; `box-shadow` repaints a 3-row region once per click, at human click rate. No layout property touched — `ring` is drawn outside the box model and does not reflow the `space-y-2` stack.

### 60. Redirect commit — the moment the app hands off

- **Where**: `/book/:bookingId`, `handlePay` at `src/features/booking/CheckoutPage.tsx:101-113` and the pay button at `:295-298`, terminating in either `submitProviderForm()` (`src/features/booking/hooks/useBookingFlow.ts:139-154`, a synthetic form POST for Idram) or `window.location.href = result.redirectUrl` (Ameria).
- **Motion**: Between the click and the browser unloading there is one `supabase.functions.invoke("payments-init")` round-trip — on a 3G Yerevan connection, one to three seconds — during which the only feedback is a 16px spinner inside a button whose label still reads `Pay ֏12,500`. Replace with a commit sequence: the button label crossfades (120ms) to a redirect state, a 2px indeterminate bar sweeps `translateX(-100%) → translateX(100%)` across the bottom edge of the `<Card>` on a 1.1s loop, and the provider radiogroup dims to `opacity 0.5` and stops accepting pointer events. The user understands that the decision is *made and in flight* — the choice is frozen, the app is leaving, and pressing anything again will not help. This is the only place in the app where the far side of a transition is a third party we do not control, and the only place where a confused second click is a second payment.
- **Timing**: label crossfade 120ms `cubic-bezier(.2,.8,.2,1)`; radiogroup dim 200ms `cubic-bezier(0.16, 1, 0.3, 1)`; sweep 1100ms `cubic-bezier(.4,0,.2,1)` infinite until unload.
- **Build**: CSS/Tailwind, driven by the `initPayment.isPending` flag the button already reads. `translateX` on an absolutely-positioned 2px child of the card; no framer-motion needed because there is no enter/exit sequencing — the page is about to be destroyed.
- **Reduced motion**: the sweep is replaced by a static 2px `--primary` rule at 40% opacity across the card's bottom edge — present, not moving — plus the (already present) `disabled` state and the label change. Extend the `index.css:619` block with `.redirect-sweep { animation: none; opacity: .4; transform: none }`. The same treatment covers `MockPayPage.tsx:48-55`, where both buttons already gate on `busy !== null`.
- **Perf**: `transform` + `opacity` only, on a 2px strip. Flag the failure mode instead of a layout one: if `payments-init` rejects, `handlePay` catches and toasts (`:110-112`) but the animation must be torn down in the same branch — `isPending` returns to `false`, so binding purely to that flag is what makes it self-correcting.

### 61. Verification polling — bounded, not hung

- **Where**: `/booking/:bookingId/status`, the `!finalStatus` branch at `src/features/booking/BookingStatusPage.tsx:105-114`, against the poll loop at `:91-96` (`attempts.current < 30`, `setTimeout(poll, 2000)` — a hard 60-second budget).
- **Motion**: Today a 48px `Loader2` spins identically at second 2 and second 58, and the copy says "This usually takes a few seconds" for a full minute. Add a budget hairline under the heading: a 2px, 200px-wide track whose fill is `scaleX(0) → scaleX(1)` with `transform-origin: left`, advancing in 30 discrete 2000ms steps as `attempts.current` increments. The user understands that this has a *limit and is still moving* — the difference between "wait" and "this is stuck, reload and possibly pay twice". At 60s it stops at full and the copy switches to the `timeout` panel (case 63).
- **Timing**: each step 2000ms `linear` — deliberately linear, because it is a clock, not an entrance; eased steps would imply the remaining work varies.
- **Build**: CSS transition on a `style={{ transform: scaleX(attempts/30) }}` value React already re-renders. `attempts` is a `useRef` (`:35`) so it does not currently trigger renders — this needs it promoted to state, or a second `useState` counter incremented beside it. Say so plainly: this case costs one small refactor.
- **Reduced motion**: the fill still advances (it is progress, not decoration) but with `transition: none` — it jumps per step instead of gliding — and `Loader2`'s `animate-spin` is replaced by a static icon plus the existing `role="status"` text at `:108`.
- **Perf**: `transform: scaleX` on a composited layer, one change per 2s. Do **not** animate `width` here — that reflows the centred `text-center py-8` block and its heading on every step.

### 62. Confirmation and receipt reveal

- **Where**: `/booking/:bookingId/status`, `finalStatus === "paid"` — `src/features/booking/BookingStatusPage.tsx:115-151`: `CheckCircle2`, the "Booking confirmed!" `h1`, and the `<dl>` receipt carrying the amount and the 8-char reference (`:134-149`).
- **Motion**: Staged, in the order the eye should read it. (1) `CheckCircle2` scales `0.6 → 1` and its stroke draws via `pathLength: 0 → 1` over 420ms. (2) The `h1` and venue line rise `translateY(10px) → 0` with `opacity 0 → 1`, starting at 180ms. (3) The receipt `<dl>` — the only thing on this page they may need later — enters last, at 360ms, same 10px rise. (4) The two `Button`s at 480ms. The user understands the payment resolved *and* where the number to quote lives: staging ends the eye on the reference rather than on the largest element.
- **Timing**: icon 420ms `cubic-bezier(0.34, 1.56, 0.64, 1)`; each text stage 260ms `cubic-bezier(0.16, 1, 0.3, 1)`; stagger 180ms via `staggerChildren: 0.18` on a parent variant (`src/lib/motion.ts` already exports `staggerChildren` at 0.07 — this case wants the slower value, declared locally).
- **Build**: framer-motion. `pathLength` on an SVG stroke is a framer-motion primitive; hand-rolling it means `stroke-dasharray`/`stroke-dashoffset` against a `lucide-react` icon whose path length is not known at author time.
- **Reduced motion**: `useReducedMotion()` → the whole subtree renders at its final state with no stagger and no draw; the check mark is simply present. The information is the check and the receipt, and both survive.
- **Perf**: `transform` + `opacity`; `pathLength` animates an SVG attribute on a 56px icon, which repaints only that icon's box. No layout property in the chain.

### 63. Failure and timeout — refusing to shake

- **Where**: `/booking/:bookingId/status`, the terminal branch at `src/features/booking/BookingStatusPage.tsx:209-225`, covering `failed`, `cancelled`, `expired`, `timeout`, `no_payment`.
- **Motion**: The panel enters with the **same** 260ms fade-and-10px-rise as the success panel in case 62 — no shake, no bounce, no red flash. That is the design decision, not an omission: the copy at `:219` says "No money was taken. You can try booking the slot again", and error-shake choreography reads as *you did something wrong*, which is both false and expensive when the honest next action is "press the button again". The one case that differs is `timeout` (`:214,217-218`), where the poll gave up but the payment may still land: put a `.live-dot` (`index.css:568-580`) beside the "Payment still processing" heading. The user understands the distinction the copy is already making — a dead end versus something still in motion at the bank.
- **Timing**: panel 260ms `cubic-bezier(0.16, 1, 0.3, 1)`. The dot is the existing `live-ping`: 1800ms `var(--ease-out-expo)` infinite, `scale(1) → scale(2.6)`, `opacity 0.6 → 0`.
- **Build**: CSS/Tailwind — reuse `.live-dot`, author nothing. The panel entrance rides the same `AnimatePresence` introduced in case 58 if that lands; otherwise `animate-in fade-in-0 slide-in-from-bottom-2` from `tailwindcss-animate` (`tailwind.config.ts:158`) covers it with no new dependency.
- **Reduced motion**: already handled — `index.css:620` sets `.live-dot::after { animation: none }`, leaving a static primary dot. The dot's meaning survives because it is paired with the word "processing". The panel entrance collapses to `duration: 0`.
- **Perf**: `transform` + `opacity`. `.live-dot::after` is `position: absolute; inset: 0`, so its `scale(2.6)` overflows without reflowing the heading row. One caveat: it is an infinite animation on a page that may sit open for minutes — it is a 8×8px composited layer, which is the cheapest possible way to say "still working", and it is exactly the element the codebase already uses for that.
