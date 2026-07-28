/**
 * KpiTileRowReveal — the row of stat tiles across the top of /owner-dashboard
 * on first paint: revenue, bookings, occupancy, venues.
 * One-way: tiles stagger in on `STAT_STAGGER_STEP` and each numeral counts to
 * its exact value. Reduced motion holds the fully settled row.
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {
  BRAND,
  CHART_HSL,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  STAT_STAGGER_STEP,
  ZERO_COMMISSION_NOTE,
  cardSurface,
  countTo,
  courtGreen,
  dram,
  eyebrowStyle,
  groupDigits,
  hairline,
  interpolateSafe,
  muted,
  tone,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS_W = 1440;

/** How a tile's numeral is written. Never a fee, never a net-of-anything. */
export type KpiFormat = "dram" | "count" | "percent";

export type KpiTileSpec = {
  /** Mono caps label. */
  label: string;
  /** The exact value the numeral lands on. */
  value: number;
  /** How the numeral is written. */
  format: KpiFormat;
  /** Small line under the numeral. Empty string hides it. */
  caption: string;
  /** Chip text, e.g. "+12%". Empty string hides the chip. */
  delta: string;
  /** Index into `CHART_HSL`, 0–4. Out of range values clamp. */
  accent: number;
};

export type KpiTileRowRevealProps = {
  /** The tiles, left to right. Prop-driven — never invented per render. */
  tiles: KpiTileSpec[];
  /** Mono caps heading over the row. Empty string hides it. */
  title: string;
  /** Frames before the first tile arrives. */
  startDelay: number;
  /** Frames each numeral takes to count. */
  countDuration: number;
};

export const kpiTileRowRevealDefaultProps: KpiTileRowRevealProps = {
  tiles: [
    {
      label: "Revenue",
      value: 1620000,
      format: "dram",
      caption: "Last 30 days",
      delta: "+12%",
      accent: 0,
    },
    {
      label: "Bookings",
      value: 116,
      format: "count",
      caption: "Across all courts",
      delta: "+9",
      accent: 1,
    },
    {
      label: "Occupancy",
      value: 69,
      format: "percent",
      caption: "Peak hours 18:00–22:00",
      delta: "+4 pts",
      accent: 2,
    },
    {
      label: "Venues live",
      value: 3,
      format: "count",
      caption: "All accepting bookings",
      delta: "",
      accent: 3,
    },
  ],
  title: "Your month so far",
  startDelay: 16,
  countDuration: 66,
};

/**
 * 50ms between tiles, in frames — `STAT_STAGGER_STEP` at the composition's own
 * rate, uncapped because a stat row is never longer than a handful of tiles.
 */
const staggerFrames = (index: number, fps: number): number =>
  STAT_STAGGER_STEP * fps * index;

const writeValue = (value: number, format: KpiFormat): string => {
  if (format === "dram") return dram(value);
  if (format === "percent") return `${Math.round(value)}%`;
  return groupDigits(Math.round(value));
};

