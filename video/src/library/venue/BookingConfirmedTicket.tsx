/**
 * BookingConfirmedTicket — the confirmed booking as a tear-off court ticket
 * rising into frame, stub, code and all. The share card a player screenshots
 * after checkout, and the artwork on the /bookings/:id receipt.
 */

import type { FC } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { SportChip, StageDressing, TickGlyph } from "./venueChrome";
import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  SANS_FONT,
  SPORTS,
  type SportKey,
  chalk,
  clamp01,
  courtGreen,
  formatDram,
  hashInt,
  ink,
  interpolateSafe,
  mix,
  playerTotal,
  tint,
  useMotionFrame,
} from "./venueKit";

const CANVAS_W = 1080;

export type BookingConfirmedTicketProps = {
  venueName: string;
  /** City line on the stub. */
  city: string;
  /** Day, as printed on the ticket. */
  dateLabel: string;
  /** Time range, as printed on the ticket. */
  timeLabel: string;
  /** Booking reference. Shown in the stub and encoded in the block pattern. */
  reference: string;
  /** Hourly rate in dram. */
  hourlyRate: number;
  /** Hours booked. */
  hours: number;
  /** Which sport the chip and accent come from. */
  sport: SportKey;
};

export const bookingConfirmedTicketDefaultProps: BookingConfirmedTicketProps = {
  venueName: "Padel Point Arabkir",
  city: "Yerevan",
  dateLabel: "Sat 14 Dec",
  timeLabel: "19:00 – 20:00",
  reference: "SB-4K9Q2",
  hourlyRate: 9000,
  hours: 1,
  sport: "padel",
};

/**
 * One-way: the ticket rises, the perforation tears and the stub settles. It
 * ends on a finished ticket and holds there, so reduced motion freezes on the
 * LAST frame — a ticket that has not arrived yet says nothing to the player.
 *
 * The amount is `playerTotal(hourlyRate, hours)`, the same helper the checkout
 * uses: rate × hours, no fee, no service charge, no rounding surprise. The
 * scan block is a deterministic `hashInt` pattern seeded off the reference, not
 * a fetched QR image — this folder makes no network requests.
 */
