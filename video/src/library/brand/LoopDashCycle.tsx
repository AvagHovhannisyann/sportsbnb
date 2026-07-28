/**
 * LoopDashCycle — a short, snappy marching-ants loop: dashes chase around the
 * mark's silhouette while corner brackets tick in turn. This is the inline
 * spinner — it sits in buttons and toasts during a booking submit, at a
 * deliberately faster rhythm than the ambient loops so it reads as "working".
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * Two seam-safe drivers:
 *   1. Dash offsets. `pathLength={1}` normalises every silhouette's arc length
 *      to 1, the dash period is exactly `1 / dashSegments` (an integer count,
 *      so the division is the only place precision enters), and the offset
 *      advances by exactly one period across the loop. Frame 0 and frame
 *      `period` therefore paint dashes in identical positions.
 *   2. `popPulse(wrap(frame - phase, period))` for the brackets — exactly 0 at
 *      local frame 0 and exactly 1 - 1 = 0 once both its springs have
 *      short-circuited, so each bracket is dark across the seam.
 * `loopT` takes the modulo before the divide, so t is exactly 0 at both ends.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";

import {
  BRAND,
  NOISE_TILE,
  TAU,
  bloomWindow,
  courtGreen,
  cyan,
  loopT,
  popPulse,
  staggerPhase,
  useBrandFrame,
  wrap,
} from "./brandKit";
import { MarkTile, PitchGlyph } from "./BrandGeometry";

export type LoopDashCycleProps = {
  /** Tile edge as a fraction of the shorter canvas side. */
  readonly markScale: number;
  /**
   * Dashes around the silhouette. Integer by contract: the dash period is
   * 1 / dashSegments and the offset advances exactly one period per loop, so a
   * fractional value here would leave a visible jump at the seam.
   */
  readonly dashSegments: number;
  /** Corner brackets, pulsing one after another around the cycle. */
  readonly bracketCount: number;
  readonly accentColor: string;
  readonly trackColor: string;
  readonly backgroundColor: string;
  /** Set false to render the loop on transparent-looking flat colour only. */
  readonly showGrain: boolean;
};

export const loopDashCycleDefaultProps: LoopDashCycleProps = {
  markScale: 0.34,
  dashSegments: 12,
  bracketCount: 4,
  accentColor: BRAND.primary,
  trackColor: BRAND.border,
  backgroundColor: BRAND.background,
  showGrain: true,
};

/** The tile silhouette, as a path so `pathLength` normalises it. */
const SILHOUETTE =
  "M 26 2 L 74 2 Q 98 2 98 26 L 98 74 Q 98 98 74 98 L 26 98 Q 2 98 2 74 L 2 26 Q 2 2 26 2 Z";
/** Inner ring, counter-marching. */
const INNER_RING = "M 22 50 A 28 28 0 1 0 78 50 A 28 28 0 1 0 22 50 Z";

/** Bracket corners in the 100×100 box: TL, TR, BR, BL. */
const BRACKETS: readonly { d: string }[] = [
  { d: "M 6 26 L 6 12 Q 6 6 12 6 L 26 6" },
  { d: "M 74 6 L 88 6 Q 94 6 94 12 L 94 26" },
  { d: "M 94 74 L 94 88 Q 94 94 88 94 L 74 94" },
  { d: "M 26 94 L 12 94 Q 6 94 6 88 L 6 74" },
];

export const LoopDashCycle: FC<LoopDashCycleProps> = ({
  markScale,
  dashSegments,
  bracketCount,
  accentColor,
  trackColor,
  backgroundColor,
  showGrain,
}) => {
  const frame = useBrandFrame(0.25);
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const period = durationInFrames;
  const t = loopT(frame, period);
  const shortSide = Math.min(width, height);
  const tileSize = shortSide * markScale;
  /** The dashed frame sits outside the tile. */
  const frameSize = tileSize * 1.42;

  const segments = Math.max(1, Math.round(dashSegments));
  const dashPeriod = 1 / segments;
  const seg = dashPeriod * 0.5;

  const breath = 0.5 + 0.5 * Math.sin(TAU * t);
  const window = bloomWindow(period, 0.14, 0.3, 0.5);

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Sequence name="Bed" layout="none">
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% 50%, ${courtGreen(0.05 + 0.07 * breath)} 0%, transparent 66%)`,
          }}
        />
      </Sequence>

      <Sequence name="Dash frame" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <svg
            width={frameSize}
            height={frameSize}
            viewBox="0 0 100 100"
            fill="none"
            style={{ position: "absolute", overflow: "visible" }}
          >
            {/* Track */}
            <path d={SILHOUETTE} stroke={trackColor} strokeWidth={1.6} opacity={0.8} />
            {/* Marching dashes: offset advances exactly one dash period. */}
            <path
              d={SILHOUETTE}
              pathLength={1}
              stroke={accentColor}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeDasharray={`${seg} ${dashPeriod - seg}`}
              strokeDashoffset={-t * dashPeriod}
            />
            {/* Counter-marching inner ring, half the dash count. */}
            <path
              d={INNER_RING}
              pathLength={1}
              stroke={cyan(0.5)}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeDasharray={`${seg * 0.6} ${dashPeriod * 2 - seg * 0.6}`}
              strokeDashoffset={t * dashPeriod * 2}
            />

            {/* Brackets, each lighting a beat apart around the cycle. */}
            {BRACKETS.slice(0, Math.max(0, Math.min(BRACKETS.length, bracketCount))).map(
              (bracket, i) => {
                const local = wrap(frame - staggerPhase(i, bracketCount, period), period);
                const lit = Math.max(0, popPulse(local, fps, window));
                return (
                  <path
                    key={i}
                    d={bracket.d}
                    stroke={accentColor}
                    strokeWidth={2.2 + 1.4 * lit}
                    strokeLinecap="round"
                    opacity={0.22 + 0.78 * lit}
                  />
                );
              },
            )}
          </svg>
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Mark" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <MarkTile size={tileSize} glow={0.35 + 0.5 * breath}>
            <PitchGlyph width={tileSize * 0.66} color={accentColor} dot={0.9 + 0.2 * breath} />
          </MarkTile>
        </AbsoluteFill>
      </Sequence>

      {showGrain ? (
        <Sequence name="Grain" layout="none">
          <AbsoluteFill style={{ backgroundImage: NOISE_TILE, opacity: 0.05 }} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
