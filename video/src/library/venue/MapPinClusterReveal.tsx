/**
 * MapPinClusterReveal — every venue near you arriving on the map at once, pins
 * dropping in waves with their prices attached. The map view on /venues, played
 * once when a search finishes.
 */

import type { FC } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { PinGlyph, StageDressing } from "./venueChrome";
import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  SANS_FONT,
  SPORTS,
  type SportKey,
  clamp01,
  formatDram,
  hairline,
  hashInt,
  hashRange,
  ink,
  interpolateSafe,
  mix,
  tint,
  useMotionFrame,
} from "./venueKit";

const CANVAS_W = 1080;

export type MapPinClusterRevealProps = {
  /** How many venues land on the map. */
  pinCount: number;
  /** City the search was run in. */
  city: string;
  /** Line above the count. */
  eyebrow: string;
  /** Cheapest hourly rate in the result set, in dram. */
  fromPrice: number;
  /** Frames between one pin landing and the next. */
  staggerFrames: number;
  /** Which pin gets the price label and the highlight ring. */
  featuredIndex: number;
  /** Seed for the deterministic pin scatter and street grid. */
  seed: number;
  /** Drives the accent only. */
  sport: SportKey;
};

export const mapPinClusterRevealDefaultProps: MapPinClusterRevealProps = {
  pinCount: 14,
  city: "Yerevan",
  eyebrow: "Venues near you",
  fromPrice: 7000,
  staggerFrames: 4,
  featuredIndex: 5,
  seed: 17,
  sport: "futsal",
};

/**
 * One-way: an empty map fills with results and then holds them. Reduced motion
 * freezes on the LAST frame — every pin and the count are the content, and
 * frame 0 is a map of nothing.
 *
 * Pin positions come from `hashRange`, so the same search always plots the same
 * city; they are computed once per pin and never touched by the frame. Each pin
 * lands on its own `spring()`, the featured ring is a one-shot `interpolate()`.
 */
