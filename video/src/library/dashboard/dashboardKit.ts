/**
 * dashboardKit — the shared vocabulary for the owner dashboard / earnings /
 * data family. Not a composition: brand tokens, chart accents, loop math,
 * exact-landing counters and the money formatter that the 25 pieces in this
 * folder import so /owner-dashboard, /owner/bookings, /owner/venues and the
 * payout surfaces all speak with one voice.
 */

import { useEffect, useState, type CSSProperties } from "react";
import { Easing, interpolate, spring } from "remotion";

/* ───────────────────────────── brand tokens ────────────────────────────── */

/**
 * Lifted verbatim from the `.dark` block of `src/index.css` ("Court at
 * night"), the theme the app actually ships. Written in comma form because
 * `interpolateColors` parses `hsl(h, s%, l%)` rather than the space-separated
 * Level-4 syntax the stylesheet uses inside `hsl(var(--token))`.
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
  /** --muted: 158 13% 13% */
  mutedSurface: "hsl(158, 13%, 13%)",
  /** --border: 157 12% 22% */
  border: "hsl(157, 12%, 22%)",
  /** --border-strong: 155 10% 26% */
  borderStrong: "hsl(155, 10%, 26%)",
  /** --border-interactive: 157 12% 42% */
  borderInteractive: "hsl(157, 12%, 42%)",
  /** --input: 157 12% 17% */
  input: "hsl(157, 12%, 17%)",
  /** --primary / --ring: 151 90% 47% — electric court green */
  primary: "hsl(151, 90%, 47%)",
  /** --primary-foreground: 160 25% 5% */
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
} as const;

/**
 * `--chart-1..5` from the same `.dark` block, in token order. These are the
 * hues the product's own charts use, so a composition dropped next to a real
 * Recharts panel reads as part of the same system.
 */
export const CHART = {
  /** --chart-1: 151 90% 47% */
  c1: "hsl(151, 90%, 47%)",
  /** --chart-2: 190 80% 50% */
  c2: "hsl(190, 80%, 50%)",
  /** --chart-3: 42 95% 55% */
  c3: "hsl(42, 95%, 55%)",
  /** --chart-4: 268 80% 76% */
  c4: "hsl(268, 80%, 76%)",
  /** --chart-5: 130 8% 64% */
  c5: "hsl(130, 8%, 64%)",
} as const;

/** The five chart hues as HSL triples, for alpha variants. */
export const CHART_HSL = [
  { h: 151, s: 90, l: 47 },
  { h: 190, s: 80, l: 50 },
  { h: 42, s: 95, l: 55 },
  { h: 268, s: 80, l: 76 },
  { h: 130, s: 8, l: 64 },
] as const;

export type Hsl = { h: number; s: number; l: number };

export const tone = (c: Hsl, alpha = 1): string =>
  `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha})`;

export const courtGreen = (alpha: number): string =>
  `hsla(151, 90%, 47%, ${alpha})`;
export const chalk = (alpha: number): string => `hsla(100, 20%, 96%, ${alpha})`;
export const ink = (alpha: number): string => `hsla(160, 22%, 5%, ${alpha})`;
export const hairline = (alpha: number): string =>
  `hsla(157, 12%, 22%, ${alpha})`;
export const cyan = (alpha: number): string => `hsla(190, 80%, 50%, ${alpha})`;
export const amber = (alpha: number): string => `hsla(42, 95%, 55%, ${alpha})`;
export const violet = (alpha: number): string =>
  `hsla(268, 80%, 76%, ${alpha})`;
export const rose = (alpha: number): string => `hsla(358, 72%, 68%, ${alpha})`;
export const muted = (alpha: number): string => `hsla(130, 8%, 64%, ${alpha})`;

/* ───────────────────────────────── type ────────────────────────────────── */

/**
 * The `--font-*` stacks of `src/index.css` with the webfont heads *named* but
 * not fetched — naming a family is not a network request, and a headless
 * render falls straight through to the system faces behind them.
 *
 * The tails end in FreeSans / FreeMono deliberately. Every price on this
 * family's surfaces is Armenian dram, and `֏` (U+058F) is absent from DejaVu
 * and Liberation but present in the GNU FreeFont families. CSS fallback is
 * per-glyph, so Latin still sets in the earlier face and only the dram sign
 * resolves at the tail. Same trick `OwnerPitch.tsx` already uses.
 */
