/**
 * SkeletonLoop — SportsBnB `/discover` loading state.
 *
 * 1200×800 · 60fps · 90 frames (1.5s) · perfectly seamless.
 *
 * Two jobs. It is a conference-grade loop of the app's loading skeleton, and
 * it is the *reference spec* for the CSS implementation that ships in the
 * product: the geometry below mirrors `DiscoverPage`'s skeleton grid block
 * one-for-one, and the shimmer is specified here in terms a stylesheet can
 * reproduce exactly. The CSS equivalent is written out at the bottom of this
 * header.
 *
 * ── Why it loops, exactly ─────────────────────────────────────────────────
 * Every animated quantity in this file is a pure function of
 * `wrap(frame, durationInFrames)`, so the state at frame 90 is *by
 * construction* the state at frame 0. That alone is not enough — a one-way
 * tween is also "identical at 0 and 90" only because it snaps back — so each
 * driver is additionally continuous across the seam:
 *
 *   1. `wave` — the sheen's position along the sweep axis. It advances by
 *      exactly `SHEEN_PERIOD` over one cycle, and the sheen is a background
 *      image with `background-size: SHEEN_PERIOD px` and `background-repeat`.
 *      Shifting a tiled image by exactly one tile is the identity map, so
 *      frame 89 → frame 0 advances one ordinary step. There is no snap.
 *
 *   2. `env` — the sheen's intensity, `sin²(πt) = ½ − ½cos(2πt)`. A full
 *      cosine period: exactly 0 at t = 0 and exactly 0 at t = 1. Because the
 *      sheen and the travelling glow are *invisible* at the seam, their
 *      geometry there cannot matter at all. This is belt and braces on top
 *      of (1).
 *
 *   3. `breathe` — `½ + ½cos(2πt + φ)`. A full cosine period for any φ, so
 *      per-element phase offsets (the stagger) cost nothing in loop safety.
 *
 *   4. `pulse()` — a spring *in* minus a spring *out*, read at
 *      `wrap(frame − phase, period)`. Remotion's `springCalculation` clamps
 *      its frame at `Math.max(0, frame)` and `advance()` with `deltaTime = 0`
 *      returns exactly `from`, so both springs are exactly 0 at local frame 0;
 *      `spring()` short-circuits to `to` once `frame − delay > durationInFrames`,
 *      so both are exactly 1 once settled. The pulse is therefore exactly
 *      `0 − 0 = 0` at the bottom of its cycle and exactly `1 − 1 = 0` for every
 *      local frame ≥ 53, which is before the 90-frame cycle wraps. Exact, not
 *      approximate — it falls out of Remotion's own early returns.
 *
 *   5. The film grain shifts by exactly one 120px tile per cycle.
 *
 * There is not one one-way tween across the composition's lifetime.
 *
 * ── Stagger ───────────────────────────────────────────────────────────────
 * Nothing pops at once, and the stagger is not an arbitrary index ramp: each
 * element's spring is phased to fire when the light front actually reaches it.
 * `sheenPassFrame()` projects the element's centre onto the sweep axis and
 * converts that to the frame at which `wave` crosses it. The result is a wave
 * of springs rolling diagonally across the layout, led by the sheen. Because
 * the stagger is expressed as *phase inside a periodic cycle* rather than as a
 * start offset on a one-way animation, stagger and seamlessness coexist.
 *
 * ── Reduced motion ────────────────────────────────────────────────────────
 * `(prefers-reduced-motion: reduce)` zeroes `env` (the sheen resolves to fully
 * transparent stops), zeroes every spring, and pins `breathe` to its midpoint.
 * What is left is the flat, legible skeleton — the exact equivalent of
 * `animation: none`, which is what `src/index.css` already does for
 * `.live-dot` and `.card-lift`. Headless Chrome reports `no-preference`, so
 * renders are unaffected; the guard is for the loop when it is embedded in the
 * app.
 *
 * ── Self-containment ──────────────────────────────────────────────────────
 * No network of any kind: no `<Img>`, no `@font-face`, no remote CSS.
 * `src/index.css` pulls Space Grotesk / DM Sans / JetBrains Mono from Google
 * Fonts, which a headless render cannot reach, so the documented *system tails*
 * of those same stacks are used. The single asset is the inline `data:` SVG
 * noise tile copied verbatim from the `.glass::before` rule.
 *
 * ── Colour ────────────────────────────────────────────────────────────────
 * Every value is lifted from the `.dark` block of `src/index.css` ("Court at
 * night"), the theme the app ships. Nothing is invented.
 *
 * ── CSS reference implementation ──────────────────────────────────────────
 * The product-side shimmer this composition specifies:
 *
 *   .skeleton {
 *     background-color: hsl(var(--border-strong));   -- see TONE_FILL below
 *     background-image: linear-gradient(100deg,
 *       hsl(var(--foreground) / 0)    34%,
 *       hsl(var(--foreground) / 0.05) 43%,
 *       hsl(var(--primary)    / 0.16) 50%,
 *       hsl(var(--foreground) / 0.05) 57%,
 *       hsl(var(--foreground) / 0)    66%);
 *     background-size: 1560px 100%;   -- one sweep period
 *     background-repeat: repeat;
 *     animation: skeleton-sweep 1.5s linear infinite;
 *   }
 *   @keyframes skeleton-sweep {
 *     from { background-position: 0 0; }
 *     to   { background-position: 1560px 0; }   -- exactly one tile, so it closes
 *   }
 *   @media (prefers-reduced-motion: reduce) {
 *     .skeleton { background-image: none; animation: none; }
 *   }
 *
 * Two details that are load-bearing and easy to lose:
 *   • The gradient's first and last stops are fully transparent, and the angled
 *     stops sit ≥ 34% from either end. The gradient line of a 1560 × H tile at
 *     100° is 1560·sin100° + H·cos100°, so the vertical tile edges span only
 *     ~3% of the gradient at the tallest block here (H = 268). 34% of margin
 *     means both edges of every tile are *fully transparent*, so the tiles
 *     abut with no seam. Narrow that margin and a hard edge appears.
 *   • Translating `background-position` by exactly one `background-size` is
 *     what makes the keyframe loop. Tailwind's current `shimmer` keyframe
 *     (`-200% 0 → 200% 0`) is a 400% shift against an unspecified size and
 *     does *not* close; it should be replaced with the above.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type FC,
  type ReactNode,
} from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* ──────────────────────── composition constants ───────────────────────── */

