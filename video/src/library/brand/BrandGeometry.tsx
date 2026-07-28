/**
 * BrandGeometry — the SportsBnB mark itself, as reusable parts. Not a
 * composition: the logo build-ons, monograms, stingers, sign-offs and corner
 * bugs in this directory all draw the *same* pitch pictogram and the *same*
 * lockup from here, so a change to the mark is one edit rather than 25.
 */

import type { CSSProperties, FC, ReactNode } from "react";

import {
  BRAND,
  DISPLAY_FONT,
  RADIUS,
  TRACKING_TIGHT,
  chalk,
  courtGreen,
  hairline,
  ink,
} from "./brandKit";

/* ───────────────────────────── the pitch ──────────────────────────────── */

/** Everything below is authored against a 100 × 70 pitch box. */
export const PITCH_VIEWBOX = "0 0 100 70";
export const PITCH_W = 100;
export const PITCH_H = 70;

export type PitchStroke = {
  readonly id: string;
  /** SVG path data. Every stroke is a `<path>` so `pathLength` normalises it. */
  readonly d: string;
  /** Relative stroke weight — the touchline is heavier than the goal boxes. */
  readonly weight: number;
};

/**
 * The mark, in draw order: touchline, halfway line, centre circle, then the
 * two goal boxes. Authored as paths rather than `<rect>`/`<circle>` for one
 * reason — `pathLength={1}` normalises every arc length to 1, which is what
 * lets a single dash-offset expression draw a rounded rectangle, a straight
 * line and a full circle at the same rate.
 */
export const PITCH_STROKES: readonly PitchStroke[] = [
  {
    id: "touchline",
    d: "M 9 3 L 91 3 Q 97 3 97 9 L 97 61 Q 97 67 91 67 L 9 67 Q 3 67 3 61 L 3 9 Q 3 3 9 3 Z",
    weight: 1,
  },
  { id: "halfway", d: "M 50 3 L 50 67", weight: 0.78 },
  {
    id: "centre-circle",
    d: "M 37 35 A 13 13 0 1 0 63 35 A 13 13 0 1 0 37 35 Z",
    weight: 0.78,
  },
  { id: "box-left", d: "M 3 21 L 15 21 L 15 49 L 3 49", weight: 0.66 },
  { id: "box-right", d: "M 97 21 L 85 21 L 85 49 L 97 49", weight: 0.66 },
];

export type PitchGlyphProps = {
  /** Rendered width in px. Height follows the 100:70 box. */
  readonly width: number;
  /**
   * Per-stroke draw progress, 0 → 1, indexed like `PITCH_STROKES`. Anything
   * missing counts as fully drawn, so callers that do not animate the draw can
   * simply omit it.
   */
  readonly reveal?: readonly number[];
  /** Per-stroke opacity multiplier, same indexing rule as `reveal`. */
  readonly fade?: readonly number[];
  readonly color?: string;
  /** Base stroke width in pitch units before `weight` is applied. */
  readonly strokeWidth?: number;
  /** 0 → 1 scale of the centre spot. */
  readonly dot?: number;
  readonly dotColor?: string;
};

/**
 * The pitch pictogram. Every stroke is dash-drawn from a normalised path
 * length, so `reveal` reads as "how much of this line exists yet".
 */
export const PitchGlyph: FC<PitchGlyphProps> = ({
  width,
  reveal,
  fade,
  color = BRAND.primary,
  strokeWidth = 2.4,
  dot = 1,
  dotColor = BRAND.primary,
}) => (
  <svg
    width={width}
    height={(width * PITCH_H) / PITCH_W}
    viewBox={PITCH_VIEWBOX}
    fill="none"
    style={{ display: "block", overflow: "visible" }}
  >
    {PITCH_STROKES.map((stroke, i) => {
      const p = reveal && reveal[i] !== undefined ? reveal[i] : 1;
      const o = fade && fade[i] !== undefined ? fade[i] : 1;
      if (p <= 0 || o <= 0) {
        return null;
      }
      return (
        <path
          key={stroke.id}
          d={stroke.d}
          pathLength={1}
          stroke={color}
          strokeWidth={strokeWidth * stroke.weight}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 1"
          strokeDashoffset={1 - p}
          opacity={o}
        />
      );
    })}
    {dot > 0 ? (
      <circle cx={50} cy={35} r={3.1 * dot} fill={dotColor} opacity={Math.min(1, dot)} />
    ) : null}
  </svg>
);