export const DISPLAY_FONT =
  "'Space Grotesk', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'DejaVu Sans', 'Liberation Sans', 'FreeSans', sans-serif";
export const SANS_FONT =
  "'DM Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'DejaVu Sans', 'Liberation Sans', 'FreeSans', sans-serif";
export const MONO_FONT =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'DejaVu Sans Mono', 'Liberation Mono', 'FreeMono', monospace";

/** Inline noise tile — byte-identical to the one in `.glass::before`. */
export const NOISE_TILE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* ──────────────────────────────── motion ───────────────────────────────── */

/** `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`. */
export const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
/** `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` — the overshoot. */
export const EASE_SPRING = Easing.bezier(0.34, 1.56, 0.64, 1);
/** The "leaving" curve. Exits are always quicker than entrances. */
export const EASE_IN = Easing.bezier(0.4, 0, 1, 1);

/** `--dur-fast: 150ms`, `--dur-base: 250ms`, `--dur-slow: 400ms`, in seconds. */
export const DUR = { fast: 0.15, base: 0.25, slow: 0.4 } as const;

/** `STAT_STAGGER_STEP` in OwnerOverviewPage — 50ms between stat cards. */
export const STAT_STAGGER_STEP = 0.05;
/** `FEED_STAGGER_STEP` — 45ms between booking rows. */
export const FEED_STAGGER_STEP = 0.045;
/** `FEED_STAGGER_CAP` — past this index rows share the last delay. */
export const FEED_STAGGER_CAP = 8;

export const TAU = Math.PI * 2;

/**
 * Overdamped. Correct for a number: the response is monotonic, so a revenue
 * figure never overshoots its target and walks back.
 */
export const COUNT_SPRING = { damping: 200, mass: 1, stiffness: 100 } as const;
/** Underdamped — the small settle that makes a tile feel like it has mass. */
export const ENTER_SPRING = { damping: 15, mass: 0.85, stiffness: 130 } as const;
/** Tighter, for small elements that should not visibly wobble. */
export const REVEAL_SPRING = { damping: 18, mass: 0.7, stiffness: 150 } as const;
/** Monotonic draw — bars, rules, arcs. No ring-back on a measurement. */
export const DRAW_SPRING = { damping: 200, mass: 1, stiffness: 90 } as const;

/**
 * `interpolate` with both extrapolations clamped and an optional easing.
 *
 * Remotion's default is `extend`, which happily runs a value past the end of
 * its range — the usual cause of a bar taller than its axis or a negative
 * radius when the driver is a wrapped cycle rather than a raw frame.
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

/** Normalised loop position, `[0, 1)`. `loopT(0) === 0` and it never reaches 1. */
export const loopT = (frame: number, duration: number): number =>
  wrap(frame, Math.max(1, duration)) / Math.max(1, duration);

export const clamp01 = (value: number): number =>
  value < 0 ? 0 : value > 1 ? 1 : value;

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Hermite smoothstep. Pure, so it stays loop-safe when fed a periodic input. */
export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/**
 * One full cosine period across `t ∈ [0, 1)`, so the value at t = 0 and the
 * value the cycle would take at t = 1 are identical for any phase. This is the
 * only breathing curve used in this folder's loops.
 */
export const breathe = (t: number, phase = 0): number =>
  0.5 + 0.5 * Math.cos(TAU * t + phase);

/**
 * Deterministic unit noise. Compositions must render identically on every
 * machine and every frame, so `Math.random()` is never used — scatter, heat
 * values and phase offsets all come from this instead.
 */
export const hashUnit = (index: number, seed = 1): number => {
  const x = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * A deterministic series, for the handful of places that want plausible shape
 * rather than a specific figure. Chart *data* is prop-driven everywhere in
 * this folder; this exists for decoration (idle sparkline ghosts, heat-map
 * filler) where inventing per-render numbers would be the bug.
 */
export const deterministicSeries = (
  count: number,
  seed: number,
  min: number,
  max: number,
): number[] => {
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(min + (max - min) * hashUnit(i, seed));
  }
  return out;
};

