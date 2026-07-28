/**
 * AmenityBadgeMarquee — the venue's facilities running past on an endless rail,
 * two lanes travelling opposite ways. The compact amenity strip on the venue
 * card in /venues search results, where there is width but no height.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { AmenityGlyph, StageDressing } from "./venueChrome";
import type { AmenityItem } from "./AmenityBadgeGrid";
import {
  BRAND,
  MONO_FONT,
  SANS_FONT,
  SPORTS,
  type SportKey,
  ink,
  oscillate,
  tint,
  useMotionFrame,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type AmenityBadgeMarqueeProps = {
  /** Amenities on the top lane. */
  topLane: AmenityItem[];
  /** Amenities on the bottom lane, which travels the other way. */
  bottomLane: AmenityItem[];
  venueName: string;
  /** Whole rail lengths travelled across the loop. Must be a whole number. */
  laps: number;
  /** Design-px width of one badge. The rail period is a multiple of this. */
  badgeWidth: number;
  /** Drives the accent only. */
  sport: SportKey;
};

export const amenityBadgeMarqueeDefaultProps: AmenityBadgeMarqueeProps = {
  topLane: [
    { label: "Floodlights", labelHy: "Լուսավորություն", icon: "floodlights" },
    { label: "Free parking", labelHy: "Անվճար կայանատեղի", icon: "parking" },
    { label: "Showers", labelHy: "Ցնցուղներ", icon: "showers" },
    { label: "Lockers", labelHy: "Պահարաններ", icon: "lockers" },
  ],
  bottomLane: [
    { label: "Café", labelHy: "Սրճարան", icon: "cafe" },
    { label: "Free Wi-Fi", labelHy: "Անվճար Wi-Fi", icon: "wifi" },
    { label: "Seating", labelHy: "Նստատեղեր", icon: "seating" },
    { label: "Kit hire", labelHy: "Գույքի վարձույթ", icon: "equipment" },
  ],
  venueName: "Ararat Arena",
  laps: 1,
  badgeWidth: 300,
  sport: "tennis",
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. Each lane is a wrap lattice on position. Badge `i` sits at
 *     `x = wrap(i·pitch − travel, span) − pitch`, and `travel` climbs by
 *     exactly `laps · items.length · pitch` across the loop. That shift maps
 *     the lattice of badge slots onto itself, and it moves indices by a whole
 *     multiple of `items.length`, so the badge that lands in a given slot at
 *     t=1 carries the same amenity as the badge that occupied it at t=0. The
 *     rail is pixel-identical at both ends.
 *  2. Enough copies are laid out to overrun both edges, so a badge that leaves
 *     on the left is already redrawn on the right — nothing pops.
 *  3. The lane glow breathes on `oscillate(t)`, a full cosine period, so it
 *     matches in value and in slope across the seam.
 *
 * No one-way tween anywhere. Reduced motion freezes at 0, which is a fully
 * populated rail.
 */
export const AmenityBadgeMarquee: FC<AmenityBadgeMarqueeProps> = ({
  topLane,
  bottomLane,
  venueName,
  laps,
  badgeWidth,
  sport,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const accent = SPORTS[sport].accent;

  const top =
    topLane.length > 0 ? topLane : amenityBadgeMarqueeDefaultProps.topLane;
  const bottom =
    bottomLane.length > 0
      ? bottomLane
      : amenityBadgeMarqueeDefaultProps.bottomLane;

  const turns = Math.max(1, Math.round(laps));
  const gap = 16 * unit;
  const pitch = badgeWidth * unit + gap;
  const breath = oscillate(t);

  const laneH = 96 * unit;
  const laneGap = 22 * unit;
  const railTop = height / 2 - laneH - laneGap / 2;

  /**
   * One lane. `direction` is +1 for right-to-left travel and −1 for the other
   * way; both are the same modulo, so both close exactly at t=1.
   *
   * A plain render helper rather than a nested component: it closes over the
   * frame, and a component declared inside a render would be a new type on
   * every frame.
   */
  const renderLane = (
    items: AmenityItem[],
    laneY: number,
    direction: number,
    laneKey: string,
  ) => {
    const period = items.length * pitch;
    // Enough repeats to cover the frame plus one badge of overrun each side.
    const copies = Math.ceil(width / period) + 2;
    const cells: { item: AmenityItem; index: number }[] = [];
    for (let c = 0; c < copies; c += 1) {
      for (let i = 0; i < items.length; i += 1) {
        cells.push({ item: items[i], index: c * items.length + i });
      }
    }
    const travel = direction * turns * period * t;
    const span = copies * period;

    return (
      <div
        key={laneKey}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: laneY,
          height: laneH,
          overflow: "hidden",
        }}
      >
        {cells.map((cell) => {
          const x = wrap(cell.index * pitch - travel, span) - pitch;
          return (
            <div
              key={cell.index}
              style={{
                position: "absolute",
                left: x,
                top: 0,
                width: badgeWidth * unit,
                height: laneH,
                display: "flex",
                alignItems: "center",
                gap: 16 * unit,
                padding: `0 ${20 * unit}px`,
                borderRadius: 18 * unit,
                backgroundColor: BRAND.card,
                border: `${1 * unit}px solid ${BRAND.border}`,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: 48 * unit,
                  height: 48 * unit,
                  borderRadius: 14 * unit,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: tint(accent, 0.12 + 0.05 * breath),
                  border: `${1 * unit}px solid ${tint(accent, 0.3)}`,
                  flexShrink: 0,
                }}
              >
                <AmenityGlyph
                  icon={cell.item.icon}
                  size={26 * unit}
                  color={accent}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: SANS_FONT,
                    fontSize: 23 * unit,
                    fontWeight: 600,
                    color: BRAND.foreground,
                    whiteSpace: "nowrap",
                  }}
                >
                  {cell.item.label}
                </div>
                <div
                  style={{
                    marginTop: 3 * unit,
                    fontFamily: SANS_FONT,
                    fontSize: 16 * unit,
                    color: BRAND.mutedForeground,
                    whiteSpace: "nowrap",
                  }}
                >
                  {cell.item.labelHy}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(80% 120% at 50% 50%, ${BRAND.surface1} 0%, ${BRAND.background} 78%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(46% 50% at 50% 50%, ${tint(accent, 0.09 + 0.05 * breath)} 0%, transparent 72%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 54 * unit,
          textAlign: "center",
          fontFamily: MONO_FONT,
          fontSize: 15 * unit,
          letterSpacing: 0.2 * 15 * unit,
          textTransform: "uppercase",
          color: tint(accent, 0.9),
        }}
      >
        {venueName} · facilities
      </div>

      {renderLane(top, railTop, 1, "top")}
      {renderLane(bottom, railTop + laneH + laneGap, -1, "bottom")}

      {/* Edge fades, so badges dissolve rather than clip at the frame. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(90deg, ${BRAND.background} 0%, transparent 12%, transparent 88%, ${BRAND.background} 100%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 54 * unit,
          textAlign: "center",
          fontFamily: SANS_FONT,
          fontSize: 20 * unit,
          fontWeight: 500,
          color: BRAND.mutedForeground,
        }}
      >
        Everything above is included — the listed price is the whole price.
      </div>

      <AbsoluteFill
        style={{
          background: `radial-gradient(94% 88% at 50% 50%, transparent 52%, ${ink(0.42)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <StageDressing strength={0.55} />
    </AbsoluteFill>
  );
};
