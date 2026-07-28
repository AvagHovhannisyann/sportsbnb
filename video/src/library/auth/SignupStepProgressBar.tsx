/**
 * SignupStepProgressBar — the "Step 2 of 4" header on /onboarding/player and
 * /onboarding/owner advancing one step.
 * Event-driven, not a loop: it plays once when the user presses Continue, then
 * holds the new step.
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  SANS_FONT,
  chalk,
  courtGreen,
  hairline,
  interpolateSafe,
  useMotionFrame,
} from "./authKit";

const CANVAS_W = 720;

export type SignupStepProgressBarProps = {
  /** `totalSteps` in PlayerOnboarding — 4 today. */
  totalSteps: number;
  /** The step the bar starts on. */
  fromStep: number;
  /** The step it advances to. */
  toStep: number;
  /** Caption under the bar. Empty string hides the row. */
  caption: string;
  /** Show the percentage numeral on the right of the header. */
  showPercent: boolean;
};

export const signupStepProgressBarDefaultProps: SignupStepProgressBarProps = {
  totalSteps: 4,
  fromStep: 2,
  toStep: 3,
  caption: "Sports preferences",
  showPercent: true,
};

/** Frame the advance begins on — the header swaps first, the bar follows. */
const LABEL_AT = 4;
const BAR_AT = 8;

export const SignupStepProgressBar: FC<SignupStepProgressBarProps> = ({
  totalSteps,
  fromStep,
  toStep,
  caption,
  showPercent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  /**
   * One-way. Reduced motion settles on the *last* frame, because the end state
   * — the new step, the longer bar — is the whole message; freezing at 0 would
   * show the step the user has just left.
   */
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;

  const fromFrac = Math.min(1, Math.max(0, fromStep / totalSteps));
  const toFrac = Math.min(1, Math.max(0, toStep / totalSteps));

  /**
   * The bar. A spring rather than a tween because the value is a *quantity*
   * settling, and `Progress` in the app translates its indicator the same way —
   * damping high enough that it does not overshoot past 100%.
   */
  const advance = spring({
    frame,
    fps,
    delay: BAR_AT,
    config: { damping: 30, mass: 1, stiffness: 130 },
    durationInFrames: 26,
  });
  const frac = fromFrac + (toFrac - fromFrac) * advance;

  /** Header swap: the old numeral leaves quicker than the new one arrives. */
  const outOpacity = interpolateSafe(frame, [LABEL_AT, LABEL_AT + 5], [1, 0]);
  const outY = interpolateSafe(
    frame,
    [LABEL_AT, LABEL_AT + 5],
    [0, -7 * unit],
    EASE_OUT_EXPO,
  );
  const inOpacity = interpolateSafe(
    frame,
    [LABEL_AT + 4, LABEL_AT + 16],
    [0, 1],
  );
  const inY = interpolateSafe(
    frame,
    [LABEL_AT + 4, LABEL_AT + 16],
    [9 * unit, 0],
    EASE_OUT_EXPO,
  );

  const trackW = width - 96 * unit;
  const trackX = 48 * unit;
  const trackY = height * 0.52;
  const trackH = 6 * unit;

  const percent = Math.round(frac * 100);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 130% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 70%)`,
        }}
      />

      <Sequence name="Header" layout="none">
        <div
          style={{
            position: "absolute",
            left: trackX,
            right: trackX,
            top: trackY - 44 * unit,
            height: 26 * unit,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: SANS_FONT,
            fontSize: 15 * unit,
            fontWeight: 500,
          }}
        >
          {/* Two numerals sharing one slot, so the row cannot reflow. */}
          <div style={{ position: "relative", height: 22 * unit, flex: 1 }}>
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                color: BRAND.mutedForeground,
                opacity: outOpacity,
                transform: `translateY(${outY}px)`,
              }}
            >
              {`Step ${fromStep} of ${totalSteps}`}
            </span>
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                color: BRAND.foreground,
                opacity: inOpacity,
                transform: `translateY(${inY}px)`,
              }}
            >
              {`Step ${toStep} of ${totalSteps}`}
            </span>
          </div>

          {showPercent ? (
            <span
              style={{
                fontFamily: MONO_FONT,
                fontVariantNumeric: "tabular-nums",
                fontSize: 14 * unit,
                letterSpacing: -0.02 * 14 * unit,
                color: interpolateColors(
                  advance,
                  [0, 1],
                  [BRAND.mutedForeground, BRAND.primary],
                ),
              }}
            >
              {`${percent}%`}
            </span>
          ) : null}
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
              width: trackW * frac,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${courtGreen(0.55)} 0%, ${BRAND.primary} 100%)`,
              boxShadow: `0 0 ${14 * unit}px ${-2 * unit}px ${courtGreen(0.5)}`,
            }}
          />
        </div>

        {/* Step boundaries. The one just crossed brightens with the bar. */}
        {Array.from({ length: Math.max(0, totalSteps - 1) }, (_, i) => {
          const at = (i + 1) / totalSteps;
          const crossed = frac >= at - 0.001 ? 1 : 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: trackX + trackW * at - 1 * unit,
                top: trackY - 3 * unit,
                width: 2 * unit,
                height: trackH + 6 * unit,
                borderRadius: 999,
                backgroundColor: crossed ? chalk(0.32) : hairline(1),
              }}
            />
          );
        })}
      </Sequence>

      {caption ? (
        <Sequence name="Caption" layout="none">
          <div
            style={{
              position: "absolute",
              left: trackX,
              right: trackX,
              top: trackY + 22 * unit,
              fontFamily: DISPLAY_FONT,
              fontSize: 17 * unit,
              fontWeight: 600,
              letterSpacing: -0.025 * 17 * unit,
              color: BRAND.foreground,
              opacity: interpolateSafe(frame, [BAR_AT + 6, BAR_AT + 20], [0, 1]),
              transform: `translateY(${interpolateSafe(
                frame,
                [BAR_AT + 6, BAR_AT + 20],
                [8 * unit, 0],
                EASE_OUT_EXPO,
              )}px)`,
            }}
          >
            {caption}
          </div>
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
