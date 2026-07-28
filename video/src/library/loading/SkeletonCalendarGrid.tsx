/**
 * SkeletonCalendarGrid — the placeholder for the availability grid: the
 * day × slot matrix on `VenueAvailabilityPage`, the owner's `WeekCalendar`, and
 * the date picker inside the booking panel on `VenueDetailsPage`.
 *
 * Slot cells carry three states, because the real grid does: free, held and
 * booked. Faking them all as one tone would make the loaded grid look like a
 * different component than the placeholder it replaced.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * The sheen advances by exactly one tile of a `SWEEP_PERIOD`-wide tiled
 * gradient per cycle (a modulo cycle — the identity map) at an intensity of
 * `sin²(πt)`, exactly 0 at both ends. Each cell's own lift is `loopPulse`
 * phased by the frame at which the light front reaches that cell, so the grid
 * ripples column by column and every cell's spring is exactly `0 − 0` at the
 * bottom of its cycle and exactly `1 − 1` once settled.
 */

import type { FC } from "react";
import { AbsoluteFill } from "remotion";

import {
  C,
  CourtBackdrop,
  Eyebrow,
  ShimmerBlock,
  SkeletonPanel,
  Stage,
  cosWave,
  hairline,
  loopPulse,
  primary,
  sheenAxis,
  useLoopClock,
  useSweep,
  wrap,
  type SkeletonTone,
} from "./shared";

export type SkeletonCalendarGridProps = {
  /** Columns — days in the visible window. */
  dayCount: number;
  /** Rows — bookable slots per day. */
  slotCount: number;
  /** Gap between cells, in design-canvas px. */
  cellGap: number;
  /** Corner radius of a slot cell. */
  cellRadius: number;
  /** Caption above the grid. Empty string hides it. */
  label: string;
};

export const skeletonCalendarGridDefaultProps: SkeletonCalendarGridProps = {
  dayCount: 7,
  slotCount: 6,
  cellGap: 10,
  cellRadius: 10,
  label: "Loading availability",
};

const STAGE_W = 1080;
const STAGE_H = 800;
const SWEEP_PERIOD = 1560;
const SWEEP_START = -240;

const CARD_X = 60;
const CARD_Y = 120;
const CARD_W = 960;
const CARD_H = 620;
const PAD = 28;
/** Left gutter for the time-of-day labels. */
const GUTTER = 92;
/** Header strip for the weekday labels. */
const HEADER = 76;

/**
 * A deterministic three-state pattern. Not `Math.random()` — a render is
 * sampled frame by frame, and a random fill would flicker every frame instead
 * of holding still. This hash is a pure function of the cell index, so the grid
 * is identical on every frame and therefore across the loop seam too.
 */
const cellTone = (col: number, row: number): SkeletonTone => {
  const h = (col * 7 + row * 13 + col * row * 3) % 11;
  if (h < 2) {
    return "brand";
  }
  if (h < 4) {
    return "warn";
  }
  return h < 8 ? "soft" : "faint";
};

