/**
 * ChartSparklineDrift — the small live sparkline inside an owner KPI tile, the
 * one that keeps ticking while the dashboard is left open.
 * A seamless loop: the series is treated as a ring and scrolled by a whole
 * number of samples per cycle, so the last frame is the first frame exactly.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  MONO_FONT,
  SANS_FONT,
  breathe,
  cardSurface,
  courtGreen,
  dram,
  eyebrowStyle,
  hairline,
  loopT,
  muted,
  useMotionFrame,
  wrap,
} from "./dashboardKit";

const CANVAS_W = 720;

export type ChartSparklineDriftProps = {
  /** The ring of samples. Read cyclically, so any length works. */
  samples: number[];
  /** How many samples scroll past per loop. Whole number keeps the seam exact. */
  samplesPerLoop: number;
  /** How many samples are visible at once. */
  windowSize: number;
  /** Mono caps label above the spark. */
  label: string;
  /** The figure printed beside the label, in dram. Static — it is a fact. */
  value: number;
};

export const chartSparklineDriftDefaultProps: ChartSparklineDriftProps = {
  samples: [
    12, 15, 13, 18, 22, 19, 24, 21, 26, 23, 29, 25, 31, 27, 22, 18, 16, 20, 24,
    28,
  ],
  samplesPerLoop: 10,
  windowSize: 14,
  label: "Bookings · rolling",
  value: 48000,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 * The samples form a ring. Over one loop the group translates left by exactly
 * `samplesPerLoop · stepX` pixels while the point at lattice index `i` reads
 * `samples[(i + samplesPerLoop) mod N]` at the end — which is the same value
 * the point at `i + samplesPerLoop` held at the start. Because both the shift
 * and the sampling advance by the *same whole number*, the rendered geometry
 * at t = 1 is identical to t = 0. That is a wrap() lattice, not a tween: there
 * is no interpolation from a start state to a different end state anywhere.
 *
 * The glow rides `breathe(t)`, one full cosine period.
 */
export const ChartSparklineDrift: FC<ChartSparklineDriftProps> = ({
  samples,
  samplesPerLoop,
  windowSize,
  label,
  value,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const unit = width / CANVAS_W;

  // Loop: frame 0 both opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);
  const t = loopT(frame, durationInFrames);

  const ring = samples.length > 0 ? samples : [0];
  const n = ring.length;
  const perLoop = Math.max(1, Math.round(samplesPerLoop));
  const visible = Math.max(2, Math.round(windowSize));

  const padX = 26 * unit;
  const plotLeft = padX;
  const plotRight = width - padX;
  const plotTop = height * 0.46;
  const plotBottom = height - 34 * unit;
  const plotHeight = plotBottom - plotTop;
  const stepX = (plotRight - plotLeft) / visible;

  const lo = ring.reduce((m, v) => Math.min(m, v), ring[0]);
  const hi = ring.reduce((m, v) => Math.max(m, v), ring[0]);
  const span = hi - lo > 0 ? hi - lo : 1;

  /** Continuous shift in samples; an exact whole number at t = 1. */
  const shift = t * perLoop;
  /** The integer lattice index the window starts at, plus the sub-sample part. */
  const base = Math.floor(shift);
  const frac = shift - base;

  // Two extra columns either side so the polyline never shows its ends.
  const points: { x: number; y: number }[] = [];
  for (let i = -2; i <= visible + 2; i += 1) {
    const sample = ring[wrap(base + i, n)];
    points.push({
      x: plotLeft + (i - frac) * stepX,
      y: plotBottom - ((sample - lo) / span) * plotHeight,
    });
  }

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const areaD = `${d} L ${points[points.length - 1].x.toFixed(2)} ${plotBottom.toFixed(2)} L ${points[0].x.toFixed(2)} ${plotBottom.toFixed(2)} Z`;

  const glow = breathe(t);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <div
        style={{
          position: "absolute",
          inset: 18 * unit,
          ...cardSurface(unit, 18),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 26 * unit,
            top: 22 * unit,
            display: "flex",
            alignItems: "baseline",
            gap: 14 * unit,
          }}
        >
          <span style={{ ...eyebrowStyle(unit, muted(0.9)) }}>{label}</span>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontVariantNumeric: "tabular-nums",
              fontSize: 26 * unit,
              fontWeight: 500,
              color: BRAND.foreground,
            }}
          >
            {dram(value)}
          </span>
        </div>

        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={courtGreen(0.28 + 0.08 * glow)} />
              <stop offset="100%" stopColor={courtGreen(0.01)} />
            </linearGradient>
            {/* The window edges are soft, so the ring's re-entry is never a
                visible pop at the boundary. */}
            <linearGradient id="sparkMask" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#000" stopOpacity="0" />
              <stop offset="8%" stopColor="#000" stopOpacity="1" />
              <stop offset="92%" stopColor="#000" stopOpacity="1" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </linearGradient>
            <mask id="sparkEdge">
              <rect
                x={plotLeft}
                y={0}
                width={plotRight - plotLeft}
                height={height}
                fill="url(#sparkMask)"
              />
            </mask>
          </defs>

          <line
            x1={plotLeft}
            y1={plotBottom}
            x2={plotRight}
            y2={plotBottom}
            stroke={hairline(1)}
            strokeWidth={1 * unit}
          />

          <g mask="url(#sparkEdge)">
            <path d={areaD} fill="url(#sparkFill)" />
            <path
              d={d}
              fill="none"
              stroke={BRAND.primary}
              strokeWidth={2.6 * unit}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>

        <div
          style={{
            position: "absolute",
            right: 26 * unit,
            top: 26 * unit,
            fontFamily: SANS_FONT,
            fontSize: 13 * unit,
            color: muted(0.65 + 0.25 * glow),
          }}
        >
          live
        </div>
      </div>
    </AbsoluteFill>
  );
};
