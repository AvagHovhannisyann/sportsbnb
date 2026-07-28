/**
 * ResultHoldExpired — the timeout state of checkout. The slot is held for a
 * fixed window while the user pays; when that window runs out before the charge
 * completes, the hold is released and this is what the payment result page
 * shows. Also the state `EmbedBookingPage` falls into if the widget is left
 * open past its hold.
 *
 * The one thing this screen has to communicate is that nothing was charged and
 * the slot may still be free — so the primary action returns to the same slot
 * rather than to search.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * `reveal` is `loopPulse` with a long hold: exactly `0 − 0` at frame 0 and
 * exactly `1 − 1` for every frame from `hold + fall + 1` to the end of the
 * cycle, so the card is exactly invisible at both ends. Inside that envelope,
 * the countdown ring is drained by a spring, which is one-way — and
 * unobservable, because at both ends of the cycle its opacity is exactly 0. The
 * sand grains fall on `cosWave` at their own phases, a full cosine period, so
 * they are staggered and still bit-identical at t = 0 and t = 1.
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
  cosWave,
  hairline,
  ink,
  loopPulse,
  useLoopClock,
  warn,
} from "./shared";

export type ResultHoldExpiredProps = {
  /** Headline. */
  title: string;
  /** Supporting line — say plainly that nothing was charged. */
  body: string;
  /** How long the hold was, shown on the countdown ring. */
  holdLabel: string;
  /** Label on the primary action. */
  actionLabel: string;
  /** Diameter of the countdown ring, in design-canvas px. */
  ringSize: number;
  /** Falling grains inside the glass. 0 disables them. */
  grainCount: number;
};

export const resultHoldExpiredDefaultProps: ResultHoldExpiredProps = {
  title: "Your hold expired",
  body: "Nothing was charged. The 18:00 slot may still be free — check and try again.",
  holdLabel: "10:00",
  actionLabel: "Back to that slot",
  ringSize: 160,
  grainCount: 6,
};

const STAGE_W = 1000;
const STAGE_H = 720;

const CARD_X = 130;
const CARD_Y = 96;
const CARD_W = 740;
const CARD_H = 520;

const DRAIN_DELAY = 6;
const DRAIN_FRAMES = 26;

export const ResultHoldExpired: FC<ResultHoldExpiredProps> = ({
  title,
  body,
  holdLabel,
  actionLabel,
  ringSize,
  grainCount,
}) => {
  const { t, frame, fps, period, reduced } = useLoopClock();

  const reveal = reduced
    ? 1
    : loopPulse({ frame, fps, period, rise: 15, hold: 58, fall: 24 });

  /**
   * The ring drains from full to empty. One-way, and unobservable: the whole
   * group is at exactly zero opacity at both ends of the cycle.
   */
  const drain = reduced
    ? 1
    : spring({
        frame,
        fps,
        delay: DRAIN_DELAY,
        durationInFrames: DRAIN_FRAMES,
        config: SPRING_SETTLE,
      });

  const cx = CARD_X + CARD_W / 2;
  const badgeY = CARD_Y + 126;
  const r = ringSize / 2;
  const circumference = TAU * r;
  const remaining = 1 - drain;
  const grains = Math.max(0, Math.round(grainCount));

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.05} vignette={0.6} />

      <AbsoluteFill>
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
              `0 24px 48px -12px ${ink(0.72)}`,
              `inset 0 1px 0 0 ${chalk(0.05)}`,
              `0 0 ${44 * reveal}px -26px ${warn(0.45)}`,
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
              <circle r={r * 1.28} fill={warn(0.06)} />

              {/* Countdown track, then the draining arc. */}
              <circle r={r} fill="none" stroke={C.surface3} strokeWidth={12} />
              <g transform="rotate(-90)">
                <circle
                  r={r}
                  fill="none"
                  stroke={C.warning}
                  strokeWidth={12}
                  strokeLinecap="round"
                  strokeDasharray={`${circumference * remaining} ${circumference * (1 - remaining)}`}
                  opacity={0.35 + 0.65 * remaining}
                />
              </g>

              {/* Hourglass, spent. */}
              <g>
                <path
                  d="M -26 -34 L 26 -34 L 4 0 L 26 34 L -26 34 L -4 0 Z"
                  fill={C.surface2}
                  stroke={C.borderStrong}
                  strokeWidth={2.4}
                  strokeLinejoin="round"
                />
                {/* Upper chamber empties as the ring drains. */}
                <path
                  d={`M -22 ${-31 + 26 * drain} L 22 ${-31 + 26 * drain} L 2 -1 L -2 -1 Z`}
                  fill={warn(0.55)}
                  opacity={remaining}
                />
                {/* Lower chamber fills to match — mass is conserved, which is
                    the detail that makes an hourglass read as one. */}
                <path
                  d={`M -22 31 L 22 31 L ${2 + 18 * drain} ${31 - 26 * drain} L ${-2 - 18 * drain} ${31 - 26 * drain} Z`}
                  fill={C.warning}
                />

                {/* Grains in the neck. Each on its own cosine phase. */}
                {Array.from({ length: grains }, (_, i) => {
                  const phase = (TAU * i) / grains;
                  const fall = cosWave(t, phase);
                  return (
                    <circle
                      key={i}
                      cx={(i % 2 === 0 ? 1 : -1) * 1.6}
                      cy={interpolate(fall, [0, 1], [24, -2])}
                      r={1.7}
                      fill={C.warning}
                      opacity={0.35 + 0.55 * fall * remaining}
                    />
                  );
                })}
              </g>
            </g>
          </svg>

          {/* The hold duration, struck through — it is spent. */}
          <div
            style={{
              position: "absolute",
              left: cx - 60,
              top: badgeY + r + 22,
              width: 120,
              textAlign: "center",
              fontFamily: MONO_FONT,
              fontSize: 20,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.08em",
              color: C.mutedForeground,
              textDecoration: "line-through",
            }}
          >
            {holdLabel}
          </div>

          <div
            style={{
              position: "absolute",
              left: CARD_X,
              top: badgeY + r + 60,
              width: CARD_W,
              textAlign: "center",
              fontFamily: SANS_FONT,
              fontSize: 36,
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
              left: CARD_X + 70,
              top: badgeY + r + 110,
              width: CARD_W - 140,
              textAlign: "center",
              fontFamily: SANS_FONT,
              fontSize: 17,
              lineHeight: 1.5,
              color: C.mutedForeground,
            }}
          >
            {body}
          </div>

          <div
            style={{
              position: "absolute",
              left: cx - 236,
              top: CARD_Y + CARD_H - 100,
              width: 240,
              height: 54,
              borderRadius: 16,
              backgroundColor: C.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SANS_FONT,
              fontSize: 17,
              fontWeight: 600,
              color: C.bg,
            }}
          >
            {actionLabel}
          </div>
          <div
            style={{
              position: "absolute",
              left: cx + 16,
              top: CARD_Y + CARD_H - 100,
              width: 220,
              height: 54,
              borderRadius: 16,
              border: `1px solid ${hairline(1)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SANS_FONT,
              fontSize: 17,
              fontWeight: 500,
              color: C.foregroundSoft,
            }}
          >
            Find another pitch
          </div>

          <Eyebrow
            x={0}
            y={CARD_Y + 62}
            width={STAGE_W}
            align="center"
            color={warn(0.72)}
          >
            Nothing was charged
          </Eyebrow>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
