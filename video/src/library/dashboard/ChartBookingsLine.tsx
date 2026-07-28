/**
 * ChartBookingsLine — the bookings-per-week line on /owner/analytics, drawn
 * left to right the way an owner reads it.
 * One-way: the polyline is revealed by `strokeDashoffset` against its exact
 * summed segment length, so the draw ends on the final vertex, not near it.
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  countProgress,
  countTo,
  cyan,
  eyebrowStyle,
  hairline,
  interpolateSafe,
  muted,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS_W = 1280;

export type ChartBookingsLineProps = {
  /** Bookings per bucket, oldest first. Prop-driven, never generated. */
  values: number[];
  /** One label per bucket. Extra labels are ignored, missing ones blank. */
  labels: string[];
  /** Mono caps heading. */
  title: string;
  /** Line under the heading. */
  subtitle: string;
  /** Y ceiling. Pass 0 to derive it from the series. */
  ceiling: number;
};

export const chartBookingsLineDefaultProps: ChartBookingsLineProps = {
  values: [12, 15, 14, 19, 23, 21, 26, 29],
  labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
  title: "Bookings per week",
  subtitle: "Confirmed slots across all your venues",
  ceiling: 0,
};

const DRAW_DELAY = 12;
const DRAW_DURATION = 96;

export const ChartBookingsLine: FC<ChartBookingsLineProps> = ({
  values,
  labels,
  title,
  subtitle,
  ceiling,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: the finished line is the message.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = width / CANVAS_W;

  const series = values.length > 0 ? values : [0];
  const top = ceiling > 0 ? ceiling : series.reduce((m, v) => Math.max(m, v), 1);

  const plotLeft = 96 * unit;
  const plotRight = width - 72 * unit;
  const plotTop = height * 0.28;
  const plotBottom = height * 0.78;
  const plotHeight = plotBottom - plotTop;

  const stepX =
    series.length > 1 ? (plotRight - plotLeft) / (series.length - 1) : 0;
  const points = series.map((v, i) => ({
    x: plotLeft + stepX * i,
    y: plotBottom - (Math.max(0, v) / top) * plotHeight,
  }));

  /**
   * Exact path length: the polyline is straight segments, so the sum of the
   * segment hypotenuses *is* its length. No `getTotalLength()`, which would
   * need a live DOM node and would not agree between the studio and a render.
   */
  let pathLength = 0;
  for (let i = 1; i < points.length; i += 1) {
    pathLength += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
  }
  pathLength = Math.max(pathLength, 1);

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const draw = countProgress({
    frame,
    delay: DRAW_DELAY,
    duration: DRAW_DURATION,
  });
  const settled = DRAW_DELAY + DRAW_DURATION;

  /** Frame at which the draw has passed vertex `i`, so its dot may appear. */
  const vertexAt = (i: number): number =>
    series.length > 1
      ? DRAW_DELAY + (DRAW_DURATION * i) / (series.length - 1)
      : DRAW_DELAY;

  const lastValue = series[series.length - 1];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(86% 72% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 74%)`,
        }}
      />

      <div style={{ position: "absolute", left: 54 * unit, top: 44 * unit }}>
        <div style={{ ...eyebrowStyle(unit * 1.15, BRAND.foreground) }}>
          {title}
        </div>
        <div
          style={{
            marginTop: 10 * unit,
            fontFamily: SANS_FONT,
            fontSize: 17 * unit,
            color: muted(0.95),
          }}
        >
          {subtitle}
        </div>
      </div>

      <Sequence name="Plot" layout="none">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: "absolute", inset: 0 }}
        >
          {/* Gridlines, drawn before the data so the frame exists first. */}
          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
            const y = plotBottom - f * plotHeight;
            const g = interpolateSafe(frame, [i * 2, i * 2 + 16], [0, 1]);
            return (
              <line
                key={f}
                x1={plotLeft}
                y1={y}
                x2={plotLeft + (plotRight - plotLeft) * g}
                y2={y}
                stroke={f === 0 ? hairline(1) : hairline(0.5)}
                strokeWidth={1 * unit}
              />
            );
          })}

          {/* Glow pass under the line, same dash geometry. */}
          <path
            d={d}
            fill="none"
            stroke={cyan(0.35)}
            strokeWidth={9 * unit}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLength}
            strokeDashoffset={pathLength * (1 - draw)}
            opacity={0.35}
          />
          <path
            d={d}
            fill="none"
            stroke={BRAND.primary}
            strokeWidth={3.4 * unit}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLength}
            strokeDashoffset={pathLength * (1 - draw)}
          />

          {points.map((p, i) => {
            const appear = interpolateSafe(
              frame,
              [vertexAt(i), vertexAt(i) + 10],
              [0, 1],
            );
            return (
              <g key={i} opacity={appear}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={6 * unit * appear}
                  fill={BRAND.background}
                  stroke={BRAND.primary}
                  strokeWidth={2.4 * unit}
                />
              </g>
            );
          })}
        </svg>
      </Sequence>

      {/* Axis labels. */}
      {points.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x - stepX / 2,
            width: stepX > 0 ? stepX : 80 * unit,
            top: plotBottom + 18 * unit,
            textAlign: "center",
            fontFamily: SANS_FONT,
            fontSize: 14 * unit,
            color: muted(0.85),
            opacity: interpolateSafe(
              frame,
              [vertexAt(i), vertexAt(i) + 12],
              [0, 1],
            ),
          }}
        >
          {labels[i] ?? ""}
        </div>
      ))}

      {/* Head readout — lands exactly on the last real value. */}
      <div
        style={{
          position: "absolute",
          right: 54 * unit,
          top: 44 * unit,
          textAlign: "right",
          opacity: interpolateSafe(frame, [settled - 20, settled], [0, 1]),
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 44 * unit,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: -0.03 * 44 * unit,
            color: BRAND.foreground,
          }}
        >
          {Math.round(
            countTo({
              frame,
              from: 0,
              to: lastValue,
              delay: DRAW_DELAY,
              duration: DRAW_DURATION,
            }),
          )}
        </div>
        <div
          style={{
            marginTop: 4 * unit,
            fontFamily: MONO_FONT,
            fontSize: 12.5 * unit,
            textTransform: "uppercase",
            letterSpacing: 0.16 * 12.5 * unit,
            color: muted(0.8),
          }}
        >
          this week
        </div>
      </div>
    </AbsoluteFill>
  );
};
