/**
 * venueChrome — the static furniture the venue family paints on top of its
 * moving parts: stage dressing, the listing plate, sport chip, price line,
 * star row and the two glyphs that recur everywhere.
 * Not a composition. Everything here is deliberately motionless, so a loop that
 * mounts it stays seamless without having to reason about the chrome at all.
 */

import type { CSSProperties, FC } from "react";
import { AbsoluteFill } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  NOISE_TILE,
  PIN_PATH,
  SANS_FONT,
  STAR_PATH,
  TICK_PATH,
  chalk,
  clamp01,
  formatDram,
  ink,
  tint,
} from "./venueKit";

/* ───────────────────────────── stage dressing ──────────────────────────── */

/**
 * Vignette + grain, always last in the tree. The grain is an inline data URI,
 * not a fetch; the vignette keeps the corners from competing with the plate.
 */
export const StageDressing: FC<{ strength?: number }> = ({ strength = 1 }) => (
  <>
    <AbsoluteFill
      style={{
        background: `radial-gradient(88% 72% at 50% 44%, transparent 38%, ${ink(0.82 * strength)} 100%)`,
        pointerEvents: "none",
      }}
    />
    <AbsoluteFill
      style={{
        backgroundImage: NOISE_TILE,
        opacity: 0.045 * strength,
        pointerEvents: "none",
      }}
    />
  </>
);

/* ───────────────────────────────── glyphs ──────────────────────────────── */

