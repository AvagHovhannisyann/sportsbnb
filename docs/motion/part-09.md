## Auth: login, signup, reset

Scope: the five real auth routes in `src/App.tsx:219-222,201` —
`/login` (`src/pages/LoginPage.tsx`), `/signup` (`src/pages/SignupPage.tsx`),
`/forgot-password` (`src/pages/ForgotPasswordPage.tsx`), `/reset-password`
(`src/pages/ResetPasswordPage.tsx`) and `/auth/callback`
(`src/pages/AuthCallbackPage.tsx`). All five are `lazy()` (`App.tsx:46-49,63`)
behind the `PageLoader` spinner at `App.tsx:111-115`.

### What this section is built from

**The real state machines.** Nothing here is invented; these are the branches
the components already render.

```
/login          LoginPage.tsx:324  magicLinkSent ? … : mfaRequired ? … : form
                          :518     within the form card, authMode "password" | "magic-link"
                          :53-54   magicLinkSent, resendCooldown (30 → 0, 1000ms tick at :77-82)
                          :59-62   mfaRequired, mfaFactorId, totpCode, isVerifyingMfa
/signup         SignupPage.tsx:504 password strength block, mounted only when formData.password
                          :570     "Passwords match" line, mounted on equality
                          :385-426 RadioGroup player | owner
/forgot         ForgotPasswordPage.tsx:91   isEmailSent ? sent panel : form
/reset          ResetPasswordPage.tsx:148   isSuccess ? panel : form, then signOut+navigate at :105-108 (3000ms)
/auth/callback  AuthCallbackPage.tsx:108,114,122  loading | success | error, redirects at 1500ms / 3000ms
```

**Motion tokens** — `src/index.css:135-140`: `--ease-out-expo:
cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-spring: cubic-bezier(0.34, 1.56, 0.64,
1)`, `--dur-fast: 150ms`, `--dur-base: 250ms`, `--dur-slow: 400ms`.

**Brand.** Dark ships (`index.html:2` is `class="dark"`). `--primary: 151 90%
47%`, `--destructive: 358 72% 68%`, `--success: 151 80% 44%`, `--warning: 42 95%
55%`, `--radius: 0.875rem` (`index.css:172,188,192-193,89`);
`--shadow-ring-primary: 0 0 0 4px hsl(var(--primary) / 0.18)` (`index.css:228`).
`/forgot-password` and `/reset-password` put their left panel in
`.surface-invert` (`index.css:301-314`), which flips the tokens to their light
values — any colour animation on those two pages must be written in tokens, not
literals, or it inverts wrongly.

**Typography is already unified, the transitions are not.** `.auth-hero-title`
and `.auth-form-title` (`index.css:496-502`) exist precisely because "the form
heading changes size *within* a page" — the comment at `index.css:479-483`
names /login swapping "Welcome back" for "Check your email" for "Two-factor
authentication" in one slot. The size drift was fixed; the swap is still a
single frame with no transition, which is what cases 73-75 address.

