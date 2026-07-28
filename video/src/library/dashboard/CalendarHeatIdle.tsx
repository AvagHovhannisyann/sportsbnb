/**
 * CalendarHeatIdle — the twelve-week heat strip on /owner/analytics while the
 * page is simply open: the data is settled, so only the surface moves.
 * A seamless loop: every cell breathes on its own phase of one full cosine
 * period, and the scan pass enters and leaves the clipped grid entirely.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  MONO_FONT,
  SANS_FONT,
  TAU,
  breathe,
  cardSurface,
  chalk,
  courtGreen,
  eyebrowStyle,
  hairline,
  hashUnit,
  loopT,
  muted,
  useMotionFrame,
  wrap,
} from "./dashboardKit";

const CANVAS_W = 900;

export type CalendarHeatIdleProps = {
  /** Utilisation per cell, 0–1, read row-major. Prop-driven, never random. */
  intensities: number[];
  /** Columns in the grid — weeks across. */
  columns: number;
  /** Mono caps heading. */
  title: string;
  /** Row labels, top to bottom. */
  rowLabels: string[];
  /** Seed for the per-cell breathing phase. Deterministic, not random. */
  phaseSeed: number;
};

export const calendarHeatIdleDefaultProps: CalendarHeatIdleProps = {
  intensities: [
    0.2, 0.3, 0.25, 0.4, 0.45, 0.35, 0.5, 0.55, 0.5, 0.6, 0.65, 0.6, 0.3, 0.35,
    0.3, 0.45, 0.5, 0.4, 0.55, 0.6, 0.55, 0.65, 0.7, 0.68, 0.25, 0.3, 0.35, 0.5,
    0.45, 0.5, 0.6, 0.62, 0.6, 0.7, 0.72, 0.7, 0.35, 0.4, 0.42, 0.55, 0.6, 0.58,
    0.7, 0.72, 0.75, 0.8, 0.85, 0.82, 0.55, 0.6, 0.58, 0.7, 0.75, 0.72, 0.85,
    0.88, 0.9, 0.95, 1, 0.98, 0.5, 0.55, 0.5, 0.65, 0.7, 0.68, 0.8, 0.82, 0.85,
    0.9, 0.95, 0.92,
  ],
  columns: 12,
  title: "Twelve weeks",
  rowLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  phaseSeed: 7,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. Each cell's brightness is `breathe(t, φᵢ)` — one full cosine period —
 *     with φᵢ = hashUnit(i, seed)·2π. A full period is equal at both ends for
 *     any phase, so every cell closes exactly where it opened.
 *  2. The scan pass travels `gridWidth + bandWidth` inside a clipped box, so
 *     at t = 0 it sits entirely off the left edge and at t = 1 entirely off the
 *     right. Both frames render no band at all — identical, not merely close.
 *  3. Nothing counts and no figure changes.
 */
export const CalendarHeatIdle: FC<CalendarHeatIdleProps> = ({
  intensities,
  columns,
  title,
  rowLabels,
  phaseSeed,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const unit = width / CANVAS_W;

  // Loop: frame 0 both opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);
  const t = loopT(frame, durationInFrames);

  const cols = Math.max(1, Math.round(columns));
  const rows = Math.max(1, Math.ceil(intensities.length / cols));

  const padX = 40 * unit;
  const labelW = 52 * unit;
  const gridLeft = padX + labelW;
  const gridRight = width - padX;
  const gridTop = 116 * unit;
  const gridBottom = height - 54 * unit;
  const gap = 7 * unit;
  const cellW = (gridRight - gridLeft - gap * (cols - 1)) / cols;
  const cellH = (gridBottom - gridTop - gap * (rows - 1)) / rows;

  const gridWidth = gridRight - gridLeft;
  const bandW = 150 * unit;
  const scanX = wrap(t * (gridWidth + bandW), gridWidth + bandW) - bandW;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <div
        style={{
          position: "absolute",
          inset: 20 * unit,
          ...cardSurface(unit, 20),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: padX,
            top: 30 * unit,
            display: "flex",
            alignItems: "center",
            gap: 14 * unit,
          }}
        >
          <span style={{ ...eyebrowStyle(unit * 1.05) }}>{title}</span>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 14 * unit,
              color: muted(0.85),
            }}
          >
            darker is quieter · every filled hour is yours in full
          </span>
        </div>

        {/* Row labels. */}
        {rowLabels.slice(0, rows).map((label, r) => (
          <div
            key={label}
            style={{
              position: "absolute",
              left: padX,
              width: labelW - 12 * unit,
              top: gridTop + (cellH + gap) * r + cellH / 2 - 8 * unit,
              textAlign: "right",
              fontFamily: MONO_FONT,
              fontSize: 11.5 * unit,
              textTransform: "uppercase",
              letterSpacing: 0.12 * 11.5 * unit,
              color: muted(0.7),
            }}
          >
            {label}
          </div>
        ))}

        {/* The clipped grid — the scan band lives inside this box. */}
        <div
          style={{
            position: "absolute",
            left: gridLeft,
            top: gridTop,
            width: gridWidth,
            height: gridBottom - gridTop,
            overflow: "hidden",
          }}
        >
          {intensities.map((value, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            if (row >= rows) return null;
            const phase = hashUnit(i, phaseSeed) * TAU;
            const shimmer = breathe(t, phase);
            const level = Math.max(0, Math.min(1, value));
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: (cellW + gap) * col,
                  top: (cellH + gap) * row,
                  width: cellW,
                  height: cellH,
                  borderRadius: 6 * unit,
                  backgroundColor:
                    level <= 0
                      ? BRAND.input
                      : courtGreen(0.08 + 0.7 * level + 0.06 * level * shimmer),
                  border: `${1 * unit}px solid ${hairline(0.8)}`,
                }}
              />
            );
          })}

          {/* Scan pass: on screen only strictly between t = 0 and t = 1. */}
          <div
            style={{
              position: "absolute",
              left: scanX,
              top: 0,
              width: bandW,
              height: "100%",
              background: `linear-gradient(90deg, transparent, ${chalk(0.055)} 45%, ${courtGreen(0.09)} 55%, transparent)`,
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
