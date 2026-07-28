/**
 * HeroCourtGridPulse — ambient plate: a court floor receding to a horizon with
 * a pulse of light rolling up it. Built for the "Why it's different" band and
 * the `/venues` masthead, wherever a hero needs depth rather than atmosphere.
 * 1920×1080 · 30fps · 240 frames (8s) · seamless loop.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate } from "remotion";

import {
  BRAND,
  Grain,
  Scrim,
  TAU,
  alpha,
  loopT,
  useLoopFrame,
  type FrameContext,
} from "./shared";

/* ── Why this loops ────────────────────────────────────────────────────────
 * The pulse is a **periodic bump on a wrapped phase**, which is the cleanest
 * seamless travelling wave available:
 *
 *     u    = wrap(t - lineOffset, 1)              // exactly 0 at both ends
 *     bump = (0.5 + 0.5·cos(2π·u)) ^ sharpness    // 1 at u = 0, 0 at u = 0.5
 *
 * `cos` over one full period is identical at u = 0 and u = 1, and raising a
 * non-negative quantity to a fixed power preserves that identity exactly, so
 * every line's brightness at frame `period` equals its brightness at frame 0.
 * Sharpening by exponent rather than by a piecewise window matters: a
 * piecewise "if within ±w of the crest" test has a derivative discontinuity
 * that reads as a hard edge crawling up the floor, while the power curve
 * concentrates the crest smoothly.
 *
 * The perspective geometry itself is static, and the horizon wash is a
 * full-period cosine. There is not a single one-way tween in the file.
 *
 * ── Why it stays readable ─────────────────────────────────────────────────
 * The whole grid is masked to the bottom 55% of the frame and faded out toward
 * the horizon, so the upper half — where a hero headline sets — is bare wash.
 * A lit line peaks at `lineAlpha` (0.34 by default) on a 1.6px hairline; the
 * integrated light over any 100×100px patch stays far below what would trouble
 * chalk-white copy. `Scrim` is applied above the grid, not below it.
 */

/** Positive modulo. Kept local to the wave maths for readability. */
const wrap01 = (v: number): number => v - Math.floor(v);

/**
 * Perspective mapping: `z ∈ [0, 1]` from horizon to the near edge, returned as
 * a y in design px. A plain reciprocal, which is what actually produces the
 * "lines bunch toward the horizon" look — linear spacing reads as a ladder.
 */
const depthToY = (z: number, horizonY: number, height: number): number => {
  const k = 0.16;
  const d = k / (k + z);
  return horizonY + (height - horizonY) * (1 - d) * (1 / (1 - k / (k + 1)));
};

const FloorGrid: FC<
  FrameContext & {
    readonly rows: number;
    readonly columns: number;
    readonly tint: string;
    readonly lineAlpha: number;
    readonly sharpness: number;
  }
