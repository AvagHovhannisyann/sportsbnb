/**
 * microKit — the shared vocabulary for the micro-interaction family.
 *
 * Not a composition. This is the brand palette, the timing table, the loop
 * math and the surface recipes that the 25 pieces in this folder import so
 * that every spec sheet in the set is measured against the same ruler.
 *
 * WHAT THIS FAMILY IS FOR
 * ----------------------------------------------------------------------
 * The other five families are footage. This one is documentation. Each
 * composition shows exactly one interaction, at the timing the app is
 * supposed to ship, so that a developer can step through it frame by frame
 * and read the numbers off the screen. Every file header states the CSS or
 * framer-motion equivalent — properties, duration in ms, easing — and what
 * the `prefers-reduced-motion: reduce` version of that interaction is.
 *
 * At 60fps one frame is 16.667ms, so a 150ms feedback gesture is nine frames.
 * That is the whole reason this family renders at 60 rather than 30: a
 * 120ms press acknowledgement is seven frames at 60 and four at 30, and four
 * frames is not enough to read a curve off.
 *
 * TIMINGS ARE THE REAL ONES
 * ----------------------------------------------------------------------
 * Nothing here is slowed down to look good on video. 150/250/400ms are
 * `--dur-fast` / `--dur-base` / `--dur-slow` from `src/index.css:138-140`, and
 * the per-case numbers come from `docs/MOTION-DESIGN-CASES.md`. Every
 * composition instead takes a `speed` prop defaulting to `1`, which scales
 * the clock: `speed: 0.25` walks the interaction at quarter pace for
 * inspection. Two consequences, stated because they are easy to trip over:
 *   - the ms readout on the timeline always shows *spec* milliseconds, not
 *     wall-clock ones, so it stays truthful at any speed;
 *   - a looping composition is only seamless at the `durationInFrames` it is
 *     registered with. Halve `speed`, double `durationInFrames`.
 */

import { useEffect, useState, type CSSProperties } from "react";
import { Easing, interpolate } from "remotion";

/* ───────────────────────────── brand tokens ────────────────────────────── */

/**
 * Lifted from the `.dark` block of `src/index.css` ("Court at night"), which
 * is the theme the app ships — `index.html` carries `class="dark"`. Written in
 * comma form because Remotion's colour helpers parse `hsl(h, s%, l%)` rather
 * than the space-separated Level-4 syntax the stylesheet uses inside
 * `hsl(var(--token))`.
 */
export const BRAND = {
  /** --background: 160 22% 5% */
  background: "hsl(160, 22%, 5%)",
  /** --surface-1: 160 18% 10% */
  surface1: "hsl(160, 18%, 10%)",
  /** --surface-2: 160 15% 14% */
  surface2: "hsl(160, 15%, 14%)",
  /** --surface-3: 158 13% 18% */
  surface3: "hsl(158, 13%, 18%)",
  /** --card: 160 15% 13% */
  card: "hsl(160, 15%, 13%)",
  /** --popover: 160 16% 12% */
  popover: "hsl(160, 16%, 12%)",
  /** --border: 157 12% 22% */
  border: "hsl(157, 12%, 22%)",
  /** --border-strong: 155 10% 26% */
  borderStrong: "hsl(155, 10%, 26%)",
  /** --border-interactive: 157 12% 42% */
  borderInteractive: "hsl(157, 12%, 42%)",
  /** --input: 157 12% 17% */
  input: "hsl(157, 12%, 17%)",
  /** --accent: 158 14% 14% — the ghost/outline hover fill */
  accent: "hsl(158, 14%, 14%)",
  /** --muted: 158 13% 13% */
  muted: "hsl(158, 13%, 13%)",
  /** --primary / --ring: 151 90% 47% — electric court green */
  primary: "hsl(151, 90%, 47%)",
  /** --primary-foreground: 160 25% 5% — the ink on a primary fill */
  primaryForeground: "hsl(160, 25%, 5%)",
  /** --primary-soft: 155 45% 12% */
  primarySoft: "hsl(155, 45%, 12%)",
  /** --foreground: 100 20% 96% — chalk white */
  foreground: "hsl(100, 20%, 96%)",
  /** --foreground-soft: 130 8% 72% */
  foregroundSoft: "hsl(130, 8%, 72%)",
  /** --muted-foreground: 130 8% 64% */
  mutedForeground: "hsl(130, 8%, 64%)",
  /** --success: 151 80% 44% */
  success: "hsl(151, 80%, 44%)",
  /** --warning: 42 95% 55% */
  warning: "hsl(42, 95%, 55%)",
  /** --destructive: 358 72% 68% — the *text* value, not the fill */
  destructive: "hsl(358, 72%, 68%)",
  /** --destructive-solid: 358 68% 42% — the fill behind white text */
  destructiveSolid: "hsl(358, 68%, 42%)",
  /** --chart-2: 190 80% 50% */
  cyan: "hsl(190, 80%, 50%)",
  /** --chart-4: 268 80% 76% */
  violet: "hsl(268, 80%, 76%)",
} as const;

