/**
 * shared — the common substrate for the SportsBnB landing/marketing family.
 *
 * Not a composition. Every file in `video/src/library/landing/` imports its
 * brand tokens, loop primitives, spring characters and small UI atoms from
 * here so the 25 marketing compositions read as one system rather than 25
 * independently invented ones.
 *
 * ── What lives here ───────────────────────────────────────────────────────
 *   • BRAND — colours lifted verbatim from the `.dark` ("Court at night")
 *     block of `src/index.css`. Nothing is invented.
 *   • Loop primitives — `wrap`, `loopT`, `bloom`. These are what make the
 *     ambient hero plates *mathematically* seamless rather than approximately
 *     seamless. See the long note on `loopT`.
 *   • Spring characters — one overdamped, one underdamped, chosen per job.
 *   • Reduced-motion plumbing, mirroring what `src/index.css` already does.
 *   • Type stacks, icons, scrims, grain — all self-contained, no network.
 *
 * ── Self-containment ──────────────────────────────────────────────────────
 * No `<Img>`, no `@font-face`, no remote CSS, no `<link>`, no fetch of any
 * kind. `src/index.css` pulls Space Grotesk / DM Sans / JetBrains Mono from
 * Google Fonts, which a headless render cannot reach, so the families are
 * *named* (naming is not fetching) with the documented system tails behind
 * them. Every glyph used across the family is ASCII plus `·` and `—`; the
 * dram sign U+058F is deliberately avoided because it depends on Noto Sans
 * Armenian, which the render box is not guaranteed to have — prices are
 * written as `AMD 12,000`.
 */

import {
  useEffect,
  useState,
  type CSSProperties,
  type FC,
  type ReactNode,
} from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* ─────────────────────────────── brand ────────────────────────────────── */

/**
 * `src/index.css` → `.dark` ("Court at night"), stored as hex so
 * `interpolateColors()` can read them directly and so `alpha()` can decompose
 * them without a parser.
 */
export const BRAND = {
  /** --background 160 22% 5% */
  bg: "#0A100E",
  /** --surface-1 160 18% 10% */
  surface1: "#151E1B",
  /** --surface-2 160 15% 14% */
  surface2: "#1E2925",
  /** --surface-3 158 13% 18% */
  surface3: "#28342F",
  /** --card 160 15% 13% */
  card: "#1C2623",
  /** --popover 160 16% 12% */
  popover: "#19231F",
  /** --foreground 100 20% 96% */
  fg: "#F4F7F3",
  /** --foreground-soft 130 8% 72% */
  fgSoft: "#B2BDB4",
  /** --muted-foreground 130 8% 64% */
  muted: "#9CAB9E",
  /** --primary 151 90% 47% — electric court green */
  primary: "#0CE47B",
  /** --primary-foreground 160 25% 5% */
  primaryFg: "#0A100E",
  /** --primary-soft 155 45% 12% */
  primarySoft: "#112C21",
  /** --border 157 12% 22% */
  border: "#313F3A",
  /** --border-strong 155 10% 26% */
  borderStrong: "#3C4943",
  /** --success 151 80% 44% */
  success: "#16CA73",
  /** --chart-2 190 80% 50% */
  cyan: "#1AC3E6",
  /** --chart-3 / --warning 42 95% 55% */
  amber: "#F9B81F",
  /** --chart-4 268 80% 76% */
  violet: "#BF91F3",
} as const;

