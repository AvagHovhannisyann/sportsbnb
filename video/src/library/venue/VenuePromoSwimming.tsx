/**
 * VenuePromoSwimming — the hero loop behind a lane-hire listing: a 25 m pool
 * from above, lane ropes drifting, caustics moving on the tiles and one swimmer
 * marker running a length and back. Card header on /venues/:id.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { ListingPlate, StageDressing } from "./venueChrome";
import {
  BRAND,
  MONO_FONT,
  SPORTS,
  TAU,
  chalk,
  cyan,
  ink,
  oscillate,
  tint,
  triangle,
  useMotionFrame,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type VenuePromoSwimmingProps = {
  venueName: string;
  city: string;
  /** Listed price for one lane hour, in dram. */
  pricePerLaneHour: number;
  rating: number;
  reviewCount: number;
  /** Lanes drawn across the pool. */
  lanes: number;
  /** Whole lengths the swimmer marker covers per loop. Even ends where it began. */
  lengths: number;
  /** Diameter of one lane-rope float in design px. */
  floatSize: number;
};

export const venuePromoSwimmingDefaultProps: VenuePromoSwimmingProps = {
  venueName: "Aquatek 25m",
  city: "Yerevan",
  pricePerLaneHour: 10000,
  rating: 4.7,
  reviewCount: 64,
  lanes: 6,
  lengths: 2,
  floatSize: 15,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The lane ropes are a repeating gradient of floats scrolled by exactly one
 *     float period, which a repeating pattern cannot distinguish from standing
 *     still. Alternate lanes scroll the other way, also by one whole period.
 *  2. The caustics are a sum of three sines whose frequencies are whole numbers
 *     of cycles per loop (1, 2 and 3), so the sum is periodic with the loop.
 *  3. The swimmer marker is `triangle(lengths · t / 2)` — down the lane and
 *     back, at constant speed, turning instantly at the wall.
 *  4. The water tint and the lane-clock hand are full cosines / whole turns.
 *
 * No one-way tween anywhere.
 */
export const VenuePromoSwimming: FC<VenuePromoSwimmingProps> = ({
  venueName,
  city,
  pricePerLaneHour,
  rating,
  reviewCount,
  lanes,
  lengths,
  floatSize,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const sport = SPORTS.swimming;

  const shimmer = oscillate(t);
  const float = floatSize * unit;

  const padX = 72 * unit;
  const poolX = padX;
  const poolW = width - padX * 2;
  const poolY = height * 0.09;
  const poolH = height * 0.5;
  const laneH = poolH / lanes;

  const along = triangle((lengths * t) / 2);
  const swimLane = 2;
  const swimX = poolX + 34 * unit + along * (poolW - 68 * unit);
  const swimY = poolY + laneH * (swimLane + 0.5);

  /** Three whole-numbered harmonics — the sum repeats exactly once per loop. */
  const caustic = (i: number): number =>
    0.5 +
    0.5 *
      ((Math.sin(TAU * (t + i * 0.07)) +
        Math.sin(TAU * 2 * (t + i * 0.13)) +
        Math.sin(TAU * 3 * (t + i * 0.19))) /
        3);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(96% 54% at 50% 26%, ${sport.surface} 0%, ${BRAND.background} 78%)`,
        }}
      />

      {/* The water. */}
      <div
        style={{
          position: "absolute",
          left: poolX,
          top: poolY,
          width: poolW,
          height: poolH,
          borderRadius: 10 * unit,
          background: `linear-gradient(180deg, ${cyan(0.13 + 0.03 * shimmer)} 0%, ${cyan(0.07)} 100%)`,
          border: `${2 * unit}px solid ${chalk(0.14)}`,
          overflow: "hidden",
        }}
      >
        {/* Caustics — four bands, each a sum of whole harmonics. */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${-20 + 30 * i}%`,
              top: `${-10 + caustic(i) * 20}%`,
              width: "56%",
              height: "120%",
              background: `radial-gradient(50% 40% at 50% 50%, ${chalk(0.06 + 0.05 * caustic(i + 4))} 0%, transparent 72%)`,
              transform: `rotate(${-18 + caustic(i + 8) * 36}deg)`,
            }}
          />
        ))}

        {/* Tile grid on the pool floor. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `repeating-linear-gradient(0deg, ${chalk(0.05)} 0px, ${chalk(0.05)} ${1.2 * unit}px, transparent ${1.2 * unit}px, transparent ${28 * unit}px), repeating-linear-gradient(90deg, ${chalk(0.05)} 0px, ${chalk(0.05)} ${1.2 * unit}px, transparent ${1.2 * unit}px, transparent ${28 * unit}px)`,
          }}
        />

        {/* Lane ropes. Alternate lanes drift the opposite way, each by exactly
            one float period. */}
        {Array.from({ length: lanes - 1 }, (_, i) => {
          const dir = i % 2 === 0 ? 1 : -1;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: laneH * (i + 1) - float / 2,
                height: float,
                backgroundImage: `repeating-linear-gradient(90deg, ${tint(sport.accent, 0.55)} 0px, ${tint(sport.accent, 0.55)} ${float}px, ${chalk(0.5)} ${float}px, ${chalk(0.5)} ${float * 2}px)`,
                backgroundPosition: `${dir * t * float * 2}px 0px`,
                opacity: 0.6,
                borderRadius: 999,
              }}
            />
          );
        })}

        {/* Lane centre lines on the floor. */}
        {Array.from({ length: lanes }, (_, i) => (
          <div
            key={`c${i}`}
            style={{
              position: "absolute",
              left: "8%",
              right: "8%",
              top: laneH * (i + 0.5) - 3 * unit,
              height: 6 * unit,
              backgroundColor: cyan(0.22),
              borderRadius: 999,
            }}
          />
        ))}

        {/* The swimmer marker — a wake wedge, so direction is legible. */}
        <div
          style={{
            position: "absolute",
            left: swimX - poolX - 26 * unit,
            top: swimY - poolY - 12 * unit,
            width: 52 * unit,
            height: 24 * unit,
            borderRadius: 999,
            background: `linear-gradient(${along > 0.5 ? 270 : 90}deg, ${chalk(0.86)} 0%, ${chalk(0.1)} 100%)`,
            boxShadow: `0 0 ${26 * unit}px ${cyan(0.4)}`,
          }}
        />
      </div>

      {/* Lane clock — one whole turn of the hand per loop. */}
      <svg
        width={92 * unit}
        height={92 * unit}
        viewBox="0 0 92 92"
        style={{ position: "absolute", left: width / 2 - 46 * unit, top: poolY - 116 * unit }}
        fill="none"
      >
        <circle cx={46} cy={46} r={40} stroke={chalk(0.16)} strokeWidth={3} />
        <circle cx={46} cy={46} r={40} stroke={tint(sport.accent, 0.3)} strokeWidth={3} strokeDasharray="4 8" />
        <line
          x1={46}
          y1={46}
          x2={46 + Math.sin(TAU * t) * 30}
          y2={46 - Math.cos(TAU * t) * 30}
          stroke={sport.accent}
          strokeWidth={3.4}
          strokeLinecap="round"
        />
        <circle cx={46} cy={46} r={4} fill={sport.accent} />
      </svg>

      <div
        style={{
          position: "absolute",
          top: poolY + poolH + 18 * unit,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: MONO_FONT,
          fontSize: 16 * unit,
          fontWeight: 500,
          letterSpacing: 0.2 * 16 * unit,
          textTransform: "uppercase",
          color: tint(sport.accent, 0.4 + 0.3 * shimmer),
        }}
      >
        {lanes} lanes · 25 m
      </div>

      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, transparent 48%, ${ink(0.58)} 70%, ${ink(0.92)} 100%)`,
        }}
      />

      <ListingPlate
        venueName={venueName}
        city={city}
        sportLabel={sport.label}
        accent={sport.accent}
        price={pricePerLaneHour}
        per="lane hour"
        rating={rating}
        reviewCount={reviewCount}
        unit={unit}
        width={width}
        bottom={72 * unit}
        idPrefix="promo-swimming"
      />

      <StageDressing />
    </AbsoluteFill>
  );
};
