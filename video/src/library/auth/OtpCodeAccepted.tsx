/**
 * OtpCodeAccepted — the six-slot code field resolving after a correct
 * two-factor code on /login, in the beat before `handleLoginSuccess` navigates.
 * One-way and short: it fills the gap while the profile is fetched, and it
 * must never be the reason a signed-in user waits.
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {
  BRAND,
  EASE_OUT_EXPO,
  MONO_FONT,
  SANS_FONT,
  courtGreen,
  hairline,
  interpolateSafe,
  useMotionFrame,
} from "./authKit";

const CANVAS_W = 720;

export type OtpCodeAcceptedProps = {
  /** The accepted code. Its length also sets the slot count. */
  code: string;
  /** Line under the field. */
  message: string;
  /** Frames between one slot confirming and the next. */
  staggerFrames: number;
  /** Draw the tick badge over the field once every slot has confirmed. */
  showBadge: boolean;
};

export const otpCodeAcceptedDefaultProps: OtpCodeAcceptedProps = {
  code: "204813",
  message: "Verified — taking you in",
  staggerFrames: 2,
  showBadge: true,
};

const TICK_PATH = "M5 12.5 L10 17.5 L19.5 6.5";
const TICK_LEN = 24;

export const OtpCodeAccepted: FC<OtpCodeAcceptedProps> = ({
  code,
  message,
  staggerFrames,
  showBadge,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  /**
   * One-way: reduced motion settles on the last frame, so the verified state
   * is what a viewer who asked for stillness actually sees.
   */
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const digits = code.split("");
  const slotCount = Math.max(1, digits.length);

  const slotW = 62 * unit;
  const slotH = 74 * unit;
  const gap = 10 * unit;
  const groupW = slotCount * slotW + (slotCount - 1) * gap;
  const groupX = (width - groupW) / 2;
  const groupY = height * 0.32;

  /** The whole group lifts a hair once the last slot has confirmed. */
  const lastConfirmAt = (slotCount - 1) * staggerFrames + 14;
  const groupLift = interpolateSafe(
    frame,
    [lastConfirmAt, lastConfirmAt + 10],
    [0, -4 * unit],
    EASE_OUT_EXPO,
  );

  const badge = spring({
    frame,
    fps,
    delay: lastConfirmAt + 2,
    // The one overshoot in the file. A confirmation landing is where the app
    // spends its `--ease-spring`, and nowhere else.
    config: { damping: 14, mass: 0.7, stiffness: 170 },
    durationInFrames: 20,
  });
  const tickDraw = interpolateSafe(
    frame,
    [lastConfirmAt + 5, lastConfirmAt + 17],
    [0, 1],
    EASE_OUT_EXPO,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(80% 110% at 50% 30%, ${BRAND.surface1} 0%, ${BRAND.background} 72%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(48% 46% at 50% 36%, ${courtGreen(0.13 * badge)} 0%, transparent 70%)`,
        }}
      />

      <Sequence name="Slots" layout="none">
        <div style={{ transform: `translateY(${groupLift}px)` }}>
          {digits.map((digit, i) => {
            const delay = i * staggerFrames;
            // Confirmation, not arrival: high damping, no bounce per slot.
            const confirm = spring({
              frame,
              fps,
              delay,
              config: { damping: 24, mass: 0.7, stiffness: 170 },
              durationInFrames: 14,
            });

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: groupX + i * (slotW + gap),
                  top: groupY,
                  width: slotW,
                  height: slotH,
                  borderRadius: 12 * unit,
                  backgroundColor: BRAND.surface2,
                  border: `${1.6 * unit}px solid ${courtGreen(
                    0.18 + 0.42 * confirm,
                  )}`,
                  boxShadow: `0 0 ${18 * unit * confirm}px ${-4 * unit}px ${courtGreen(0.35 * confirm)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `translateY(${-3 * unit * confirm}px)`,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: 30 * unit,
                    fontWeight: 500,
                    fontVariantNumeric: "tabular-nums",
                    color: BRAND.foreground,
                  }}
                >
                  {digit}
                </span>
              </div>
            );
          })}
        </div>
      </Sequence>

      {showBadge ? (
        <Sequence name="Badge" layout="none">
          <div
            style={{
              position: "absolute",
              left: width / 2 - 26 * unit,
              top: groupY + slotH + 14 * unit,
              width: 52 * unit,
              height: 52 * unit,
              borderRadius: 16 * unit,
              backgroundColor: courtGreen(0.14),
              border: `${1.5 * unit}px solid ${courtGreen(0.4)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${0.86 + 0.14 * badge})`,
              opacity: badge,
            }}
          >
            <svg width={28 * unit} height={28 * unit} viewBox="0 0 24 24" fill="none">
              <path
                d={TICK_PATH}
                stroke={BRAND.primary}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={TICK_LEN}
                strokeDashoffset={TICK_LEN * (1 - tickDraw)}
              />
            </svg>
          </div>
        </Sequence>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: groupY + slotH + (showBadge ? 80 : 30) * unit,
          textAlign: "center",
          fontFamily: SANS_FONT,
          fontSize: 15 * unit,
          fontWeight: 500,
          color: BRAND.foreground,
          opacity: interpolateSafe(
            frame,
            [lastConfirmAt + 6, lastConfirmAt + 18],
            [0, 1],
          ),
          transform: `translateY(${interpolateSafe(
            frame,
            [lastConfirmAt + 6, lastConfirmAt + 18],
            [7 * unit, 0],
            EASE_OUT_EXPO,
          )}px)`,
        }}
      >
        {message}
      </div>

      {/* Hairline that closes solid green — the field's own progress track. */}
      <div
        style={{
          position: "absolute",
          left: groupX,
          top: groupY - 16 * unit,
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
            width: groupW * interpolateSafe(frame, [0, lastConfirmAt], [0, 1]),
            backgroundColor: BRAND.primary,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
