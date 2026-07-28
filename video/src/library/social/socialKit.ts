/**
 * socialKit — the shared vocabulary for the SportsBnB social-media family.
 * Not a composition: brand tokens, the per-platform canvas + safe-area
 * contracts, loop math, motion primitives and style recipes that the 25
 * Reels / feed-post / landscape templates import so a render fired per venue
 * from listing data always looks like the same brand.
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
  muted: "hsl(158, 13%, 13%)",
  /** --border: 157 12% 22% */
  border: "hsl(157, 12%, 22%)",
  /** --border-strong: 155 10% 26% */
  borderStrong: "hsl(155, 10%, 26%)",
  /** --border-interactive: 157 12% 42% */
  borderInteractive: "hsl(157, 12%, 42%)",
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
  /** --warning / --chart-3: 42 95% 55% */
  warning: "hsl(42, 95%, 55%)",
  /** --destructive: 358 72% 68% */
  destructive: "hsl(358, 72%, 68%)",
  /** --chart-2: 190 80% 50% */
  cyan: "hsl(190, 80%, 50%)",
  /** --chart-3: 42 95% 55% */
  amber: "hsl(42, 95%, 55%)",
  /** --chart-4: 268 80% 76% */
  violet: "hsl(268, 80%, 76%)",
} as const;

export const courtGreen = (alpha: number): string =>
  `hsla(151, 90%, 47%, ${alpha})`;
export const chalk = (alpha: number): string => `hsla(100, 20%, 96%, ${alpha})`;
export const softText = (alpha: number): string =>
  `hsla(130, 8%, 72%, ${alpha})`;
export const muted = (alpha: number): string => `hsla(130, 8%, 64%, ${alpha})`;
export const ink = (alpha: number): string => `hsla(160, 22%, 5%, ${alpha})`;
export const hairline = (alpha: number): string =>
  `hsla(157, 12%, 22%, ${alpha})`;
export const cyan = (alpha: number): string => `hsla(190, 80%, 50%, ${alpha})`;
export const amber = (alpha: number): string => `hsla(42, 95%, 55%, ${alpha})`;
export const violet = (alpha: number): string =>
  `hsla(268, 80%, 76%, ${alpha})`;

/**
 * The accent a template is allowed to tint itself with. Court green is the
 * default everywhere; the other three exist so a weekly grid of posts does not
 * read as one long block of the same green.
 */
export type Accent = "green" | "cyan" | "amber" | "violet";

export const accentColor = (accent: Accent): string =>
  accent === "cyan"
    ? BRAND.cyan
    : accent === "amber"
      ? BRAND.amber
      : accent === "violet"
        ? BRAND.violet
        : BRAND.primary;

export const accentAlpha = (accent: Accent, alpha: number): string =>
  accent === "cyan"
    ? cyan(alpha)
    : accent === "amber"
      ? amber(alpha)
      : accent === "violet"
        ? violet(alpha)
        : courtGreen(alpha);

/**
 * Text that sits *on* a filled accent chip. Green, amber and cyan are all
 * light enough to need the near-black foreground; violet is the only one that
 * carries chalk comfortably.
 */
export const onAccent = (accent: Accent): string =>
  accent === "violet" ? BRAND.foreground : BRAND.primaryForeground;

/* ───────────────────────────────── type ────────────────────────────────── */

/**
 * The system tails of `--font-display` / `--font-sans` / `--font-mono`. The
 * webfont heads (Space Grotesk, DM Sans, JetBrains Mono, Noto Sans Armenian)
 * are deliberately dropped: `src/index.css` pulls them from Google Fonts, and
 * a headless Remotion render cannot reach the network.
 */
export const DISPLAY_FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const SANS_FONT =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

/** Inline noise tile — byte-identical to the one in `.glass::before`. */
export const NOISE_TILE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* ────────────────────────────── money ──────────────────────────────────── */

/**
 * The dram sign, U+058F.
 *
 * Every template takes a `currency` prop that defaults to this, because the
 * price on a SportsBnB listing is in dram and a marketing template should say
 * so. It is a prop rather than a constant for one practical reason: no bundled
 * Latin face carries U+058F — `src/index.css` fetches a one-glyph Noto Sans
 * Armenian subset for it — so on a render box without an Armenian-capable
 * system font it falls back per glyph and can tofu. Pass `currency: "AMD"` for
 * those boxes and nothing else about the layout changes.
 */
export const DRAM = "֏";

/**
 * `12000 → "12,000"`. Hand-rolled rather than `toLocaleString`, which varies
 * with the render box's ICU data and would make output non-deterministic.
 */
export const groupThousands = (amount: number): string => {
  const negative = amount < 0;
  const digits = String(Math.round(Math.abs(amount)));
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    const fromEnd = digits.length - i;
    out += digits[i];
    if (fromEnd > 1 && fromEnd % 3 === 1) out += ",";
  }
  return negative ? `-${out}` : out;
};

