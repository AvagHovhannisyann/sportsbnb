/**
 * GaugeUtilisationSegments — per-venue utilisation on /owner/venues: one ring
 * of segments per venue, each segment an hour of the bookable day.
 * One-way: segments light in sequence up to the real utilised count, then the
 * ring holds. Nothing is rounded on the way to the total.
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
  DISPLAY_FONT,
  SANS_FONT,
  amber,
  countProgress,
  countTo,
  courtGreen,
  eyebrowStyle,
  hairline,
  interpolateSafe,
  muted,
  numeralStyle,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS = 720;

export type GaugeUtilisationSegmentsProps = {
  /** Segments in the ring — the bookable hours in the day. */
  totalSegments: number;
  /** How many of them are booked. Clamped into the ring. */
  filledSegments: number;
  /** Venue name in the middle. */
  venueName: string;
  /** Mono caps above the venue name. */
  label: string;
  /** Sentence under the ring. */
  caption: string;
};

export const gaugeUtilisationSegmentsDefaultProps: GaugeUtilisationSegmentsProps =
  {
    totalSegments: 14,
    filledSegments: 9,
    venueName: "Ararat Arena",
    label: "Utilisation today",
    caption: "09:00 – 23:00 · one segment per bookable hour",
  };

const LIGHT_AT = 12;
const LIGHT_FRAMES = 78;

export const GaugeUtilisationSegments: FC<GaugeUtilisationSegmentsProps> = ({
  totalSegments,
  filledSegments,
  venueName,
  label,
  caption,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: the lit ring is the figure.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = Math.min(width, height) / CANVAS;

  const total = Math.max(1, Math.round(totalSegments));
  const filled = Math.max(0, Math.min(total, Math.round(filledSegments)));

  const progress = countProgress({
    frame,
    delay: LIGHT_AT,
    duration: LIGHT_FRAMES,
  });
  /** Continuous count of lit segments; exactly `filled` on the last frame. */
  const lit = countTo({
    frame,
    from: 0,
    to: filled,
    delay: LIGHT_AT,
    duration: LIGHT_FRAMES,
  });

  const percent = Math.round((filled / total) * 100);
  const shownPercent = Math.round(
    countTo({
      frame,
      from: 0,
      to: percent,
      delay: LIGHT_AT,
      duration: LIGHT_FRAMES,
    }),
  );

  const cx = width / 2;
  const cy = height / 2;
  const rOuter = 250 * unit;
  const rInner = 196 * unit;
  const gapDeg = 360 / total / 6;

  const settled = LIGHT_AT + LIGHT_FRAMES;

  const wedge = (index: number): string => {
    const a0 = ((360 / total) * index + gapDeg / 2 - 90) * (Math.PI / 180);
    const a1 = ((360 / total) * (index + 1) - gapDeg / 2 - 90) * (Math.PI / 180);
    const p0 = { x: cx + Math.cos(a0) * rOuter, y: cy + Math.sin(a0) * rOuter };
    const p1 = { x: cx + Math.cos(a1) * rOuter, y: cy + Math.sin(a1) * rOuter };
    const p2 = { x: cx + Math.cos(a1) * rInner, y: cy + Math.sin(a1) * rInner };
    const p3 = { x: cx + Math.cos(a0) * rInner, y: cy + Math.sin(a0) * rInner };
    return [
      `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`,
      `A ${rOuter.toFixed(2)} ${rOuter.toFixed(2)} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `A ${rInner.toFixed(2)} ${rInner.toFixed(2)} 0 0 0 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      "Z",
    ].join(" ");
  };

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 70% at 50% 46%, ${BRAND.surface1} 0%, ${BRAND.background} 72%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(38% 38% at 50% 50%, ${courtGreen(0.09 * progress)} 0%, transparent 70%)`,
        }}
      />

      <Sequence name="Ring" layout="none">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: "absolute", inset: 0 }}
        >
          {Array.from({ length: total }, (_, i) => {
            // Each segment fades in over one segment-width of the count, so
            // the ring lights hour by hour rather than all at once.
            const strength = Math.max(0, Math.min(1, lit - i));
            const idle = interpolateSafe(frame, [i * 1.5, i * 1.5 + 14], [0, 1]);
            return (
              <g key={i}>
                <path d={wedge(i)} fill={BRAND.input} opacity={idle} />
                {strength > 0 ? (
                  <path
                    d={wedge(i)}
                    fill={courtGreen(0.35 + 0.55 * strength)}
                    opacity={strength}
                  />
                ) : null}
              </g>
            );
          })}

          {/* Inner hairline, so the middle reads as a plate rather than a hole. */}
          <circle
            cx={cx}
            cy={cy}
            r={rInner - 12 * unit}
            fill="none"
            stroke={hairline(1)}
            strokeWidth={1 * unit}
          />
        </svg>
      </Sequence>

      <Sequence name="Readout" layout="none">
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: cy - 96 * unit,
            textAlign: "center",
            ...eyebrowStyle(unit * 1.15, muted(0.85)),
            opacity: interpolateSafe(frame, [0, 14], [0, 1]),
          }}
        >
          {label}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: cy - 66 * unit,
            textAlign: "center",
            ...numeralStyle(unit, 82),
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
          }}
        >
          {`${shownPercent}`}
          <span style={{ fontSize: 32 * unit, color: muted(0.7) }}>%</span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: cy + 22 * unit,
            textAlign: "center",
            fontFamily: DISPLAY_FONT,
            fontSize: 24 * unit,
            fontWeight: 600,
            color: BRAND.foreground,
            opacity: interpolateSafe(frame, [10, 28], [0, 1]),
          }}
        >
          {venueName}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: cy + 56 * unit,
            textAlign: "center",
            fontFamily: SANS_FONT,
            fontSize: 16 * unit,
            color: amber(0.9),
            fontVariantNumeric: "tabular-nums",
            opacity: interpolateSafe(frame, [settled - 16, settled + 2], [0, 1]),
          }}
        >
          {`${filled} of ${total} hours booked`}
        </div>
      </Sequence>

      <div
        style={{
          position: "absolute",
          left: width * 0.12,
          right: width * 0.12,
          top: cy + rOuter + 42 * unit,
          textAlign: "center",
          fontFamily: SANS_FONT,
          fontSize: 15 * unit,
          color: BRAND.foregroundSoft,
          opacity: interpolateSafe(frame, [settled - 8, settled + 12], [0, 1]),
        }}
      >
        {caption}
      </div>

      {/* Tick marking the top of the ring, so the reading has a start. */}
      <div
        style={{
          position: "absolute",
          left: cx - 1 * unit,
          top: cy - rOuter - 18 * unit,
          width: 2 * unit,
          height: 12 * unit,
          borderRadius: 999,
          backgroundColor: muted(0.6),
        }}
      />
    </AbsoluteFill>
  );
};
