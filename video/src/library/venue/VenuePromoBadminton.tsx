/**
 * VenuePromoBadminton — the hero loop behind a doubles-court listing: the
 * shuttle tracing a closed figure-eight over the net while the court breathes.
 * Card header on /venues/:id and the vertical social cut for that listing.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { ListingPlate, StageDressing } from "./venueChrome";
import {
  BRAND,
  SPORTS,
  TAU,
  chalk,
  ink,
  oscillate,
  tint,
  useMotionFrame,
  violet,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type VenuePromoBadmintonProps = {
  venueName: string;
  city: string;
  pricePerHour: number;
  rating: number;
  reviewCount: number;
  /** Half-width of the shuttle's figure-eight, as a fraction of the court. */
  pathWidth: number;
  /** Half-height of the figure-eight, as a fraction of the court. */
  pathHeight: number;
  /** Ghost shuttles trailing the live one. */
  trailLength: number;
};

export const venuePromoBadmintonDefaultProps: VenuePromoBadmintonProps = {
  venueName: "Ashtarak Sports Hall",
  city: "Ashtarak",
  pricePerHour: 5000,
  rating: 4.4,
  reviewCount: 37,
  pathWidth: 0.3,
  pathHeight: 0.17,
  trailLength: 7,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The shuttle rides a Lissajous figure: `x = sin(2πt)`, `y = sin(4πt)`.
 *     Frequencies 1 and 2 are whole, so the curve *closes* — the shuttle
 *     arrives at t=1 on the same point, with the same heading, it left at t=0.
 *     A figure-eight also happens to be what a rally looks like from above.
 *  2. Its rotation is the tangent of that curve, `atan2(dy, dx)`, which is a
 *     function of position and therefore just as periodic.
 *  3. The trail is the same parametric function at fixed phase offsets.
 *  4. Court glow is a full cosine.
 *
 * No one-way tween anywhere.
 */
export const VenuePromoBadminton: FC<VenuePromoBadmintonProps> = ({
  venueName,
  city,
  pricePerHour,
  rating,
  reviewCount,
  pathWidth,
  pathHeight,
  trailLength,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const sport = SPORTS.badminton;

  const glow = oscillate(t);

  const padX = 132 * unit;
  const courtW = width - padX * 2;
  const courtY = height * 0.1;
  const courtH = height * 0.48;
  const cx = padX + courtW / 2;
  const cy = courtY + courtH / 2;

  const ax = courtW * pathWidth;
  const ay = courtH * pathHeight;

  /** The closed curve, shared by the shuttle and every ghost behind it. */
  const shuttleAt = (phase: number) => {
    const a = TAU * phase;
    const x = cx + Math.sin(a) * ax;
    const y = cy + Math.sin(2 * a) * ay;
    // Tangent: derivative of the same two components.
    const dx = Math.cos(a) * ax;
    const dy = 2 * Math.cos(2 * a) * ay;
    return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
  };

  const live = shuttleAt(t);
  const ghosts = Array.from({ length: Math.max(0, trailLength) }, (_, i) =>
    shuttleAt(t - (i + 1) * 0.008),
  );

  const shuttleSize = 26 * unit;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(94% 52% at 50% 26%, ${sport.surface} 0%, ${BRAND.background} 76%)`,
        }}
      />

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
        fill="none"
      >
        <rect
          x={padX}
          y={courtY}
          width={courtW}
          height={courtH}
          fill={violet(0.05 + 0.02 * glow)}
        />

        <g stroke={chalk(0.24)} strokeWidth={2.2 * unit} strokeLinecap="round">
          {/* Doubles outer, singles inner, tramlines and service courts. */}
          <rect x={padX} y={courtY} width={courtW} height={courtH} />
          <line x1={padX + courtW * 0.07} y1={courtY} x2={padX + courtW * 0.07} y2={courtY + courtH} />
          <line
            x1={padX + courtW * 0.93}
            y1={courtY}
            x2={padX + courtW * 0.93}
            y2={courtY + courtH}
          />
          <line x1={padX} y1={courtY + courtH * 0.24} x2={padX + courtW} y2={courtY + courtH * 0.24} />
          <line x1={padX} y1={courtY + courtH * 0.76} x2={padX + courtW} y2={courtY + courtH * 0.76} />
          <line x1={padX} y1={courtY + courtH * 0.06} x2={padX + courtW} y2={courtY + courtH * 0.06} />
          <line x1={padX} y1={courtY + courtH * 0.94} x2={padX + courtW} y2={courtY + courtH * 0.94} />
          <line x1={cx} y1={courtY} x2={cx} y2={courtY + courtH * 0.24} />
          <line x1={cx} y1={courtY + courtH * 0.76} x2={cx} y2={courtY + courtH} />
        </g>

        {/* Net across the middle — posts, tape, and a light mesh. */}
        <g>
          <line
            x1={padX - 14 * unit}
            y1={cy}
            x2={padX + courtW + 14 * unit}
            y2={cy}
            stroke={chalk(0.42 + 0.18 * glow)}
            strokeWidth={5 * unit}
            strokeLinecap="round"
          />
          {Array.from({ length: 23 }, (_, i) => {
            const x = padX + (courtW * (i + 0.5)) / 23;
            return (
              <line
                key={i}
                x1={x}
                y1={cy - 10 * unit}
                x2={x}
                y2={cy + 10 * unit}
                stroke={chalk(0.1)}
                strokeWidth={1.3 * unit}
              />
            );
          })}
        </g>

        {/* The figure-eight itself, faintly, so the path reads as intentional. */}
        <path
          d={Array.from({ length: 97 }, (_, i) => {
            const p = shuttleAt(i / 96);
            return `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
          }).join(" ")}
          stroke={tint(sport.accent, 0.16)}
          strokeWidth={1.6 * unit}
          fill="none"
        />

        {ghosts.map((g, i) => (
          <g key={i} transform={`translate(${g.x} ${g.y}) rotate(${g.angle + 90})`}>
            <path
              d={`M 0 ${-shuttleSize * 0.36} L ${shuttleSize * 0.3} ${shuttleSize * 0.5} L ${-shuttleSize * 0.3} ${shuttleSize * 0.5} Z`}
              fill={chalk(0.16 - i * 0.02)}
            />
          </g>
        ))}

        {/* The shuttle: cork nose down, skirt up, pointing along the tangent. */}
        <g transform={`translate(${live.x} ${live.y}) rotate(${live.angle + 90})`}>
          <path
            d={`M 0 ${-shuttleSize * 0.42} L ${shuttleSize * 0.34} ${shuttleSize * 0.56} L ${-shuttleSize * 0.34} ${shuttleSize * 0.56} Z`}
            fill={chalk(0.9)}
          />
          <path
            d={`M ${-shuttleSize * 0.34} ${shuttleSize * 0.56} L ${shuttleSize * 0.34} ${shuttleSize * 0.56}`}
            stroke={chalk(0.55)}
            strokeWidth={2 * unit}
          />
          <circle cx={0} cy={-shuttleSize * 0.42} r={shuttleSize * 0.22} fill={sport.accent} />
        </g>
      </svg>

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
        idPrefix="promo-badminton"
      />

      <StageDressing />
    </AbsoluteFill>
  );
};
