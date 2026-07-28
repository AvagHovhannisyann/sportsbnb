/**
 * shared — internals for the SportsBnB "loading, skeletons & transitions"
 * family. Not a composition: brand tokens, loop primitives, skeleton atoms and
 * the mock app screens that the 25 compositions in this directory build on.
 *
 * ── Colour ────────────────────────────────────────────────────────────────
 * Every value is lifted verbatim from the `.dark` block of `src/index.css`
 * ("Court at night"), the theme the app ships. Nothing here is invented.
 * HSL is written in comma form because that is what a CSS engine parses
 * unambiguously from a string; the stylesheet's space-separated Level-4 syntax
 * only exists there because it is fed through `hsl(var(--token))`.
 *
 * ── Self-containment ──────────────────────────────────────────────────────
 * No network of any kind: no <Img>, no @font-face, no remote CSS. `index.css`
 * pulls Space Grotesk / DM Sans / JetBrains Mono from Google Fonts, which a
 * headless render cannot reach, so the documented *system tails* of those same
 * stacks are used. The one asset is the inline `data:` SVG noise tile copied
 * verbatim from the `.glass::before` rule.
 *
 * ── Loop safety ───────────────────────────────────────────────────────────
 * Three drivers, and nothing else, are allowed to animate anything in this
 * family:
 *
 *   1. `cosWave(t, φ)` = ½ + ½cos(2πt + φ) — a *full* cosine period, so it is
 *      bit-identical at t = 0 and t = 1 for any phase φ. Stagger is expressed
 *      as φ, which is why stagger and seamlessness coexist here.
 *   2. A modulo cycle — rotations of exactly ±360°, background positions
 *      shifted by exactly one tile / one gradient period, dash offsets shifted
 *      by exactly one dash period. Shifting a tiled image by exactly one tile
 *      is the identity map, so the wrap is an ordinary step, not a snap.
 *   3. `loopPulse()` — a spring *in* minus a spring *out*, read at
 *      `wrap(frame − phase, period)`. Remotion's `springCalculation` clamps its
 *      frame at `Math.max(0, frame)` and `advance()` with `deltaTime = 0`
 *      returns exactly `from`, so both springs are exactly 0 at local frame 0;
 *      `spring()` short-circuits to `to` once `frame − delay > durationInFrames`,
 *      so both are exactly 1 once settled. The pulse is therefore exactly
 *      `0 − 0 = 0` at the bottom of its cycle and exactly `1 − 1 = 0` once
 *      settled. Exact, not approximate — it falls out of Remotion's own early
 *      returns. Callers must keep `hold + fall + 1 ≤ period`.
 *
 * A one-way tween is never used as a loop driver. Where geometry genuinely has
 * to travel one way (expanding rings, the sweep glow), its *opacity* is exactly
 * 0 at both ends of its cycle: an invisible element cannot contribute a pixel,
 * so where it happens to have travelled to at the wrap cannot show.
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

/* ───────────────────────────── brand tokens ───────────────────────────── */

/** `src/index.css` → `.dark` ("Court at night"). */
export const C = {
  /** --background: 160 22% 5% */
  bg: "hsl(160, 22%, 5%)",
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
  /** --primary: 151 90% 47% — electric court green */
  primary: "hsl(151, 90%, 47%)",
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
  /** --destructive: 358 72% 68% — the text-safe step */
  destructive: "hsl(358, 72%, 68%)",
  /** --destructive-solid: 358 68% 42% — the fill behind white text */
  destructiveSolid: "hsl(358, 68%, 42%)",
  /** --chart-2: 190 80% 50% */
  cyan: "hsl(190, 80%, 50%)",
  /** --chart-4: 268 80% 76% */
  violet: "hsl(268, 80%, 76%)",
} as const;

export const primary = (a: number): string => `hsla(151, 90%, 47%, ${a})`;
export const chalk = (a: number): string => `hsla(100, 20%, 96%, ${a})`;
export const hairline = (a: number): string => `hsla(157, 12%, 22%, ${a})`;
/** The shadow ink from the `.dark` shadow tokens: `hsl(160 30% 2%)`. */
export const ink = (a: number): string => `hsla(160, 30%, 2%, ${a})`;
export const danger = (a: number): string => `hsla(358, 72%, 68%, ${a})`;
export const warn = (a: number): string => `hsla(42, 95%, 55%, ${a})`;
export const cyan = (a: number): string => `hsla(190, 80%, 50%, ${a})`;
export const muted = (a: number): string => `hsla(130, 8%, 64%, ${a})`;

