/**
 * MapPinDropSingle — one venue landing on the map: the pin falls, the ground
 * ripples, and the address card unfolds beside it. The location block on
 * /venues/:id, played once when the map tab opens.
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
  chalk,
  clamp01,
  hairline,
  hashRange,
  ink,
  interpolateSafe,
  mix,
  tint,
  useMotionFrame,
} from "./venueKit";

const CANVAS_W = 1080;

export type MapPinDropSingleProps = {
  venueName: string;
  /** Street line, as the owner typed it into the listing. */
  addressLine: string;
  /** District / city. */
  district: string;
  /** Walking or driving note under the address. */
  travelNote: string;
  /** Where the pin lands, as a fraction of the frame. */
  pinX: number;
  pinY: number;
  /** Seed for the deterministic street grid. */
  seed: number;
  /** Drives the accent only. */
  sport: SportKey;
};

export const mapPinDropSingleDefaultProps: MapPinDropSingleProps = {
  venueName: "Ararat Arena",
  addressLine: "12 Baghramyan Ave",
  district: "Yerevan, Kentron",
  travelNote: "8 min from Republic Square",
  pinX: 0.5,
  pinY: 0.44,
  seed: 9,
  sport: "football",
};

/**
 * One-way: the pin drops, the ripple opens, the card unfolds and everything
 * holds. Reduced motion freezes on the LAST frame, which is the address —
 * freezing at 0 would show a map with no pin on it, which is the opposite of
 * the message.
 *
 * `spring()` carries the fall, because a pin has mass and should bottom out
 * with a small bounce. The ripple rings are `interpolate()`: they open once and
 * fade, and a ring that overshoots looks like a mistake. The street grid is
 * drawn from `hashRange`, never `Math.random`, so the same city is rendered on
 * every machine.
 */
