/**
 * ReviewQuoteRotator — player reviews cycling one at a time under a fixed
 * rating header, each quote rising in and settling out. The testimonial rail
 * on /venues/:id and on the venue's public share card.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { StageDressing, StarRow } from "./venueChrome";
import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  SPORTS,
  type SportKey,
  chalk,
  clamp01,
  hashInt,
  ink,
  mix,
  oscillate,
  smoothstep,
  tint,
  useMotionFrame,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type ReviewQuote = {
  /** The review body, as a player wrote it. */
  body: string;
  /** Display name on the booking. */
  author: string;
  /** What they booked, e.g. "Booked futsal · Nov". */
  context: string;
  /** Stars this player gave, 0–5. */
  stars: number;
};

export type ReviewQuoteRotatorProps = {
  /** The quotes to cycle. Length sets the lattice period. */
  quotes: ReviewQuote[];
  venueName: string;
  /** Headline rating over the rail. */
  rating: number;
  /** Total reviews behind that rating. */
  reviewCount: number;
  /** Fraction of each quote's turn spent changing over, 0.05–0.45. */
  fadeFraction: number;
  /** Drives the accent only. */
  sport: SportKey;
};

export const reviewQuoteRotatorDefaultProps: ReviewQuoteRotatorProps = {
  quotes: [
    {
      body: "Booked at 21:00, floodlights were already on when we arrived. Pitch was in great shape.",
      author: "Davit H.",
      context: "Booked football · Nov",
      stars: 5,
    },
    {
      body: "Price on the listing is the price you pay. No surprise fee at the end, which is rare here.",
      author: "Ani M.",
      context: "Booked futsal · Oct",
      stars: 5,
    },
    {
      body: "Changing rooms clean, parking right outside. Owner answered in two minutes.",
      author: "Narek S.",
      context: "Booked basketball · Oct",
      stars: 5,
    },
    {
      body: "Court was a little cold in the morning slot, but everything else was spot on.",
      author: "Lilit G.",
      context: "Booked tennis · Sep",
      stars: 4,
    },
  ],
  venueName: "Ararat Arena",
  rating: 4.8,
  reviewCount: 126,
  fadeFraction: 0.24,
  sport: "football",
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 * A wrap lattice. Quote `i` reads `u = wrap(t·N − i, N)`, which advances by
 * exactly N across the loop and therefore holds the same value at t=1 as at
 * t=0.
 *
 * The visibility window is 0 at u=0, rises, holds, and is back to 0 by
 * u = 1 + fade, staying 0 until the lattice wraps — every quote is fully
 * transparent on both sides of the seam, so the lift and the fade it drives are
 * both invisible there. The avatar shimmer and the header underline breathe on
 * `oscillate(t)`, a full cosine period.
 *
 * No one-way tween anywhere. Reduced motion freezes at 0, which shows the first
 * quote mid-hold.
 */
export const ReviewQuoteRotator: FC<ReviewQuoteRotatorProps> = ({
  quotes,
  venueName,
  rating,
  reviewCount,
  fadeFraction,
  sport,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const accent = SPORTS[sport].accent;

  const list =
    quotes.length > 0 ? quotes : reviewQuoteRotatorDefaultProps.quotes;
  const n = list.length;
  const fade = Math.min(0.45, Math.max(0.05, fadeFraction));
  const breath = oscillate(t);

  /** 0 at u=0, 1 across the hold, 0 again by u = 1 + fade. */
  const windowAt = (u: number): number => {
    if (u <= 0) return 0;
    if (u < fade) return smoothstep(u / fade);
    if (u <= 1) return 1;
    if (u < 1 + fade) return smoothstep(1 - (u - 1) / fade);
    return 0;
  };

  const cardX = 78 * unit;
  const cardW = width - cardX * 2;
  const cardTop = height * 0.3;
  const cardH = height * 0.42;

  /** Deterministic avatar tint, so a given author always looks the same. */
  const avatarTint = (i: number): string => {
    const palette = [BRAND.primary, BRAND.cyan, BRAND.violet, BRAND.amber];
    return palette[hashInt(i + 3, palette.length, 31)];
  };

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(86% 62% at 50% 22%, ${BRAND.surface1} 0%, ${BRAND.background} 78%)`,
        }}
      />

      {/* Fixed header — nothing here moves except one cosine. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 88 * unit,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 13 * unit,
            fontWeight: 500,
            letterSpacing: 0.2 * 13 * unit,
            textTransform: "uppercase",
            color: tint(accent, 0.7 + 0.3 * breath),
          }}
        >
          Player reviews
        </div>
        <div
          style={{
            marginTop: 14 * unit,
            fontFamily: DISPLAY_FONT,
            fontSize: 46 * unit,
            fontWeight: 700,
            letterSpacing: -0.04 * 46 * unit,
            color: BRAND.foreground,
          }}
        >
          {venueName}
        </div>
        <div
          style={{
            marginTop: 16 * unit,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12 * unit,
          }}
        >
          <StarRow
            rating={rating}
            size={26 * unit}
            gap={4 * unit}
            idPrefix="quote-head"
          />
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 22 * unit,
              fontVariantNumeric: "tabular-nums",
              color: BRAND.foreground,
            }}
          >
            {rating.toFixed(1)}
          </span>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 20 * unit,
              color: BRAND.mutedForeground,
            }}
          >
            · {reviewCount} reviews
          </span>
        </div>
        <div
          style={{
            margin: `${22 * unit}px auto 0`,
            width: 240 * unit,
            height: 2 * unit,
            background: `linear-gradient(90deg, transparent, ${chalk(0.18 + 0.14 * breath)}, transparent)`,
          }}
        />
      </div>

      {/* The rotating quotes. */}
      <div
        style={{
          position: "absolute",
          left: cardX,
          top: cardTop,
          width: cardW,
          height: cardH,
        }}
      >
        {list.map((quote, i) => {
          const u = wrap(t * n - i, n);
          const alpha = windowAt(u);
          if (alpha <= 0) {
            return null;
          }
          const tone = avatarTint(i);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                opacity: alpha,
                transform: `translateY(${mix(26, 0, alpha) * unit}px)`,
                padding: `${40 * unit}px ${42 * unit}px`,
                borderRadius: 28 * unit,
                backgroundColor: BRAND.card,
                border: `${1 * unit}px solid ${BRAND.border}`,
                boxShadow: `0 ${20 * unit}px ${44 * unit}px ${-16 * unit}px ${ink(0.88)}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: DISPLAY_FONT,
                    fontSize: 64 * unit,
                    fontWeight: 700,
                    lineHeight: 0.6,
                    color: tint(accent, 0.45),
                  }}
                >
                  &ldquo;
                </div>
                <div
                  style={{
                    marginTop: 18 * unit,
                    fontFamily: SANS_FONT,
                    fontSize: 30 * unit,
                    fontWeight: 500,
                    lineHeight: 1.42,
                    color: BRAND.foreground,
                  }}
                >
                  {quote.body}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16 * unit,
                  paddingTop: 24 * unit,
                  borderTop: `${1 * unit}px solid ${BRAND.border}`,
                }}
              >
                <div
                  style={{
                    width: 54 * unit,
                    height: 54 * unit,
                    borderRadius: "50%",
                    backgroundColor: tint(tone, 0.18),
                    border: `${1 * unit}px solid ${tint(tone, 0.44)}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: DISPLAY_FONT,
                    fontSize: 24 * unit,
                    fontWeight: 700,
                    color: tone,
                    flexShrink: 0,
                  }}
                >
                  {quote.author.slice(0, 1)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: SANS_FONT,
                      fontSize: 23 * unit,
                      fontWeight: 600,
                      color: BRAND.foreground,
                    }}
                  >
                    {quote.author}
                  </div>
                  <div
                    style={{
                      marginTop: 4 * unit,
                      fontFamily: SANS_FONT,
                      fontSize: 18 * unit,
                      color: BRAND.mutedForeground,
                    }}
                  >
                    {quote.context}
                  </div>
                </div>
                <StarRow
                  rating={clamp01(quote.stars / 5) * 5}
                  size={22 * unit}
                  gap={3 * unit}
                  idPrefix={`quote-${i}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot rail, driven by the same window. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: cardTop + cardH + 40 * unit,
          display: "flex",
          justifyContent: "center",
          gap: 10 * unit,
        }}
      >
        {list.map((quote, i) => {
          const on = windowAt(wrap(t * n - i, n));
          return (
            <span
              key={`d${i}`}
              style={{
                width: mix(9, 30, on) * unit,
                height: 9 * unit,
                borderRadius: 999,
                backgroundColor:
                  on > 0.02 ? tint(accent, 0.35 + 0.5 * on) : BRAND.surface3,
              }}
            />
          );
        })}
      </div>

      <StageDressing strength={0.6} />
    </AbsoluteFill>
  );
};
