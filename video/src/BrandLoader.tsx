/**
 * BrandLoader — SportsBnB app loading screen.
 *
 * 600×600, 2s @ 30fps (60 frames), a *perfectly* seamless loop: the state at
 * frame `durationInFrames` is bit-identical to the state at frame 0, so the
 * rendered WebM can be looped in the React app with no visible seam.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * Every animated quantity in this file is a pure function of one of exactly
 * three loop-safe drivers, and nothing else:
 *
 *   1. `t = frame / durationInFrames` fed through a **full** sine/cosine
 *      period — `sin(2πt)` and `cos(2πt)` are equal at t = 0 and t = 1.
 *   2. A **modulo cycle** — rotations of exactly ±360°, dash offsets shifted
 *      by exactly one dash period, background positions shifted by exactly one
 *      tile, radii/opacities whose opacity is exactly 0 at both ends of the
 *      cycle (invisible ⇒ identical pixels regardless of the geometry).
 *   3. `pulse()` — a spring *in* minus a spring *out*, phase-shifted by
 *      `wrap(frame - phase, period)`. Both springs are given an explicit
 *      `durationInFrames`, so Remotion returns exactly `to` (1) once they are
 *      past it: the pulse is therefore exactly `0` at local frame 0 and
 *      exactly `1 - 1 = 0` for every local frame ≥ 36. Not "approximately";
 *      the spring's own early-return makes it exact.
 *
 * There is not a single one-way tween across the composition's lifetime.
 *
 * ── Stagger ───────────────────────────────────────────────────────────────
 * Nothing arrives at once. The 48 court ticks are a travelling comet head
 * (each tick phase-offset by i/48 of the cycle), the three venue pins fire
 * their springs 20 frames apart, and the nine wordmark letters ripple 2.6
 * frames apart. Because staggering is expressed as *phase* inside a periodic
 * cycle rather than as a start offset on a one-way animation, the stagger and
 * the seamless loop coexist.
 *
 * ── Self-containment ──────────────────────────────────────────────────────
 * No network at all: no <Img>, no @font-face, no remote CSS. `src/index.css`
 * pulls Space Grotesk / DM Sans / JetBrains Mono from Google Fonts, which a
 * headless render cannot reach, so we use the documented system tail of those
 * same stacks. The only asset is an inline `data:` SVG noise tile, copied
 * verbatim from the `.glass::before` rule in the design system.
 *
 * ── Colour ────────────────────────────────────────────────────────────────
 * Every colour is lifted from the `.dark` block of `src/index.css` ("Court at
 * night"), which is the theme the app actually ships. Nothing is invented.
 */

import { useEffect, useState, type CSSProperties, type FC } from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* ─────────────────────────── brand tokens ─────────────────────────────── */

/**
 * `src/index.css` → `.dark` ("Court at night"). Values are the raw HSL triples
 * from the custom properties, written in comma form because
 * `interpolateColors` parses `hsl(h, s%, l%)` and not the space-separated
 * Level-4 syntax the stylesheet uses inside `hsl(var(--token))`.
 */
const BRAND = {
  /** --background: 160 22% 5% */
  background: "hsl(160, 22%, 5%)",
  /** --surface-1: 160 18% 10% */
  surface1: "hsl(160, 18%, 10%)",
  /** --surface-2: 160 15% 14% */
  surface2: "hsl(160, 15%, 14%)",
  /** --card: 160 15% 13% */
  card: "hsl(160, 15%, 13%)",
  /** --border: 157 12% 22% */
  border: "hsl(157, 12%, 22%)",
  /** --primary: 151 90% 47% — electric court green */
  primary: "hsl(151, 90%, 47%)",
  /** --foreground: 100 20% 96% — chalk white */
  foreground: "hsl(100, 20%, 96%)",
  /** --chart-2: 190 80% 50% */
  accent: "hsl(190, 80%, 50%)",
} as const;

