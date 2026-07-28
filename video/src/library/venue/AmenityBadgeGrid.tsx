/**
 * AmenityBadgeGrid — the facilities a venue actually has, landing one after
 * another as a grid of badges. The "What this venue offers" block on
 * /venues/:id, played once when the section scrolls into view.
 */

import type { FC } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { AmenityGlyph, StageDressing, type AmenityIcon } from "./venueChrome";
import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  SANS_FONT,
  SPORTS,
  type SportKey,
  clamp01,
  eyebrowStyle,
  ink,
  interpolateSafe,
  mix,
  tint,
  useMotionFrame,
} from "./venueKit";

const CANVAS_W = 1080;

export type AmenityItem = {
  /** English label as the listing form writes it. */
  label: string;
  /** Armenian label — the venue page ships hy-AM under the English one. */
  labelHy: string;
  icon: AmenityIcon;
};

export type AmenityBadgeGridProps = {
  /** The amenities to reveal, in the order they should land. */
  amenities: AmenityItem[];
  venueName: string;
  /** Kicker above the grid. */
  eyebrow: string;
  /** Badges per row. */
  columns: number;
  /** Frames between one badge landing and the next. */
  staggerFrames: number;
  /** Drives the accent only. */
  sport: SportKey;
};

export const amenityBadgeGridDefaultProps: AmenityBadgeGridProps = {
  amenities: [
    { label: "Floodlights", labelHy: "Լուսավորություն", icon: "floodlights" },
    { label: "Free parking", labelHy: "Անվճար կայանատեղի", icon: "parking" },
    { label: "Showers", labelHy: "Ցնցուղներ", icon: "showers" },
    { label: "Lockers", labelHy: "Պահարաններ", icon: "lockers" },
    { label: "Café", labelHy: "Սրճարան", icon: "cafe" },
    { label: "Free Wi-Fi", labelHy: "Անվճար Wi-Fi", icon: "wifi" },
    { label: "Seating", labelHy: "Նստատեղեր", icon: "seating" },
    { label: "Kit hire", labelHy: "Գույքի վարձույթ", icon: "equipment" },
  ],
  venueName: "Ararat Arena",
  eyebrow: "What this venue offers",
  columns: 2,
  staggerFrames: 7,
  sport: "football",
};

/**
 * One-way: the badges arrive and the grid then holds, complete. Reduced motion
 * freezes on the LAST frame, where every amenity is legible — freezing at 0
 * would show a bare heading over an empty grid.
 *
 * `spring()` per badge because each one has to land with a little weight; the
 * ring flare behind it is `interpolate()`, since a ring expanding once is not
 * a landing and should not overshoot.
 */
export const AmenityBadgeGrid: FC<AmenityBadgeGridProps> = ({
  amenities,
  venueName,
  eyebrow,
  columns,
  staggerFrames,
  sport,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const accent = SPORTS[sport].accent;

  const list =
    amenities.length > 0 ? amenities : amenityBadgeGridDefaultProps.amenities;
  const cols = Math.max(1, Math.round(columns));
  const step = Math.max(1, Math.round(staggerFrames));

  const HEAD_AT = 4;
  const FIRST_AT = HEAD_AT + 12;

  const head = spring({
    frame,
    fps,
    delay: HEAD_AT,
    config: { damping: 22, mass: 0.9, stiffness: 130 },
    durationInFrames: 16,
  });

  const padX = 72 * unit;
  const gridW = width - padX * 2;
  const gap = 16 * unit;
  const badgeW = (gridW - gap * (cols - 1)) / cols;
  const badgeH = 106 * unit;
  const gridTop = 232 * unit;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(88% 62% at 50% 18%, ${BRAND.surface1} 0%, ${BRAND.background} 76%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: padX,
          top: 96 * unit,
          opacity: clamp01(head),
          transform: `translateY(${16 * unit * (1 - clamp01(head))}px)`,
        }}
      >
        <div style={eyebrowStyle(unit, accent)}>{eyebrow}</div>
        <div
          style={{
            marginTop: 14 * unit,
            fontFamily: DISPLAY_FONT,
            fontSize: 54 * unit,
            fontWeight: 700,
            letterSpacing: -0.04 * 54 * unit,
            color: BRAND.foreground,
          }}
        >
          {venueName}
        </div>
      </div>

      {list.map((item, i) => {
        const delay = FIRST_AT + i * step;
        const land = clamp01(
          spring({
            frame,
            fps,
            delay,
            config: { damping: 15, mass: 0.8, stiffness: 165 },
            durationInFrames: 20,
          }),
        );
        // The flare is a one-shot ring, not a spring: it opens and fades and is
        // never seen again.
        const flare = interpolateSafe(
          frame,
          [delay, delay + 10, delay + 26],
          [0, 1, 0],
          EASE_OUT_EXPO,
        );

        const x = padX + (i % cols) * (badgeW + gap);
        const y = gridTop + Math.floor(i / cols) * (badgeH + gap);

        return (
          <div
            key={item.label}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: badgeW,
              height: badgeH,
              display: "flex",
              alignItems: "center",
              gap: 18 * unit,
              padding: `0 ${22 * unit}px`,
              borderRadius: 20 * unit,
              backgroundColor: BRAND.card,
              border: `${1 * unit}px solid ${land > 0.5 ? tint(accent, 0.3) : BRAND.border}`,
              boxShadow: `0 ${10 * unit}px ${24 * unit}px ${-10 * unit}px ${ink(0.75)}, 0 0 0 ${8 * unit * flare}px ${tint(accent, 0.16 * flare)}`,
              opacity: land,
              transform: `translateY(${22 * unit * (1 - land)}px) scale(${mix(0.94, 1, land)})`,
            }}
          >
            <div
              style={{
                width: 56 * unit,
                height: 56 * unit,
                borderRadius: 16 * unit,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: tint(accent, 0.13),
                border: `${1 * unit}px solid ${tint(accent, 0.32)}`,
                flexShrink: 0,
              }}
            >
              <AmenityGlyph
                icon={item.icon}
                size={30 * unit}
                color={accent}
                weight={1.8}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: SANS_FONT,
                  fontSize: 25 * unit,
                  fontWeight: 600,
                  color: BRAND.foreground,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  marginTop: 4 * unit,
                  fontFamily: SANS_FONT,
                  fontSize: 18 * unit,
                  color: BRAND.mutedForeground,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.labelHy}
              </div>
            </div>
          </div>
        );
      })}

      {/* Count line, once the last badge is home. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 66 * unit,
          textAlign: "center",
          opacity: clamp01(
            interpolateSafe(
              frame,
              [FIRST_AT + list.length * step + 6, FIRST_AT + list.length * step + 20],
              [0, 1],
            ),
          ),
          fontFamily: MONO_FONT,
          fontSize: 17 * unit,
          letterSpacing: 0.16 * 17 * unit,
          textTransform: "uppercase",
          color: BRAND.mutedForeground,
        }}
      >
        {list.length} facilities · included in the listed price
      </div>

      <AbsoluteFill
        style={{
          background: `radial-gradient(92% 80% at 50% 46%, transparent 48%, ${ink(0.45)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <StageDressing strength={0.6} />
    </AbsoluteFill>
  );
};