export const KpiTileRowReveal: FC<KpiTileRowRevealProps> = ({
  tiles,
  title,
  startDelay,
  countDuration,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();
  // One-way: the settled figures are the message, so reduced motion holds them.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = width / CANVAS_W;

  const list = tiles.length > 0 ? tiles : [];
  const gap = 22 * unit;
  const padX = 36 * unit;
  const topPad = title.length > 0 ? 96 * unit : 36 * unit;
  const tileW =
    list.length > 0
      ? (width - padX * 2 - gap * (list.length - 1)) / list.length
      : 0;
  const tileH = height - topPad - 36 * unit;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(88% 78% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 74%)`,
        }}
      />

      {title.length > 0 ? (
        <div
          style={{
            position: "absolute",
            left: padX,
            top: 36 * unit,
            display: "flex",
            alignItems: "center",
            gap: 16 * unit,
            opacity: interpolateSafe(frame, [0, 14], [0, 1]),
          }}
        >
          <span style={{ ...eyebrowStyle(unit * 1.15) }}>{title}</span>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 14.5 * unit,
              color: muted(0.85),
            }}
          >
            {ZERO_COMMISSION_NOTE}
          </span>
        </div>
      ) : null}

      <Sequence name="Tiles" layout="none">
        {list.map((tile, i) => {
          const delay = Math.round(startDelay) + staggerFrames(i, fps);
          const enter = interpolateSafe(frame, [delay, delay + 20], [0, 1]);
          const shown = countTo({
            frame,
            from: 0,
            to: tile.value,
            delay: delay + 4,
            duration: Math.max(1, Math.round(countDuration)),
          });
          const settled = delay + 4 + Math.max(1, Math.round(countDuration));
          const accent =
            CHART_HSL[
              Math.max(0, Math.min(CHART_HSL.length - 1, Math.round(tile.accent)))
            ];

          return (
            <div
              key={tile.label}
              style={{
                position: "absolute",
                left: padX + (tileW + gap) * i,
                top: topPad,
                width: tileW,
                height: tileH,
                ...cardSurface(unit, 20),
                overflow: "hidden",
                padding: `${24 * unit}px ${24 * unit}px`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                opacity: enter,
                transform: `translateY(${((1 - enter) * 18 * unit).toFixed(2)}px)`,
              }}
            >
              {/* Accent wash and top rule — how the app tells its tiles apart
                  without four different card colours. */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  height: 3 * unit,
                  background: `linear-gradient(90deg, ${tone(accent, 0.9)}, ${tone(accent, 0.05)})`,
                  transformOrigin: "left center",
                  transform: `scaleX(${enter.toFixed(4)})`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(80% 120% at 100% 0%, ${tone(accent, 0.08)} 0%, transparent 64%)`,
                  pointerEvents: "none",
                }}
              />

              <div
                style={{ ...eyebrowStyle(unit, tone(accent, 0.95)), zIndex: 1 }}
              >
                {tile.label}
              </div>

              <div
                style={{
                  marginTop: 14 * unit,
                  fontFamily: MONO_FONT,
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 46 * unit,
                  fontWeight: 500,
                  letterSpacing: -0.025 * 46 * unit,
                  lineHeight: 1,
                  color: BRAND.foreground,
                  zIndex: 1,
                }}
              >
                {writeValue(shown, tile.format)}
              </div>

              {tile.caption.length > 0 ? (
                <div
                  style={{
                    marginTop: 12 * unit,
                    fontFamily: SANS_FONT,
                    fontSize: 14.5 * unit,
                    color: muted(0.9),
                    zIndex: 1,
                  }}
                >
                  {tile.caption}
                </div>
              ) : null}

              {/* Always rendered, hidden when empty: a tile with no delta must
                  still occupy the same vertical rhythm as its neighbours, or
                  the row's baselines drift apart. */}
              <div
                style={{
                  marginTop: 16 * unit,
                  alignSelf: "flex-start",
                  visibility: tile.delta.length > 0 ? "visible" : "hidden",
                  padding: `${7 * unit}px ${13 * unit}px`,
                  borderRadius: 999,
                  backgroundColor: BRAND.primarySoft,
                  border: `${1 * unit}px solid ${courtGreen(0.26)}`,
                  fontFamily: DISPLAY_FONT,
                  fontSize: 14.5 * unit,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  color: BRAND.primary,
                  zIndex: 1,
                  opacity: interpolateSafe(
                    frame,
                    [settled - 14, settled + 4],
                    [0, 1],
                  ),
                }}
              >
                {/* A non-breaking space when there is no delta, so the hidden
                    pill still contributes its line box and the row stays even. */}
                {tile.delta.length > 0 ? tile.delta : " "}
              </div>
            </div>
          );
        })}
      </Sequence>

      <div
        style={{
          position: "absolute",
          left: padX,
          right: padX,
          bottom: 18 * unit,
          height: 1 * unit,
          background: `linear-gradient(90deg, transparent, ${hairline(1)} 50%, transparent)`,
        }}
      />
    </AbsoluteFill>
  );
};
