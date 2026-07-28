/**
 * LoopOrbit — pucks running closed laps around the mark over a tick ring that
 * pulses as a travelling comet. The "searching nearby venues" loop: it plays
 * under the map while pitches are being fetched, and as the 4s idle animation
 * on the owner dashboard's live-bookings tile.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * Three seam-safe drivers and nothing else:
 *   1. Rotation is `laps · 360° · t` where `laps` is always an INTEGER (it is
 *      derived internally, never taken from props, precisely so a caller
 *      cannot hand it 1.5 and quietly break the seam). A whole number of turns
 *      lands on the same angle it started at.
 *   2. Dash offsets advance by exactly one dash period per lap; `pathLength={1}`
 *      normalises every arc length to 1 so that period is exact.
 *   3. The 48 ticks are `cos(2π(t - i/48))` — a full cosine period per tick.
 * `loopT` takes the modulo before the divide, so frame 0 and frame `period`
 * feed bit-identical floats into all three.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolateColors, useVideoConfig } from "remotion";

import {
  BRAND,
  NOISE_TILE,
  TAU,
  chalk,
  courtGreen,
  cyan,
  loopT,
  useBrandFrame,
} from "./brandKit";
import { MarkTile, PitchGlyph, StagePlate } from "./BrandGeometry";

export type LoopOrbitProps = {
  /** Tile edge as a fraction of the shorter canvas side. */
  readonly markScale: number;
  /** How many pucks orbit. Each gets its own radius, direction and lap count. */
  readonly orbitCount: number;
  /** Innermost orbit radius as a fraction of the shorter canvas side. */
  readonly baseRadius: number;
  /** Radius added per orbit, same units. */
  readonly radiusStep: number;
  /** Ticks in the outer ring. The comet head travels one full turn per loop. */
  readonly tickCount: number;
  readonly accentColor: string;
  readonly backgroundColor: string;
};

export const loopOrbitDefaultProps: LoopOrbitProps = {
  markScale: 0.26,
  orbitCount: 3,
  baseRadius: 0.19,
  radiusStep: 0.055,
  tickCount: 48,
  accentColor: BRAND.primary,
  backgroundColor: BRAND.background,
};

/**
 * Lap counts, derived rather than configured: alternating direction, rising
 * speed. Always integers, which is the whole seam guarantee for this file.
 */
const lapsFor = (i: number): number => (i % 2 === 0 ? 1 + Math.floor(i / 2) : -(1 + Math.floor(i / 2)));

export const LoopOrbit: FC<LoopOrbitProps> = ({
  markScale,
  orbitCount,
  baseRadius,
  radiusStep,
  tickCount,
  accentColor,
  backgroundColor,
}) => {
  const frame = useBrandFrame(0.3);
  const { width, height, durationInFrames } = useVideoConfig();

  const t = loopT(frame, durationInFrames);
  const shortSide = Math.min(width, height);
  const tileSize = shortSide * markScale;
  const cx = width / 2;
  const cy = height / 2;

  /** Full sine period ⇒ identical at both ends of the loop. */
  const breath = 0.5 + 0.5 * Math.sin(TAU * t);
  const ticks = Math.max(1, tickCount);
  const rTick = shortSide * (baseRadius + radiusStep * Math.max(1, orbitCount));

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        <StagePlate
          glow={0.3 + 0.4 * breath}
          backgroundColor={backgroundColor}
          gridTile={shortSide * 0.1}
          gridShift={-t * shortSide * 0.1}
        />
      </Sequence>

      <Sequence name="Rig" layout="none">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <g transform={`translate(${cx} ${cy})`}>
            {/* Tick ring: each tick is phase-offset by i/n of the cycle, which
                reads as one comet head travelling rather than n things blinking. */}
            {Array.from({ length: ticks }, (_, i) => {
              const wave = 0.5 + 0.5 * Math.cos(TAU * (t - i / ticks));
              const head = Math.pow(wave, 6);
              const len = shortSide * (0.012 + 0.028 * head);
              return (
                <line
                  key={i}
                  x1={0}
                  y1={-rTick}
                  x2={0}
                  y2={-rTick - len}
                  stroke={interpolateColors(head, [0, 1], [BRAND.border, accentColor])}
                  strokeWidth={shortSide * (0.003 + 0.0025 * head)}
                  strokeLinecap="round"
                  opacity={0.3 + 0.7 * head}
                  transform={`rotate(${(i / ticks) * 360})`}
                />
              );
            })}

            {Array.from({ length: Math.max(0, orbitCount) }, (_, i) => {
              const laps = lapsFor(i);
              const r = shortSide * (baseRadius + radiusStep * i);
              const puck = shortSide * (0.016 - i * 0.002);
              const tint = i % 2 === 0 ? accentColor : BRAND.accent;
              const trailTint = i % 2 === 0 ? courtGreen : cyan;
              return (
                <g key={i}>
                  {/* Track */}
                  <circle
                    r={r}
                    fill="none"
                    stroke={BRAND.border}
                    strokeWidth={Math.max(1, shortSide * 0.002)}
                    opacity={0.65}
                  />
                  {/* Trail: a dashed arc rotating a whole number of turns. */}
                  <g transform={`rotate(${laps * 360 * t})`}>
                    <circle
                      r={r}
                      fill="none"
                      pathLength={1}
                      stroke={trailTint(0.5)}
                      strokeWidth={puck * 0.9}
                      strokeLinecap="round"
                      strokeDasharray="0.16 0.84"
                      strokeDashoffset={0.16}
                      opacity={0.55}
                    />
                    <circle
                      cx={0}
                      cy={-r}
                      r={puck}
                      fill={tint}
                      opacity={0.9}
                    />
                    <circle
                      cx={0}
                      cy={-r}
                      r={puck * (1.9 + 0.5 * breath)}
                      fill="none"
                      stroke={trailTint(0.35)}
                      strokeWidth={Math.max(1, shortSide * 0.0018)}
                    />
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      </Sequence>

      <Sequence name="Mark" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: `scale(${1 + 0.02 * (breath - 0.5) * 2})` }}>
            <MarkTile size={tileSize} glow={0.45 + 0.4 * breath}>
              <PitchGlyph width={tileSize * 0.66} color={accentColor} dot={0.9 + 0.2 * breath} />
            </MarkTile>
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Grain" layout="none">
        <AbsoluteFill
          style={{
            backgroundImage: NOISE_TILE,
            opacity: 0.05,
            boxShadow: `inset 0 0 ${shortSide * 0.3}px ${shortSide * 0.08}px ${chalk(0)}`,
          }}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
