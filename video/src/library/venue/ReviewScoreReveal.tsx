/**
 * ReviewScoreReveal — the venue's rating resolving: the score rolls up, the
 * stars fill left to right and the star-distribution bars grow under it. The
 * reviews header on /venues/:id, played once.
 */

import type { FC } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { StageDressing, StarRow } from "./venueChrome";
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
  eyebrowStyle,
  ink,
  interpolateSafe,
  mix,
  tint,
  useMotionFrame,
} from "./venueKit";

const CANVAS_W = 1080;

export type ReviewScoreRevealProps = {
  /** Final rating, 0–5. Shown to one decimal. */
  rating: number;
  /** Total reviews behind the score. */
  reviewCount: number;
  venueName: string;
  /** Kicker above the score. */
  eyebrow: string;
  /**
   * Share of reviews at 5,4,3,2,1 stars, in that order. Normalised, so the
   * numbers need not add to 1.
   */
  distribution: number[];
  /** Frames between the score landing and the first bar growing. */
  staggerFrames: number;
  /** Drives the accent only. */
  sport: SportKey;
};

export const reviewScoreRevealDefaultProps: ReviewScoreRevealProps = {
  rating: 4.8,
  reviewCount: 126,
  venueName: "Ararat Arena",
  eyebrow: "Player reviews",
  distribution: [0.78, 0.15, 0.05, 0.01, 0.01],
  staggerFrames: 5,
  sport: "football",
};

/**
 * One-way: the score assembles and then holds. Reduced motion freezes on the
 * LAST frame — "4.8 from 126 reviews" is the whole content, and frame 0 is a
 * row of empty stars over a zero.
 *
 * The score roll is `interpolate()` with an expo ease, because a number
 * counting up must never overshoot its own final value; the stars and the bars
 * are `spring()`, because those do land.
 */
export const ReviewScoreReveal: FC<ReviewScoreRevealProps> = ({
  rating,
  reviewCount,
  venueName,
  eyebrow,
  distribution,
  staggerFrames,
  sport,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const accent = SPORTS[sport].accent;

  const value = Math.min(5, Math.max(0, rating));
  const dist =
    distribution.length === 5
      ? distribution
      : reviewScoreRevealDefaultProps.distribution;
  let distMax = 0;
  for (let i = 0; i < dist.length; i += 1) {
    if (dist[i] > distMax) {
      distMax = dist[i];
    }
  }
  if (distMax <= 0) {
    distMax = 1;
  }

  const step = Math.max(1, Math.round(staggerFrames));

  /* ── Beats ──────────────────────────────────────────────────────────── */
  const HEAD_AT = 4;
  const SCORE_AT = 12;
  const SCORE_FOR = 30;
  const STARS_AT = SCORE_AT + 8;
  const BARS_AT = SCORE_AT + SCORE_FOR;

  const head = clamp01(
    spring({
      frame,
      fps,
      delay: HEAD_AT,
      config: { damping: 22, mass: 0.9, stiffness: 130 },
      durationInFrames: 16,
    }),
  );

  // Counting up: monotone, clamped, and it lands exactly on `value`.
  const roll = interpolateSafe(
    frame,
    [SCORE_AT, SCORE_AT + SCORE_FOR],
    [0, 1],
    EASE_OUT_EXPO,
  );
  const shown = value * roll;

  const countRoll = interpolateSafe(
    frame,
    [SCORE_AT + 6, SCORE_AT + SCORE_FOR + 6],
    [0, 1],
    EASE_OUT_EXPO,
  );

  /** Per-star fill, staggered. Returned to StarRow as a 0–1 scale. */
  const starFill = (i: number): number =>
    clamp01(
      spring({
        frame,
        fps,
        delay: STARS_AT + i * 4,
        config: { damping: 18, mass: 0.7, stiffness: 170 },
        durationInFrames: 16,
      }),
    );

  const rows = [5, 4, 3, 2, 1];
  const barX = 300 * unit;
  const barW = width - barX - 150 * unit;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(84% 60% at 50% 24%, ${BRAND.surface1} 0%, ${BRAND.background} 78%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 26% at 50% 40%, ${tint(BRAND.warning, 0.09 * roll)} 0%, transparent 74%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 92 * unit,
          textAlign: "center",
          opacity: head,
          transform: `translateY(${14 * unit * (1 - head)}px)`,
        }}
      >
        <div style={{ ...eyebrowStyle(unit, accent), textAlign: "center" }}>
          {eyebrow}
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
      </div>

      {/* The score */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: height * 0.28,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20 * unit,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 150 * unit,
            fontWeight: 500,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: -0.05 * 150 * unit,
            lineHeight: 1,
            color: BRAND.foreground,
            transform: `scale(${mix(0.94, 1, roll)})`,
          }}
        >
          {shown.toFixed(1)}
        </div>

        <StarRow
          rating={value}
          size={46 * unit}
          gap={8 * unit}
          fillOf={starFill}
          idPrefix="review-score"
        />

        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 24 * unit,
            fontWeight: 500,
            color: BRAND.mutedForeground,
          }}
        >
          from {Math.round(reviewCount * countRoll)} verified bookings
        </div>
      </div>

      {/* Distribution */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 96 * unit,
        }}
      >
        {rows.map((star, i) => {
          const grow = clamp01(
            spring({
              frame,
              fps,
              delay: BARS_AT + i * step,
              config: { damping: 24, mass: 0.9, stiffness: 130 },
              durationInFrames: 20,
            }),
          );
          const share = dist[i] / distMax;
          return (
            <div
              key={star}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18 * unit,
                height: 40 * unit,
                paddingLeft: 150 * unit,
              }}
            >
              <span
                style={{
                  width: 130 * unit,
                  fontFamily: MONO_FONT,
                  fontSize: 18 * unit,
                  fontVariantNumeric: "tabular-nums",
                  color: BRAND.mutedForeground,
                  opacity: grow,
                }}
              >
                {star} star{star === 1 ? "" : "s"}
              </span>
              <div
                style={{
                  width: barW,
                  height: 12 * unit,
                  borderRadius: 999,
                  backgroundColor: BRAND.surface2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${100 * share * grow}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${tint(BRAND.warning, 0.75)}, ${BRAND.warning})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 150 * unit,
          right: 150 * unit,
          top: height * 0.24,
          height: 2 * unit,
          background: `linear-gradient(90deg, transparent, ${chalk(0.24)}, transparent)`,
          opacity: head,
        }}
      />

      <AbsoluteFill
        style={{
          background: `radial-gradient(92% 82% at 50% 46%, transparent 50%, ${ink(0.42)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <StageDressing strength={0.6} />
    </AbsoluteFill>
  );
};
