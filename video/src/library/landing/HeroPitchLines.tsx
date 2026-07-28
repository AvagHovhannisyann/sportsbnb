/**
 * HeroPitchLines — ambient plate for the landing hero, drawn as pitch markings
 * that trace and re-trace themselves. Alternate to HeroAuroraDrift for the
 * `HomePage.tsx` hero band and the `/venues` masthead.
 * 1920×1080 · 30fps · 300 frames (10s) · seamless loop.
 */

import type { FC, ReactElement } from "react";
import { AbsoluteFill, Sequence, interpolate } from "remotion";

import {
  BRAND,
  EASE_OUT_EXPO,
  Grain,
  Scrim,
  TAU,
  alpha,
  bloom,
  bloomWindow,
  loopT,
  useLoopFrame,
  wrap,
  type FrameContext,
} from "./shared";

/* ── Why this loops ────────────────────────────────────────────────────────
 * The travelling highlight on each stroke is a **dash offset**, and dash
 * offsets are the cleanest modulo cycle SVG gives you. `pathLength={1}`
 * normalises every shape's arc length to 1, so a dash array of
 * `seg (1 - seg)` has a period of exactly 1 — for a circle, a line and a
 * bezier alike. The offset is then `-dir · (laps · t + offset)` with `laps` an
 * **integer**, so across one loop the pattern advances a whole number of dash
 * periods and frame `period` paints the identical dash phase as frame 0.
 *
 * The two other animated quantities close the same way: stroke opacity is a
 * `bloom()` on a wrapped local frame (exactly 0 at both ends of its own
 * cycle), and the horizon glow is a full-period cosine. Nothing here is a
 * one-way tween, so the plate has no seam to hide.
 *
 * ── Why it stays readable ─────────────────────────────────────────────────
 * The geometry is deliberately pushed right of centre and rotated off-axis, so
 * the left third — where the H1, the sub and the CTA row live — carries only
 * the flat wash. Strokes are hairlines at `--border` weight with a green
 * highlight capped at 0.5 alpha; the brightest thing on the plate is a 2px
 * line. `Scrim` then pools darkness over the copy column on top of that.
 */

type StrokeStyle = {
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly strokeLinecap: "round";
  readonly strokeDasharray?: string;
  readonly strokeDashoffset?: number;
  readonly opacity: number;
};

type CourtShape = {
  readonly id: string;
  /** Fraction of the path length lit by the travelling highlight. */
  readonly seg: number;
  /** Laps per loop. Integer, so the dash offset closes exactly. */
  readonly laps: number;
  readonly dir: 1 | -1;
  /** Static head start along the path, in path-lengths. */
  readonly offset: number;
  readonly draw: (p: StrokeStyle) => ReactElement;
};

const SHAPES: readonly CourtShape[] = [
  {
    id: "centre-circle",
    seg: 0.17,
    laps: 1,
    dir: 1,
    offset: 0,
    draw: (p) => <circle cx={1352} cy={520} r={272} fill="none" pathLength={1} {...p} />,
  },
  {
    id: "outer-ring",
    seg: 0.11,
    laps: 1,
    dir: -1,
    offset: 0.37,
    draw: (p) => <circle cx={1352} cy={520} r={444} fill="none" pathLength={1} {...p} />,
  },
  {
    id: "halfway-line",
    seg: 0.24,
    laps: 2,
    dir: 1,
    offset: 0.62,
    draw: (p) => <line x1={1352} y1={16} x2={1352} y2={1064} pathLength={1} {...p} />,
  },
  {
    id: "penalty-arc",
    seg: 0.2,
    laps: 1,
    dir: 1,
    offset: 0.14,
    draw: (p) => (
      <path d="M 1618 104 A 620 620 0 0 1 1618 936" fill="none" pathLength={1} {...p} />
    ),
  },
  {
    id: "penalty-box",
    seg: 0.13,
    laps: 1,
    dir: -1,
    offset: 0.48,
    draw: (p) => (
      <rect
        x={1600}
        y={228}
        width={430}
        height={584}
        rx={4}
        fill="none"
        pathLength={1}
        {...p}
      />
    ),
  },
  {
    id: "touchline",
    seg: 0.15,
    laps: 1,
    dir: -1,
    offset: 0.81,
    draw: (p) => <line x1={72} y1={912} x2={1888} y2={912} pathLength={1} {...p} />,
  },
  {
    id: "corner-arc",
    seg: 0.3,
    laps: 2,
    dir: 1,
    offset: 0.27,
    draw: (p) => (
      <path d="M 1888 838 A 74 74 0 0 1 1814 912" fill="none" pathLength={1} {...p} />
    ),
  },
];

