/**
 * venueKit — the shared vocabulary for the venue / listing / booking family.
 * Not a composition: brand tokens, sport metadata, dram formatting, loop math
 * and motion primitives that the 27 pieces in this folder import so a padel
 * listing and a swimming listing read as the same product across /venues,
 * /venues/:id, the availability panel and the booking-confirmed moment.
 */

import { useEffect, useState, type CSSProperties } from "react";
import { Easing, interpolate, spring } from "remotion";

/* ───────────────────────────── brand tokens ────────────────────────────── */

/**
 * Lifted verbatim from the `.dark` block of `src/index.css` ("Court at night"),
 * the theme the app actually ships. Written in comma form because Remotion's
 * colour helpers parse `hsl(h, s%, l%)` rather than the space-separated Level-4
 * syntax the stylesheet uses inside `hsl(var(--token))`.
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
  /** --destructive-solid: 358 68% 42% */
  destructiveSolid: "hsl(358, 68%, 42%)",
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
export const ink = (alpha: number): string => `hsla(160, 22%, 5%, ${alpha})`;
export const hairline = (alpha: number): string =>
  `hsla(157, 12%, 22%, ${alpha})`;
export const cyan = (alpha: number): string => `hsla(190, 80%, 50%, ${alpha})`;
export const amber = (alpha: number): string => `hsla(42, 95%, 55%, ${alpha})`;
export const violet = (alpha: number): string =>
  `hsla(268, 80%, 76%, ${alpha})`;
export const rose = (alpha: number): string => `hsla(358, 72%, 68%, ${alpha})`;
export const muted = (alpha: number): string => `hsla(130, 8%, 64%, ${alpha})`;

/** Any accent, dialled to an alpha. Accents are always `hsl(h, s%, l%)`. */
export const tint = (accent: string, alpha: number): string =>
  accent.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);

/* ────────────────────────────── sport palette ──────────────────────────── */

export type SportKey =
  | "football"
  | "futsal"
  | "basketball"
  | "tennis"
  | "padel"
  | "volleyball"
  | "badminton"
  | "swimming";

export type SportMeta = {
  key: SportKey;
  /** English display label, as the listing filter chips show it. */
  label: string;
  /** Armenian label — the app ships hy-AM first on the venue filters. */
  labelHy: string;
  /** The one token that varies per listing. Always a design-system colour. */
  accent: string;
  /** The court/pool surface tint the piece paints under its markings. */
  surface: string;
  /** How the venue is measured on a listing row. */
  unitLabel: string;
};

/**
 * Eight sports, eight accents, four colours. Football and futsal share the
 * brand green on purpose: they are the same booking to a player and the
 * listing cards should not pretend otherwise. Everything else borrows a chart
 * token, so a basketball promo and a padel promo are recognisably one product.
 */
export const SPORTS: Record<SportKey, SportMeta> = {
  football: {
    key: "football",
    label: "Football",
    labelHy: "Ֆուտբոլ",
    accent: BRAND.primary,
    surface: "hsl(151, 34%, 9%)",
    unitLabel: "11-a-side pitch",
  },
  futsal: {
    key: "futsal",
    label: "Futsal",
    labelHy: "Ֆուտզալ",
    accent: BRAND.primary,
    surface: "hsl(151, 26%, 10%)",
    unitLabel: "Indoor 5-a-side",
  },
  basketball: {
    key: "basketball",
    label: "Basketball",
    labelHy: "Բասկետբոլ",
    accent: BRAND.amber,
    surface: "hsl(28, 30%, 10%)",
    unitLabel: "Full court",
  },
  tennis: {
    key: "tennis",
    label: "Tennis",
    labelHy: "Թենիս",
    accent: BRAND.cyan,
    surface: "hsl(196, 34%, 10%)",
    unitLabel: "Hard court",
  },
  padel: {
    key: "padel",
    label: "Padel",
    labelHy: "Փադել",
    accent: BRAND.cyan,
    surface: "hsl(190, 30%, 9%)",
    unitLabel: "Glass court",
  },
  volleyball: {
    key: "volleyball",
    label: "Volleyball",
    labelHy: "Վոլեյբոլ",
    accent: BRAND.violet,
    surface: "hsl(268, 26%, 11%)",
    unitLabel: "Indoor court",
  },
  badminton: {
    key: "badminton",
    label: "Badminton",
    labelHy: "Բադմինտոն",
    accent: BRAND.violet,
    surface: "hsl(262, 22%, 10%)",
    unitLabel: "Doubles court",
  },
  swimming: {
    key: "swimming",
    label: "Swimming",
    labelHy: "Լող",
    accent: BRAND.cyan,
    surface: "hsl(200, 44%, 11%)",
    unitLabel: "25 m lane",
  },
};