export const SKELETON_LOOP_FPS = 60;
/** 90 frames @ 60fps = exactly 1.5s. */
export const SKELETON_LOOP_DURATION = 90;
export const SKELETON_LOOP_WIDTH = 1200;
export const SKELETON_LOOP_HEIGHT = 800;

/** The design canvas everything below is authored against. */
const STAGE_W = SKELETON_LOOP_WIDTH;
const STAGE_H = SKELETON_LOOP_HEIGHT;

/* ─────────────────────────── brand tokens ─────────────────────────────── */

/**
 * `src/index.css` → `.dark` ("Court at night"). Written in comma form because
 * that is what every CSS engine accepts unambiguously in a string; the
 * stylesheet's space-separated Level-4 syntax only exists there because it is
 * being fed through `hsl(var(--token))`.
 */
const C = {
  /** --background: 160 22% 5% */
  bg: "hsl(160, 22%, 5%)",
  /** --surface-1: 160 18% 10% */
  surface1: "hsl(160, 18%, 10%)",
  /** --surface-3: 158 13% 18% */
  surface3: "hsl(158, 13%, 18%)",
  /** --card: 160 15% 13% */
  card: "hsl(160, 15%, 13%)",
  /** --border: 157 12% 22% */
  border: "hsla(157, 12%, 22%, 1)",
} as const;

const primary = (a: number) => `hsla(151, 90%, 47%, ${a})`;
const chalk = (a: number) => `hsla(100, 20%, 96%, ${a})`;
const hairline = (a: number) => `hsla(157, 12%, 22%, ${a})`;
const ink = (a: number) => `hsla(160, 30%, 2%, ${a})`;

/**
 * The system tail of `--font-mono`. The webfont head (JetBrains Mono) is
 * deliberately dropped — see the header. Only the eyebrow uses type.
 */
const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

/** Inline noise tile — identical to the one in `.glass::before`. */
const NOISE_TILE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")";
const NOISE_TILE_PX = 120;

