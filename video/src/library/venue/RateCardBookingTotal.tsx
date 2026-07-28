/**
 * RateCardBookingTotal — the player-facing total: hours × rate, and that is the
 * whole sum. Renders the checkout summary on /venues/:id → Book, where the
 * absence of a service-fee row is the point being made.
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  Easing,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { StageDressing, TickGlyph } from "./venueChrome";
import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  SANS_FONT,
  SPORTS,
  type SportKey,
  cardSurface,
  clamp01,
  courtGreen,
  eyebrowStyle,
  formatDram,
  groupThousands,
  ink,
  interpolateSafe,
  playerTotal,
  tint,
  useMotionFrame,
} from "./venueKit";

const CANVAS_W = 1080;

export type RateCardBookingTotalProps = {
  venueName: string;
  sport: SportKey;
  /** Hourly rate exactly as listed, in dram. */
  hourlyRate: number;
  /** Hours booked. Halves are allowed; the app sells 30-minute blocks. */
  hours: number;
  /** The slot being paid for, e.g. "Sat 12 Jul · 19:00 – 21:00". */
  slotLabel: string;
  /** The line that replaces the fee row every other marketplace shows. */
  noFeeLine: string;
};

export const rateCardBookingTotalDefaultProps: RateCardBookingTotalProps = {
  venueName: "Ararat Arena",
  sport: "football",
  hourlyRate: 12000,
  hours: 2,
  slotLabel: "Sat 12 Jul · 19:00 – 21:00",
  noFeeLine: "No service fee. No booking fee. Nothing added at checkout.",
};

/**
 * One-way: the sum assembles and then holds. Reduced motion freezes on the
 * LAST frame, where the total is on screen.
 *
 * `playerTotal()` from venueKit does the arithmetic, so the total is
 * `rate × hours` and can never quietly grow a percentage. The struck-through
 * fee row is drawn deliberately: showing a zero is more convincing than
 * omitting a line an Armenian venue-goer has been trained to expect.
 */
export const RateCardBookingTotal: FC<RateCardBookingTotalProps> = ({
  venueName,
  sport,
  hourlyRate,
  hours,
  slotLabel,
  noFeeLine,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const accent = SPORTS[sport].accent;
  const total = playerTotal(hourlyRate, hours);

  const head = spring({
    frame,
    fps,
    delay: 4,
    config: { damping: 22, mass: 0.9, stiffness: 130 },
    durationInFrames: 16,
  });
  const lineIn = (i: number) =>
    spring({
      frame,
      fps,
      delay: 20 + i * 12,
      config: { damping: 22, mass: 0.85, stiffness: 140 },
      durationInFrames: 16,
    });
  const totalIn = spring({
    frame,
    fps,
    delay: 62,
    // Overshoot only here: the total is the answer the whole card is building to.
    config: { damping: 13, mass: 0.8, stiffness: 175 },
    durationInFrames: 22,
  });

  const rolled = interpolateSafe(
    frame,
    [64, 96],
    [0, total],
    Easing.out(Easing.cubic),
  );
  const shownTotal = frame >= 96 ? total : Math.round(rolled / 100) * 100;
  const tick = interpolateSafe(frame, [78, 94], [0, 1], EASE_OUT_EXPO);

  const row = (i: number) => ({
    opacity: clamp01(lineIn(i)),
    transform: `translateY(${14 * unit * (1 - clamp01(lineIn(i)))}px)`,
    display: "flex" as const,
    alignItems: "baseline" as const,
    justifyContent: "space-between" as const,
  });

  const hoursLabel = hours === 1 ? "1 hour" : `${hours} hours`;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(84% 62% at 50% 24%, ${BRAND.surface1} 0%, ${BRAND.background} 76%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(50% 32% at 50% 76%, ${tint(accent, 0.1 * clamp01(totalIn))} 0%, transparent 72%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 96 * unit,
          right: 96 * unit,
          top: height * 0.13,
          bottom: height * 0.13,
          padding: `${48 * unit}px ${50 * unit}px`,
          display: "flex",
          flexDirection: "column",
          ...cardSurface(unit, 30),
        }}
      >
        <div
          style={{
            opacity: clamp01(head),
            transform: `translateY(${12 * unit * (1 - clamp01(head))}px)`,
          }}
        >
          <div style={eyebrowStyle(unit, accent)}>Your booking</div>
          <div
            style={{
              marginTop: 10 * unit,
              fontFamily: DISPLAY_FONT,
              fontSize: 44 * unit,
              fontWeight: 700,
              letterSpacing: -0.04 * 44 * unit,
              color: BRAND.foreground,
            }}
          >
            {venueName}
          </div>
          <div
            style={{
              marginTop: 8 * unit,
              fontFamily: MONO_FONT,
              fontSize: 20 * unit,
              fontVariantNumeric: "tabular-nums",
              color: BRAND.foregroundSoft,
            }}
          >
            {slotLabel}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 22 * unit,
          }}
        >
          <div style={row(0)}>
            <span style={{ fontFamily: SANS_FONT, fontSize: 23 * unit, color: BRAND.foregroundSoft }}>
              {formatDram(hourlyRate)} × {hoursLabel}
            </span>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 32 * unit,
                fontVariantNumeric: "tabular-nums",
                color: BRAND.foreground,
              }}
            >
              {formatDram(total)}
            </span>
          </div>

          {/* The fee row that is always zero. */}
          <div style={row(1)}>
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 23 * unit,
                color: BRAND.mutedForeground,
                textDecoration: "line-through",
                textDecorationColor: BRAND.borderStrong,
              }}
            >
              Service fee
            </span>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 32 * unit,
                fontVariantNumeric: "tabular-nums",
                color: BRAND.mutedForeground,
              }}
            >
              0 ֏
            </span>
          </div>

          <div style={row(2)}>
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 23 * unit,
                color: BRAND.mutedForeground,
                textDecoration: "line-through",
                textDecorationColor: BRAND.borderStrong,
              }}
            >
              Booking fee
            </span>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 32 * unit,
                fontVariantNumeric: "tabular-nums",
                color: BRAND.mutedForeground,
              }}
            >
              0 ֏
            </span>
          </div>

          <div
            style={{
              marginTop: 8 * unit,
              paddingTop: 26 * unit,
              borderTop: `${1 * unit}px solid ${BRAND.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: clamp01(totalIn),
              transform: `translateY(${18 * unit * (1 - clamp01(totalIn))}px)`,
            }}
          >
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 27 * unit,
                fontWeight: 600,
                color: BRAND.foreground,
              }}
            >
              Total
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 14 * unit }}>
              <TickGlyph size={30 * unit} color={accent} draw={tick} weight={3} />
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 62 * unit,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: -0.03 * 62 * unit,
                  color: accent,
                }}
              >
                {groupThousands(shownTotal)} ֏
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12 * unit,
            padding: `${16 * unit}px ${20 * unit}px`,
            borderRadius: 16 * unit,
            backgroundColor: courtGreen(0.09),
            border: `${1 * unit}px solid ${courtGreen(0.3)}`,
            opacity: interpolateSafe(frame, [96, 112], [0, 1]),
          }}
        >
          <TickGlyph size={22 * unit} color={BRAND.primary} weight={3} />
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 19 * unit,
              fontWeight: 500,
              color: BRAND.foregroundSoft,
            }}
          >
            {noFeeLine}
          </span>
        </div>
      </div>

      <AbsoluteFill
        style={{
          background: `radial-gradient(92% 82% at 50% 46%, transparent 46%, ${ink(0.46)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <StageDressing strength={0.65} />
    </AbsoluteFill>
  );
};