export const sportMeta = (key: SportKey): SportMeta => SPORTS[key];

/* ───────────────────────── money — the product fact ────────────────────── */

/**
 * SportsBnB takes nothing. Not "nothing for now", not "nothing under a
 * threshold" — the marketplace fee is structurally zero, which is the whole
 * pitch to Armenian venue owners who are used to 15–20% from the aggregators.
 * It lives here as a constant so no composition can quietly invent a fee.
 */
export const COMMISSION_RATE = 0;

/** What the owner banks. Identical to the listed price, by design. */
export const ownerPayout = (listedPrice: number): number =>
  Math.round(listedPrice * (1 - COMMISSION_RATE));

/** What the player is charged. Also the listed price — there is no add-on. */
export const playerTotal = (listedPrice: number, hours = 1): number =>
  Math.round(listedPrice * hours);

/** U+058F ARMENIAN DRAM SIGN. */
export const DRAM = "֏";

/**
 * Thousands grouping without `Intl` — a headless Chrome build is not
 * guaranteed to ship full ICU, and a price that renders as `12000` in one
 * environment and `12,000` in another is not a template.
 */
export const groupThousands = (value: number): string => {
  const digits = String(Math.max(0, Math.round(value)));
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) {
      out += ",";
    }
    out += digits[i];
  }
  return out;
};

/** `12,000 ֏` — the form every price surface in the app uses. */
export const formatDram = (value: number): string =>
  `${groupThousands(value)} ${DRAM}`;

/* ───────────────────────────────── type ────────────────────────────────── */

/**
 * The system tails of `--font-display` / `--font-sans` / `--font-mono`. The
 * webfont heads (Space Grotesk, DM Sans, JetBrains Mono) are dropped: the
 * stylesheet pulls them from Google Fonts and a headless render cannot reach
 * the network. The GNU FreeFont / DejaVu families sit at the end of each stack
 * because the dram sign (U+058F) is absent from every other face here and CSS
 * fallback is per-glyph, so only that codepoint resolves there.
 */
export const DISPLAY_FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Liberation Sans", "FreeSans", "DejaVu Sans", sans-serif';
export const SANS_FONT =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Liberation Sans", "FreeSans", "DejaVu Sans", sans-serif';
export const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "DejaVu Sans Mono", "FreeMono", monospace';

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
/** 50ms between siblings — the app's stagger step, in seconds. */
export const STAGGER_STEP = 0.05;

export const TAU = Math.PI * 2;

/**
 * `interpolate` with both extrapolations clamped and an optional easing.
 * Remotion's default is `extend`, which runs a value past the end of its range
 * — the usual cause of an opacity of 1.3 when the driver is a wrapped cycle
 * rather than a raw frame.
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
 * `0 → 1 → 0` over one turn of `t ∈ [0,1)`, smooth at the seam.
 *
 * The workhorse of this folder. A raw triangle wave also returns to 0 but has
 * a corner at the wrap; `(1 - cos 2πt)/2` has zero derivative at both ends, so
 * a loop built on it neither jumps in position nor in velocity.
 */
export const oscillate = (t: number): number => 0.5 - 0.5 * Math.cos(TAU * t);

/** Same shape, phase-shifted so it opens at 1, dips to 0 and closes at 1. */
export const oscillateDown = (t: number): number => 0.5 + 0.5 * Math.cos(TAU * t);

/**
 * `0 → 1 → 0` as straight lines, over one turn of `t`.
 *
 * The corner at the turn is the point: a ball leaving a wall reverses
 * instantly, and `oscillate` would ease it into the wall like a pendulum. Both
 * ends are exactly 0, so it wraps as cleanly as the cosine does.
 */
export const triangle = (t: number): number => {
  const x = wrap(t, 1);
  return x < 0.5 ? x * 2 : 2 - x * 2;
};

/**
 * `n` bounces across one turn of `t`, each an arc that touches zero.
 * `|sin(nπt)|` is zero at t=0 and at t=1 for every whole `n`, so the ball is
 * on the floor at both ends of the loop.
 */