/** `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` from the design system. */
const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);

const TAU = Math.PI * 2;

/* ───────────────────────── loop primitives ────────────────────────────── */

/** Positive modulo — the backbone of every cycle in this file. */
const wrap = (value: number, period: number): number =>
  ((value % period) + period) % period;

/**
 * Sweep geometry.
 *
 * `SHEEN_ANGLE` is the CSS gradient angle (0° = up, 90° = right), so the
 * light front is a straight line tilted 10° off vertical. `SHEEN_TILT` is
 * that same tilt expressed as "how many x-units of phase one y-unit is
 * worth" — `-cot(α) = tan(α − 90°)` — which is what lets a *per-element*
 * background offset add up to one coherent, layout-wide wavefront.
 */
const SHEEN_ANGLE = 100;
const SHEEN_TILT = Math.tan(((SHEEN_ANGLE - 90) * Math.PI) / 180);
/** One full sweep period, in canvas px. Also the shimmer's background-size. */
const SHEEN_PERIOD = 1560;
/** Where the light front sits at t = 0: off-canvas left. */
const SHEEN_START = -180;

/** Global sweep-axis coordinate of a point — the wavefront is `phase = wave`. */
const axis = (x: number, y: number): number => x + SHEEN_TILT * y;

/** Frames the rise spring takes to settle. */
const PULSE_RISE = 16;
/** Roughly where the rise spring crests — used to centre the stagger. */
const PULSE_PEAK = 10;
/** Local frame at which the fall spring starts. */
const PULSE_HOLD = 30;
/** Frames the fall spring takes to settle. */
const PULSE_FALL = 22;
/** PULSE_HOLD + PULSE_FALL + 1 = 53 < 90, so the pulse is closed at the wrap. */

/**
 * `(prefers-reduced-motion: reduce)`, live.
 *
 * Headless Chrome reports `no-preference`, so renders are unaffected; a user
 * who has asked their OS to calm things down and then meets this loop embedded
 * in the app gets the flat skeleton instead.
 */