const courtGreen = (alpha: number) => `hsla(151, 90%, 47%, ${alpha})`;
const cyan = (alpha: number) => `hsla(190, 80%, 50%, ${alpha})`;
const chalk = (alpha: number) => `hsla(100, 20%, 96%, ${alpha})`;
const ink = (alpha: number) => `hsla(160, 22%, 5%, ${alpha})`;
const hairline = (alpha: number) => `hsla(157, 12%, 22%, ${alpha})`;

/**
 * The system tail of `--font-display` / `--font-mono`. The webfont heads
 * (Space Grotesk, JetBrains Mono) are deliberately dropped — see the header.
 */
const DISPLAY_FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

/** Inline noise tile — identical to the one in `.glass::before`. */
const NOISE_TILE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` from the design system. */
const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);

const TAU = Math.PI * 2;

/* ─────────────────────────── loop primitives ──────────────────────────── */

/** Positive modulo — the backbone of every cycle below. */
const wrap = (value: number, period: number): number =>
  ((value % period) + period) % period;

/** Frames after the local cycle start at which the rise spring is at rest. */
const PULSE_RISE = 13;
/** Local frame at which the fall spring starts. */
const PULSE_HOLD = 20;
/** Frames the fall spring takes to settle. */
const PULSE_FALL = 15;

type PulseArgs = {
  /** Composition frame (already frozen if the viewer wants reduced motion). */
  frame: number;
  fps: number;
  /**
   * Loop length. Must exceed PULSE_HOLD + PULSE_FALL (35) for the pulse to
   * close back to exactly zero before the cycle wraps.
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
 * `frame - delay > durationInFrames`, and `springCalculation` clamps negative
 * frames to `from`. So:
 *
 *   local = 0                 → 0 - 0 = 0   (both springs before their start)
 *   local ≥ PULSE_SETTLED     → 1 - 1 = 0   (both springs short-circuited)
 *
 * Both ends are *exactly* zero, so the value is continuous across the wrap.
 */
const pulse = ({ frame, fps, period, phase }: PulseArgs): number => {
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

/**
 * `(prefers-reduced-motion: reduce)`, live.
 *
 * Headless Chrome reports `no-preference`, so renders are unaffected; a user
 * who has asked their OS to calm things down and then meets this loader
 * embedded in the app gets the still frame instead.
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

/* ───────────────────────────── geometry ───────────────────────────────── */

/** Everything below is authored against a 600×600 design canvas. */
const CANVAS = 600;
const TICK_COUNT = 48;
/** Top, lower-right, lower-left — a court triangle. */
const PIN_ANGLES = [-90, 30, 150] as const;
const WORDMARK = "SPORTSBNB";
/** Index at which "BNB" starts, so it can take the court-green. */
const WORDMARK_SPLIT = 6;

/* ────────────────────────────── layers ────────────────────────────────── */

type BackdropProps = {
  breath: number;
  gridTile: number;
  gridShift: number;
  centerYPercent: number;
};

/** Tinted court floor: radial base, breathing court-green bloom, drifting grid. */
const Backdrop: FC<BackdropProps> = ({
  breath,
  gridTile,
  gridShift,
  centerYPercent,
}) => {
  const maskFade = `radial-gradient(circle at 50% ${centerYPercent}%, #000 0%, #000 40%, transparent 74%)`;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% ${centerYPercent}%, ${BRAND.surface1} 0%, ${BRAND.background} 66%)`,
        }}
      />

      {/* Court grid — drifts by exactly one tile per loop, so t=1 ≡ t=0. */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(to right, ${hairline(0.9)} 1px, transparent 1px), linear-gradient(to bottom, ${hairline(0.9)} 1px, transparent 1px)`,
          backgroundSize: `${gridTile}px ${gridTile}px, ${gridTile}px ${gridTile}px`,
          backgroundPosition: `${gridShift}px ${gridShift}px, ${gridShift}px ${gridShift}px`,
          WebkitMaskImage: maskFade,
          maskImage: maskFade,
          opacity: 0.85,
        }}
      />

      {/* Court-green bloom on a full sine period. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% ${centerYPercent}%, ${courtGreen(0.2)} 0%, ${courtGreen(0.05)} 34%, transparent 62%)`,
          opacity: 0.55 + 0.45 * breath,
          transform: `scale(${1 + 0.09 * breath})`,
        }}
      />
    </AbsoluteFill>
  );
};