**What already animates on these pages**, so nothing below re-authors it:
`Button` carries `transition-all duration-200` plus `active:scale-[0.98]`
(`src/components/ui/button.tsx:8`); `Input` carries `transition-all` and
`focus-visible:ring-4 focus-visible:ring-primary/12`
(`src/components/ui/input.tsx:11,15`), though the auth pages override the focus
edge with their own `border-2 focus:border-primary transition-colors`
(e.g. `LoginPage.tsx:531`) — Tailwind's default 150ms `cubic-bezier(0.4, 0, 0.2,
1)`; `Progress`'s indicator is `transition-all` over `transform: translateX(-N%)`
(`src/components/ui/progress.tsx:22-25`); `InputOTPSlot` has `transition-all`
and an `animate-caret-blink` fake caret
(`src/components/ui/input-otp.tsx:35,44`). `tailwindcss-animate` is registered
(`tailwind.config.ts:158`), so `animate-in fade-in-0 zoom-in-95
slide-in-from-*` and `animate-caret-blink` are available with no new CSS.
`fade-in` (`opacity 0→1`, `translateY(8px)→0`, 400ms) and `shimmer` are in
`tailwind.config.ts:110-123`.

**framer-motion `^12.34.3` is installed** and imported by four files, including
the shared vocabulary `src/lib/motion.ts` (`easeOutExpo = [0.16, 1, 0.3, 1]`,
`transitionFast` 150ms / `transitionBase` 250ms, `fadeUp`, `scaleIn`,
`staggerChildren`, `tapScale`). Cost note that matters here: `HomePage` is
**eagerly** imported (`App.tsx:20`) and imports framer-motion
(`HomePage.tsx:11`), so the library is already in the initial bundle before
anyone reaches `/login` — a `motion` import in an auth chunk adds no download.
`useReducedMotion()` is already the repo's pattern (`HomePage.tsx:83`).
**Remotion is not a dependency**; nothing here proposes it.

**Reduced motion today** covers exactly two selectors —
`index.css:619-630`, `.live-dot::after { animation: none }` and `.card-lift`.
Every fallback below either extends that block or branches on
`useReducedMotion()`. Note that none of the transitions listed above are
currently covered by it: the auth pages ship `transition-colors`,
`transition-all` and `animate-spin` that a reduce user still sees.

---

### 73. The /login panel is three screens in one slot **[HIGH IMPACT]**

- **Where**: `/login`, the top-level ternary in `src/pages/LoginPage.tsx:324-632` — sign-in form (`:419-631`), "Check your email" (`:334-365`), "Two-factor authentication" (`:368-418`). All three render into the same `div.w-full.max-w-md` at `:322`.
- **Motion**: Today the panel is replaced in one frame: press "Send magic link" and a 640px-tall card with three OAuth buttons, a divider and two fields becomes a 300px centred block with a tick. Nothing tells the user whether they went forward, backward, or lost the form. Give the slot a direction. Forward (form → magic-link-sent, form → MFA): outgoing panel `opacity 1 → 0` and `translateX(0 → -24px)`; incoming `opacity 0 → 1`, `translateX(24px → 0)`. Backward — the "Back to login" buttons at `:326-332` and `:369-375`, both of which call `handleBackToLogin` (`:210-216`) and *sign the user out* — runs the same motion mirrored, incoming from `-24px`. The user understands that the credentials screen was not destroyed, it was stepped away from, and that the back arrow returns to the same place it left.
- **Timing**: exit 150ms `cubic-bezier(0.16, 1, 0.3, 1)`, enter 250ms same curve, enter delayed 120ms so the two do not overlap into a cross-dissolve mush. These are `--dur-fast` / `--dur-base` verbatim (`index.css:138-139`).
- **Build**: framer-motion `<AnimatePresence mode="wait">` around the ternary, one `motion.div` per branch keyed `"form" | "magic" | "mfa"`, direction from a `useRef` holding the previous key. `mode="wait"` is the reason to reach for the library rather than CSS: the three branches have very different heights and must not be in flow simultaneously. Reuse `transitionFast` / `transitionBase` from `src/lib/motion.ts:24-25`.
- **Reduced motion**: `useReducedMotion()` → `initial={false}` on `AnimatePresence` and both variants collapse to `{ opacity: 1, x: 0 }` with `duration: 0`. The panel swaps instantly, exactly as it does today; the focus move below still happens because it is not motion.
- **Perf**: `transform` + `opacity` only. Two real risks, both nameable. (1) The parent at `:321` is `flex items-center justify-center`, so the wrapper's height change still reflows that one centred column — acceptable at this scale, but do **not** animate `height` on top of it. (2) During the 120ms overlap gap the slot is empty, so the card visibly recentres; pin a `min-height` on the `max-w-md` wrapper for the duration, or accept the settle. **Why this one**: it is the single highest-traffic signed-out surface in the app, it is the only place where a user is silently signed out by a "Back" control (`:215`), and it is the defect the codebase already documented at `index.css:479-483` and only half-fixed.

### 74. Password ↔ magic-link, inside the card

- **Where**: `/login`, `authMode` (`src/pages/LoginPage.tsx:51`) switching the two forms at `:518-614`, driven by the "Send Magic Link" button at `:495-504` and the "Sign in with password instead" link at `:556-562`.
- **Motion**: This swap removes or adds the entire password field group (`:583-603`) — roughly 92px of the card. Today the card jumps and every button below it teleports. Animate the card's height from its measured old value to its new one while the departing field group fades `opacity 1 → 0` and the arriving one fades in, both without translation. Height is the whole point: the user understands that one field was added or removed from a form they are still in, rather than that the form was replaced. Keep the shared email field mounted and untouched — it is the same input with the same value (`:529,575`), and anything it does during the swap says otherwise.
- **Timing**: height 260ms `cubic-bezier(0.16, 1, 0.3, 1)`; the field group's opacity 150ms `linear`, out first, in on completion.
- **Build**: framer-motion `<motion.div layout>` on the card at `:445` with `<AnimatePresence mode="wait">` inside. Hand-rolled CSS height animation needs a measured pixel value and a `ResizeObserver`; `layout` does the FLIP for free and is already paid for (case-preamble bundle note).
- **Reduced motion**: `useReducedMotion()` → drop the `layout` prop entirely and render the swap instantly. Do not leave `layout` on with `duration: 0` — it still runs a measure pass each render for no visible benefit.
- **Perf**: this is the one case in the section that is *not* transform-only. `layout` animates via `transform: scaleY` and counter-scales children, so it composites, but it forces a layout read on every swap. It is a single card, on user click, at most a few times per session — bounded and worth it. Do **not** extend the same treatment to `/signup`, whose card is twice as tall and whose strength block (case 77) changes height on every keystroke.

### 75. The six OTP slots, and arming the verify button

- **Where**: `/login`, MFA branch — `InputOTP` at `src/pages/LoginPage.tsx:389-402` over `src/components/ui/input-otp.tsx:24-50`, and the gated Button at `:405-412` (`disabled={totpCode.length !== 6 || isVerifyingMfa}`).
- **Motion**: Three linked pieces. (1) On each digit, that slot's character enters `opacity 0 → 1` with `scale(0.8) → 1` — the slot confirms it took the character, which matters when a 6-digit code is pasted or typed fast. (2) The active slot's `ring-2 ring-ring` (`input-otp.tsx:36`) currently appears through an undurated `transition-all`; give it 120ms so the ring reads as *moving* left-to-right across the group rather than blinking in six places. (3) When the sixth digit lands, the Verify button crosses from `disabled:opacity-50` (`button.tsx:8`) to full with a 220ms `box-shadow: var(--shadow-ring-primary)` pulse that decays to none. The user understands the code is complete before reading the button label — the common failure here is typing five digits and pressing a dead button.
- **Timing**: character 140ms `cubic-bezier(0.34, 1.56, 0.64, 1)` (`--ease-spring`, `index.css:137` — the slight overshoot reads as a key press); ring 120ms `cubic-bezier(0.16, 1, 0.3, 1)`; button arm 220ms `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Build**: CSS/Tailwind. Add `duration-150` to the slot's existing `transition-all`, and one keyframe pair in the `@layer components` block of `index.css`; the character animation keys off `char` becoming non-empty, which is a class toggle in `InputOTPSlot`, not a new library. `input-otp` already supplies `hasFakeCaret` / `isActive` (`input-otp.tsx:29`).
- **Reduced motion**: extend `index.css:619-630` with `.animate-caret-blink { animation: none; }` (the caret at `input-otp.tsx:44` is a 1000ms blink that reduce users currently still get), slot character transitions to `none`, and the button's arming pulse replaced by the instant opacity change it already has. The ring is a focus indicator and must never be suppressed — it just stops being timed.
- **Perf**: `transform`, `opacity`, `box-shadow`. `box-shadow` is a paint, not a layout — on a 48px-tall button, once. The slot `scale` is on a 40×40 box with one glyph.