const usePrefersReducedMotion = (): boolean => {
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

/* ───────────────────────────── loop clock ─────────────────────────────── */

type LoopClock = {
  /** Composition frame, already frozen if the viewer wants reduced motion. */
  frame: number;
  fps: number;
  /** Loop length in frames. */
  period: number;
  /** Normalised loop position. `t(0) = 0`, `t(period) = 1 ≡ 0`. */
  t: number;
  /** Sweep-axis position of the light front, in canvas px. */
  wave: number;
  /** Sheen intensity, exactly 0 at both ends of the cycle. */
  env: number;
  /** The shimmer gradient, with `env` already folded into its stop alphas. */
  sheen: string;
  reduced: boolean;
};

const LoopCtx = createContext<LoopClock | null>(null);

const useLoop = (): LoopClock => {
  const clock = useContext(LoopCtx);
  if (clock === null) {
    throw new Error("SkeletonLoop internals must render inside <LoopCtx.Provider>");
  }
  return clock;
};

/**
 * Nested coordinate origin.
 *
 * Children of a card are laid out in the card's local space, but the shimmer
 * has to be phased against *global* canvas space or the wavefront breaks at
 * every card edge. This carries the accumulated offset down so a block can
 * position itself locally and phase itself globally.
 */
const OriginCtx = createContext<{ ox: number; oy: number }>({ ox: 0, oy: 0 });

/**
 * Build the shimmer gradient at a given intensity.
 *
 * The first and last stops are fully transparent and the coloured band is
 * inset ≥ 34% from either end — see the header for why that margin is what
 * makes the tiles abut invisibly. At `env = 0` every alpha is 0, i.e. the
 * whole image is transparent, which is what guarantees the seam.
 */
const buildSheen = (env: number): string =>
  [
    `linear-gradient(${SHEEN_ANGLE}deg,`,
    `${chalk(0)} 34%,`,
    `${chalk(0.05 * env)} 43%,`,
    `${primary(0.17 * env)} 50%,`,
    `${chalk(0.05 * env)} 57%,`,
    `${chalk(0)} 66%)`,
  ].join(" ");

/**
 * The frame at which the light front crosses a box's centre.
 *
 * `wave` runs linearly from `SHEEN_START` to `SHEEN_START + SHEEN_PERIOD`
 * across the cycle, so inverting it is a straight ratio. This is the stagger.
 */
const sheenPassFrame = (
  gx: number,
  gy: number,
  w: number,
  h: number,
  period: number,
): number => ((axis(gx + w / 2, gy + h / 2) - SHEEN_START) / SHEEN_PERIOD) * period;

/**
 * A spring that rises with overshoot, holds, and settles back to exactly
 * where it started — the only shape of spring that can live inside a seamless
 * loop. See point (4) in the header for why both ends are exact.
 */
const usePulse = (gx: number, gy: number, w: number, h: number, lag: number): number => {
  const { frame, fps, period, reduced } = useLoop();
  const phase = wrap(sheenPassFrame(gx, gy, w, h, period) + lag - PULSE_PEAK, period);
  const local = wrap(frame - phase, period);

  const rise = spring({
    frame: local,
    fps,
    config: { damping: 11, mass: 0.6, stiffness: 130 },
    durationInFrames: PULSE_RISE,
  });
  const fall = spring({
    frame: local,
    fps,
    delay: PULSE_HOLD,
    config: { damping: 26, mass: 1, stiffness: 120 },
    durationInFrames: PULSE_FALL,
  });

  return reduced ? 0 : rise - fall;
};

/**
 * Gentle base breathing — the loop's answer to `animate-pulse`. A full cosine
 * period, so any phase offset is loop-safe.
 */
const useBreathe = (gx: number, gy: number): number => {
  const { t, reduced } = useLoop();
  if (reduced) {
    return 0.5;
  }
  const phi = (axis(gx, gy) / SHEEN_PERIOD) * TAU;
  return 0.5 + 0.5 * Math.cos(TAU * t + phi);
};

/* ────────────────────────── skeleton atoms ────────────────────────────── */

type Tone = "strong" | "soft" | "faint" | "brand";

/**
 * The three-step skeleton ramp — 26% → 22% → 18% lightness, all shipped
 * `.dark` tokens.
 *
 * This deliberately does *not* copy DiscoverPage's current pairing, and that
 * is the point of the composition doubling as a spec. The page fills its bars
 * with `bg-surface-3` (18%) and `bg-surface-2` (14%) and then puts them on
 * `bg-card` (13%). Sampled off the first render of this composition, a
 * surface-2 bar on a card came back rgb(29, 40, 36) against a card of
 * rgb(28, 38, 35) — a ratio of about 1.03:1. The subtitle bar, both amenity
 * chips and the rating bar were, in the literal sense, invisible; the card
 * read as an empty slab.
 *
 * A skeleton whose bars cannot be seen is not a skeleton, it is a blank
 * rectangle, and it defeats the reason DiscoverPage chose skeletons over a
 * spinner in the first place — showing the shape of what is coming.
 *
 * Every step here clears its neighbour by 4 percentage points, so the ramp
 * reads on the page background (5%) *and* on a card (13%), which is what a
 * single set of skeleton tokens has to do.
 */
const TONE_FILL: Record<Tone, string> = {
  /** `--border-strong: 155 10% 26%` — titles, images, primary bars. */
  strong: "hsl(155, 10%, 26%)",
  /** `--border: 157 12% 22%` — secondary bars, chips. */
  soft: "hsl(157, 12%, 22%)",
  /** `--surface-3: 158 13% 18%` — labels, tracks, tertiary detail. */
  faint: C.surface3,
  /** `--primary` at a tint — prices and the two calls to action. */
  brand: primary(0.17),
};

type BlockProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Border radius. Skeleton bars in the app are `rounded-md`; pills override. */
  r?: number;
  tone?: Tone;
  /** Extra frames of stagger on top of the sheen-derived phase. */
  lag?: number;
  style?: CSSProperties;
};

/**
 * One skeleton bar.
 *
 * Positioned in local space, phased in global space. The shimmer is a tiled
 * background whose horizontal offset is
 *
 *     wave − PERIOD/2 − globalX − TILT·(globalY + h/2)
 *
 * The first two terms are the light front; the last two cancel the box's own
 * position so that every box, at every depth of nesting, resolves the *same*
 * global wavefront. `− h/2` corrects for the gradient line of a wide, short
 * tile being measured from its corner rather than its midline.
 */
