/**
 * ChartHoursStacked — booked hours against bookable hours per weekday, the
 * chart behind the occupancy figure on /owner/analytics and /owner/schedule.
 * One-way: each column's booked segment grows from the baseline under a
 * staggered monotonic draw, and the totals land exactly.
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
  amber,
  countProgress,
  countTo,
  courtGreen,
  eyebrowStyle,
  hairline,
  interpolateSafe,
  muted,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS_W = 1280;

export type WeekdayHours = {
  /** Short weekday label. */
  day: string;
  /** Hours actually booked. */
  booked: number;
  /** Hours the venue was open and bookable. */
  bookable: number;
};

export type ChartHoursStackedProps = {
  /** One entry per weekday, Monday first. Prop-driven, never generated. */
  days: WeekdayHours[];
  /** Mono caps heading. */
  title: string;
  /** Legend text for the filled segment. */
  bookedLabel: string;
  /** Legend text for the remainder. */
  idleLabel: string;
};

export const chartHoursStackedDefaultProps: ChartHoursStackedProps = {
  days: [
    { day: "Mon", booked: 4, bookable: 6 },
    { day: "Tue", booked: 4, bookable: 6 },
    { day: "Wed", booked: 3, bookable: 6 },
    { day: "Thu", booked: 4, bookable: 6 },
    { day: "Fri", booked: 5, bookable: 6 },
    { day: "Sat", booked: 6, bookable: 6 },
    { day: "Sun", booked: 5, bookable: 6 },
  ],
  title: "Hours booked, this week",
  bookedLabel: "Booked",
  idleLabel: "Still open",
};

const COL_BASE = 14;
const COL_STEP = 6;
const COL_DURATION = 48;

