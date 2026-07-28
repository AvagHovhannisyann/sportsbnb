/**
 * LoginPanelPitchLines — ambient loop for the left brand panel on the four auth
 * pages: a chalked five-a-side pitch seen from above with a single light
 * travelling its touchline.
 * One moving element only. It is the quietest of the four panel loops and the
 * safe default when the hero copy is long.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  NOISE_TILE,
  TAU,
  chalk,
  courtGreen,
  ink,
  useMotionFrame,
  wrap,
} from "./authKit";

const CANVAS_W = 960;
const CANVAS_H = 1080;

export type LoginPanelPitchLinesProps = {
  /** Chalk stroke weight in design px. */
  chalkWeight: number;
  /** Opacity of the chalk itself, 0–1. */
  chalkOpacity: number;
  /** Length of the travelling light, as a fraction of the touchline. */
  sweepFraction: number;
  /** Draw the centre circle and penalty boxes. Off = bare rectangle. */
  showMarkings: boolean;
};

export const loginPanelPitchLinesDefaultProps: LoginPanelPitchLinesProps = {
  chalkWeight: 2,
  chalkOpacity: 0.22,
  sweepFraction: 0.16,
  showMarkings: true,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The travelling light is a dash pattern on a *closed* rounded rectangle.
 *     `strokeDashoffset` moves by exactly the path's own perimeter across the
 *     loop (`-t · perimeter`), and the dash array sums to that perimeter too —
 *     so at t=1 the dash is back on the same millimetre of path it started on.
 *     Because the path is closed there is no end for the light to fall off.
 *  2. The chalk breath is `sin(2πt)`, a full period.
 *  3. The centre spot's halo rides `cos(2πt)`, also full.
 *
 * No tween runs one way.
 */
export const LoginPanelPitchLines: FC<LoginPanelPitchLinesProps> = ({
  chalkWeight,
  chalkOpacity,
  sweepFraction,
  showMarkings,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const vScale = height / CANVAS_H;

  const breath = 0.5 + 0.5 * Math.sin(TAU * t);
  const spot = 0.5 + 0.5 * Math.cos(TAU * t);

  // Pitch box, in rendered px.
  const padX = 96 * unit;
  const padY = 150 * vScale;
  const boxX = padX;
  const boxY = padY;
  const boxW = width - padX * 2;
  const boxH = height - padY * 2;
  const radius = 26 * unit;

  // Perimeter of a rounded rectangle: straights + one full circle of corners.
  const perimeter =
    2 * (boxW - 2 * radius) + 2 * (boxH - 2 * radius) + TAU * radius;
  const lit = perimeter * sweepFraction;

  const stroke = chalk(chalkOpacity);
  const w = chalkWeight * unit;

  const cx = boxX + boxW / 2;
  const cy = boxY + boxH / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(100% 62% at 50% 44%, ${BRAND.surface1} 0%, ${BRAND.background} 70%)`,
        }}
      />

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        {/* Touchline. */}
        <rect
          x={boxX}
          y={boxY}
          width={boxW}
          height={boxH}
          rx={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={w}
        />

        {showMarkings ? (
          <g stroke={stroke} strokeWidth={w} fill="none">
            {/* Halfway line + centre circle. */}
            <line x1={boxX} y1={cy} x2={boxX + boxW} y2={cy} />
            <circle cx={cx} cy={cy} r={Math.min(boxW, boxH) * 0.16} />
            {/* Penalty areas, top and bottom. */}
            <rect
              x={cx - boxW * 0.3}
              y={boxY}
              width={boxW * 0.6}
              height={boxH * 0.13}
            />
            <rect
              x={cx - boxW * 0.3}
              y={boxY + boxH - boxH * 0.13}
              width={boxW * 0.6}
              height={boxH * 0.13}
            />
          </g>
        ) : null}

        {/* Centre spot — the only element that is ever fully saturated. */}
        <circle
          cx={cx}
          cy={cy}
          r={(4 + 2 * spot) * unit}
          fill={courtGreen(0.5 + 0.35 * spot)}
        />
        <circle
          cx={cx}
          cy={cy}
          r={(14 + 16 * spot) * unit}
          fill="none"
          stroke={courtGreen(0.16 * (1 - spot))}
          strokeWidth={1.4 * unit}
        />

        {/* The travelling light — glow pass, then core. */}
        <g
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${lit} ${perimeter - lit}`}
          strokeDashoffset={-t * perimeter}
        >
          <rect
            x={boxX}
            y={boxY}
            width={boxW}
            height={boxH}
            rx={radius}
            stroke={courtGreen(0.1)}
            strokeWidth={14 * unit}
          />
          <rect
            x={boxX}
            y={boxY}
            width={boxW}
            height={boxH}
            rx={radius}
            stroke={courtGreen(0.5)}
            strokeWidth={2.6 * unit}
          />
        </g>
      </svg>

      {/* Chalk dust — breathes on a full sine period. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(76% 48% at 50% 50%, ${courtGreen(0.06)} 0%, transparent 72%)`,
          opacity: 0.5 + 0.5 * breath,
        }}
      />

      <AbsoluteFill
        style={{
          background: `linear-gradient(to right, ${ink(0.66)} 0%, ${ink(0.26)} 60%, ${ink(0.04)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 90% at 34% 44%, transparent 34%, ${ink(0.55)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: NOISE_TILE,
          opacity: 0.04,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
