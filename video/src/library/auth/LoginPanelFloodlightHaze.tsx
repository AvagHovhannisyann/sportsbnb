/**
 * LoginPanelFloodlightHaze — ambient loop for the left brand panel on /login,
 * /signup, /forgot-password and /reset-password: stadium floodlights seen
 * through evening haze, with dust drifting through the beams.
 * Very low contrast by design — it sits behind the hero copy, not beside it.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  NOISE_TILE,
  TAU,
  chalk,
  courtGreen,
  hairline,
  hashUnit,
  ink,
  useMotionFrame,
  wrap,
} from "./authKit";

const CANVAS_W = 960;
const CANVAS_H = 1080;

export type LoginPanelFloodlightHazeProps = {
  /** How many floodlight masts throw a cone. 2 or 3 reads best at this size. */
  coneCount: number;
  /** Dust motes drifting up through the beams. */
  moteCount: number;
  /** Global opacity multiplier, 0–1. Keep low: the form must stay dominant. */
  intensity: number;
  /** Warmth of the beams, 0 = pure court green, 1 = cool cyan. */
  beamCoolness: number;
};

export const loginPanelFloodlightHazeDefaultProps: LoginPanelFloodlightHazeProps =
  {
    coneCount: 3,
    moteCount: 28,
    intensity: 0.3,
    beamCoolness: 0.35,
  };

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. Beam brightness is `0.5 + 0.5·cos(2π(t + phase))` — a full cosine
 *     period per beam, equal at t=0 and t=1 whatever the phase.
 *  2. The motes are a *lattice*, not a swarm: mote i sits at
 *     `wrap(span·i − t·height, height)` with `span = height / moteCount`, so
 *     over one loop each mote travels exactly the full column height and lands
 *     back on its own starting y — `wrap(span·i − height, height) = span·i`.
 *     Their opacity is additionally 0 at both ends of the column, so the wrap
 *     could not flash even if it were not exact.
 *  3. The haze wash rides `sin(2πt)`.
 *
 * No one-way tween exists in the file.
 */
export const LoginPanelFloodlightHaze: FC<LoginPanelFloodlightHazeProps> = ({
  coneCount,
  moteCount,
  intensity,
  beamCoolness,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is both the first and the last state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const vScale = height / CANVAS_H;

  const haze = 0.5 + 0.5 * Math.sin(TAU * t);

  /** One mote lattice cell, in design px. */
  const span = (CANVAS_H * vScale) / Math.max(1, moteCount);

  const beamColour = (alpha: number) =>
    beamCoolness > 0.5
      ? `hsla(190, 80%, 50%, ${alpha})`
      : `hsla(151, 90%, 47%, ${alpha})`;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, ${BRAND.surface1} 0%, ${BRAND.background} 58%, ${BRAND.background} 100%)`,
        }}
      />

      {/* Masts + cones. */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, opacity: intensity }}
      >
        <defs>
          {Array.from({ length: coneCount }, (_, i) => (
            <linearGradient
              key={i}
              id={`flood-${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={beamColour(0.5)} />
              <stop offset="45%" stopColor={beamColour(0.12)} />
              <stop offset="100%" stopColor={beamColour(0)} />
            </linearGradient>
          ))}
        </defs>

        {Array.from({ length: coneCount }, (_, i) => {
          const slot = (i + 0.5) / coneCount;
          const apexX = width * (0.12 + slot * 0.78);
          const apexY = height * 0.14;
          const spread = width * (0.19 + 0.05 * hashUnit(i, 3));
          const floorY = height * 0.9;
          // Full cosine period, phase-staggered — never all at once.
          const glow = 0.5 + 0.5 * Math.cos(TAU * (t + i / coneCount));

          return (
            <g key={i}>
              <polygon
                points={`${apexX},${apexY} ${apexX - spread},${floorY} ${apexX + spread},${floorY}`}
                fill={`url(#flood-${i})`}
                opacity={0.42 + 0.58 * glow}
              />
              {/* Mast head. */}
              <rect
                x={apexX - 13 * unit}
                y={apexY - 9 * unit}
                width={26 * unit}
                height={11 * unit}
                rx={2.5 * unit}
                fill={BRAND.surface2}
                stroke={hairline(1)}
                strokeWidth={1 * unit}
              />
              <circle
                cx={apexX}
                cy={apexY - 3.5 * unit}
                r={(3 + 1.6 * glow) * unit}
                fill={beamColour(0.55 + 0.45 * glow)}
              />
              <line
                x1={apexX}
                y1={apexY + 2 * unit}
                x2={apexX}
                y2={apexY - 46 * unit}
                stroke={hairline(0.9)}
                strokeWidth={2 * unit}
              />
            </g>
          );
        })}

        {/* Dust lattice. See the loop note above. */}
        {Array.from({ length: moteCount }, (_, i) => {
          const lane = hashUnit(i, 11);
          const x = width * (0.08 + lane * 0.86);
          const base = span * i;
          const y = wrap(base - t * span * moteCount, height);
          // 0 at both ends of the column, so the wrap can never flash.
          const columnFade = Math.sin((y / height) * Math.PI);
          const r = (0.9 + 1.6 * hashUnit(i, 19)) * unit;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={r}
              fill={chalk(0.5)}
              opacity={0.1 + 0.28 * columnFade}
            />
          );
        })}
      </svg>

      {/* Haze wash, full sine period. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 55% at 50% 30%, ${courtGreen(0.09 * intensity)} 0%, transparent 68%)`,
          opacity: 0.55 + 0.45 * haze,
        }}
      />

      {/* Ground bounce — the light the pitch throws back. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${courtGreen(0.07 * intensity)} 0%, transparent 26%)`,
        }}
      />

      <AbsoluteFill
        style={{
          background: `linear-gradient(to right, ${ink(0.7)} 0%, ${ink(0.3)} 58%, ${ink(0.05)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: NOISE_TILE,
          opacity: 0.05,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
