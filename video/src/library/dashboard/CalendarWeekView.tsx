/**
 * CalendarWeekView — the owner dashboard's `WeekCalendar`: Monday-first week,
 * one column per day, the bookable hours down the side, booking blocks in the
 * grid.
 * One-way: the grid rules draw in, then blocks settle column by column. Both
 * the week's booked-hour count and its takings land exactly.
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
  eyebrowStyle,
  hairline,
  interpolateSafe,
  muted,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS_W = 1280;

export type WeekBlock = {
  /** 0 = Monday, matching `startOfWeek(..., { weekStartsOn: 1 })`. */
  day: number;
  /** Start hour, 24h. Clamped into the visible band. */
  startHour: number;
  /** Length in hours. */
  durationHours: number;
  /** Short label inside the block. */
  label: string;
  /** What the owner receives for it, in dram. */
  amount: number;
};

export type CalendarWeekViewProps = {
  /** The week's bookings. Prop-driven. */
  blocks: WeekBlock[];
  /** First hour shown. `WeekCalendar` starts at 6. */
  firstHour: number;
  /** Last hour shown (exclusive end of the final row). */
  lastHour: number;
  /** Resource the grid belongs to. */
  resourceName: string;
  /** Week label in the header. */
  weekLabel: string;
  /** Weekday headers, Monday first. */
  dayLabels: string[];
};

