/**
 * AmenityBadgeSpotlight — the facility badges laid out in a ring with a
 * floodlight sweeping over them, each lighting as the beam crosses it. The
 * ambient amenity panel on the owner-facing /owner/venues/:id preview.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { AmenityGlyph, StageDressing } from "./venueChrome";
import type { AmenityItem } from "./AmenityBadgeGrid";
import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  SPORTS,
  TAU,
  type SportKey,
  chalk,
  ink,
  mix,
  oscillate,
  smoothstep,
  tint,
  useMotionFrame,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type AmenityBadgeSpotlightProps = {
  /** Badges placed evenly around the ring, starting at the top. */
  amenities: AmenityItem[];
  venueName: string;
  /** Line in the middle of the ring. */
  centreLine: string;
  /** Whole beam revolutions across the loop. Must be a whole number. */
  sweeps: number;
  /** How wide the beam is, as a fraction of one badge's slice, 0.4–2. */
  beamWidth: number;
  /** Drives the accent only. */
  sport: SportKey;
};

export const amenityBadgeSpotlightDefaultProps: AmenityBadgeSpotlightProps = {
  amenities: [
    { label: "Floodlights", labelHy: "Լուսավորություն", icon: "floodlights" },
    { label: "Parking", labelHy: "Կայանատեղի", icon: "parking" },
    { label: "Showers", labelHy: "Ցնցուղներ", icon: "showers" },
    { label: "Lockers", labelHy: "Պահարաններ", icon: "lockers" },
    { label: "Café", labelHy: "Սրճարան", icon: "cafe" },
    { label: "Wi-Fi", labelHy: "Wi-Fi", icon: "wifi" },
    { label: "Seating", labelHy: "Նստատեղեր", icon: "seating" },
    { label: "Kit hire", labelHy: "Վարձույթ", icon: "equipment" },
  ],
  venueName: "Nairi Sports Hall",
  centreLine: "Included, every booking",
  sweeps: 1,
  beamWidth: 0.9,
  sport: "badminton",
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The beam angle is `sweeps · 360°·t`. A whole number of revolutions lands
 *     a rotation on the pixels it started on.
 *  2. Each badge's lit amount reads the *angular distance* between the beam and
 *     the badge, wrapped into [−0.5, 0.5) turns. That distance is a function of
 *     the beam angle modulo one turn, so a whole number of sweeps returns every
 *     badge to the exact brightness it opened on.
 *  3. The ring's breath and the centre halo are `oscillate(t)`, a full cosine
 *     period — equal in value and in slope at both ends.
 *  4. Badge positions never move at all.
 *
 * No one-way tween anywhere. Reduced motion freezes at 0, a fully drawn ring
 * with the beam at the top.
 */
export const AmenityBadgeSpotlight: FC<AmenityBadgeSpotlightProps> = ({
  amenities,
  venueName,
  centreLine,
  sweeps,
  beamWidth,
  sport,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const accent = SPORTS[sport].accent;

  const list =
    amenities.length > 0
      ? amenities
      : amenityBadgeSpotlightDefaultProps.amenities;
  const n = list.length;
  const turns = Math.max(1, Math.round(sweeps));
  const beam = Math.min(2, Math.max(0.4, beamWidth));

  const breath = oscillate(t);

  const cx = width / 2;
  const cy = height / 2;
  const ringR = Math.min(width, height) * 0.33;
  const badgeR = 62 * unit;

  /** Beam position in turns, in [0,1). */
  const beamTurn = wrap(turns * t, 1);

  /**
   * How lit badge `i` is, 0–1. The wrapped angular distance is symmetric and
   * periodic in `beamTurn`, so this closes exactly when the beam has made a
   * whole number of turns.
   */
  const litOf = (i: number): number => {
    const badgeTurn = i / n;
    // Signed distance in turns, folded into [-0.5, 0.5).
    const raw = wrap(beamTurn - badgeTurn + 0.5, 1) - 0.5;
    const halfSlice = beam / (2 * n);
    const d = Math.abs(raw) / halfSlice;
    return d >= 1 ? 0 : smoothstep(1 - d);
  };

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(72% 62% at 50% 46%, ${BRAND.surface1} 0%, ${BRAND.background} 76%)`,
        }}
      />

      {/* The beam. Whole revolutions only. */}
      <AbsoluteFill
        style={{
          background: `conic-gradient(from ${beamTurn * 360 - 90}deg at 50% 50%, ${tint(accent, 0.2)} 0deg, ${tint(accent, 0.05)} ${18 * beam}deg, transparent ${44 * beam}deg, transparent 316deg, ${tint(accent, 0.09)} 348deg, ${tint(accent, 0.2)} 360deg)`,
          opacity: 0.85,
        }}
      />

      {/* Ring hairline. Static; it only breathes in opacity. */}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={ringR}
          fill="none"
          stroke={chalk(0.09 + 0.05 * breath)}
          strokeWidth={1.6 * unit}
        />
        <circle
          cx={cx}
          cy={cy}
          r={ringR * 0.52}
          fill="none"
          stroke={chalk(0.05 + 0.03 * breath)}
          strokeWidth={1.2 * unit}
        />
      </svg>

      {/* Centre halo — one full cosine. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(26% 26% at 50% 50%, ${tint(accent, 0.13 + 0.06 * breath)} 0%, transparent 70%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: cy - 62 * unit,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 40 * unit,
            fontWeight: 700,
            letterSpacing: -0.04 * 40 * unit,
            color: BRAND.foreground,
          }}
        >
          {venueName}
        </div>
        <div
          style={{
            marginTop: 12 * unit,
            fontFamily: MONO_FONT,
            fontSize: 14 * unit,
            letterSpacing: 0.2 * 14 * unit,
            textTransform: "uppercase",
            color: tint(accent, 0.85 + 0.15 * breath),
          }}
        >
          {centreLine}
        </div>
      </div>

      {list.map((item, i) => {
        const angle = TAU * (i / n) - Math.PI / 2;
        const x = cx + Math.cos(angle) * ringR;
        const y = cy + Math.sin(angle) * ringR;
        const lit = litOf(i);

        return (
          <div
            key={item.label}
            style={{
              position: "absolute",
              left: x - badgeR,
              top: y - badgeR,
              width: badgeR * 2,
              height: badgeR * 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8 * unit,
              borderRadius: "50%",
              backgroundColor: lit > 0.02 ? tint(accent, 0.07 + 0.13 * lit) : BRAND.card,
              border: `${1.4 * unit}px solid ${lit > 0.02 ? tint(accent, 0.28 + 0.5 * lit) : BRAND.border}`,
              boxShadow: `0 0 ${34 * unit * lit}px ${tint(accent, 0.34 * lit)}, 0 ${8 * unit}px ${18 * unit}px ${-8 * unit}px ${ink(0.8)}`,
              transform: `scale(${mix(1, 1.09, lit)})`,
            }}
          >
            <AmenityGlyph
              icon={item.icon}
              size={30 * unit}
              color={lit > 0.02 ? accent : BRAND.mutedForeground}
              weight={1.8}
            />
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 15 * unit,
                fontWeight: 600,
                color: lit > 0.02 ? BRAND.foreground : BRAND.mutedForeground,
                textAlign: "center",
                lineHeight: 1.1,
                padding: `0 ${8 * unit}px`,
              }}
            >
              {item.label}
            </span>
          </div>
        );
      })}

      {/* Armenian gloss for whichever badge the beam is on. Discrete, so it
          changes at the same instant the lattice does. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 54 * unit,
          textAlign: "center",
          fontFamily: SANS_FONT,
          fontSize: 22 * unit,
          fontWeight: 500,
          color: BRAND.foregroundSoft,
        }}
      >
        {list[Math.floor(beamTurn * n) % n].labelHy}
      </div>

      <StageDressing strength={0.6} />
    </AbsoluteFill>
  );
};