### 76. The 30-second resend cooldown, shown rather than counted

- **Where**: `/login`, "Check your email" panel — the resend Button at `src/pages/LoginPage.tsx:344-360`, `resendCooldown` set to 30 at `:131` and `:145`, decremented by the `setTimeout` at `:77-82`.
- **Motion**: The label already ticks `Resend in 30s … 29s …`, which is a number changing once a second and reads as a stopwatch the user is being made to watch. Add a depleting hairline: a 2px rule pinned to the bottom edge of the disabled outline button, `transform: scaleX(1) → scaleX(0)` with `transform-origin: left`, driven off the same `resendCooldown` value — `scaleX(resendCooldown / 30)`. The user understands *how much* waiting is left at a glance and when the button becomes live, without reading a number. On reaching 0 the rule is unmounted and the button's own 200ms `transition-all` (`button.tsx:8`) carries it from `disabled:opacity-50` to full.
- **Timing**: each step 1000ms `linear`, matching the real tick at `:79`. Linear is deliberate — it is a clock; easing it would misreport how much time is left mid-step.
- **Build**: CSS/Tailwind. `style={{ transform: 'scaleX(' + resendCooldown / 30 + ')' }}` on an absolutely-positioned `div` plus `transition-transform duration-1000 ease-linear`. React already re-renders on every tick, so there is no new state and no new dependency.
- **Reduced motion**: `transition: none` on the rule — it still steps down once per second (that is information, not decoration), it just does not glide. Nothing else changes; the numeric label at `:351` is unaffected and remains the accessible source of truth.
- **Perf**: `transform: scaleX` on a composited 2px layer, one change per second, inside a `relative` button — no reflow of the centred panel. Do **not** animate `width` here; the button is inside a `text-center` column and a width change on a child would relayout the block on every tick.

