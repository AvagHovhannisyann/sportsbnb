/**
 * SocialProofRatingCard — the aggregate: average rating, review distribution
 * and a rotating pair of short quotes. Sits at the end of the social-proof
 * strip in `src/pages/HomePage.tsx`, after the two named testimonials.
 * 1080×1350 · 30fps · 300 frames (10s) · one-shot reveal.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring } from "remotion";

import {
  BRAND,
  CLAMP,
  ENTER_SPRING,
  Eyebrow,
  FONT_DISPLAY,
  FONT_MONO,
  FONT_SANS,
  Grain,
  IconStar,
  Panel,
  SETTLE_SPRING,
  StageWash,
  alpha,
  groupNumber,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   card arrives
 *  12   eyebrow
 *  22   the average, counted to one decimal
 *  54   the five stars, 6f apart
 *  84   the distribution bars, 9f apart, 5★ first
 * 168   the review count
 * 190   two short quotes, 22f apart
 * 250   the verification note
 *
 * ── The one-decimal counter ───────────────────────────────────────────────
 * Ratings are quoted to a decimal, so the counter runs on hundredths and
 * divides at the end (`Math.round(p · value · 10) / 10`) rather than counting
 * whole numbers and appending ".8". That way the tenth digit actually moves
 * during the roll-up instead of appearing fully formed at the end, which is
 * what makes it read as a measurement settling.
 *
 * The spring is overdamped, so the average never overshoots — a rating that
 * climbs past 4.8 to 5.1 and comes back is worse than no animation at all.
 *
 * ── The distribution ──────────────────────────────────────────────────────
 * Bars are drawn 5★ first because that is the order a review widget is read
 * in, and each is a share of the largest bucket rather than of the total, so
 * the shape of the distribution survives whatever the absolute counts are.
 */

const SETTLED_FRAME = 274;

type Bucket = {
  /** 5, 4, 3, 2, 1. */
  readonly stars: number;
  readonly count: number;
};

