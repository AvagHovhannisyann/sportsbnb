/**
 * EarningsTotalCounter — the "Total Revenue" hero figure on /owner-dashboard,
 * blown up to a card an owner can be shown at a glance.
 * One-way: the figure counts up once under `countTo` and lands on the exact
 * total, then holds. Reduced motion freezes on the settled figure.
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
  SANS_FONT,
  ZERO_COMMISSION_NOTE,
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
  numeralStyle,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS = 1080;

export type EarningsTotalCounterProps = {
  /** The total the counter lands on, in dram. */
  total: number;
  /** Where it starts. Non-zero when a refetch nudged the figure. */
  from: number;
  /** Mono caps above the numeral. */
  label: string;
  /** The period the figure covers. */
  periodLabel: string;
  /** Bookings behind the total — stated, so the figure has a denominator. */
  bookings: number;
  /** Month-over-month change, already computed. Empty string hides the chip. */
  change: string;
};

export const earningsTotalCounterDefaultProps: EarningsTotalCounterProps = {
  total: 1620000,
  from: 0,
  label: "Total revenue",
  periodLabel: "Last 30 days · all venues",
  bookings: 116,
  change: "+12%",
};

const COUNT_DELAY = 18;
const COUNT_DURATION = 132;
const COUNT_END = COUNT_DELAY + COUNT_DURATION;

export const EarningsTotalCounter: FC<EarningsTotalCounterProps> = ({
  total,
  from,
  label,
  periodLabel,
  bookings,
  change,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the settled total, which is the message.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = Math.min(width, height) / CANVAS;

  const shown = countTo({
    frame,
    from,
    to: total,
    delay: COUNT_DELAY,
    duration: COUNT_DURATION,
  });
  const progress = countProgress({
    frame,
    delay: COUNT_DELAY,
    duration: COUNT_DURATION,
  });

  // A short flare as the figure lands, clamped to zero either side.
  const land = interpolateSafe(
    frame,
    [COUNT_END - 10, COUNT_END + 2, COUNT_END + 40],
    [0, 1, 0],
  );

  const bookingsShown = Math.round(
    countTo({
      frame,
      from: 0,
      to: bookings,
      delay: COUNT_DELAY + 10,
      duration: COUNT_DURATION - 20,
    }),
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(78% 62% at 50% 24%, ${BRAND.surface1} 0%, ${BRAND.background} 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(46% 34% at 50% 40%, ${courtGreen(0.09 + 0.1 * land)} 0%, transparent 72%)`,
        }}
      />

      <Sequence name="Figure" layout="none">
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 80 * unit,
          }}
        >
          <div
            style={{
              ...eyebrowStyle(unit * 1.3),
              opacity: interpolateSafe(frame, [0, 16], [0, 1]),
            }}
          >
            {label}
          </div>

          <div
            style={{
              ...numeralStyle(unit, 116),
              marginTop: 26 * unit,
              textShadow: `0 0 ${(46 * land).toFixed(1)}px ${courtGreen(0.55 * land)}`,
            }}
          >
            {dram(shown)}
          </div>

          <div
            style={{
              marginTop: 22 * unit,
              fontFamily: SANS_FONT,
              fontSize: 20 * unit,
              color: BRAND.foregroundSoft,
              opacity: interpolateSafe(frame, [8, 26], [0, 1]),
            }}
          >
            {periodLabel}
          </div>

          {/* The bar is driven by the *same* progress as the numeral, so the
              two are one motion rather than two that happen to agree. */}
          <div
            style={{
              position: "relative",
              marginTop: 44 * unit,
              width: 560 * unit,
              height: 8 * unit,
              borderRadius: 999,
              backgroundColor: BRAND.input,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${(progress * 100).toFixed(3)}%`,
                borderRadius: 999,
                background: `linear-gradient(90deg, ${courtGreen(0.5)}, ${BRAND.primary})`,
                boxShadow: `0 0 ${(16 + 22 * land).toFixed(1)}px ${-2 * unit}px ${courtGreen(0.6)}`,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14 * unit,
              marginTop: 40 * unit,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8 * unit,
                padding: `${9 * unit}px ${16 * unit}px`,
                borderRadius: 999,
                backgroundColor: BRAND.surface2,
                border: `${1 * unit}px solid ${hairline(1)}`,
                opacity: interpolateSafe(frame, [COUNT_DELAY, COUNT_DELAY + 18], [0, 1]),
              }}
            >
              <span
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontSize: 20 * unit,
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
                  fontSize: 15 * unit,
                  color: muted(0.95),
                }}
              >
                bookings
              </span>
            </div>

            {change.length > 0 ? (
              <div
                style={{
                  padding: `${9 * unit}px ${16 * unit}px`,
                  borderRadius: 999,
                  backgroundColor: BRAND.primarySoft,
                  border: `${1 * unit}px solid ${courtGreen(0.28)}`,
                  fontFamily: DISPLAY_FONT,
                  fontSize: 17 * unit,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  color: BRAND.primary,
                  opacity: interpolateSafe(
                    frame,
                    [COUNT_END - 18, COUNT_END + 2],
                    [0, 1],
                  ),
                }}
              >
                {change}
              </div>
            ) : null}
          </div>

          {/* The product fact, stated rather than implied. There is no fee
              line above because there is no fee. */}
          <div
            style={{
              marginTop: 52 * unit,
              display: "flex",
              alignItems: "center",
              gap: 10 * unit,
              opacity: interpolateSafe(
                frame,
                [COUNT_END - 6, COUNT_END + 16],
                [0, 1],
              ),
            }}
          >
            <div
              style={{
                width: 7 * unit,
                height: 7 * unit,
                borderRadius: 999,
                backgroundColor: BRAND.primary,
              }}
            />
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 17 * unit,
                color: chalk(0.78),
              }}
            >
              {ZERO_COMMISSION_NOTE}
            </span>
          </div>
        </div>
      </Sequence>

      <div
        style={{
          position: "absolute",
          left: width * 0.14,
          right: width * 0.14,
          top: height * 0.5 + 172 * unit,
          height: 1 * unit,
          background: `linear-gradient(90deg, transparent, ${hairline(1)} 50%, transparent)`,
        }}
      />

      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 92% at 50% 44%, transparent 46%, ${ink(0.5)} 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