const Block: FC<BlockProps> = ({ x, y, w, h, r = 8, tone = "strong", lag = 0, style }) => {
  const { wave, sheen } = useLoop();
  const { ox, oy } = useContext(OriginCtx);
  const gx = ox + x;
  const gy = oy + y;

  const p = usePulse(gx, gy, w, h, lag);
  const breathe = useBreathe(gx, gy);

  const base = interpolate(breathe, [0, 1], [0.82, 1]);
  const opacity = Math.min(1, base + p * 0.16);
  const offset = wave - SHEEN_PERIOD / 2 - gx - SHEEN_TILT * (gy + h / 2);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: r,
        backgroundColor: TONE_FILL[tone],
        backgroundImage: sheen,
        backgroundSize: `${SHEEN_PERIOD}px 100%`,
        backgroundRepeat: "repeat",
        backgroundPosition: `${offset}px 0px`,
        opacity,
        transform: `translateY(${interpolate(p, [0, 1], [0, -3])}px)`,
        ...style,
      }}
    />
  );
};

/** A hairline divider. Static — it is structure, not content. */
const Rule: FC<{ x: number; y: number; w: number }> = ({ x, y, w }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: 1,
      backgroundColor: hairline(0.7),
    }}
  />
);

type PanelProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  lag?: number;
  /** How far the panel lifts at the crest of its spring. */
  lift?: number;
  children?: ReactNode;
};

/**
 * A card surface. Mirrors `.panel` / the DiscoverPage skeleton card:
 * `rounded-2xl border border-border bg-card`, plus the `.card-lift` shadow
 * deepening — here driven by the spring rather than by a pointer.
 */
const Panel: FC<PanelProps> = ({ x, y, w, h, r = 20, lag = 0, lift = 7, children }) => {
  const { ox, oy } = useContext(OriginCtx);
  const gx = ox + x;
  const gy = oy + y;
  const p = usePulse(gx, gy, w, h, lag);

  const dy = interpolate(p, [0, 1], [0, -lift]);
  const shadow = [
    `0 16px 32px -8px ${ink(interpolate(p, [0, 1], [0.5, 0.68]))}`,
    `0 6px 12px -4px ${ink(interpolate(p, [0, 1], [0.38, 0.5]))}`,
    `inset 0 0 0 1px ${primary(p * 0.14)}`,
    `0 0 34px -12px ${primary(p * 0.42)}`,
  ].join(", ");

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: r,
        backgroundColor: C.card,
        border: `1px solid ${C.border}`,
        boxShadow: shadow,
        transform: `translateY(${dy}px)`,
        overflow: "hidden",
      }}
    >
      <OriginCtx.Provider value={{ ox: gx, oy: gy }}>{children}</OriginCtx.Provider>
    </div>
  );
};

/* ─────────────────────────────── layers ───────────────────────────────── */

/**
 * Page ground: `--background`, the design system's `.bg-radial-fade` and
 * `.bg-grid-soft`, a corner vignette, and the travelling glow.
 *
 * The glow is the one element whose *geometry* differs between frame 0 and
 * frame 90 — it tracks `wave`, which advances a full period. It is legal
 * because its opacity is `env`, which is exactly 0 at both ends: an invisible
 * element cannot contribute a pixel, so the seam holds regardless of where it
 * has travelled to.
 */