export const SkeletonCalendarGrid: FC<SkeletonCalendarGridProps> = ({
  dayCount,
  slotCount,
  cellGap,
  cellRadius,
  label,
}) => {
  const clock = useLoopClock();
  const { t, frame, fps, period, reduced } = clock;
  const sweep = useSweep(clock, SWEEP_PERIOD, SWEEP_START);

  const cols = Math.max(1, Math.round(dayCount));
  const rows = Math.max(1, Math.round(slotCount));

  const gridW = CARD_W - PAD * 2 - GUTTER;
  const gridH = CARD_H - PAD * 2 - HEADER;
  const cellW = (gridW - (cols - 1) * cellGap) / cols;
  const cellH = (gridH - (rows - 1) * cellGap) / rows;

  const passFrame = (gx: number, gy: number, w: number, h: number): number =>
    ((sheenAxis(gx + w / 2, gy + h / 2) - SWEEP_START) / SWEEP_PERIOD) * period;

  const liftOf = (gx: number, gy: number, w: number, h: number): number =>
    reduced
      ? 0
      : loopPulse({
          frame,
          fps,
          period,
          phase: wrap(passFrame(gx, gy, w, h) - 7, period),
          rise: 13,
          hold: 22,
          fall: 16,
        });

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.09} vignette={0.48} />

      <AbsoluteFill>
        {label.length > 0 ? (
          <Eyebrow x={CARD_X} y={72} color={primary(0.5 + 0.26 * cosWave(t))}>
            {label}
          </Eyebrow>
        ) : null}

        {/* Month / week stepper, top right. */}
        <ShimmerBlock
          sweep={sweep}
          x={CARD_X + CARD_W - 208}
          y={62}
          w={96}
          h={32}
          r={16}
          tone="soft"
        />
        <ShimmerBlock
          sweep={sweep}
          x={CARD_X + CARD_W - 100}
          y={62}
          w={100}
          h={32}
          r={16}
          tone="soft"
        />

        <SkeletonPanel x={CARD_X} y={CARD_Y} w={CARD_W} h={CARD_H} r={24}>
          {/* Weekday headers. */}
          {Array.from({ length: cols }, (_, c) => (
            <ShimmerBlock
              key={`head-${c}`}
              sweep={sweep}
              ox={CARD_X}
              oy={CARD_Y}
              x={PAD + GUTTER + c * (cellW + cellGap) + cellW / 2 - 26}
              y={PAD + 12}
              w={52}
              h={13}
              r={7}
              tone="faint"
            />
          ))}
          {Array.from({ length: cols }, (_, c) => (
            <ShimmerBlock
              key={`date-${c}`}
              sweep={sweep}
              ox={CARD_X}
              oy={CARD_Y}
              x={PAD + GUTTER + c * (cellW + cellGap) + cellW / 2 - 15}
              y={PAD + 34}
              w={30}
              h={18}
              r={9}
              tone="strong"
            />
          ))}

          {/* Header rule, then the slot matrix. */}
          <div
            style={{
              position: "absolute",
              left: PAD,
              top: PAD + HEADER - 14,
              width: CARD_W - PAD * 2,
              height: 1,
              backgroundColor: hairline(0.85),
            }}
          />

          {/* Time-of-day gutter. */}
          {Array.from({ length: rows }, (_, r) => (
            <ShimmerBlock
              key={`time-${r}`}
              sweep={sweep}
              ox={CARD_X}
              oy={CARD_Y}
              x={PAD}
              y={PAD + HEADER + r * (cellH + cellGap) + cellH / 2 - 6}
              w={62}
              h={12}
              r={6}
              tone="faint"
            />
          ))}

          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const x = PAD + GUTTER + c * (cellW + cellGap);
              const y = PAD + HEADER + r * (cellH + cellGap);
              const lift = liftOf(CARD_X + x, CARD_Y + y, cellW, cellH);
              return (
                <ShimmerBlock
                  key={`cell-${r}-${c}`}
                  sweep={sweep}
                  ox={CARD_X}
                  oy={CARD_Y}
                  x={x}
                  y={y}
                  w={cellW}
                  h={cellH}
                  r={cellRadius}
                  tone={cellTone(c, r)}
                  style={{
                    transform: `translateY(${-2.5 * lift}px)`,
                    boxShadow: `inset 0 0 0 1px ${primary(0.22 * lift)}`,
                  }}
                />
              );
            }),
          )}
        </SkeletonPanel>

        {/* Legend under the card — free / held / booked. */}
        {[
          { x: CARD_X, tone: "soft" as SkeletonTone, w: 96 },
          { x: CARD_X + 152, tone: "warn" as SkeletonTone, w: 84 },
          { x: CARD_X + 292, tone: "brand" as SkeletonTone, w: 104 },
        ].map((item, i) => (
          <div key={i}>
            <div
              style={{
                position: "absolute",
                left: item.x,
                top: CARD_Y + CARD_H + 24,
                width: 14,
                height: 14,
                borderRadius: 4,
                backgroundColor: C.border,
              }}
            />
            <ShimmerBlock
              sweep={sweep}
              x={item.x + 24}
              y={CARD_Y + CARD_H + 27}
              w={item.w}
              h={10}
              r={5}
              tone={item.tone}
            />
          </div>
        ))}
      </AbsoluteFill>
    </Stage>
  );
};
