/**
 * socialChrome — the drawn atoms every template in this family shares.
 * Not a composition: the "court at night" backdrop, the lockup, the zero-
 * commission badge, prices, pitch thumbnails and the icon set, so 25 templates
 * read as one brand instead of 25 separately invented ones.
 *
 * Everything here is loop-safe: the only ambient motion is driven by `breathe`
 * (a full cosine period) and a grid that drifts exactly one cell per loop, so
 * a `<Backdrop t={loopT(...)}/>` is identical at t=0 and t=1.
 */

import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  SANS_FONT,
  type Accent,
  accentAlpha,
  accentColor,
  bodyStyle,
  breathe,
  chalk,
  courtGreen,
  eyebrowStyle,
  formatMoney,
  grainLayer,
  gridLayer,
  hairline,
  ink,
  muted,
  numeralStyle,
  onAccent,
} from "./socialKit";

/* ──────────────────────────────── backdrop ─────────────────────────────── */

export type BackdropProps = {
  /** Canvas size, so the pitch markings scale with the format. */
  width: number;
  height: number;
  /** Loop position 0…1. Pass `loopT(frame, durationInFrames)`. */
  t: number;
  /** 0 kills every ambient movement; 1 is full. */
  motion: number;
  accent: Accent;
  /** Grid cell in px. The plate drifts exactly one cell per loop. */
  cell?: number;
  /** Where the bloom sits, as a fraction of the canvas. */
  bloomAt?: [number, number];
  /** Global strength of the bloom. */
  bloom?: number;
  /** Draw the abstract pitch markings. Off for copy-dense square posts. */
  markings?: boolean;
};

/**
 * The page background: near-black green-tinted base, a soft grid that drifts
 * exactly one cell per loop, abstract pitch markings, an accent bloom that
 * rides a full cosine period, a vignette and grain.
 */
export const Backdrop: FC<BackdropProps> = ({
  width,
  height,
  t,
  motion,
  accent,
  cell = 72,
  bloomAt = [0.5, 0.22],
  bloom = 1,
  markings = true,
}) => {
  const breath = breathe(t) * motion;
  const drift = t * cell;
  const glow = (0.15 + 0.05 * breath) * bloom;
  const shift = 20 * breath;
  const shorter = Math.min(width, height);

  return (
    <AbsoluteFill
      style={{ backgroundColor: BRAND.background, overflow: "hidden" }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 70% at 50% 8%, ${BRAND.surface1} 0%, ${BRAND.background} 64%)`,
        }}
      />

      <AbsoluteFill
        style={{
          ...gridLayer(cell, drift, 0.55),
          opacity: 0.6,
        }}
      />

      {markings ? (
        <AbsoluteFill
          style={{ opacity: 0.5, transform: `translateY(${shift}px)` }}
        >
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ display: "block" }}
          >
            <circle
              cx={width * 0.5}
              cy={height * 1.04}
              r={shorter * 0.52}
              fill="none"
              stroke={hairline(0.9)}
              strokeWidth={3}
            />
            <circle
              cx={width * 0.5}
              cy={height * 1.04}
              r={shorter * 0.74}
              fill="none"
              stroke={hairline(0.55)}
              strokeWidth={3}
            />
            <circle
              cx={width * 0.5}
              cy={-height * 0.08}
              r={shorter * 0.42}
              fill="none"
              stroke={hairline(0.7)}
              strokeWidth={3}
            />
            <path
              d={`M0 ${height * 0.76} H${width}`}
              stroke={hairline(0.45)}
              strokeWidth={3}
            />
          </svg>
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 72% 34% at ${bloomAt[0] * 100}% ${bloomAt[1] * 100}%, ${accentAlpha(accent, glow)}, transparent 62%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 62% 26% at 50% 94%, ${courtGreen(0.07 - 0.02 * breath)}, transparent 66%)`,
        }}
      />

      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 92% 62% at 50% 46%, transparent 38%, ${ink(0.66)} 100%)`,
        }}
      />

      <AbsoluteFill style={{ ...grainLayer(0.05), mixBlendMode: "overlay" }} />
    </AbsoluteFill>
  );
};

/* ──────────────────────────────── layout ───────────────────────────────── */

/** Absolutely positioned box in canvas coordinates. */
export const Box: FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  style?: CSSProperties;
  children?: ReactNode;
}> = ({ x, y, w, h, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);

/* ──────────────────────────────── atoms ────────────────────────────────── */

/** `.eyebrow`, with the live dot the app puts in front of its status labels. */
export const Eyebrow: FC<{
  children: ReactNode;
  size?: number;
  color?: string;
  dot?: boolean;
  dotColor?: string;
}> = ({ children, size = 26, color = BRAND.primary, dot = true, dotColor }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.6 }}>
    {dot ? (
      <div
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: size,
          backgroundColor: dotColor ?? color,
          boxShadow: `0 0 ${size * 0.8}px ${dotColor ?? color}`,
          flexShrink: 0,
        }}
      />
    ) : null}
    <span style={eyebrowStyle(size, color)}>{children}</span>
  </div>
);

/** The product lockup: the rounded S mark plus the wordmark. */
export const Lockup: FC<{
  size?: number;
  accent?: Accent;
  showWord?: boolean;
}> = ({ size = 56, accent = "green", showWord = true }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.33,
        backgroundColor: accentColor(accent),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 0 ${size * 0.5}px ${-size * 0.12}px ${accentAlpha(accent, 0.7)}`,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: DISPLAY_FONT,
          fontSize: size * 0.6,
          fontWeight: 700,
          color: onAccent(accent),
          letterSpacing: "-0.04em",
        }}
      >
        S
      </span>
    </div>
    {showWord ? (
      <span
        style={{
          fontFamily: DISPLAY_FONT,
          fontSize: size * 0.62,
          fontWeight: 600,
          color: BRAND.foreground,
          letterSpacing: "-0.025em",
        }}
      >
        sportsbnb
      </span>
    ) : null}
  </div>
);