/** `rgba()` from one of the hex tokens above. */
export const alpha = (hex: string, a: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/**
 * Type stacks copied from `--font-display` / `--font-sans` / `--font-mono`.
 * The webfont names are declared but never fetched; a headless render falls
 * straight through to the system entries.
 */
export const FONT_DISPLAY =
  "'Space Grotesk', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const FONT_SANS =
  "'DM Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const FONT_MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'DejaVu Sans Mono', monospace";

/** `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` from the design system. */
export const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
/** `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`. */
export const EASE_SPRING = Easing.bezier(0.34, 1.56, 0.64, 1);

export const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const TAU = Math.PI * 2;

/** The landscape canvas the family is authored against. */
export const DESIGN_W = 1920;
export const DESIGN_H = 1080;

/** Inline noise tile — byte-identical to the one in `.glass::before`. */
export const NOISE_TILE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* ───────────────────────── loop primitives ────────────────────────────── */

/** Positive modulo — the backbone of every cycle in the family. */
export const wrap = (value: number, period: number): number =>
  ((value % period) + period) % period;

/**
 * The loop variable, `t ∈ [0, 1)`. Modular *before* the divide, and that is
 * the whole trick.
 *
 * `frame / period` would make `t = 1` at the seam, and `sin(2π·1)` is not 0 in
 * IEEE 754 — it is -2.45e-16. Every downstream expression would then carry a
 * different mantissa at frame `period` than at frame 0, and the CSS strings
 * they serialise into would not be character-identical, so the browser is free
 * to rasterise them differently. `wrap(frame, period) / period` is *exactly* 0
 * at both ends, so frame 0 and frame `period` feed bit-identical inputs to
 * every expression downstream. In a real render only frames 0…period-1 exist,
 * so the modulo is a no-op at playback — it exists to make the identity
 * provable rather than incidental.
 */
export const loopT = (frame: number, period: number): number =>
  wrap(frame, period) / period;

/**
 * Deterministic value noise. Explicitly not `Math.random()`: a render is a
 * pure function of the frame number, and Remotion renders frames out of order
 * across parallel workers, so hidden state would tear a composition apart.
 */
export const noise = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Overdamped: monotonic, no overshoot. For counters and things that settle. */
export const SETTLE_SPRING = { damping: 200, mass: 1, stiffness: 100 } as const;
/** Underdamped: a small overshoot, so an arriving element reads as having mass. */
export const ENTER_SPRING = { damping: 16, mass: 0.7, stiffness: 120 } as const;
/** The rising half of an ambient bloom — soft, no visible overshoot. */
export const RISE_SPRING = { damping: 200, mass: 1, stiffness: 90 } as const;
/** The falling half — slower, so things ebb rather than cut. */
export const FALL_SPRING = { damping: 200, mass: 1.4, stiffness: 60 } as const;

export type BloomWindow = {
  /** Frames the rise spring takes to settle at 1. */
  readonly rise: number;
  /** Local frame at which the fall spring starts. */
  readonly hold: number;
  /** Frames the fall spring takes to settle at 1. */
  readonly fall: number;
};

/**
 * Turns fractions-of-a-loop into whole frames.
 *
 * Expressed as fractions so a composition survives being registered at a
 * different `durationInFrames` without its bloom windows overrunning the
 * cycle. `hold + fall` is capped at 0.9 of the period, which leaves at least a
 * tenth of the loop during which every bloom is provably, exactly zero.
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
 * A rise spring minus a fall spring — 0 → 1 → 0 across one local cycle.
 *
 * Exactly 0 at `localFrame = 0` (both springs sit at `from`) and exactly 0
 * from `hold + fall` onward (both springs have returned `to`). Remotion's
 * `spring()` early-returns `to` once past `durationInFrames`, so this is an
 * exact identity, not an approximation — which is what makes it safe to hang
 * a one-way motion (a light sweep, a travelling highlight) off it.
 */
export const bloom = (
  localFrame: number,
  fps: number,
  window: BloomWindow,
): number => {
  const up = spring({
    frame: localFrame,
    fps,
    config: RISE_SPRING,
    durationInFrames: window.rise,
  });
  const down = spring({
    frame: localFrame,
    fps,
    config: FALL_SPRING,
    delay: window.hold,
    durationInFrames: window.fall,
  });
  return up - down;
};

/* ────────────────────────── reduced motion ────────────────────────────── */

/**
 * `(prefers-reduced-motion: reduce)`, live.
 *
 * Headless Chrome reports `no-preference`, so rendered files are unaffected;
 * the guard is for these compositions embedded in the app through `<Player>`,
 * where it mirrors what `src/index.css` already does for `.live-dot` and
 * `.card-lift`.
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

export type FrameContext = {
  /** The frame every layer should read — already frozen under reduced motion. */
  readonly frame: number;
  readonly fps: number;
  /** `durationInFrames`. For a loop this is one full turn of every cycle. */
  readonly period: number;
  readonly width: number;
  readonly height: number;
  /** Render width ÷ authored width, so px-authored values survive a resize. */
  readonly scale: number;
};

