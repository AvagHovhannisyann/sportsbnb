/**
 * SignupStepAdvanceTransition — the onboarding card swapping one step's fields
 * for the next, as it happens on /onboarding/player when Continue is pressed.
 * Reproduces the app's `AnimatePresence mode="wait"` grammar exactly: the old
 * block leaves quicker than the new one arrives, and the new fields stagger in
 * reading order.
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
  EASE_IN,
  EASE_OUT_EXPO,
  SANS_FONT,
  STAGGER_CAP,
  cardSurface,
  chalk,
  hairline,
  interpolateSafe,
  muted,
  useMotionFrame,
} from "./authKit";

const CANVAS_W = 720;

export type SignupStepAdvanceTransitionProps = {
  /** Heading of the step being left. */
  outgoingTitle: string;
  /** Heading of the step arriving. */
  incomingTitle: string;
  /** Subtitle under the arriving heading. */
  incomingSubtitle: string;
  /** How many field rows the arriving step shows. */
  fieldCount: number;
  /** "forward" = Continue, "back" = the Back button. Flips the travel axis. */
  direction: "forward" | "back";
};

export const signupStepAdvanceTransitionDefaultProps: SignupStepAdvanceTransitionProps =
  {
    outgoingTitle: "Where do you play?",
    incomingTitle: "Which sports?",
    incomingSubtitle: "Pick as many as you like — this shapes your feed.",
    fieldCount: 4,
    direction: "forward",
  };

/**
 * The app's numbers, converted at 30fps:
 *   EXIT     0.16s → 5 frames
 *   ENTER    0.42s → 13 frames
 *   STAGGER  0.05s → 1.5 frames, capped at the sixth sibling
 */
const EXIT_FRAMES = 5;
const ENTER_AT = 6;
const ENTER_FRAMES = 13;
const STAGGER_FRAMES = 1.5;

export const SignupStepAdvanceTransition: FC<
  SignupStepAdvanceTransitionProps
> = ({
  outgoingTitle,
  incomingTitle,
  incomingSubtitle,
  fieldCount,
  direction,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the arrived step.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const sign = direction === "forward" ? 1 : -1;

  const cardX = 40 * unit;
  const cardW = width - cardX * 2;
  const cardY = 32 * unit;
  const cardH = height - cardY * 2;

  const outOpacity = interpolateSafe(frame, [0, EXIT_FRAMES], [1, 0]);
  const outY = interpolateSafe(
    frame,
    [0, EXIT_FRAMES],
    [0, -8 * unit * sign],
    EASE_IN,
  );

  const enterAt = (index: number) => {
    const delay =
      ENTER_AT + Math.min(index, STAGGER_CAP) * STAGGER_FRAMES;
    const opacity = interpolateSafe(
      frame,
      [delay, delay + ENTER_FRAMES],
      [0, 1],
    );
    const y = interpolateSafe(
      frame,
      [delay, delay + ENTER_FRAMES],
      [10 * unit * sign, 0],
      EASE_OUT_EXPO,
    );
    return { opacity, transform: `translateY(${y}px)` };
  };

  const fieldRow = (index: number) => {
    const rowY = 132 * unit + index * 62 * unit;
    const style = enterAt(index + 1);
    return (
      <div
        key={index}
        style={{
          position: "absolute",
          left: cardX + 28 * unit,
          top: cardY + rowY,
          width: cardW - 56 * unit,
          opacity: style.opacity,
          transform: style.transform,
        }}
      >
        <div
          style={{
            width: (34 + 22 * ((index * 7) % 3)) * unit,
            height: 9 * unit,
            borderRadius: 999,
            backgroundColor: muted(0.28),
            marginBottom: 9 * unit,
          }}
        />
        <div
          style={{
            height: 40 * unit,
            borderRadius: 12 * unit,
            backgroundColor: BRAND.input,
            border: `${1.5 * unit}px solid ${index === 0 ? BRAND.borderInteractive : hairline(1)}`,
          }}
        />
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(100% 90% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 74%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: cardX,
          top: cardY,
          width: cardW,
          height: cardH,
          ...cardSurface(unit, 22),
          overflow: "hidden",
        }}
      />

      {/* Leaving. Kept mounted the whole time but at zero opacity after frame 5,
          which is what `mode="wait"` looks like once it has unmounted. */}
      <Sequence name="Outgoing" layout="none">
        <div
          style={{
            position: "absolute",
            left: cardX + 28 * unit,
            top: cardY + 34 * unit,
            width: cardW - 56 * unit,
            fontFamily: DISPLAY_FONT,
            fontSize: 26 * unit,
            fontWeight: 700,
            letterSpacing: -0.025 * 26 * unit,
            color: BRAND.foreground,
            opacity: outOpacity,
            transform: `translateY(${outY}px)`,
          }}
        >
          {outgoingTitle}
        </div>
      </Sequence>

      <Sequence name="Incoming" layout="none">
        <div
          style={{
            position: "absolute",
            left: cardX + 28 * unit,
            top: cardY + 34 * unit,
            width: cardW - 56 * unit,
            fontFamily: DISPLAY_FONT,
            fontSize: 26 * unit,
            fontWeight: 700,
            letterSpacing: -0.025 * 26 * unit,
            color: BRAND.foreground,
            ...enterAt(0),
          }}
        >
          {incomingTitle}
        </div>

        <div
          style={{
            position: "absolute",
            left: cardX + 28 * unit,
            top: cardY + 72 * unit,
            width: cardW - 56 * unit,
            fontFamily: SANS_FONT,
            fontSize: 14.5 * unit,
            lineHeight: 1.5,
            color: BRAND.mutedForeground,
            ...enterAt(0),
          }}
        >
          {incomingSubtitle}
        </div>

        {Array.from({ length: Math.max(0, fieldCount) }, (_, i) => fieldRow(i))}

        {/* The primary action lands last, so nothing invites a click before the
            fields it submits have arrived. */}
        <div
          style={{
            position: "absolute",
            left: cardX + 28 * unit,
            top: cardY + cardH - 70 * unit,
            width: cardW - 56 * unit,
            height: 44 * unit,
            borderRadius: 12 * unit,
            backgroundColor: BRAND.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: SANS_FONT,
            fontSize: 15 * unit,
            fontWeight: 600,
            color: "hsl(160, 25%, 5%)",
            boxShadow: `0 ${8 * unit}px ${20 * unit}px ${-6 * unit}px hsla(151, 90%, 47%, 0.35)`,
            ...enterAt(fieldCount + 1),
          }}
        >
          Continue
        </div>
      </Sequence>

      {/* Hairline top edge of the card, so the swap reads inside a surface. */}
      <div
        style={{
          position: "absolute",
          left: cardX,
          top: cardY,
          width: cardW,
          height: 1 * unit,
          backgroundColor: chalk(0.07),
        }}
      />
    </AbsoluteFill>
  );
};