/** The domain sign-off every template closes on. */
export const Handle: FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = muted(0.9),
}) => <span style={eyebrowStyle(size, color)}>sportsbnb.am</span>;

/**
 * A price. The dram sign comes in as a prop — see the note on `DRAM` in
 * socialKit — and there is deliberately no "+ fee" slot: SportsBnB does not
 * charge one, and inventing a line for it here would make it possible to.
 */
export const Money: FC<{
  amount: number;
  currency: string;
  size: number;
  color?: string;
  weight?: number;
  suffix?: string;
}> = ({
  amount,
  currency,
  size,
  color = BRAND.foreground,
  weight = 600,
  suffix,
}) => (
  <span style={{ display: "inline-flex", alignItems: "baseline", gap: size * 0.2 }}>
    <span style={numeralStyle(size, color, weight)}>
      {formatMoney(amount, currency)}
    </span>
    {suffix ? (
      <span style={bodyStyle(size * 0.38, muted(0.95), 500)}>{suffix}</span>
    ) : null}
  </span>
);

/** The zero-commission stamp. The company's loudest claim, as one object. */
export const CommissionBadge: FC<{
  label: string;
  rate: string;
  size?: number;
  accent?: Accent;
  /** 0…1 — how hard the stamp is glowing right now. */
  heat?: number;
}> = ({ label, rate, size = 40, accent = "green", heat = 0 }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.5,
      padding: `${size * 0.42}px ${size * 0.75}px`,
      borderRadius: size * 1.4,
      backgroundColor: accentAlpha(accent, 0.12 + 0.06 * heat),
      border: `${Math.max(2, size * 0.06)}px solid ${accentAlpha(accent, 0.45 + 0.4 * heat)}`,
      boxShadow: `0 0 ${size * (0.9 + heat * 1.4)}px ${-size * 0.35}px ${accentAlpha(accent, 0.5 + 0.3 * heat)}`,
    }}
  >
    <span
      style={{
        fontFamily: DISPLAY_FONT,
        fontSize: size * 1.12,
        fontWeight: 700,
        letterSpacing: "-0.05em",
        color: accentColor(accent),
      }}
    >
      {rate}
    </span>
    <span style={eyebrowStyle(size * 0.46, chalk(0.9))}>{label}</span>
  </div>
);