export const courtGreen = (alpha: number): string =>
  `hsla(151, 90%, 47%, ${alpha})`;
export const chalk = (alpha: number): string => `hsla(100, 20%, 96%, ${alpha})`;
export const ink = (alpha: number): string => `hsla(160, 30%, 2%, ${alpha})`;
export const hairline = (alpha: number): string =>
  `hsla(157, 12%, 22%, ${alpha})`;
export const cyan = (alpha: number): string => `hsla(190, 80%, 50%, ${alpha})`;
export const amber = (alpha: number): string => `hsla(42, 95%, 55%, ${alpha})`;
export const rose = (alpha: number): string => `hsla(358, 72%, 68%, ${alpha})`;
export const roseSolid = (alpha: number): string =>
  `hsla(358, 68%, 42%, ${alpha})`;
export const mutedInk = (alpha: number): string => `hsla(130, 8%, 64%, ${alpha})`;

/**
 * `--radius: 0.875rem` = 14px, and Tailwind's `rounded-lg` maps to it
 * (`tailwind.config.ts` borderRadius block). `rounded-md` is `--radius - 4px`,
 * `rounded-sm` is `--radius - 6px`, `rounded-xl` is `+4px`.
 */
export const RADIUS = { sm: 8, md: 10, lg: 14, xl: 18, xl2: 22 } as const;

/* ───────────────────────────────── type ────────────────────────────────── */

/**
 * The system tails of `--font-display` / `--font-sans` / `--font-mono`. The
 * webfont heads (Space Grotesk, DM Sans, JetBrains Mono, Noto Sans Armenian)
 * are deliberately dropped: `src/index.css` pulls them from Google Fonts and a
 * headless render cannot reach the network. Nothing in this folder loads a
 * font, an image or a byte from anywhere.
 */
export const DISPLAY_FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const SANS_FONT =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

/* ──────────────────────────────── easing ───────────────────────────────── */

/** `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` — every arrival. */
export const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
/** `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` — ~10% overshoot. */
export const EASE_SPRING = Easing.bezier(0.34, 1.56, 0.64, 1);
/** `cubic-bezier(0.4, 0, 1, 1)` — the exit curve. Leaving is faster. */
export const EASE_IN = Easing.bezier(0.4, 0, 1, 1);
/**
 * `cubic-bezier(0.4, 0, 0.2, 1)` — Tailwind's default `ease-in-out`, which is
 * what `transition-transform` on `ui/switch.tsx:20` actually runs. Case 96 is
 * explicit that the switch thumb keeps this curve and is *not* re-curved to
 * `--ease-out-expo`: a thumb should not overshoot its own track.
 */
export const EASE_STANDARD = Easing.bezier(0.4, 0, 0.2, 1);
/** `cubic-bezier(0.2, 0.8, 0.2, 1)` — case 10's press/release curve. */
export const EASE_SNAP = Easing.bezier(0.2, 0.8, 0.2, 1);
/** No curve at all. Case 94's label crossfade is explicitly `linear`. */
export const EASE_LINEAR = Easing.linear;

/**
 * `--dur-fast: 150ms`, `--dur-base: 250ms`, `--dur-slow: 400ms`, in ms —
 * everything in this folder is written in milliseconds and converted at the
 * point of use, because milliseconds are what a developer types into CSS.
 */
export const DUR_MS = { fast: 150, base: 250, slow: 400 } as const;

/** Feedback band and entrance band, as stated in the family brief. */
export const BAND_MS = {
  feedbackMin: 150,
  feedbackMax: 250,
  entranceMin: 300,
  entranceMax: 500,
} as const;

export const TAU = Math.PI * 2;

/* ─────────────────────────────── conversion ────────────────────────────── */

export const msToFrames = (ms: number, fps: number): number =>
  (ms / 1000) * fps;

export const framesToMs = (frames: number, fps: number): number =>
  (frames / fps) * 1000;

/* ──────────────────────────────── numbers ──────────────────────────────── */

