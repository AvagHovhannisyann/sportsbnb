/**
 * VenuePromoFutsal — the hero loop behind an indoor five-a-side listing: a
 * parquet hall under a row of ceiling bars, with the ball ricocheting between
 * the side walls. Card header on /venues/:id and the vertical social cut.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { ListingPlate, StageDressing } from "./venueChrome";
import {
  BRAND,
  SPORTS,
  chalk,
  courtGreen,
  ink,
  interpolateSafe,
  mix,
  oscillate,
  pulse,
  tint,
  triangle,
  useMotionFrame,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type VenuePromoFutsalProps = {
  venueName: string;
  city: string;
  pricePerHour: number;
  rating: number;
  reviewCount: number;
  /** Wall-to-wall crossings the ball makes per loop. Must be a whole number. */
  ricochets: number;
  /** Ceiling light bars along the top of the hall. */
  lightBars: number;
  /** Width of one parquet board in design px. */
  boardWidth: number;
};

export const venuePromoFutsalDefaultProps: VenuePromoFutsalProps = {
  venueName: "Nairi Indoor",
  city: "Yerevan",
  pricePerHour: 9000,
  rating: 4.7,
  reviewCount: 84,
  ricochets: 2,
  lightBars: 5,
  boardWidth: 46,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The ball's x is `triangle(ricochets · t)` — straight lines with a corner
 *     at each wall, which is what a ricochet actually is. Whole `ricochets`
 *     means it is against the same wall at t=0 and t=1.
 *  2. Its y is a `bounce`-style arc built from the same triangle, so the two
 *     axes turn together and the path closes.
 *  3. The parquet scrolls by exactly two board widths, one full tile of the
 *     repeating gradient.
 *  4. Each ceiling bar runs `pulse()`, the rise/hold/settle spring that is
 *     exactly 0 at both ends of its own period; the periods divide the loop.
 *
 * No one-way tween anywhere.
 */
export const VenuePromoFutsal: FC<VenuePromoFutsalProps> = ({
  venueName,
  city,
  pricePerHour,
  rating,
  reviewCount,
  ricochets,
  lightBars,
  boardWidth,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // Loop: freeze on frame 0, the state the cycle both opens and closes on.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const sport = SPORTS.futsal;

  const board = boardWidth * unit;
  const hallTop = height * 0.08;
  const hallH = height * 0.5;
  const padX = 76 * unit;
  const hallW = width - padX * 2;
  const cx = padX + hallW / 2;
  const cy = hallTop + hallH / 2;

  // The ricochet. `across` is 0 at the left wall and 1 at the right.
  const across = triangle(ricochets * t);
  const ballX = padX + 46 * unit + across * (hallW - 92 * unit);
  // The vertical arc: each crossing lifts and drops once, so it uses twice the
  // frequency of the horizontal run and lands as the ball meets the wall.
  const lift = Math.abs(Math.sin(Math.PI * ricochets * 2 * t));
  const ballY = hallTop + hallH * 0.72 - lift * hallH * 0.34;
  // Squash on contact — reads as weight, and is zero exactly when lift is 1.
  const squash = 1 - 0.18 * (1 - lift);

  const shadowSpread = mix(1.25, 0.6, lift);
  const shadowAlpha = mix(0.42, 0.12, lift);

  // Period per light bar, chosen so every bar completes whole cycles.
  const barPeriod = durationInFrames / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(94% 50% at 50% 22%, ${sport.surface} 0%, ${BRAND.background} 76%)`,
        }}
      />

      {/* Parquet — scrolls exactly one tile (two boards) across the loop. */}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, ${chalk(0.035)} 0px, ${chalk(0.035)} ${board}px, ${chalk(0.012)} ${board}px, ${chalk(0.012)} ${board * 2}px)`,
          backgroundPosition: `${t * board * 2}px 0px`,
          maskImage: `linear-gradient(to bottom, transparent 0%, black 14%, black 58%, transparent 76%)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black 14%, black 58%, transparent 76%)`,
        }}
      />

      {/* Ceiling bars. Each is a pulse on its own phase — nothing tweens once. */}
      {Array.from({ length: lightBars }, (_, i) => {
        const glow = pulse({
          frame,
          fps,
          period: barPeriod,
          phase: (i * barPeriod) / lightBars,
        });
        const barW = hallW / (lightBars + 1);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: padX + barW * 0.5 + i * barW,
              top: hallTop - 34 * unit,
              width: barW * 0.68,
              height: 8 * unit,
              borderRadius: 999,
              backgroundColor: chalk(0.22 + 0.5 * glow),
              boxShadow: `0 ${10 * unit}px ${46 * unit}px ${tint(sport.accent, 0.16 + 0.3 * glow)}`,
            }}
          />
        );
      })}

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
        fill="none"
      >
        <g stroke={chalk(0.22)} strokeWidth={2.4 * unit} strokeLinecap="round">
          <rect x={padX} y={hallTop} width={hallW} height={hallH} rx={6 * unit} />
          <line x1={cx} y1={hallTop} x2={cx} y2={hallTop + hallH} />
          <circle cx={cx} cy={cy} r={Math.min(hallW, hallH) * 0.17} />
          {/* Futsal's semicircular areas rather than rectangles. */}
          <path
            d={`M ${padX} ${cy - hallH * 0.2} A ${hallW * 0.14} ${hallH * 0.2} 0 0 1 ${padX} ${cy + hallH * 0.2}`}
          />
          <path
            d={`M ${padX + hallW} ${cy - hallH * 0.2} A ${hallW * 0.14} ${hallH * 0.2} 0 0 0 ${padX + hallW} ${cy + hallH * 0.2}`}
          />
        </g>

        {/* Contact shadow, widest when the ball is down. */}
        <ellipse
          cx={ballX}
          cy={hallTop + hallH * 0.78}
          rx={20 * unit * shadowSpread}
          ry={6 * unit * shadowSpread}
          fill={ink(shadowAlpha)}
        />

        <g transform={`translate(${ballX} ${ballY}) scale(${1 / squash} ${squash})`}>
          <circle r={16 * unit} fill={chalk(0.94)} />
          <circle r={16 * unit} fill="none" stroke={ink(0.5)} strokeWidth={2 * unit} />
          <path
            d={`M ${-8 * unit} ${-4 * unit} L 0 ${4 * unit} L ${8 * unit} ${-4 * unit}`}
            stroke={ink(0.45)}
            strokeWidth={2 * unit}
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </svg>

      {/* Wall flare where the ball just hit — brightest at the turn. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(24% 18% at ${(across * 100).toFixed(2)}% ${((ballY / height) * 100).toFixed(2)}%, ${courtGreen(0.16 * interpolateSafe(lift, [0, 0.4], [1, 0]))} 0%, transparent 70%)`,
        }}
      />

      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, transparent 44%, ${ink(0.6)} 68%, ${ink(0.92)} 100%)`,
          opacity: 0.86 + 0.14 * oscillate(t),
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
        idPrefix="promo-futsal"
      />

      <StageDressing />
    </AbsoluteFill>
  );
};
