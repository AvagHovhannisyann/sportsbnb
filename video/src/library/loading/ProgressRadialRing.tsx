/**
 * ProgressRadialRing — a *determinate* radial meter. The profile-completeness
 * ring on `ProfilePage` and the two onboarding checklists
 * (`PlayerOnboarding`, `OwnerOnboarding`), where the number is known and the
 * point is to show how much is left rather than to pass time.
 *
 * ── Why it loops, and why the arc does not sweep ──────────────────────────
 * `progress` is a prop, so the arc length is static: sweeping it 0 → value
 * would be a one-way tween, and a one-way tween has to snap back at the wrap,
 * which on a completeness ring reads as progress being lost.
 *
 * What loops: (1) a comet that scans the dial, travelling exactly a whole
 * number of turns per cycle — a modulo cycle, so its angle at t = 1 is
 * congruent to its angle at t = 0; (2) the ring's bloom and the tick ladder,
 * both on `cosWave`, a full cosine period. Every driver is bit-identical at
 * t = 0 and t = 1.
 */

import type { FC } from "react";
import { AbsoluteFill } from "remotion";

import {
  C,
  CourtBackdrop,
  Eyebrow,
  MONO_FONT,
  SANS_FONT,
  Stage,
  TAU,
  chalk,
  cosWave,
  hairline,
  polar,
  primary,
  useLoopClock,
} from "./shared";

export type ProgressRadialRingProps = {
  /** The determinate value, 0 → 1. Clamped. */
  progress: number;
  /** Outer diameter of the ring, in design-canvas px. */
  diameter: number;
  /** Ring thickness. */
  thickness: number;
  /** Caption under the numeral. */
  caption: string;
  /** Tick marks around the outside. 0 disables the ladder. */
  tickCount: number;
  /** Run a scanning comet around the dial. */
  showComet: boolean;
  /** Turns the comet makes per loop. Integers only — see the header. */
  cometTurns: number;
};

export const progressRadialRingDefaultProps: ProgressRadialRingProps = {
  progress: 0.72,
  diameter: 320,
  thickness: 22,
  caption: "Profile complete",
  tickCount: 60,
  showComet: true,
  cometTurns: 1,
};

const STAGE_W = 640;
const STAGE_H = 640;

export const ProgressRadialRing: FC<ProgressRadialRingProps> = ({
  progress,
  diameter,
  thickness,
  caption,
  tickCount,
  showComet,
  cometTurns,
}) => {
  const { t } = useLoopClock();

  const value = Math.min(1, Math.max(0, progress));
  const breath = cosWave(t);

  const cx = STAGE_W / 2;
  const cy = STAGE_H / 2 - 8;
  const r = diameter / 2;
  const circumference = TAU * r;
  const ticks = Math.max(0, Math.round(tickCount));

  /**
   * The comet scans the whole dial, starting at the head of the fill.
   *
   * It travels exactly `cometTurns × 360°` per cycle, so its angle at t = 1 is
   * congruent to its angle at t = 0 — a modulo cycle. An earlier version had it
   * traverse only the *unfilled* remainder, from `value` to 1 of a turn; that
   * is not a modulo cycle (it covers 0.28 of a turn for a value of 0.72) and it
   * seamed hard, snapping the head from the top of the dial back to the end of
   * the fill once per loop. On a progress meter that reads as the value jumping.
   */
  const cometAngle = value * 360 + Math.max(1, Math.round(cometTurns)) * 360 * t;

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.12} vignette={0.5} />

      <AbsoluteFill>
        <svg
          width={STAGE_W}
          height={STAGE_H}
          viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
          style={{ position: "absolute", inset: 0 }}
        >
          {/* Tick ladder. Ticks inside the filled arc take the brand colour, so
              the ring reads as a gauge rather than a decoration. */}
          {Array.from({ length: ticks }, (_, i) => {
            const u = i / ticks;
            const inner = polar(u * 360, r + thickness * 0.9);
            const outer = polar(u * 360, r + thickness * (u <= value ? 1.7 : 1.4));
            const lit = u <= value;
            return (
              <line
                key={i}
                x1={cx + inner.x}
                y1={cy + inner.y}
                x2={cx + outer.x}
                y2={cy + outer.y}
                stroke={lit ? primary(0.35 + 0.25 * breath) : hairline(0.9)}
                strokeWidth={lit ? 2 : 1.2}
                strokeLinecap="round"
              />
            );
          })}

          {/* Track. */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={C.surface3}
            strokeWidth={thickness}
          />

          {/* Determinate arc. Rotated −90° so it starts at twelve o'clock. */}
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={C.primary}
              strokeWidth={thickness * 2.4}
              strokeLinecap="round"
              strokeDasharray={`${circumference * value} ${circumference * (1 - value)}`}
              opacity={0.09 + 0.05 * breath}
            />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={C.primary}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${circumference * value} ${circumference * (1 - value)}`}
            />

            {/* Scanning comet. */}
            {showComet && value < 1 ? (
              <g transform={`rotate(${cometAngle} ${cx} ${cy})`}>
                <circle
                  cx={cx + r}
                  cy={cy}
                  r={thickness * 0.46}
                  fill={C.cyan}
                  opacity={0.9}
                />
                <circle
                  cx={cx + r}
                  cy={cy}
                  r={thickness * 1.5}
                  fill={C.cyan}
                  opacity={0.12}
                />
              </g>
            ) : null}
          </g>

          {/* Inner disc, so the numeral sits on a surface rather than on grid. */}
          <circle
            cx={cx}
            cy={cy}
            r={r - thickness * 1.1}
            fill={C.card}
            stroke={hairline(1)}
            strokeWidth={1}
          />
        </svg>

        {/* Numeral. Mono and tabular, like every figure in the app. */}
        <div
          style={{
            position: "absolute",
            left: cx - r,
            top: cy - 46,
            width: r * 2,
            textAlign: "center",
            fontFamily: MONO_FONT,
            fontSize: 62,
            fontWeight: 500,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.04em",
            color: C.foreground,
            textShadow: `0 0 ${22 + 12 * breath}px ${primary(0.28)}`,
          }}
        >
          {Math.round(value * 100)}
          <span style={{ fontSize: 28, color: chalk(0.45) }}>%</span>
        </div>

        <div
          style={{
            position: "absolute",
            left: cx - r,
            top: cy + 26,
            width: r * 2,
            textAlign: "center",
            fontFamily: SANS_FONT,
            fontSize: 16,
            color: C.mutedForeground,
          }}
        >
          {caption}
        </div>

        <Eyebrow
          x={0}
          y={cy + r + 74}
          width={STAGE_W}
          align="center"
          color={primary(0.44 + 0.3 * breath)}
        >
          Keep going
        </Eyebrow>
      </AbsoluteFill>
    </Stage>
  );
};
