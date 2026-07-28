/**
 * FeedBookingsStagger — the "Recent Bookings" list on /owner-dashboard as it
 * deals itself in, mirroring `feedRowVariants` on the real page.
 * One-way: rows arrive on a 45ms stagger capped at the eighth, exactly as
 * FEED_STAGGER_STEP / FEED_STAGGER_CAP do in OwnerOverviewPage.
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
  EASE_OUT_EXPO,
  FEED_STAGGER_CAP,
  FEED_STAGGER_STEP,
  MONO_FONT,
  SANS_FONT,
  cardSurface,
  courtGreen,
  dram,
  eyebrowStyle,
  hairline,
  interpolateSafe,
  muted,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS_W = 720;

export type FeedBooking = {
  /** Stable key. */
  id: string;
  /** Venue the slot belongs to. */
  venueName: string;
  /** "Today at 19:00", "Tomorrow at 08:00" — as the page formats it. */
  whenLabel: string;
  /** What the owner receives. Zero commission, so this is the price itself. */
  amount: number;
  /** Badge text — the booking status descriptor's label. */
  status: string;
};

export type FeedBookingsStaggerProps = {
  /** Rows, soonest first. The overview slices its feed to five. */
  bookings: FeedBooking[];
  /** Card heading. */
  title: string;
  /** Right-hand link text in the header. */
  actionLabel: string;
};

export const feedBookingsStaggerDefaultProps: FeedBookingsStaggerProps = {
  bookings: [
    {
      id: "b1",
      venueName: "Ararat Arena · Court 2",
      whenLabel: "Today at 19:00",
      amount: 16000,
      status: "Confirmed",
    },
    {
      id: "b2",
      venueName: "Ararat Arena · Court 1",
      whenLabel: "Today at 21:00",
      amount: 16000,
      status: "Confirmed",
    },
    {
      id: "b3",
      venueName: "Nairi Hall",
      whenLabel: "Tomorrow at 08:00",
      amount: 12000,
      status: "Confirmed",
    },
    {
      id: "b4",
      venueName: "Nairi Hall",
      whenLabel: "Tomorrow at 20:00",
      amount: 15000,
      status: "Pending",
    },
    {
      id: "b5",
      venueName: "Ararat Arena · Court 2",
      whenLabel: "Sat at 18:00",
      amount: 16000,
      status: "Confirmed",
    },
  ],
  title: "Recent bookings",
  actionLabel: "View all",
};

/** The header lands first; rows are measured from here. */
const ROWS_AT = 18;

/** A calendar glyph, drawn rather than a font the render box may not have. */
const CalendarIcon: FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <g
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x={3.2} y={5} width={17.6} height={15.2} rx={2.6} />
      <path d="M3.2 9.6H20.8" />
      <path d="M8 3.4V6.4" />
      <path d="M16 3.4V6.4" />
    </g>
  </svg>
);

export const FeedBookingsStagger: FC<FeedBookingsStaggerProps> = ({
  bookings,
  title,
  actionLabel,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, fps, width } = useVideoConfig();
  // One-way: the settled list is the message.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = width / CANVAS_W;

  /** The page's stagger, in frames: 45ms per sibling, capped at the eighth. */
  const rowDelay = (index: number): number =>
    ROWS_AT + Math.min(index, FEED_STAGGER_CAP) * FEED_STAGGER_STEP * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(86% 60% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 74%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 26 * unit,
          right: 26 * unit,
          top: 26 * unit,
          bottom: 26 * unit,
          ...cardSurface(unit, 22),
          padding: `${26 * unit}px ${26 * unit}px`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: interpolateSafe(frame, [0, 16], [0, 1]),
          }}
        >
          <span
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 24 * unit,
              fontWeight: 700,
              letterSpacing: -0.025 * 24 * unit,
              color: BRAND.foreground,
            }}
          >
            {title}
          </span>
          <span
            style={{
              ...eyebrowStyle(unit * 0.95, muted(0.85)),
            }}
          >
            {actionLabel}
          </span>
        </div>

        <div
          style={{
            marginTop: 18 * unit,
            height: 1 * unit,
            backgroundColor: hairline(1),
            transformOrigin: "left center",
            transform: `scaleX(${interpolateSafe(frame, [4, 24], [0, 1], EASE_OUT_EXPO).toFixed(4)})`,
          }}
        />

        <Sequence name="Rows" layout="none">
          <div style={{ marginTop: 6 * unit }}>
            {bookings.map((booking, i) => {
              const delay = rowDelay(i);
              const enter = interpolateSafe(
                frame,
                [delay, delay + 0.35 * fps],
                [0, 1],
                EASE_OUT_EXPO,
              );
              const pending = booking.status.toLowerCase() === "pending";
              return (
                <div key={booking.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: 16 * unit,
                      paddingBottom: 16 * unit,
                      opacity: enter,
                      transform: `translateY(${((1 - enter) * 8 * unit).toFixed(2)}px)`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14 * unit,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 42 * unit,
                          height: 42 * unit,
                          borderRadius: 12 * unit,
                          backgroundColor: courtGreen(0.1),
                          border: `${1 * unit}px solid ${courtGreen(0.2)}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <CalendarIcon size={21 * unit} color={BRAND.primary} />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4 * unit,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: SANS_FONT,
                            fontSize: 17 * unit,
                            fontWeight: 600,
                            color: BRAND.foreground,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {booking.venueName}
                        </span>
                        <span
                          style={{
                            fontFamily: SANS_FONT,
                            fontSize: 14.5 * unit,
                            color: muted(0.95),
                          }}
                        >
                          {booking.whenLabel}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 6 * unit,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: MONO_FONT,
                          fontVariantNumeric: "tabular-nums",
                          fontSize: 19 * unit,
                          fontWeight: 500,
                          color: BRAND.foreground,
                        }}
                      >
                        {dram(booking.amount)}
                      </span>
                      <span
                        style={{
                          padding: `${3 * unit}px ${9 * unit}px`,
                          borderRadius: 999,
                          backgroundColor: pending
                            ? BRAND.surface3
                            : BRAND.primarySoft,
                          border: `${1 * unit}px solid ${pending ? hairline(1) : courtGreen(0.26)}`,
                          fontFamily: MONO_FONT,
                          fontSize: 10.5 * unit,
                          textTransform: "uppercase",
                          letterSpacing: 0.12 * 10.5 * unit,
                          color: pending ? muted(0.95) : BRAND.primary,
                        }}
                      >
                        {booking.status}
                      </span>
                    </div>
                  </div>

                  {i < bookings.length - 1 ? (
                    <div
                      style={{
                        height: 1 * unit,
                        backgroundColor: hairline(0.7),
                        opacity: enter,
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </Sequence>

        {/* Footer note: what the column of figures actually means. */}
        <div
          style={{
            position: "absolute",
            left: 26 * unit,
            right: 26 * unit,
            bottom: 22 * unit,
            fontFamily: SANS_FONT,
            fontSize: 13.5 * unit,
            color: muted(0.8),
            opacity: interpolateSafe(
              frame,
              [rowDelay(bookings.length), rowDelay(bookings.length) + 18],
              [0, 1],
            ),
          }}
        >
          Amounts are what reaches you — SportsBnB deducts nothing.
        </div>
      </div>
    </AbsoluteFill>
  );
};