const Backdrop: FC<Record<string, never>> = () => {
  const { t, wave, env } = useLoop();
  const grain = t * NOISE_TILE_PX;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: C.bg }} />

      {/* .bg-grid-soft — 56px, hsl(var(--border) / 0.5). Static: the layout
          must read as still, or the skeleton stops looking like a placeholder
          and starts looking like content. */}
      <AbsoluteFill
        style={{
          backgroundImage: [
            `linear-gradient(to right, ${hairline(0.5)} 1px, transparent 1px)`,
            `linear-gradient(to bottom, ${hairline(0.5)} 1px, transparent 1px)`,
          ].join(", "),
          backgroundSize: "56px 56px",
          opacity: 0.5,
        }}
      />

      {/* .bg-radial-fade */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -10%, ${primary(0.1)}, transparent 60%)`,
        }}
      />

      {/* The light source behind the sheen. */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle 620px at ${wave}px ${STAGE_H * 0.42}px, ${primary(0.09)}, transparent 70%)`,
          opacity: env,
        }}
      />

      {/* Corner vignette — pulls the eye to the grid. */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(ellipse 78% 68% at 50% 46%, transparent 40%, ${ink(0.55)} 100%)`,
        }}
      />

      {/* Film grain, drifting by exactly one tile per cycle. */}
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

/**
 * The indeterminate progress rail across the very top of the viewport.
 *
 * Same tiling trick as the block shimmer, so it is periodic by construction,
 * and phased off the same `wave` so the comet leads the sheen rather than
 * running to its own clock.
 */
const ProgressRail: FC<Record<string, never>> = () => {
  const { wave, env } = useLoop();
  const comet = [
    `linear-gradient(90deg,`,
    `${primary(0)} 30%,`,
    `${primary(0.5 * env)} 44%,`,
    `${primary(0.95 * env)} 50%,`,
    `${primary(0.5 * env)} 56%,`,
    `${primary(0)} 70%)`,
  ].join(" ");

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: STAGE_W,
          height: 3,
          backgroundColor: primary(0.1),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: STAGE_W,
          height: 3,
          backgroundImage: comet,
          backgroundSize: `${SHEEN_PERIOD}px 100%`,
          backgroundRepeat: "repeat",
          backgroundPosition: `${wave - SHEEN_PERIOD / 2}px 0px`,
        }}
      />
    </>
  );
};

/** App chrome: brand mark, wordmark, nav, account pill, avatar. */
const Chrome: FC<Record<string, never>> = () => (
  <>
    <Block x={44} y={40} w={44} h={44} r={14} tone="brand" />
    <Block x={104} y={46} w={132} h={16} r={8} tone="strong" lag={2} />
    <Block x={104} y={70} w={86} h={10} r={5} tone="soft" lag={4} />

    <Block x={706} y={56} w={64} h={12} r={6} tone="soft" />
    <Block x={798} y={56} w={72} h={12} r={6} tone="soft" />
    <Block x={890} y={56} w={56} h={12} r={6} tone="soft" />

    <Block x={972} y={42} w={112} h={40} r={20} tone="strong" lag={2} />
    <Block x={1112} y={40} w={44} h={44} r={22} tone="strong" lag={4} />

    <Rule x={44} y={116} w={1112} />
  </>
);

/** Left filter rail — search, checkbox groups, price slider, chips, apply. */
const FilterRail: FC<Record<string, never>> = () => {
  const RAIL_X = 44;
  const RAIL_W = 252;
  const rows: Array<{ y: number; w: number; tone: Tone }> = [
    { y: 244, w: 152, tone: "strong" },
    { y: 276, w: 124, tone: "soft" },
    { y: 308, w: 168, tone: "soft" },
  ];
  const chips: Array<{ x: number; y: number; w: number }> = [
    { x: RAIL_X, y: 514, w: 84 },
    { x: RAIL_X + 92, y: 514, w: 66 },
    { x: RAIL_X, y: 552, w: 96 },
    { x: RAIL_X + 104, y: 552, w: 74 },
  ];

  return (
    <>
      <Block x={RAIL_X} y={148} w={RAIL_W} h={46} r={14} tone="strong" />

      <Block x={RAIL_X} y={216} w={96} h={12} r={6} tone="faint" lag={2} />
      {rows.map((row, i) => (
        <Block
          key={`row-${row.y}`}
          x={RAIL_X}
          y={row.y}
          w={20}
          h={20}
          r={6}
          tone="soft"
          lag={3 + i * 2}
        />
      ))}
      {rows.map((row, i) => (
        <Block
          key={`row-bar-${row.y}`}
          x={RAIL_X + 32}
          y={row.y + 4}
          w={row.w}
          h={12}
          r={6}
          tone={row.tone}
          lag={4 + i * 2}
        />
      ))}

      <Rule x={RAIL_X} y={340} w={RAIL_W} />

      <Block x={RAIL_X} y={364} w={82} h={12} r={6} tone="faint" lag={2} />
      <Block x={RAIL_X} y={400} w={RAIL_W} h={6} r={3} tone="faint" />
      <Block x={RAIL_X} y={400} w={150} h={6} r={3} tone="brand" lag={2} />
      <Block x={RAIL_X + 140} y={396} w={20} h={20} r={10} tone="strong" lag={3} />
      <Block x={RAIL_X} y={428} w={54} h={12} r={6} tone="soft" lag={4} />
      <Block x={RAIL_X + 154} y={428} w={54} h={12} r={6} tone="soft" lag={6} />

      <Rule x={RAIL_X} y={462} w={RAIL_W} />

      <Block x={RAIL_X} y={486} w={108} h={12} r={6} tone="faint" lag={2} />
      {chips.map((chip, i) => (
        <Block
          key={`chip-${chip.x}-${chip.y}`}
          x={chip.x}
          y={chip.y}
          w={chip.w}
          h={30}
          r={15}
          tone="soft"
          lag={3 + i * 2}
        />
      ))}

      <Rule x={RAIL_X} y={594} w={RAIL_W} />

      <Block x={RAIL_X} y={618} w={RAIL_W} h={46} r={14} tone="brand" lag={4} />
    </>
  );
};

/**
 * The `role="status"` line the real page carries as
 * `aria-label="Loading venues"` — here rendered as the design system's
 * `.eyebrow` (mono caps, 0.2em) beside a `.live-dot`.
 */
const StatusLine: FC<{ x: number; y: number }> = ({ x, y }) => {
  const p = usePulse(x, y, 8, 8, 0);
  const breathe = useBreathe(x, y);

  return (
    <>
      {/* .live-dot::after — the expanding ring. Opacity is exactly 0 at the
          bottom of the spring's cycle, so the scale it happens to be at when
          the loop wraps cannot show. */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: primary(1),
          opacity: interpolate(p, [0, 1], [0, 0.55]),
          transform: `scale(${interpolate(p, [0, 1], [1, 2.9], { easing: EASE_OUT_EXPO })})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: primary(1),
          opacity: interpolate(breathe, [0, 1], [0.72, 1]),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x + 20,
          top: y - 5,
          fontFamily: MONO_FONT,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: primary(interpolate(breathe, [0, 1], [0.5, 0.78])),
          whiteSpace: "nowrap",
        }}
      >
        Loading venues
      </div>
    </>
  );
};

