/**
 * PayoutSentConfirmation — the moment a payout lands, on /owner/earnings and in
 * the payout drawer once the transfer clears the bank.
 * One-way: the ring closes, the tick draws, and the figure counts to the exact
 * dram the owner earned. Reduced motion holds the confirmed state.
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
  TAU,
  cardSurface,
  chalk,
  countProgress,
  countTo,
  courtGreen,
  dram,
  eyebrowStyle,
  hairline,
  ink,
  interpolateSafe,
  muted,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS_W = 960;

export type PayoutSentConfirmationProps = {
  /** The amount that landed, in dram. The counter ends on exactly this. */
  amount: number;
  /** Mono caps above the figure. */
  label: string;
  /** The line that confirms arrival. */
  confirmLabel: string;
  /** Destination account, masked as the app masks it. */
  destinationLabel: string;
  /** Bank reference, shown in mono so it can be read aloud. */
  referenceLabel: string;
  /** Bookings this payout settles — the figure's denominator. */
  bookings: number;
};

export const payoutSentConfirmationDefaultProps: PayoutSentConfirmationProps = {
  amount: 486000,
  label: "Payout complete",
  confirmLabel: "Landed in your account",
  destinationLabel: "Ameriabank ···· 4417",
  referenceLabel: "REF SB-2407-11842",
  bookings: 31,
};

const RING_DELAY = 10;
const RING_DURATION = 46;
const TICK_AT = RING_DELAY + RING_DURATION;
const TICK_DURATION = 18;
const COUNT_DELAY = TICK_AT + 4;
const COUNT_DURATION = 56;
const COUNT_END = COUNT_DELAY + COUNT_DURATION;

