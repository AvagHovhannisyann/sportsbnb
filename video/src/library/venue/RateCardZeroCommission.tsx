/**
 * RateCardZeroCommission — the owner-facing rate card: what you list is what
 * you bank, because SportsBnB's cut is structurally zero. Runs on the
 * /owner/pricing panel and as the standalone card in owner acquisition decks.
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { StageDressing, TickGlyph } from "./venueChrome";
import {
  BRAND,
  COMMISSION_RATE,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  SANS_FONT,
  cardSurface,
  chalk,
  clamp01,
  courtGreen,
  eyebrowStyle,
  formatDram,
  ink,
  interpolateSafe,
  ownerPayout,
  useMotionFrame,
} from "./venueKit";

const CANVAS_W = 1080;

export type RateCardZeroCommissionProps = {
  /** The hourly rate the owner types into the listing form, in dram. */
  listedPrice: number;
  /** Venue the card is about. */
  venueName: string;
  /** Kicker above the figures. */
  eyebrow: string;
  /** The line under the payout. */
  footnote: string;
  /** Frames between the two rows resolving. */
  staggerFrames: number;
};

export const rateCardZeroCommissionDefaultProps: RateCardZeroCommissionProps = {
  listedPrice: 12000,
  venueName: "Ararat Arena",
  eyebrow: "Owner payout",
  footnote: "No listing fee. No booking fee. No cut of your court time.",
  staggerFrames: 22,
};

/**
 * One-way, not a loop: it argues a point and then holds the conclusion.
 * Reduced motion therefore freezes on the LAST frame, where both figures and
 * the 0% badge are on screen — freezing at 0 would show an empty card.
 *
 * The payout figure is `ownerPayout(listedPrice)` from venueKit, which is the
 * identity function by design. It is called rather than hardcoded so that this
 * card can never drift away from the product fact it is describing.
 */
export const RateCardZeroCommission: FC<RateCardZeroCommissionProps> = ({
  listedPrice,
  venueName,
  eyebrow,
  footnote,
  staggerFrames,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const payout = ownerPayout(listedPrice);
  const percent = Math.round(COMMISSION_RATE * 100);

  const listedIn = spring({
    frame,
    fps,
    delay: 8,
    config: { damping: 20, mass: 0.9, stiffness: 140 },
    durationInFrames: 18,
  });
  const feeIn = spring({
    frame,
    fps,
    delay: 8 + staggerFrames,
    config: { damping: 22, mass: 0.9, stiffness: 140 },
    durationInFrames: 18,
  });
  const payoutIn = spring({
    frame,
    fps,
    delay: 8 + staggerFrames * 2,
    // The one overshoot in the file. The payout landing is the whole argument,
    // so it is the only thing allowed to arrive with a bounce.
    config: { damping: 13, mass: 0.8, stiffness: 175 },
    durationInFrames: 22,
  });
  const tick = interpolateSafe(
    frame,
    [8 + staggerFrames * 2 + 8, 8 + staggerFrames * 2 + 22],
    [0, 1],
    EASE_OUT_EXPO,
  );

  const rowStyle = (progress: number) => ({
    opacity: clamp01(progress),
    transform: `translateY(${18 * unit * (1 - clamp01(progress))}px)`,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(86% 68% at 50% 26%, ${BRAND.surface1} 0%, ${BRAND.background} 74%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(46% 34% at 50% 64%, ${courtGreen(0.12 * clamp01(payoutIn))} 0%, transparent 72%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 90 * unit,
          right: 90 * unit,
          top: height * 0.12,
          bottom: height * 0.12,
          padding: `${52 * unit}px ${54 * unit}px`,
          display: "flex",
          flexDirection: "column",
          ...cardSurface(unit, 32),
        }}
      >
        <div style={eyebrowStyle(unit)}>{eyebrow}</div>
        <div
          style={{
            marginTop: 12 * unit,
            fontFamily: DISPLAY_FONT,
            fontSize: 44 * unit,
            fontWeight: 700,
            letterSpacing: -0.04 * 44 * unit,
            color: BRAND.foreground,
          }}
        >
          {venueName}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 26 * unit }}>
          {/* Row 1 — what the owner lists. */}
          <div style={{ ...rowStyle(listedIn), display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontFamily: SANS_FONT, fontSize: 24 * unit, color: BRAND.foregroundSoft }}>
              You list
            </span>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 52 * unit,
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
                color: BRAND.foreground,
              }}
            >
              {formatDram(listedPrice)}
            </span>
          </div>

          {/* Row 2 — the fee. It is zero, and it is shown, not omitted: an
              owner who has been burned by 18% aggregator cuts wants to see the
              line item read nothing rather than not see the line at all. */}
          <div
            style={{
              ...rowStyle(feeIn),
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              paddingBottom: 26 * unit,
              borderBottom: `${1 * unit}px solid ${BRAND.border}`,
            }}
          >
            <span style={{ fontFamily: SANS_FONT, fontSize: 24 * unit, color: BRAND.foregroundSoft }}>
              SportsBnB commission
            </span>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 52 * unit,
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
                color: BRAND.mutedForeground,
              }}
            >
              {formatDram(listedPrice - payout)}
            </span>
          </div>

          {/* Row 3 — the payout. */}
          <div
            style={{
              opacity: clamp01(payoutIn),
              transform: `translateY(${20 * unit * (1 - clamp01(payoutIn))}px) scale(${0.97 + 0.03 * clamp01(payoutIn)})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18 * unit,
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
              You receive
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 14 * unit }}>
              <TickGlyph size={34 * unit} color={BRAND.primary} draw={tick} weight={3} />
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 66 * unit,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: -0.03 * 66 * unit,
                  color: BRAND.primary,
                }}
              >
                {formatDram(payout)}
              </span>
            </div>
          </div>
        </div>

        <Sequence name="Badge" layout="none">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16 * unit,
              padding: `${20 * unit}px ${24 * unit}px`,
              borderRadius: 18 * unit,
              backgroundColor: courtGreen(0.1),
              border: `${1 * unit}px solid ${courtGreen(0.34)}`,
              opacity: clamp01(payoutIn),
            }}
          >
            <span
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: 52 * unit,
                fontWeight: 700,
                letterSpacing: -0.04 * 52 * unit,
                color: BRAND.primary,
                lineHeight: 1,
              }}
            >
              {percent}%
            </span>
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 19 * unit,
                fontWeight: 500,
                lineHeight: 1.35,
                color: BRAND.foregroundSoft,
              }}
            >
              {footnote}
            </span>
          </div>
        </Sequence>
      </div>

      {/* A chalk hairline across the top edge, so the card reads as court kit. */}
      <div
        style={{
          position: "absolute",
          left: 150 * unit,
          right: 150 * unit,
          top: height * 0.12,
          height: 2 * unit,
          background: `linear-gradient(90deg, transparent, ${chalk(0.34)}, transparent)`,
        }}
      />

      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 78% at 50% 46%, transparent 44%, ${ink(0.5)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <StageDressing strength={0.7} />
    </AbsoluteFill>
  );
};