/** `formatMoney(12000, "֏") → "12,000 ֏"`. */
export const formatMoney = (amount: number, currency: string): string =>
  `${groupThousands(amount)} ${currency}`;

/* ───────────────────────── the zero-commission line ─────────────────────── */

/**
 * SportsBnB takes **no** commission: the owner keeps the whole listed price
 * and the player pays exactly what the listing says. It is the strongest claim
 * the company has, so the wording lives here once and the templates that lead
 * with it all say the same thing. There is no service fee anywhere in this
 * family — a template must never render one.
 */
export const COMMISSION = {
  /** The number itself, for the big-type templates. */
  rate: "0%",
  badge: "ZERO COMMISSION",
  ownerLine: "Owners keep 100%",
  playerLine: "Players pay the listed price",
  proof: "No commission. No service fee. No cut.",
} as const;

/* ─────────────────── canvases and platform safe areas ──────────────────── */

export type Canvas = {
  width: number;
  height: number;
  /** First y a caption may occupy. */
  safeTop: number;
  /** Last y a caption may occupy. */
  safeBottom: number;
  /** Left/right gutter. */
  gutter: number;
};

/**
 * 9:16 — Reels / TikTok / Stories.
 *
 * The platforms paint their own chrome over the top and bottom of the frame:
 * account row, follow button, sound pill and the two-to-four caption lines,
 * plus the like/comment/share rail. Budgeting **14% top (269px → 270)** and
 * **20% bottom (384px → the 1536 line)** clears all three platforms' worst
 * case. Nothing that carries meaning is placed outside that band; only
 * backdrops, bleed gradients and particles are allowed into the margins.
 */
export const REEL: Canvas = {
  width: 1080,
  height: 1920,
  safeTop: 270,
  safeBottom: 1536,
  gutter: 84,
};

/** 1:1 — feed posts. No platform chrome over the image; a plain optical inset. */
export const SQUARE: Canvas = {
  width: 1080,
  height: 1080,
  safeTop: 88,
  safeBottom: 992,
  gutter: 88,
};

/** 16:9 — YouTube / web / display. Title-safe is the classic 5% inset. */
export const WIDE: Canvas = {
  width: 1920,
  height: 1080,
  safeTop: 96,
  safeBottom: 984,
  gutter: 140,
};

/* ──────────────────────────────── motion ───────────────────────────────── */

/** `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`. */
export const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
/** `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` — the overshoot. */
export const EASE_SPRING = Easing.bezier(0.34, 1.56, 0.64, 1);
/** The "leaving" curve. Exits are always quicker than entrances. */
export const EASE_IN = Easing.bezier(0.4, 0, 1, 1);

/** `--dur-fast: 150ms`, `--dur-base: 250ms`, `--dur-slow: 400ms`, in seconds. */
export const DUR = { fast: 0.15, base: 0.25, slow: 0.4 } as const;

export const TAU = Math.PI * 2;

/**
 * `interpolate` with both extrapolations clamped and an optional easing.
 *
 * Remotion's default is `extend`, which happily runs a value past the end of
 * its range — the usual cause of an opacity of 1.3 when the driver is a
 * wrapped cycle rather than a raw frame.
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

/** Positive modulo — the backbone of every lattice loop in this folder. */
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
 * machine and every frame, so `Math.random()` is never used — scatter comes
 * from this instead.
 */