/**
 * `interpolate` with both extrapolations clamped and an optional easing.
 *
 * Remotion's default is `extend`, which runs a value past the end of its range
 * — the usual cause of an opacity of 1.3 or a negative radius when the driver
 * is a wrapped cycle rather than a raw frame. Clamping is what every call in
 * this folder wants, so it is the default here rather than four extra lines at
 * each site.
 */
export const interpolateSafe = (
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  easing?: (value: number) => number,
): number =>
  interpolate(input, inputRange as number[], outputRange as number[], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Positive modulo — the backbone of every cycle in this folder. */
export const wrap = (value: number, period: number): number =>
  ((value % period) + period) % period;

export const clamp01 = (value: number): number =>
  value < 0 ? 0 : value > 1 ? 1 : value;

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Hermite smoothstep. Pure, so it stays loop-safe when fed a periodic input. */
export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/**
 * Deterministic unit noise. Compositions must render identically on every
 * machine and every frame, so `Math.random()` is never used — any scatter in
 * this folder comes from here.
 */
export const hashUnit = (index: number, seed = 1): number => {
  const x = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* ────────────────────────────── the ms window ──────────────────────────── */

/**
 * Progress through a CSS transition written in milliseconds.
 *
 * `progress(frame, fps, 350, 200, EASE_OUT_EXPO)` is "a 200ms transition that
 * starts 350ms into the composition, on `--ease-out-expo`" — i.e. exactly what
 * `transition: transform 200ms var(--ease-out-expo) 350ms` does. Returns 0
 * before the window and 1 after it, so it composes into a resting value.
 *
 * `durationMs: 0` is legal and means *instant*: 0 up to the mark, 1 from the
 * mark. Case 95 needs that — a focus ring must be at full strength on the
 * frame focus lands, and "0ms" is a real, deliberate timing value, not a
 * missing one.
 */
export const progress = (
  frame: number,
  fps: number,
  startMs: number,
  durationMs: number,
  easing?: (value: number) => number,
): number => {
  const start = msToFrames(startMs, fps);
  if (durationMs <= 0) return frame >= start ? 1 : 0;
  return interpolateSafe(frame, [start, start + msToFrames(durationMs, fps)], [0, 1], easing);
};

/* ───────────────────────── loop primitive: toggleCycle ─────────────────── */

export type ToggleCycleArgs = {
  /** Composition frame, already scaled by `speed` and reduced-motion-frozen. */
  frame: number;
  fps: number;
  /** Loop length in frames. Must exceed `offAtMs + offDurMs`. */
  period: number;
  /** When the pointer/focus arrives, and how long the in-transition runs. */
  onAtMs: number;
  onDurMs: number;
  /** When it leaves, and how long the out-transition runs. */
  offAtMs: number;
  offDurMs: number;
  onEase?: (value: number) => number;
  offEase?: (value: number) => number;
  /** Frames to delay this element's cycle by — this is the stagger. */
  phase?: number;
};

/**
 * A 0 → 1 → 0 state cycle that is exactly zero at both ends of the period.
 *
 * SEAM MECHANISM. The value is `rise - fall`, two clamped interpolations.
 * At local frame 0 the rise has not started (clamped left ⇒ 0) and neither has
 * the fall (⇒ 0), so the value is 0. At local frame `period` — which is local
 * frame 0 of the next cycle — we are past the end of both windows, so the rise
 * is clamped right at 1 and the fall is clamped right at 1, and `1 - 1 = 0`.
 * Both ends are *exactly* zero, not approximately, so frame 0 and frame
 * `durationInFrames` are the same picture and the loop has no seam. The only
 * requirement is `period > msToFrames(offAtMs + offDurMs)`, which every caller
 * in this folder satisfies with room to spare; `toggleCycleSettleFrames` below
 * is there to check it.
 *
 * This is what a hover, a press, a focus or a checked state *is* in CSS: one
 * property, two transitions, different durations in each direction. There is
 * no one-way tween anywhere in it.
 */
export const toggleCycle = ({
  frame,
  fps,
  period,
  onAtMs,
  onDurMs,
  offAtMs,
  offDurMs,
  onEase,
  offEase,
  phase = 0,
}: ToggleCycleArgs): number => {
  const local = wrap(frame - phase, period);
  const rise = progress(local, fps, onAtMs, onDurMs, onEase);
  const fall = progress(local, fps, offAtMs, offDurMs, offEase);
  return rise - fall;
};

/** The frame from which a `toggleCycle` is back at exactly zero. */
export const toggleCycleSettleFrames = (
  fps: number,
  offAtMs: number,
  offDurMs: number,
): number => msToFrames(offAtMs + offDurMs, fps);

/* ───────────────────────── loop primitive: stepCycle ───────────────────── */

export type StepCycle = {
  /** The index being travelled away from. */
  from: number;
  /** The index being travelled to — the selected one for the whole step. */
  to: number;
  /** 0 → 1 travel progress within this step. */
  t: number;
  /** Local frame within the current step. Useful for a per-step sub-gesture. */
  localFrame: number;
};

/**
 * The lattice a tab rail, a radio group, a segmented control or a keyboard
 * traversal runs on: `count` positions, each held for `period / count` frames,
 * wrapping back to the first.
 *
 * SEAM MECHANISM. Step `i` *begins* by travelling from `i - 1` to `i`. So at
 * local frame 0 the travel from index `count - 1` to index `0` is at `t = 0`,
 * which paints the indicator at position `count - 1`. At local frame
 * `period - ε` we are at the end of step `count - 1`, where that step's travel
 * finished long ago and the indicator is settled at position `count - 1`. The
 * two agree, so frame 0 === frame `period` and the loop closes. The selected
 * index also wraps, so no state is left dangling.
 *
 * Callers interpolate their own geometry with `mix(pos[from], pos[to], t)`.
 */
export const stepCycle = (
  frame: number,
  fps: number,
  period: number,
  count: number,
  travelMs: number,
  easing?: (value: number) => number,
): StepCycle => {
  const stepFrames = period / count;
  const local = wrap(frame, period);
  const index = Math.min(count - 1, Math.floor(local / stepFrames));
  const localFrame = local - index * stepFrames;
  return {
    from: (index - 1 + count) % count,
    to: index,
    t: progress(localFrame, fps, 0, travelMs, easing),
    localFrame,
  };
};

/**
 * A square wave that is high for the first half of each `periodMs` and low for
 * the second. Text carets are the only thing in this folder that blinks; CSS
 * does it with `animation: caret 1s step-end infinite`, and a step function is
 * seamless for free as long as the composition period is a whole multiple of
 * the blink period.
 */
export const squareWave = (
  frame: number,
  fps: number,
  periodMs: number,
): number => (wrap(frame, msToFrames(periodMs, fps)) < msToFrames(periodMs / 2, fps) ? 1 : 0);

/**
 * One full turn per `periodMs`, in degrees. Seamless because 0° and 360° are
 * the same picture — this is the `animate-spin` in `ui/button.tsx`'s pending
 * state, which Tailwind runs at `1s linear infinite` and case 94 says
 * explicitly not to re-time.
 */
export const spinDegrees = (
  frame: number,
  fps: number,
  periodMs = 1000,
): number => (wrap(frame, msToFrames(periodMs, fps)) / msToFrames(periodMs, fps)) * 360;

/* ────────────────────────── reduced motion, live ───────────────────────── */

/**
 * `(prefers-reduced-motion: reduce)`, live.
 *
 * Headless Chrome reports `no-preference`, so a `remotion render` is
 * unaffected; a viewer who has asked their OS to calm things down and then
 * meets one of these embedded in the app gets a still frame. For this family
 * it matters twice over — the compositions are *about* what reduced motion
 * should do, so they had better honour it themselves.
 */
export const usePrefersReducedMotion = (): boolean => {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState<boolean>(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const list = window.matchMedia(query);
    const onChange = () => setReduced(list.matches);
    onChange();
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, []);

  return reduced;
};

/**
 * The frame a composition should animate against, after `speed` scaling and
 * after reduced motion.
 *
 * `settleAt` is what reduced motion freezes on. Loops pass `0` — the frame the
 * cycle both opens and closes on, so the resting state is what shows and
 * nothing is hidden. One-way pieces pass their last frame, because their *end*
 * is the state that carries the message ("saved", "3 unread", "invalid
 * email"); freezing those at 0 would show a control mid-gesture or an empty
 * component.
 */
export const useSpecFrame = (
  rawFrame: number,
  speed: number,
  settleAt: number,
): number => {
  const reduced = usePrefersReducedMotion();
  return reduced ? settleAt : rawFrame * speed;
};

/* ───────────────────────────── surface recipes ─────────────────────────── */

export type ShadowLevel = "none" | "xs" | "sm" | "base" | "md" | "lg" | "xl";

/**
 * The dark-theme `--shadow-*` ladder from `src/index.css:221-226`, as
 * `{ y, blur, spread, alpha }` pairs. Kept as data rather than strings so the
 * hover specs can interpolate between two rungs the way CSS interpolates
 * `box-shadow` — component by component — instead of cross-fading two stacked
 * shadows, which double-darkens at the midpoint.
 */
const SHADOW_LADDER: Record<
  ShadowLevel,
  readonly { y: number; blur: number; spread: number; alpha: number }[]
> = {
  none: [{ y: 0, blur: 0, spread: 0, alpha: 0 }],
  xs: [{ y: 1, blur: 2, spread: -1, alpha: 0.4 }],
  sm: [
    { y: 2, blur: 4, spread: -1, alpha: 0.5 },
    { y: 1, blur: 2, spread: -1, alpha: 0.4 },
  ],
  base: [
    { y: 4, blur: 8, spread: -2, alpha: 0.55 },
    { y: 2, blur: 4, spread: -2, alpha: 0.4 },
  ],
  md: [
    { y: 8, blur: 16, spread: -4, alpha: 0.6 },
    { y: 3, blur: 6, spread: -3, alpha: 0.45 },
  ],
  lg: [
    { y: 16, blur: 32, spread: -8, alpha: 0.65 },
    { y: 6, blur: 12, spread: -4, alpha: 0.5 },
  ],
  xl: [
    { y: 24, blur: 48, spread: -12, alpha: 0.7 },
    { y: 10, blur: 20, spread: -6, alpha: 0.55 },
  ],
};

const layerAt = (level: ShadowLevel, i: number) => {
  const layers = SHADOW_LADDER[level];
  return layers[Math.min(i, layers.length - 1)];
};

/**
 * Blend two rungs of the ladder, component-wise, exactly as a CSS
 * `transition: box-shadow` between two `--shadow-*` values would. This is what
 * the hover and card-lift specs need: a shadow that *grows*, with one paint
 * per frame rather than two stacked ones.
 */
export const shadowBlend = (
  unit: number,
  from: ShadowLevel,
  to: ShadowLevel,
  t: number,
): string => {
  const count = Math.max(SHADOW_LADDER[from].length, SHADOW_LADDER[to].length);
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const a = layerAt(from, i);
    const b = layerAt(to, i);
    const y = mix(a.y, b.y, t) * unit;
    const blur = mix(a.blur, b.blur, t) * unit;
    const spread = mix(a.spread, b.spread, t) * unit;
    const alpha = mix(a.alpha, b.alpha, t);
    parts.push(`0 ${y}px ${blur}px ${spread}px ${ink(alpha)}`);
  }
  return parts.join(", ");
};

/** One rung of the ladder, scaled to the canvas. */
export const shadow = (unit: number, level: ShadowLevel): string =>
  shadowBlend(unit, level, level, 0);

/** `.panel` / `.surface-card` — the card the demos sit on. */
export const cardSurface = (unit: number, radiusPx = RADIUS.lg): CSSProperties => ({
  backgroundColor: BRAND.card,
  border: `${1 * unit}px solid ${BRAND.border}`,
  borderRadius: radiusPx * unit,
  boxShadow: shadow(unit, "lg"),
});

/** `.eyebrow` — mono caps, 0.2em tracking, court green. */
export const eyebrowStyle = (unit: number, size = 11): CSSProperties => ({
  fontFamily: MONO_FONT,
  fontSize: size * unit,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: 0.2 * size * unit,
  color: BRAND.primary,
});

/** `.stat-numeral` — mono, tabular, slightly tightened. */
export const numeralStyle = (unit: number, size: number): CSSProperties => ({
  fontFamily: MONO_FONT,
  fontVariantNumeric: "tabular-nums",
  fontSize: size * unit,
  letterSpacing: -0.02 * size * unit,
  color: BRAND.foreground,
});

/**
 * `--shadow-ring-primary: 0 0 0 4px hsl(var(--primary) / 0.18)`, plus the 2px
 * offset ring `focus-visible:ring-2 ring-offset-2` paints against the page.
 * `strength` is the ring's own opacity; `offset` is how far the gap has grown,
 * which is the *only* part case 95 allows to animate.
 */
export const focusRing = (
  unit: number,
  strength: number,
  offset = 2,
): string =>
  strength <= 0
    ? "none"
    : `0 0 0 ${offset * unit}px ${BRAND.background}, 0 0 0 ${(offset + 2) * unit}px ${courtGreen(strength)}, 0 0 0 ${(offset + 6) * unit}px ${courtGreen(0.18 * strength)}`;
