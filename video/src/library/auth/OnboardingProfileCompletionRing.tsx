/**
 * OnboardingProfileCompletionRing — the "profile N% complete" dial on the
 * player and owner dashboards, and on /profile.
 * One-way: it sweeps to the real figure once and holds. 60fps, because a slow
 * arc at 30 shows its steps.
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolateColors,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  SANS_FONT,
  TAU,
  courtGreen,
  hairline,
  interpolateSafe,
  muted,
  useMotionFrame,
} from "./authKit";

const CANVAS = 600;

export type OnboardingProfileCompletionRingProps = {
  /** Where the dial ends, 0–100. */
  percent: number;
  /** Where it starts. Non-zero when a step was just completed. */
  fromPercent: number;
  /** Line under the numeral. */
  caption: string;
  /** Mono caps above the numeral. */
  label: string;
  /** Draw the segment ticks that mark each onboarding step. */
  steps: number;
};

export const onboardingProfileCompletionRingDefaultProps: OnboardingProfileCompletionRingProps =
  {
    percent: 80,
    fromPercent: 60,
    caption: "One step left: set your home district",
    label: "Profile",
    steps: 5,
  };

/** The sweep starts after the dial has arrived, not with it. */
const SWEEP_AT = 10;
const SWEEP_FRAMES = 54;

export const OnboardingProfileCompletionRing: FC<
  OnboardingProfileCompletionRingProps
> = ({ percent, fromPercent, caption, label, steps }) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the finished dial, which is the figure.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = Math.min(width, height) / CANVAS;

  /**
   * Eased rather than sprung, and clamped: a spring would overshoot past the
   * real percentage, and a completion figure that reads 104% before settling
   * is a figure nobody trusts again.
   */
  const shown = interpolateSafe(
    frame,
    [SWEEP_AT, SWEEP_AT + SWEEP_FRAMES],
    [fromPercent, percent],
    EASE_OUT_EXPO,
  );
  const frac = Math.max(0, Math.min(1, shown / 100));

  const cx = width / 2;
  const cy = height / 2;
  const r = 176 * unit;
  const circumference = TAU * r;
  const stroke = 18 * unit;

  const arcColour = interpolateColors(
    frac,
    [0, 0.5, 1],
    [BRAND.mutedForeground, courtGreen(0.75), BRAND.primary],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 70% at 50% 46%, ${BRAND.surface1} 0%, ${BRAND.background} 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 40% at 50% 50%, ${courtGreen(0.1 * frac)} 0%, transparent 72%)`,
        }}
      />

      <Sequence name="Dial" layout="none">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={BRAND.input}
            strokeWidth={stroke}
          />

          {/* Step boundaries, drawn on the track itself. */}
          {Array.from({ length: Math.max(0, steps) }, (_, i) => {
            const a = (i / Math.max(1, steps)) * TAU - Math.PI / 2;
            const inner = r - stroke / 2;
            const outer = r + stroke / 2;
            return (
              <line
                key={i}
                x1={cx + Math.cos(a) * inner}
                y1={cy + Math.sin(a) * inner}
                x2={cx + Math.cos(a) * outer}
                y2={cy + Math.sin(a) * outer}
                stroke={BRAND.background}
                strokeWidth={3 * unit}
              />
            );
          })}

          {/* Glow pass, then the arc. */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={arcColour}
            strokeWidth={stroke * 1.9}
            strokeLinecap="round"
            opacity={0.12}
            strokeDasharray={`${circumference * frac} ${circumference}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={arcColour}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * frac} ${circumference}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />

          {/* The head of the arc — a small chalk cap, so the end reads. */}
          <circle
            cx={cx + Math.cos(frac * TAU - Math.PI / 2) * r}
            cy={cy + Math.sin(frac * TAU - Math.PI / 2) * r}
            r={4 * unit}
            fill={BRAND.foreground}
            opacity={frac > 0.02 ? 0.85 : 0}
          />
        </svg>
      </Sequence>

      <Sequence name="Readout" layout="none">
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: cy - 74 * unit,
            textAlign: "center",
            fontFamily: MONO_FONT,
            fontSize: 13 * unit,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: 0.2 * 13 * unit,
            color: muted(0.8),
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
            top: cy - 52 * unit,
            textAlign: "center",
            fontFamily: DISPLAY_FONT,
            fontSize: 86 * unit,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: -0.04 * 86 * unit,
            fontVariantNumeric: "tabular-nums",
            color: BRAND.foreground,
          }}
        >
          {`${Math.round(shown)}`}
          <span
            style={{
              fontSize: 34 * unit,
              fontWeight: 600,
              color: muted(0.7),
              marginLeft: 3 * unit,
            }}
          >
            %
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: width * 0.16,
            right: width * 0.16,
            top: cy + 52 * unit,
            textAlign: "center",
            fontFamily: SANS_FONT,
            fontSize: 15 * unit,
            lineHeight: 1.45,
            color: BRAND.foregroundSoft,
            opacity: interpolateSafe(
              frame,
              [SWEEP_AT + SWEEP_FRAMES - 12, SWEEP_AT + SWEEP_FRAMES + 4],
              [0, 1],
            ),
          }}
        >
          {caption}
        </div>
      </Sequence>

      {/* Hairline base under the dial, so it sits on something. */}
      <div
        style={{
          position: "absolute",
          left: cx - r,
          top: cy + r + 46 * unit,
          width: r * 2,
          height: 1 * unit,
          background: `linear-gradient(90deg, transparent, ${hairline(1)} 50%, transparent)`,
        }}
      />
    </AbsoluteFill>
  );
};