/** A miniature pitch — drawn, never photographed. No assets, no network. */
export const PitchThumb: FC<{
  size: number;
  hue: number;
  radius?: number;
}> = ({ size, hue, radius }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: radius ?? size * 0.16,
      overflow: "hidden",
      flexShrink: 0,
      background: `linear-gradient(150deg, hsl(${hue}, 46%, 26%), hsl(${hue}, 40%, 13%))`,
      border: `1px solid ${hairline(1)}`,
      position: "relative",
    }}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "block" }}
    >
      <rect
        x={12}
        y={8}
        width={76}
        height={84}
        fill="none"
        stroke={chalk(0.34)}
        strokeWidth={2}
        rx={3}
      />
      <path d="M12 50 H88" stroke={chalk(0.34)} strokeWidth={2} />
      <circle cx={50} cy={50} r={14} fill="none" stroke={chalk(0.34)} strokeWidth={2} />
      <rect x={31} y={8} width={38} height={15} fill="none" stroke={chalk(0.28)} strokeWidth={2} />
      <rect x={31} y={77} width={38} height={15} fill="none" stroke={chalk(0.28)} strokeWidth={2} />
    </svg>
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(to top, ${ink(0.42)}, transparent 55%)`,
      }}
    />
  </div>
);

/** A pill — sport tags, district tags, format tags. */
export const Chip: FC<{
  children: ReactNode;
  size?: number;
  filled?: boolean;
  accent?: Accent;
}> = ({ children, size = 26, filled = false, accent = "green" }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: `${size * 0.42}px ${size * 0.78}px`,
      borderRadius: size * 1.2,
      backgroundColor: filled ? accentColor(accent) : BRAND.muted,
      border: `1.5px solid ${filled ? accentColor(accent) : BRAND.border}`,
      fontFamily: SANS_FONT,
      fontSize: size,
      fontWeight: 600,
      color: filled ? onAccent(accent) : chalk(0.92),
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

/** Rating row: a filled star, the score, the review count. */
export const Rating: FC<{
  rating: string;
  reviews: number;
  size?: number;
}> = ({ rating, reviews, size = 26 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
    <StarIcon size={size * 0.92} color={BRAND.amber} />
    <span style={numeralStyle(size, chalk(0.92), 600)}>{rating}</span>
    <span style={bodyStyle(size * 0.86, muted(0.85))}>({reviews})</span>
  </div>
);

/* ───────────────────────────────── icons ───────────────────────────────── */

export type IconProps = {
  size: number;
  color: string;
  /** Stroke width in the 24×24 icon space. */
  weight?: number;
  opacity?: number;
};

const strokeIcon =
  (paths: string[]): FC<IconProps> =>
  ({ size, color, weight = 1.9, opacity = 1 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: "block", opacity, flexShrink: 0 }}
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={weight}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );

export const PinIcon = strokeIcon([
  "M12 21.4c4.2-4.4 6.3-7.8 6.3-10.4a6.3 6.3 0 1 0-12.6 0c0 2.6 2.1 6 6.3 10.4z",
  "M9.8 11a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0",
]);
export const ClockIcon = strokeIcon([
  "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  "M12 7v5.3l3.4 2",
]);
export const CalendarIcon = strokeIcon([
  "M6 5.5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2z",
  "M4 10h16",
  "M8.5 3v4.5",
  "M15.5 3v4.5",
]);
export const UsersIcon = strokeIcon([
  "M16.2 20.2v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.9a3.6 3.6 0 0 0-3.6 3.6v1.8",
  "M9.75 11.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z",
  "M20.7 20.2v-1.8a3.6 3.6 0 0 0-2.7-3.48",
  "M15.3 4.12a3.6 3.6 0 0 1 0 6.96",
]);
export const SearchIcon = strokeIcon([
  "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  "M16.9 16.9 21 21",
]);
export const WalletIcon = strokeIcon([
  "M4 8.5A2.5 2.5 0 0 1 6.5 6H18a2 2 0 0 1 2 2v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17z",
  "M4 8.5V7a2 2 0 0 1 2-2h9",
  "M20 11.5h-3.4a2 2 0 0 0 0 4H20",
]);
export const BoltIcon = strokeIcon(["M13.4 2.5 4.6 13.6h6.2l-.8 7.9 8.8-11.1h-6.2z"]);
export const ArrowIcon = strokeIcon(["M4 12h15", "M13 6l6 6-6 6"]);
export const CheckIcon = strokeIcon(["M4.8 12.6 10 17.8 19.4 6.6"]);
export const TrophyIcon = strokeIcon([
  "M7.5 4h9v4.5a4.5 4.5 0 0 1-9 0z",
  "M7.5 5.5H5a2 2 0 0 0 0 4h2.6",
  "M16.5 5.5H19a2 2 0 0 1 0 4h-2.6",
  "M10 13.2 9.4 17h5.2l-.6-3.8",
  "M7.6 20h8.8",
]);

export const StarIcon: FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ display: "block", flexShrink: 0 }}
  >
    <path
      d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.06l-5.7 3.3 1.09-6.35-4.62-4.5 6.38-.93z"
      fill={color}
    />
  </svg>
);

/** A football, drawn as a hex/pent hint rather than a photo. */
export const BallMark: FC<{ size: number; color: string; opacity?: number }> = ({
  size,
  color,
  opacity = 1,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ display: "block", opacity, flexShrink: 0 }}
  >
    <circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
    <path
      d="M12 6.4 15.6 9l-1.4 4.3H9.8L8.4 9z"
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
    <path
      d="M12 3v3.4M15.6 9l3.2-1M14.2 13.3l2 2.8M9.8 13.3l-2 2.8M8.4 9 5.2 8"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </svg>
);