/**
 * Frame source for an **ambient loop**.
 *
 * Under reduced motion the whole plate freezes on `posterT` of the way through
 * the cycle. Deliberately not frame 0: at t = 0 every bloom is exactly zero by
 * construction, so frame 0 is the *emptiest* frame in a loop composition.
 */
export const useLoopFrame = (
  posterT = 0.31,
  designWidth = DESIGN_W,
): FrameContext => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const reduced = usePrefersReducedMotion();
  const period = durationInFrames;
  const frame = reduced
    ? Math.min(Math.round(period * posterT), Math.max(0, period - 1))
    : rawFrame;
  return { frame, fps, period, width, height, scale: width / designWidth };
};

/**
 * Frame source for a **one-shot scene**.
 *
 * Under reduced motion the scene pins to `settledFrame` — a frame past the
 * last beat, so every spring reads exactly 1, every counter reads its final
 * value, and every one-shot flash has clamped back to 0. The result is the
 * finished frame, static.
 */
export const useSceneFrame = (
  settledFrame: number,
  designWidth = DESIGN_W,
): FrameContext => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const reduced = usePrefersReducedMotion();
  const frame = reduced
    ? Math.min(settledFrame, Math.max(0, durationInFrames - 1))
    : rawFrame;
  return {
    frame,
    fps,
    period: durationInFrames,
    width,
    height,
    scale: width / designWidth,
  };
};

/* ───────────────────────────── formatting ─────────────────────────────── */

/**
 * Thousands grouping, by hand.
 *
 * `toLocaleString()` would key off the render machine's locale, which is not
 * pinned in CI — a French box would emit narrow no-break spaces and the
 * numerals would jump around inside a tabular-nums slot. This is deterministic.
 */
export const groupNumber = (value: number): string => {
  const negative = value < 0;
  const digits = String(Math.abs(Math.round(value)));
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) {
      out += ",";
    }
    out += digits.charAt(i);
  }
  return negative ? `-${out}` : out;
};

/** `String.padStart` is ES2017 and this project's `lib` is `es2015`. */
export const pad2 = (value: number): string =>
  value < 10 ? `0${Math.round(value)}` : String(Math.round(value));

/* ──────────────────────────── ambient layers ──────────────────────────── */

/**
 * The fractal-noise tile the design system already uses on glass surfaces,
 * drifting by exactly one tile over the loop so it returns to its starting
 * phase at the seam.
 *
 * Load-bearing rather than decorative: low-alpha gradients across 1920px of
 * near-black band badly on 8-bit output, and a couple of percent of grain is
 * what breaks the banding up.
 */
export const Grain: FC<{
  readonly frame: number;
  readonly period: number;
  readonly scale: number;
  readonly opacity?: number;
}> = ({ frame, period, scale, opacity = 0.05 }) => {
  const t = loopT(frame, period);
  const tile = 120 * scale;
  const shift = -tile * t;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: NOISE_TILE,
        backgroundSize: `${tile}px ${tile}px`,
        backgroundPosition: `${shift}px ${shift}px`,
        opacity,
      }}
    />
  );
};

/**
 * The readability layer, and the reason an ambient plate can sit under copy.
 *
 * Entirely static — no frame dependency at all — so it is trivially identical
 * at both ends of a loop. `focusX`/`focusY` place the soft dark pool where the
 * headline actually lands, which for the landing hero is the left third.
 */