export const BookingConfirmedTicket: FC<BookingConfirmedTicketProps> = ({
  venueName,
  city,
  dateLabel,
  timeLabel,
  reference,
  hourlyRate,
  hours,
  sport,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const meta = SPORTS[sport];
  const accent = meta.accent;
  const hoursSafe = Math.max(1, hours);
  const total = playerTotal(hourlyRate, hoursSafe);

  /* ── Beats ──────────────────────────────────────────────────────────── */
  const RISE_AT = 6;
  const TEAR_AT = RISE_AT + 20;
  const STUB_AT = TEAR_AT + 6;
  const TICK_AT = STUB_AT + 10;

  const rise = clamp01(
    spring({
      frame,
      fps,
      delay: RISE_AT,
      config: { damping: 21, mass: 1, stiffness: 130 },
      durationInFrames: 24,
    }),
  );
  const tear = interpolateSafe(
    frame,
    [TEAR_AT, TEAR_AT + 16],
    [0, 1],
    EASE_OUT_EXPO,
  );
  const stub = clamp01(
    spring({
      frame,
      fps,
      delay: STUB_AT,
      config: { damping: 16, mass: 0.85, stiffness: 155 },
      durationInFrames: 22,
    }),
  );
  const tick = interpolateSafe(
    frame,
    [TICK_AT, TICK_AT + 14],
    [0, 1],
    EASE_OUT_EXPO,
  );

  /** Seed derived from the reference so a given booking always scans alike. */
  let refSeed = 7;
  for (let i = 0; i < reference.length; i += 1) {
    refSeed = refSeed + reference.charCodeAt(i) * (i + 3);
  }

  const ticketX = 96 * unit;
  const ticketW = width - ticketX * 2;
  const ticketTop = height * 0.16;
  const bodyH = height * 0.4;
  const stubH = height * 0.2;

  const blocks: number[] = [];
  for (let i = 0; i < 49; i += 1) {
    blocks.push(i);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(86% 64% at 50% 30%, ${BRAND.surface1} 0%, ${BRAND.background} 78%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(46% 32% at 50% 40%, ${tint(accent, 0.12 * rise)} 0%, transparent 74%)`,
        }}
      />

      {/* Ticket body */}
      <div
        style={{
          position: "absolute",
          left: ticketX,
          top: ticketTop,
          width: ticketW,
          height: bodyH,
          padding: `${36 * unit}px ${38 * unit}px`,
          borderRadius: `${24 * unit}px ${24 * unit}px ${6 * unit}px ${6 * unit}px`,
          backgroundColor: BRAND.card,
          border: `${1 * unit}px solid ${BRAND.borderStrong}`,
          boxShadow: `0 ${24 * unit}px ${52 * unit}px ${-18 * unit}px ${ink(0.92)}`,
          opacity: rise,
          transform: `translateY(${60 * unit * (1 - rise)}px)`,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <SportChip label={meta.label} accent={accent} unit={unit} />
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 15 * unit,
              letterSpacing: 0.16 * 15 * unit,
              textTransform: "uppercase",
              color: BRAND.mutedForeground,
            }}
          >
            {reference}
          </span>
        </div>

        <div>
          <div
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: (venueName.length > 20 ? 44 : 54) * unit,
              fontWeight: 700,
              letterSpacing: -0.04 * 54 * unit,
              lineHeight: 1.03,
              color: BRAND.foreground,
            }}
          >
            {venueName}
          </div>
          <div
            style={{
              marginTop: 10 * unit,
              fontFamily: SANS_FONT,
              fontSize: 22 * unit,
              color: BRAND.mutedForeground,
            }}
          >
            {city}, Armenia · {meta.unitLabel}
          </div>
        </div>

        <div style={{ display: "flex", gap: 40 * unit }}>
          <div>
            <div
              style={{
                fontFamily: MONO_FONT,
                fontSize: 12 * unit,
                letterSpacing: 0.2 * 12 * unit,
                textTransform: "uppercase",
                color: BRAND.mutedForeground,
              }}
            >
              Date
            </div>
            <div
              style={{
                marginTop: 8 * unit,
                fontFamily: SANS_FONT,
                fontSize: 28 * unit,
                fontWeight: 600,
                color: BRAND.foreground,
              }}
            >
              {dateLabel}
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: MONO_FONT,
                fontSize: 12 * unit,
                letterSpacing: 0.2 * 12 * unit,
                textTransform: "uppercase",
                color: BRAND.mutedForeground,
              }}
            >
              Time
            </div>
            <div
              style={{
                marginTop: 8 * unit,
                fontFamily: MONO_FONT,
                fontSize: 28 * unit,
                fontVariantNumeric: "tabular-nums",
                color: BRAND.foreground,
              }}
            >
              {timeLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Perforation. The tear widens the gap once and then holds. */}
      <div
        style={{
          position: "absolute",
          left: ticketX,
          top: ticketTop + bodyH,
          width: ticketW,
          height: 26 * unit,
          opacity: rise,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            width: 26 * unit,
            height: 26 * unit,
            borderRadius: "50%",
            backgroundColor: BRAND.background,
            transform: `translateX(${-13 * unit}px)`,
          }}
        />
        <div
          style={{
            flex: 1,
            height: 2 * unit,
            margin: `0 ${6 * unit}px`,
            background: `repeating-linear-gradient(90deg, ${chalk(0.26)} 0px, ${chalk(0.26)} ${10 * unit}px, transparent ${10 * unit}px, transparent ${20 * unit}px)`,
            opacity: mix(0.35, 1, tear),
          }}
        />
        <div
          style={{
            width: 26 * unit,
            height: 26 * unit,
            borderRadius: "50%",
            backgroundColor: BRAND.background,
            transform: `translateX(${13 * unit}px)`,
          }}
        />
      </div>

      {/* Stub */}
      <div
        style={{
          position: "absolute",
          left: ticketX,
          top: ticketTop + bodyH + 26 * unit + 10 * unit * tear,
          width: ticketW,
          height: stubH,
          padding: `${30 * unit}px ${38 * unit}px`,
          borderRadius: `${6 * unit}px ${6 * unit}px ${24 * unit}px ${24 * unit}px`,
          backgroundColor: BRAND.surface2,
          border: `${1 * unit}px solid ${BRAND.borderStrong}`,
          boxShadow: `0 ${18 * unit}px ${40 * unit}px ${-16 * unit}px ${ink(0.9)}`,
          opacity: stub,
          transform: `translateY(${34 * unit * (1 - stub)}px)`,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 28 * unit,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: MONO_FONT,
              fontSize: 12 * unit,
              letterSpacing: 0.2 * 12 * unit,
              textTransform: "uppercase",
              color: BRAND.mutedForeground,
            }}
          >
            Paid in full
          </div>
          <div
            style={{
              marginTop: 10 * unit,
              display: "flex",
              alignItems: "center",
              gap: 14 * unit,
            }}
          >
            <TickGlyph
              size={32 * unit}
              color={BRAND.primary}
              draw={tick}
              weight={3}
            />
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 56 * unit,
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: -0.03 * 56 * unit,
                color: BRAND.primary,
                lineHeight: 1,
              }}
            >
              {formatDram(total)}
            </span>
          </div>
          <div
            style={{
              marginTop: 12 * unit,
              fontFamily: SANS_FONT,
              fontSize: 18 * unit,
              color: BRAND.mutedForeground,
            }}
          >
            {formatDram(hourlyRate)} × {hoursSafe}{" "}
            {hoursSafe === 1 ? "hour" : "hours"} · no fees added
          </div>
        </div>

        {/* Scan block. Deterministic from the reference; never fetched. */}
        <div
          style={{
            width: 132 * unit,
            height: 132 * unit,
            padding: 8 * unit,
            borderRadius: 12 * unit,
            backgroundColor: BRAND.foreground,
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridTemplateRows: "repeat(7, 1fr)",
            gap: 2 * unit,
            opacity: clamp01(
              interpolateSafe(frame, [STUB_AT + 6, STUB_AT + 20], [0, 1]),
            ),
            flexShrink: 0,
            boxSizing: "border-box",
          }}
        >
          {blocks.map((i) => {
            const corner =
              (i % 7 < 2 && Math.floor(i / 7) < 2) ||
              (i % 7 > 4 && Math.floor(i / 7) < 2) ||
              (i % 7 < 2 && Math.floor(i / 7) > 4);
            const on = corner || hashInt(i, 2, refSeed) === 1;
            return (
              <div
                key={i}
                style={{
                  backgroundColor: on ? BRAND.background : "transparent",
                  borderRadius: 1.5 * unit,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Reassurance line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 62 * unit,
          textAlign: "center",
          opacity: clamp01(
            interpolateSafe(frame, [TICK_AT + 8, TICK_AT + 22], [0, 1]),
          ),
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12 * unit,
            padding: `${14 * unit}px ${22 * unit}px`,
            borderRadius: 999,
            backgroundColor: courtGreen(0.1),
            border: `${1 * unit}px solid ${courtGreen(0.3)}`,
            fontFamily: SANS_FONT,
            fontSize: 19 * unit,
            fontWeight: 500,
            color: BRAND.foregroundSoft,
          }}
        >
          Show this at the gate. The venue keeps 100% of what you paid.
        </span>
      </div>

      <StageDressing strength={0.6} />
    </AbsoluteFill>
  );
};