/**
 * The system tails of `--font-display` / `--font-sans` / `--font-mono`. The
 * webfont heads are deliberately dropped — a headless render cannot fetch them.
 */
export const DISPLAY_FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const SANS_FONT =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

/** Inline noise tile — identical to the one in `.glass::before`. */
export const NOISE_TILE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")";
export const NOISE_TILE_PX = 120;

/** `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`. */
export const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
/** `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`. */
export const EASE_SPRING = Easing.bezier(0.34, 1.56, 0.64, 1);
/** A symmetric in-out, for the hold-wipe-hold schedules the transitions use. */
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

export const TAU = Math.PI * 2;

/* ──────────────────────────── loop primitives ─────────────────────────── */

/** Positive modulo — the backbone of every cycle in this family. */
export const wrap = (value: number, period: number): number =>
  ((value % period) + period) % period;

/**
 * A full cosine period. `cosWave(0, φ) === cosWave(1, φ)` for every φ, which is
 * what lets per-element phase offsets carry the stagger without costing loop
 * safety. Range [0, 1], crest at t = 0.
 */
export const cosWave = (t: number, phase = 0): number =>
  0.5 + 0.5 * Math.cos(TAU * t + phase);

/**
 * A triangle wave: 0 at t = 0, 1 at t = ½, back to 0 at t = 1. Continuous
 * across the wrap (both ends are exactly 0), so it is a legal ping-pong driver.
 */
export const triangle = (t: number): number => 1 - Math.abs(2 * wrap(t, 1) - 1);

export type PingPongArgs = {
  /** Normalised loop position, 0 → 1. */
  t: number;
  /** Fraction of the cycle spent holding on each of the two states. */
  hold: number;
  /** Easing applied to each traverse. Defaults to a symmetric in-out. */
  easing?: (input: number) => number;
};

/**
 * The out-and-back schedule the four transition compositions run on:
 *
 *   hold A · traverse A→B · hold B · traverse B→A
 *
 * Returns 0 when the A screen is fully in place and 1 when the B screen is.
 * It is a legal loop driver for two independent reasons: the value is exactly
 * 0 at t = 0 and exactly 0 at t = 1, *and* both ends sit inside a hold, so the
 * derivative is 0 there too — the loop does not just match, it matches without
 * a velocity discontinuity, which is what a seam actually looks like on a
 * moving edge.
 */
export const pingPongPhase = ({ t, hold, easing = EASE_IN_OUT }: PingPongArgs): number => {
  const h = Math.min(0.45, Math.max(0, hold));
  const move = 0.5 - h;
  const u = wrap(t, 1);

  if (u < h) {
    return 0;
  }
  if (u < h + move) {
    return easing((u - h) / move);
  }
  if (u < 2 * h + move) {
    return 1;
  }
  return 1 - easing((u - (2 * h + move)) / move);
};

/** Hermite smoothstep. Zero slope at both ends, so it never lands with a jerk. */
export const smoothstep = (x: number): number => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

/** Degrees → radians, for the many places SVG wants one and maths the other. */
export const rad = (deg: number): number => (deg * Math.PI) / 180;

/** A point on a circle of radius `r` at `deg`, with 0° pointing straight up. */
export const polar = (deg: number, r: number): { x: number; y: number } => ({
  x: Math.sin(rad(deg)) * r,
  y: -Math.cos(rad(deg)) * r,
});

/** The subset of Remotion's SpringConfig this family ever sets. */
export type SpringShape = {
  damping: number;
  mass: number;
  stiffness: number;
};

export const SPRING_SNAP: SpringShape = { damping: 11, mass: 0.6, stiffness: 130 };
export const SPRING_SETTLE: SpringShape = { damping: 26, mass: 1, stiffness: 120 };

export type LoopPulseArgs = {
  /** Composition frame, already wrapped by the loop clock. */
  frame: number;
  fps: number;
  /** Loop length in frames. Must satisfy `hold + fall + 1 <= period`. */
  period: number;
  /** Frames to delay this element's cycle by — this is the stagger. */
  phase?: number;
  /** Frames the rise spring takes to settle. */
  rise?: number;
  /** Local frame at which the fall spring starts. */
  hold?: number;
  /** Frames the fall spring takes to settle. */
  fall?: number;
};