/* ──────────────────────────── the tile ────────────────────────────────── */

export type MarkTileProps = {
  /** Tile edge in px. */
  readonly size: number;
  /** 0 → 1 strength of the court-green bloom behind the tile. */
  readonly glow?: number;
  readonly opacity?: number;
  /** Corner radius as a fraction of `size`; the app's tile sits near 0.26. */
  readonly radiusRatio?: number;
  readonly borderColor?: string;
  readonly children?: ReactNode;
  readonly style?: CSSProperties;
};

/**
 * The rounded, faintly glassy tile the mark lives inside — the same surface
 * treatment as `.surface-elevated` plus the primary ring glow the app uses on
 * live elements.
 */
export const MarkTile: FC<MarkTileProps> = ({
  size,
  glow = 1,
  opacity = 1,
  radiusRatio = 0.26,
  borderColor,
  children,
  style,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: Math.max(RADIUS * 0.5, size * radiusRatio),
      background: `linear-gradient(155deg, ${BRAND.surface2} 0%, ${BRAND.card} 55%, ${BRAND.surface1} 100%)`,
      border: `${Math.max(1, size * 0.006)}px solid ${borderColor ?? hairline(1)}`,
      boxShadow: [
        `inset 0 1px 0 0 ${chalk(0.07)}`,
        `0 ${size * 0.13}px ${size * 0.26}px ${-size * 0.07}px ${ink(0.7)}`,
        `0 0 ${size * (0.3 + 0.22 * glow)}px ${-size * 0.05}px ${courtGreen(0.1 + 0.3 * glow)}`,
      ].join(", "),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity,
      ...style,
    }}
  >
    {children}
  </div>
);

/* ────────────────────────── the monogram ─────────────────────────────── */

export type MonogramGlyphProps = {
  /** Rendered edge in px — the monogram is square. */
  readonly size: number;
  /** Two characters. More than two stops reading at favicon scale. */
  readonly letters?: string;
  readonly letterColor?: string;
  /** 0 → 1 opacity of the centre-circle court motif behind the letters. */
  readonly ring?: number;
  /** 0 → 1 draw progress of that ring, for build-ons that trace it. */
  readonly ringReveal?: number;
};

/**
 * The favicon-scale mark: the centre circle of the pitch with the initials
 * sitting in it. Deliberately only two strokes' worth of detail — the full
 * pictogram turns to mush below about 32px, which is where this takes over.
 */
