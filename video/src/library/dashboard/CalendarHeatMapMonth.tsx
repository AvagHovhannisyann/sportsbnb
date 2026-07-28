/**
 * CalendarHeatMapMonth — the month heat map on /owner/analytics: one cell per
 * day, shaded by how much of that day's bookable time was actually booked.
 * One-way: cells resolve on a diagonal sweep from the first of the month, then
 * hold. Intensities are prop-driven — a heat map that re-rolled per render
 * would be a chart of nothing.
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
  countTo,
  courtGreen,
  eyebrowStyle,
  hairline,
  interpolateSafe,
  muted,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS_W = 900;

export type CalendarHeatMapMonthProps = {
  /** Utilisation per day, 0–1, first entry = the 1st. Prop-driven, not random. */
  intensities: number[];
  /** Weekday the 1st falls on, 0 = Monday (the app's week start). */
  startWeekday: number;
  /** Month name in the header. */
  monthLabel: string;
  /** Mono caps above the month. */
  title: string;
  /** Weekday headers, Monday first. */
  weekdayLabels: string[];
};

export const calendarHeatMapMonthDefaultProps: CalendarHeatMapMonthProps = {
  // A real-shaped July: quiet Mondays, packed weekends, one closed day.
  intensities: [
    0.5, 0.5, 0.4, 0.6, 0.8, 1, 0.85, 0.45, 0.5, 0.35, 0.6, 0.85, 1, 0.9, 0.5,
    0.55, 0.4, 0.65, 0.8, 1, 0.95, 0.4, 0, 0.45, 0.7, 0.9, 1, 0.85, 0.55, 0.6,
    0.5,
  ],
  startWeekday: 1,
  monthLabel: "July",
  title: "Occupancy by day",
  weekdayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

const CELL_BASE = 10;
/** Diagonal sweep: the delay is driven by row + column, not by index. */
const CELL_STEP = 3.2;
const CELL_FADE = 14;

const heatFill = (intensity: number): string => {
  if (intensity <= 0) return BRAND.input;
  return courtGreen(0.1 + 0.75 * Math.min(1, intensity));
};

export const CalendarHeatMapMonth: FC<CalendarHeatMapMonthProps> = ({
  intensities,
  startWeekday,
  monthLabel,
  title,
  weekdayLabels,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: the settled map is the message.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = width / CANVAS_W;

  const days = intensities.length;
  const offset = ((Math.round(startWeekday) % 7) + 7) % 7;
  const rowCount = Math.ceil((days + offset) / 7);

  const gridLeft = 54 * unit;
  const gridRight = width - 54 * unit;
  const gridTop = 178 * unit;
  const gap = 10 * unit;
  const cellW = (gridRight - gridLeft - gap * 6) / 7;
  const cellH = Math.min(
    cellW,
    (height - gridTop - 92 * unit - gap * (rowCount - 1)) / Math.max(1, rowCount),
  );

  const booked = intensities.filter((v) => v > 0).length;
  const average =
    days > 0 ? intensities.reduce((s, v) => s + v, 0) / days : 0;

  const lastDelay = CELL_BASE + CELL_STEP * (rowCount - 1 + 6) + CELL_FADE;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(88% 62% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 74%)`,
        }}
      />

      <div style={{ position: "absolute", left: 54 * unit, top: 44 * unit }}>
        <div style={{ ...eyebrowStyle(unit * 1.1) }}>{title}</div>
        <div
          style={{
            marginTop: 10 * unit,
            display: "flex",
            alignItems: "baseline",
            gap: 16 * unit,
          }}
        >
          <span
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 40 * unit,
              fontWeight: 700,
              letterSpacing: -0.035 * 40 * unit,
              color: BRAND.foreground,
            }}
          >
            {monthLabel}
          </span>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 16 * unit,
              color: muted(0.95),
              opacity: interpolateSafe(
                frame,
                [lastDelay - 24, lastDelay - 6],
                [0, 1],
              ),
            }}
          >
            {`${Math.round(
              countTo({
                frame,
                from: 0,
                to: booked,
                delay: CELL_BASE,
                duration: lastDelay - CELL_BASE,
              }),
            )} days with bookings · ${Math.round(average * 100)}% average`}
          </span>
        </div>
      </div>

      {/* Weekday header. */}
      {weekdayLabels.slice(0, 7).map((label, i) => (
        <div
          key={label}
          style={{
            position: "absolute",
            left: gridLeft + (cellW + gap) * i,
            width: cellW,
            top: gridTop - 30 * unit,
            textAlign: "center",
            fontFamily: MONO_FONT,
            fontSize: 11.5 * unit,
            textTransform: "uppercase",
            letterSpacing: 0.14 * 11.5 * unit,
            color: muted(0.75),
            opacity: interpolateSafe(frame, [i * 2, i * 2 + 14], [0, 1]),
          }}
        >
          {label}
        </div>
      ))}

      <Sequence name="Cells" layout="none">
        {intensities.map((intensity, i) => {
          const slot = i + offset;
          const col = slot % 7;
          const row = Math.floor(slot / 7);
          const delay = CELL_BASE + CELL_STEP * (row + col);
          const appear = interpolateSafe(
            frame,
            [delay, delay + CELL_FADE],
            [0, 1],
          );
          const closed = intensity <= 0;
          const packed = intensity >= 0.99;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: gridLeft + (cellW + gap) * col,
                top: gridTop + (cellH + gap) * row,
                width: cellW,
                height: cellH,
                borderRadius: 10 * unit,
                backgroundColor: heatFill(intensity * appear),
                border: `${1 * unit}px solid ${packed ? courtGreen(0.55) : hairline(1)}`,
                boxShadow: packed
                  ? `0 0 ${16 * unit}px ${-4 * unit}px ${courtGreen(0.45 * appear)}`
                  : "none",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "flex-end",
                padding: 7 * unit,
                opacity: interpolateSafe(
                  frame,
                  [delay - 4, delay + 6],
                  [0, 1],
                ),
              }}
            >
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 12 * unit,
                  color: closed
                    ? muted(0.55)
                    : intensity > 0.6
                      ? BRAND.primaryForeground
                      : muted(0.95),
                }}
              >
                {i + 1}
              </span>
            </div>
          );
        })}
      </Sequence>

      {/* Legend — the scale, stated. */}
      <div
        style={{
          position: "absolute",
          left: gridLeft,
          bottom: 34 * unit,
          display: "flex",
          alignItems: "center",
          gap: 8 * unit,
          opacity: interpolateSafe(frame, [lastDelay - 16, lastDelay + 2], [0, 1]),
        }}
      >
        <span
          style={{
            fontFamily: SANS_FONT,
            fontSize: 13 * unit,
            color: muted(0.85),
          }}
        >
          Empty
        </span>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <div
            key={v}
            style={{
              width: 22 * unit,
              height: 12 * unit,
              borderRadius: 4 * unit,
              backgroundColor: heatFill(v),
              border: `${1 * unit}px solid ${hairline(1)}`,
            }}
          />
        ))}
        <span
          style={{
            fontFamily: SANS_FONT,
            fontSize: 13 * unit,
            color: muted(0.85),
          }}
        >
          Fully booked
        </span>
      </div>
    </AbsoluteFill>
  );
};