/**
 * A spring that rises with overshoot, holds, and settles back to exactly where
 * it started — the only shape of spring that can live inside a seamless loop.
 * See driver (3) in the file header for why both ends are exactly zero.
 */
export const loopPulse = ({
  frame,
  fps,
  period,
  phase = 0,
  rise = 14,
  hold = 26,
  fall = 18,
}: LoopPulseArgs): number => {
  const local = wrap(frame - phase, period);
  const up = spring({
    frame: local,
    fps,
    config: SPRING_SNAP,
    durationInFrames: rise,
  });
  const down = spring({
    frame: local,
    fps,
    delay: hold,
    config: SPRING_SETTLE,
    durationInFrames: fall,
  });
  return up - down;
};

/**
 * `(prefers-reduced-motion: reduce)`, live.
 *
 * Headless Chrome reports `no-preference`, so renders are unaffected; a viewer
 * who has asked their OS to calm things down and then meets one of these loops
 * embedded in the app gets the still frame instead. Every driver above is a
 * pure function of the clock, so freezing the clock at the loop origin renders
 * exactly the frame the loop opens and closes on — nothing is hidden and
 * nothing jumps.
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

/* ─────────────────────────────── loop clock ───────────────────────────── */

export type LoopClock = {
  /** Wrapped composition frame, frozen at 0 under reduced motion. */
  frame: number;
  fps: number;
  /** Loop length in frames. */
  period: number;
  /** Normalised loop position. `t(0) = 0`, `t(period) = 1 ≡ 0`. */
  t: number;
  reduced: boolean;
};

/**
 * The single clock every composition in this family reads. Making every
 * downstream value a pure function of this is what makes
 * `frame(period) ≡ frame(0)` true by construction rather than by inspection.
 */
export const useLoopClock = (): LoopClock => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const reduced = usePrefersReducedMotion();
  const frame = reduced ? 0 : wrap(rawFrame, durationInFrames);
  return {
    frame,
    fps,
    period: durationInFrames,
    t: frame / durationInFrames,
    reduced,
  };
};

/* ─────────────────────────────── the stage ────────────────────────────── */

export type StageProps = {
  /** Design-canvas width everything inside is authored against. */
  w: number;
  /** Design-canvas height. */
  h: number;
  background?: string;
  children?: ReactNode;
};

/**
 * Letterboxes and scales the design canvas to whatever size the composition is
 * registered at, so a piece authored at 1200×800 survives being re-registered
 * at 1080×720 for a different surface.
 */
export const Stage: FC<StageProps> = ({ w, h, background = C.bg, children }) => {
  const { width, height } = useVideoConfig();
  const scale = Math.min(width / w, height / h);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: background,
        alignItems: "center",
        justifyContent: "center",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        style={{
          position: "relative",
          width: w,
          height: h,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          overflow: "hidden",
          backgroundColor: background,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/* ──────────────────────────────── backdrop ────────────────────────────── */

export type CourtBackdropProps = {
  /** Normalised loop position, so the grain can drift exactly one tile. */
  t: number;
  /** `.bg-grid-soft` tile size. The design system ships 56px. */
  grid?: number;
  /** Strength of the `.bg-radial-fade` bloom at the top of the stage. */
  bloom?: number;
  /** Corner vignette strength. */
  vignette?: number;
  /** Where the bloom is centred, as a percentage of the stage width. */
  bloomX?: number;
};

/**
 * The page ground shared by every composition here: `--background`, the design
 * system's `.bg-grid-soft` and `.bg-radial-fade`, a corner vignette, and film
 * grain that drifts by exactly one 120px tile per cycle — a modulo cycle, so
 * frame 0 and the final frame sample the tile identically.
 */
export const CourtBackdrop: FC<CourtBackdropProps> = ({
  t,
  grid = 56,
  bloom = 0.1,
  vignette = 0.55,
  bloomX = 50,
}) => {
  const grain = t * NOISE_TILE_PX;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: C.bg }} />

      {/* .bg-grid-soft — deliberately static. A moving ground makes a
          placeholder read as content. */}
      <AbsoluteFill
        style={{
          backgroundImage: [
            `linear-gradient(to right, ${hairline(0.5)} 1px, transparent 1px)`,
            `linear-gradient(to bottom, ${hairline(0.5)} 1px, transparent 1px)`,
          ].join(", "),
          backgroundSize: `${grid}px ${grid}px`,
          opacity: 0.5,
        }}
      />

      {/* .bg-radial-fade */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 50% at ${bloomX}% -10%, ${primary(bloom)}, transparent 60%)`,
        }}
      />

      {/* Corner vignette. */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(ellipse 78% 68% at 50% 46%, transparent 40%, ${ink(vignette)} 100%)`,
        }}
      />

      {/* Film grain, drifting exactly one tile per cycle. */}
      <AbsoluteFill
        style={{
          backgroundImage: NOISE_TILE,
          backgroundSize: `${NOISE_TILE_PX}px ${NOISE_TILE_PX}px`,
          backgroundPosition: `${grain}px ${grain}px`,
          opacity: 0.05,
        }}
      />
    </AbsoluteFill>
  );
};

