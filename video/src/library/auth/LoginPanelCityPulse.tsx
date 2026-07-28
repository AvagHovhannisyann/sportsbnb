/**
 * LoginPanelCityPulse — ambient loop for the left brand panel on /login and
 * /signup: a schematic Yerevan with venue pins waking one after another, the
 * "verified venues" trust line made visual.
 * Seamless and dim; the pins never all light at once, so nothing on this half
 * of the screen ever pulls the eye off the form.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  NOISE_TILE,
  TAU,
  chalk,
  courtGreen,
  cyan,
  hairline,
  hashUnit,
  ink,
  interpolateSafe,
  pulse,
  useMotionFrame,
  wrap,
} from "./authKit";

/** Authored against the real panel: `lg:w-1/2` of a 1920×1080 window. */
const CANVAS_W = 960;

export type LoginPanelCityPulseProps = {
  /** Venue pins scattered over the map. */
  pinCount: number;
  /** Map graticule spacing in design px. Also the per-loop drift distance. */
  graticuleSpacing: number;
  /** Scatter seed. Changes the layout without changing anything else. */
  seed: number;
  /** Global opacity multiplier, 0–1. */
  intensity: number;
};

export const loginPanelCityPulseDefaultProps: LoginPanelCityPulseProps = {
  pinCount: 14,
  graticuleSpacing: 120,
  seed: 4,
  intensity: 0.4,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. Every pin uses `pulse()` from authKit, which is exactly 0 at local frame
 *     0 and exactly 0 again from local frame 35 — both springs have explicit
 *     `durationInFrames`, so those are exact values and not near-misses. Each
 *     pin's phase is `i · duration / pinCount`, so they wake in sequence and
 *     the whole set is back at rest as the cycle wraps.
 *  2. The two survey rings expand on `u = wrap(t + offset, 1)` with an opacity
 *     that is 0 at both ends of `u` — invisible at the seam, so the radius
 *     snapping back is never rendered.
 *  3. The graticule drifts exactly one cell per loop; the wash rides `sin(2πt)`.
 *
 * No one-way tween exists in the file.
 */
export const LoginPanelCityPulse: FC<LoginPanelCityPulseProps> = ({
  pinCount,
  graticuleSpacing,
  seed,
  intensity,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;

  const wash = 0.5 + 0.5 * Math.sin(TAU * t);
  const cell = graticuleSpacing * unit;
  const drift = t * cell;

  const gridMask = `radial-gradient(75% 55% at 46% 48%, #000 0%, #000 52%, transparent 88%)`;

  const originX = width * 0.46;
  const originY = height * 0.48;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 60% at 46% 44%, ${BRAND.surface1} 0%, ${BRAND.background} 66%)`,
        }}
      />

      {/* Graticule — one cell of drift per loop. */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(to right, ${hairline(0.8)} 1px, transparent 1px), linear-gradient(to bottom, ${hairline(0.8)} 1px, transparent 1px)`,
          backgroundSize: `${cell}px ${cell}px, ${cell}px ${cell}px`,
          backgroundPosition: `${drift}px ${-drift}px, ${drift}px ${-drift}px`,
          WebkitMaskImage: gridMask,
          maskImage: gridMask,
          opacity: intensity,
        }}
      />

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, opacity: intensity }}
      >
        {/* Survey rings. Opacity is 0 at both ends of each cycle. */}
        {[0, 0.5].map((offset) => {
          const u = wrap(t + offset, 1);
          const r = interpolateSafe(u, [0, 1], [60 * unit, 520 * unit]);
          const o = interpolateSafe(u, [0, 0.1, 0.8, 1], [0, 0.3, 0, 0]);
          return (
            <circle
              key={offset}
              cx={originX}
              cy={originY}
              r={r}
              fill="none"
              stroke={courtGreen(o)}
              strokeWidth={interpolateSafe(u, [0, 1], [2 * unit, 0.6 * unit])}
            />
          );
        })}

        {/* Two arterial roads, static — they give the pins somewhere to be. */}
        <path
          d={`M ${width * -0.05} ${height * 0.68} Q ${width * 0.4} ${height * 0.5} ${width * 1.05} ${height * 0.6}`}
          fill="none"
          stroke={hairline(1)}
          strokeWidth={3 * unit}
        />
        <path
          d={`M ${width * 0.3} ${-height * 0.05} Q ${width * 0.52} ${height * 0.46} ${width * 0.38} ${height * 1.05}`}
          fill="none"
          stroke={hairline(1)}
          strokeWidth={2.4 * unit}
        />

        {/* Venue pins, waking in sequence. */}
        {Array.from({ length: pinCount }, (_, i) => {
          const x = width * (0.1 + 0.8 * hashUnit(i, seed));
          const y = height * (0.1 + 0.8 * hashUnit(i + 100, seed + 1));
          const pop = pulse({
            frame,
            fps,
            period: durationInFrames,
            phase: (i * durationInFrames) / pinCount,
          });
          // Continuous at both ends: pop = 0 ⇒ halo = 0.
          const halo = Math.max(0, 1 - pop) * Math.min(1, pop * 5);
          const isCyan = hashUnit(i, seed + 9) > 0.78;
          const tint = isCyan ? cyan : courtGreen;
          const rBase = (2.6 + 1.4 * hashUnit(i, seed + 5)) * unit;

          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={(8 + 26 * pop) * unit}
                fill="none"
                stroke={tint(0.4 * halo)}
                strokeWidth={1.2 * unit}
              />
              <circle
                cx={x}
                cy={y}
                r={rBase * 3.2}
                fill={tint(0.06 + 0.14 * pop)}
              />
              <circle
                cx={x}
                cy={y}
                r={rBase + 1.4 * unit * pop}
                fill={tint(0.4 + 0.6 * pop)}
              />
            </g>
          );
        })}

        {/* Origin marker — "you are here", never animated. */}
        <circle
          cx={originX}
          cy={originY}
          r={5 * unit}
          fill={chalk(0.55)}
          stroke={ink(0.9)}
          strokeWidth={1.6 * unit}
        />
      </svg>

      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 44% at 46% 48%, ${courtGreen(0.09 * intensity)} 0%, transparent 70%)`,
          opacity: 0.55 + 0.45 * wash,
          transform: `scale(${1 + 0.04 * wash})`,
        }}
      />

      <AbsoluteFill
        style={{
          background: `linear-gradient(to right, ${ink(0.7)} 0%, ${ink(0.3)} 58%, ${ink(0.06)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${ink(0.55)} 0%, transparent 30%, transparent 76%, ${ink(0.32)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: NOISE_TILE,
          opacity: 0.05,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
