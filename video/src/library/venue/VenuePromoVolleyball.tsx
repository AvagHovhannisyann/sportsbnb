/**
 * VenuePromoVolleyball — the hero loop behind an indoor volleyball listing: the
 * net seen side-on, antennae swaying, and a ball arcing over and back. Card
 * header on /venues/:id and the vertical social cut for that listing.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { ListingPlate, StageDressing } from "./venueChrome";
import {
  BRAND,
  SANS_FONT,
  SPORTS,
  TAU,
  chalk,
  ink,
  mix,
  oscillate,
  tint,
  triangle,
  useMotionFrame,
  violet,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type VenuePromoVolleyballProps = {
  venueName: string;
  city: string;
  pricePerHour: number;
  rating: number;
  reviewCount: number;
  /** Times the ball crosses the net per loop. Even numbers bring it home. */
  crossings: number;
  /** Mesh cell size in design px. */
  meshCell: number;
  /** Caption above the net. */
  caption: string;
};

export const venuePromoVolleyballDefaultProps: VenuePromoVolleyballProps = {
  venueName: "Dinamo Hall",
  city: "Gyumri",
  pricePerHour: 6500,
  rating: 4.5,
  reviewCount: 42,
  crossings: 2,
  meshCell: 26,
  caption: "Net height 2.43 m",
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The ball's horizontal run is `triangle(crossings · t / 2)`: straight
 *     travel, instant reversal at each sideline. Even `crossings` means it is
 *     back at the left sideline at t=1 where it began at t=0.
 *  2. Its height is `|sin(π · crossings · t)|`, zero at every contact — the
 *     apex lands over the net and the low points land in the hands.
 *  3. The mesh scrolls by exactly one cell of a repeating gradient, which is
 *     indistinguishable from not scrolling at all.
 *  4. Antenna sway is `sin(2πt)`; the hall lights are a full cosine.
 *
 * No one-way tween anywhere.
 */
export const VenuePromoVolleyball: FC<VenuePromoVolleyballProps> = ({
  venueName,
  city,
  pricePerHour,
  rating,
  reviewCount,
  crossings,
  meshCell,
  caption,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const sport = SPORTS.volleyball;

  const glow = oscillate(t);
  const sway = Math.sin(TAU * t);

  const cell = meshCell * unit;
  const padX = 84 * unit;
  const courtW = width - padX * 2;
  const floorY = height * 0.56;
  const netTop = height * 0.16;
  const netH = height * 0.2;
  const cx = padX + courtW / 2;

  const across = triangle((crossings * t) / 2);
  const ballX = padX + 40 * unit + across * (courtW - 80 * unit);
  const rise = Math.abs(Math.sin(Math.PI * crossings * t));
  const ballY = floorY - 40 * unit - rise * (floorY - netTop + 40 * unit);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(96% 52% at 50% 24%, ${sport.surface} 0%, ${BRAND.background} 74%)`,
        }}
      />

      {/* Hall lights, breathing on a full cosine. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(48% 26% at 50% 6%, ${violet(0.06 + 0.07 * glow)} 0%, transparent 72%)`,
        }}
      />

      {/* The net mesh — a repeating grid moved by exactly one cell. */}
      <div
        style={{
          position: "absolute",
          left: padX,
          top: netTop,
          width: courtW,
          height: netH,
          backgroundImage: `repeating-linear-gradient(0deg, ${chalk(0.16)} 0px, ${chalk(0.16)} ${1.4 * unit}px, transparent ${1.4 * unit}px, transparent ${cell}px), repeating-linear-gradient(90deg, ${chalk(0.16)} 0px, ${chalk(0.16)} ${1.4 * unit}px, transparent ${1.4 * unit}px, transparent ${cell}px)`,
          backgroundPosition: `${t * cell}px ${t * cell}px`,
          borderTop: `${6 * unit}px solid ${chalk(0.55 + 0.2 * glow)}`,
          borderBottom: `${3 * unit}px solid ${chalk(0.28)}`,
        }}
      />

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
        fill="none"
      >
        {/* Floor and the attack lines either side of the net. */}
        <g stroke={chalk(0.2)} strokeWidth={2.4 * unit} strokeLinecap="round">
          <line x1={padX} y1={floorY} x2={padX + courtW} y2={floorY} />
          <line x1={cx} y1={floorY} x2={cx} y2={floorY + 26 * unit} />
          <line
            x1={cx - courtW * 0.19}
            y1={floorY + 14 * unit}
            x2={cx - courtW * 0.19}
            y2={floorY + 34 * unit}
          />
          <line
            x1={cx + courtW * 0.19}
            y1={floorY + 14 * unit}
            x2={cx + courtW * 0.19}
            y2={floorY + 34 * unit}
          />
        </g>

        {/* Posts and antennae. The antennae sway on one whole sine. */}
        {[padX, padX + courtW].map((x, i) => (
          <g key={i}>
            <line
              x1={x}
              y1={netTop - 10 * unit}
              x2={x}
              y2={floorY}
              stroke={chalk(0.3)}
              strokeWidth={5 * unit}
              strokeLinecap="round"
            />
            <line
              x1={x}
              y1={netTop - 10 * unit}
              x2={x + sway * 7 * unit}
              y2={netTop - 74 * unit}
              stroke={sport.accent}
              strokeWidth={4 * unit}
              strokeLinecap="round"
            />
          </g>
        ))}

        {/* Contact shadow, then the ball with its three-panel seam. */}
        <ellipse
          cx={ballX}
          cy={floorY - 6 * unit}
          rx={mix(30, 12, rise) * unit}
          ry={mix(9, 4, rise) * unit}
          fill={ink(mix(0.48, 0.1, rise))}
        />
        <g transform={`translate(${ballX} ${ballY}) rotate(${t * 360})`}>
          <circle r={26 * unit} fill={chalk(0.94)} />
          <circle r={26 * unit} fill="none" stroke={ink(0.42)} strokeWidth={2 * unit} />
          <path
            d={`M ${-26 * unit} ${-6 * unit} Q 0 ${8 * unit} ${26 * unit} ${-6 * unit}`}
            stroke={tint(sport.accent, 0.85)}
            strokeWidth={3 * unit}
            fill="none"
          />
          <path
            d={`M ${-26 * unit} ${8 * unit} Q 0 ${-6 * unit} ${26 * unit} ${8 * unit}`}
            stroke={ink(0.35)}
            strokeWidth={2.4 * unit}
            fill="none"
          />
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          top: netTop - 108 * unit,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: SANS_FONT,
          fontSize: 20 * unit,
          fontWeight: 500,
          color: tint(sport.accent, 0.5 + 0.3 * glow),
        }}
      >
        {caption}
      </div>

      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, transparent 46%, ${ink(0.6)} 70%, ${ink(0.92)} 100%)`,
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
        idPrefix="promo-volleyball"
      />

      <StageDressing />
    </AbsoluteFill>
  );
};