export const calendarWeekViewDefaultProps: CalendarWeekViewProps = {
  blocks: [
    { day: 0, startHour: 19, durationHours: 1, label: "Court 1", amount: 12000 },
    { day: 1, startHour: 18, durationHours: 2, label: "Court 2", amount: 24000 },
    { day: 2, startHour: 20, durationHours: 1, label: "Court 1", amount: 12000 },
    { day: 3, startHour: 19, durationHours: 1, label: "Court 2", amount: 12000 },
    { day: 4, startHour: 18, durationHours: 3, label: "Court 1", amount: 45000 },
    { day: 5, startHour: 10, durationHours: 2, label: "Court 1", amount: 32000 },
    { day: 5, startHour: 17, durationHours: 3, label: "Court 2", amount: 48000 },
    { day: 6, startHour: 11, durationHours: 2, label: "Court 1", amount: 30000 },
  ],
  firstHour: 8,
  lastHour: 22,
  resourceName: "Ararat Arena",
  weekLabel: "20 – 26 July",
  dayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

const GRID_AT = 6;
const GRID_FRAMES = 34;
const BLOCK_BASE = 34;
const BLOCK_STEP = 7;
const BLOCK_FRAMES = 26;

export const CalendarWeekView: FC<CalendarWeekViewProps> = ({
  blocks,
  firstHour,
  lastHour,
  resourceName,
  weekLabel,
  dayLabels,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: the settled week is the message.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = width / CANVAS_W;

  const from = Math.min(firstHour, lastHour);
  const to = Math.max(firstHour, lastHour);
  const hourCount = Math.max(1, to - from);

  const gutter = 92 * unit;
  const gridLeft = 54 * unit + gutter;
  const gridRight = width - 54 * unit;
  const gridTop = 152 * unit;
  const gridBottom = height - 56 * unit;
  const colW = (gridRight - gridLeft) / 7;
  const rowH = (gridBottom - gridTop) / hourCount;

  const totalHours = blocks.reduce(
    (s, b) => s + Math.max(0, b.durationHours),
    0,
  );
  const totalAmount = blocks.reduce((s, b) => s + Math.max(0, b.amount), 0);
  const lastBlockSettle = BLOCK_BASE + BLOCK_STEP * 6 + BLOCK_FRAMES;

  const gridDraw = countProgress({
    frame,
    delay: GRID_AT,
    duration: GRID_FRAMES,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(88% 60% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 76%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 54 * unit,
          top: 40 * unit,
          right: 54 * unit,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ ...eyebrowStyle(unit * 1.05) }}>{resourceName}</div>
          <div
            style={{
              marginTop: 8 * unit,
              fontFamily: DISPLAY_FONT,
              fontSize: 32 * unit,
              fontWeight: 700,
              letterSpacing: -0.03 * 32 * unit,
              color: BRAND.foreground,
            }}
          >
            {weekLabel}
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            opacity: interpolateSafe(
              frame,
              [lastBlockSettle - 24, lastBlockSettle - 4],
              [0, 1],
            ),
          }}
        >
          <div
            style={{
              fontFamily: MONO_FONT,
              fontVariantNumeric: "tabular-nums",
              fontSize: 30 * unit,
              fontWeight: 500,
              color: BRAND.primary,
            }}
          >
            {dram(
              countTo({
                frame,
                from: 0,
                to: totalAmount,
                delay: BLOCK_BASE,
                duration: BLOCK_STEP * 6 + BLOCK_FRAMES,
              }),
            )}
          </div>
          <div
            style={{
              marginTop: 4 * unit,
              fontFamily: SANS_FONT,
              fontSize: 14.5 * unit,
              color: muted(0.9),
            }}
          >
            {`${totalHours} booked hours this week`}
          </div>
        </div>
      </div>

      {/* Day headers. */}
      {dayLabels.slice(0, 7).map((label, i) => (
        <div
          key={label}
          style={{
            position: "absolute",
            left: gridLeft + colW * i,
            width: colW,
            top: gridTop - 32 * unit,
            textAlign: "center",
            fontFamily: MONO_FONT,
            fontSize: 12 * unit,
            textTransform: "uppercase",
            letterSpacing: 0.14 * 12 * unit,
            color: i >= 5 ? BRAND.primary : muted(0.8),
            opacity: interpolateSafe(frame, [i * 2, i * 2 + 14], [0, 1]),
          }}
        >
          {label}
        </div>
      ))}

      <Sequence name="Grid" layout="none">
        {/* Hour rules and the gutter labels beside them. */}
        {Array.from({ length: hourCount + 1 }, (_, i) => (
          <div key={`h${i}`}>
            <div
              style={{
                position: "absolute",
                left: gridLeft,
                top: gridTop + rowH * i,
                width: (gridRight - gridLeft) * gridDraw,
                height: 1 * unit,
                backgroundColor: i === 0 || i === hourCount ? hairline(1) : hairline(0.5),
              }}
            />
            {i < hourCount ? (
              <div
                style={{
                  position: "absolute",
                  left: 54 * unit,
                  width: gutter - 14 * unit,
                  top: gridTop + rowH * i + 6 * unit,
                  textAlign: "right",
                  fontFamily: MONO_FONT,
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 12.5 * unit,
                  color: muted(0.7),
                  opacity: gridDraw,
                }}
              >
                {`${from + i < 10 ? "0" : ""}${from + i}:00`}
              </div>
            ) : null}
          </div>
        ))}

        {/* Day separators. */}
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={`v${i}`}
            style={{
              position: "absolute",
              left: gridLeft + colW * i,
              top: gridTop,
              width: 1 * unit,
              height: (gridBottom - gridTop) * gridDraw,
              backgroundColor: i === 0 || i === 7 ? hairline(1) : hairline(0.45),
            }}
          />
        ))}
      </Sequence>

      <Sequence name="Blocks" layout="none">
        {blocks.map((block, i) => {
          const col = Math.max(0, Math.min(6, Math.round(block.day)));
          const start = Math.max(from, Math.min(to, block.startHour));
          const end = Math.max(start, Math.min(to, start + block.durationHours));
          const delay = BLOCK_BASE + col * BLOCK_STEP;
          const grow = countProgress({ frame, delay, duration: BLOCK_FRAMES });
          const top = gridTop + (start - from) * rowH;
          const full = (end - start) * rowH;

          return (
            <div
              key={`${block.day}-${block.startHour}-${i}`}
              style={{
                position: "absolute",
                left: gridLeft + colW * col + 4 * unit,
                top,
                width: colW - 8 * unit,
                height: full * grow,
                borderRadius: 9 * unit,
                overflow: "hidden",
                background: `linear-gradient(180deg, ${courtGreen(0.34)}, ${courtGreen(0.16)})`,
                border: `${1 * unit}px solid ${courtGreen(0.45)}`,
                boxShadow: `0 ${4 * unit}px ${12 * unit}px ${-4 * unit}px ${courtGreen(0.3)}`,
                padding: `${7 * unit}px ${9 * unit}px`,
                opacity: interpolateSafe(frame, [delay, delay + 8], [0, 1]),
              }}
            >
              <div
                style={{
                  fontFamily: SANS_FONT,
                  fontSize: 13.5 * unit,
                  fontWeight: 600,
                  color: BRAND.foreground,
                  whiteSpace: "nowrap",
                }}
              >
                {block.label}
              </div>
              <div
                style={{
                  marginTop: 3 * unit,
                  fontFamily: MONO_FONT,
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 12 * unit,
                  color: BRAND.primary,
                  whiteSpace: "nowrap",
                }}
              >
                {dram(block.amount)}
              </div>
            </div>
          );
        })}
      </Sequence>
    </AbsoluteFill>
  );
};
