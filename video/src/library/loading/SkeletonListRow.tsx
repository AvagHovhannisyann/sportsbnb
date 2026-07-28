/**
 * SkeletonListRow — the placeholder for a stack of booking rows. This is what
 * `MyBookingsPage` and `owner/OwnerBookingsPage` show while the bookings query
 * is in flight: thumbnail, venue name, date/time line, and a status pill and
 * price on the right.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * One driver: the sheen is a tiled gradient of exactly `SWEEP_PERIOD` px whose
 * background position advances by exactly one tile per cycle — a modulo cycle,
 * so the wrap is an ordinary step. Its intensity is `sin²(πt)`, exactly 0 at
 * both ends. Row lift is `loopPulse`, exactly `0 − 0` at the bottom of its
 * cycle and exactly `1 − 1` once settled, and each row is phased by the frame
 * at which the light front reaches it, so the rows ripple downward without any
 * of them starting a one-way animation.
 */

import type { FC } from "react";
import { AbsoluteFill } from "remotion";

import {
  CourtBackdrop,
  Eyebrow,
  ShimmerBlock,
  SkeletonPanel,
  Stage,
  cosWave,
  loopPulse,
  primary,
  sheenAxis,
  useLoopClock,
  useSweep,
  wrap,
} from "./shared";

export type SkeletonListRowProps = {
  /** How many rows are stacked. */
  rowCount: number;
  /** Height of one row, in design-canvas px. */
  rowHeight: number;
  /** Vertical gap between rows. */
  rowGap: number;
  /** Draw the leading square thumbnail. */
  showThumbnail: boolean;
  /** Caption above the stack. Empty string hides it. */
  label: string;
};

export const skeletonListRowDefaultProps: SkeletonListRowProps = {
  rowCount: 4,
  rowHeight: 108,
  rowGap: 18,
  showThumbnail: true,
  label: "Loading your bookings",
};

const STAGE_W = 1200;
const STAGE_H = 700;
const SWEEP_PERIOD = 1720;
const SWEEP_START = -260;

const LIST_X = 90;
const LIST_W = 1020;
const LIST_TOP = 132;

export const SkeletonListRow: FC<SkeletonListRowProps> = ({
  rowCount,
  rowHeight,
  rowGap,
  showThumbnail,
  label,
}) => {
  const clock = useLoopClock();
  const { t, frame, fps, period, reduced } = clock;
  const sweep = useSweep(clock, SWEEP_PERIOD, SWEEP_START);

  const rows = Math.max(1, Math.round(rowCount));

  const passFrame = (gx: number, gy: number, w: number, h: number): number =>
    ((sheenAxis(gx + w / 2, gy + h / 2) - SWEEP_START) / SWEEP_PERIOD) * period;

  const liftOf = (gx: number, gy: number, w: number, h: number): number =>
    reduced
      ? 0
      : loopPulse({
          frame,
          fps,
          period,
          phase: wrap(passFrame(gx, gy, w, h) - 8, period),
          rise: 15,
          hold: 26,
          fall: 18,
        });

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.09} vignette={0.5} />

      <AbsoluteFill>
        {label.length > 0 ? (
          <Eyebrow x={LIST_X} y={82} color={primary(0.5 + 0.26 * cosWave(t))}>
            {label}
          </Eyebrow>
        ) : null}

        {Array.from({ length: rows }, (_, i) => {
          const y = LIST_TOP + i * (rowHeight + rowGap);
          const lift = liftOf(LIST_X, y, LIST_W, rowHeight);
          const padX = 18;
          const thumbW = showThumbnail ? rowHeight - padX * 2 + 22 : 0;
          const textX = padX + (showThumbnail ? thumbW + 22 : 0);

          return (
            <SkeletonPanel
              key={i}
              x={LIST_X}
              y={y}
              w={LIST_W}
              h={rowHeight}
              r={18}
              lift={lift}
            >
              {showThumbnail ? (
                <ShimmerBlock
                  sweep={sweep}
                  ox={LIST_X}
                  oy={y}
                  x={padX}
                  y={padX}
                  w={thumbW}
                  h={rowHeight - padX * 2}
                  r={12}
                  tone="strong"
                />
              ) : null}

              {/* Venue name. */}
              <ShimmerBlock
                sweep={sweep}
                ox={LIST_X}
                oy={y}
                x={textX}
                y={rowHeight * 0.24}
                w={268}
                h={16}
                r={8}
                tone="strong"
              />
              {/* Date · time · pitch line. */}
              <ShimmerBlock
                sweep={sweep}
                ox={LIST_X}
                oy={y}
                x={textX}
                y={rowHeight * 0.52}
                w={196}
                h={12}
                r={6}
                tone="soft"
              />
              <ShimmerBlock
                sweep={sweep}
                ox={LIST_X}
                oy={y}
                x={textX + 212}
                y={rowHeight * 0.52}
                w={104}
                h={12}
                r={6}
                tone="faint"
              />

              {/* Status pill, then price — the right-hand cluster. */}
              <ShimmerBlock
                sweep={sweep}
                ox={LIST_X}
                oy={y}
                x={LIST_W - padX - 268}
                y={rowHeight / 2 - 15}
                w={112}
                h={30}
                r={15}
                tone={i % 3 === 1 ? "warn" : "brand"}
              />
              <ShimmerBlock
                sweep={sweep}
                ox={LIST_X}
                oy={y}
                x={LIST_W - padX - 132}
                y={rowHeight / 2 - 11}
                w={132}
                h={22}
                r={11}
                tone="soft"
              />
            </SkeletonPanel>
          );
        })}
      </AbsoluteFill>
    </Stage>
  );
};
