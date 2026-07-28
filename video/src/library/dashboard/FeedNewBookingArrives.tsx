/**
 * FeedNewBookingArrives — a booking landing at the top of the owner's feed
 * while they are looking at /owner-dashboard, and the day total moving with it.
 * One-way: the new row drops in, the rows below shift down by exactly one row
 * height, and the total counts from its old value to its new one, landing exact.
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  ENTER_SPRING,
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
  useMotionFrame,
} from "./dashboardKit";

const CANVAS_W = 720;

export type ArrivingBooking = {
  /** Venue and court. */
  venueName: string;
  /** Slot description. */
  whenLabel: string;
  /** What the owner receives — the full price, no deduction. */
  amount: number;
};

export type ExistingRow = {
  id: string;
  venueName: string;
  whenLabel: string;
  amount: number;
};

export type FeedNewBookingArrivesProps = {
  /** The booking that just came in. */
  arriving: ArrivingBooking;
  /** The rows already in the feed, which slide down to make room. */
  existing: ExistingRow[];
  /** Day total before the new booking, in dram. */
  totalBefore: number;
  /** Mono caps chip on the arriving row. */
  newLabel: string;
  /** Label beside the day total. */
  totalLabel: string;
};

export const feedNewBookingArrivesDefaultProps: FeedNewBookingArrivesProps = {
  arriving: {
    venueName: "Ararat Arena · Court 1",
    whenLabel: "Sat 20:00 – 21:00",
    amount: 16000,
  },
  existing: [
    {
      id: "e1",
      venueName: "Nairi Hall",
      whenLabel: "Sat 18:00 – 19:00",
      amount: 15000,
    },
    {
      id: "e2",
      venueName: "Ararat Arena · Court 2",
      whenLabel: "Sat 17:00 – 18:00",
      amount: 16000,
    },
  ],
  totalBefore: 31000,
  newLabel: "New",
  totalLabel: "Today",
};

const ARRIVE_AT = 14;
const ARRIVE_FRAMES = 26;
const COUNT_AT = ARRIVE_AT + 12;
const COUNT_FRAMES = 46;

export const FeedNewBookingArrives: FC<FeedNewBookingArrivesProps> = ({
  arriving,
  existing,
  totalBefore,
  newLabel,
  totalLabel,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, fps, width } = useVideoConfig();
  // One-way: the settled feed, with the row in it, is the message.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = width / CANVAS_W;

  const rowHeight = 72 * unit;
  const totalAfter = totalBefore + Math.max(0, arriving.amount);

  /**
   * Underdamped — a row arriving should feel like it has mass. The *number*
   * below uses `countTo` instead, which is monotonic: a total that overshoots
   * and walks back is a total nobody believes.
   */
  const arrive = spring({
    frame,
    fps,
    delay: ARRIVE_AT,
    config: ENTER_SPRING,
    durationInFrames: ARRIVE_FRAMES,
  });

  const shownTotal = countTo({
    frame,
    from: totalBefore,
    to: totalAfter,
    delay: COUNT_AT,
    duration: COUNT_FRAMES,
  });
  const settled = COUNT_AT + COUNT_FRAMES;
  const land = interpolateSafe(
    frame,
    [settled - 8, settled + 2, settled + 34],
    [0, 1, 0],
  );

  const Row: FC<{
    venueName: string;
    whenLabel: string;
    amount: number;
    top: number;
    opacity: number;
    highlight: boolean;
  }> = ({ venueName, whenLabel, amount, top, opacity, highlight }) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        height: rowHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `0 ${16 * unit}px`,
        borderRadius: 14 * unit,
        opacity,
        backgroundColor: highlight ? courtGreen(0.08) : "transparent",
        border: `${1 * unit}px solid ${highlight ? courtGreen(0.26) : "transparent"}`,
        boxShadow: highlight
          ? `0 0 ${(18 + 26 * land) * unit}px ${-8 * unit}px ${courtGreen(0.4)}`
          : "none",
      }}
    >
      <div
        style={{ display: "flex", flexDirection: "column", gap: 4 * unit }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 * unit }}>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 16.5 * unit,
              fontWeight: 600,
              color: BRAND.foreground,
            }}
          >
            {venueName}
          </span>
          {highlight ? (
            <span
              style={{
                padding: `${2 * unit}px ${8 * unit}px`,
                borderRadius: 999,
                backgroundColor: BRAND.primary,
                fontFamily: MONO_FONT,
                fontSize: 9.5 * unit,
                textTransform: "uppercase",
                letterSpacing: 0.14 * 9.5 * unit,
                color: BRAND.primaryForeground,
              }}
            >
              {newLabel}
            </span>
          ) : null}
        </div>
        <span
          style={{
            fontFamily: SANS_FONT,
            fontSize: 14 * unit,
            color: muted(0.95),
          }}
        >
          {whenLabel}
        </span>
      </div>
      <span
        style={{
          fontFamily: MONO_FONT,
          fontVariantNumeric: "tabular-nums",
          fontSize: 19 * unit,
          fontWeight: 500,
          color: highlight ? BRAND.primary : BRAND.foreground,
        }}
      >
        {dram(amount)}
      </span>
    </div>
  );

  const listTop = 96 * unit;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <div
        style={{
          position: "absolute",
          inset: 22 * unit,
          ...cardSurface(unit, 22),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 22 * unit,
            right: 22 * unit,
            top: 22 * unit,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <span style={{ ...eyebrowStyle(unit * 1.05, muted(0.9)) }}>
            {totalLabel}
          </span>
          <span
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 34 * unit,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -0.03 * 34 * unit,
              color: BRAND.foreground,
              textShadow: `0 0 ${(24 * land).toFixed(1)}px ${courtGreen(0.5 * land)}`,
            }}
          >
            {dram(shownTotal)}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 22 * unit,
            right: 22 * unit,
            top: 74 * unit,
            height: 1 * unit,
            backgroundColor: hairline(1),
          }}
        />

        <Sequence name="Feed" layout="none">
          <div
            style={{
              position: "absolute",
              left: 22 * unit,
              right: 22 * unit,
              top: listTop,
              bottom: 22 * unit,
            }}
          >
            {/* The arriving row: drops from above its slot and settles into it. */}
            <Row
              venueName={arriving.venueName}
              whenLabel={arriving.whenLabel}
              amount={arriving.amount}
              top={(arrive - 1) * rowHeight}
              opacity={interpolateSafe(
                frame,
                [ARRIVE_AT, ARRIVE_AT + 8],
                [0, 1],
              )}
              highlight
            />

            {/* Everything already there shifts down by exactly one row. */}
            {existing.map((row, i) => (
              <Row
                key={row.id}
                venueName={row.venueName}
                whenLabel={row.whenLabel}
                amount={row.amount}
                top={(i + arrive) * rowHeight}
                opacity={1}
                highlight={false}
              />
            ))}
          </div>
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};
