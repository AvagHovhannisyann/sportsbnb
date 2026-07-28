/**
 * VenuePromoPadel — the hero loop behind a glass-court listing: the enclosed
 * box seen from above, a reflection running the glass and the ball playing off
 * the back wall. Card header on /venues/:id and the vertical social cut.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { ListingPlate, StageDressing } from "./venueChrome";
import {
  BRAND,
  SPORTS,
  TAU,
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

export type VenuePromoPadelProps = {
  venueName: string;
  city: string;
  pricePerHour: number;
  rating: number;
  reviewCount: number;
  /** Fraction of the glass perimeter the reflection occupies, 0–1. */
  reflectionFraction: number;
  /** Whole circuits the reflection makes per loop. */
  reflectionLaps: number;
  /** Wall-to-wall exchanges the ball makes per loop. Even keeps it home. */
  exchanges: number;
};

export const venuePromoPadelDefaultProps: VenuePromoPadelProps = {
  venueName: "Padel Point Arabkir",
  city: "Yerevan",
  pricePerHour: 14000,
  rating: 4.9,
  reviewCount: 91,
  reflectionFraction: 0.14,
  reflectionLaps: 1,
  exchanges: 2,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The reflection is a dash pattern on a *closed* rounded rectangle. The
 *     dash array sums to the path's own perimeter and `strokeDashoffset` moves
 *     by exactly `reflectionLaps · perimeter` across the loop, so at t=1 the
 *     lit segment sits on the same millimetre of glass it started on. A closed
 *     path has no end for it to run off.
 *  2. The ball uses `triangle(exchanges · t / 2)` — straight travel, instant
 *     reversal at the glass, home again for even `exchanges`.
 *  3. Glass sheen, the fog band and the centre glow are full cosines.
 *
 * No one-way tween anywhere.
 */
export const VenuePromoPadel: FC<VenuePromoPadelProps> = ({
  venueName,
  city,
  pricePerHour,
  rating,
  reviewCount,
  reflectionFraction,
  reflectionLaps,
  exchanges,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const sport = SPORTS.padel;

  const sheen = oscillate(t);

  const padX = 96 * unit;
  const boxX = padX;
  const boxW = width - padX * 2;
  const boxY = height * 0.1;
  const boxH = height * 0.48;
  const radius = 18 * unit;
  const cx = boxX + boxW / 2;
  const netY = boxY + boxH / 2;

  // Rounded-rectangle perimeter: the straights plus one whole circle of corners.
  const perimeter =
    2 * (boxW - 2 * radius) + 2 * (boxH - 2 * radius) + TAU * radius;
  const lit = perimeter * Math.min(0.9, Math.max(0.02, reflectionFraction));

  // The ball, working the length of the court.
  const along = triangle((exchanges * t) / 2);
  const ballY = mix(boxY + 54 * unit, boxY + boxH - 54 * unit, along);
  const ballX = cx + Math.sin(TAU * exchanges * t) * boxW * 0.16;
  const rise = Math.abs(Math.sin(Math.PI * exchanges * t));

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(92% 50% at 50% 26%, ${sport.surface} 0%, ${BRAND.background} 76%)`,
        }}
      />

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
        fill="none"
      >
        {/* Blue surface inside the glass. */}
        <rect
          x={boxX}
          y={boxY}
          width={boxW}
          height={boxH}
          rx={radius}
          fill={cyan(0.07 + 0.02 * sheen)}
        />

        {/* Court markings: service boxes either side of the net. */}
        <g stroke={chalk(0.24)} strokeWidth={2.4 * unit} strokeLinecap="round">
          <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={radius} />
          <line x1={boxX} y1={boxY + boxH * 0.28} x2={boxX + boxW} y2={boxY + boxH * 0.28} />
          <line x1={boxX} y1={boxY + boxH * 0.72} x2={boxX + boxW} y2={boxY + boxH * 0.72} />
          <line x1={cx} y1={boxY + boxH * 0.28} x2={cx} y2={boxY + boxH * 0.72} />
        </g>

        {/* Glass panel mullions — four per long wall, two per short. */}
        <g stroke={chalk(0.1)} strokeWidth={1.6 * unit}>
          {[0.2, 0.4, 0.6, 0.8].map((f) => (
            <line key={`l${f}`} x1={boxX} y1={boxY + boxH * f} x2={boxX + 22 * unit} y2={boxY + boxH * f} />
          ))}
          {[0.2, 0.4, 0.6, 0.8].map((f) => (
            <line
              key={`r${f}`}
              x1={boxX + boxW - 22 * unit}
              y1={boxY + boxH * f}
              x2={boxX + boxW}
              y2={boxY + boxH * f}
            />
          ))}
        </g>

        {/* The net across the middle. */}
        <g>
          <line
            x1={boxX}
            y1={netY}
            x2={boxX + boxW}
            y2={netY}
            stroke={chalk(0.34 + 0.16 * sheen)}
            strokeWidth={5 * unit}
            strokeLinecap="round"
          />
          {Array.from({ length: 19 }, (_, i) => {
            const x = boxX + (boxW * (i + 0.5)) / 19;
            return (
              <line
                key={i}
                x1={x}
                y1={netY - 12 * unit}
                x2={x}
                y2={netY + 12 * unit}
                stroke={chalk(0.12)}
                strokeWidth={1.4 * unit}
              />
            );
          })}
        </g>

        {/* Ball, with a shadow that tightens as it rises off the surface. */}
        <ellipse
          cx={ballX}
          cy={ballY + 10 * unit}
          rx={mix(20, 10, rise) * unit}
          ry={mix(7, 3.5, rise) * unit}
          fill={ink(mix(0.45, 0.12, rise))}
        />
        <circle cx={ballX} cy={ballY - rise * 16 * unit} r={13 * unit} fill={BRAND.warning} />

        {/* The reflection running the glass — glow pass, then core. */}
        <g
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${lit} ${perimeter - lit}`}
          strokeDashoffset={-t * perimeter * reflectionLaps}
        >
          <rect
            x={boxX}
            y={boxY}
            width={boxW}
            height={boxH}
            rx={radius}
            stroke={cyan(0.12)}
            strokeWidth={18 * unit}
          />
          <rect
            x={boxX}
            y={boxY}
            width={boxW}
            height={boxH}
            rx={radius}
            stroke={cyan(0.62)}
            strokeWidth={3 * unit}
          />
        </g>
      </svg>

      {/* Cold fog rolling over the glass, on a full cosine. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(${mix(160, 200, sheen)}deg, transparent 30%, ${cyan(0.05)} 52%, transparent 74%)`,
        }}
      />

      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, transparent 44%, ${ink(0.6)} 68%, ${ink(0.92)} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(58% 24% at 50% 88%, ${tint(sport.accent, 0.1)} 0%, transparent 74%)`,
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
        idPrefix="promo-padel"
      />

      <StageDressing />
    </AbsoluteFill>
  );
};
