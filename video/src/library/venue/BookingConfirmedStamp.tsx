/**
 * BookingConfirmedStamp — the moment the court is yours: the tick draws itself
 * into a ring, the slot stamps down and the total settles under it. The success
 * state on /bookings/:id, played once.
 */

import type { FC } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { StageDressing, TickGlyph } from "./venueChrome";
import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  SANS_FONT,
  SPORTS,
  TAU,
  type SportKey,
  chalk,
  clamp01,
  courtGreen,
  formatDram,
  hashRange,
  ink,
  interpolateSafe,
  mix,
  playerTotal,
  tint,
  useMotionFrame,
} from "./venueKit";

const CANVAS_W = 1080;

export type BookingConfirmedStampProps = {
  venueName: string;
  /** The slot, as the confirmation email prints it. */
  slotLabel: string;
  /** Hourly rate in dram. */
  hourlyRate: number;
  /** Hours booked. The total is rate × hours, with nothing added. */
  hours: number;
  /** Headline over the details. */
  headline: string;
  /** Reassurance line under the total. */
  footnote: string;
  /** Drives the accent only. */
  sport: SportKey;
};

export const bookingConfirmedStampDefaultProps: BookingConfirmedStampProps = {
  venueName: "Ararat Arena",
  slotLabel: "Sat 14 Dec · 19:00–20:00",
  hourlyRate: 12000,
  hours: 1,
  headline: "Booking confirmed",
  footnote: "Paid in full. Nothing added at checkout, nothing owed on arrival.",
  sport: "football",
};

/**
 * One-way: nothing, then a confirmed booking that holds. Reduced motion freezes
 * on the LAST frame, because the finished state IS the message — freezing this
 * one at frame 0 would show an empty screen and tell the player nothing.
 *
 * The total is `playerTotal(hourlyRate, hours)` from venueKit rather than a
 * literal, so this screen can never drift from the product fact: the player
 * pays the listed price and not one dram more.
 *
 * The tick is a `strokeDashoffset` draw-on over the exact 24-unit path length,
 * so it finishes precisely closed. The confetti flecks scatter from
 * `hashRange`, never `Math.random`.
 */
