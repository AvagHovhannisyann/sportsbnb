/**
 * ResultPaymentDeclined — the failure state of the payment result page: the
 * card was declined, no slot was taken, and the user needs a way back to the
 * payment step. Also the failed-charge state on `owner/OwnerEarningsPage` when
 * a payout bounces.
 *
 * The copy carries the two facts that stop a support ticket: nothing was
 * charged, and the slot is still held. `--destructive` is the *text-safe* step
 * (`358 72% 68%`), and the solid fill behind white is `--destructive-solid`
 * (`358 68% 42%`) — the design system keeps two tokens precisely because one
 * cannot clear 4.5:1 in both directions.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * `reveal` is `loopPulse` with a long hold: exactly `0 − 0` at frame 0 and
 * exactly `1 − 1` for every frame from `hold + fall + 1` onward, so the card is
 * exactly invisible at both ends of the cycle.
 *
 * Two things here are one-way inside the cycle and are made unobservable by
 * that envelope: the cross's two `strokeDashoffset` springs, and the shake.
 * The shake is `sin(2π·shakeCycles·t)`, which is exactly 0 at t = 0 and t = 1
 * for integer `shakeCycles` — so it closes on its own *as well as* being
 * invisible at the seam. Belt and braces, because a horizontal jolt is the
 * single most visible kind of seam.
 */

import type { FC } from "react";
import { AbsoluteFill, spring } from "remotion";

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
  danger,
  hairline,
  ink,
  loopPulse,
  useLoopClock,
} from "./shared";

export type ResultPaymentDeclinedProps = {
  /** Headline. */
  title: string;
  /** Supporting line — say what was *not* charged, and what is still held. */
  body: string;
  /** The gateway's reason code, set in mono. */
  reasonCode: string;
  /** Label on the primary recovery button. */
  actionLabel: string;
  /** Peak horizontal shake, in design-canvas px. */
  shakeAmplitude: number;
  /** Whole shake cycles per loop. Integers only — see the header. */
  shakeCycles: number;
};

export const resultPaymentDeclinedDefaultProps: ResultPaymentDeclinedProps = {
  title: "Payment declined",
  body: "Your card was not charged. The slot is still held for 8 more minutes.",
  reasonCode: "do_not_honour · 05",
  actionLabel: "Try another card",
  shakeAmplitude: 9,
  shakeCycles: 3,
};

const STAGE_W = 1000;
const STAGE_H = 720;

const DRAW_DELAY = 8;
const DRAW_FRAMES = 16;

const CARD_X = 130;
const CARD_Y = 96;
const CARD_W = 740;
const CARD_H = 520;

export const ResultPaymentDeclined: FC<ResultPaymentDeclinedProps> = ({
  title,
  body,
  reasonCode,
  actionLabel,
  shakeAmplitude,
  shakeCycles,
}) => {
  const { t, frame, fps, period, reduced } = useLoopClock();

  const reveal = reduced
    ? 1
    : loopPulse({ frame, fps, period, rise: 15, hold: 58, fall: 24 });

  /** Both strokes of the cross, staggered so it reads as drawn, not stamped. */
  const strokeA = reduced
    ? 1
    : spring({
        frame,
        fps,
        delay: DRAW_DELAY,
        durationInFrames: DRAW_FRAMES,
        config: SPRING_SETTLE,
      });
  const strokeB = reduced
    ? 1
    : spring({
        frame,
        fps,
        delay: DRAW_DELAY + 6,
        durationInFrames: DRAW_FRAMES,
        config: SPRING_SETTLE,
      });

  /**
   * Integer cycles of a sine → exactly 0 at both ends of the loop. Damped by
   * `reveal · (1 − reveal)` so the shake only exists while the badge is
   * arriving and is already gone by the time the card holds.
   */
  const shake = reduced
    ? 0
    : Math.sin(TAU * Math.round(shakeCycles) * t) *
      shakeAmplitude *
      Math.max(0, 1 - reveal) *
      Math.min(1, reveal * 3);

  const cx = CARD_X + CARD_W / 2;
  const badgeY = CARD_Y + 118;
  const r = 74;
  const LEN = 48;

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.05} vignette={0.58} />

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
              `0 0 ${54 * reveal}px -26px ${danger(0.55)}`,
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
            <g transform={`translate(${cx + shake} ${badgeY})`}>
              <circle r={r * 1.3} fill={danger(0.07)} />
              <circle
                r={r * 0.92}
                fill={danger(0.12)}
                stroke={danger(0.42)}
                strokeWidth={2}
              />
              <circle r={r * 0.72} fill={C.destructiveSolid} />

              {/* The cross, drawn stroke by stroke. */}
              <path
                d="M -20 -20 L 20 20"
                stroke={chalk(1)}
                strokeWidth={10}
                strokeLinecap="round"
                pathLength={LEN}
                strokeDasharray={`${LEN} ${LEN}`}
                strokeDashoffset={LEN * (1 - strokeA)}
              />
              <path
                d="M 20 -20 L -20 20"
                stroke={chalk(1)}
                strokeWidth={10}
                strokeLinecap="round"
                pathLength={LEN}
                strokeDasharray={`${LEN} ${LEN}`}
                strokeDashoffset={LEN * (1 - strokeB)}
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
              transform: `translateX(${shake * 0.35}px)`,
            }}
          >
            {title}
          </div>

          <div
            style={{
              position: "absolute",
              left: CARD_X + 80,
              top: badgeY + r + 96,
              width: CARD_W - 160,
              textAlign: "center",
              fontFamily: SANS_FONT,
              fontSize: 17,
              lineHeight: 1.5,
              color: C.mutedForeground,
            }}
          >
            {body}
          </div>

          {/* Reason code strip. Muted, because it is for support, not the user. */}
          <div
            style={{
              position: "absolute",
              left: cx - 150,
              top: badgeY + r + 154,
              width: 300,
              height: 34,
              borderRadius: 17,
              backgroundColor: C.surface1,
              border: `1px solid ${hairline(1)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MONO_FONT,
              fontSize: 13,
              letterSpacing: "0.06em",
              color: C.destructive,
            }}
          >
            {reasonCode}
          </div>

          {/* Recovery buttons. Primary is the retry, not "go home" — the user
              came here to book something. */}
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
              backgroundColor: "transparent",
              border: `1px solid ${C.borderInteractive}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SANS_FONT,
              fontSize: 17,
              fontWeight: 500,
              color: C.foregroundSoft,
            }}
          >
            Back to the slot
          </div>

          <Eyebrow
            x={0}
            y={CARD_Y + 62}
            width={STAGE_W}
            align="center"
            color={danger(0.8)}
          >
            Payment failed
          </Eyebrow>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