const DistributionRow: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly bucket: Bucket;
  readonly max: number;
  readonly delay: number;
}> = ({ frame, fps, bucket, max, delay }) => {
  const p = spring({
    frame,
    fps,
    config: SETTLE_SPRING,
    delay,
    durationInFrames: 34,
  });
  const share = bucket.count / max;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        opacity: interpolate(p, [0, 0.25], [0, 1], CLAMP),
      }}
    >
      <span
        style={{
          width: 54,
          fontFamily: FONT_MONO,
          fontSize: 24,
          fontVariantNumeric: "tabular-nums",
          color: BRAND.muted,
        }}
      >
        {bucket.stars}★
      </span>
      <div
        style={{
          flex: "1 1 0",
          height: 14,
          borderRadius: 7,
          backgroundColor: alpha(BRAND.fg, 0.06),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${interpolate(p, [0, 1], [0, share * 100], CLAMP)}%`,
            height: "100%",
            borderRadius: 7,
            background: `linear-gradient(90deg, ${alpha(BRAND.amber, 0.5)} 0%, ${
              BRAND.amber
            } 100%)`,
          }}
        />
      </div>
      <span
        style={{
          width: 96,
          textAlign: "right",
          fontFamily: FONT_MONO,
          fontSize: 22,
          fontVariantNumeric: "tabular-nums",
          color: BRAND.fgSoft,
        }}
      >
        {groupNumber(p * bucket.count)}
      </span>
    </div>
  );
};

const MiniQuote: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly text: string;
  readonly attribution: string;
  readonly delay: number;
}> = ({ frame, fps, text, attribution, delay }) => (
  <div
    style={{
      ...riseStyle(frame, fps, delay, 16, 26),
      padding: 26,
      borderRadius: 22,
      backgroundColor: alpha(BRAND.fg, 0.04),
      border: `1px solid ${BRAND.border}`,
    }}
  >
    <div
      style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 30,
        fontWeight: 500,
        lineHeight: 1.35,
        letterSpacing: "-0.012em",
        color: BRAND.fg,
      }}
    >
      {text}
    </div>
    <div
      style={{
        marginTop: 12,
        fontFamily: FONT_SANS,
        fontSize: 21,
        color: BRAND.muted,
      }}
    >
      {attribution}
    </div>
  </div>
);

export type SocialProofRatingCardProps = {
  readonly eyebrow: string;
  readonly average: number;
  readonly buckets: readonly Bucket[];
  readonly reviewCount: number;
  readonly reviewLabel: string;
  readonly quotes: readonly {
    readonly text: string;
    readonly attribution: string;
  }[];
  readonly verificationNote: string;
};

export const socialProofRatingCardDefaultProps: SocialProofRatingCardProps = {
  eyebrow: "What players say",
  average: 4.8,
  buckets: [
    { stars: 5, count: 1842 },
    { stars: 4, count: 396 },
    { stars: 3, count: 74 },
    { stars: 2, count: 21 },
    { stars: 1, count: 12 },
  ],
  reviewCount: 2345,
  reviewLabel: "reviews from players who actually booked",
  quotes: [
    {
      text: "Booked at 17:40, playing at 19:00. That never used to be possible.",
      attribution: "Tigran S. · Yerevan",
    },
    {
      text: "The price on the listing is the price I paid. No surprises at the end.",
      attribution: "Narine K. · Gyumri",
    },
  ],
  verificationNote: "Only players with a completed booking can leave a review",
};

export const SocialProofRatingCard: FC<SocialProofRatingCardProps> = ({
  eyebrow,
  average,
  buckets,
  reviewCount,
  reviewLabel,
  quotes,
  verificationNote,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME, 1080);

  const card = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 0,
    durationInFrames: 34,
  });

  /** Hundredths, then divide — see the file header. Overdamped, monotonic. */
  const avgP = spring({
    frame,
    fps,
    config: SETTLE_SPRING,
    delay: 22,
    durationInFrames: 44,
  });
  const shownAverage = Math.round(avgP * average * 10) / 10;

  const countP = spring({
    frame,
    fps,
    config: SETTLE_SPRING,
    delay: 168,
    durationInFrames: 40,
  });

  let max = 1;
  for (let i = 0; i < buckets.length; i += 1) {
    max = Math.max(max, buckets[i].count);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} tint={BRAND.amber} />
      </Sequence>

      <AbsoluteFill style={{ padding: 56 }}>
        <div
          style={{
            height: "100%",
            opacity: interpolate(card, [0, 0.4], [0, 1], CLAMP),
            transform: `translateY(${interpolate(card, [0, 1], [40, 0])}px)`,
          }}
        >
          <Panel
            padding={52}
            radius={40}
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <Sequence name="Eyebrow" layout="none">
                <div style={riseStyle(frame, fps, 12, 12, 22)}>
                  <Eyebrow size={22} color={BRAND.amber}>
                    {eyebrow}
                  </Eyebrow>
                </div>
              </Sequence>

              <Sequence name="Average" layout="none">
                <div
                  style={{
                    marginTop: 28,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 18,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 172,
                      fontWeight: 700,
                      letterSpacing: "-0.05em",
                      lineHeight: 0.9,
                      fontVariantNumeric: "tabular-nums",
                      color: BRAND.fg,
                    }}
                  >
                    {shownAverage.toFixed(1)}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 32,
                      color: BRAND.muted,
                    }}
                  >
                    out of 5
                  </span>
                </div>
              </Sequence>

              <Sequence name="Stars">
                <div style={{ marginTop: 22, display: "flex", gap: 12 }}>
                  {Array.from({ length: 5 }, (_unused, i) => {
                    const p = spring({
                      frame,
                      fps,
                      config: { damping: 12, mass: 0.5, stiffness: 180 },
                      delay: 54 + i * 6,
                      durationInFrames: 20,
                    });
                    return (
                      <span
                        key={`star-${i}`}
                        style={{
                          display: "inline-flex",
                          color:
                            i < Math.floor(average)
                              ? BRAND.amber
                              : alpha(BRAND.amber, 0.42),
                          opacity: interpolate(p, [0, 0.4], [0, 1], CLAMP),
                          transform: `scale(${interpolate(p, [0, 1], [0.4, 1])})`,
                        }}
                      >
                        <IconStar size={46} />
                      </span>
                    );
                  })}
                </div>
              </Sequence>

              <Sequence name="Distribution" layout="none">
                <div
                  style={{
                    marginTop: 42,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  {buckets.map((bucket, i) => (
                    <DistributionRow
                      key={bucket.stars}
                      frame={frame}
                      fps={fps}
                      bucket={bucket}
                      max={max}
                      delay={84 + i * 9}
                    />
                  ))}
                </div>
              </Sequence>

              <Sequence name="Review count" layout="none">
                <div
                  style={{
                    marginTop: 34,
                    paddingTop: 28,
                    borderTop: `1px solid ${BRAND.border}`,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 14,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 54,
                      fontWeight: 700,
                      letterSpacing: "-0.03em",
                      fontVariantNumeric: "tabular-nums",
                      color: BRAND.fg,
                    }}
                  >
                    {groupNumber(countP * reviewCount)}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 25,
                      color: BRAND.fgSoft,
                    }}
                  >
                    {reviewLabel}
                  </span>
                </div>
              </Sequence>
            </div>

            <div>
              <Sequence name="Quotes" layout="none">
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 18 }}
                >
                  {quotes.map((quote, i) => (
                    <MiniQuote
                      key={quote.attribution}
                      frame={frame}
                      fps={fps}
                      text={quote.text}
                      attribution={quote.attribution}
                      delay={190 + i * 22}
                    />
                  ))}
                </div>
              </Sequence>

              <div
                style={{
                  ...riseStyle(frame, fps, 250, 12, 26),
                  marginTop: 26,
                  fontFamily: FONT_SANS,
                  fontSize: 21,
                  color: BRAND.muted,
                }}
              >
                {verificationNote}
              </div>
            </div>
          </Panel>
        </div>
      </AbsoluteFill>

      <Sequence name="Grain">
        <Grain frame={frame} period={period} scale={scale} opacity={0.045} />
      </Sequence>
    </AbsoluteFill>
  );
};