export const BookingConfirmedStamp: FC<BookingConfirmedStampProps> = ({
  venueName,
  slotLabel,
  hourlyRate,
  hours,
  headline,
  footnote,
  sport,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const accent = SPORTS[sport].accent;
  const total = playerTotal(hourlyRate, Math.max(1, hours));

  /* ── Beats ──────────────────────────────────────────────────────────── */
  const RING_AT = 6;
  const TICK_AT = RING_AT + 12;
  const TICK_FOR = 16;
  const HEAD_AT = TICK_AT + 8;
  const CARD_AT = HEAD_AT + 10;
  const TOTAL_AT = CARD_AT + 12;

  const ringIn = clamp01(
    spring({
      frame,
      fps,
      delay: RING_AT,
      config: { damping: 13, mass: 0.8, stiffness: 170 },
      durationInFrames: 20,
    }),
  );
  const draw = interpolateSafe(
    frame,
    [TICK_AT, TICK_AT + TICK_FOR],
    [0, 1],
    EASE_OUT_EXPO,
  );
  const head = clamp01(
    spring({
      frame,
      fps,
      delay: HEAD_AT,
      config: { damping: 20, mass: 0.9, stiffness: 145 },
      durationInFrames: 18,
    }),
  );
  const card = clamp01(
    spring({
      frame,
      fps,
      delay: CARD_AT,
      config: { damping: 22, mass: 0.9, stiffness: 135 },
      durationInFrames: 20,
    }),
  );
  const totalIn = clamp01(
    spring({
      frame,
      fps,
      delay: TOTAL_AT,
      // The one overshoot in the file: the total landing is the payoff.
      config: { damping: 13, mass: 0.8, stiffness: 175 },
      durationInFrames: 22,
    }),
  );

  // Halo flash behind the ring. Opens once, fades once.
  const flash = interpolateSafe(
    frame,
    [TICK_AT + 4, TICK_AT + 16, TICK_AT + 40],
    [0, 1, 0],
    EASE_OUT_EXPO,
  );

  const ringR = 84 * unit;
  const ringCx = width / 2;
  const ringCy = height * 0.26;

  const flecks: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(88% 62% at 50% 24%, ${BRAND.surface1} 0%, ${BRAND.background} 78%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(44% 30% at 50% 26%, ${courtGreen(0.16 * clamp01(ringIn))} 0%, transparent 72%)`,
        }}
      />

      {/* Flecks. Deterministic scatter, thrown outward once. */}
      {flecks.map((i) => {
        const angle = hashRange(i * 3 + 1, 0, TAU, 41);
        const dist = mix(90, 260, hashRange(i * 3 + 2, 0, 1, 41)) * unit;
        const travel = interpolateSafe(
          frame,
          [TICK_AT + 2, TICK_AT + 34],
          [0.1, 1],
          EASE_OUT_EXPO,
        );
        const alpha = interpolateSafe(
          frame,
          [TICK_AT + 2, TICK_AT + 16, TICK_AT + 44],
          [0, 0.9, 0],
        );
        if (alpha <= 0) {
          return null;
        }
        const size = mix(5, 11, hashRange(i * 3 + 3, 0, 1, 41)) * unit;
        return (
          <div
            key={`f${i}`}
            style={{
              position: "absolute",
              left: ringCx + Math.cos(angle) * dist * travel - size / 2,
              top: ringCy + Math.sin(angle) * dist * travel - size / 2,
              width: size,
              height: size,
              borderRadius: 2 * unit,
              backgroundColor: tint(
                i % 3 === 0 ? BRAND.warning : accent,
                alpha,
              ),
              transform: `rotate(${angle}rad)`,
            }}
          />
        );
      })}

      {/* Ring + tick */}
      <div
        style={{
          position: "absolute",
          left: ringCx - ringR,
          top: ringCy - ringR,
          width: ringR * 2,
          height: ringR * 2,
          borderRadius: "50%",
          backgroundColor: courtGreen(0.12),
          border: `${3 * unit}px solid ${BRAND.primary}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: ringIn,
          transform: `scale(${mix(0.7, 1, ringIn)})`,
          boxShadow: `0 0 ${60 * unit * flash}px ${courtGreen(0.5 * flash)}`,
        }}
      >
        <TickGlyph
          size={ringR * 1.1}
          color={BRAND.primary}
          draw={draw}
          weight={2.8}
        />
      </div>

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: ringCy + ringR + 52 * unit,
          textAlign: "center",
          opacity: head,
          transform: `translateY(${18 * unit * (1 - head)}px)`,
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 64 * unit,
            fontWeight: 700,
            letterSpacing: -0.045 * 64 * unit,
            color: BRAND.foreground,
          }}
        >
          {headline}
        </div>
      </div>

      {/* Detail card */}
      <div
        style={{
          position: "absolute",
          left: 92 * unit,
          right: 92 * unit,
          bottom: 140 * unit,
          padding: `${34 * unit}px ${36 * unit}px`,
          borderRadius: 26 * unit,
          backgroundColor: BRAND.card,
          border: `${1 * unit}px solid ${BRAND.borderStrong}`,
          boxShadow: `0 ${22 * unit}px ${48 * unit}px ${-16 * unit}px ${ink(0.9)}`,
          opacity: card,
          transform: `translateY(${26 * unit * (1 - card)}px)`,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 13 * unit,
            fontWeight: 500,
            letterSpacing: 0.2 * 13 * unit,
            textTransform: "uppercase",
            color: tint(accent, 0.95),
          }}
        >
          Your court
        </div>
        <div
          style={{
            marginTop: 12 * unit,
            fontFamily: DISPLAY_FONT,
            fontSize: 42 * unit,
            fontWeight: 700,
            letterSpacing: -0.04 * 42 * unit,
            color: BRAND.foreground,
          }}
        >
          {venueName}
        </div>
        <div
          style={{
            marginTop: 10 * unit,
            fontFamily: SANS_FONT,
            fontSize: 24 * unit,
            fontWeight: 500,
            color: BRAND.foregroundSoft,
          }}
        >
          {slotLabel}
        </div>

        <div
          style={{
            marginTop: 26 * unit,
            paddingTop: 26 * unit,
            borderTop: `${1 * unit}px solid ${BRAND.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: totalIn,
            transform: `translateY(${16 * unit * (1 - totalIn)}px)`,
          }}
        >
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 26 * unit,
              fontWeight: 600,
              color: BRAND.foreground,
            }}
          >
            Paid
          </span>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 58 * unit,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -0.03 * 58 * unit,
              color: BRAND.primary,
            }}
          >
            {formatDram(total)}
          </span>
        </div>
      </div>

      {/* Footnote */}
      <div
        style={{
          position: "absolute",
          left: 92 * unit,
          right: 92 * unit,
          bottom: 66 * unit,
          textAlign: "center",
          opacity: clamp01(
            interpolateSafe(frame, [TOTAL_AT + 10, TOTAL_AT + 24], [0, 1]),
          ),
          fontFamily: SANS_FONT,
          fontSize: 20 * unit,
          fontWeight: 500,
          color: BRAND.mutedForeground,
        }}
      >
        {footnote}
      </div>

      <div
        style={{
          position: "absolute",
          left: 160 * unit,
          right: 160 * unit,
          top: ringCy + ringR + 34 * unit,
          height: 2 * unit,
          opacity: head,
          background: `linear-gradient(90deg, transparent, ${chalk(0.28)}, transparent)`,
        }}
      />

      <StageDressing strength={0.65} />
    </AbsoluteFill>
  );
};