/**
 * One venue card. Geometry mirrors `VenueCard` and the DiscoverPage skeleton
 * exactly: a 3:2 image box, title at 3/5 width, subtitle at 2/5, two amenity
 * chips, then price and rating on one row.
 */
const VenueCardSkeleton: FC<{ x: number; y: number; lag: number }> = ({ x, y, lag }) => {
  const W = 402;
  const H = 428;
  const PAD = 20;
  const INNER = W - PAD * 2;

  return (
    <Panel x={x} y={y} w={W} h={H} lag={lag}>
      {/* aspect-[3/2] — the real card's image box. A skeleton whose geometry
          differs from the card it stands in for only relocates the layout
          shift instead of removing it. */}
      <Block x={0} y={0} w={W} h={268} r={0} tone="strong" lag={lag} />

      <Block
        x={PAD}
        y={288}
        w={Math.round(INNER * 0.6)}
        h={18}
        r={9}
        tone="strong"
        lag={lag + 2}
      />
      <Block
        x={PAD}
        y={318}
        w={Math.round(INNER * 0.4)}
        h={14}
        r={7}
        tone="soft"
        lag={lag + 4}
      />

      <Block x={PAD} y={346} w={68} h={26} r={13} tone="soft" lag={lag + 6} />
      <Block x={PAD + 80} y={346} w={84} h={26} r={13} tone="soft" lag={lag + 7} />

      <Block x={PAD} y={388} w={104} h={20} r={10} tone="brand" lag={lag + 8} />
      <Block x={PAD + INNER - 52} y={391} w={52} h={14} r={7} tone="soft" lag={lag + 9} />
    </Panel>
  );
};

