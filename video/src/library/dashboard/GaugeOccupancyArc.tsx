/**
 * GaugeOccupancyArc — the "Occupancy Rate" figure from the owner dashboard's
 * stat row, drawn as the 270° dial the analytics page uses.
 * One-way: the arc sweeps once to the real percentage and holds. 60fps,
 * because a slow arc at 30 shows its steps.
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolateColors,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  SANS_FONT,
  amber,
  countTo,
  courtGreen,
  eyebrowStyle,
  hairline,
  interpolateSafe,
  muted,
  numeralStyle,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS = 600;

/** The dial is a 270° sweep with the gap at the bottom, as gauges are read. */
const SWEEP_DEG = 270;
const START_DEG = 135;

export type GaugeOccupancyArcProps = {
  /** Where the dial lands, 0–100. */
  percent: number;
  /** Where it starts. Non-zero when a refetch nudged the figure. */
  fromPercent: number;
  /** Mono caps above the numeral. */
  label: string;
  /** Line under the numeral. */
  caption: string;
  /** Ticks around the arc. 0 draws none. */
  ticks: number;
  /** Percentage at which the dial reads as healthy rather than thin. */
  goodAt: number;
};

export const gaugeOccupancyArcDefaultProps: GaugeOccupancyArcProps = {
  percent: 69,
  fromPercent: 0,
  label: "Occupancy",
  caption: "29 of 42 bookable hours filled this week",
  ticks: 10,
  goodAt: 60,
};

const SWEEP_AT = 10;
const SWEEP_FRAMES = 70;

const polar = (
  cx: number,
  cy: number,
  r: number,
  deg: number,
): { x: number; y: number } => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
};

const arcPath = (
  cx: number,
  cy: number,
  r: number,
  fromDeg: number,
  toDeg: number,
): string => {
  const a = polar(cx, cy, r, fromDeg);
  const b = polar(cx, cy, r, toDeg);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
};

export const GaugeOccupancyArc: FC<GaugeOccupancyArcProps> = ({
  percent,
  fromPercent,
  label,
  caption,
  ticks,
  goodAt,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the finished dial, which is the figure.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = Math.min(width, height) / CANVAS;

  /**
   * Counted, not sprung, and short-circuited on the last frame: a spring would
   * overshoot past the real percentage, and an occupancy figure that reads
   * 104% before settling is a figure nobody trusts again.
   */
  const shown = countTo({
    frame,
    from: fromPercent,
    to: percent,
    delay: SWEEP_AT,
    duration: SWEEP_FRAMES,
  });
  const frac = Math.max(0, Math.min(1, shown / 100));

  const cx = width / 2;
  const cy = height / 2 + 14 * unit;
  const r = 176 * unit;
  const stroke = 22 * unit;

  const endDeg = START_DEG + SWEEP_DEG * frac;
  const head = polar(cx, cy, r, endDeg);

  const arcColour = interpolateColors(
    Math.min(1, frac / Math.max(0.01, goodAt / 100)),
    [0, 0.6, 1],
    [amber(1), courtGreen(0.8), BRAND.primary],
  );

  const tickCount = Math.max(0, Math.round(ticks));

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(72% 72% at 50% 44%, ${BRAND.surface1} 0%, ${BRAND.background} 72%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(42% 42% at 50% 50%, ${courtGreen(0.1 * frac)} 0%, transparent 72%)`,
        }}
      />

      <Sequence name="Dial" layout="none">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: "absolute", inset: 0 }}
        >
          {/* Track. */}
          <path
            d={arcPath(cx, cy, r, START_DEG, START_DEG + SWEEP_DEG)}
            fill="none"
            stroke={BRAND.input}
            strokeWidth={stroke}
            strokeLinecap="round"
          />

          {/* The target marker — where "healthy" starts, so the reading has a
              reference and not just a colour. */}
          {goodAt > 0 && goodAt < 100 ? (
            <g opacity={interpolateSafe(frame, [4, 22], [0, 1])}>
              <line
                x1={polar(cx, cy, r - stroke / 2 - 3 * unit, START_DEG + SWEEP_DEG * (goodAt / 100)).x}
                y1={polar(cx, cy, r - stroke / 2 - 3 * unit, START_DEG + SWEEP_DEG * (goodAt / 100)).y}
                x2={polar(cx, cy, r + stroke / 2 + 3 * unit, START_DEG + SWEEP_DEG * (goodAt / 100)).x}
                y2={polar(cx, cy, r + stroke / 2 + 3 * unit, START_DEG + SWEEP_DEG * (goodAt / 100)).y}
                stroke={amber(0.85)}
                strokeWidth={2.5 * unit}
                strokeLinecap="round"
              />
            </g>
          ) : null}

          {/* Ticks on the track. */}
          {Array.from({ length: tickCount + 1 }, (_, i) => {
            const deg = START_DEG + (SWEEP_DEG * i) / Math.max(1, tickCount);
            const a = polar(cx, cy, r - stroke / 2, deg);
            const b = polar(cx, cy, r + stroke / 2, deg);
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={BRAND.background}
                strokeWidth={2.5 * unit}
              />
            );
          })}

          {frac > 0.001 ? (
            <>
              <path
                d={arcPath(cx, cy, r, START_DEG, endDeg)}
                fill="none"
                stroke={arcColour}
                strokeWidth={stroke * 1.85}
                strokeLinecap="round"
                opacity={0.12}
              />
              <path
                d={arcPath(cx, cy, r, START_DEG, endDeg)}
                fill="none"
                stroke={arcColour}
                strokeWidth={stroke}
                strokeLinecap="round"
              />
              <circle
                cx={head.x}
                cy={head.y}
                r={4.5 * unit}
                fill={BRAND.foreground}
                opacity={0.9}
              />
            </>
          ) : null}
        </svg>
      </Sequence>

      <Sequence name="Readout" layout="none">
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: cy - 78 * unit,
            textAlign: "center",
            ...eyebrowStyle(unit * 1.2, muted(0.85)),
            opacity: interpolateSafe(frame, [0, 14], [0, 1]),
          }}
        >
          {label}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: cy - 52 * unit,
            textAlign: "center",
            ...numeralStyle(unit, 88),
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
          }}
        >
          {`${Math.round(shown)}`}
          <span
            style={{
              fontSize: 34 * unit,
              fontWeight: 600,
              color: muted(0.7),
              marginLeft: 3 * unit,
            }}
          >
            %
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: width * 0.14,
            right: width * 0.14,
            top: cy + 58 * unit,
            textAlign: "center",
            fontFamily: SANS_FONT,
            fontSize: 15 * unit,
            lineHeight: 1.45,
            color: BRAND.foregroundSoft,
            opacity: interpolateSafe(
              frame,
              [SWEEP_AT + SWEEP_FRAMES - 14, SWEEP_AT + SWEEP_FRAMES + 4],
              [0, 1],
            ),
          }}
        >
          {caption}
        </div>
      </Sequence>

      <div
        style={{
          position: "absolute",
          left: cx - r,
          top: cy + r + 40 * unit,
          width: r * 2,
          height: 1 * unit,
          background: `linear-gradient(90deg, transparent, ${hairline(1)} 50%, transparent)`,
        }}
      />
    </AbsoluteFill>
  );
};
