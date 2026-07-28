/**
 * GaugeCapacityIdle — the capacity dial while the owner dashboard is simply
 * left open: the reading is already correct, so nothing about it re-animates.
 * A seamless loop. Only the scan ring, the glow and the orbiting marker move,
 * and each of those closes exactly on the wrap.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  TAU,
  breathe,
  courtGreen,
  hairline,
  ink,
  loopT,
  muted,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS = 600;

export type GaugeCapacityIdleProps = {
  /** The reading, 0–100. Fixed for the length of the loop. */
  percent: number;
  /** Mono caps above the numeral. */
  label: string;
  /** Line under the numeral. */
  caption: string;
  /** Cells in the outer scan ring. Any whole number keeps the seam exact. */
  dashCount: number;
  /** Turns the scan ring makes per loop. Whole numbers only. */
  turnsPerLoop: number;
};

export const gaugeCapacityIdleDefaultProps: GaugeCapacityIdleProps = {
  percent: 69,
  label: "Capacity",
  caption: "Live across 1 venue",
  dashCount: 36,
  turnsPerLoop: 1,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The scan ring rotates `turnsPerLoop · 360°` over the cycle, and its dash
 *     pattern divides the circumference into `dashCount` equal cells, so it is
 *     rotationally symmetric under 360/dashCount degrees — a whole turn lands
 *     on itself regardless.
 *  2. The marker orbits the arc once per loop at `t · 360°`; 360° is 0°.
 *  3. Glow and inner plate ride `breathe(t)`, one full cosine period.
 *
 * The arc itself never moves: it is a measurement, not an animation.
 */
export const GaugeCapacityIdle: FC<GaugeCapacityIdleProps> = ({
  percent,
  label,
  caption,
  dashCount,
  turnsPerLoop,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const unit = Math.min(width, height) / CANVAS;

  // Loop: frame 0 both opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);
  const t = loopT(frame, durationInFrames);

  const glow = breathe(t);
  const frac = Math.max(0, Math.min(1, percent / 100));

  const cx = width / 2;
  const cy = height / 2;
  const rArc = 168 * unit;
  const rScan = 214 * unit;
  const stroke = 20 * unit;

  const circumference = TAU * rArc;
  const scanCircumference = TAU * rScan;
  const cells = Math.max(6, Math.round(dashCount));
  const cell = scanCircumference / cells;
  const turns = Math.max(1, Math.round(turnsPerLoop));

  const markerAngle = t * TAU - Math.PI / 2;
  const markerX = cx + Math.cos(markerAngle) * rScan;
  const markerY = cy + Math.sin(markerAngle) * rScan;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(72% 72% at 50% 46%, ${BRAND.surface1} 0%, ${BRAND.background} 74%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 40% at 50% 50%, ${courtGreen(0.06 + 0.05 * glow)} 0%, transparent 72%)`,
        }}
      />

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        {/* Scan ring: whole turns, and rotationally symmetric anyway. */}
        <g transform={`rotate(${(t * 360 * turns).toFixed(3)} ${cx} ${cy})`}>
          <circle
            cx={cx}
            cy={cy}
            r={rScan}
            fill="none"
            stroke={hairline(1)}
            strokeWidth={2 * unit}
            strokeLinecap="round"
            strokeDasharray={`${(cell * 0.34).toFixed(3)} ${(cell * 0.66).toFixed(3)}`}
          />
        </g>

        {/* The reading. Static — the dial is not counting, it is reporting. */}
        <circle
          cx={cx}
          cy={cy}
          r={rArc}
          fill="none"
          stroke={BRAND.input}
          strokeWidth={stroke}
        />
        <circle
          cx={cx}
          cy={cy}
          r={rArc}
          fill="none"
          stroke={courtGreen(0.9)}
          strokeWidth={stroke * 1.8}
          strokeLinecap="round"
          opacity={0.08 + 0.06 * glow}
          strokeDasharray={`${(circumference * frac).toFixed(3)} ${circumference.toFixed(3)}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <circle
          cx={cx}
          cy={cy}
          r={rArc}
          fill="none"
          stroke={BRAND.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(circumference * frac).toFixed(3)} ${circumference.toFixed(3)}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* The orbiting marker — one clean revolution per loop. */}
        <circle
          cx={markerX}
          cy={markerY}
          r={5 * unit}
          fill={BRAND.primary}
          opacity={0.55 + 0.35 * glow}
        />
        <circle
          cx={markerX}
          cy={markerY}
          r={11 * unit}
          fill="none"
          stroke={courtGreen(0.28)}
          strokeWidth={1.5 * unit}
        />
      </svg>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: cy - 70 * unit,
          textAlign: "center",
          fontFamily: MONO_FONT,
          fontSize: 12 * unit,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: 0.2 * 12 * unit,
          color: muted(0.8),
        }}
      >
        {label}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: cy - 46 * unit,
          textAlign: "center",
          fontFamily: DISPLAY_FONT,
          fontSize: 82 * unit,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: -0.04 * 82 * unit,
          fontVariantNumeric: "tabular-nums",
          color: BRAND.foreground,
          textShadow: `0 0 ${(16 + 12 * glow).toFixed(1)}px ${courtGreen(0.14 + 0.1 * glow)}`,
        }}
      >
        {Math.round(percent)}
        <span
          style={{ fontSize: 32 * unit, fontWeight: 600, color: muted(0.7) }}
        >
          %
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: cy + 48 * unit,
          textAlign: "center",
          fontFamily: SANS_FONT,
          fontSize: 15 * unit,
          color: BRAND.foregroundSoft,
        }}
      >
        {caption}
      </div>

      <AbsoluteFill
        style={{
          background: `radial-gradient(112% 92% at 50% 48%, transparent 50%, ${ink(0.45)} 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
