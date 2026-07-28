/**
 * SessionSignedOutIdle — the signed-out placeholder shown where an avatar or a
 * personalised panel would be: the header menu, a gated booking panel, an empty
 * /dashboard behind a route guard.
 * A seamless loop, because it sits there until the user acts. Nothing in it
 * flashes or counts down; being signed out is a state, not an alarm.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  TAU,
  chalk,
  courtGreen,
  hairline,
  ink,
  muted,
  useMotionFrame,
  wrap,
} from "./authKit";

const CANVAS = 720;

export type SessionSignedOutIdleProps = {
  /** Heading. */
  title: string;
  /** One line saying what signing in gets them. */
  body: string;
  /** Label on the single action. */
  ctaLabel: string;
  /** Mono caps chip above the silhouette. */
  statusLabel: string;
  /** Dashes in the rotating ring. Any whole number keeps the seam exact. */
  dashCount: number;
};

export const sessionSignedOutIdleDefaultProps: SessionSignedOutIdleProps = {
  title: "You're signed out",
  body: "Sign in to see your bookings, teams and saved courts.",
  ctaLabel: "Sign in",
  statusLabel: "Signed out",
  dashCount: 24,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The dashed ring rotates exactly 360° over the loop (`t · 360`), and the
 *     dash pattern divides the circumference into `dashCount` equal cells — so
 *     the ring is rotationally symmetric under 360/dashCount degrees and the
 *     full turn lands on itself regardless.
 *  2. The silhouette's dimness is `0.5 + 0.5·sin(2πt)`, one full period.
 *  3. The chip's dot rides `cos(2πt)`, also full.
 *
 * There is no one-way tween in the file.
 */
export const SessionSignedOutIdle: FC<SessionSignedOutIdleProps> = ({
  title,
  body,
  ctaLabel,
  statusLabel,
  dashCount,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = Math.min(width, height) / CANVAS;

  const breath = 0.5 + 0.5 * Math.sin(TAU * t);
  const dotPulse = 0.5 + 0.5 * Math.cos(TAU * t);

  const cx = width / 2;
  const ringCy = height * 0.34;
  const ringR = 92 * unit;
  const circumference = TAU * ringR;
  const cells = Math.max(4, Math.round(dashCount));
  const cell = circumference / cells;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(80% 70% at 50% 32%, ${BRAND.surface1} 0%, ${BRAND.background} 72%)`,
        }}
      />

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        {/* Dashed ring: one full turn per loop, and rotationally symmetric. */}
        <g transform={`rotate(${t * 360} ${cx} ${ringCy})`}>
          <circle
            cx={cx}
            cy={ringCy}
            r={ringR}
            fill="none"
            stroke={hairline(1)}
            strokeWidth={2 * unit}
            strokeLinecap="round"
            strokeDasharray={`${cell * 0.42} ${cell * 0.58}`}
          />
        </g>

        {/* Silhouette. Chalk at low alpha — a placeholder, not a person. */}
        <g opacity={0.4 + 0.22 * breath}>
          <circle cx={cx} cy={ringCy - 20 * unit} r={26 * unit} fill={chalk(0.16)} />
          <path
            d={`M ${cx - 42 * unit} ${ringCy + 46 * unit} a ${42 * unit} ${38 * unit} 0 0 1 ${84 * unit} 0 Z`}
            fill={chalk(0.16)}
          />
        </g>
      </svg>

      {/* Status chip. */}
      <div
        style={{
          position: "absolute",
          left: cx,
          top: ringCy + ringR + 22 * unit,
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 8 * unit,
          padding: `${6 * unit}px ${13 * unit}px`,
          borderRadius: 999,
          backgroundColor: BRAND.surface2,
          border: `${1 * unit}px solid ${hairline(1)}`,
        }}
      >
        <div
          style={{
            width: 7 * unit,
            height: 7 * unit,
            borderRadius: 999,
            backgroundColor: muted(0.5 + 0.4 * dotPulse),
          }}
        />
        <span
          style={{
            fontFamily: MONO_FONT,
            fontSize: 11 * unit,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: 0.18 * 11 * unit,
            color: muted(0.9),
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: ringCy + ringR + 74 * unit,
          textAlign: "center",
          fontFamily: DISPLAY_FONT,
          fontSize: 30 * unit,
          fontWeight: 700,
          letterSpacing: -0.03 * 30 * unit,
          color: BRAND.foreground,
        }}
      >
        {title}
      </div>

      <div
        style={{
          position: "absolute",
          left: width * 0.14,
          right: width * 0.14,
          top: ringCy + ringR + 118 * unit,
          textAlign: "center",
          fontFamily: SANS_FONT,
          fontSize: 15.5 * unit,
          lineHeight: 1.55,
          color: BRAND.mutedForeground,
        }}
      >
        {body}
      </div>

      {/* The action. Static — it is the one thing the user should click, and a
          button that moves is a button that is harder to hit. */}
      <div
        style={{
          position: "absolute",
          left: cx - 92 * unit,
          top: ringCy + ringR + 176 * unit,
          width: 184 * unit,
          height: 48 * unit,
          borderRadius: 13 * unit,
          backgroundColor: BRAND.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SANS_FONT,
          fontSize: 16 * unit,
          fontWeight: 600,
          color: "hsl(160, 25%, 5%)",
          boxShadow: `0 ${10 * unit}px ${24 * unit}px ${-8 * unit}px ${courtGreen(0.4)}`,
        }}
      >
        {ctaLabel}
      </div>

      <AbsoluteFill
        style={{
          background: `radial-gradient(110% 90% at 50% 40%, transparent 44%, ${ink(0.45)} 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