export const MapPinClusterReveal: FC<MapPinClusterRevealProps> = ({
  pinCount,
  city,
  eyebrow,
  fromPrice,
  staggerFrames,
  featuredIndex,
  seed,
  sport,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const accent = SPORTS[sport].accent;

  const total = Math.max(1, Math.round(pinCount));
  const step = Math.max(1, Math.round(staggerFrames));
  const featured = Math.min(Math.max(0, Math.round(featuredIndex)), total - 1);

  const FIRST_AT = 10;
  const lastAt = FIRST_AT + (total - 1) * step + 20;

  const header = clamp01(
    spring({
      frame,
      fps,
      delay: 4,
      config: { damping: 22, mass: 0.9, stiffness: 130 },
      durationInFrames: 16,
    }),
  );

  const countUp = clamp01(
    interpolateSafe(frame, [FIRST_AT, lastAt], [0, 1], EASE_OUT_EXPO),
  );
  const shownCount = Math.round(countUp * total);

  const indices: number[] = [];
  for (let i = 0; i < total; i += 1) {
    indices.push(i);
  }

  const mapTop = 224 * unit;
  const mapBottom = height - 190 * unit;

  const pinAt = (i: number) => ({
    x: hashRange(i * 5 + 1, 0.1, 0.9, seed) * width,
    y: mapTop + hashRange(i * 5 + 2, 0.08, 0.92, seed) * (mapBottom - mapTop),
    /** Small pins for the cheap end of the list, big ones for the rest. */
    size: mix(38, 56, hashRange(i * 5 + 3, 0, 1, seed)) * unit,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(86% 62% at 50% 52%, ${BRAND.surface1} 0%, ${BRAND.background} 80%)`,
        }}
      />

      {/* Streets. Still, deterministic, and behind everything. */}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
          const y = mapTop + hashRange(i * 2 + 1, 0.02, 0.98, seed + 1) * (mapBottom - mapTop);
          return (
            <line
              key={`h${i}`}
              x1={0}
              y1={y}
              x2={width}
              y2={y}
              stroke={hairline(0.65)}
              strokeWidth={hashRange(i, 1, 3, seed + 1) * unit}
            />
          );
        })}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const x = hashRange(i * 3 + 2, 0.04, 0.96, seed + 2) * width;
          return (
            <line
              key={`v${i}`}
              x1={x}
              y1={mapTop}
              x2={x}
              y2={mapBottom}
              stroke={hairline(0.55)}
              strokeWidth={hashRange(i + 4, 1, 2.6, seed + 2) * unit}
            />
          );
        })}
      </svg>

      {/* Header */}
      <div
        style={{
          position: "absolute",
          left: 72 * unit,
          top: 92 * unit,
          opacity: header,
          transform: `translateY(${16 * unit * (1 - header)}px)`,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 13 * unit,
            fontWeight: 500,
            letterSpacing: 0.2 * 13 * unit,
            textTransform: "uppercase",
            color: tint(accent, 0.95),
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            marginTop: 12 * unit,
            display: "flex",
            alignItems: "baseline",
            gap: 14 * unit,
          }}
        >
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 62 * unit,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -0.03 * 62 * unit,
              color: BRAND.foreground,
              lineHeight: 1,
            }}
          >
            {shownCount}
          </span>
          <span
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 36 * unit,
              fontWeight: 700,
              letterSpacing: -0.03 * 36 * unit,
              color: BRAND.foregroundSoft,
            }}
          >
            venues in {city}
          </span>
        </div>
      </div>

      {/* Pins */}
      {indices.map((i) => {
        const delay = FIRST_AT + i * step;
        const land = clamp01(
          spring({
            frame,
            fps,
            delay,
            config: { damping: 13, mass: 0.8, stiffness: 160 },
            durationInFrames: 20,
          }),
        );
        if (land <= 0) {
          return null;
        }
        const p = pinAt(i);
        const isFeatured = i === featured;
        const size = isFeatured ? p.size * 1.5 : p.size;
        // Faint variety in accent, so the cluster does not read as one colour.
        const tone = hashInt(i, 3, seed) === 0 ? BRAND.foregroundSoft : accent;
        const ring = interpolateSafe(
          frame,
          [delay + 6, delay + 26, delay + 44],
          [0, 1, 0],
          EASE_OUT_EXPO,
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x - size / 2,
              top: p.y - size + mix(-46 * unit, 0, land),
              width: size,
              height: size,
              opacity: land,
              transform: `scale(${mix(0.7, 1, land)})`,
            }}
          >
            {isFeatured ? (
              <div
                style={{
                  position: "absolute",
                  left: size / 2 - size * (0.6 + ring),
                  top: size * 0.42 - size * (0.6 + ring) * 0.45,
                  width: size * (1.2 + 2 * ring),
                  height: size * (1.2 + 2 * ring) * 0.45,
                  borderRadius: "50%",
                  border: `${2 * unit}px solid ${tint(accent, 0.5 * (1 - ring))}`,
                }}
              />
            ) : null}
            <PinGlyph
              size={size}
              color={isFeatured ? accent : tone}
              weight={isFeatured ? 2.2 : 1.9}
            />
          </div>
        );
      })}

      {/* Price flag on the featured pin. */}
      {(() => {
        const p = pinAt(featured);
        const delay = FIRST_AT + featured * step + 14;
        const show = clamp01(
          spring({
            frame,
            fps,
            delay,
            config: { damping: 20, mass: 0.85, stiffness: 150 },
            durationInFrames: 18,
          }),
        );
        return (
          <div
            style={{
              position: "absolute",
              left: p.x + 26 * unit,
              top: p.y - p.size * 1.9,
              padding: `${10 * unit}px ${16 * unit}px`,
              borderRadius: 12 * unit,
              backgroundColor: accent,
              opacity: show,
              transform: `translateY(${10 * unit * (1 - show)}px) scale(${mix(0.9, 1, show)})`,
              fontFamily: MONO_FONT,
              fontSize: 22 * unit,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              color: BRAND.primaryForeground,
              boxShadow: `0 ${10 * unit}px ${20 * unit}px ${-8 * unit}px ${ink(0.85)}`,
            }}
          >
            {formatDram(fromPrice)}
          </div>
        );
      })()}

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 74 * unit,
          textAlign: "center",
          opacity: clamp01(interpolateSafe(frame, [lastAt, lastAt + 14], [0, 1])),
        }}
      >
        <span
          style={{
            fontFamily: SANS_FONT,
            fontSize: 24 * unit,
            fontWeight: 600,
            color: BRAND.foreground,
          }}
        >
          From {formatDram(fromPrice)} / hour
        </span>
        <span
          style={{
            marginLeft: 14 * unit,
            fontFamily: SANS_FONT,
            fontSize: 21 * unit,
            color: BRAND.mutedForeground,
          }}
        >
          — the price you see is the price you pay.
        </span>
      </div>

      <AbsoluteFill
        style={{
          background: `radial-gradient(94% 84% at 50% 50%, transparent 50%, ${ink(0.44)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <StageDressing strength={0.6} />
    </AbsoluteFill>
  );
};
