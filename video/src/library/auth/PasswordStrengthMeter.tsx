/**
 * PasswordStrengthMeter — the strength bar and verdict that mount on the first
 * keystroke into the password field on /signup and /reset-password.
 * The score and the five rungs are `passwordStrength` / `getStrengthLabel` from
 * `src/pages/SignupPage.tsx`, not an invented scale.
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
  MONO_FONT,
  SANS_FONT,
  STRENGTH_RUNGS,
  chalk,
  hairline,
  interpolateSafe,
  ink,
  muted,
  smoothstep,
  strengthRung,
  useMotionFrame,
} from "./authKit";

const CANVAS_W = 720;

export type PasswordStrengthMeterProps = {
  /** Final score, 0–100. The app scores 20 per satisfied check. */
  score: number;
  /** Where the sweep starts. Non-zero when a field is being edited, not typed. */
  fromScore: number;
  /** Masked value shown above the bar. */
  maskedValue: string;
  /** Draw the five 20-point boundaries on the track. */
  showRungTicks: boolean;
};

export const passwordStrengthMeterDefaultProps: PasswordStrengthMeterProps = {
  score: 100,
  fromScore: 0,
  maskedValue: "••••••••••••",
  showRungTicks: true,
};

/** The bar starts after the field has settled, not with it. */
const SWEEP_AT = 8;
const SWEEP_FRAMES = 44;

export const PasswordStrengthMeter: FC<PasswordStrengthMeterProps> = ({
  score,
  fromScore,
  maskedValue,
  showRungTicks,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  /**
   * One-way: reduced motion holds the final frame, so the verdict a viewer who
   * asked for stillness reads is the verdict for the password they typed.
   */
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;

  /**
   * Linear rather than sprung. This is a *measurement* climbing, and a spring
   * would overshoot past the score — showing "Strong" for a password that is
   * only Good, which is a lie the user would act on.
   */
  const shown = interpolateSafe(
    frame,
    [SWEEP_AT, SWEEP_AT + SWEEP_FRAMES],
    [fromScore, score],
  );
  const rung = strengthRung(shown);

  const trackX = 48 * unit;
  const trackW = width - trackX * 2;
  const trackY = height * 0.56;
  const trackH = 6 * unit;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(100% 120% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 74%)`,
        }}
      />

      <Sequence name="Field" layout="none">
        <div
          style={{
            position: "absolute",
            left: trackX,
            top: trackY - 78 * unit,
            width: trackW,
            height: 46 * unit,
            borderRadius: 12 * unit,
            backgroundColor: BRAND.input,
            border: `${1.6 * unit}px solid ${BRAND.borderInteractive}`,
            display: "flex",
            alignItems: "center",
            paddingLeft: 16 * unit,
            fontFamily: MONO_FONT,
            fontSize: 17 * unit,
            letterSpacing: 2 * unit,
            color: BRAND.foregroundSoft,
          }}
        >
          {maskedValue}
        </div>
      </Sequence>

      <Sequence name="Track" layout="none">
        <div
          style={{
            position: "absolute",
            left: trackX,
            top: trackY,
            width: trackW,
            height: trackH,
            borderRadius: 999,
            backgroundColor: BRAND.input,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: trackW * (Math.max(0, Math.min(100, shown)) / 100),
              borderRadius: 999,
              backgroundColor: rung.color,
              boxShadow: `0 0 ${12 * unit}px ${-2 * unit}px ${rung.color}`,
            }}
          />
        </div>

        {showRungTicks
          ? STRENGTH_RUNGS.slice(0, STRENGTH_RUNGS.length - 1).map((r) => (
              <div
                key={r.label}
                style={{
                  position: "absolute",
                  left: trackX + trackW * (r.upTo / 100) - 1 * unit,
                  top: trackY - 3 * unit,
                  width: 2 * unit,
                  height: trackH + 6 * unit,
                  borderRadius: 999,
                  backgroundColor:
                    shown >= r.upTo ? chalk(0.28) : hairline(1),
                }}
              />
            ))
          : null}
      </Sequence>

      {/*
        The verdict. All five rungs share one slot and cross-fade, because the
        app swaps them in place with `key={strengthInfo.label}` — the row must
        never reflow while someone is typing into the field above it.
      */}
      <Sequence name="Verdict" layout="none">
        <div
          style={{
            position: "absolute",
            left: trackX,
            right: trackX,
            top: trackY + 20 * unit,
            height: 22 * unit,
          }}
        >
          {STRENGTH_RUNGS.map((r, i) => {
            const lower = i === 0 ? 0.001 : STRENGTH_RUNGS[i - 1].upTo;
            // Soft edges give the crossfade; 4 points ≈ 2 frames of overlap.
            const inBand =
              smoothstep((shown - lower) / 4) *
              (1 - smoothstep((shown - r.upTo) / 4));
            return (
              <span
                key={r.label}
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  fontFamily: SANS_FONT,
                  fontSize: 14 * unit,
                  fontWeight: 600,
                  color: r.color,
                  opacity: inBand,
                }}
              >
                {r.label}
              </span>
            );
          })}

          <span
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              fontFamily: SANS_FONT,
              fontSize: 14 * unit,
              color: muted(0.9),
            }}
          >
            Password strength
          </span>
        </div>
      </Sequence>

      <div
        style={{
          position: "absolute",
          left: trackX,
          right: trackX,
          top: trackY + 52 * unit,
          fontFamily: MONO_FONT,
          fontSize: 12 * unit,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: 0.1 * 12 * unit,
          textTransform: "uppercase",
          color: muted(0.55),
          textShadow: `0 ${2 * unit}px ${6 * unit}px ${ink(0.5)}`,
        }}
      >
        {`${Math.round(shown)} / 100 · ${Math.round(shown / 20)} of 5 checks`}
      </div>
    </AbsoluteFill>
  );
};
