/**
 * OnboardingChecklistItemComplete — one row of the setup checklist being ticked
 * off, on the player and owner dashboards.
 * The smallest piece in the family and deliberately the quietest: a single row
 * answering a single action, two seconds end to end.
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
  hairline,
  interpolateSafe,
  muted,
  useMotionFrame,
} from "./authKit";

const CANVAS_W = 720;

export type OnboardingChecklistItemCompleteProps = {
  /** The task that has just been done. */
  label: string;
  /** Right-hand hint before completion — usually what it costs. */
  metaBefore: string;
  /** Right-hand hint after — usually "Done". */
  metaAfter: string;
  /** Wipe a rule through the label as it completes. */
  strikeThrough: boolean;
};

export const onboardingChecklistItemCompleteDefaultProps: OnboardingChecklistItemCompleteProps =
  {
    label: "Add a profile photo",
    metaBefore: "30 seconds",
    metaAfter: "Done",
    strikeThrough: true,
  };

const TICK_PATH = "M4.5 9.6 L8 13.1 L15.6 5.5";
const TICK_LEN = 17.5;
const COMPLETE_AT = 5;

export const OnboardingChecklistItemComplete: FC<
  OnboardingChecklistItemCompleteProps
> = ({ label, metaBefore, metaAfter, strikeThrough }) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the completed row.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;

  /** The box fills. One overshoot, small, and nothing else in the row moves. */
  const fill = spring({
    frame,
    fps,
    delay: COMPLETE_AT,
    config: { damping: 13, mass: 0.6, stiffness: 185 },
    durationInFrames: 16,
  });
  const draw = interpolateSafe(
    frame,
    [COMPLETE_AT + 3, COMPLETE_AT + 14],
    [0, 1],
    EASE_OUT_EXPO,
  );
  /** The rule wipes left to right, at the speed of reading, then stops. */
  const strike = strikeThrough
    ? interpolateSafe(frame, [COMPLETE_AT + 5, COMPLETE_AT + 20], [0, 1], EASE_OUT_EXPO)
    : 0;

  const metaSwap = interpolateSafe(
    frame,
    [COMPLETE_AT + 8, COMPLETE_AT + 18],
    [0, 1],
  );

  const padX = 40 * unit;
  const rowY = height / 2;
  const box = 28 * unit;
  const labelX = padX + box + 16 * unit;
  const labelSize = 16 * unit;
  // 0.52em per character is a close enough advance width for a system sans at
  // this weight; the rule only has to reach the end of the word, not the pixel.
  const labelW = label.length * labelSize * 0.52;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${BRAND.surface1} 0%, ${BRAND.background} 100%)`,
        }}
      />

      {/* Row highlight — appears with the tick and drains away again. */}
      <div
        style={{
          position: "absolute",
          left: padX - 14 * unit,
          right: padX - 14 * unit,
          top: rowY - 28 * unit,
          height: 56 * unit,
          borderRadius: 12 * unit,
          backgroundColor: courtGreen(
            0.07 * interpolateSafe(frame, [COMPLETE_AT, COMPLETE_AT + 8, 42, 56], [0, 1, 1, 0]),
          ),
        }}
      />

      <Sequence name="Row" layout="none">
        <div
          style={{
            position: "absolute",
            left: padX,
            top: rowY - box / 2,
            width: box,
            height: box,
            borderRadius: 8 * unit,
            backgroundColor: courtGreen(0.16 * fill),
            border: `${1.5 * unit}px solid ${
              fill > 0 ? courtGreen(0.2 + 0.4 * Math.min(1, fill)) : hairline(1)
            }`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${1 + 0.32 * fill * (1 - fill)})`,
          }}
        >
          <svg width={box * 0.66} height={box * 0.66} viewBox="0 0 20 20" fill="none">
            <path
              d={TICK_PATH}
              stroke={BRAND.primary}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={TICK_LEN}
              strokeDashoffset={TICK_LEN * (1 - draw)}
            />
          </svg>
        </div>

        <span
          style={{
            position: "absolute",
            left: labelX,
            top: rowY - labelSize * 0.72,
            fontFamily: SANS_FONT,
            fontSize: labelSize,
            color: `hsla(100, 20%, 96%, ${1 - 0.35 * strike})`,
          }}
        >
          {label}
        </span>

        {strikeThrough ? (
          <div
            style={{
              position: "absolute",
              left: labelX,
              top: rowY,
              width: labelW * strike,
              height: 1.4 * unit,
              borderRadius: 999,
              backgroundColor: courtGreen(0.6),
            }}
          />
        ) : null}

        {/* One slot, two labels — the row must not reflow as it resolves. */}
        <div
          style={{
            position: "absolute",
            right: padX,
            top: rowY - 9 * unit,
            height: 18 * unit,
            width: 140 * unit,
            textAlign: "right",
          }}
        >
          <span
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              fontFamily: SANS_FONT,
              fontSize: 13 * unit,
              color: muted(0.75),
              opacity: 1 - metaSwap,
            }}
          >
            {metaBefore}
          </span>
          <span
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              fontFamily: SANS_FONT,
              fontSize: 13 * unit,
              fontWeight: 600,
              color: BRAND.primary,
              opacity: metaSwap,
            }}
          >
            {metaAfter}
          </span>
        </div>
      </Sequence>

      {/* The divider the row sits on, so it reads as part of a list. */}
      <div
        style={{
          position: "absolute",
          left: padX - 14 * unit,
          right: padX - 14 * unit,
          top: rowY + 30 * unit,
          height: 1 * unit,
          backgroundColor: hairline(0.8),
        }}
      />
    </AbsoluteFill>
  );
};
