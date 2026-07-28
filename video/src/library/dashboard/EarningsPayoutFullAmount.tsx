/**
 * EarningsPayoutFullAmount — the payout breakdown an owner sees against a
 * single booking, on /owner/bookings and the payout drawer.
 * One-way. The point of the piece is that the two figures are the same number:
 * SportsBnB charges zero commission, so the price line and the payout line
 * land on identical digits and the "deduction" row reads ֏0.
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
  cardSurface,
  countTo,
  courtGreen,
  dram,
  eyebrowStyle,
  hairline,
  interpolateSafe,
  muted,
  ownerPayout,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS_W = 1200;

export type EarningsPayoutFullAmountProps = {
  /** What the player paid, in dram. */
  price: number;
  /** Venue the booking belongs to. */
  venueName: string;
  /** Slot description under the venue name. */
  slotLabel: string;
  /** Heading over the breakdown. */
  title: string;
  /** Label on the row that would be a fee anywhere else. */
  feeRowLabel: string;
  /** Label on the row the owner actually receives. */
  payoutRowLabel: string;
};

export const earningsPayoutFullAmountDefaultProps: EarningsPayoutFullAmountProps =
  {
    price: 16000,
    venueName: "Ararat Arena · Court 2",
    slotLabel: "Sat 19:00 – 20:00 · 1 hour",
    title: "What you receive",
    feeRowLabel: "Platform commission",
    payoutRowLabel: "Your payout",
  };

const ROW_STEP = 14;
const ROW_BASE = 26;
const PAYOUT_DELAY = ROW_BASE + ROW_STEP * 2 + 6;
const PAYOUT_DURATION = 54;

export const EarningsPayoutFullAmount: FC<EarningsPayoutFullAmountProps> = ({
  price,
  venueName,
  slotLabel,
  title,
  feeRowLabel,
  payoutRowLabel,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: the settled breakdown is the message.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = width / CANVAS_W;

  const payout = ownerPayout(price);

  const priceShown = countTo({
    frame,
    from: 0,
    to: price,
    delay: ROW_BASE,
    duration: 44,
  });
  const payoutShown = countTo({
    frame,
    from: 0,
    to: payout,
    delay: PAYOUT_DELAY,
    duration: PAYOUT_DURATION,
  });

  const settled = PAYOUT_DELAY + PAYOUT_DURATION;
  const land = interpolateSafe(
    frame,
    [settled - 8, settled + 2, settled + 38],
    [0, 1, 0],
  );

  const rowIn = (index: number): number =>
    interpolateSafe(frame, [ROW_BASE + index * ROW_STEP, ROW_BASE + index * ROW_STEP + 16], [0, 1]);

  const Row: FC<{
    index: number;
    label: string;
    value: string;
    valueColor: string;
    note?: string;
  }> = ({ index, label, value, valueColor, note }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 15 * unit,
        paddingBottom: 15 * unit,
        opacity: rowIn(index),
        transform: `translateY(${((1 - rowIn(index)) * 10 * unit).toFixed(2)}px)`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 * unit }}>
        <span
          style={{
            fontFamily: SANS_FONT,
            fontSize: 18 * unit,
            color: BRAND.foregroundSoft,
          }}
        >
          {label}
        </span>
        {note ? (
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 14 * unit,
              color: muted(0.85),
            }}
          >
            {note}
          </span>
        ) : null}
      </div>
      <span
        style={{
          fontFamily: MONO_FONT,
          fontVariantNumeric: "tabular-nums",
          fontSize: 24 * unit,
          fontWeight: 500,
          color: valueColor,
        }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(84% 74% at 50% 8%, ${BRAND.surface1} 0%, ${BRAND.background} 72%)`,
        }}
      />

      <Sequence name="Breakdown" layout="none">
        <div
          style={{
            position: "absolute",
            left: width * 0.13,
            right: width * 0.13,
            top: height * 0.5,
            transform: "translateY(-50%)",
            ...cardSurface(unit, 24),
            padding: `${30 * unit}px ${34 * unit}px ${28 * unit}px`,
          }}
        >
          <div style={{ ...eyebrowStyle(unit * 1.15) }}>{title}</div>

          <div
            style={{
              marginTop: 12 * unit,
              fontFamily: DISPLAY_FONT,
              fontSize: 27 * unit,
              fontWeight: 700,
              letterSpacing: -0.03 * 27 * unit,
              color: BRAND.foreground,
            }}
          >
            {venueName}
          </div>
          <div
            style={{
              marginTop: 6 * unit,
              fontFamily: SANS_FONT,
              fontSize: 16 * unit,
              color: muted(0.95),
            }}
          >
            {slotLabel}
          </div>

          <div
            style={{
              marginTop: 22 * unit,
              height: 1 * unit,
              backgroundColor: hairline(1),
            }}
          />

          <Row
            index={0}
            label="Booking price"
            value={dram(priceShown)}
            valueColor={BRAND.foreground}
          />
          <div style={{ height: 1 * unit, backgroundColor: hairline(0.6) }} />
          <Row
            index={1}
            label={feeRowLabel}
            value={dram(0)}
            valueColor={BRAND.primary}
            note="SportsBnB takes nothing"
          />

          <div
            style={{
              marginTop: 10 * unit,
              height: 2 * unit,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${courtGreen(0.7)}, ${courtGreen(0.05)})`,
              transformOrigin: "left center",
              transform: `scaleX(${interpolateSafe(frame, [PAYOUT_DELAY - 8, PAYOUT_DELAY + 16], [0, 1]).toFixed(4)})`,
            }}
          />

          {/* The payout row. Same digits as the price row above it — that is
              the whole claim, and it is checkable on screen. */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginTop: 18 * unit,
              opacity: interpolateSafe(
                frame,
                [PAYOUT_DELAY - 4, PAYOUT_DELAY + 14],
                [0, 1],
              ),
            }}
          >
            <span
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: 21 * unit,
                fontWeight: 600,
                color: BRAND.foreground,
              }}
            >
              {payoutRowLabel}
            </span>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontVariantNumeric: "tabular-nums",
                fontSize: 46 * unit,
                fontWeight: 500,
                letterSpacing: -0.02 * 46 * unit,
                color: BRAND.primary,
                textShadow: `0 0 ${(30 * land).toFixed(1)}px ${courtGreen(0.5 * land)}`,
              }}
            >
              {dram(payoutShown)}
            </span>
          </div>

          <div
            style={{
              marginTop: 16 * unit,
              padding: `${10 * unit}px ${14 * unit}px`,
              borderRadius: 12 * unit,
              backgroundColor: BRAND.primarySoft,
              border: `${1 * unit}px solid ${courtGreen(0.24)}`,
              fontFamily: SANS_FONT,
              fontSize: 15 * unit,
              color: BRAND.foregroundSoft,
              opacity: interpolateSafe(frame, [settled - 10, settled + 12], [0, 1]),
            }}
          >
            100% of the price reaches you. There is no deduction on this
            booking, and there never is one.
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