### 77. Password strength: the bar, the label, and the four ticks

- **Where**: `/signup`, `src/pages/SignupPage.tsx:504-534` — `Progress` at `:507`, the strength word at `:508-512`, the 2×2 requirement grid at `:514-532`, scored by the `useMemo` at `:58-76` in 20-point steps. The same block, differently built, is at `src/pages/ResetPasswordPage.tsx:213-225`.
- **Motion**: The bar already moves — `progress.tsx:23-25` transitions `translateX(-N%)` — but at Tailwind's default 150ms `cubic-bezier(0.4, 0, 0.2, 1)`, which for a 20-point jump lands flat and unnoticed. Retime it to 250ms `--ease-out-expo` so a keystroke that earns a criterion produces a visible advance. Then stage the tick: when a `checks.*` flips true (`:61-67`), its `X` → `Check` swap at `:522-526` scales `0.7 → 1` over 160ms and its label crossfades `text-muted-foreground → text-foreground` over 200ms, **delayed 120ms** behind the bar. The user understands *which* rule they just satisfied — the bar says "better", the tick says "because of this".
- **Timing**: bar 250ms `cubic-bezier(0.16, 1, 0.3, 1)`; tick 160ms `cubic-bezier(0.34, 1.56, 0.64, 1)`; label colour 200ms `cubic-bezier(0.16, 1, 0.3, 1)`; tick delay 120ms.
- **Build**: CSS/Tailwind. Swap `transition-all` for `transition-transform duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]` on the `Progress` indicator, or pass it through `className` at the call site so `progress.tsx` stays shared. One flag while in here, not a motion issue but adjacent: `ResetPasswordPage.tsx:223` passes `getStrengthColor()` (`bg-destructive` … `bg-green-500`) to `Progress`'s **Root**, so tailwind-merge overrides the `bg-surface-3` *track* while the indicator stays `bg-primary` — the wrong element is coloured. Do not animate a colour onto that class until it lands on the indicator.
- **Reduced motion**: extend `index.css:619-630` with a rule zeroing the indicator's transition, plus `useReducedMotion()`-free CSS for the ticks — `@media (prefers-reduced-motion: reduce) { [data-strength-tick] { transition: none; transform: none; } }`. The bar still jumps to its new value, the tick still turns green: both are state, and state must survive.
- **Perf**: `transform: translateX` on the indicator (already the mechanism at `progress.tsx:24`) and `transform: scale` on a 12px icon. No layout property. The block itself mounts and unmounts on `formData.password` becoming non-empty (`:504`) — that first mount does change page height, and is the one moment to leave un-animated rather than fight.

### 78. Player vs owner — the choice that changes the form