export const ChartHoursStacked: FC<ChartHoursStackedProps> = ({
  days,
  title,
  bookedLabel,
  idleLabel,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: the settled week is the message.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = width / CANVAS_W;

  const rows = days.length > 0 ? days : [{ day: "—", booked: 0, bookable: 1 }];
  const ceiling = rows.reduce((m, d) => Math.max(m, d.bookable), 1);
  const totalBooked = rows.reduce((s, d) => s + Math.max(0, d.booked), 0);
  const totalBookable = rows.reduce((s, d) => s + Math.max(0, d.bookable), 0);

  const plotLeft = 88 * unit;
  const plotRight = width - 300 * unit;
  const plotTop = height * 0.28;
  const plotBottom = height * 0.8;
  const plotHeight = plotBottom - plotTop;
  const slot = (plotRight - plotLeft) / rows.length;
  const colWidth = slot * 0.56;

  const lastSettle = COL_BASE + COL_STEP * (rows.length - 1) + COL_DURATION;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(86% 74% at 40% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 74%)`,
        }}
      />

      <div style={{ position: "absolute", left: 54 * unit, top: 44 * unit }}>
        <div style={{ ...eyebrowStyle(unit * 1.15) }}>{title}</div>
      </div>

      {/* Legend. */}
      <div
        style={{
          position: "absolute",
          left: 54 * unit,
          top: 82 * unit,
          display: "flex",
          gap: 22 * unit,
          alignItems: "center",
          opacity: interpolateSafe(frame, [4, 22], [0, 1]),
        }}
      >
        {[
          { label: bookedLabel, color: BRAND.primary },
          { label: idleLabel, color: BRAND.surface3 },
        ].map((item) => (
          <div
            key={item.label}
            style={{ display: "flex", alignItems: "center", gap: 8 * unit }}
          >
            <div
              style={{
                width: 12 * unit,
                height: 12 * unit,
                borderRadius: 4 * unit,
                backgroundColor: item.color,
                border: `${1 * unit}px solid ${hairline(1)}`,
              }}
            />
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 14.5 * unit,
                color: muted(0.95),
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <Sequence name="Columns" layout="none">
        <div
          style={{
            position: "absolute",
            left: plotLeft,
            width: plotRight - plotLeft,
            top: plotBottom,
            height: 1 * unit,
            backgroundColor: hairline(1),
          }}
        />

        {rows.map((row, i) => {
          const delay = COL_BASE + i * COL_STEP;
          const grow = countProgress({ frame, delay, duration: COL_DURATION });
          const x = plotLeft + slot * i + (slot - colWidth) / 2;
          const capacity = Math.max(0, row.bookable);
          const booked = Math.max(0, Math.min(row.booked, capacity));
          const capH = (capacity / ceiling) * plotHeight;
          const bookedH = (booked / ceiling) * plotHeight * grow;
          const full = capacity > 0 && booked === capacity;

          return (
            <div key={row.day}>
              {/* Capacity column — the bookable hours, present from the start. */}
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: plotBottom - capH,
                  width: colWidth,
                  height: capH,
                  borderRadius: 10 * unit,
                  backgroundColor: BRAND.surface3,
                  border: `${1 * unit}px solid ${hairline(1)}`,
                  opacity: interpolateSafe(frame, [i * 2, i * 2 + 16], [0, 1]),
                }}
              />
              {/* Booked segment, growing inside it. */}
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: plotBottom - bookedH,
                  width: colWidth,
                  height: bookedH,
                  borderRadius: 10 * unit,
                  background: full
                    ? `linear-gradient(180deg, ${BRAND.primary}, ${courtGreen(0.5)})`
                    : `linear-gradient(180deg, ${courtGreen(0.8)}, ${courtGreen(0.32)})`,
                  boxShadow: full
                    ? `0 0 ${20 * unit}px ${-5 * unit}px ${courtGreen(0.5)}`
                    : "none",
                }}
              />
              {/* A "full day" marker, because a sold-out Saturday is the
                  single most useful thing on this chart. */}
              {full ? (
                <div
                  style={{
                    position: "absolute",
                    left: x,
                    width: colWidth,
                    top: plotBottom - capH - 26 * unit,
                    textAlign: "center",
                    fontFamily: MONO_FONT,
                    fontSize: 11 * unit,
                    textTransform: "uppercase",
                    letterSpacing: 0.14 * 11 * unit,
                    color: amber(0.95),
                    opacity: interpolateSafe(
                      frame,
                      [delay + COL_DURATION - 10, delay + COL_DURATION + 4],
                      [0, 1],
                    ),
                  }}
                >
                  full
                </div>
              ) : null}
              <div
                style={{
                  position: "absolute",
                  left: plotLeft + slot * i,
                  width: slot,
                  top: plotBottom + 16 * unit,
                  textAlign: "center",
                  fontFamily: SANS_FONT,
                  fontSize: 15 * unit,
                  color: muted(0.9),
                  opacity: interpolateSafe(frame, [delay, delay + 14], [0, 1]),
                }}
              >
                {row.day}
              </div>
            </div>
          );
        })}
      </Sequence>

      {/* Week summary, on the right. */}
      <div
        style={{
          position: "absolute",
          right: 54 * unit,
          top: height * 0.32,
          width: 212 * unit,
          opacity: interpolateSafe(frame, [lastSettle - 26, lastSettle - 4], [0, 1]),
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 52 * unit,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: -0.035 * 52 * unit,
            color: BRAND.foreground,
          }}
        >
          {Math.round(
            countTo({
              frame,
              from: 0,
              to: totalBooked,
              delay: COL_BASE,
              duration: COL_DURATION + COL_STEP * (rows.length - 1),
            }),
          )}
          <span style={{ fontSize: 26 * unit, color: muted(0.8) }}>
            {` / ${totalBookable}`}
          </span>
        </div>
        <div
          style={{
            marginTop: 8 * unit,
            fontFamily: SANS_FONT,
            fontSize: 15.5 * unit,
            lineHeight: 1.5,
            color: muted(0.95),
          }}
        >
          hours booked this week. The rest are still open — every one you fill
          is yours in full.
        </div>
      </div>
    </AbsoluteFill>
  );
};