type CourtRigProps = {
  frame: number;
  fps: number;
  period: number;
  /** 0 → 1 across exactly one loop. */
  t: number;
  unit: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
};

/**
 * The rotating rig: tick comet, sweep arc, counter arc, route triangle,
 * venue pins and the two expanding court ripples.
 */
const CourtRig: FC<CourtRigProps> = ({
  frame,
  fps,
  period,
  t,
  unit,
  cx,
  cy,
  width,
  height,
}) => {
  const rTick = 190 * unit;
  const rSweep = 168 * unit;
  const rCounter = 140 * unit;

  const sweepCircumference = TAU * rSweep;
  const counterCircumference = TAU * rCounter;

  /** Dash period of the route line — offset shifts by exactly one period. */
  const routeDash = 4 * unit;
  const routeGap = 10 * unit;
  const routePeriod = routeDash + routeGap;

  const pinPoints = PIN_ANGLES.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: Math.cos(rad) * rSweep, y: Math.sin(rad) * rSweep };
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", inset: 0 }}
    >
      <g transform={`translate(${cx} ${cy})`}>
        {/* ── Ripples. Opacity is exactly 0 at both ends of each cycle, so the
            radius snapping back is rendered identically either side. ── */}
        {[0, 0.5].map((offset) => {
          const u = wrap(t + offset, 1);
          const radius = interpolate(u, [0, 1], [76 * unit, 252 * unit], {
            easing: EASE_OUT_EXPO,
          });
          const opacity = interpolate(u, [0, 0.12, 0.74, 1], [0, 0.4, 0, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <circle
              key={offset}
              r={radius}
              fill="none"
              stroke={BRAND.primary}
              strokeWidth={interpolate(u, [0, 1], [2.4 * unit, 0.6 * unit])}
              opacity={opacity}
            />
          );
        })}

        {/* ── Static tracks ── */}
        <circle
          r={rSweep}
          fill="none"
          stroke={BRAND.border}
          strokeWidth={1.5 * unit}
          opacity={0.9}
        />
        <circle
          r={rCounter}
          fill="none"
          stroke={BRAND.border}
          strokeWidth={1 * unit}
          opacity={0.6}
        />

        {/* ── Tick comet: 48 ticks, each phase-offset by i/48 of the loop. ── */}
        {Array.from({ length: TICK_COUNT }, (_, i) => {
          const phase = i / TICK_COUNT;
          const wave = 0.5 + 0.5 * Math.cos(TAU * (t - phase));
          // Tightens the lit band into a comet head. Still a pure function of a
          // 2π-periodic input, so still seamless.
          const head = Math.pow(wave, 6);
          const length = (6 + 16 * head) * unit;
          return (
            <line
              key={i}
              x1={0}
              y1={-rTick}
              x2={0}
              y2={-rTick - length}
              stroke={interpolateColors(head, [0, 1], [BRAND.border, BRAND.primary])}
              strokeWidth={(1.6 + 1.4 * head) * unit}
              strokeLinecap="round"
              opacity={0.34 + 0.66 * head}
              transform={`rotate(${(i / TICK_COUNT) * 360})`}
            />
          );
        })}

        {/* ── Sweep arc: exactly one turn per loop. Glow pass, then core. ── */}
        <g transform={`rotate(${t * 360})`}>
          <circle
            r={rSweep}
            fill="none"
            stroke={BRAND.primary}
            strokeWidth={13 * unit}
            strokeLinecap="round"
            strokeDasharray={`${sweepCircumference * 0.22} ${sweepCircumference * 0.78}`}
            opacity={0.13}
          />
          <circle
            r={rSweep}
            fill="none"
            stroke={BRAND.primary}
            strokeWidth={3 * unit}
            strokeLinecap="round"
            strokeDasharray={`${sweepCircumference * 0.22} ${sweepCircumference * 0.78}`}
          />
        </g>

        {/* ── Counter arc: exactly one turn the other way. ── */}
        <g transform={`rotate(${-t * 360 + 150})`}>
          <circle
            r={rCounter}
            fill="none"
            stroke={BRAND.accent}
            strokeWidth={2 * unit}
            strokeLinecap="round"
            strokeDasharray={`${counterCircumference * 0.11} ${counterCircumference * 0.89}`}
            opacity={0.55}
          />
        </g>

        {/* ── Route between the three venues. Dash offset moves exactly one
            dash period per loop. ── */}
        <polygon
          points={pinPoints.map((p) => `${p.x},${p.y}`).join(" ")}
          fill={courtGreen(0.035)}
          stroke={courtGreen(0.32)}
          strokeWidth={1.25 * unit}
          strokeDasharray={`${routeDash} ${routeGap}`}
          strokeDashoffset={-t * routePeriod}
        />

        {/* ── Venue pins, springing 20 frames apart. ── */}
        {pinPoints.map((point, i) => {
          const pop = pulse({
            frame,
            fps,
            period,
            phase: (i * period) / PIN_ANGLES.length,
          });
          // Halo: rises with the pop and fades out as it expands. Continuous at
          // both ends (pop = 0 ⇒ halo = 0), so it cannot flash across the wrap.
          const halo = Math.max(0, 1 - pop) * Math.min(1, pop * 5);
          return (
            <g key={i} transform={`translate(${point.x} ${point.y})`}>
              <circle
                r={(7 + 20 * pop) * unit}
                fill="none"
                stroke={BRAND.primary}
                strokeWidth={1.5 * unit}
                opacity={0.5 * halo}
              />
              <circle r={(9 + 5 * pop) * unit} fill={courtGreen(0.1 + 0.22 * pop)} />
              <circle
                r={(3.6 + 2.4 * pop) * unit}
                fill={BRAND.primary}
                opacity={0.55 + 0.45 * pop}
              />
              <circle
                r={(3.6 + 2.4 * pop) * unit}
                fill="none"
                stroke={chalk(0.5 * pop)}
                strokeWidth={1 * unit}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
};

type MarkProps = {
  unit: number;
  cx: number;
  cy: number;
  breath: number;
  pop: number;
};

/** The core tile — a pitch seen from above, breathing inside its glass card. */
const Mark: FC<MarkProps> = ({ unit, cx, cy, breath, pop }) => {
  const size = 118 * unit;

  const tile: CSSProperties = {
    position: "absolute",
    left: cx,
    top: cy,
    width: size,
    height: size,
    marginLeft: -size / 2,
    marginTop: -size / 2,
    borderRadius: 30 * unit,
    background: `linear-gradient(155deg, ${BRAND.surface2} 0%, ${BRAND.card} 55%, ${BRAND.surface1} 100%)`,
    border: `1px solid ${hairline(1)}`,
    boxShadow: [
      `inset 0 1px 0 0 ${chalk(0.07)}`,
      `0 ${16 * unit}px ${32 * unit}px ${-8 * unit}px ${ink(0.65)}`,
      `0 0 ${(38 + 22 * breath) * unit}px ${-6 * unit}px ${courtGreen(0.28 + 0.16 * breath)}`,
    ].join(", "),
    transform: `scale(${1 + 0.028 * breath + 0.05 * pop})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={tile}>
      {/* Pitch pictogram. 80×56 viewBox, so it scales with the tile. */}
      <svg
        width={size * 0.66}
        height={size * 0.462}
        viewBox="0 0 80 56"
        fill="none"
      >
        <rect
          x={1.2}
          y={1.2}
          width={77.6}
          height={53.6}
          rx={6}
          stroke={courtGreen(0.9)}
          strokeWidth={1.8}
        />
        <line x1={40} y1={1.2} x2={40} y2={54.8} stroke={courtGreen(0.55)} strokeWidth={1.4} />
        <circle cx={40} cy={28} r={8.5} stroke={courtGreen(0.75)} strokeWidth={1.4} />
        <circle cx={40} cy={28} r={1.6 + 1.1 * breath} fill={BRAND.primary} />
        <rect
          x={1.2}
          y={16}
          width={9}
          height={24}
          stroke={courtGreen(0.42)}
          strokeWidth={1.3}
        />
        <rect
          x={69.8}
          y={16}
          width={9}
          height={24}
          stroke={courtGreen(0.42)}
          strokeWidth={1.3}
        />
      </svg>
    </div>
  );
};

type WordmarkProps = {
  frame: number;
  fps: number;
  period: number;
  unit: number;
  top: number;
};

/** "SPORTSBNB", rippling letter by letter, 2.6 frames apart. */
const Wordmark: FC<WordmarkProps> = ({ frame, fps, period, unit, top }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top,
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-end",
      fontFamily: DISPLAY_FONT,
      fontSize: 27 * unit,
      fontWeight: 700,
      letterSpacing: 0,
    }}
  >
    {WORDMARK.split("").map((letter, i) => {
      const pop = pulse({ frame, fps, period, phase: i * 2.6 });
      const isSuffix = i >= WORDMARK_SPLIT;
      return (
        <span
          key={i}
          style={{
            display: "inline-block",
            // No trailing track on the last glyph, or the row centres half a
            // letter-space to the left of the mark above it.
            marginRight: i === WORDMARK.length - 1 ? 0 : 6.5 * unit,
            color: isSuffix ? BRAND.primary : BRAND.foreground,
            opacity: 0.72 + 0.28 * pop,
            transform: `translateY(${-5 * unit * pop}px)`,
            textShadow: isSuffix
              ? `0 0 ${14 * unit}px ${courtGreen(0.35 * pop)}`
              : `0 0 ${14 * unit}px ${chalk(0.22 * pop)}`,
          }}
        >
          {letter}
        </span>
      );
    })}
  </div>
);

type CaptionProps = {
  unit: number;
  top: number;
  breath: number;
};

/** Mono micro-caption, matching the `.eyebrow` treatment in the design system. */
const Caption: FC<CaptionProps> = ({ unit, top, breath }) => {
  const tracking = 3.2 * unit;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        textAlign: "center",
        fontFamily: MONO_FONT,
        fontSize: 10.5 * unit,
        fontWeight: 500,
        textTransform: "uppercase",
        color: chalk(0.34 + 0.14 * breath),
      }}
    >
      {/* Letter-spacing hangs a phantom gap off the last glyph, which drags a
          centred line half a track to the left. The negative right margin takes
          that gap back out of the inline box before centring measures it. */}
      <span style={{ letterSpacing: tracking, marginRight: -tracking }}>
        Book the court
      </span>
    </div>
  );
};

type LoadingBarProps = {
  unit: number;
  top: number;
  t: number;
};

/**
 * Indeterminate loading hairline. The highlight is a repeating gradient whose
 * background position advances by exactly one gradient period per loop — the
 * blob leaving the right edge and the next entering from the left are the same
 * blob, so there is nothing to seam.
 */
const LoadingBar: FC<LoadingBarProps> = ({ unit, top, t }) => {
  const trackWidth = 168 * unit;
  const gradientPeriod = 192 * unit;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: trackWidth,
          height: 2.5 * unit,
          borderRadius: 999,
          backgroundColor: hairline(1),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `repeating-linear-gradient(90deg, ${courtGreen(0)} 0px, ${courtGreen(0)} ${gradientPeriod * 0.5}px, ${courtGreen(0.95)} ${gradientPeriod * 0.74}px, ${cyan(0)} ${gradientPeriod}px)`,
            backgroundSize: `${gradientPeriod}px 100%`,
            backgroundPosition: `${t * gradientPeriod}px 0px`,
          }}
        />
      </div>
    </div>
  );
};

/** Static vignette + film noise, so the bloom never looks like a flat wash. */
const Grain: FC<{ centerYPercent: number }> = ({ centerYPercent }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% ${centerYPercent}%, transparent 34%, ${ink(0.5)} 78%, ${ink(0.9)} 100%)`,
      }}
    />
    <AbsoluteFill style={{ backgroundImage: NOISE_TILE, opacity: 0.05 }} />
  </AbsoluteFill>
);

/* ────────────────────────────── composition ───────────────────────────── */

/**
 * No props. `Record<string, never>` rather than `{}` — `{}` is the "any
 * non-nullish value" type and is banned repo-wide by no-empty-object-type.
 */
export type BrandLoaderProps = Record<string, never>;

export const BrandLoader: FC<BrandLoaderProps> = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const prefersReducedMotion = usePrefersReducedMotion();

  /**
   * The reduced-motion fallback, in one line.
   *
   * Every driver in this file is a pure function of `f` and nothing else, so
   * freezing `f` at the loop origin renders exactly the frame the loop opens
   * and closes on: the mark, the pins, the wordmark and the caption are all
   * present and legible, with zero movement. Nothing is hidden, nothing jumps.
   */
  const f = prefersReducedMotion ? 0 : frame;

  /** Normalised loop position. t(0) = 0 and t(durationInFrames) = 1 ≡ 0. */
  const t = wrap(f, durationInFrames) / durationInFrames;
  /** Full cosine period: breath(t=0) === breath(t=1). */
  const breath = 0.5 + 0.5 * Math.sin(TAU * t);

  const unit = Math.min(width, height) / CANVAS;
  const cx = width / 2;
  const cy = 255 * unit;
  const centerYPercent = (cy / height) * 100;

  const corePop = pulse({ frame: f, fps, period: durationInFrames, phase: 0 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      {/* Sequences are used here to name and order the layers — they show up in
          the Studio timeline, which is how a designer opening this file finds
          the piece they want. All timing lives in the drivers above, because a
          loop this tight needs one source of truth for the cycle. */}
      <Sequence name="Court floor" layout="none">
        <Backdrop
          breath={breath}
          gridTile={60 * unit}
          gridShift={t * 60 * unit}
          centerYPercent={centerYPercent}
        />
      </Sequence>

      <Sequence name="Court rig" layout="none">
        <CourtRig
          frame={f}
          fps={fps}
          period={durationInFrames}
          t={t}
          unit={unit}
          cx={cx}
          cy={cy}
          width={width}
          height={height}
        />
      </Sequence>

      <Sequence name="Mark" layout="none">
        <Mark unit={unit} cx={cx} cy={cy} breath={breath} pop={corePop} />
      </Sequence>

      <Sequence name="Wordmark" layout="none">
        <Wordmark
          frame={f}
          fps={fps}
          period={durationInFrames}
          unit={unit}
          top={480 * unit}
        />
        <Caption unit={unit} top={522 * unit} breath={breath} />
      </Sequence>

      <Sequence name="Loading" layout="none">
        <LoadingBar unit={unit} top={556 * unit} t={t} />
      </Sequence>

      <Sequence name="Grain" layout="none">
        <Grain centerYPercent={centerYPercent} />
      </Sequence>
    </AbsoluteFill>
  );
};
