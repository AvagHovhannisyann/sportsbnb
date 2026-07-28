/**
 * SkeletonVenueCard — the placeholder for one `VenueCard`, as rendered in the
 * `DiscoverPage` results grid and the "nearby" rail on `HomePage`. Geometry
 * mirrors the real card one-for-one: a 3:2 image box, title at 3/5 width,
 * subtitle at 2/5, amenity chips, then price and rating on one row. A skeleton
 * whose geometry differs from the card it stands in for only relocates the
 * layout shift instead of removing it.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * The sheen is a tiled gradient of exactly `SWEEP_PERIOD` px whose background
 * position advances by exactly one tile over the cycle. Shifting a tiled image
 * by exactly one tile is the identity map, so the wrap is an ordinary step, not
 * a snap. On top of that its intensity is `sin²(πt)`, exactly 0 at both ends —
 * belt and braces. The per-bar lift is `loopPulse`, exactly 0 at both ends of
 * its own cycle, phased by *when the light front actually reaches that bar*
 * rather than by an arbitrary index ramp.
 */

import type { FC } from "react";
import { AbsoluteFill, interpolate } from "remotion";

import {
  C,
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

export type SkeletonVenueCardProps = {
  /** Fraction of the card's inner width the title bar takes. */
  titleRatio: number;
  /** Fraction of the inner width the subtitle bar takes. */
  subtitleRatio: number;
  /** Amenity chips under the subtitle. */
  amenityCount: number;
  /** Draw the rating bar opposite the price. */
  showRating: boolean;
  /** Caption above the card. Empty string hides it. */
  label: string;
};

export const skeletonVenueCardDefaultProps: SkeletonVenueCardProps = {
  titleRatio: 0.6,
  subtitleRatio: 0.4,
  amenityCount: 3,
  showRating: true,
  label: "Loading venues",
};

const STAGE_W = 760;
const STAGE_H = 900;

/** One sweep period, in canvas px. Comfortably wider than the stage. */
const SWEEP_PERIOD = 1220;
/** Where the light front sits at t = 0: off-canvas left. */
const SWEEP_START = -220;

const CARD_X = 80;
const CARD_Y = 118;
const CARD_W = 600;
const CARD_H = 668;
const PAD = 28;
const INNER = CARD_W - PAD * 2;
/** aspect-[3/2] — the real card's image box. */
const IMAGE_H = Math.round(CARD_W / 1.5);

export const SkeletonVenueCard: FC<SkeletonVenueCardProps> = ({
  titleRatio,
  subtitleRatio,
  amenityCount,
  showRating,
  label,
}) => {
  const clock = useLoopClock();
  const { t, frame, fps, period } = clock;
  const sweep = useSweep(clock, SWEEP_PERIOD, SWEEP_START);

  /**
   * The frame at which the light front crosses a box's centre. `wave` runs
   * linearly across the cycle, so inverting it is a straight ratio. This is the
   * stagger: a wave of springs rolling diagonally, led by the sheen.
   */
  const passFrame = (x: number, y: number, w: number, h: number): number =>
    ((sheenAxis(CARD_X + x + w / 2, CARD_Y + y + h / 2) - SWEEP_START) / SWEEP_PERIOD) *
    period;

  const liftOf = (x: number, y: number, w: number, h: number): number =>
    clock.reduced
      ? 0
      : loopPulse({
          frame,
          fps,
          period,
          phase: wrap(passFrame(x, y, w, h) - 8, period),
          rise: 14,
          hold: 24,
          fall: 18,
        });

  const chips = Array.from({ length: Math.max(0, Math.round(amenityCount)) }, (_, i) => ({
    x: PAD + i * 96,
    w: 84,
  }));

  const cardLift = liftOf(0, 0, CARD_W, CARD_H);

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.1} vignette={0.5} />

      <AbsoluteFill>
        {label.length > 0 ? (
          <Eyebrow x={CARD_X} y={70} color={primary(0.5 + 0.26 * cosWave(t))}>
            {label}
          </Eyebrow>
        ) : null}

        <SkeletonPanel x={CARD_X} y={CARD_Y} w={CARD_W} h={CARD_H} r={24} lift={cardLift}>
          {/* Image box. Full-bleed to the card edge, exactly as VenueCard. */}
          <ShimmerBlock
            sweep={sweep}
            ox={CARD_X}
            oy={CARD_Y}
            x={0}
            y={0}
            w={CARD_W}
            h={IMAGE_H}
            r={0}
            tone="strong"
          />
          {/* The favourite button that sits over the photo. */}
          <ShimmerBlock
            sweep={sweep}
            ox={CARD_X}
            oy={CARD_Y}
            x={CARD_W - 62}
            y={22}
            w={40}
            h={40}
            r={20}
            tone="soft"
            opacity={0.9}
          />

          <ShimmerBlock
            sweep={sweep}
            ox={CARD_X}
            oy={CARD_Y}
            x={PAD}
            y={IMAGE_H + 30}
            w={Math.round(INNER * titleRatio)}
            h={22}
            r={11}
            tone="strong"
            style={{ transform: `translateY(${interpolate(liftOf(PAD, IMAGE_H + 30, INNER * titleRatio, 22), [0, 1], [0, -3])}px)` }}
          />
          <ShimmerBlock
            sweep={sweep}
            ox={CARD_X}
            oy={CARD_Y}
            x={PAD}
            y={IMAGE_H + 66}
            w={Math.round(INNER * subtitleRatio)}
            h={16}
            r={8}
            tone="soft"
            style={{ transform: `translateY(${interpolate(liftOf(PAD, IMAGE_H + 66, INNER * subtitleRatio, 16), [0, 1], [0, -3])}px)` }}
          />

          {chips.map((chip, i) => (
            <ShimmerBlock
              key={i}
              sweep={sweep}
              ox={CARD_X}
              oy={CARD_Y}
              x={chip.x}
              y={IMAGE_H + 106}
              w={chip.w}
              h={30}
              r={15}
              tone="soft"
              style={{ transform: `translateY(${interpolate(liftOf(chip.x, IMAGE_H + 106, chip.w, 30), [0, 1], [0, -3])}px)` }}
            />
          ))}

          <div
            style={{
              position: "absolute",
              left: PAD,
              top: IMAGE_H + 158,
              width: INNER,
              height: 1,
              backgroundColor: C.border,
            }}
          />

          <ShimmerBlock
            sweep={sweep}
            ox={CARD_X}
            oy={CARD_Y}
            x={PAD}
            y={IMAGE_H + 182}
            w={132}
            h={24}
            r={12}
            tone="brand"
            style={{ transform: `translateY(${interpolate(liftOf(PAD, IMAGE_H + 182, 132, 24), [0, 1], [0, -3])}px)` }}
          />
          {showRating ? (
            <ShimmerBlock
              sweep={sweep}
              ox={CARD_X}
              oy={CARD_Y}
              x={PAD + INNER - 72}
              y={IMAGE_H + 186}
              w={72}
              h={16}
              r={8}
              tone="soft"
            />
          ) : null}
        </SkeletonPanel>
      </AbsoluteFill>
    </Stage>
  );
};