/* ──────────────────────────── skeleton shimmer ────────────────────────── */

/**
 * Sweep geometry, shared by all five skeleton compositions.
 *
 * `SHEEN_ANGLE` is the CSS gradient angle (0° = up, 90° = right), so the light
 * front is a line tilted 10° off vertical. `SHEEN_TILT` is that tilt expressed
 * as "how many x-units of phase one y-unit is worth" — `-cot(α)` — which is
 * what lets a *per-element* background offset add up to one coherent,
 * layout-wide wavefront instead of a stack of unrelated shimmers.
 */
export const SHEEN_ANGLE = 100;
export const SHEEN_TILT = Math.tan(rad(SHEEN_ANGLE - 90));

/** Sweep-axis coordinate of a point. The wavefront is `axis(x, y) === wave`. */
export const sheenAxis = (x: number, y: number): number => x + SHEEN_TILT * y;

/**
 * The shimmer gradient at a given intensity.
 *
 * First and last stops are fully transparent and the coloured band is inset
 * ≥ 34% from either end, so the vertical edges of every tile are *fully*
 * transparent and abutting tiles show no seam. Narrow that margin and a hard
 * edge appears at every tile boundary. At `env = 0` the whole image is
 * transparent, which is the belt-and-braces guarantee at the loop seam.
 */
export const buildSheen = (env: number): string =>
  [
    `linear-gradient(${SHEEN_ANGLE}deg,`,
    `${chalk(0)} 34%,`,
    `${chalk(0.05 * env)} 43%,`,
    `${primary(0.17 * env)} 50%,`,
    `${chalk(0.05 * env)} 57%,`,
    `${chalk(0)} 66%)`,
  ].join(" ");

export type Sweep = {
  /** Sweep-axis position of the light front, in canvas px. */
  wave: number;
  /** Sheen intensity. Exactly 0 at both ends of the cycle. */
  env: number;
  /** The gradient, with `env` already folded into its stop alphas. */
  sheen: string;
  /** One full sweep period, in canvas px. Also the `background-size`. */
  period: number;
};

/**
 * Build the sweep for a stage.
 *
 * `wave` advances by exactly `period` over one cycle, and the sheen is a tiled
 * background of exactly `period` px — shifting a tiled image by exactly one
 * tile is the identity map, so the wrap is an ordinary step and there is no
 * snap. `env` is `sin²(πt) = ½ − ½cos(2πt)` shaped by `--ease-out-expo`;
 * `Easing.bezier` returns exactly 0 for exactly 0, so `env(0) = env(1) = 0`
 * survives the shaping.
 */