- **Where**: `/signup`, the `RadioGroup` at `src/pages/SignupPage.tsx:385-426`; the two visible controls are `Label`s at `:404-410` and `:418-424` (the radios are `peer sr-only`).
- **Motion**: Selecting a card is not cosmetic — it rewrites the next field's label and placeholder ("Full name"/"John Doe" → "Business name"/"My Sports Center", `:431,440`) and changes where submit lands (`/onboarding/player` vs `/owner-dashboard`, `:171-184`). Two coupled moves. (1) The chosen card's border goes `border-border-interactive → border-primary` and its fill `transparent → bg-primary/5` over 200ms, and its icon (`:408`, `:422`) scales `1 → 1.08` and back over 240ms — the existing `transition-all` at `:406` has no duration, so this is a retime, not a new mechanism. (2) The name field's `Label` text crossfades `opacity 1 → 0 → 1` over 2×120ms as the string changes. The user understands the second change was caused by the first, which is otherwise easy to miss because it happens 200px below the click.
- **Timing**: card 200ms `cubic-bezier(0.16, 1, 0.3, 1)`; icon 240ms `cubic-bezier(0.34, 1.56, 0.64, 1)`; label crossfade 120ms out / 120ms in, `linear`, starting 80ms after the card commits.
- **Build**: CSS/Tailwind. `duration-200` on the existing `peer-data-[state=checked]:` chain at `:406`/`:420`; the label crossfade is a `key={userType}` on the `Label` plus `animate-in fade-in-0 duration-150` from `tailwindcss-animate` (`tailwind.config.ts:158`).
- **Reduced motion**: colour and border still change (they are the selected state, and the `peer-focus-visible:ring-2` at `:406` must stay intact); the icon scale and the label crossfade drop to none via the shared `@media (prefers-reduced-motion: reduce)` block. The label's new text simply appears.
- **Perf**: `border-color` and `background-color` are paint-only on a 2-up grid; the icon `scale` is a 24px transform. No reflow — both cards keep their box.

### 79. Inline errors that do not shake, and one that celebrates

- **Where**: `/signup` — the per-field error paragraphs at `src/pages/SignupPage.tsx:447-449,468-470,535-537,567-569`, written by `validateField` on **every keystroke** (`:129-133`), plus the "Passwords match" line at `:570-574`. Same pattern at `ForgotPasswordPage.tsx:141-143` and `ResetPasswordPage.tsx:208-210,254-256`.
- **Motion**: Errors enter with `opacity 0 → 1` and `translateY(-4px) → 0` over 160ms, and the field's border crossfades to `--destructive` over the same 160ms. No shake, no bounce: `validateField` fires on keydown, so "Passwords don't match" appears the instant the first character of the confirmation is typed — an error that is *usually about to be resolved by the next keystroke*, and shaking the field for it is a punishment for typing. The positive counterpart earns more: "Passwords match" enters with `opacity 0 → 1`, `translateY(4px) → 0` **and** its `Check` icon scales `0.6 → 1` over 220ms on `--ease-spring`. The user understands the difference between "keep going" and "this one is done".
- **Timing**: error 160ms `cubic-bezier(0.16, 1, 0.3, 1)`; border colour 160ms, same curve (currently `transition-colors` at `:443` with no duration → 150ms default, so this is nearly a no-op and can be left alone if the 10ms is not worth the diff); match line 220ms `cubic-bezier(0.34, 1.56, 0.64, 1)`.
- **Build**: CSS/Tailwind — `animate-in fade-in-0 slide-in-from-top-1 duration-150` on the error `<p>`, `animate-in fade-in-0 slide-in-from-bottom-1 zoom-in-95 duration-200` on the match line, both from `tailwindcss-animate` (`tailwind.config.ts:158`). No JS, and nothing that needs the error to be in a presence tree.
- **Reduced motion**: `tailwindcss-animate`'s `animate-in` is not reduced-motion-aware by default — add `motion-reduce:animate-none` to each of the six sites. The text still appears and the border still turns red; only the 4px slide and the icon pop are removed.
- **Perf**: `transform` + `opacity`, but flag the real cost honestly — mounting an error `<p>` under a field pushes every field below it down by ~24px, and there is no transition on that reflow. It is a genuine layout shift on a form that validates per keystroke. If it becomes objectionable, reserve the line's height with `min-h-[1.25rem]` on the error slot rather than animating the shift; do not animate the container's height on a per-keystroke event.

### 80. Two confirmation panels, and the 3-second exit nobody sees coming