export const Scrim: FC<{
  readonly scale: number;
  readonly focusX?: number;
  readonly focusY?: number;
  readonly strength?: number;
}> = ({ scale, focusX = 33, focusY = 47, strength = 1 }) => {
  const ink = (a: number) => alpha(BRAND.bg, a * strength);
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 64% 62% at ${focusX}% ${focusY}%, ${ink(
            0.6,
          )} 0%, ${ink(0.3)} 44%, ${ink(0)} 78%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, ${ink(0.62)} 0%, ${ink(
            0,
          )} 24%, ${ink(0)} 66%, ${ink(0.72)} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          boxShadow: `inset 0 0 ${Math.round(340 * scale)}px ${Math.round(
            110 * scale,
          )}px ${ink(0.62)}`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * The bed under every *scene* composition (as opposed to the hero plates,
 * which each grow their own). A near-black wash with a primary-tinted ellipse
 * hung off the top edge, mirroring `.bg-radial-fade`.
 *
 * Loop-safe on its own: the only animated quantity is a full-period cosine, so
 * frame 0 and frame `period` are identical.
 */
export const StageWash: FC<{
  readonly frame: number;
  readonly period: number;
  readonly tint?: string;
}> = ({ frame, period, tint = BRAND.primary }) => {
  const t = loopT(frame, period);
  const swell = 0.5 + 0.5 * Math.cos(TAU * t);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: BRAND.bg }} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 86% 52% at 50% -14%, ${alpha(
            tint,
            interpolate(swell, [0, 1], [0.09, 0.13]),
          )} 0%, transparent 66%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 120% 60% at 50% 118%, ${alpha(
            BRAND.surface1,
            0.9,
          )} 0%, transparent 72%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/* ──────────────────────────────── atoms ───────────────────────────────── */

/**
 * The `.eyebrow` treatment from the design system: small, wide-tracked,
 * uppercase, muted. Used once per composition, above the headline.
 */
export const Eyebrow: FC<{
  readonly children: ReactNode;
  readonly color?: string;
  readonly size?: number;
  readonly style?: CSSProperties;
}> = ({ children, color = BRAND.primary, size = 20, style }) => (
  <div
    style={{
      fontFamily: FONT_SANS,
      fontSize: size,
      fontWeight: 600,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color,
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * A word-by-word headline reveal behind a hard mask.
 *
 * Each word is its own overflow-hidden box, so the word rises out of nothing
 * rather than fading through the background. Springs (underdamped, so the word
 * settles with a little weight) drive the rise; `interpolate()` only maps that
 * already-computed spring onto px and opacity.
 *
 * `stagger` is capped at `staggerCap` words for the same reason `HomePage.tsx`
 * caps its own: past the sixth sibling the extra delay stops describing
 * sequence and just makes the tail of the line arrive late.
 */
export const MaskedWords: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly words: readonly string[];
  readonly delay?: number;
  readonly stagger?: number;
  readonly staggerCap?: number;
  readonly duration?: number;
  readonly style?: CSSProperties;
  /** Per-word colour override, by index. */
  readonly accentFrom?: number;
  readonly accentColor?: string;
}> = ({
  frame,
  fps,
  words,
  delay = 0,
  stagger = 4,
  staggerCap = 6,
  duration = 26,
  style,
  accentFrom,
  accentColor = BRAND.primary,
}) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      alignItems: "baseline",
      ...style,
    }}
  >
    {words.map((word, i) => {
      const wordDelay = delay + Math.min(i, staggerCap) * stagger;
      const p = spring({
        frame,
        fps,
        config: ENTER_SPRING,
        delay: wordDelay,
        durationInFrames: duration,
      });
      const lineHeight = 1.02;
      return (
        <span
          key={`${word}-${i}`}
          style={{
            display: "inline-block",
            overflow: "hidden",
            paddingBottom: "0.12em",
            marginBottom: "-0.12em",
            lineHeight,
          }}
        >
          <span
            style={{
              display: "inline-block",
              transform: `translateY(${interpolate(p, [0, 1], [102, 0])}%)`,
              opacity: interpolate(p, [0, 0.35], [0, 1], CLAMP),
              color:
                accentFrom !== undefined && i >= accentFrom
                  ? accentColor
                  : undefined,
            }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        </span>
      );
    })}
  </div>
);