export const MapPinDropSingle: FC<MapPinDropSingleProps> = ({
  venueName,
  addressLine,
  district,
  travelNote,
  pinX,
  pinY,
  seed,
  sport,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const accent = SPORTS[sport].accent;

  const px = width * clamp01(pinX);
  const py = height * clamp01(pinY);

  /* ── Beats ──────────────────────────────────────────────────────────── */
  const DROP_AT = 8;
  const LAND_AT = DROP_AT + 20;
  const CARD_AT = LAND_AT + 6;

  const drop = clamp01(
    spring({
      frame,
      fps,
      delay: DROP_AT,
      config: { damping: 12, mass: 0.9, stiffness: 150 },
      durationInFrames: 22,
    }),
  );
  const card = clamp01(
    spring({
      frame,
      fps,
      delay: CARD_AT,
      config: { damping: 22, mass: 0.9, stiffness: 135 },
      durationInFrames: 20,
    }),
  );

  const pinSize = 84 * unit;
  const pinY0 = -pinSize * 2.4;
  const pinTop = mix(pinY0, py - pinSize, drop);
  // The shadow tightens as the pin arrives, which is what sells the height.
  const shadowScale = mix(1.9, 1, drop);
  const shadowAlpha = mix(0.1, 0.5, drop);

  const rings = [0, 1, 2];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(84% 66% at ${pinX * 100}% ${pinY * 100}%, ${BRAND.surface1} 0%, ${BRAND.background} 78%)`,
        }}
      />

      {/* Street grid — deterministic, and completely still. */}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const y = hashRange(i * 2 + 1, 0.06, 0.96, seed) * height;
          return (
            <line
              key={`h${i}`}
              x1={0}
              y1={y}
              x2={width}
              y2={y}
              stroke={hairline(0.7)}
              strokeWidth={hashRange(i, 1, 3.4, seed) * unit}
            />
          );
        })}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const x = hashRange(i * 3 + 2, 0.05, 0.95, seed + 3) * width;
          return (
            <line
              key={`v${i}`}
              x1={x}
              y1={0}
              x2={x}
              y2={height}
              stroke={hairline(0.6)}
              strokeWidth={hashRange(i + 5, 1, 3, seed + 3) * unit}
            />
          );
        })}
        {/* One river-ish diagonal, so the grid does not read as graph paper. */}
        <path
          d={`M ${-0.05 * width} ${0.74 * height} Q ${0.36 * width} ${0.6 * height} ${0.62 * width} ${0.82 * height} T ${1.06 * width} ${0.78 * height}`}
          fill="none"
          stroke={tint(BRAND.cyan, 0.14)}
          strokeWidth={10 * unit}
        />
      </svg>

      {/* Ripple. Opens once, fades once — this is not a loop. */}
      {rings.map((i) => {
        const start = LAND_AT + i * 7;
        const r = interpolateSafe(
          frame,
          [start, start + 34],
          [10 * unit, 190 * unit],
          EASE_OUT_EXPO,
        );
        const alpha = interpolateSafe(frame, [start, start + 34], [0.45, 0]);
        if (alpha <= 0) {
          return null;
        }
        return (
          <div
            key={`r${i}`}
            style={{
              position: "absolute",
              left: px - r,
              top: py - r * 0.42,
              width: r * 2,
              height: r * 0.84,
              borderRadius: "50%",
              border: `${2 * unit}px solid ${tint(accent, alpha)}`,
            }}
          />
        );
      })}

      {/* Ground shadow. */}
      <div
        style={{
          position: "absolute",
          left: px - 40 * unit * shadowScale,
          top: py - 9 * unit,
          width: 80 * unit * shadowScale,
          height: 20 * unit,
          borderRadius: "50%",
          backgroundColor: ink(shadowAlpha),
          filter: `blur(${6 * unit}px)`,
        }}
      />

      {/* The pin. */}
      <div
        style={{
          position: "absolute",
          left: px - pinSize / 2,
          top: pinTop,
          width: pinSize,
          height: pinSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: `drop-shadow(0 ${10 * unit}px ${16 * unit}px ${ink(0.7)})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `radial-gradient(50% 50% at 50% 42%, ${tint(accent, 0.3 * drop)} 0%, transparent 70%)`,
          }}
        />
        <PinGlyph size={pinSize} color={accent} weight={2.1} />
      </div>

      {/* Address card. */}
      <div
        style={{
          position: "absolute",
          left: 82 * unit,
          right: 82 * unit,
          bottom: 96 * unit,
          padding: `${34 * unit}px ${36 * unit}px`,
          borderRadius: 26 * unit,
          backgroundColor: BRAND.card,
          border: `${1 * unit}px solid ${BRAND.borderStrong}`,
          boxShadow: `0 ${22 * unit}px ${46 * unit}px ${-16 * unit}px ${ink(0.9)}`,
          opacity: card,
          transform: `translateY(${28 * unit * (1 - card)}px)`,
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
          Location
        </div>
        <div
          style={{
            marginTop: 12 * unit,
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
            marginTop: 12 * unit,
            display: "flex",
            alignItems: "center",
            gap: 10 * unit,
          }}
        >
          <PinGlyph size={22 * unit} color={BRAND.mutedForeground} />
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 24 * unit,
              fontWeight: 500,
              color: BRAND.foregroundSoft,
            }}
          >
            {addressLine} · {district}
          </span>
        </div>
        <div
          style={{
            marginTop: 20 * unit,
            paddingTop: 20 * unit,
            borderTop: `${1 * unit}px solid ${BRAND.border}`,
            fontFamily: SANS_FONT,
            fontSize: 20 * unit,
            color: BRAND.mutedForeground,
          }}
        >
          {travelNote}
        </div>
      </div>

      {/* A chalk hairline over the card, matching the rate cards. */}
      <div
        style={{
          position: "absolute",
          left: 150 * unit,
          right: 150 * unit,
          bottom: 96 * unit,
          height: 2 * unit,
          opacity: card,
          background: `linear-gradient(90deg, transparent, ${chalk(0.3)}, transparent)`,
        }}
      />

      <StageDressing strength={0.65} />
    </AbsoluteFill>
  );
};
