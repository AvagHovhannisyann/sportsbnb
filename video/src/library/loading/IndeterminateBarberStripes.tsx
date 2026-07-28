/**
 * IndeterminateBarberStripes — the striped "working, duration unknown" bar.
 * Used where the wait is genuinely open-ended and a percentage would be a lie:
 * the Google Calendar two-way sync on `owner/OwnerIntegrationsPage`, the payout
 * run in `admin/PayoutsTab`, and the bulk price update on
 * `owner/OwnerPricingPage`.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * The stripes are a `repeating-linear-gradient` with an explicit
 * `background-size` of exactly one stripe period, and the background position
 * advances by exactly one period across the cycle. Shifting a tiled image by
 * exactly one tile is the identity map, so frame 0 and the final frame are
 * bit-identical — the stripe that leaves is the stripe that arrives.
 *
 * This is the detail Tailwind's stock `shimmer` keyframe gets wrong: it moves
 * `background-position` from `-200% 0` to `200% 0`, a 400% shift against an
 * unspecified size, which does not close. Every stock use of it in this app
 * seams once per iteration.
 *
 * On top of the stripes, the container breathes on `cosWave` (a full cosine
 * period) and the status dot pulses with `loopPulse`, exactly `0 − 0` at the
 * bottom of its cycle and exactly `1 − 1` once settled.
 */

import type { FC } from "react";
import { AbsoluteFill } from "remotion";

import {
  C,
  CourtBackdrop,
  Eyebrow,
  MONO_FONT,
  SANS_FONT,
  Stage,
  chalk,
  cosWave,
  hairline,
  ink,
  loopPulse,
  primary,
  useLoopClock,
} from "./shared";

export type IndeterminateBarberStripesProps = {
  /** Bar height, in design-canvas px. */
  barHeight: number;
  /** One stripe period along the x axis, in canvas px. */
  stripePeriod: number;
  /** Stripe angle, in degrees. 45 is the classic barber pole. */
  stripeAngle: number;
  /** Headline above the bar. */
  title: string;
  /** Sub-line under the bar. */
  detail: string;
  /** Travel direction: 1 runs right, −1 runs left. */
  direction: number;
};

export const indeterminateBarberStripesDefaultProps: IndeterminateBarberStripesProps =
  {
    barHeight: 26,
    stripePeriod: 44,
    stripeAngle: 45,
    title: "Syncing your calendar",
    detail: "This can take a few minutes for a busy venue",
    direction: 1,
  };

const STAGE_W = 1000;
const STAGE_H = 440;
const BAR_X = 90;
const BAR_W = 820;

export const IndeterminateBarberStripes: FC<IndeterminateBarberStripesProps> = ({
  barHeight,
  stripePeriod,
  stripeAngle,
  title,
  detail,
  direction,
}) => {
  const { t, frame, fps, period, reduced } = useLoopClock();

  const breath = cosWave(t);
  const dir = direction >= 0 ? 1 : -1;
  const barY = 230;

  const dot = reduced
    ? 0
    : loopPulse({ frame, fps, period, rise: 12, hold: 20, fall: 14 });

  /**
   * Two stripe stacks: a wide soft one and a narrow bright one at twice the
   * frequency. Both are exact multiples of `stripePeriod`, so both close on the
   * same cycle and the pair reads as one texture rather than as a beat.
   */
  const stripes = `repeating-linear-gradient(${stripeAngle}deg, ${chalk(0.16)} 0px, ${chalk(0.16)} ${stripePeriod * 0.34}px, ${chalk(0)} ${stripePeriod * 0.34}px, ${chalk(0)} ${stripePeriod}px)`;

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.1} vignette={0.45} />

      <AbsoluteFill>
        <Eyebrow x={BAR_X} y={110} color={primary(0.5 + 0.26 * breath)}>
          Working
        </Eyebrow>

        <div
          style={{
            position: "absolute",
            left: BAR_X,
            top: 140,
            width: BAR_W,
            fontFamily: SANS_FONT,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: C.foreground,
          }}
        >
          {title}
        </div>

        {/* Live dot, mirroring the design system's `.live-dot`. */}
        <div
          style={{
            position: "absolute",
            left: BAR_X + BAR_W - 12,
            top: 152,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: C.primary,
            opacity: 0.5 * Math.max(0, 1 - dot),
            transform: `scale(${1 + 2 * dot})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: BAR_X + BAR_W - 12,
            top: 152,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: C.primary,
            opacity: 0.72 + 0.28 * breath,
          }}
        />

        {/* The bar. */}
        <div
          style={{
            position: "absolute",
            left: BAR_X,
            top: barY,
            width: BAR_W,
            height: barHeight,
            borderRadius: barHeight / 2,
            backgroundColor: C.primarySoft,
            border: `1px solid ${hairline(1)}`,
            boxShadow: `inset 0 2px 6px ${ink(0.5)}`,
            overflow: "hidden",
          }}
        >
          {/* Base wash, so the stripes have something to cut through. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(90deg, ${primary(0.55)} 0%, ${primary(0.85)} 50%, ${primary(0.55)} 100%)`,
              opacity: 0.55 + 0.15 * breath,
            }}
          />

          {/* Stripes. Exactly one period of travel per cycle. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: stripes,
              backgroundSize: `${stripePeriod}px ${stripePeriod}px`,
              backgroundRepeat: "repeat",
              backgroundPosition: `${dir * t * stripePeriod}px 0px`,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `repeating-linear-gradient(${stripeAngle}deg, ${chalk(0.1)} 0px, ${chalk(0.1)} ${stripePeriod * 0.14}px, ${chalk(0)} ${stripePeriod * 0.14}px, ${chalk(0)} ${stripePeriod * 0.5}px)`,
              backgroundSize: `${stripePeriod * 0.5}px ${stripePeriod * 0.5}px`,
              backgroundRepeat: "repeat",
              /* Half the tile, so it still closes on the same cycle. */
              backgroundPosition: `${-dir * t * stripePeriod * 0.5}px 0px`,
              opacity: 0.8,
            }}
          />

          {/* Top inner highlight — the `.glass` 1px rule. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: BAR_W,
              height: 1,
              backgroundColor: chalk(0.22),
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            left: BAR_X,
            top: barY + barHeight + 24,
            width: BAR_W,
            fontFamily: SANS_FONT,
            fontSize: 16,
            color: C.mutedForeground,
          }}
        >
          {detail}
        </div>

        <div
          style={{
            position: "absolute",
            left: BAR_X,
            top: barY + barHeight + 24,
            width: BAR_W,
            textAlign: "right",
            fontFamily: MONO_FONT,
            fontSize: 13,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: C.foregroundSoft,
          }}
        >
          Do not close
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