/**
 * The app's card surface: opaque `--card`, hairline `--border`, the design
 * system's `--radius` scaled up for video, and the dark stage's `--shadow-xl`.
 * Content surfaces stay opaque in this design system — glass is structural
 * chrome only — so this is deliberately not translucent.
 */
export const Panel: FC<{
  readonly children: ReactNode;
  readonly style?: CSSProperties;
  readonly radius?: number;
  readonly padding?: number | string;
}> = ({ children, style, radius = 28, padding = 34 }) => (
  <div
    style={{
      backgroundColor: BRAND.card,
      border: `1px solid ${BRAND.border}`,
      borderRadius: radius,
      padding,
      boxShadow: "0 24px 48px -12px rgba(3, 10, 8, 0.7)",
      ...style,
    }}
  >
    {children}
  </div>
);

/** A tinted round chip behind an icon — the `bg-primary/15 text-primary` pill. */
export const IconChip: FC<{
  readonly children: ReactNode;
  readonly size?: number;
  readonly tint?: string;
  readonly radius?: number;
}> = ({ children, size = 64, tint = BRAND.primary, radius = 18 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: radius,
      backgroundColor: alpha(tint, 0.15),
      border: `1px solid ${alpha(tint, 0.28)}`,
      color: tint,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    {children}
  </div>
);

/* ────────────────────────────── icons ─────────────────────────────────── */

type IconProps = {
  readonly size?: number;
  readonly strokeWidth?: number;
};

const iconBase = (size: number, strokeWidth: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/** Hand-drawn to match the lucide-react set the app uses. No package needed. */
export const IconSearch: FC<IconProps> = ({ size = 28, strokeWidth = 1.9 }) => (
  <svg {...iconBase(size, strokeWidth)}>
    <circle cx={11} cy={11} r={7} />
    <path d="M20 20l-3.9-3.9" />
  </svg>
);

export const IconCalendar: FC<IconProps> = ({ size = 28, strokeWidth = 1.9 }) => (
  <svg {...iconBase(size, strokeWidth)}>
    <rect x={3} y={5} width={18} height={16} rx={3} />
    <path d="M3 10h18M8 3v4M16 3v4" />
    <path d="M9.5 15.5l1.8 1.8 3.4-3.6" />
  </svg>
);

export const IconWhistle: FC<IconProps> = ({ size = 28, strokeWidth = 1.9 }) => (
  <svg {...iconBase(size, strokeWidth)}>
    <circle cx={12} cy={12} r={9} />
    <path d="M12 3a9 9 0 000 18M3.6 9h16.8M3.6 15h16.8" />
  </svg>
);

export const IconChart: FC<IconProps> = ({ size = 28, strokeWidth = 1.9 }) => (
  <svg {...iconBase(size, strokeWidth)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export const IconCheck: FC<IconProps> = ({ size = 28, strokeWidth = 2.4 }) => (
  <svg {...iconBase(size, strokeWidth)}>
    <path d="M4.5 12.5l5 5L19.5 6.5" />
  </svg>
);

export const IconStar: FC<IconProps> = ({ size = 28, strokeWidth = 1.6 }) => (
  <svg {...iconBase(size, strokeWidth)} fill="currentColor">
    <path d="M12 3.2l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.6l6.1-.8z" />
  </svg>
);

export const IconPin: FC<IconProps> = ({ size = 28, strokeWidth = 1.9 }) => (
  <svg {...iconBase(size, strokeWidth)}>
    <path d="M12 21.5s7-6.1 7-11.1a7 7 0 10-14 0c0 5 7 11.1 7 11.1z" />
    <circle cx={12} cy={10} r={2.6} />
  </svg>
);

export const IconBolt: FC<IconProps> = ({ size = 28, strokeWidth = 1.9 }) => (
  <svg {...iconBase(size, strokeWidth)}>
    <path d="M13.5 2.5L4.5 13.5h6l-.9 8 9-11h-6z" />
  </svg>
);

export const IconShield: FC<IconProps> = ({ size = 28, strokeWidth = 1.9 }) => (
  <svg {...iconBase(size, strokeWidth)}>
    <path d="M12 2.8l7.5 3v6c0 5-3.2 8.2-7.5 9.4C7.7 20 4.5 16.8 4.5 11.8v-6z" />
    <path d="M9 12.2l2.1 2.1 4-4.2" />
  </svg>
);

export const IconWallet: FC<IconProps> = ({ size = 28, strokeWidth = 1.9 }) => (
  <svg {...iconBase(size, strokeWidth)}>
    <rect x={3} y={6} width={18} height={13} rx={3} />
    <path d="M3 10.5h18" />
    <circle cx={17} cy={15} r={1.2} fill="currentColor" stroke="none" />
  </svg>
);

export const IconArrow: FC<IconProps> = ({ size = 28, strokeWidth = 2.2 }) => (
  <svg {...iconBase(size, strokeWidth)}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const IconQuote: FC<IconProps> = ({ size = 28, strokeWidth = 1.8 }) => (
  <svg {...iconBase(size, strokeWidth)} fill="currentColor" stroke="none">
    <path d="M9.4 5.6C6.3 7 4.4 9.9 4.4 13.6c0 3 1.8 4.8 4.1 4.8 2.1 0 3.7-1.5 3.7-3.6 0-2-1.4-3.4-3.3-3.4-.4 0-.8.1-1 .2.4-1.6 1.8-3 3.6-3.9zM19 5.6c-3.1 1.4-5 4.3-5 8 0 3 1.8 4.8 4.1 4.8 2.1 0 3.7-1.5 3.7-3.6 0-2-1.4-3.4-3.3-3.4-.4 0-.8.1-1 .2.4-1.6 1.8-3 3.6-3.9z" />
  </svg>
);

/* ─────────────────────────── composed helpers ─────────────────────────── */

/**
 * A number that counts up on an **overdamped** spring.
 *
 * Overdamped matters: a counter that overshoots 240 to 247 and comes back does
 * not read as momentum, it reads as a bug. Overdamped is monotonic — the value
 * only ever climbs — while still decelerating into rest the way a linear tween
 * never does.
 *
 * `durationInFrames` makes the arrival exact rather than asymptotic: Remotion
 * time-stretches the spring so it is at rest at `delay + duration` and
 * short-circuits to `to` past that point, so `Math.round(p * value)` is exactly
 * `value` from that frame on — no "239.9997" flicker, no clamp needed.
 */
export const useCountUp = (
  frame: number,
  fps: number,
  value: number,
  delay: number,
  duration: number,
): { readonly shown: number; readonly progress: number } => {
  const progress = spring({
    frame,
    fps,
    config: SETTLE_SPRING,
    delay,
    durationInFrames: duration,
  });
  return { shown: Math.round(progress * value), progress };
};

/**
 * The family's one entrance: rise + fade, driven by a single underdamped
 * spring so an arriving element reads as having mass.
 *
 * Deliberately a plain function rather than a hook — `spring()` is pure, so
 * this can be called inside a `.map()` or a JSX attribute without tripping the
 * rules of hooks. `interpolate()` here only maps an already-computed spring
 * onto px and opacity; it is not standing in for the spring.
 */
export const riseStyle = (
  frame: number,
  fps: number,
  delay: number,
  distance = 26,
  duration = 28,
): CSSProperties => {
  const p = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay,
    durationInFrames: duration,
  });
  return {
    opacity: interpolate(p, [0, 0.4], [0, 1], CLAMP),
    transform: `translateY(${interpolate(p, [0, 1], [distance, 0])}px)`,
  };
};

/**
 * A hairline meter bar driven by an already-computed spring, so the bar and
 * whatever number sits above it are the *same* motion rather than two
 * animations that happen to agree.
 */
export const Meter: FC<{
  readonly progress: number;
  readonly tint?: string;
  readonly height?: number;
  readonly radius?: number;
}> = ({ progress, tint = BRAND.primary, height = 6, radius = 3 }) => (
  <div
    style={{
      width: "100%",
      height,
      borderRadius: radius,
      backgroundColor: alpha(BRAND.fg, 0.08),
      overflow: "hidden",
    }}
  >
    <div
      style={{
        width: `${interpolate(progress, [0, 1], [0, 100], CLAMP)}%`,
        height: "100%",
        borderRadius: radius,
        background: `linear-gradient(90deg, ${alpha(tint, 0.55)} 0%, ${tint} 100%)`,
      }}
    />
  </div>
);

/**
 * The "Live availability" pill from the hero, with its ping.
 *
 * The ping is a modulo cycle (`wrap(frame, pingPeriod)`), so it is loop-safe by
 * construction wherever this is dropped — including on top of a seamless plate.
 */
export const LivePill: FC<{
  readonly frame: number;
  readonly label?: string;
  readonly pingPeriod?: number;
  readonly fontSize?: number;
}> = ({ frame, label = "Live availability", pingPeriod = 60, fontSize = 20 }) => {
  const p = wrap(frame, pingPeriod) / pingPeriod;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: `${fontSize * 0.5}px ${fontSize * 0.95}px`,
        borderRadius: 999,
        border: `1px solid ${BRAND.border}`,
        backgroundColor: BRAND.surface1,
        fontFamily: FONT_SANS,
        fontSize,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: BRAND.fgSoft,
      }}
    >
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          width: fontSize * 0.42,
          height: fontSize * 0.42,
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            backgroundColor: BRAND.primary,
            opacity: interpolate(p, [0, 1], [0.7, 0], CLAMP),
            transform: `scale(${interpolate(p, [0, 1], [1, 3.1], {
              ...CLAMP,
              easing: EASE_OUT_EXPO,
            })})`,
          }}
        />
        <span
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 999,
            backgroundColor: BRAND.primary,
          }}
        />
      </span>
      {label}
    </div>
  );
};

