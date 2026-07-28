/**
 * VenuePromoTennis — the hero loop behind a hard-court listing: the court seen
 * down the line with a rally crossing the net and back. Card header on
 * /venues/:id and the vertical social cut for that listing.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { ListingPlate, StageDressing } from "./venueChrome";
import {
  BRAND,
  MONO_FONT,
  SPORTS,
  chalk,
  cyan,
  ink,
  mix,
  oscillate,
  tint,
  triangle,
  useMotionFrame,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type VenuePromoTennisProps = {
  venueName: string;
  city: string;
  pricePerHour: number;
  rating: number;
  reviewCount: number;
  /** Shots per loop. Even numbers put the ball back where it started. */
  shots: number;
  /** Ghost frames trailing the ball. */
  trailLength: number;
  /** Scoreline printed over the baseline. Purely decorative. */
  scoreline: string;
};

export const venuePromoTennisDefaultProps: VenuePromoTennisProps = {
  venueName: "Yerevan Tennis Club",
  city: "Yerevan",
  pricePerHour: 7000,
  rating: 4.9,
  reviewCount: 213,
  shots: 2,
  trailLength: 5,
  scoreline: "40 — 30",
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The rally runs on `triangle(shots · t / 2)`: the ball travels the court
 *     in straight lines and reverses instantly at each baseline, which is what
 *     a struck ball does. With an even `shots` it is back at the near baseline
 *     at t=1, on the same pixel it left at t=0.
 *  2. The flight arc is `|sin(π · shots · t)|` — zero at every contact, so the
 *     lift and the reversal happen on the same frame.
 *  3. The trail is the same function sampled at fixed phase offsets, so it is
 *     periodic by construction rather than by accident.
 *  4. Court haze and the net-cord highlight are full cosines.
 *
 * No one-way tween anywhere.
 */
export const VenuePromoTennis: FC<VenuePromoTennisProps> = ({
  venueName,
  city,
  pricePerHour,
  rating,
  reviewCount,
  shots,
  trailLength,
  scoreline,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const sport = SPORTS.tennis;

  const haze = oscillate(t);

  // A court in one-point perspective: a trapezium, far baseline narrow.
  const topY = height * 0.11;
  const botY = height * 0.58;
  const netY = mix(topY, botY, 0.46);
  const topHalf = width * 0.16;
  const botHalf = width * 0.42;
  const cx = width / 2;

  const halfAt = (y: number): number =>
    mix(topHalf, botHalf, (y - topY) / (botY - topY));

  /** Ball position at a given phase, so the trail can reuse the same maths. */
  const ballAt = (phase: number) => {
    const along = triangle((shots * phase) / 2);
    const y = mix(topY + 26 * unit, botY - 26 * unit, along);
    const arc = Math.abs(Math.sin(Math.PI * shots * phase));
    const r = mix(7, 17, (y - topY) / (botY - topY)) * unit;
    return {
      x: cx + (along - 0.5) * width * 0.1,
      y: y - arc * (botY - topY) * 0.16,
      groundY: y,
      r,
      arc,
    };
  };

  const ball = ballAt(t);
  const trail = Array.from({ length: Math.max(0, trailLength) }, (_, i) =>
    ballAt(t - (i + 1) * 0.006),
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(96% 54% at 50% 28%, ${sport.surface} 0%, ${BRAND.background} 76%)`,
        }}
      />

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
        fill="none"
      >
        {/* The playing surface itself — a wash, not an outline. */}
        <path
          d={`M ${cx - topHalf} ${topY} L ${cx + topHalf} ${topY} L ${cx + botHalf} ${botY} L ${cx - botHalf} ${botY} Z`}
          fill={cyan(0.05 + 0.02 * haze)}
        />

        <g stroke={chalk(0.24)} strokeWidth={2.4 * unit} strokeLinecap="round">
          {/* Tramlines and singles sidelines. */}
          <path
            d={`M ${cx - topHalf} ${topY} L ${cx + topHalf} ${topY} L ${cx + botHalf} ${botY} L ${cx - botHalf} ${botY} Z`}
          />
          <line
            x1={cx - topHalf * 0.78}
            y1={topY}
            x2={cx - botHalf * 0.78}
            y2={botY}
          />
          <line
            x1={cx + topHalf * 0.78}
            y1={topY}
            x2={cx + botHalf * 0.78}
            y2={botY}
          />
          {/* Service lines and the centre service line. */}
          <line
            x1={cx - halfAt(mix(topY, netY, 0.42)) * 0.78}
            y1={mix(topY, netY, 0.42)}
            x2={cx + halfAt(mix(topY, netY, 0.42)) * 0.78}
            y2={mix(topY, netY, 0.42)}
          />
          <line
            x1={cx - halfAt(mix(netY, botY, 0.5)) * 0.78}
            y1={mix(netY, botY, 0.5)}
            x2={cx + halfAt(mix(netY, botY, 0.5)) * 0.78}
            y2={mix(netY, botY, 0.5)}
          />
          <line
            x1={cx}
            y1={mix(topY, netY, 0.42)}
            x2={cx}
            y2={mix(netY, botY, 0.5)}
          />
        </g>

        {/* Net: posts, band, and a mesh built from evenly spaced strands. */}
        <g>
          {Array.from({ length: 25 }, (_, i) => {
            const f = i / 24;
            const x = cx + (f - 0.5) * halfAt(netY) * 2.24;
            return (
              <line
                key={i}
                x1={x}
                y1={netY - 44 * unit}
                x2={x}
                y2={netY}
                stroke={chalk(0.14)}
                strokeWidth={1.4 * unit}
              />
            );
          })}
          <line
            x1={cx - halfAt(netY) * 1.12}
            y1={netY - 44 * unit}
            x2={cx + halfAt(netY) * 1.12}
            y2={netY - 44 * unit}
            stroke={chalk(0.4 + 0.2 * haze)}
            strokeWidth={5 * unit}
            strokeLinecap="round"
          />
          <line
            x1={cx - halfAt(netY) * 1.12}
            y1={netY}
            x2={cx + halfAt(netY) * 1.12}
            y2={netY}
            stroke={chalk(0.22)}
            strokeWidth={2 * unit}
          />
        </g>

        {/* Trail, then the ball. Ghosts share the ball's own function. */}
        {trail.map((g, i) => (
          <circle
            key={i}
            cx={g.x}
            cy={g.y}
            r={g.r * (1 - (i + 1) * 0.11)}
            fill={tint(sport.accent, 0.26 - i * 0.045)}
          />
        ))}
        <ellipse
          cx={ball.x}
          cy={ball.groundY}
          rx={ball.r * mix(1.5, 0.7, ball.arc)}
          ry={ball.r * mix(0.5, 0.22, ball.arc)}
          fill={ink(mix(0.45, 0.12, ball.arc))}
        />
        <circle cx={ball.x} cy={ball.y} r={ball.r} fill={BRAND.warning} />
        <path
          d={`M ${ball.x - ball.r} ${ball.y} Q ${ball.x} ${ball.y - ball.r * 0.8} ${ball.x + ball.r} ${ball.y}`}
          stroke={chalk(0.72)}
          strokeWidth={1.6 * unit}
          fill="none"
        />
      </svg>

      <div
        style={{
          position: "absolute",
          top: topY - 46 * unit,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: MONO_FONT,
          fontSize: 22 * unit,
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: 0.24 * 22 * unit,
          color: tint(sport.accent, 0.45 + 0.3 * haze),
        }}
      >
        {scoreline}
      </div>

      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, transparent 46%, ${ink(0.6)} 68%, ${ink(0.92)} 100%)`,
        }}
      />

      <ListingPlate
        venueName={venueName}
        city={city}
        sportLabel={sport.label}
        accent={sport.accent}
        price={pricePerHour}
        rating={rating}
        reviewCount={reviewCount}
        unit={unit}
        width={width}
        bottom={72 * unit}
        idPrefix="promo-tennis"
      />

      <StageDressing />
    </AbsoluteFill>
  );
};