export const useSweep = (clock: LoopClock, period: number, start: number): Sweep => {
  const { t, reduced } = clock;
  const wave = interpolate(t, [0, 1], [start, start + period]);
  const raw = 0.5 - 0.5 * Math.cos(TAU * t);
  const env = reduced
    ? 0
    : interpolate(raw, [0, 1], [0, 1], {
        easing: EASE_OUT_EXPO,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  return { wave, env, sheen: buildSheen(env), period };
};

/**
 * The three-step skeleton ramp — 26% → 22% → 18% lightness, all shipped `.dark`
 * tokens, each step clearing its neighbour by 4 percentage points so the ramp
 * reads both on the page background (5%) and on a card (13%). A skeleton bar
 * that cannot be seen against its own card is not a skeleton, it is a blank
 * rectangle, and it defeats the reason the app chose skeletons over a spinner:
 * showing the shape of what is coming.
 */
export type SkeletonTone = "strong" | "soft" | "faint" | "brand" | "warn";

export const SKELETON_TONE: Record<SkeletonTone, string> = {
  /** `--border-strong` — titles, images, primary bars. */
  strong: C.borderStrong,
  /** `--border` — secondary bars, chips. */
  soft: C.border,
  /** `--surface-3` — labels, tracks, tertiary detail. */
  faint: C.surface3,
  /** `--primary` at a tint — prices and calls to action. */
  brand: primary(0.17),
  /** `--warning` at a tint — pending / held slots. */
  warn: warn(0.16),
};

export type ShimmerBlockProps = {
  sweep: Sweep;
  /** Position inside the current positioned parent. */
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * Global offset of that parent on the stage. Used for the shimmer *phase*
   * only: boxes are laid out locally but must resolve one global wavefront, or
   * the light front visibly breaks at every card edge.
   */
  ox?: number;
  oy?: number;
  r?: number;
  tone?: SkeletonTone;
  opacity?: number;
  style?: CSSProperties;
};

/**
 * One skeleton bar.
 *
 * The shimmer is a tiled background whose horizontal offset is
 * `wave − period/2 − globalX − TILT·(globalY + h/2)`. The first two terms are
 * the light front; the last two cancel the box's own position so that every
 * box, at every depth of nesting, resolves the same global wavefront. The
 * `h/2` term corrects for the gradient line of a wide, short tile being
 * measured from its corner rather than its midline.
 */
export const ShimmerBlock: FC<ShimmerBlockProps> = ({
  sweep,
  x,
  y,
  w,
  h,
  ox = 0,
  oy = 0,
  r = 8,
  tone = "strong",
  opacity = 1,
  style,
}) => {
  const gx = ox + x;
  const gy = oy + y;
  const offset = sweep.wave - sweep.period / 2 - gx - SHEEN_TILT * (gy + h / 2);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: r,
        backgroundColor: SKELETON_TONE[tone],
        backgroundImage: sweep.sheen,
        backgroundSize: `${sweep.period}px 100%`,
        backgroundRepeat: "repeat",
        backgroundPosition: `${offset}px 0px`,
        opacity,
        ...style,
      }}
    />
  );
};

export type SkeletonPanelProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  /** Elevation, 0 → 1. Drives the layered `--shadow-lg` deepening. */
  lift?: number;
  background?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/**
 * A card surface: `rounded-2xl border border-border bg-card` plus the
 * `.card-lift` shadow, here driven by the loop rather than by a pointer.
 */
export const SkeletonPanel: FC<SkeletonPanelProps> = ({
  x,
  y,
  w,
  h,
  r = 20,
  lift = 0,
  background = C.card,
  style,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: r,
      backgroundColor: background,
      border: `1px solid ${C.border}`,
      boxShadow: [
        `0 16px 32px -8px ${ink(0.5 + 0.18 * lift)}`,
        `0 6px 12px -4px ${ink(0.38 + 0.12 * lift)}`,
        `inset 0 0 0 1px ${primary(0.14 * lift)}`,
        `0 0 34px -12px ${primary(0.42 * lift)}`,
      ].join(", "),
      transform: `translateY(${-7 * lift}px)`,
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

/** A hairline divider. Static — it is structure, not content. */
export const Rule: FC<{ x: number; y: number; w: number; alpha?: number }> = ({
  x,
  y,
  w,
  alpha = 0.7,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: 1,
      backgroundColor: hairline(alpha),
    }}
  />
);

/* ─────────────────────────────── type atoms ───────────────────────────── */

export type EyebrowProps = {
  x: number;
  y: number;
  children: ReactNode;
  color?: string;
  size?: number;
  align?: "left" | "center";
  width?: number;
};

/**
 * The design system's `.eyebrow` treatment — mono caps at 0.2em.
 *
 * `letter-spacing` hangs a phantom gap off the last glyph, which drags a
 * centred line half a track to the left; the negative right margin takes that
 * gap back out of the inline box before centring measures it.
 */
export const Eyebrow: FC<EyebrowProps> = ({
  x,
  y,
  children,
  color = primary(0.78),
  size = 11,
  align = "left",
  width,
}) => {
  const tracking = size * 0.2;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        textAlign: align,
        fontFamily: MONO_FONT,
        fontSize: size,
        fontWeight: 500,
        textTransform: "uppercase",
        color,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ letterSpacing: tracking, marginRight: -tracking }}>{children}</span>
    </div>
  );
};

