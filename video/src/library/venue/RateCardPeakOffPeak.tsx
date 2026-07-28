/**
 * RateCardPeakOffPeak — the three-tier hourly rate a venue sets for morning,
 * daytime and evening play, as growing bars with their own price odometers.
 * Runs on /venues/:id under "Rates" and in the owner's pricing editor preview.
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  Easing,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { StageDressing } from "./venueChrome";
import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  SPORTS,
  type SportKey,
  cardSurface,
  clamp01,
  eyebrowStyle,
  formatDram,
  groupThousands,
  ink,
  interpolateSafe,
  tint,
  useMotionFrame,
} from "./venueKit";

const CANVAS_W = 1080;

export type RateTier = {
  /** Row label, e.g. "Off-peak". */
  label: string;
  /** The hours the tier covers, e.g. "07:00 – 16:00". */
  window: string;
  /** Hourly rate in dram. */
  price: number;
};

export type RateCardPeakOffPeakProps = {
  venueName: string;
  /** Drives the accent only. */
  sport: SportKey;
  /** Two to four tiers read best. Bars are scaled against the dearest. */
  tiers: RateTier[];
  /** Frames between one bar starting and the next. */
  staggerFrames: number;
  /** The reassurance under the bars. */
  footnote: string;
};

export const rateCardPeakOffPeakDefaultProps: RateCardPeakOffPeakProps = {
  venueName: "Ararat Arena",
  sport: "football",
  tiers: [
    { label: "Morning", window: "07:00 – 12:00", price: 7000 },
    { label: "Daytime", window: "12:00 – 17:00", price: 9000 },
    { label: "Evening", window: "17:00 – 23:00", price: 12000 },
  ],
  staggerFrames: 14,
  footnote: "Every rate is the final rate. SportsBnB adds nothing on top.",
};

/**
 * One-way: bars grow, figures roll, and the card holds its finished state.
 * Reduced motion freezes on the LAST frame — the point of a rate card is the
 * numbers, and at frame 0 there are none.
 *
 * The bars use `spring()` because a bar arriving at a length has mass; the
 * odometers use `interpolate()` with an eased ramp because a number counting up
 * is a genuinely linear act and a spring would make it stutter backwards.
 */
export const RateCardPeakOffPeak: FC<RateCardPeakOffPeakProps> = ({
  venueName,
  sport,
  tiers,
  staggerFrames,
  footnote,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const accent = SPORTS[sport].accent;

  const rows = tiers.length > 0 ? tiers : rateCardPeakOffPeakDefaultProps.tiers;
  let dearest = 1;
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].price > dearest) {
      dearest = rows[i].price;
    }
  }

  const header = spring({
    frame,
    fps,
    delay: 4,
    config: { damping: 22, mass: 0.9, stiffness: 130 },
    durationInFrames: 16,
  });

  const trackW = width - 300 * unit;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(88% 64% at 50% 22%, ${BRAND.surface1} 0%, ${BRAND.background} 76%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 76 * unit,
          right: 76 * unit,
          top: height * 0.1,
          bottom: height * 0.1,
          padding: `${46 * unit}px ${48 * unit}px`,
          display: "flex",
          flexDirection: "column",
          ...cardSurface(unit, 30),
        }}
      >
        <div
          style={{
            opacity: clamp01(header),
            transform: `translateY(${14 * unit * (1 - clamp01(header))}px)`,
          }}
        >
          <div style={eyebrowStyle(unit, accent)}>Hourly rates</div>
          <div
            style={{
              marginTop: 10 * unit,
              fontFamily: DISPLAY_FONT,
              fontSize: 46 * unit,
              fontWeight: 700,
              letterSpacing: -0.04 * 46 * unit,
              color: BRAND.foreground,
            }}
          >
            {venueName}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 34 * unit,
          }}
        >
          {rows.map((tier, i) => {
            const delay = 16 + i * staggerFrames;
            const grow = spring({
              frame,
              fps,
              delay,
              config: { damping: 200, mass: 1, stiffness: 90 },
              durationInFrames: 26,
            });
            const rolled = interpolateSafe(
              frame,
              [delay + 3, delay + 30],
              [0, tier.price],
              Easing.out(Easing.cubic),
            );
            const settled = frame >= delay + 30;
            const shown = settled ? tier.price : Math.round(rolled / 100) * 100;
            const isTop = tier.price >= dearest;
            const barW = trackW * (tier.price / dearest) * clamp01(grow);

            return (
              <div key={tier.label}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: 12 * unit,
                    opacity: clamp01(grow * 2),
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 14 * unit }}>
                    <span
                      style={{
                        fontFamily: SANS_FONT,
                        fontSize: 26 * unit,
                        fontWeight: 600,
                        color: BRAND.foreground,
                      }}
                    >
                      {tier.label}
                    </span>
                    <span
                      style={{
                        fontFamily: MONO_FONT,
                        fontSize: 17 * unit,
                        fontVariantNumeric: "tabular-nums",
                        color: BRAND.mutedForeground,
                      }}
                    >
                      {tier.window}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: 34 * unit,
                      fontWeight: 500,
                      fontVariantNumeric: "tabular-nums",
                      color: isTop ? accent : BRAND.foreground,
                    }}
                  >
                    {groupThousands(shown)} ֏
                  </span>
                </div>
                <div
                  style={{
                    position: "relative",
                    height: 16 * unit,
                    borderRadius: 999,
                    backgroundColor: BRAND.surface3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: barW,
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${tint(accent, 0.42)} 0%, ${accent} 100%)`,
                      boxShadow: isTop ? `0 0 ${22 * unit}px ${tint(accent, 0.45)}` : undefined,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 18 * unit,
            paddingTop: 22 * unit,
            borderTop: `${1 * unit}px solid ${BRAND.border}`,
            display: "flex",
            alignItems: "center",
            gap: 12 * unit,
            opacity: interpolateSafe(
              frame,
              [16 + rows.length * staggerFrames + 18, 16 + rows.length * staggerFrames + 34],
              [0, 1],
            ),
          }}
        >
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 13 * unit,
              fontWeight: 500,
              letterSpacing: 0.16 * 13 * unit,
              textTransform: "uppercase",
              color: BRAND.primary,
              whiteSpace: "nowrap",
            }}
          >
            0% commission
          </span>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 19 * unit,
              color: BRAND.foregroundSoft,
            }}
          >
            {footnote}
          </span>
        </div>
      </div>

      {/* The dearest slot, called out once so the card has a takeaway. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: height * 0.1 - 46 * unit,
          textAlign: "center",
          fontFamily: SANS_FONT,
          fontSize: 18 * unit,
          color: BRAND.mutedForeground,
          opacity: interpolateSafe(frame, [durationInFrames - 40, durationInFrames - 24], [0, 1]),
        }}
      >
        Peak evening play tops out at {formatDram(dearest)} per hour
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
