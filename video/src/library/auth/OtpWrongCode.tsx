/**
 * OtpWrongCode — the answer to "Invalid verification code" on /login: the code
 * field shakes, flushes destructive, and clears itself ready for another try.
 * One-way. It reproduces the app's single failure gesture rather than inventing
 * a second one, so every failure path on the page speaks with one voice.
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
  EASE_OUT_EXPO,
  MONO_FONT,
  SANS_FONT,
  hairline,
  interpolateSafe,
  rose,
  useMotionFrame,
} from "./authKit";

const CANVAS_W = 720;

export type OtpWrongCodeProps = {
  /** The rejected code. Its length sets the slot count. */
  code: string;
  /** The toast copy the app shows alongside. */
  message: string;
  /** Peak travel of the shake in design px. The app uses 8. */
  shakeAmplitude: number;
  /** Clear the digits afterwards, as `setTotpCode("")` does. */
  clearAfter: boolean;
};

export const otpWrongCodeDefaultProps: OtpWrongCodeProps = {
  code: "204813",
  message: "Invalid verification code",
  shakeAmplitude: 8,
  clearAfter: true,
};

/**
 * `SHAKE` in `src/pages/LoginPage.tsx` is `x: [0, -8, 8, -6, 6, 0]` over 0.3s
 * with easeInOut. framer-motion spaces keyframes evenly, so at 30fps the six
 * values land on frames 0, 1.8, 3.6, 5.4, 7.2 and 9 — restated here rather than
 * approximated, so the video and the live page shake identically.
 */
const SHAKE_FRAMES = [0, 1.8, 3.6, 5.4, 7.2, 9];
const SHAKE_STEPS = [0, -1, 1, -0.75, 0.75, 0];

const CLEAR_AT = 14;
const CLEAR_FRAMES = 8;

export const OtpWrongCode: FC<OtpWrongCodeProps> = ({
  code,
  message,
  shakeAmplitude,
  clearAfter,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  /**
   * One-way. Reduced motion settles on the last frame: the shake is exactly the
   * thing a reduced-motion viewer should not get, and the *colour* cue — which
   * is the half that carries the meaning — is what remains there.
   */
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const digits = code.split("");
  const slotCount = Math.max(1, digits.length);

  const shakeX =
    shakeAmplitude *
    unit *
    interpolateSafe(frame, SHAKE_FRAMES, SHAKE_STEPS);

  /** Flush in fast, drain slowly — a failure should not linger as noise. */
  const flush = interpolateSafe(frame, [0, 3, 22, 40], [0, 1, 1, 0.34]);

  const digitOpacity = clearAfter
    ? interpolateSafe(frame, [CLEAR_AT, CLEAR_AT + CLEAR_FRAMES], [1, 0])
    : 1;
  const caretBack = clearAfter
    ? interpolateSafe(frame, [CLEAR_AT + CLEAR_FRAMES, CLEAR_AT + 16], [0, 1])
    : 0;

  const slotW = 62 * unit;
  const slotH = 74 * unit;
  const gap = 10 * unit;
  const groupW = slotCount * slotW + (slotCount - 1) * gap;
  const groupX = (width - groupW) / 2;
  const groupY = height * 0.32;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(80% 110% at 50% 30%, ${BRAND.surface1} 0%, ${BRAND.background} 72%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(46% 44% at 50% 34%, ${rose(0.1 * flush)} 0%, transparent 70%)`,
        }}
      />

      <Sequence name="Slots" layout="none">
        <div style={{ transform: `translateX(${shakeX}px)` }}>
          {Array.from({ length: slotCount }, (_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: groupX + i * (slotW + gap),
                top: groupY,
                width: slotW,
                height: slotH,
                borderRadius: 12 * unit,
                backgroundColor: BRAND.input,
                border: `${1.6 * unit}px solid ${
                  flush > 0
                    ? rose(0.25 + 0.55 * flush)
                    : hairline(1)
                }`,
                boxShadow:
                  flush > 0
                    ? `0 0 0 ${3 * unit * flush}px hsla(358, 72%, 68%, ${0.12 * flush})`
                    : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 30 * unit,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                  color: BRAND.destructive,
                  opacity: digitOpacity,
                }}
              >
                {digits[i]}
              </span>

              {/* The caret returning to slot 1 is how the field says "again". */}
              {i === 0 ? (
                <div
                  style={{
                    position: "absolute",
                    width: 2 * unit,
                    height: 30 * unit,
                    borderRadius: 999,
                    backgroundColor: BRAND.primary,
                    opacity: caretBack * 0.9,
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      </Sequence>

      <Sequence name="Message" layout="none">
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: groupY + slotH + 26 * unit,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8 * unit,
            opacity: interpolateSafe(frame, [6, 16], [0, 1]),
            transform: `translateY(${interpolateSafe(frame, [6, 16], [7 * unit, 0], EASE_OUT_EXPO)}px)`,
          }}
        >
          <svg width={18 * unit} height={18 * unit} viewBox="0 0 24 24" fill="none">
            <circle
              cx={12}
              cy={12}
              r={9.5}
              stroke={BRAND.destructive}
              strokeWidth={1.8}
            />
            <path
              d="M12 7.2 L12 13"
              stroke={BRAND.destructive}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <circle cx={12} cy={16.4} r={1.15} fill={BRAND.destructive} />
          </svg>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 15 * unit,
              fontWeight: 500,
              color: BRAND.destructive,
            }}
          >
            {message}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: groupY + slotH + 56 * unit,
            textAlign: "center",
            fontFamily: SANS_FONT,
            fontSize: 13.5 * unit,
            color: BRAND.mutedForeground,
            opacity: interpolateSafe(frame, [22, 34], [0, 1]),
          }}
        >
          Check the code in your authenticator app and try again
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
