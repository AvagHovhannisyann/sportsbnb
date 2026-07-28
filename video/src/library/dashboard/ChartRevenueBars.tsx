/**
 * ChartRevenueBars — the six-month revenue bar chart on /owner/analytics, the
 * drawn form of `analytics.revenueByMonth`.
 * One-way: bars grow from the baseline on a staggered monotonic draw and the
 * highlighted month's figure lands exactly. Data is prop-driven, never random.
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

export type RevenueBar = {
  /** Axis label, e.g. "Jul". */
  month: string;
  /** Revenue for that month, in dram. */
  revenue: number;
};

export type ChartRevenueBarsProps = {
  /** The series, oldest first. Six months is what the analytics hook returns. */
  bars: RevenueBar[];
  /** Mono caps heading. */
  title: string;
  /** Line under the heading. */
  subtitle: string;
  /** Index of the bar to call out. -1 highlights nothing. */
  highlightIndex: number;
  /** Horizontal gridlines behind the bars. */
  gridLines: number;
};

export const chartRevenueBarsDefaultProps: ChartRevenueBarsProps = {
  bars: [
    { month: "Feb", revenue: 840000 },
    { month: "Mar", revenue: 972000 },
    { month: "Apr", revenue: 1104000 },
    { month: "May", revenue: 1290000 },
    { month: "Jun", revenue: 1446000 },
    { month: "Jul", revenue: 1620000 },
  ],
  title: "Revenue by month",
  subtitle: "All venues · you keep 100% of every figure below",
  highlightIndex: 5,
  gridLines: 4,
};

const BAR_BASE = 14;
const BAR_STEP = 7;
const BAR_DURATION = 52;

export const ChartRevenueBars: FC<ChartRevenueBarsProps> = ({
  bars,
  title,
  subtitle,
  highlightIndex,
  gridLines,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: the settled chart is the message.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = width / CANVAS_W;

  const count = Math.max(1, bars.length);
  const ceiling = bars.reduce((m, b) => Math.max(m, b.revenue), 1);

  const plotLeft = 118 * unit;
  const plotRight = width - 54 * unit;
  const plotTop = height * 0.26;
  const plotBottom = height * 0.8;
  const plotHeight = plotBottom - plotTop;
  const slot = (plotRight - plotLeft) / count;
  const barWidth = slot * 0.54;

  const lines = Math.max(1, Math.round(gridLines));
  const lastSettle = BAR_BASE + BAR_STEP * (count - 1) + BAR_DURATION;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(86% 72% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 74%)`,
        }}
      />

      <div style={{ position: "absolute", left: 54 * unit, top: 44 * unit }}>
        <div style={{ ...eyebrowStyle(unit * 1.15) }}>{title}</div>
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

      <Sequence name="Grid" layout="none">
        {Array.from({ length: lines + 1 }, (_, i) => {
          const y = plotBottom - (i / lines) * plotHeight;
          const value = (i / lines) * ceiling;
          const draw = interpolateSafe(frame, [i * 3, i * 3 + 18], [0, 1]);
          return (
            <div key={i}>
              <div
                style={{
                  position: "absolute",
                  left: plotLeft,
                  top: y,
                  width: (plotRight - plotLeft) * draw,
                  height: 1 * unit,
                  backgroundColor: i === 0 ? hairline(1) : hairline(0.55),
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 54 * unit,
                  top: y - 9 * unit,
                  width: plotLeft - 66 * unit,
                  textAlign: "right",
                  fontFamily: MONO_FONT,
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 12.5 * unit,
                  color: muted(0.7),
                  opacity: draw,
                }}
              >
                {i === 0 ? "0" : dramCompact(value)}
              </div>
            </div>
          );
        })}
      </Sequence>

      <Sequence name="Bars" layout="none">
        {bars.map((bar, i) => {
          const delay = BAR_BASE + i * BAR_STEP;
          const grow = countProgress({ frame, delay, duration: BAR_DURATION });
          const full = (bar.revenue / ceiling) * plotHeight;
          const h = full * grow;
          const x = plotLeft + slot * i + (slot - barWidth) / 2;
          const isHot = i === highlightIndex;
          const settleAt = delay + BAR_DURATION;
          const land = isHot
            ? interpolateSafe(
                frame,
                [settleAt - 8, settleAt + 2, settleAt + 34],
                [0, 1, 0],
              )
            : 0;

          return (
            <div key={bar.month}>
              {/* The track the bar grows inside — present from frame 0, so the
                  chart has its shape before it has its data. */}
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: plotTop,
                  width: barWidth,
                  height: plotHeight,
                  borderRadius: 10 * unit,
                  backgroundColor: "hsla(157, 12%, 22%, 0.28)",
                  opacity: interpolateSafe(frame, [0, 14], [0, 1]),
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: plotBottom - h,
                  width: barWidth,
                  height: h,
                  borderRadius: `${10 * unit}px ${10 * unit}px ${3 * unit}px ${3 * unit}px`,
                  background: isHot
                    ? `linear-gradient(180deg, ${BRAND.primary} 0%, ${courtGreen(0.55)} 68%, ${courtGreen(0.22)} 100%)`
                    : `linear-gradient(180deg, ${courtGreen(0.42)} 0%, ${courtGreen(0.16)} 100%)`,
                  boxShadow: isHot
                    ? `0 0 ${(20 + 26 * land) * unit}px ${-6 * unit}px ${courtGreen(0.45 + 0.3 * land)}`
                    : "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: plotLeft + slot * i,
                  top: plotBottom + 16 * unit,
                  width: slot,
                  textAlign: "center",
                  fontFamily: SANS_FONT,
                  fontSize: 15 * unit,
                  color: isHot ? BRAND.foreground : muted(0.9),
                  opacity: interpolateSafe(frame, [delay, delay + 16], [0, 1]),
                }}
              >
                {bar.month}
              </div>
            </div>
          );
        })}
      </Sequence>

      {/* The callout. Its figure uses the same exact-landing counter as the
          dashboard tile, so it cannot settle on an approximation. */}
      {highlightIndex >= 0 && highlightIndex < count ? (
        <div
          style={{
            position: "absolute",
            right: 54 * unit,
            top: 44 * unit,
            textAlign: "right",
            opacity: interpolateSafe(
              frame,
              [lastSettle - 22, lastSettle - 2],
              [0, 1],
            ),
          }}
        >
          <div
            style={{
              fontFamily: SANS_FONT,
              fontSize: 15 * unit,
              color: muted(0.9),
            }}
          >
            {bars[highlightIndex].month}
          </div>
          <div
            style={{
              marginTop: 6 * unit,
              fontFamily: DISPLAY_FONT,
              fontSize: 38 * unit,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -0.03 * 38 * unit,
              color: BRAND.primary,
            }}
          >
            {dram(
              countTo({
                frame,
                from: 0,
                to: bars[highlightIndex].revenue,
                delay: BAR_BASE + highlightIndex * BAR_STEP,
                duration: BAR_DURATION,
              }),
            )}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