export const hashUnit = (index: number, seed = 1): number => {
  const x = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** `hashUnit` mapped into a range. */
export const hashRange = (
  index: number,
  seed: number,
  min: number,
  max: number,
): number => min + (max - min) * hashUnit(index, seed);

/** Loop position, 0 at the first frame and 1 at the frame after the last. */
export const loopT = (frame: number, durationInFrames: number): number =>
  wrap(frame, durationInFrames) / durationInFrames;

/**
 * A full cosine period over the loop: identical at t=0 and t=1, and at its
 * extreme in the middle. The house ambient driver — glows, floats, drifts.
 */
export const breathe = (t: number): number => Math.cos(TAU * t);

/**
 * A full sine period over the loop, remapped to 0…1. Identical at both ends,
 * so it can drive a *position* (a wipe, a sweep) without a snap at the seam.
 */
export const sway = (t: number, phase = 0): number =>
  0.5 + 0.5 * Math.sin(TAU * (t + phase));

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
 * `frame - delay > durationInFrames`, and negative frames clamp to `from`. So
 * local 0 gives `0 - 0 = 0` and local ≥ PULSE_SETTLED gives `1 - 1 = 0`. Both
 * ends are *exactly* zero, so the value is continuous across the wrap.
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

/* ───────────────────────── one-way entrance springs ────────────────────── */

/**
 * The house entrance curve, 0 → 1 with a touch of overshoot. Only ever used in
 * pieces marked `seamless: false`; a one-way tween inside a loop is banned.
 */
export const enter = (
  frame: number,
  fps: number,
  delay: number,
  durationInFrames = 28,
): number =>
  spring({
    frame,
    fps,
    delay,
    config: { damping: 17, mass: 0.9, stiffness: 110 },
    durationInFrames,
  });

/** A tighter spring for small objects — chips, cells, pips, badges. */
export const popIn = (
  frame: number,
  fps: number,
  delay: number,
  durationInFrames = 22,
): number =>
  spring({
    frame,
    fps,
    delay,
    config: { damping: 14, mass: 0.6, stiffness: 190 },
    durationInFrames,
  });

/**
 * 50ms between siblings — the app's stagger step — expressed in frames, capped
 * so a long list's tail does not arrive absurdly late.
 */
export const stagger = (index: number, step = 4, cap = 8): number =>
  Math.min(index, cap) * step;

/* ────────────────────────── reduced motion, live ───────────────────────── */

/**
 * `(prefers-reduced-motion: reduce)`, live.
 *
 * Headless Chrome reports `no-preference`, so the rendered MP4 is unaffected;
 * a viewer who has asked their OS to calm things down and then meets one of
 * these templates embedded in a web page gets a still frame instead.
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
 * their LAST frame, because their end state is the state that carries the
 * message ("booked", "0% commission", the price); freezing those at 0 would
 * show an empty card.
 */
export const useMotionFrame = (frame: number, settleAt: number): number => {
  const reduced = usePrefersReducedMotion();
  return reduced ? settleAt : frame;
};

/* ───────────────────────────── style recipes ───────────────────────────── */

/** `.panel` / `.surface-card` from index.css, as inline style. */
export const cardSurface = (unit: number, radiusPx = 32): CSSProperties => ({
  backgroundColor: BRAND.card,
  border: `${1.5 * unit}px solid ${BRAND.border}`,
  borderRadius: radiusPx * unit,
  boxShadow: `0 ${24 * unit}px ${48 * unit}px ${-16 * unit}px ${ink(0.7)}, 0 ${8 * unit}px ${16 * unit}px ${-6 * unit}px ${ink(0.5)}`,
});

/**
 * `.eyebrow` — mono caps at 0.2em. Sized in absolute px rather than a scale
 * factor because social copy is authored at thumbnail-legible sizes and the
 * templates are already authored 1:1 against their canvas.
 */
export const eyebrowStyle = (size: number, color: string): CSSProperties => ({
  fontFamily: MONO_FONT,
  fontSize: size,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: 0.2 * size,
  color,
  whiteSpace: "nowrap",
});

/**
 * Primary display copy. Weight is never below 600 in this family: social is
 * consumed at 120px wide in a feed, and a 300-weight headline disappears.
 */
export const headlineStyle = (
  size: number,
  color: string,
  weight = 700,
): CSSProperties => ({
  fontFamily: DISPLAY_FONT,
  fontSize: size,
  fontWeight: weight,
  lineHeight: 1.02,
  letterSpacing: "-0.04em",
  color,
});

/** Body copy. 500 is the floor, again for thumbnail legibility. */
export const bodyStyle = (
  size: number,
  color: string,
  weight = 500,
): CSSProperties => ({
  fontFamily: SANS_FONT,
  fontSize: size,
  fontWeight: weight,
  lineHeight: 1.32,
  color,
});

/** Tabular figures — prices, times, counts. The app's scoreboard voice. */
export const numeralStyle = (
  size: number,
  color: string,
  weight = 600,
): CSSProperties => ({
  fontFamily: MONO_FONT,
  fontSize: size,
  fontWeight: weight,
  color,
  letterSpacing: "-0.02em",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});

/** A soft grid plate. `drift` must equal exactly one `cell` over a full loop. */
export const gridLayer = (
  cell: number,
  drift: number,
  alpha: number,
): CSSProperties => ({
  backgroundImage: `linear-gradient(to right, ${hairline(alpha)} 1px, transparent 1px), linear-gradient(to bottom, ${hairline(alpha)} 1px, transparent 1px)`,
  backgroundSize: `${cell}px ${cell}px, ${cell}px ${cell}px`,
  backgroundPosition: `${drift}px ${-drift}px, ${drift}px ${-drift}px`,
});

/** Grain, straight from `.glass::before`. */
export const grainLayer = (opacity = 0.05): CSSProperties => ({
  backgroundImage: NOISE_TILE,
  opacity,
  pointerEvents: "none",
});

/**
 * The scrim that buys contrast for copy sitting over a busy plate. Social
 * templates lean on this hard — a headline has to clear 4.5:1 against whatever
 * the backdrop is doing underneath it at that moment.
 */
export const scrimLayer = (
  from: "top" | "bottom",
  strength = 0.72,
): CSSProperties => ({
  background: `linear-gradient(to ${from === "top" ? "bottom" : "top"}, ${ink(strength)} 0%, ${ink(strength * 0.5)} 34%, transparent 72%)`,
  pointerEvents: "none",
});

/** `--shadow-ring-primary`, parameterised by accent and strength. */
export const focusRing = (
  accent: Accent,
  px: number,
  strength: number,
): string => `0 0 0 ${px * strength}px ${accentAlpha(accent, 0.18 * strength)}`;
