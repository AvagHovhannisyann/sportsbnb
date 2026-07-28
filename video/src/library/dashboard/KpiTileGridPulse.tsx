/**
 * KpiTileGridPulse — the six-tile KPI grid on /owner/analytics once the numbers
 * have settled and the page is simply left open on a wall screen.
 * A seamless loop: figures never move (they are measurements), only the accent
 * glow, the sparkline highlight and one sweep across the grid.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  CHART_HSL,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  TAU,
  breathe,
  cardSurface,
  chalk,
  dram,
  eyebrowStyle,
  groupDigits,
  hairline,
  hashUnit,
  loopT,
  muted,
  tone,
  useMotionFrame,
  wrap,
} from "./dashboardKit";

const CANVAS_W = 1200;

/** How a tile's numeral is written. Never a fee, never a net-of-anything. */
export type KpiPulseFormat = "dram" | "count" | "percent";

export type KpiPulseTile = {
  /** Mono caps label. */
  label: string;
  /** The settled figure. Static for the whole loop — it is a reading. */
  value: number;
  /** How the numeral is written. */
  format: KpiPulseFormat;
  /** Small line under the numeral. Empty string hides it. */
  caption: string;
  /** Sparkline samples, oldest first. Prop-driven, never random per render. */
  series: number[];
  /** Index into `CHART_HSL`, 0–4. Out of range values clamp. */
  accent: number;
};

export type KpiTileGridPulseProps = {
  /** The tiles, read row-major. */
  tiles: KpiPulseTile[];
  /** Columns in the grid. */
  columns: number;
  /** Mono caps heading over the grid. Empty string hides it. */
  title: string;
  /** Seed for the per-tile breathing phase. Deterministic, not random. */
  phaseSeed: number;
  /** Highlight cells along each sparkline. Any whole number keeps the seam. */
  sparkCells: number;
};

export const kpiTileGridPulseDefaultProps: KpiTileGridPulseProps = {
  tiles: [
    {
      label: "Revenue",
      value: 1620000,
      format: "dram",
      caption: "Last 30 days",
      series: [42, 48, 45, 56, 61, 58, 70, 74, 71, 82, 88, 94],
      accent: 0,
    },
    {
      label: "Bookings",
      value: 116,
      format: "count",
      caption: "All courts",
      series: [6, 8, 7, 9, 11, 10, 12, 13, 12, 14, 15, 16],
      accent: 1,
    },
    {
      label: "Occupancy",
      value: 69,
      format: "percent",
      caption: "Weekly mean",
      series: [51, 54, 52, 58, 62, 60, 64, 67, 66, 68, 70, 69],
      accent: 2,
    },
    {
      label: "Avg slot price",
      value: 14000,
      format: "dram",
      caption: "Set by you",
      series: [12, 12, 13, 13, 13, 14, 14, 14, 14, 14, 14, 14],
      accent: 3,
    },
    {
      label: "Repeat players",
      value: 38,
      format: "percent",
      caption: "Booked twice or more",
      series: [22, 24, 26, 25, 29, 31, 30, 33, 35, 34, 37, 38],
      accent: 1,
    },
    {
      label: "Kept by you",
      value: 100,
      format: "percent",
      caption: "Zero commission, always",
      series: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
      accent: 0,
    },
  ],
  columns: 3,
  title: "Analytics · live",
  phaseSeed: 11,
  sparkCells: 8,
};

const writeValue = (value: number, format: KpiPulseFormat): string => {
  if (format === "dram") return dram(value);
  if (format === "percent") return `${Math.round(value)}%`;
  return groupDigits(Math.round(value));
};