- **Where**: `/forgot-password`, `isEmailSent` panel at `src/pages/ForgotPasswordPage.tsx:91-112`; `/reset-password`, `isSuccess` panel at `src/pages/ResetPasswordPage.tsx:148-160` — which then calls `signOut()` and `navigate("/login")` from a `setTimeout` at `:105-108`, 3000ms later, with nothing on screen saying so.
- **Motion**: Both panels replace a form with a centred tick in one frame. Stage the entry so the eye lands in reading order: (1) the icon circle (`ForgotPasswordPage.tsx:93-95`, `ResetPasswordPage.tsx:150-152`) scales `0.6 → 1` over 380ms; (2) the `h2` and body copy rise `translateY(8px) → 0` with `opacity 0 → 1` starting at 140ms; (3) the actions last, at 280ms. On `/reset-password` add the missing piece — a 2px rule under the "Go to login" button depleting `scaleX(1) → scaleX(0)` over exactly the 3000ms the `setTimeout` runs. The user understands they are about to be moved *and signed out*, instead of having the page change under them mid-sentence.
- **Timing**: icon 380ms `cubic-bezier(0.34, 1.56, 0.64, 1)`; text stages 260ms `cubic-bezier(0.16, 1, 0.3, 1)` with a 140ms stagger; the redirect rule 3000ms `linear`, started in the same effect that arms the timeout so the two cannot drift.
- **Build**: CSS/Tailwind for the entrance (`animate-in fade-in-0 slide-in-from-bottom-2` with `delay-150` / `delay-300` on the two later stages — `tailwindcss-animate`, `tailwind.config.ts:158`). The countdown rule is a single `transition-transform duration-[3000ms] ease-linear` toggled by a `useState` flipped in the same `useEffect`. No framer-motion needed: these panels never animate *out*, they navigate away.
- **Reduced motion**: `motion-reduce:animate-none` on all three stages — the tick, the heading and the button appear together, instantly. The countdown rule keeps its 3000ms `transition` even under reduce, because it is a timer and removing it would leave the user with no warning at all; if that is judged too strict, replace it with a static "Redirecting in 3 seconds" line, but do not simply delete it.
- **Perf**: `transform` + `opacity` throughout; the countdown is `scaleX` on a composited 2px layer. Note the panel swap itself changes the centred column's height (form → short panel) and that reflow is not animated in this case — deliberately, since the user's next action is elsewhere on the page.

### 81. /auth/callback: a page that is 100% waiting

- **Where**: `/auth/callback`, `src/pages/AuthCallbackPage.tsx:105-131` — `loading` (`:108-113`), `success` (`:114-121`), `error` (`:122-130`). The success state holds for 1500ms before `navigate` (`:75,80-88`); the error states hold 3000ms (`:21,40,47,92,98`).
- **Motion**: This is where a magic-link click lands, and it currently offers a 48px `Loader2` on `animate-spin` (`:110`) against a bare background. Two changes. (1) The `loading` → `success` transition: the spinner scales `1 → 0.8` and fades out over 150ms, then the emerald tick circle (`:116-118`) scales `0.7 → 1` over 320ms in its place, and `message` crossfades in 200ms — the user understands the check that just completed *succeeded*, rather than seeing one round green thing replaced by another. (2) The `success` state's 1500ms dead wait gets the same depleting 2px rule as case 80, and the `error` state's 3000ms one too, under the "Redirecting to login..." line already at `:128`. Landing here from an email client is the most disorienting entry point in the app; a page that visibly counts down is a page that has not hung.
- **Timing**: spinner out 150ms `cubic-bezier(0.16, 1, 0.3, 1)`; tick in 320ms `cubic-bezier(0.34, 1.56, 0.64, 1)`; message 200ms `cubic-bezier(0.16, 1, 0.3, 1)`; the rules 1500ms / 3000ms `linear`, matching the real `setTimeout` values exactly — if either is retimed, both must move together.
- **Build**: CSS/Tailwind. The three states are already mutually exclusive JSX branches; `animate-in fade-in-0 zoom-in-95 duration-300` on the success and error blocks plus `animate-out fade-out-0 zoom-out-95 duration-150` on the spinner covers it via `tailwindcss-animate` (`tailwind.config.ts:158`). framer-motion would buy an exit animation this page does not need — it navigates away rather than unmounting into another state.
- **Reduced motion**: `motion-reduce:animate-none` on the state blocks, and the spinner's `animate-spin` (`:110`) swapped for a static `Loader2` at 60% opacity beside the existing message text — that `animate-spin` is uncovered by `index.css:619-630` today and is the most aggressive motion on any auth route. The countdown rules keep their linear transition for the same reason as case 80. Add `role="status" aria-live="polite"` to the message paragraph while here — the state change is currently announced to nobody.
- **Perf**: `transform` + `opacity` only; the whole page is one centred `text-center` block with at most three children, so even the swap costs nothing measurable. The countdown rule is `scaleX` on a composited layer, one transition per page visit.
