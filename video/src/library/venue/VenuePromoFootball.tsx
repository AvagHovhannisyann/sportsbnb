/**
 * VenuePromoFootball — the hero loop behind an 11-a-side listing: an overhead
 * chalked pitch under a rotating floodlight, with the ball running the centre
 * circle. Sits on /venues/:id as the card header and doubles as the vertical
 * social cut for that listing.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { ListingPlate, StageDressing } from "./venueChrome";
import {
  BRAND,
  SPORTS,
  TAU,
  chalk,
  courtGreen,
  ink,
  oscillate,
  tint,
  useMotionFrame,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type VenuePromoFootballProps = {
  venueName: string;
  city: string;
  /** Listed price per hour in dram. What the player pays; what the owner keeps. */
  pricePerHour: number;
  rating: number;
  reviewCount: number;
  /** Whole floodlight revolutions across the loop. Must be an integer. */
  lightTurns: number;
  /** Whole laps the ball runs around the centre circle. Must be an integer. */
  ballLaps: number;
  /** Opacity of the chalk, 0–1. */
  chalkOpacity: number;
};

export const venuePromoFootballDefaultProps: VenuePromoFootballProps = {
  venueName: "Ararat Arena",
  city: "Yerevan",
  pricePerHour: 12000,
  rating: 4.8,
  reviewCount: 126,
  lightTurns: 1,
  ballLaps: 1,
  chalkOpacity: 0.24,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The floodlight is a conic wash rotated by `lightTurns · 360°`. Whole
 *     turns of a rotation land on the same pixels they started on.
 *  2. The ball's angle is `ballLaps · 2π t` around a circle — a closed path,
 *     so there is no end to fall off.
 *  3. The mown stripes scroll by exactly one stripe period (`2 · STRIPE`),
 *     which a repeating gradient cannot tell apart from not having moved.
 *  4. Chalk breath and the centre-spot halo are `oscillate(t)`, a full cosine.
 *
 * No one-way tween anywhere. Frame 0 and frame `durationInFrames` are the same
 * picture.
 */
export const VenuePromoFootball: FC<VenuePromoFootballProps> = ({
  venueName,
  city,
  pricePerHour,
  rating,
  reviewCount,
  lightTurns,
  ballLaps,
  chalkOpacity,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state, so freezing there hides nothing.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const sport = SPORTS.football;

  const breath = oscillate(t);
  const angle = TAU * ballLaps * t;

  // Pitch geometry, in rendered px.
  const padX = 84 * unit;
  const boxX = padX;
  const boxW = width - padX * 2;
  const boxY = height * 0.1;
  const boxH = height * 0.46;
  const cx = boxX + boxW / 2;
  const cy = boxY + boxH / 2;
  const circleR = Math.min(boxW, boxH) * 0.2;

  const stroke = chalk(chalkOpacity + 0.05 * breath);
  const w = 2.4 * unit;

  const stripe = 74 * unit;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 52% at 50% 26%, ${sport.surface} 0%, ${BRAND.background} 74%)`,
        }}
      />

      {/* Mown stripes. One full period of travel = no travel at all. */}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(96deg, ${chalk(0.028)} 0px, ${chalk(0.028)} ${stripe}px, transparent ${stripe}px, transparent ${stripe * 2}px)`,
          backgroundPosition: `${t * stripe * 2}px 0px`,
          opacity: 0.9,
        }}
      />

      {/* Floodlight — whole revolutions only. */}
      <AbsoluteFill
        style={{
          transform: `rotate(${lightTurns * 360 * t}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
        }}
      >
        <AbsoluteFill
          style={{
            background: `conic-gradient(from 0deg at ${cx}px ${cy}px, transparent 0deg, ${courtGreen(0.14)} 26deg, transparent 62deg, transparent 360deg)`,
          }}
        />
      </AbsoluteFill>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
        fill="none"
      >
        <g stroke={stroke} strokeWidth={w} strokeLinecap="round">
          <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={8 * unit} />
          <line x1={boxX} y1={cy} x2={boxX + boxW} y2={cy} />
          <circle cx={cx} cy={cy} r={circleR} />
          {/* Penalty areas, top and bottom. */}
          <rect
            x={cx - boxW * 0.3}
            y={boxY}
            width={boxW * 0.6}
            height={boxH * 0.16}
          />
          <rect
            x={cx - boxW * 0.3}
            y={boxY + boxH - boxH * 0.16}
            width={boxW * 0.6}
            height={boxH * 0.16}
          />
          {/* Six-yard boxes. */}
          <rect
            x={cx - boxW * 0.15}
            y={boxY}
            width={boxW * 0.3}
            height={boxH * 0.07}
          />
          <rect
            x={cx - boxW * 0.15}
            y={boxY + boxH - boxH * 0.07}
            width={boxW * 0.3}
            height={boxH * 0.07}
          />
        </g>

        {/* Centre spot halo — a full cosine, so it breathes rather than fades. */}
        <circle cx={cx} cy={cy} r={(4 + 2 * breath) * unit} fill={courtGreen(0.55 + 0.3 * breath)} />
        <circle
          cx={cx}
          cy={cy}
          r={circleR * (0.3 + 0.7 * breath)}
          fill="none"
          stroke={courtGreen(0.2 * (1 - breath))}
          strokeWidth={1.6 * unit}
        />

        {/* The ball, running the centre circle. */}
        <circle
          cx={cx + Math.cos(angle) * circleR}
          cy={cy + Math.sin(angle) * circleR}
          r={13 * unit}
          fill={chalk(0.93)}
        />
        <circle
          cx={cx + Math.cos(angle) * circleR}
          cy={cy + Math.sin(angle) * circleR}
          r={13 * unit}
          fill="none"
          stroke={ink(0.55)}
          strokeWidth={2 * unit}
        />
        {/* Its trail — three ghosts at fixed angular offsets, so the trail is
            as periodic as the ball is. */}
        {[1, 2, 3].map((i) => (
          <circle
            key={i}
            cx={cx + Math.cos(angle - i * 0.16) * circleR}
            cy={cy + Math.sin(angle - i * 0.16) * circleR}
            r={(11 - i * 2) * unit}
            fill={chalk(0.2 - i * 0.05)}
          />
        ))}
      </svg>

      {/* Accent wash under the plate so the type never sits on bare pitch. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, transparent 42%, ${ink(0.62)} 66%, ${ink(0.9)} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 26% at 50% 88%, ${tint(sport.accent, 0.1)} 0%, transparent 72%)`,
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
        idPrefix="promo-football"
      />

      <StageDressing />
    </AbsoluteFill>
  );
};
