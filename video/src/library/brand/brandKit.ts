/**
 * brandKit — shared brand tokens, seam-safe loop maths and motion helpers for
 * the SportsBnB brand & identity composition family. Not a composition itself:
 * every file in this directory pulls its colour, type and cycle primitives
 * from here, so 25 pieces read as one identity instead of 25 near-misses.
 *
 * Colour is lifted verbatim from the `.dark` block of `src/index.css` ("Court
 * at night"), which is the theme the app ships. Nothing here is invented.
 */

import { useEffect, useState } from "react";
import { Easing, spring, useCurrentFrame, useVideoConfig } from "remotion";

/* ─────────────────────────────── colour ───────────────────────────────── */

/**
 * `src/index.css` → `.dark`. Written in comma form because `interpolateColors`
 * parses `hsl(h, s%, l%)` and not the space-separated Level-4 syntax the
 * stylesheet uses inside `hsl(var(--token))`.
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
  /** --border: 157 12% 22% */
  border: "hsl(157, 12%, 22%)",
  /** --border-strong: 155 10% 26% */
  borderStrong: "hsl(155, 10%, 26%)",
  /** --primary: 151 90% 47% — electric court green */
  primary: "hsl(151, 90%, 47%)",
  /** --primary-soft: 155 45% 12% */
  primarySoft: "hsl(155, 45%, 12%)",
  /** --foreground: 100 20% 96% — chalk white */
  foreground: "hsl(100, 20%, 96%)",
  /** --foreground-soft: 130 8% 72% */
  foregroundSoft: "hsl(130, 8%, 72%)",
  /** --muted-foreground: 130 8% 64% */
  muted: "hsl(130, 8%, 64%)",
  /** --chart-2: 190 80% 50% */
  accent: "hsl(190, 80%, 50%)",
  /** --chart-3 / --warning: 42 95% 55% */
  amber: "hsl(42, 95%, 55%)",
  /** --chart-4: 268 80% 76% */
  violet: "hsl(268, 80%, 76%)",
} as const;

export const courtGreen = (a: number): string => `hsla(151, 90%, 47%, ${a})`;
export const cyan = (a: number): string => `hsla(190, 80%, 50%, ${a})`;
export const violet = (a: number): string => `hsla(268, 80%, 76%, ${a})`;
export const amber = (a: number): string => `hsla(42, 95%, 55%, ${a})`;
/** Chalk white — `--foreground`. */
export const chalk = (a: number): string => `hsla(100, 20%, 96%, ${a})`;
/** The darkest step — `--background`. Used for every scrim and shadow. */
export const ink = (a: number): string => `hsla(160, 22%, 5%, ${a})`;
/** `--border`. */
export const hairline = (a: number): string => `hsla(157, 12%, 22%, ${a})`;

/* ──────────────────────────────── type ────────────────────────────────── */

/**
 * The *system tail* of `--font-display` / `--font-sans` / `--font-mono`. The
 * webfont heads (Space Grotesk, DM Sans, JetBrains Mono, Noto Sans Armenian)
 * are deliberately dropped: `src/index.css` pulls them from Google Fonts, and
 * a headless render has no network. Same shape, no fetch.
 */
export const DISPLAY_FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const SANS_FONT = DISPLAY_FONT;
export const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

/** `--tracking-tighter: -0.04em` — display headline tracking. */
export const TRACKING_TIGHTER = "-0.04em";
/** `--tracking-tight: -0.025em`. */
export const TRACKING_TIGHT = "-0.025em";
/** `.eyebrow` tracks at 0.2em; expressed here in em so it scales with size. */
export const TRACKING_EYEBROW = "0.2em";

/** `--radius: 0.875rem` = 14px at the app's root font size. */
export const RADIUS = 14;

/* ─────────────────────────────── texture ──────────────────────────────── */

/**
 * Inline `data:` noise tile — byte-identical to the one in the `.glass::before`
 * rule. Load-bearing rather than decorative: low-alpha gradients across a
 * near-black frame band badly on 8-bit output, and a couple of percent of
 * grain is what breaks the banding up.
 */
export const NOISE_TILE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* ─────────────────────────────── easing ───────────────────────────────── */

/** `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`. */
export const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
/** `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`. */
export const EASE_SPRING = Easing.bezier(0.34, 1.56, 0.64, 1);

export const TAU = Math.PI * 2;

/* ───────────────────────── spring presets ─────────────────────────────── */

/** Arrival with a visible, confident overshoot — logos landing. */
export const SPRING_POP = { damping: 11, mass: 0.7, stiffness: 130 } as const;
/** Arrival with a hint of overshoot — text and plates. */
export const SPRING_ENTER = { damping: 16, mass: 0.9, stiffness: 110 } as const;
/** Critically damped — anything that must not wobble (masks, wipes, bars). */
export const SPRING_SMOOTH = { damping: 200, mass: 1, stiffness: 90 } as const;
/** Slower critically damped — things that ebb rather than cut. */
export const SPRING_EBB = { damping: 200, mass: 1.4, stiffness: 60 } as const;

/* ───────────────────────── loop primitives ────────────────────────────── */