> = ({ frame, period, scale, rows, columns, tint, lineAlpha, sharpness }) => {
  const t = loopT(frame, period);
  const horizonY = 470;
  const height = 1080;
  const mask =
    "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.35) 50%, #000 72%, #000 100%)";

  return (
    <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: "block" }}
      >
        {/* Converging verticals. Static, and the reason the floor reads as a
            plane rather than as a stack of rules. */}
        {Array.from({ length: columns + 1 }, (_unused, i) => {
          const u = i / columns;
          const spread = 3.4;
          const xNear = 960 + (u - 0.5) * 1920 * spread;
          const xFar = 960 + (u - 0.5) * 1920 * 0.34;
          const edge = Math.abs(u - 0.5) * 2;
          return (
            <line
              key={`col-${i}`}
              x1={xFar}
              y1={horizonY}
              x2={xNear}
              y2={height}
              stroke={alpha(BRAND.border, 0.85)}
              strokeWidth={1.2 / scale}
              opacity={interpolate(edge, [0, 1], [0.5, 0.14])}
            />
          );
        })}

        {/* Depth rows, each carrying the travelling pulse. */}
        {Array.from({ length: rows }, (_unused, i) => {
          const z = (i + 0.5) / rows;
          const y = depthToY(z, horizonY, height);

          /** Phase offset by depth, so the crest climbs from horizon to viewer. */
          const u = wrap01(t - z * 0.85);
          const bump = Math.pow(0.5 + 0.5 * Math.cos(TAU * u), sharpness);

          /** Near rows are wider and brighter — plain aerial perspective. */
          const near = Math.pow(z, 0.8);
          const base = interpolate(near, [0, 1], [0.16, 0.5]);
          const a = lineAlpha * (base + (1 - base) * bump);

          return (
            <g key={`row-${i}`}>
              <line
                x1={-400}
                y1={y}
                x2={2320}
                y2={y}
                stroke={alpha(BRAND.border, 0.9)}
                strokeWidth={interpolate(near, [0, 1], [0.9, 2]) / scale}
                opacity={interpolate(near, [0, 1], [0.22, 0.6])}
              />
              <line
                x1={-400}
                y1={y}
                x2={2320}
                y2={y}
                stroke={alpha(tint, a)}
                strokeWidth={interpolate(near, [0, 1], [1.1, 2.6]) / scale}
                opacity={bump}
              />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/**
 * A soft band of light sitting on the horizon line, breathing on a full cosine
 * period. Gives the grid something to recede *into*, so it does not simply
 * stop.
 */
const HorizonBand: FC<
  FrameContext & { readonly tint: string; readonly intensity: number }
> = ({ frame, period, tint, intensity }) => {
  const t = loopT(frame, period);
  const swell = 0.5 + 0.5 * Math.cos(TAU * t);
  const swell2 = 0.5 + 0.5 * Math.cos(TAU * 2 * t + 2.1);

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 90% 26% at 50% 44%, ${alpha(
            tint,
            interpolate(swell, [0, 1], [0.075, 0.115]) * intensity,
          )} 0%, transparent 62%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 34% at 78% 20%, ${alpha(
            BRAND.cyan,
            interpolate(swell2, [0, 1], [0.035, 0.065]) * intensity,
          )} 0%, transparent 68%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export type HeroCourtGridPulseProps = {
  /** Depth rows drawn between horizon and near edge. */
  readonly rows: number;
  /** Converging verticals. */
  readonly columns: number;
  /** Colour of the travelling pulse and the horizon band. */
  readonly tint: string;
  /** Peak alpha of a lit row. The readability budget lives here. */
  readonly lineAlpha: number;
  /**
   * How tightly the pulse is concentrated. Higher is a narrower crest; must
   * stay a fixed number so the `cos^n` identity at the seam holds.
   */
  readonly sharpness: number;
  /** Scales the ambient light budget (not the scrim). */
  readonly intensity: number;
};

export const heroCourtGridPulseDefaultProps: HeroCourtGridPulseProps = {
  rows: 22,
  columns: 18,
  tint: BRAND.primary,
  lineAlpha: 0.34,
  sharpness: 7,
  intensity: 1,
};

export const HeroCourtGridPulse: FC<HeroCourtGridPulseProps> = ({
  rows,
  columns,
  tint,
  lineAlpha,
  sharpness,
  intensity,
}) => {
  const ctx = useLoopFrame(0.22);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Bed">
        <AbsoluteFill style={{ backgroundColor: BRAND.bg }} />
        <AbsoluteFill
          style={{
            background: `linear-gradient(to bottom, ${alpha(
              BRAND.surface1,
              0.55,
            )} 0%, transparent 38%)`,
          }}
        />
      </Sequence>

      <Sequence name="Horizon band">
        <HorizonBand {...ctx} tint={tint} intensity={intensity} />
      </Sequence>

      <Sequence name="Floor grid">
        <FloorGrid
          {...ctx}
          rows={rows}
          columns={columns}
          tint={tint}
          lineAlpha={lineAlpha * intensity}
          sharpness={sharpness}
        />
      </Sequence>

      <Sequence name="Readability scrim">
        {/* Focus pulled up and left: on this plate the busy region is the floor,
            so the pool guards the headline band rather than the centre. */}
        <Scrim scale={ctx.scale} focusX={34} focusY={38} />
      </Sequence>

      <Sequence name="Grain">
        <Grain frame={ctx.frame} period={ctx.period} scale={ctx.scale} />
      </Sequence>
    </AbsoluteFill>
  );
};
