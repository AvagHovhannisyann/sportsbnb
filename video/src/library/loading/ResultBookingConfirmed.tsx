/**
 * ResultBookingConfirmed — the success state of the payment result page: the
 * screen the checkout flow lands on once the charge clears and the slot is
 * written, and the same mark `MyBookingsPage` shows on a freshly confirmed row.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * A result animation is a one-shot in the product, so looping it needs the
 * reveal to *close*. `reveal` is `loopPulse` with a long hold: exactly `0 − 0`
 * at frame 0, exactly `1 − 1` for every frame from `hold + fall + 1` to the end
 * of the cycle. Both ends are exactly zero, which makes the whole card exactly
 * invisible at frame 0 and at the final frame.
 *
 * That is what licences the one thing here that is genuinely one-way: the tick
 * is drawn by a `strokeDashoffset` spring, which is 0 at frame 0 and 1 at the
 * final frame. It is *unobservable*, because at both of those frames the tick's
 * opacity is exactly 0 — an invisible element contributes no pixel, so where
 * its dash offset has got to cannot show. This is the same guarantee
 * `BrandLoader` uses for its expanding court ripples. The sparks and the card
 * bloom are gated by the same envelope.
 */

import type { FC } from "react";
import { AbsoluteFill, interpolate, spring } from "remotion";

import {
  C,
  CourtBackdrop,
  Eyebrow,
  MONO_FONT,
  SANS_FONT,
  SPRING_SETTLE,
  Stage,
  TAU,
  chalk,
  hairline,
  ink,
  loopPulse,
  primary,
  useLoopClock,
} from "./shared";

export type ResultBookingConfirmedProps = {
  /** Headline. */
  title: string;
  /** Supporting line. */
  body: string;
  /** Booking reference, set in mono like every code in the app. */
  reference: string;
  /** The confirmed slot, shown on the summary row. */
  slot: string;
  /** Radiating sparks at the moment the tick lands. 0 disables them. */
  sparkCount: number;
  /** Diameter of the success badge, in design-canvas px. */
  badgeSize: number;
};

export const resultBookingConfirmedDefaultProps: ResultBookingConfirmedProps = {
  title: "Booking confirmed",
  body: "We've emailed your confirmation and added the slot to your calendar.",
  reference: "SB-4C7K-2210",
  slot: "Sat 14 Sep · 18:00–19:00 · Ararat Arena, Pitch 2",
  sparkCount: 12,
  badgeSize: 148,
};

const STAGE_W = 1000;
const STAGE_H = 720;

/** Frames the tick takes to draw, and how long it waits before starting. */
const DRAW_DELAY = 7;
const DRAW_FRAMES = 20;

const CARD_X = 130;
const CARD_Y = 96;
const CARD_W = 740;
const CARD_H = 520;