/** Polyline length, so the highlight dash period is exact rather than guessed. */
const polylineLength = (points: { x: number; y: number }[]): number => {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. Each tile's accent glow is `breathe(t, φᵢ)` — one full cosine period —
 *     with φᵢ = hashUnit(i, seed)·2π. A full period is identical at both ends
 *     for any phase, which is how the tiles stagger without a one-way tween.
 *  2. The sparkline highlight is a dash pattern of period `cell` along a fixed
 *     path, offset by `-t · cell`. Shifting a periodic pattern by exactly one
 *     period reproduces the same painted pixels, so t = 0 and t = 1 match.
 *  3. The sweep travels `gridW + bandW` inside a clipped box: at t = 0 it is
 *     entirely off the left edge, at t = 1 entirely off the right. Both frames
 *     paint no band at all.
 *
 * No figure counts. These are settled readings, and a KPI that climbs every
 * few seconds on a wall screen is a dashboard telling a story it cannot back.
 */
export const KpiTileGridPulse: FC<KpiTileGridPulseProps> = ({
  tiles,
  columns,
  title,
  phaseSeed,
  sparkCells,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const unit = width / CANVAS_W;

  // Loop: frame 0 both opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);
  const t = loopT(frame, durationInFrames);

  const list = tiles.length > 0 ? tiles : [];
  const cols = Math.max(1, Math.round(columns));
  const rows = Math.max(1, Math.ceil(list.length / cols));

  const padX = 32 * unit;
  const gridTop = title.length > 0 ? 92 * unit : 32 * unit;
  const gridBottom = height - 32 * unit;
  const gap = 20 * unit;
  const gridW = width - padX * 2;
  const tileW = (gridW - gap * (cols - 1)) / cols;
  const tileH = (gridBottom - gridTop - gap * (rows - 1)) / rows;

  const bandW = 220 * unit;
  const sweepX = wrap(t * (gridW + bandW), gridW + bandW) - bandW;

  const cells = Math.max(2, Math.round(sparkCells));

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 74% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 76%)`,
        }}
      />

      {title.length > 0 ? (
        <div
          style={{
            position: "absolute",
            left: padX,
            top: 34 * unit,
            display: "flex",
            alignItems: "center",
            gap: 14 * unit,
          }}
        >
          <span style={{ ...eyebrowStyle(unit * 1.1) }}>{title}</span>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 14 * unit,
              color: muted(0.85),
            }}
          >
            every figure below is money you keep in full
          </span>
        </div>
      ) : null}

      {/* Clipped grid box — the sweep lives inside it, so it is genuinely off
          screen at both ends of the cycle rather than merely faint. */}
      <div
        style={{
          position: "absolute",
          left: padX,
          top: gridTop,
          width: gridW,
          height: gridBottom - gridTop,
          overflow: "hidden",
        }}
      >
        {list.map((tile, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          if (row >= rows) return null;

          const phase = hashUnit(i, phaseSeed) * TAU;
          const glow = breathe(t, phase);
          const accent =
            CHART_HSL[
              Math.max(
                0,
                Math.min(CHART_HSL.length - 1, Math.round(tile.accent)),
              )
            ];

          const sparkW = tileW - 44 * unit;
          const sparkH = 40 * unit;
          const values = tile.series.length > 1 ? tile.series : [0, 0];
          let lo = values[0];
          let hi = values[0];
          for (let k = 1; k < values.length; k += 1) {
            if (values[k] < lo) lo = values[k];
            if (values[k] > hi) hi = values[k];
          }
          const span = hi - lo === 0 ? 1 : hi - lo;
          const points = values.map((v, k) => ({
            x: (sparkW * k) / (values.length - 1),
            y: sparkH - ((v - lo) / span) * sparkH,
          }));
          const pathLen = Math.max(1, polylineLength(points));
          const cell = pathLen / cells;
          const d = points
            .map((p, k) => `${k === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
            .join(" ");

          return (
            <div
              key={tile.label}
              style={{
                position: "absolute",
                left: (tileW + gap) * col,
                top: (tileH + gap) * row,
                width: tileW,
                height: tileH,
                ...cardSurface(unit, 18),
                overflow: "hidden",
                padding: `${20 * unit}px ${22 * unit}px`,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  height: 3 * unit,
                  background: `linear-gradient(90deg, ${tone(accent, 0.55 + 0.4 * glow)}, ${tone(accent, 0.05)})`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(76% 110% at 100% 0%, ${tone(accent, 0.04 + 0.06 * glow)} 0%, transparent 66%)`,
                  pointerEvents: "none",
                }}
              />

              <div style={{ ...eyebrowStyle(unit, tone(accent, 0.95)) }}>
                {tile.label}
              </div>

              <div
                style={{
                  marginTop: 10 * unit,
                  fontFamily: MONO_FONT,
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 34 * unit,
                  fontWeight: 500,
                  letterSpacing: -0.025 * 34 * unit,
                  lineHeight: 1,
                  color: BRAND.foreground,
                }}
              >
                {writeValue(tile.value, tile.format)}
              </div>

              {tile.caption.length > 0 ? (
                <div
                  style={{
                    marginTop: 8 * unit,
                    fontFamily: SANS_FONT,
                    fontSize: 13.5 * unit,
                    color: muted(0.88),
                  }}
                >
                  {tile.caption}
                </div>
              ) : null}

              {/* The line itself is fixed data. Only the highlight travelling
                  along it moves, and it does so by exactly one dash period. */}
              <svg
                width={sparkW}
                height={sparkH}
                viewBox={`0 0 ${sparkW} ${sparkH}`}
                style={{ marginTop: "auto", overflow: "visible" }}
              >
                <path
                  d={d}
                  fill="none"
                  stroke={tone(accent, 0.28)}
                  strokeWidth={2 * unit}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={d}
                  fill="none"
                  stroke={tone(accent, 0.95)}
                  strokeWidth={2.6 * unit}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={`${(cell * 0.34).toFixed(3)} ${(cell * 0.66).toFixed(3)}`}
                  strokeDashoffset={(-t * cell).toFixed(4)}
                />
                <circle
                  cx={points[points.length - 1].x}
                  cy={points[points.length - 1].y}
                  r={3.4 * unit}
                  fill={tone(accent, 0.5 + 0.5 * glow)}
                />
              </svg>
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            left: sweepX,
            top: 0,
            width: bandW,
            height: "100%",
            background: `linear-gradient(90deg, transparent, ${chalk(0.035)} 46%, ${chalk(0.055)} 54%, transparent)`,
            pointerEvents: "none",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: padX,
          right: padX,
          top: gridTop - 14 * unit,
          height: 1 * unit,
          background: `linear-gradient(90deg, ${hairline(1)}, transparent)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          right: padX,
          top: 40 * unit,
          display: "flex",
          alignItems: "center",
          gap: 8 * unit,
        }}
      >
        <div
          style={{
            width: 8 * unit,
            height: 8 * unit,
            borderRadius: 999,
            backgroundColor: BRAND.primary,
            opacity: 0.4 + 0.6 * breathe(t),
          }}
        />
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 13.5 * unit,
            fontWeight: 600,
            color: muted(0.9),
          }}
        >
          live
        </span>
      </div>
    </AbsoluteFill>
  );
};