export const MonogramGlyph: FC<MonogramGlyphProps> = ({
  size,
  letters = "SB",
  letterColor = BRAND.primary,
  ring = 1,
  ringReveal = 1,
}) => (
  <div
    style={{
      position: "relative",
      width: size,
      height: size,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {ring > 0 ? (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        style={{ position: "absolute", inset: 0 }}
      >
        <path
          d="M 26 50 A 24 24 0 1 0 74 50 A 24 24 0 1 0 26 50 Z"
          pathLength={1}
          stroke={courtGreen(0.36 * ring)}
          strokeWidth={3.2}
          strokeDasharray="1 1"
          strokeDashoffset={1 - ringReveal}
        />
        <path
          d="M 50 8 L 50 92"
          pathLength={1}
          stroke={courtGreen(0.2 * ring)}
          strokeWidth={2.4}
          strokeDasharray="1 1"
          strokeDashoffset={1 - ringReveal}
        />
      </svg>
    ) : null}
    <span
      style={{
        position: "relative",
        fontFamily: DISPLAY_FONT,
        fontSize: size * 0.44,
        fontWeight: 700,
        letterSpacing: "-0.06em",
        lineHeight: 1,
        color: letterColor,
        /** The tracking pulls the pair left; put the lost half back. */
        marginRight: "-0.06em",
      }}
    >
      {letters}
    </span>
  </div>
);

/* ─────────────────────────── the wordmark ─────────────────────────────── */

/** The brand name, split where the colour changes. */
export const WORDMARK_HEAD = "Sports";
export const WORDMARK_TAIL = "BnB";

export type LockupWordmarkProps = {
  readonly fontSize: number;
  /** Defaults to the real brand name; overridable for sub-brands. */
  readonly head?: string;
  readonly tail?: string;
  readonly headColor?: string;
  readonly tailColor?: string;
  readonly weight?: number;
  readonly tracking?: string;
  readonly opacity?: number;
  readonly uppercase?: boolean;
  readonly style?: CSSProperties;
};

/**
 * "SportsBnB" as a single inline lockup — chalk head, court-green tail. Used
 * anywhere the wordmark is *supporting* rather than the subject: sign-offs,
 * lower thirds, corner bugs.
 */
export const LockupWordmark: FC<LockupWordmarkProps> = ({
  fontSize,
  head = WORDMARK_HEAD,
  tail = WORDMARK_TAIL,
  headColor = BRAND.foreground,
  tailColor = BRAND.primary,
  weight = 700,
  tracking = TRACKING_TIGHT,
  opacity = 1,
  uppercase = false,
  style,
}) => (
  <span
    style={{
      fontFamily: DISPLAY_FONT,
      fontSize,
      fontWeight: weight,
      letterSpacing: tracking,
      lineHeight: 1,
      whiteSpace: "nowrap",
      opacity,
      textTransform: uppercase ? "uppercase" : "none",
      ...style,
    }}
  >
    <span style={{ color: headColor }}>{head}</span>
    <span style={{ color: tailColor }}>{tail}</span>
  </span>
);

/* ─────────────────────────── shared plates ────────────────────────────── */

export type StagePlateProps = {
  /** 0 → 1 ambient bloom strength, usually driven by a breath or a bloom. */
  readonly glow?: number;
  readonly backgroundColor?: string;
  /** Grid tile size in px; pass 0 to drop the court grid entirely. */
  readonly gridTile?: number;
  /** Grid offset in px — drift exactly one tile per loop to stay seamless. */
  readonly gridShift?: number;
  readonly vignette?: number;
};

/**
 * The stage every brand piece stands on: near-black bed, court grid, a soft
 * primary bloom and a vignette. Deliberately takes its motion as numbers so
 * the caller owns the timing and this stays a pure surface.
 */
export const StagePlate: FC<StagePlateProps> = ({
  glow = 0.5,
  backgroundColor = BRAND.background,
  gridTile = 96,
  gridShift = 0,
  vignette = 0.72,
}) => {
  const mask =
    "radial-gradient(ellipse 80% 80% at 50% 50%, #000 0%, rgba(0,0,0,0.5) 52%, transparent 86%)";
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor }}>
      {gridTile > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(to right, ${hairline(0.55)} 1px, transparent 1px), linear-gradient(to bottom, ${hairline(0.55)} 1px, transparent 1px)`,
            backgroundSize: `${gridTile}px ${gridTile}px`,
            backgroundPosition: `${gridShift}px ${gridShift}px`,
            WebkitMaskImage: mask,
            maskImage: mask,
            opacity: 0.7,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 62% 62% at 50% 50%, ${courtGreen(0.05 + 0.09 * glow)} 0%, transparent 68%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 92% 92% at 50% 50%, transparent 38%, ${ink(0.55 * vignette)} 78%, ${ink(0.95 * vignette)} 100%)`,
        }}
      />
    </div>
  );
};
