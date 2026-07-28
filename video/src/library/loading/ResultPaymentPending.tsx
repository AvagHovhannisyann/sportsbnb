/**
 * ResultPaymentPending — the in-between state of the payment result page: the
 * charge has been submitted and the bank has not answered yet, which for
 * Armenian 3-D Secure redirects can be tens of seconds. Also the "awaiting
 * owner approval" state on a request-to-book venue.
 *
 * Unlike the confirmed and declined screens, this one does **not** reveal and
 * dissolve. Pending is an ongoing condition, not an event, so the card stays up
 * and only the clock turns — a screen that kept re-introducing itself would
 * suggest something was retrying when nothing is.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * Every driver is a modulo cycle or a full cosine period. The minute hand turns
 * exactly `minuteTurns × 360°` per cycle, so its angle at t = 1 is congruent to
 * its angle at t = 0. The dashed escort ring turns exactly 360° and its dash
 * offset advances by exactly one dash period. The bloom, the tick ladder and
 * the status dot are `cosWave`. Nothing tweens one way, and nothing has to hide
 * to be seamless.
 *
 * The hour hand is *static*, and that is a loop decision rather than a lazy
 * one. Driving it at the true 1:12 ratio would give it `minuteTurns/12` of a
 * turn per cycle — 30° for the default — which is not a whole number of turns
 * and therefore snaps back once per loop, a visible tick in the wrong
 * direction. Spinning it a whole turn instead would put it 12× too fast and
 * make the clock read as fast-forward rather than as waiting. Over the couple
 * of seconds this loop actually represents, a real hour hand moves under a
 * degree, so holding it still is also the honest choice.
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
  polar,
  useLoopClock,
  warn,
} from "./shared";

export type ResultPaymentPendingProps = {
  /** Headline. */
  title: string;
  /** Supporting line. */
  body: string;
  /** Transaction reference, set in mono. */
  reference: string;
  /** Diameter of the clock face, in design-canvas px. */
  clockSize: number;
  /** Turns the minute hand makes per loop. Integers only — see the header. */
  minuteTurns: number;
  /** Fixed angle of the hour hand, in degrees. It does not turn — see header. */
  hourHandDegrees: number;
  /** Draw the dashed escort ring around the clock. */
  showEscortRing: boolean;
};

export const resultPaymentPendingDefaultProps: ResultPaymentPendingProps = {
  title: "Waiting for your bank",
  body: "Don't close this page. We'll confirm the moment your bank responds.",
  reference: "SB-4C7K-2210",
  clockSize: 152,
  minuteTurns: 2,
  hourHandDegrees: 300,
  showEscortRing: true,
};

const STAGE_W = 1000;
const STAGE_H = 720;

const CARD_X = 130;
const CARD_Y = 96;
const CARD_W = 740;
const CARD_H = 520;

export const ResultPaymentPending: FC<ResultPaymentPendingProps> = ({
  title,
  body,
  reference,
  clockSize,
  minuteTurns,
  hourHandDegrees,
  showEscortRing,
}) => {
  const { t } = useLoopClock();

  const breath = cosWave(t);
  const cx = CARD_X + CARD_W / 2;
  const badgeY = CARD_Y + 128;
  const r = clockSize / 2;

  const turns = Math.max(1, Math.round(minuteTurns));
  const minuteAngle = turns * 360 * t;
  /** Held at ten o'clock — see the header for why it does not turn. */
  const hourAngle = hourHandDegrees;

  /** Dash geometry: the offset advances by exactly one period per cycle. */
  const dash = 10;
  const gap = 12;
  const dashPeriod = dash + gap;

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.06} vignette={0.55} />

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
              `0 24px 48px -12px ${ink(0.7)}`,
              `inset 0 1px 0 0 ${chalk(0.05)}`,
              `0 0 ${40 + 24 * breath}px -26px ${warn(0.5)}`,
            ].join(", "),
          }}
        />

        <svg
          width={STAGE_W}
          height={STAGE_H}
          viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <g transform={`translate(${cx} ${badgeY})`}>
            <circle r={r * (1.34 + 0.04 * breath)} fill={warn(0.07 + 0.04 * breath)} />

            {showEscortRing ? (
              <g transform={`rotate(${t * 360})`}>
                <circle
                  r={r * 1.2}
                  fill="none"
                  stroke={warn(0.35)}
                  strokeWidth={2}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={-t * dashPeriod}
                />
              </g>
            ) : null}

            {/* Clock face. */}
            <circle
              r={r}
              fill={C.surface2}
              stroke={C.borderStrong}
              strokeWidth={2}
            />

            {/* Hour ladder — twelve ticks, four of them long. */}
            {Array.from({ length: 12 }, (_, i) => {
              const deg = i * 30;
              const major = i % 3 === 0;
              const a = polar(deg, r * (major ? 0.78 : 0.84));
              const b = polar(deg, r * 0.92);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={major ? chalk(0.55) : hairline(1)}
                  strokeWidth={major ? 3 : 1.6}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Minute hand makes exact whole turns; the hour hand is held. */}
            <g transform={`rotate(${hourAngle})`}>
              <line
                x1={0}
                y1={r * 0.12}
                x2={0}
                y2={-r * 0.46}
                stroke={chalk(0.85)}
                strokeWidth={6}
                strokeLinecap="round"
              />
            </g>
            <g transform={`rotate(${minuteAngle})`}>
              <line
                x1={0}
                y1={r * 0.16}
                x2={0}
                y2={-r * 0.72}
                stroke={C.warning}
                strokeWidth={4}
                strokeLinecap="round"
              />
            </g>
            <circle r={5.5} fill={C.warning} />
            <circle r={2.2} fill={C.bg} />
          </g>
        </svg>

        <div
          style={{
            position: "absolute",
            left: CARD_X,
            top: badgeY + r + 52,
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
            left: CARD_X + 80,
            top: badgeY + r + 104,
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

        {/* Live status row: dot, state, reference. */}
        <div
          style={{
            position: "absolute",
            left: CARD_X + 44,
            top: CARD_Y + CARD_H - 104,
            width: CARD_W - 88,
            height: 60,
            borderRadius: 16,
            backgroundColor: C.surface1,
            border: `1px solid ${hairline(1)}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: CARD_X + 70,
            top: CARD_Y + CARD_H - 79,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: C.warning,
            opacity: 0.55 + 0.45 * breath,
            boxShadow: `0 0 ${8 + 10 * breath}px ${warn(0.7)}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: CARD_X + 92,
            top: CARD_Y + CARD_H - 84,
            fontFamily: MONO_FONT,
            fontSize: 13,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: C.warning,
          }}
        >
          Pending
        </div>
        <div
          style={{
            position: "absolute",
            left: CARD_X + 44,
            top: CARD_Y + CARD_H - 84,
            width: CARD_W - 114,
            textAlign: "right",
            fontFamily: MONO_FONT,
            fontSize: 14,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.06em",
            color: C.foregroundSoft,
          }}
        >
          {reference}
        </div>

        <Eyebrow
          x={0}
          y={CARD_Y + 62}
          width={STAGE_W}
          align="center"
          color={warn(0.55 + 0.3 * breath)}
        >
          Authorising with 3-D Secure
        </Eyebrow>
      </AbsoluteFill>
    </Stage>
  );
};