/** Positive modulo — the backbone of every cycle in this directory. */
export const wrap = (value: number, period: number): number =>
  ((value % period) + period) % period;

/**
 * The loop variable, `t ∈ [0, 1)`. Modular *before* the divide, and that is
 * the whole trick: `frame / period` would make `t = 1` at the seam, and
 * `sin(2π·1)` is -2.45e-16 in IEEE 754, not 0 — every downstream expression
 * would then serialise a different CSS string at frame `period` than at frame
 * 0. `wrap(frame, period) / period` is *exactly* 0 at both ends, so the two
 * seam frames feed bit-identical inputs to every expression downstream.
 */
export const loopT = (frame: number, period: number): number =>
  wrap(frame, period) / period;

/** Evenly spaced phase offsets — how stagger is expressed inside a loop. */
export const staggerPhase = (
  index: number,
  count: number,
  period: number,
): number => Math.round((index * period) / Math.max(1, count));

/**
 * Deterministic value noise. Emphatically not `Math.random()`: a render is a
 * pure function of the frame number, and Remotion renders frames out of order
 * across parallel tabs, so hidden state would tear a composition apart.
 */
export const noise = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export type BloomWindow = {
  /** Frames the rise spring takes to settle at 1. */
  readonly rise: number;
  /** Local frame at which the fall spring starts. */
  readonly hold: number;
  /** Frames the fall spring takes to settle at 1. */
  readonly fall: number;
};

/**
 * Turns fractions-of-a-loop into whole frames. Fractions rather than constants
 * so a composition survives being registered at a different `durationInFrames`
 * without its bloom windows overrunning the cycle. `hold + fall` is capped at
 * 0.9 of the period, leaving at least a tenth of every loop during which each
 * bloom is provably, exactly zero.
 */
export const bloomWindow = (
  period: number,
  riseFrac: number,
  holdFrac: number,
  fallFrac: number,
): BloomWindow => {
  const rise = Math.max(2, Math.round(period * riseFrac));
  const hold = Math.max(2, Math.round(period * holdFrac));
  const fall = Math.max(2, Math.round(period * fallFrac));
  const budget = Math.max(2, Math.floor(period * 0.9) - hold);
  return { rise, hold, fall: Math.min(fall, budget) };
};

/**
 * A rise spring minus a fall spring — 0 → 1 → 0 across one local cycle, and
 * the only shape of spring that can live inside a seamless loop.
 *
 * Remotion's `spring()` returns exactly `from` for `frame <= 0` and exactly
 * `to` once `frame - delay > durationInFrames` (an explicit early return in
 * `spring/index.js`). So this is exactly `0` at local frame 0 and exactly
 * `1 - 1 = 0` from `hold + fall` onward. Not "approximately" — the early
 * return makes it exact, which is what makes it safe to hang a one-way motion
 * off it inside a loop.
 */
export const bloom = (
  localFrame: number,
  fps: number,
  window: BloomWindow,
): number => {
  const up = spring({
    frame: localFrame,
    fps,
    config: SPRING_SMOOTH,
    durationInFrames: window.rise,
  });
  const down = spring({
    frame: localFrame,
    fps,
    config: SPRING_EBB,
    delay: window.hold,
    durationInFrames: window.fall,
  });
  return up - down;
};

/**
 * The punchier sibling of `bloom()` — rises with overshoot, holds, settles
 * back. Same exactness argument: both springs carry an explicit
 * `durationInFrames`, so the value is exactly 0 at local frame 0 and exactly
 * 0 once both have short-circuited.
 */
export const popPulse = (
  localFrame: number,
  fps: number,
  window: BloomWindow,
): number => {
  const up = spring({
    frame: localFrame,
    fps,
    config: SPRING_POP,
    durationInFrames: window.rise,
  });
  const down = spring({
    frame: localFrame,
    fps,
    config: SPRING_EBB,
    delay: window.hold,
    durationInFrames: window.fall,
  });
  return up - down;
};

/* ──────────────────────── reduced motion ──────────────────────────────── */

/**
 * `(prefers-reduced-motion: reduce)`, live.
 *
 * Headless Chrome reports `no-preference`, so rendered output is unaffected; a
 * viewer who has asked their OS to calm things down and then meets one of
 * these pieces playing inline in the app gets a single still frame instead.
 */
export const usePrefersReducedMotion = (): boolean => {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
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
 * The one line every composition in this family uses instead of
 * `useCurrentFrame()`.
 *
 * Returns the live frame normally, and a single frozen poster frame under
 * reduced motion. `posterFraction` picks *which* frame: for a loop, 0 is
 * usually the emptiest frame in the piece (every bloom is exactly zero there
 * by construction), so loops pass something like 0.3; for a build-on, 1 is the
 * resolved lockup, which is exactly what a reduced-motion viewer wants.
 */
export const useBrandFrame = (posterFraction: number): number => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const reduced = usePrefersReducedMotion();
  if (!reduced) {
    return frame;
  }
  const poster = Math.round(durationInFrames * posterFraction);
  return Math.max(0, Math.min(poster, durationInFrames - 1));
};
