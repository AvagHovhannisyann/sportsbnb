/**
 * LoginPanelCourtDrift — ambient loop for the left brand panel on /login and
 * /signup, behind (and under) the hero copy and the photograph scrim.
 * Seamless, slow and dim on purpose: the form is on the other half of the
 * screen and must stay the brightest thing on the page.
 */

import type { CSSProperties, FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  NOISE_TILE,
  TAU,
  chalk,
  courtGreen,
  hairline,
  hashUnit,
  ink,
  useMotionFrame,
  wrap,
} from "./authKit";

/** Authored against the real panel: `lg:w-1/2` of a 1920×1080 window. */
const CANVAS_W = 960;
const CANVAS_H = 1080;

export type LoginPanelCourtDriftProps = {
  /** Pitch-line spacing in design px. One tile is also the drift distance. */
  lineSpacing: number;
  /** Number of drifting player markers travelling the closed route. */
  markerCount: number;
  /**
   * Global opacity multiplier, 0–1. The default is deliberately low; anything
   * above ~0.5 starts competing with the sign-in form for attention.
   */
  intensity: number;
  /** Tilts the grid into a shallow perspective. 0 = flat top-down. */
  perspectiveDeg: number;
};

export const loginPanelCourtDriftDefaultProps: LoginPanelCourtDriftProps = {
  lineSpacing: 96,
  markerCount: 5,
  intensity: 0.34,
  perspectiveDeg: 26,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 * Three drivers, all closed over `t = wrap(frame, duration) / duration`:
 *
 *  1. The grid's `backgroundPosition` advances by exactly `lineSpacing`, i.e.
 *     one whole tile, across the loop — the pattern at t=1 is the pattern at
 *     t=0 shifted by its own period, which is the same picture.
 *  2. The bloom and the horizon haze ride `sin(2πt)` / `cos(2πt)`, full
 *     periods, so they return to their opening values exactly.
 *  3. Each marker's angle is `(t + phase) * 360°` around a closed ellipse — a
 *     full revolution per loop — and its size rides the same 2π cosine.
 *
 * There is no one-way tween anywhere in the file.
 */
export const LoginPanelCourtDrift: FC<LoginPanelCourtDriftProps> = ({
  lineSpacing,
  markerCount,
  intensity,
  perspectiveDeg,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: freezing at 0 renders the frame the cycle both opens and closes on.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const scaleY = height / CANVAS_H;

  const breath = 0.5 + 0.5 * Math.sin(TAU * t);
  const counterBreath = 0.5 + 0.5 * Math.cos(TAU * t);

  const tile = lineSpacing * unit;
  const drift = t * tile;

  const gridMask = `linear-gradient(to bottom, transparent 0%, #000 22%, #000 68%, transparent 100%)`;

  const gridStyle: CSSProperties = {
    backgroundImage: `linear-gradient(to right, ${hairline(0.85)} ${1.4 * unit}px, transparent ${1.4 * unit}px), linear-gradient(to bottom, ${hairline(0.85)} ${1.4 * unit}px, transparent ${1.4 * unit}px)`,
    backgroundSize: `${tile}px ${tile}px, ${tile}px ${tile}px`,
    // One tile per loop, in both axes: the seam is a no-op translation.
    backgroundPosition: `${drift}px ${drift}px, ${drift}px ${drift}px`,
    WebkitMaskImage: gridMask,
    maskImage: gridMask,
    opacity: 0.9,
  };

  // The closed route the markers travel. An ellipse, so the path has no ends.
  const routeCx = width * 0.52;
  const routeCy = height * 0.55;
  const routeRx = width * 0.34;
  const routeRy = height * 0.26;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 80% at 20% 18%, ${BRAND.surface1} 0%, ${BRAND.background} 62%)`,
        }}
      />

      {/* The pitch, tilted away. `perspective` is static; only the tiling moves. */}
      <AbsoluteFill
        style={{
          perspective: `${900 * unit}px`,
          opacity: intensity,
        }}
      >
        <AbsoluteFill
          style={{
            transform: `rotateX(${perspectiveDeg}deg) scale(${1.5 * scaleY})`,
            transformOrigin: "50% 62%",
          }}
        >
          <AbsoluteFill style={gridStyle} />
        </AbsoluteFill>
      </AbsoluteFill>

      {/* Court-green bloom, on a full sine period. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 46% at 30% 46%, ${courtGreen(0.16 * intensity)} 0%, ${courtGreen(0.04 * intensity)} 40%, transparent 70%)`,
          transform: `scale(${1 + 0.07 * breath})`,
          opacity: 0.6 + 0.4 * breath,
        }}
      />

      {/* Markers: one revolution of a closed ellipse per loop. */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, opacity: intensity }}
      >
        <ellipse
          cx={routeCx}
          cy={routeCy}
          rx={routeRx}
          ry={routeRy}
          fill="none"
          stroke={courtGreen(0.16)}
          strokeWidth={1.2 * unit}
        />
        {Array.from({ length: markerCount }, (_, i) => {
          const phase = i / markerCount;
          const angle = TAU * (t + phase);
          const x = routeCx + Math.cos(angle) * routeRx;
          const y = routeCy + Math.sin(angle) * routeRy;
          // Depth cue, also 2π-periodic: markers on the far side sit smaller.
          const depth = 0.5 + 0.5 * Math.sin(angle);
          const r = (3.2 + 3.6 * depth) * unit;
          const jitter = hashUnit(i, 7);
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={r * 3.4}
                fill={courtGreen(0.05 + 0.05 * depth)}
              />
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={jitter > 0.6 ? BRAND.cyan : BRAND.primary}
                opacity={0.34 + 0.5 * depth}
              />
            </g>
          );
        })}
      </svg>

      {/* Horizon haze, on the cosine half of the same period. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, transparent 52%, ${courtGreen(0.05 * intensity)} 74%, transparent 92%)`,
          opacity: 0.5 + 0.5 * counterBreath,
        }}
      />

      {/* Static scrim + grain. Mirrors the two-axis scrim on the real panel, so
          hero copy laid over this keeps its measured contrast. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to right, ${ink(0.72)} 0%, ${ink(0.34)} 55%, ${ink(0.08)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 90% at 30% 40%, transparent 30%, ${ink(0.5)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: NOISE_TILE,
          opacity: 0.045,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          boxShadow: `inset ${-1 * unit}px 0 0 0 ${chalk(0.05)}`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