/** The wide "recently viewed" result row under the grid. */
const WideRowSkeleton: FC<{ x: number; y: number }> = ({ x, y }) => {
  const W = 828;
  const H = 96;

  return (
    <Panel x={x} y={y} w={W} h={H} r={18} lag={4} lift={5}>
      <Block x={16} y={12} w={120} h={72} r={12} tone="strong" />
      <Block x={152} y={22} w={236} h={16} r={8} tone="strong" lag={2} />
      <Block x={152} y={48} w={168} h={12} r={6} tone="soft" lag={4} />
      <Block x={152} y={70} w={104} h={12} r={6} tone="faint" lag={6} />
      <Block x={W - 16 - 96} y={30} w={96} h={20} r={10} tone="brand" lag={8} />
      <Block x={W - 16 - 64} y={58} w={64} h={12} r={6} tone="soft" lag={10} />
    </Panel>
  );
};

/** Results column: status row, sort controls, the card grid, the wide row. */
const ResultsGrid: FC<Record<string, never>> = () => (
  <>
    <StatusLine x={328} y={152} />
    <Block x={952} y={140} w={104} h={36} r={18} tone="soft" lag={2} />
    <Block x={1068} y={140} w={88} h={36} r={18} tone="soft" lag={4} />

    <VenueCardSkeleton x={328} y={204} lag={0} />
    <VenueCardSkeleton x={754} y={204} lag={2} />

    <WideRowSkeleton x={328} y={660} />
  </>
);

/* ──────────────────────────────── root ────────────────────────────────── */

export type SkeletonLoopProps = Record<string, never>;

export const SkeletonLoop: FC<SkeletonLoopProps> = () => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const reduced = usePrefersReducedMotion();

  /**
   * The single clock. Everything downstream is a pure function of this, which
   * is what makes `frame(period) ≡ frame(0)` true by construction rather than
   * by inspection.
   */
  const frame = reduced ? 0 : wrap(rawFrame, durationInFrames);
  const t = frame / durationInFrames;

  /** Linear sweep across exactly one period — see header point (1). */
  const wave = interpolate(t, [0, 1], [SHEEN_START, SHEEN_START + SHEEN_PERIOD]);

  /**
   * `sin²(πt)`, then shaped with the design system's `--ease-out-expo` so the
   * sheen reaches full strength early and holds across the layout instead of
   * spiking only at mid-canvas. `Easing.bezier` returns exactly 0 for exactly
   * 0, so `env(0) = env(1) = 0` survives the shaping — see header point (2).
   */
  const envRaw = 0.5 - 0.5 * Math.cos(TAU * t);
  const env = reduced
    ? 0
    : interpolate(envRaw, [0, 1], [0, 1], {
        easing: EASE_OUT_EXPO,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  const clock: LoopClock = {
    frame,
    fps,
    period: durationInFrames,
    t,
    wave,
    env,
    sheen: buildSheen(env),
    reduced,
  };

  /** Survive being registered at a different size than it was authored for. */
  const scale = Math.min(width / STAGE_W, height / STAGE_H);

  return (
    <LoopCtx.Provider value={clock}>
      <AbsoluteFill
        style={{
          backgroundColor: C.bg,
          alignItems: "center",
          justifyContent: "center",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div
          style={{
            position: "relative",
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            overflow: "hidden",
            backgroundColor: C.surface1,
          }}
        >
          {/* Every layer starts at frame 0 (Sequence's default). Sequence is
              used here for what it is best at inside a loop — naming layers in
              the Studio timeline — not for scheduling. A non-zero `from` would
              hand children a frame no longer congruent with the loop clock,
              and the stagger is carried by spring *phase* instead. */}
          <Sequence name="Backdrop" durationInFrames={durationInFrames}>
            <Backdrop />
          </Sequence>

          <Sequence name="Chrome" durationInFrames={durationInFrames}>
            <AbsoluteFill>
              <Chrome />
            </AbsoluteFill>
          </Sequence>

          <Sequence name="Filter rail" durationInFrames={durationInFrames}>
            <AbsoluteFill>
              <FilterRail />
            </AbsoluteFill>
          </Sequence>

          <Sequence name="Results grid" durationInFrames={durationInFrames}>
            <AbsoluteFill>
              <ResultsGrid />
            </AbsoluteFill>
          </Sequence>

          <Sequence name="Progress rail" durationInFrames={durationInFrames}>
            <AbsoluteFill>
              <ProgressRail />
            </AbsoluteFill>
          </Sequence>
        </div>
      </AbsoluteFill>
    </LoopCtx.Provider>
  );
};

export default SkeletonLoop;