/* ─────────────────────────── the loop-safe pulse ───────────────────────── */

/** Frames after the local cycle start at which the rise spring is at rest. */
const PULSE_RISE = 13;
/** Local frame at which the fall spring starts. */
const PULSE_HOLD = 20;
/** Frames the fall spring takes to settle. */
const PULSE_FALL = 15;
/** Local frame from which the pulse is exactly zero again. */
export const PULSE_SETTLED = PULSE_HOLD + PULSE_FALL;

export type PulseArgs = {
  /** Composition frame (already frozen if the viewer wants reduced motion). */
  frame: number;
  fps: number;
  /**
   * Loop length. Must exceed PULSE_SETTLED (35) for the pulse to close back to
   * exactly zero before the cycle wraps.
   */
  period: number;
  /** Frames to delay this element's cycle by — this is the stagger. */
  phase: number;
};

/**
 * A spring that rises with overshoot, holds, and settles back — the only shape
 * of spring that can live inside a seamless loop.
 *
 * `spring()` with an explicit `durationInFrames` short-circuits to `to` once
 * past it, and negative frames clamp to `from`. So local 0 gives `0 - 0 = 0`
 * and local ≥ PULSE_SETTLED gives `1 - 1 = 0`. Both ends are *exactly* zero,
 * so the value is continuous across the wrap.
 */
export const pulse = ({ frame, fps, period, phase }: PulseArgs): number => {
  const local = wrap(frame - phase, period);
  const rise = spring({
    frame: local,
    fps,
    config: { damping: 9, mass: 0.55, stiffness: 120 },
    durationInFrames: PULSE_RISE,
  });
  const fall = spring({
    frame: local,
    fps,
    delay: PULSE_HOLD,
    config: { damping: 26, mass: 1, stiffness: 120 },
    durationInFrames: PULSE_FALL,
  });
  return rise - fall;
};

/* ─────────────────────────── exact-landing counters ────────────────────── */

/** Expo-out, the curve `--ease-out-expo` approximates and `useCountUp` uses. */
export const expoOut = (t: number): number =>
  t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);

export type CountArgs = {
  /** Composition frame (already frozen if the viewer wants reduced motion). */
  frame: number;
  /** Where the figure starts. Non-zero when a refetch nudged it. */
  from: number;
  /** Where the figure ends. This exact value is returned on the last frame. */
  to: number;
  /** Frames before the count begins. */
  delay?: number;
  /** Frames the count takes. */
  duration?: number;
};

/**
 * The dashboard's count-up, ported frame-exactly from `useCountUp` in
 * `src/pages/owner/OwnerOverviewPage.tsx`.
 *
 * The last frame returns `to` itself rather than a rounded interpolation. That
 * is the whole point: a counter that settles on its own approximation is a
 * dashboard quietly reporting the wrong revenue. `expoOut` is asymptotic, so
 * without the short-circuit `֏1,620,000` would land on `֏1,618,418` and stay
 * there. The guard is not a nicety, it is the correctness of the figure.
 *
 * One-way by construction — never put this inside a loop.
 */
export const countTo = ({
  frame,
  from,
  to,
  delay = 0,
  duration = 60,
}: CountArgs): number => {
  if (frame <= delay) return from;
  if (frame >= delay + duration) return to;
  return from + (to - from) * expoOut((frame - delay) / duration);
};

/**
 * The same count as a `0 → 1` progress figure, so a bar, an arc and the
 * numeral above it are one motion rather than three that happen to agree.
 * Returns exactly 1 from `delay + duration` onwards.
 */
export const countProgress = ({
  frame,
  delay = 0,
  duration = 60,
}: {
  frame: number;
  delay?: number;
  duration?: number;
}): number => countTo({ frame, from: 0, to: 1, delay, duration });

/* ─────────────────────────────── money, exactly ────────────────────────── */