const PitchGeometry: FC<
  FrameContext & { readonly tint: string; readonly intensity: number }
> = ({ frame, fps, period, scale, tint, intensity }) => {
  const t = loopT(frame, period);
  const win = bloomWindow(period, 0.2, 0.34, 0.44);
  const mask =
    "radial-gradient(ellipse 82% 88% at 68% 50%, #000 0%, rgba(0,0,0,0.5) 46%, transparent 84%)";

  return (
    <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: "block" }}
      >
        <g transform="rotate(-6 960 540)">
          {SHAPES.map((shape, i) => {
            /** Traces are 1/N of a loop apart — the pitch draws itself in turn. */
            const phase = Math.round((i * period) / SHAPES.length);
            const lit = bloom(wrap(frame - phase, period), fps, win);

            /**
             * Dash period is exactly 1 (seg + gap) and the offset advances by a
             * whole number of laps across the loop, so frame 0 and frame
             * `period` paint identical dashes.
             */
            const dashOffset = -shape.dir * (shape.laps * t + shape.offset);

            return (
              <g key={shape.id}>
                {shape.draw({
                  stroke: alpha(BRAND.border, 0.95),
                  strokeWidth: 1.4 / scale,
                  strokeLinecap: "round",
                  opacity:
                    interpolate(lit, [0, 1], [0.4, 0.68], {
                      easing: EASE_OUT_EXPO,
                    }) * intensity,
                })}
                {shape.draw({
                  stroke: alpha(tint, 0.5),
                  strokeWidth: 2.2 / scale,
                  strokeLinecap: "round",
                  strokeDasharray: `${shape.seg} ${1 - shape.seg}`,
                  strokeDashoffset: dashOffset,
                  opacity: 0.55 * lit * intensity,
                })}
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/**
 * A low band of light along the touchline, breathing on a full cosine period.
 * This is the only broad-area light on the plate and it is kept below the
 * headline's baseline on purpose.
 */
const HorizonGlow: FC<
  FrameContext & { readonly tint: string; readonly intensity: number }
> = ({ frame, period, tint, intensity }) => {
  const t = loopT(frame, period);
  const swell = 0.5 + 0.5 * Math.cos(TAU * t + 0.7);
  const swell2 = 0.5 + 0.5 * Math.cos(TAU * 2 * t + 2.4);

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 82% 40% at 62% 106%, ${alpha(
            tint,
            interpolate(swell, [0, 1], [0.07, 0.11]) * intensity,
          )} 0%, transparent 68%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 56% 34% at 12% -8%, ${alpha(
            BRAND.cyan,
            interpolate(swell2, [0, 1], [0.04, 0.075]) * intensity,
          )} 0%, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export type HeroPitchLinesProps = {
  /** Highlight colour running along the markings. */
  readonly tint: string;
  /** Scales the whole light budget. 1 is the authored, measured ceiling. */
  readonly intensity: number;
  /** Where the readability pool sits, % of canvas. */
  readonly focusX: number;
  readonly focusY: number;
};

export const heroPitchLinesDefaultProps: HeroPitchLinesProps = {
  tint: BRAND.primary,
  intensity: 1,
  focusX: 30,
  focusY: 48,
};

export const HeroPitchLines: FC<HeroPitchLinesProps> = ({
  tint,
  intensity,
  focusX,
  focusY,
}) => {
  const ctx = useLoopFrame(0.28);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Bed">
        <AbsoluteFill style={{ backgroundColor: BRAND.bg }} />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 130% 70% at 50% 120%, ${alpha(
              BRAND.surface1,
              0.92,
            )} 0%, transparent 74%)`,
          }}
        />
      </Sequence>

      <Sequence name="Horizon glow">
        <HorizonGlow {...ctx} tint={tint} intensity={intensity} />
      </Sequence>

      <Sequence name="Pitch geometry">
        <PitchGeometry {...ctx} tint={tint} intensity={intensity} />
      </Sequence>

      <Sequence name="Readability scrim">
        <Scrim scale={ctx.scale} focusX={focusX} focusY={focusY} />
      </Sequence>

      <Sequence name="Grain">
        <Grain frame={ctx.frame} period={ctx.period} scale={ctx.scale} opacity={0.055} />
      </Sequence>
    </AbsoluteFill>
  );
};