/* ───────────────────────────── mock app screen ────────────────────────── */

export type MockScreenVariant = "discover" | "detail" | "bookings" | "checkout";

export type MockScreenProps = {
  w: number;
  h: number;
  variant: MockScreenVariant;
  /** Tint of the screen's hero block, so A and B read as different pages. */
  accent?: string;
};

const screenRows = (
  variant: MockScreenVariant,
  w: number,
): Array<{ x: number; y: number; w: number; h: number; r: number; fill: string }> => {
  const pad = 40;
  const inner = w - pad * 2;

  if (variant === "discover") {
    const cardW = (inner - 24) / 2;
    return [
      { x: pad, y: 150, w: inner, h: 44, r: 14, fill: C.surface2 },
      { x: pad, y: 218, w: cardW, h: 200, r: 18, fill: C.card },
      { x: pad + cardW + 24, y: 218, w: cardW, h: 200, r: 18, fill: C.card },
      { x: pad, y: 442, w: cardW, h: 200, r: 18, fill: C.card },
      { x: pad + cardW + 24, y: 442, w: cardW, h: 200, r: 18, fill: C.card },
    ];
  }

  if (variant === "detail") {
    return [
      { x: pad, y: 150, w: inner, h: 260, r: 20, fill: C.surface2 },
      { x: pad, y: 434, w: inner * 0.6, h: 26, r: 13, fill: C.borderStrong },
      { x: pad, y: 476, w: inner * 0.44, h: 16, r: 8, fill: C.border },
      { x: pad, y: 520, w: inner * 0.62, h: 122, r: 18, fill: C.card },
      { x: pad + inner * 0.66, y: 434, w: inner * 0.34, h: 208, r: 18, fill: C.card },
    ];
  }

  if (variant === "bookings") {
    return [
      { x: pad, y: 150, w: inner, h: 96, r: 18, fill: C.card },
      { x: pad, y: 266, w: inner, h: 96, r: 18, fill: C.card },
      { x: pad, y: 382, w: inner, h: 96, r: 18, fill: C.card },
      { x: pad, y: 498, w: inner, h: 96, r: 18, fill: C.card },
    ];
  }

  return [
    { x: pad, y: 150, w: inner * 0.58, h: 300, r: 20, fill: C.card },
    { x: pad, y: 474, w: inner * 0.58, h: 168, r: 20, fill: C.card },
    { x: pad + inner * 0.62, y: 150, w: inner * 0.38, h: 340, r: 20, fill: C.surface2 },
    { x: pad + inner * 0.62, y: 514, w: inner * 0.38, h: 56, r: 16, fill: C.primarySoft },
  ];
};

/**
 * A stylised, deliberately static SportsBnB screen — nav chrome plus the block
 * rhythm of one real route. The four transition compositions animate *between*
 * two of these; keeping them static is the point, because a transition demo
 * that also animates its content cannot show you the transition.
 */
export const MockScreen: FC<MockScreenProps> = ({ w, h, variant, accent = C.primary }) => {
  const rows = screenRows(variant, w);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: w,
        height: h,
        backgroundColor: C.bg,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -10%, ${accent}1f, transparent 60%)`,
        }}
      />

      {/* Sticky glass header. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: 84,
          backgroundColor: C.surface1,
          borderBottom: `1px solid ${C.border}`,
          boxShadow: `inset 0 1px 0 0 ${chalk(0.05)}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 26,
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: accent,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 34,
          width: 108,
          height: 14,
          borderRadius: 7,
          backgroundColor: C.borderStrong,
        }}
      />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: w - 320 + i * 84,
            top: 36,
            width: 56,
            height: 10,
            borderRadius: 5,
            backgroundColor: C.border,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: w - 76,
          top: 26,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: C.borderStrong,
        }}
      />

      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: row.x,
            top: row.y,
            width: row.w,
            height: row.h,
            borderRadius: row.r,
            backgroundColor: row.fill,
            border: `1px solid ${C.border}`,
          }}
        />
      ))}

      {/* One accent block per screen, so A and B are told apart at a glance. */}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: h - 76,
          width: 148,
          height: 40,
          borderRadius: 14,
          backgroundColor: accent,
          opacity: 0.9,
        }}
      />
    </div>
  );
};