/**
 * A pill button, drawn not wired — these are video frames, so this is the CTA
 * as it *looks* in the app, matching `Button size="lg"` (h-12, rounded-xl,
 * semibold 15px, scaled for a 1920px canvas).
 */
export const CtaButton: FC<{
  readonly label: string;
  readonly variant?: "solid" | "outline";
  readonly scale?: number;
  readonly arrowShift?: number;
}> = ({ label, variant = "solid", scale = 1, arrowShift = 0 }) => {
  const solid = variant === "solid";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12 * scale,
        height: 82 * scale,
        padding: `0 ${40 * scale}px`,
        borderRadius: 20 * scale,
        backgroundColor: solid ? BRAND.primary : "transparent",
        border: solid ? "none" : `1px solid ${BRAND.borderStrong}`,
        color: solid ? BRAND.primaryFg : BRAND.fg,
        fontFamily: FONT_DISPLAY,
        fontSize: 27 * scale,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        boxShadow: solid
          ? `0 18px 40px -18px ${alpha(BRAND.primary, 0.7)}`
          : "none",
      }}
    >
      {label}
      <span
        style={{
          display: "inline-flex",
          transform: `translateX(${arrowShift}px)`,
        }}
      >
        <IconArrow size={26 * scale} />
      </span>
    </div>
  );
};
