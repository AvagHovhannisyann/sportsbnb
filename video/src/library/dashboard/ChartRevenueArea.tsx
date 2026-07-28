/**
 * ChartRevenueArea — the cumulative-earnings area chart on /owner/analytics,
 * the one that answers "how much have I taken this season".
 * One-way: a clip rectangle wipes the filled area open left to right while the
 * boundary line draws against its exact polyline length; the total lands exact.
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
  SANS_FONT,
  ZERO_COMMISSION_NOTE,
  countProgress,
  countTo,
  courtGreen,
  dram,
  dramCompact,
  eyebrowStyle,
  hairline,
  interpolateSafe,
  muted,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS_W = 1280;

export type ChartRevenueAreaProps = {
  /** Per-bucket revenue in dram, oldest first. Prop-driven. */
  values: number[];
  /** One label per bucket. */
  labels: string[];
  /** Mono caps heading. */
  title: string;
  /** Plot the running total instead of the per-bucket figure. */
  cumulative: boolean;
  /** Y ceiling in dram. Pass 0 to derive it from the plotted series. */
  ceiling: number;
};

export const chartRevenueAreaDefaultProps: ChartRevenueAreaProps = {
  values: [186000, 210000, 198000, 246000, 288000, 264000, 312000, 348000],
  labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
  title: "Earnings, season to date",
  cumulative: true,
  ceiling: 0,
};

const WIPE_DELAY = 12;
const WIPE_DURATION = 102;

