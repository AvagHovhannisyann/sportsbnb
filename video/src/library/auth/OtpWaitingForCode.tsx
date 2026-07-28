/**
 * OtpWaitingForCode — the idle state of the six-slot code field on /login's
 * two-factor step and the magic-link "check your email" screen.
 * A seamless loop, because it plays for as long as the user is fetching a code
 * from another device. Nothing in it moves fast enough to hurry them.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
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

const CANVAS_W = 720;

export type OtpWaitingForCodeProps = {
  /** `maxLength` on the app's InputOTP — 6. */
  slotCount: number;
  /** Digits already typed. The next slot is the active one. */
  entered: string;
  /** Line under the field. */
  hint: string;
  /** Caret blinks per loop. Must be a whole number, or the seam is not exact. */
  blinksPerLoop: number;
};

export const otpWaitingForCodeDefaultProps: OtpWaitingForCodeProps = {
  slotCount: 6,
  entered: "204",
  hint: "Open your authenticator app to view your verification code",
  blinksPerLoop: 5,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The caret is `0.5 + 0.5·cos(2π · blinksPerLoop · t)`. `blinksPerLoop` is
 *     rounded to a whole number below, so the cosine completes a whole number
 *     of periods and returns to its exact opening value at t=1.
 *  2. The listening ring and the field's own breath ride `sin(2πt)` — one full
 *     period.
 *  3. The shimmer over the empty slots is a repeating gradient whose
 *     `backgroundPosition` advances by exactly one gradient period per loop, so
 *     the highlight leaving the right edge and the one entering from the left
 *     are the same highlight.
 *
 * Nothing here is a one-way tween.
 */
export const OtpWaitingForCode: FC<OtpWaitingForCodeProps> = ({
  slotCount,
  entered,
  hint,
  blinksPerLoop,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;

  // Whole periods only — this is the entire seam guarantee for the caret.
  const blinks = Math.max(1, Math.round(blinksPerLoop));
  const caret = 0.5 + 0.5 * Math.cos(TAU * blinks * t);
  const breath = 0.5 + 0.5 * Math.sin(TAU * t);

  const digits = entered.split("");
  const activeIndex = Math.min(digits.length, slotCount - 1);

  const slotW = 62 * unit;
  const slotH = 74 * unit;
  const gap = 10 * unit;
  const groupW = slotCount * slotW + (slotCount - 1) * gap;
  const groupX = (width - groupW) / 2;
  const groupY = height * 0.34;

  const shimmerPeriod = groupW * 1.6;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(80% 110% at 50% 30%, ${BRAND.surface1} 0%, ${BRAND.background} 72%)`,
        }}
      />

      {/* Listening ring — a very soft bloom behind the group, one sine period. */}
      <div
        style={{
          position: "absolute",
          left: groupX - 40 * unit,
          top: groupY - 34 * unit,
          width: groupW + 80 * unit,
          height: slotH + 68 * unit,
          borderRadius: 28 * unit,
          background: `radial-gradient(60% 90% at 50% 50%, ${courtGreen(0.07)} 0%, transparent 72%)`,
          opacity: 0.45 + 0.55 * breath,
        }}
      />

      {Array.from({ length: slotCount }, (_, i) => {
        const filled = i < digits.length;
        const active = i === activeIndex && digits.length < slotCount;
        const x = groupX + i * (slotW + gap);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: groupY,
              width: slotW,
              height: slotH,
              borderRadius: 12 * unit,
              backgroundColor: filled ? BRAND.surface2 : BRAND.input,
              border: `${1.6 * unit}px solid ${
                active
                  ? courtGreen(0.45 + 0.35 * breath)
                  : filled
                    ? BRAND.borderStrong
                    : hairline(1)
              }`,
              boxShadow: active
                ? `0 0 0 ${4 * unit}px ${courtGreen(0.1 + 0.08 * breath)}`
                : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* Shimmer across the still-empty slots. One gradient period/loop. */}
            {!filled ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `repeating-linear-gradient(90deg, ${chalk(0)} 0px, ${chalk(0)} ${shimmerPeriod * 0.55}px, ${chalk(0.055)} ${shimmerPeriod * 0.72}px, ${chalk(0)} ${shimmerPeriod}px)`,
                  backgroundSize: `${shimmerPeriod}px 100%`,
                  backgroundPosition: `${t * shimmerPeriod - x}px 0px`,
                }}
              />
            ) : null}

            {filled ? (
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 30 * unit,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                  color: BRAND.foreground,
                }}
              >
                {digits[i]}
              </span>
            ) : null}

            {active ? (
              <div
                style={{
                  position: "absolute",
                  width: 2 * unit,
                  height: 30 * unit,
                  borderRadius: 999,
                  backgroundColor: BRAND.primary,
                  opacity: caret,
                }}
              />
            ) : null}
          </div>
        );
      })}

      {/* Progress hairline: how much of the code is in, without a countdown. */}
      <div
        style={{
          position: "absolute",
          left: groupX,
          top: groupY + slotH + 22 * unit,
          width: groupW,
          height: 2 * unit,
          borderRadius: 999,
          backgroundColor: hairline(1),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: groupW * (digits.length / slotCount),
            backgroundColor: courtGreen(0.55 + 0.2 * breath),
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: groupY + slotH + 44 * unit,
          textAlign: "center",
          fontFamily: SANS_FONT,
          fontSize: 14 * unit,
          lineHeight: 1.5,
          color: muted(0.85),
          textShadow: `0 ${2 * unit}px ${8 * unit}px ${ink(0.6)}`,
        }}
      >
        {hint}
      </div>
    </AbsoluteFill>
  );
};