/**
 * Thousands separators, written out rather than delegated to
 * `toLocaleString()` — the glyph in the middle of "27,000" would otherwise
 * depend on the locale of whatever box is rendering. Matches `formatPrice` in
 * `src/lib/pricing.ts`.
 */
export const groupDigits = (value: number): string => {
  const digits = Math.round(Math.abs(value)).toFixed(0);
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ",";
    out += digits.charAt(i);
  }
  return (value < 0 ? "-" : "") + out;
};

/** `֏27,000` — dram sign, then comma groups, no space. As the app writes it. */
export const dram = (value: number): string => `֏${groupDigits(value)}`;

/** `֏1.6M` / `֏27k` — for axis ticks and tight tiles, never for a total. */
export const dramCompact = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}֏${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}֏${Math.round(abs / 1000)}k`;
  return `${sign}֏${Math.round(abs)}`;
};

/**
 * SportsBnB takes **zero commission**. The owner's payout is the price, full
 * stop — there is no fee line to subtract anywhere in this folder, and this
 * constant exists so that stays true by construction rather than by everyone
 * remembering.
 */
export const OWNER_SHARE = 1;

/** What the owner receives for a booking. Identity, deliberately. */
export const ownerPayout = (price: number): number => price * OWNER_SHARE;

/** The line the product uses when it states the deal. */
export const ZERO_COMMISSION_NOTE = "0% commission — you keep every dram";

/* ────────────────────────── reduced motion, live ───────────────────────── */

/**
 * `(prefers-reduced-motion: reduce)`, live.
 *
 * Headless Chrome reports `no-preference`, so renders are unaffected; an owner
 * who has asked their OS to calm things down and then meets one of these
 * embedded in the dashboard gets a still frame instead.
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
 * The frame a composition should actually animate against.
 *
 * `settleAt` is what reduced motion freezes on. Loops pass `0` — the frame the
 * cycle both opens and closes on, so nothing is hidden. One-way pieces pass
 * their last frame, because their *end* is the state that carries the figure
 * ("֏1,620,000", "69% occupancy"); freezing those at 0 would show a dashboard
 * reporting zero.
 */
export const useMotionFrame = (frame: number, settleAt: number): number => {
  const reduced = usePrefersReducedMotion();
  return reduced ? settleAt : frame;
};

/* ───────────────────────────── surface recipes ─────────────────────────── */

/** `.panel` / `.surface-card` from index.css, as inline style. */
export const cardSurface = (unit: number, radiusPx = 20): CSSProperties => ({
  backgroundColor: BRAND.card,
  border: `${1 * unit}px solid ${BRAND.border}`,
  borderRadius: radiusPx * unit,
  boxShadow: `0 ${16 * unit}px ${32 * unit}px ${-8 * unit}px ${ink(0.65)}, 0 ${6 * unit}px ${12 * unit}px ${-4 * unit}px ${ink(0.5)}`,
});

/** `.eyebrow` — mono caps, 0.2em, court green. */
// `color` is annotated `string` on purpose. BRAND is `as const`, so an
// unannotated default would infer the parameter as the single literal
// "hsl(151, 90%, 47%)" and reject every other token in the palette.
export const eyebrowStyle = (unit: number, color: string = BRAND.primary): CSSProperties => ({
  fontFamily: MONO_FONT,
  fontSize: 11 * unit,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: 0.2 * 11 * unit,
  color,
});

/** `.stat-numeral` — scoreboard numerals, tabular so digits never jitter. */
export const numeralStyle = (unit: number, size: number): CSSProperties => ({
  fontFamily: MONO_FONT,
  fontVariantNumeric: "tabular-nums",
  fontSize: size * unit,
  fontWeight: 500,
  letterSpacing: -0.02 * size * unit,
  color: BRAND.foreground,
  lineHeight: 1,
});

/** `--shadow-ring-primary: 0 0 0 4px hsl(var(--primary) / 0.18)`. */
export const focusRing = (unit: number, strength: number): string =>
  `0 0 0 ${4 * unit * strength}px ${courtGreen(0.18 * strength)}`;

/** The page wash every composition in this folder sits on. */
export const dashboardBackdrop = (): CSSProperties => ({
  background: `radial-gradient(90% 70% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 68%)`,
});