export const ChartRevenueArea: FC<ChartRevenueAreaProps> = ({
  values,
  labels,
  title,
  cumulative,
  ceiling,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: the finished area and its total are the message.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = width / CANVAS_W;

  const raw = values.length > 0 ? values : [0];
  const plotted: number[] = [];
  let running = 0;
  for (let i = 0; i < raw.length; i += 1) {
    running += Math.max(0, raw[i]);
    plotted.push(cumulative ? running : Math.max(0, raw[i]));
  }
  const total = running;
  const top = ceiling > 0 ? ceiling : plotted.reduce((m, v) => Math.max(m, v), 1);

  const plotLeft = 118 * unit;
  const plotRight = width - 64 * unit;
  const plotTop = height * 0.3;
  const plotBottom = height * 0.78;
  const plotHeight = plotBottom - plotTop;
  const stepX =
    plotted.length > 1 ? (plotRight - plotLeft) / (plotted.length - 1) : 0;

  const points = plotted.map((v, i) => ({
    x: plotLeft + stepX * i,
    y: plotBottom - (v / top) * plotHeight,
  }));

  let pathLength = 0;
  for (let i = 1; i < points.length; i += 1) {
    pathLength += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
  }
  pathLength = Math.max(pathLength, 1);

  const lineD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const areaD = `${lineD} L ${points[points.length - 1].x.toFixed(2)} ${plotBottom.toFixed(2)} L ${points[0].x.toFixed(2)} ${plotBottom.toFixed(2)} Z`;

  const wipe = countProgress({
    frame,
    delay: WIPE_DELAY,
    duration: WIPE_DURATION,
  });
  const settled = WIPE_DELAY + WIPE_DURATION;
  const clipWidth = (plotRight - plotLeft) * wipe;

  // The head marker rides the wipe, so it sits exactly on the drawn edge.
  const headX = plotLeft + clipWidth;
  const seg = plotted.length > 1 ? wipe * (plotted.length - 1) : 0;
  const segIndex = Math.min(plotted.length - 2, Math.floor(seg));
  const segFrac = plotted.length > 1 ? seg - segIndex : 0;
  const headY =
    plotted.length > 1
      ? points[Math.max(0, segIndex)].y +
        (points[Math.min(points.length - 1, segIndex + 1)].y -
          points[Math.max(0, segIndex)].y) *
          Math.max(0, Math.min(1, segFrac))
      : points[0].y;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(86% 72% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 74%)`,
        }}
      />

      <div style={{ position: "absolute", left: 54 * unit, top: 42 * unit }}>
        <div style={{ ...eyebrowStyle(unit * 1.15) }}>{title}</div>
        <div
          style={{
            marginTop: 12 * unit,
            fontFamily: DISPLAY_FONT,
            fontSize: 46 * unit,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: -0.035 * 46 * unit,
            color: BRAND.foreground,
          }}
        >
          {dram(
            countTo({
              frame,
              from: 0,
              to: total,
              delay: WIPE_DELAY,
              duration: WIPE_DURATION,
            }),
          )}
        </div>
        <div
          style={{
            marginTop: 8 * unit,
            fontFamily: SANS_FONT,
            fontSize: 15 * unit,
            color: muted(0.9),
            opacity: interpolateSafe(frame, [settled - 14, settled + 6], [0, 1]),
          }}
        >
          {ZERO_COMMISSION_NOTE}
        </div>
      </div>

      <Sequence name="Area" layout="none">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={courtGreen(0.42)} />
              <stop offset="100%" stopColor={courtGreen(0.02)} />
            </linearGradient>
            <clipPath id="areaWipe">
              <rect
                x={plotLeft}
                y={plotTop - 40 * unit}
                width={clipWidth}
                height={plotHeight + 80 * unit}
              />
            </clipPath>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
            const y = plotBottom - f * plotHeight;
            const g = interpolateSafe(frame, [i * 2, i * 2 + 16], [0, 1]);
            return (
              <g key={f}>
                <line
                  x1={plotLeft}
                  y1={y}
                  x2={plotLeft + (plotRight - plotLeft) * g}
                  y2={y}
                  stroke={f === 0 ? hairline(1) : hairline(0.5)}
                  strokeWidth={1 * unit}
                />
                <text
                  x={plotLeft - 16 * unit}
                  y={y + 5 * unit}
                  textAnchor="end"
                  fill={muted(0.7)}
                  style={{
                    fontFamily: SANS_FONT,
                    fontSize: 12.5 * unit,
                  }}
                  opacity={g}
                >
                  {f === 0 ? "0" : dramCompact(f * top)}
                </text>
              </g>
            );
          })}

          <g clipPath="url(#areaWipe)">
            <path d={areaD} fill="url(#areaFill)" />
          </g>

          <path
            d={lineD}
            fill="none"
            stroke={BRAND.primary}
            strokeWidth={3.2 * unit}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLength}
            strokeDashoffset={pathLength * (1 - wipe)}
          />

          {/* Head marker + drop line, riding the wipe edge. */}
          <g opacity={interpolateSafe(frame, [WIPE_DELAY, WIPE_DELAY + 10], [0, 1])}>
            <line
              x1={headX}
              y1={headY}
              x2={headX}
              y2={plotBottom}
              stroke={courtGreen(0.4)}
              strokeWidth={1.5 * unit}
              strokeDasharray={`${4 * unit} ${5 * unit}`}
            />
            <circle
              cx={headX}
              cy={headY}
              r={7 * unit}
              fill={BRAND.background}
              stroke={BRAND.primary}
              strokeWidth={2.6 * unit}
            />
          </g>
        </svg>
      </Sequence>

      {points.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x - (stepX > 0 ? stepX : 80 * unit) / 2,
            width: stepX > 0 ? stepX : 80 * unit,
            top: plotBottom + 18 * unit,
            textAlign: "center",
            fontFamily: SANS_FONT,
            fontSize: 14 * unit,
            color: muted(0.85),
            opacity: interpolateSafe(
              frame,
              [
                WIPE_DELAY + (WIPE_DURATION * i) / Math.max(1, points.length - 1),
                WIPE_DELAY +
                  (WIPE_DURATION * i) / Math.max(1, points.length - 1) +
                  12,
              ],
              [0, 1],
            ),
          }}
        >
          {labels[i] ?? ""}
        </div>
      ))}
    </AbsoluteFill>
  );
};
