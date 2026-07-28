/**
 * FieldValidationFeedback — a single form field answering focus and then
 * answering validation, on /login, /signup and /reset-password.
 * Covers the three states those pages actually produce: focused, rejected by
 * the zod schema, and accepted. One-way; it plays on an event and holds.
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
  SANS_FONT,
  courtGreen,
  focusRing,
  interpolateSafe,
  muted,
  rose,
  useMotionFrame,
} from "./authKit";

const CANVAS_W = 720;

export type FieldValidationFeedbackProps = {
  /** Field label, as rendered by the app's `<Label>`. */
  label: string;
  /** What is in the field. */
  value: string;
  /** Which of the three real outcomes to play. */
  state: "focus" | "invalid" | "valid";
  /** The message under the field. Only shown for "invalid". */
  message: string;
  /** Leading glyph: the app puts a Mail or Lock icon in this slot. */
  icon: "mail" | "lock" | "user";
};

export const fieldValidationFeedbackDefaultProps: FieldValidationFeedbackProps =
  {
    label: "Email address",
    value: "anush@sportsbnb",
    state: "invalid",
    message: "Please enter a valid email address",
    icon: "mail",
  };

/** Focus lands first; the verdict follows once the user has stopped typing. */
const FOCUS_AT = 6;
const VERDICT_AT = 26;

/** The app's one failure gesture: x: [0, -8, 8, -6, 6, 0] over 0.3s. */
const SHAKE_FRAMES = [0, 1.8, 3.6, 5.4, 7.2, 9];
const SHAKE_STEPS = [0, -1, 1, -0.75, 0.75, 0];