export const PinGlyph: FC<{ size: number; color: string; weight?: number }> = ({
  size,
  color,
  weight = 1.8,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d={PIN_PATH} stroke={color} strokeWidth={weight} strokeLinejoin="round" />
    <circle cx={12} cy={10} r={2.6} stroke={color} strokeWidth={weight} />
  </svg>
);

export const TickGlyph: FC<{
  size: number;
  color: string;
  /** 0–1 draw-on. 1 is a finished tick. */
  draw?: number;
  weight?: number;
}> = ({ size, color, draw = 1, weight = 2.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d={TICK_PATH}
      stroke={color}
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={24}
      strokeDashoffset={24 * (1 - clamp01(draw))}
    />
  </svg>
);

/* ──────────────────────────────── star row ─────────────────────────────── */

export const StarRow: FC<{
  /** 0–5, fractional. The partial star is clipped, not rounded. */
  rating: number;
  size: number;
  gap: number;
  /** Per-star scale, for staggered reveals. Defaults to all-visible. */
  fillOf?: (index: number) => number;
  idPrefix: string;
}> = ({ rating, size, gap, fillOf, idPrefix }) => {
  const value = Math.min(5, Math.max(0, rating));
  return (
    <div style={{ display: "flex", alignItems: "center", gap }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const shown = fillOf ? clamp01(fillOf(i)) : 1;
        const fill = clamp01(value - i) * shown;
        const clipId = `${idPrefix}-star-${i}`;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <defs>
              <clipPath id={clipId}>
                <rect x={0} y={0} width={24 * fill} height={24} />
              </clipPath>
            </defs>
            <path d={STAR_PATH} fill={chalk(0.12)} />
            {fill > 0 ? (
              <path d={STAR_PATH} fill={BRAND.warning} clipPath={`url(#${clipId})`} />
            ) : null}
          </svg>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────── sport chip ────────────────────────────── */

export const SportChip: FC<{
  label: string;
  accent: string;
  unit: number;
  style?: CSSProperties;
}> = ({ label, accent, unit, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10 * unit,
      height: 44 * unit,
      padding: `0 ${20 * unit}px`,
      borderRadius: 999,
      backgroundColor: tint(accent, 0.14),
      border: `${1 * unit}px solid ${tint(accent, 0.42)}`,
      ...style,
    }}
  >
    <span
      style={{
        width: 8 * unit,
        height: 8 * unit,
        borderRadius: "50%",
        backgroundColor: accent,
        boxShadow: `0 0 ${12 * unit}px ${tint(accent, 0.9)}`,
      }}
    />
    <span
      style={{
        fontFamily: MONO_FONT,
        fontSize: 15 * unit,
        fontWeight: 500,
        letterSpacing: 0.18 * 15 * unit,
        textTransform: "uppercase",
        color: accent,
      }}
    >
      {label}
    </span>
  </div>
);

/* ─────────────────────────────── price line ────────────────────────────── */

/**
 * `12,000 ֏ / hour`, and nothing else. There is no fee line because there is
 * no fee: what a listing shows is what the player pays and what the owner
 * banks. Any composition tempted to add a second row here is wrong about the
 * product.
 */
export const PriceLine: FC<{
  price: number;
  unit: number;
  accent: string;
  /** Per-hour is the default; day passes and lane hires override it. */
  per?: string;
  size?: number;
}> = ({ price, unit, accent, per = "hour", size = 54 }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 10 * unit }}>
    <span
      style={{
        fontFamily: MONO_FONT,
        fontSize: size * unit,
        fontWeight: 500,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: -0.03 * size * unit,
        color: BRAND.foreground,
        lineHeight: 1,
      }}
    >
      {formatDram(price)}
    </span>
    <span
      style={{
        fontFamily: SANS_FONT,
        fontSize: 0.36 * size * unit,
        fontWeight: 500,
        color: tint(accent, 0.92),
      }}
    >
      / {per}
    </span>
  </div>
);

/* ────────────────────────────── listing plate ──────────────────────────── */

export type ListingPlateProps = {
  venueName: string;
  city: string;
  sportLabel: string;
  accent: string;
  price: number;
  rating: number;
  reviewCount: number;
  unit: number;
  /** Rendered width of the plate in px. */
  width: number;
  /** Distance from the bottom of the frame, in px. */
  bottom: number;
  idPrefix: string;
};

/**
 * The bottom third of every per-sport promo: chip, name, city, rating, price.
 * Identical across all eight so the eight clips read as one campaign and only
 * the court behind them changes.
 */
export const ListingPlate: FC<ListingPlateProps> = ({
  venueName,
  city,
  sportLabel,
  accent,
  price,
  rating,
  reviewCount,
  unit,
  width,
  bottom,
  idPrefix,
}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom,
      display: "flex",
      justifyContent: "center",
      pointerEvents: "none",
    }}
  >
    <div
      style={{
        width: width * 0.84,
        padding: `${28 * unit}px ${30 * unit}px`,
        borderRadius: 26 * unit,
        background: `linear-gradient(160deg, ${BRAND.surface2} 0%, ${BRAND.card} 54%, ${BRAND.surface1} 100%)`,
        border: `${1 * unit}px solid ${BRAND.borderStrong}`,
        boxShadow: `0 ${24 * unit}px ${52 * unit}px ${-16 * unit}px ${ink(0.9)}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <SportChip label={sportLabel} accent={accent} unit={unit} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 * unit }}>
          <StarRow rating={rating} size={18 * unit} gap={2 * unit} idPrefix={idPrefix} />
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 16 * unit,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              color: BRAND.foreground,
            }}
          >
            {rating.toFixed(1)}
          </span>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 14 * unit,
              color: BRAND.mutedForeground,
            }}
          >
            ({reviewCount})
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: 20 * unit,
          fontFamily: DISPLAY_FONT,
          fontSize: (venueName.length > 20 ? 42 : 52) * unit,
          fontWeight: 700,
          letterSpacing: -0.04 * 52 * unit,
          lineHeight: 1.02,
          color: BRAND.foreground,
        }}
      >
        {venueName}
      </div>

      <div
        style={{
          marginTop: 10 * unit,
          display: "flex",
          alignItems: "center",
          gap: 8 * unit,
        }}
      >
        <PinGlyph size={20 * unit} color={BRAND.mutedForeground} />
        <span
          style={{
            fontFamily: SANS_FONT,
            fontSize: 20 * unit,
            fontWeight: 500,
            color: BRAND.foregroundSoft,
          }}
        >
          {city}, Armenia
        </span>
      </div>

      <div
        style={{
          marginTop: 22 * unit,
          paddingTop: 22 * unit,
          borderTop: `${1 * unit}px solid ${BRAND.border}`,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <PriceLine price={price} unit={unit} accent={accent} />
        <span
          style={{
            fontFamily: MONO_FONT,
            fontSize: 13 * unit,
            fontWeight: 500,
            letterSpacing: 0.16 * 13 * unit,
            textTransform: "uppercase",
            color: BRAND.primary,
            paddingBottom: 4 * unit,
          }}
        >
          0% commission
        </span>
      </div>
    </div>
  </div>
);