export const bounce = (t: number, n: number): number =>
  Math.abs(Math.sin(Math.PI * n * wrap(t, 1)));

/**
 * Deterministic unit noise. Compositions must render identically on every
 * machine and every frame, so `Math.random()` is never used — scatter comes
 * from this instead.
 */
export const hashUnit = (index: number, seed = 1): number => {
  const x = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** `hashUnit` mapped onto a range. */
export const hashRange = (
  index: number,
  min: number,
  max: number,
  seed = 1,
): number => min + (max - min) * hashUnit(index, seed);

/** Deterministic integer in `[0, count)`. */
export const hashInt = (index: number, count: number, seed = 1): number =>
  Math.min(count - 1, Math.floor(hashUnit(index, seed) * count));

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

/* ────────────────────────── reduced motion, live ───────────────────────── */

/**
 * `(prefers-reduced-motion: reduce)`, live.
 *
 * Headless Chrome reports `no-preference`, so renders are unaffected; a user
 * who has asked their OS to calm things down and then meets one of these loops
 * embedded in the app gets a still frame instead.
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
 * their last frame, because their *end* is the state that carries the message
 * ("booking confirmed", "4.8 from 126 reviews"); freezing those at 0 would
 * show an empty component.
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

/** `.eyebrow` — mono caps, 0.2em, accent-coloured. */
export const eyebrowStyle = (
  unit: number,
  color: string = BRAND.primary,
): CSSProperties => ({
  fontFamily: MONO_FONT,
  fontSize: 11 * unit,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: 0.2 * 11 * unit,
  color,
});

/** Tabular numerals. Every price, time and score in the app is set this way. */
export const numericStyle = (unit: number, size: number): CSSProperties => ({
  fontFamily: MONO_FONT,
  fontSize: size * unit,
  fontWeight: 500,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: -0.02 * size * unit,
  color: BRAND.foreground,
  lineHeight: 1,
});

/** `--shadow-ring-primary: 0 0 0 4px hsl(var(--primary) / 0.18)`. */
export const focusRing = (unit: number, strength: number): string =>
  `0 0 0 ${4 * unit * strength}px ${courtGreen(0.18 * strength)}`;

/* ─────────────────────────── shared vector paths ───────────────────────── */

/** The five-point star used by every rating surface. 24×24 viewBox. */
export const STAR_PATH =
  "M12 2.1l3.02 6.12 6.76.98-4.89 4.77 1.15 6.73L12 17.53l-6.04 3.17 1.15-6.73L2.22 9.2l6.76-.98z";
/** The confirmation tick. 24×24 viewBox, ~24 units long. */
export const TICK_PATH = "M5 12.5 L10 17.5 L19.5 6.5";
export const TICK_LENGTH = 24;
/** The map pin outline. 24×24 viewBox. */
export const PIN_PATH = "M12 21.5S19 15.6 19 10.5a7 7 0 10-14 0c0 5.1 7 11 7 11z";

/* ──────────────────────── procedural listing photos ────────────────────── */

/**
 * A listing photo, generated rather than fetched.
 *
 * The gallery pieces need four or five distinct images and this folder is not
 * allowed a single network byte, so each "photo" is a deterministic two-stop
 * gradient plus a floodlight hotspot, seeded off the frame index. It reads as
 * a dim floodlit hall at thumbnail size, which is exactly the register the real
 * venue photography sits in.
 */
export const photoFill = (index: number, accent: string, seed = 7): string => {
  const hotX = 20 + 60 * hashUnit(index * 3 + 1, seed);
  const hotY = 18 + 46 * hashUnit(index * 3 + 2, seed);
  const lift = 0.1 + 0.14 * hashUnit(index * 3 + 3, seed);
  const angle = Math.round(hashRange(index + 11, 120, 220, seed));
  return [
    `radial-gradient(38% 44% at ${hotX}% ${hotY}%, ${tint(accent, lift + 0.16)} 0%, transparent 68%)`,
    `radial-gradient(72% 60% at ${100 - hotX}% ${100 - hotY}%, ${chalk(0.05)} 0%, transparent 70%)`,
    `linear-gradient(${angle}deg, ${BRAND.surface3} 0%, ${BRAND.surface1} 52%, ${BRAND.background} 100%)`,
  ].join(", ");
};