export const FieldValidationFeedback: FC<FieldValidationFeedbackProps> = ({
  label,
  value,
  state,
  message,
  icon,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the verdict, which is the whole point.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const padX = 48 * unit;
  const fieldW = width - padX * 2;
  const fieldH = 52 * unit;
  const fieldY = height * 0.36;

  /** Focus: colour and a 1.1× icon, exactly as `FIELD_ICON` in LoginPage. */
  const focus = spring({
    frame,
    fps,
    delay: FOCUS_AT,
    config: { damping: 26, mass: 0.8, stiffness: 150 },
    durationInFrames: 12,
  });

  const invalid = state === "invalid";
  const valid = state === "valid";

  const verdict = interpolateSafe(frame, [VERDICT_AT, VERDICT_AT + 10], [0, 1]);

  const shakeX = invalid
    ? 8 *
      unit *
      interpolateSafe(
        frame,
        SHAKE_FRAMES.map((f) => f + VERDICT_AT),
        SHAKE_STEPS,
      )
    : 0;

  const borderColour = invalid
    ? rose(0.35 + 0.5 * verdict)
    : valid
      ? courtGreen(0.28 + 0.4 * verdict)
      : `hsla(151, 90%, 47%, ${0.25 + 0.5 * focus})`;

  const iconColour = invalid
    ? BRAND.destructive
    : `hsla(151, 90%, 47%, ${0.35 + 0.65 * focus})`;

  const ringStrength = invalid ? 0 : focus * (valid ? 1 - verdict * 0.4 : 1);

  const glyph = (() => {
    if (icon === "lock") {
      return (
        <>
          <rect x={5} y={10.5} width={14} height={9.5} rx={2.4} />
          <path d="M8.2 10.5 V7.8 a3.8 3.8 0 0 1 7.6 0 V10.5" />
        </>
      );
    }
    if (icon === "user") {
      return (
        <>
          <circle cx={12} cy={8.4} r={3.6} />
          <path d="M5.2 19.4 a6.8 6.8 0 0 1 13.6 0" />
        </>
      );
    }
    return (
      <>
        <rect x={3.2} y={5.6} width={17.6} height={12.8} rx={2.6} />
        <path d="M3.6 7 L12 13 L20.4 7" />
      </>
    );
  })();

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(100% 110% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 76%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: padX,
          top: fieldY - 26 * unit,
          fontFamily: SANS_FONT,
          fontSize: 14 * unit,
          fontWeight: 500,
          color: BRAND.foreground,
          opacity: interpolateSafe(frame, [0, 10], [0, 1]),
        }}
      >
        {label}
      </div>

      <Sequence name="Field" layout="none">
        <div
          style={{
            position: "absolute",
            left: padX,
            top: fieldY,
            width: fieldW,
            height: fieldH,
            borderRadius: 12 * unit,
            backgroundColor: BRAND.input,
            border: `${1.8 * unit}px solid ${borderColour}`,
            boxShadow: focusRing(unit, ringStrength),
            display: "flex",
            alignItems: "center",
            transform: `translateX(${shakeX}px)`,
          }}
        >
          <svg
            width={20 * unit}
            height={20 * unit}
            viewBox="0 0 24 24"
            fill="none"
            stroke={iconColour}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              marginLeft: 14 * unit,
              // `motion-safe:group-focus-within:scale-110` — the app's number.
              transform: `scale(${1 + 0.1 * focus})`,
            }}
          >
            {glyph}
          </svg>

          <span
            style={{
              marginLeft: 12 * unit,
              fontFamily: SANS_FONT,
              fontSize: 16 * unit,
              color: BRAND.foreground,
            }}
          >
            {value}
          </span>

          {/* Caret while focused; it retires once a verdict exists. */}
          <div
            style={{
              marginLeft: 2 * unit,
              width: 2 * unit,
              height: 22 * unit,
              borderRadius: 999,
              backgroundColor: BRAND.primary,
              opacity: focus * (1 - verdict),
            }}
          />

          {valid ? (
            <svg
              width={20 * unit}
              height={20 * unit}
              viewBox="0 0 24 24"
              fill="none"
              style={{
                position: "absolute",
                right: 16 * unit,
                opacity: verdict,
                transform: `scale(${0.8 + 0.2 * verdict})`,
              }}
            >
              <path
                d="M5 12.5 L10 17.5 L19.5 6.5"
                stroke={BRAND.primary}
                strokeWidth={2.3}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={24}
                strokeDashoffset={24 * (1 - verdict)}
              />
            </svg>
          ) : null}
        </div>
      </Sequence>

      {invalid ? (
        <Sequence name="Error" layout="none">
          <div
            style={{
              position: "absolute",
              left: padX,
              top: fieldY + fieldH + 12 * unit,
              display: "flex",
              alignItems: "center",
              gap: 7 * unit,
              opacity: interpolateSafe(
                frame,
                [VERDICT_AT + 4, VERDICT_AT + 14],
                [0, 1],
              ),
              transform: `translateY(${interpolateSafe(
                frame,
                [VERDICT_AT + 4, VERDICT_AT + 14],
                [-6 * unit, 0],
                EASE_OUT_EXPO,
              )}px)`,
            }}
          >
            <svg width={15 * unit} height={15 * unit} viewBox="0 0 24 24" fill="none">
              <circle cx={12} cy={12} r={9.5} stroke={BRAND.destructive} strokeWidth={2} />
              <path
                d="M12 7.2 L12 13"
                stroke={BRAND.destructive}
                strokeWidth={2.2}
                strokeLinecap="round"
              />
              <circle cx={12} cy={16.4} r={1.2} fill={BRAND.destructive} />
            </svg>
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 13.5 * unit,
                color: BRAND.destructive,
              }}
            >
              {message}
            </span>
          </div>
        </Sequence>
      ) : (
        <div
          style={{
            position: "absolute",
            left: padX,
            top: fieldY + fieldH + 14 * unit,
            fontFamily: SANS_FONT,
            fontSize: 13 * unit,
            color: muted(0.7),
            opacity: interpolateSafe(frame, [FOCUS_AT, FOCUS_AT + 12], [0, 1]),
          }}
        >
          {valid ? "Looks good" : "We'll only use this to sign you in"}
        </div>
      )}
    </AbsoluteFill>
  );
};