export const ResultBookingConfirmed: FC<ResultBookingConfirmedProps> = ({
  title,
  body,
  reference,
  slot,
  sparkCount,
  badgeSize,
}) => {
  const { t, frame, fps, period, reduced } = useLoopClock();

  /**
   * `hold + fall + 1 = 83`, so with a 90-frame cycle the envelope is exactly
   * zero for frames 83–89 and exactly zero at frame 0. Under reduced motion it
   * is pinned open, so the result is simply legible and still.
   */
  const reveal = reduced
    ? 1
    : loopPulse({ frame, fps, period, rise: 15, hold: 58, fall: 24 });

  /** Overshoot only in the first third — the badge's own arrival. */
  const pop = Math.min(1, reveal * 1.15);

  /**
   * One-way by nature, unobservable by construction: see the header. Under
   * reduced motion the tick is simply drawn.
   */
  const draw = reduced
    ? 1
    : spring({
        frame,
        fps,
        delay: DRAW_DELAY,
        durationInFrames: DRAW_FRAMES,
        config: SPRING_SETTLE,
      });

  const cx = CARD_X + CARD_W / 2;
  const badgeY = CARD_Y + 118;
  const r = badgeSize / 2;
  const sparks = Math.max(0, Math.round(sparkCount));

  /** Path length of the tick, measured off the geometry below. */
  const TICK_LEN = 62;

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.12} vignette={0.5} />

      <AbsoluteFill>
        {/* Card shell — static. It is the page, not the animation. */}
        <div
          style={{
            position: "absolute",
            left: CARD_X,
            top: CARD_Y,
            width: CARD_W,
            height: CARD_H,
            borderRadius: 28,
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
            boxShadow: [
              `0 24px 48px -12px ${ink(0.7)}`,
              `inset 0 1px 0 0 ${chalk(0.05)}`,
              `0 0 ${60 * reveal}px -24px ${primary(0.6)}`,
            ].join(", "),
          }}
        />

        <div style={{ opacity: reveal }}>
          <svg
            width={STAGE_W}
            height={STAGE_H}
            viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
            style={{ position: "absolute", inset: 0 }}
          >
            <g transform={`translate(${cx} ${badgeY})`}>
              {/* Sparks. Gated by the envelope, so they vanish with everything
                  else and cannot survive the wrap. */}
              {Array.from({ length: sparks }, (_, i) => {
                const angle = (TAU * i) / sparks;
                const reach = r * (1.28 + 0.5 * interpolate(pop, [0, 1], [0, 1]));
                const len = 12 * pop;
                const x0 = Math.cos(angle) * (reach - len);
                const y0 = Math.sin(angle) * (reach - len);
                const x1 = Math.cos(angle) * reach;
                const y1 = Math.sin(angle) * reach;
                return (
                  <line
                    key={i}
                    x1={x0}
                    y1={y0}
                    x2={x1}
                    y2={y1}
                    stroke={i % 3 === 0 ? C.cyan : C.primary}
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={0.75 * Math.max(0, 1 - pop) * Math.min(1, pop * 4)}
                  />
                );
              })}

              <circle r={r * 1.36} fill={primary(0.08)} />
              <circle
                r={r * (0.9 + 0.1 * pop)}
                fill={primary(0.14)}
                stroke={primary(0.4)}
                strokeWidth={2}
              />
              <circle r={r * 0.72} fill={C.primary} />

              {/* The tick. `pathLength` normalises the dash maths so the draw
                  does not depend on the browser's own path measurement. */}
              <path
                d="M -26 2 L -8 21 L 27 -19"
                fill="none"
                stroke={C.bg}
                strokeWidth={11}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={TICK_LEN}
                strokeDasharray={`${TICK_LEN} ${TICK_LEN}`}
                strokeDashoffset={TICK_LEN * (1 - draw)}
              />
            </g>
          </svg>

          <div
            style={{
              position: "absolute",
              left: CARD_X,
              top: badgeY + r + 44,
              width: CARD_W,
              textAlign: "center",
              fontFamily: SANS_FONT,
              fontSize: 38,
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: C.foreground,
            }}
          >
            {title}
          </div>

          <div
            style={{
              position: "absolute",
              left: CARD_X + 90,
              top: badgeY + r + 96,
              width: CARD_W - 180,
              textAlign: "center",
              fontFamily: SANS_FONT,
              fontSize: 17,
              lineHeight: 1.5,
              color: C.mutedForeground,
            }}
          >
            {body}
          </div>

          {/* Summary strip — slot on the left, reference on the right. */}
          <div
            style={{
              position: "absolute",
              left: CARD_X + 44,
              top: CARD_Y + CARD_H - 108,
              width: CARD_W - 88,
              height: 64,
              borderRadius: 16,
              backgroundColor: C.surface1,
              border: `1px solid ${hairline(1)}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: CARD_X + 68,
              top: CARD_Y + CARD_H - 88,
              width: CARD_W - 300,
              fontFamily: SANS_FONT,
              fontSize: 15,
              color: C.foregroundSoft,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {slot}
          </div>
          <div
            style={{
              position: "absolute",
              left: CARD_X + 44,
              top: CARD_Y + CARD_H - 88,
              width: CARD_W - 112,
              textAlign: "right",
              fontFamily: MONO_FONT,
              fontSize: 15,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.06em",
              color: C.primary,
            }}
          >
            {reference}
          </div>

          <Eyebrow x={0} y={CARD_Y + 62} width={STAGE_W} align="center">
            Payment successful
          </Eyebrow>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
