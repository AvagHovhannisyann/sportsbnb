/**
 * SpinnerArcSweep — the arc rhythm. Two counter-rotating dashed arcs with a
 * comet head, sized for the app-shell Suspense fallback that wraps every lazy
 * route (`src/components/SplashScreen.tsx`) and for the full-page spinner
 * `ProtectedRoute` shows while the session is being resolved.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * Both arcs rotate by exactly ±360° across the cycle — a modulo cycle, so the
 * final frame's transform is congruent to frame 0's. The comet head is
 * `cos(2πt)` raised to a power, a full cosine period. The bloom breathes on
 * `cosWave`. There is no one-way tween anywhere in the file, so frame 0 and
 * frame `durationInFrames` are bit-identical.
 */

import type { FC } from "react";
import { AbsoluteFill } from "remotion";

import {
  C,
  CourtBackdrop,
  Eyebrow,
  Stage,
  TAU,
  chalk,
  cosWave,
  hairline,
  primary,
  useLoopClock,
} from "./shared";

export type SpinnerArcSweepProps = {
  /** Caption under the dial. Empty string hides it. */
  label: string;
  /** Outer arc diameter, in design-canvas px. */
  diameter: number;
  /** Stroke weight of the outer arc. */
  strokeWidth: number;
  /** Fraction of the circumference the lit arc covers, 0 → 1. */
  arcCoverage: number;
  /** Rotations the outer arc makes per loop. Integers only — see the header. */
  turns: number;
  /** Draw the inner counter-rotating arc. */
  showCounterArc: boolean;
};

export const spinnerArcSweepDefaultProps: SpinnerArcSweepProps = {
  label: "Loading SportsBnB",
  diameter: 260,
  strokeWidth: 10,
  arcCoverage: 0.26,
  turns: 1,
  showCounterArc: true,
};

const STAGE_W = 600;
const STAGE_H = 600;

export const SpinnerArcSweep: FC<SpinnerArcSweepProps> = ({
  label,
  diameter,
  strokeWidth,
  arcCoverage,
  turns,
  showCounterArc,
}) => {
  const clock = useLoopClock();
  const { t } = clock;

  const cx = STAGE_W / 2;
  const cy = STAGE_H / 2 - 18;

  const rOuter = diameter / 2;
  const rInner = rOuter - strokeWidth * 2.2;
  const outerCircumference = TAU * rOuter;
  const innerCircumference = TAU * rInner;

  /** Full cosine period → identical at t = 0 and t = 1. */
  const breath = cosWave(t);
  /**
   * Integer turns keep the rotation a modulo cycle: `turns * 360°` at t = 1 is
   * congruent to 0° at t = 0. A fractional value would leave the arc parked at
   * a different angle and the loop would visibly stutter, which on a spinner
   * reads as the app hanging.
   */
  const spin = Math.round(turns) * 360 * t;

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.14} vignette={0.5} />

      <AbsoluteFill>
        <svg
          width={STAGE_W}
          height={STAGE_H}
          viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <g transform={`translate(${cx} ${cy})`}>
            {/* Track. Static — it is the shape of the control, not the motion. */}
            <circle
              r={rOuter}
              fill="none"
              stroke={hairline(0.9)}
              strokeWidth={strokeWidth}
            />

            {/* Glow pass, then the core stroke. Two passes rather than a filter
                so the render stays deterministic and cheap. */}
            <g transform={`rotate(${spin})`}>
              <circle
                r={rOuter}
                fill="none"
                stroke={C.primary}
                strokeWidth={strokeWidth * 3}
                strokeLinecap="round"
                strokeDasharray={`${outerCircumference * arcCoverage} ${outerCircumference * (1 - arcCoverage)}`}
                opacity={0.1 + 0.06 * breath}
              />
              <circle
                r={rOuter}
                fill="none"
                stroke={C.primary}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${outerCircumference * arcCoverage} ${outerCircumference * (1 - arcCoverage)}`}
              />
              {/* Comet head: a chalk cap that rides the leading edge. */}
              <circle
                cx={0}
                cy={-rOuter}
                r={strokeWidth * 0.42}
                fill={chalk(0.85)}
              />
            </g>

            {showCounterArc ? (
              <g transform={`rotate(${-spin * 1 + 140})`}>
                <circle
                  r={rInner}
                  fill="none"
                  stroke={hairline(0.6)}
                  strokeWidth={strokeWidth * 0.5}
                />
                <circle
                  r={rInner}
                  fill="none"
                  stroke={C.cyan}
                  strokeWidth={strokeWidth * 0.5}
                  strokeLinecap="round"
                  strokeDasharray={`${innerCircumference * 0.12} ${innerCircumference * 0.88}`}
                  opacity={0.55 + 0.2 * breath}
                />
              </g>
            ) : null}

            {/* Centre pitch glyph — the same 80×56 pictogram as BrandLoader, so
                the two loaders read as one family. */}
            <g transform={`translate(${-rInner * 0.52} ${-rInner * 0.36}) scale(${(rInner * 1.04) / 80})`}>
              <rect
                x={1.2}
                y={1.2}
                width={77.6}
                height={53.6}
                rx={6}
                fill="none"
                stroke={primary(0.85)}
                strokeWidth={2}
              />
              <line
                x1={40}
                y1={1.2}
                x2={40}
                y2={54.8}
                stroke={primary(0.5)}
                strokeWidth={1.6}
              />
              <circle
                cx={40}
                cy={28}
                r={8.5}
                fill="none"
                stroke={primary(0.7)}
                strokeWidth={1.6}
              />
              <circle cx={40} cy={28} r={1.8 + 1.4 * breath} fill={C.primary} />
            </g>
          </g>
        </svg>

        {label.length > 0 ? (
          <Eyebrow
            x={0}
            y={cy + rOuter + 54}
            width={STAGE_W}
            align="center"
            color={primary(0.5 + 0.28 * breath)}
          >
            {label}
          </Eyebrow>
        ) : null}
      </AbsoluteFill>
    </Stage>
  );
};