export const PayoutSentConfirmation: FC<PayoutSentConfirmationProps> = ({
  amount,
  label,
  confirmLabel,
  destinationLabel,
  referenceLabel,
  bookings,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: the confirmed payout is the message, so reduced motion holds it.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = width / CANVAS_W;

  const ringDraw = countProgress({
    frame,
    delay: RING_DELAY,
    duration: RING_DURATION,
  });
  const tickDraw = countProgress({
    frame,
    delay: TICK_AT,
    duration: TICK_DURATION,
  });

  const shown = countTo({
    frame,
    from: 0,
    to: amount,
    delay: COUNT_DELAY,
    duration: COUNT_DURATION,
  });
  const bookingsShown = Math.round(
    countTo({
      frame,
      from: 0,
      to: bookings,
      delay: COUNT_DELAY + 6,
      duration: COUNT_DURATION - 16,
    }),
  );

  // A flare as the figure lands, clamped to exactly zero on both sides.
  const land = interpolateSafe(
    frame,
    [COUNT_END - 8, COUNT_END + 2, COUNT_END + 36],
    [0, 1, 0],
  );

  const ringR = 46 * unit;
  const ringStroke = 6 * unit;
  const ringC = TAU * ringR;
  const ringBox = ringR * 2 + ringStroke * 2;

  // The tick path length, measured once so the dash offset is exact rather
  // than a guess that leaves a stub of stroke behind at full draw.
  const TICK_LEN = 26.4;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(84% 70% at 50% 12%, ${BRAND.surface1} 0%, ${BRAND.background} 72%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(44% 40% at 50% 44%, ${courtGreen(0.06 + 0.11 * land)} 0%, transparent 74%)`,
        }}
      />

      <Sequence name="Confirmation" layout="none">
        <div
          style={{
            position: "absolute",
            left: width * 0.1,
            right: width * 0.1,
            top: height * 0.5,
            transform: "translateY(-50%)",
            ...cardSurface(unit, 24),
            padding: `${34 * unit}px ${36 * unit}px ${30 * unit}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* The ring draws once, then the tick draws inside it. Neither ever
              runs backwards — a payout does not un-arrive. */}
          <svg
            width={ringBox}
            height={ringBox}
            viewBox={`0 0 ${ringBox} ${ringBox}`}
          >
            <circle
              cx={ringBox / 2}
              cy={ringBox / 2}
              r={ringR}
              fill="none"
              stroke={BRAND.input}
              strokeWidth={ringStroke}
            />
            <circle
              cx={ringBox / 2}
              cy={ringBox / 2}
              r={ringR}
              fill="none"
              stroke={BRAND.primary}
              strokeWidth={ringStroke}
              strokeLinecap="round"
              strokeDasharray={ringC.toFixed(3)}
              strokeDashoffset={(ringC * (1 - ringDraw)).toFixed(3)}
              transform={`rotate(-90 ${ringBox / 2} ${ringBox / 2})`}
              style={{
                filter: `drop-shadow(0 0 ${(6 + 14 * land).toFixed(1)}px ${courtGreen(0.5)})`,
              }}
            />
            <g
              transform={`translate(${ringBox / 2 - 16 * unit} ${ringBox / 2 - 16 * unit}) scale(${(unit * 2).toFixed(4)})`}
            >
              <path
                d="M3.4 8.6L6.8 12L13.2 4.6"
                fill="none"
                stroke={BRAND.primary}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={TICK_LEN}
                strokeDashoffset={(TICK_LEN * (1 - tickDraw)).toFixed(3)}
              />
            </g>
          </svg>

          <div
            style={{
              ...eyebrowStyle(unit * 1.1),
              marginTop: 20 * unit,
              opacity: interpolateSafe(frame, [0, 14], [0, 1]),
            }}
          >
            {label}
          </div>

          <div
            style={{
              marginTop: 14 * unit,
              fontFamily: MONO_FONT,
              fontVariantNumeric: "tabular-nums",
              fontSize: 72 * unit,
              fontWeight: 500,
              letterSpacing: -0.02 * 72 * unit,
              lineHeight: 1,
              color: BRAND.foreground,
              textShadow: `0 0 ${(38 * land).toFixed(1)}px ${courtGreen(0.5 * land)}`,
            }}
          >
            {dram(shown)}
          </div>

          <div
            style={{
              marginTop: 14 * unit,
              fontFamily: DISPLAY_FONT,
              fontSize: 20 * unit,
              fontWeight: 600,
              color: BRAND.primary,
              opacity: interpolateSafe(
                frame,
                [TICK_AT, TICK_AT + 16],
                [0, 1],
              ),
            }}
          >
            {confirmLabel}
          </div>

          <div
            style={{
              marginTop: 24 * unit,
              width: "100%",
              height: 1 * unit,
              background: `linear-gradient(90deg, transparent, ${hairline(1)} 50%, transparent)`,
            }}
          />

          <div
            style={{
              marginTop: 22 * unit,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20 * unit,
              opacity: interpolateSafe(
                frame,
                [COUNT_END - 16, COUNT_END + 4],
                [0, 1],
              ),
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: 5 * unit }}
            >
              <span
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontSize: 16 * unit,
                  fontWeight: 600,
                  color: BRAND.foregroundSoft,
                }}
              >
                {destinationLabel}
              </span>
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 13 * unit,
                  letterSpacing: 0.04 * 13 * unit,
                  color: muted(0.8),
                }}
              >
                {referenceLabel}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8 * unit,
                padding: `${9 * unit}px ${16 * unit}px`,
                borderRadius: 999,
                backgroundColor: BRAND.surface2,
                border: `${1 * unit}px solid ${hairline(1)}`,
              }}
            >
              <span
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontSize: 19 * unit,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: BRAND.foreground,
                }}
              >
                {bookingsShown}
              </span>
              <span
                style={{
                  fontFamily: SANS_FONT,
                  fontSize: 14 * unit,
                  color: muted(0.95),
                }}
              >
                bookings settled
              </span>
            </div>
          </div>

          {/* Stated, not implied: the figure above is the whole price. There
              is no fee line on this card because there is no fee. */}
          <div
            style={{
              marginTop: 20 * unit,
              width: "100%",
              padding: `${11 * unit}px ${16 * unit}px`,
              borderRadius: 12 * unit,
              backgroundColor: BRAND.primarySoft,
              border: `${1 * unit}px solid ${courtGreen(0.24)}`,
              fontFamily: SANS_FONT,
              fontSize: 15 * unit,
              textAlign: "center",
              color: chalk(0.82),
              opacity: interpolateSafe(
                frame,
                [COUNT_END - 6, COUNT_END + 18],
                [0, 1],
              ),
            }}
          >
            Sent in full. SportsBnB withheld nothing on the way.
          </div>
        </div>
      </Sequence>

      <AbsoluteFill
        style={{
          background: `radial-gradient(118% 94% at 50% 46%, transparent 48%, ${ink(0.46)} 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
