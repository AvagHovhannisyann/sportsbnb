/**
 * RoleChoicePlayer — the "I want to → Play Sports" tile being chosen in the
 * two-up RadioGroup on /signup.
 * One-way. The chosen tile takes the primary colour and the focus ring the app
 * paints on `peer-focus-visible`; the alternative only dims, because a choice
 * that punishes the option you did not take is a choice that reads as a warning.
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
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  SANS_FONT,
  courtGreen,
  hairline,
  interpolateSafe,
  ink,
  muted,
  useMotionFrame,
} from "./authKit";

const CANVAS_W = 720;

export type RoleChoicePlayerProps = {
  /** Group label. The app says "I want to". */
  groupLabel: string;
  /** Label on the tile being chosen. */
  chosenLabel: string;
  /** Label on the tile not chosen. */
  otherLabel: string;
  /** One line under the grid explaining what the choice changes. */
  footnote: string;
  /** Show the focus ring the keyboard path produces. */
  showFocusRing: boolean;
};

export const roleChoicePlayerDefaultProps: RoleChoicePlayerProps = {
  groupLabel: "I want to",
  chosenLabel: "Play Sports",
  otherLabel: "List Venues",
  footnote: "You can list a venue later from your profile.",
  showFocusRing: true,
};

/** The press lands, then the state settles, then the footnote explains. */
const PRESS_AT = 6;

export const RoleChoicePlayer: FC<RoleChoicePlayerProps> = ({
  groupLabel,
  chosenLabel,
  otherLabel,
  footnote,
  showFocusRing,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the chosen state.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;

  /** Selection settling. Damped hard: this is a control, not a confirmation. */
  const select = spring({
    frame,
    fps,
    delay: PRESS_AT,
    config: { damping: 24, mass: 0.75, stiffness: 165 },
    durationInFrames: 18,
  });

  /** The 2px press the app's `active:scale-[0.99]` produces, then release. */
  const press = interpolateSafe(
    frame,
    [PRESS_AT - 3, PRESS_AT, PRESS_AT + 4],
    [0, 1, 0],
  );

  const ring = showFocusRing
    ? interpolateSafe(frame, [PRESS_AT + 2, PRESS_AT + 12, 60, 70], [0, 1, 1, 0])
    : 0;

  const gap = 14 * unit;
  const padX = 48 * unit;
  const tileW = (width - padX * 2 - gap) / 2;
  const tileH = 148 * unit;
  const tileY = height * 0.28;

  const iconColour = (on: number) =>
    `hsla(151, 90%, 47%, ${0.3 + 0.7 * on})`;

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
          top: tileY - 30 * unit,
          fontFamily: SANS_FONT,
          fontSize: 14 * unit,
          fontWeight: 500,
          color: BRAND.foreground,
          opacity: interpolateSafe(frame, [0, 10], [0, 1]),
        }}
      >
        {groupLabel}
      </div>

      <Sequence name="Chosen" layout="none">
        <div
          style={{
            position: "absolute",
            left: padX,
            top: tileY,
            width: tileW,
            height: tileH,
            borderRadius: 16 * unit,
            backgroundColor: `hsla(155, 45%, 12%, ${0.35 + 0.65 * select})`,
            border: `${1.8 * unit}px solid ${courtGreen(0.2 + 0.45 * select)}`,
            boxShadow: `0 0 0 ${4 * unit * ring}px ${courtGreen(0.16 * ring)}, 0 ${14 * unit}px ${28 * unit}px ${-10 * unit}px ${ink(0.6 * select)}`,
            // Lift on select, minus the press. Translate, never scale — scale
            // resamples the label and softens it for the length of the move.
            transform: `translateY(${-3 * unit * select + 2 * unit * press}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Player: a figure mid-stride beside a ball. */}
          <svg
            width={34 * unit}
            height={34 * unit}
            viewBox="0 0 24 24"
            fill="none"
            stroke={iconColour(select)}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: 12 * unit }}
          >
            <circle cx={13.4} cy={4.6} r={2.1} />
            <path d="M13.6 7.4 L10.6 11.4 L13.2 13.8 L12.4 19.4" />
            <path d="M10.6 11.4 L7.2 12.6" />
            <path d="M13.2 13.8 L16.8 15.2 L18.2 19.4" />
            <circle cx={5.4} cy={17.6} r={2.6} />
          </svg>

          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 15 * unit,
              fontWeight: 600,
              color: `hsla(100, 20%, 96%, ${0.75 + 0.25 * select})`,
            }}
          >
            {chosenLabel}
          </span>

          {/* The radio dot, drawn rather than popped. */}
          <div
            style={{
              position: "absolute",
              top: 14 * unit,
              right: 14 * unit,
              width: 18 * unit,
              height: 18 * unit,
              borderRadius: 999,
              border: `${1.6 * unit}px solid ${courtGreen(0.35 + 0.4 * select)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 9 * unit * select,
                height: 9 * unit * select,
                borderRadius: 999,
                backgroundColor: BRAND.primary,
              }}
            />
          </div>
        </div>
      </Sequence>

      <Sequence name="Alternative" layout="none">
        <div
          style={{
            position: "absolute",
            left: padX + tileW + gap,
            top: tileY,
            width: tileW,
            height: tileH,
            borderRadius: 16 * unit,
            backgroundColor: BRAND.surface1,
            border: `${1.8 * unit}px solid ${hairline(1)}`,
            // Dims, does not shrink or grey out: it stays a live option.
            opacity: 1 - 0.3 * select,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width={34 * unit}
            height={34 * unit}
            viewBox="0 0 24 24"
            fill="none"
            stroke={muted(0.75)}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: 12 * unit }}
          >
            <path d="M4 20.5 V6.5 L12 3.5 L20 6.5 V20.5" />
            <path d="M4 20.5 H20" />
            <rect x={8} y={12} width={3.4} height={3.4} />
            <rect x={12.8} y={12} width={3.4} height={3.4} />
          </svg>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 15 * unit,
              fontWeight: 500,
              color: muted(0.85),
            }}
          >
            {otherLabel}
          </span>
        </div>
      </Sequence>

      <div
        style={{
          position: "absolute",
          left: padX,
          right: padX,
          top: tileY + tileH + 22 * unit,
          fontFamily: DISPLAY_FONT,
          fontSize: 13.5 * unit,
          color: BRAND.mutedForeground,
          opacity: interpolateSafe(frame, [PRESS_AT + 10, PRESS_AT + 24], [0, 1]),
          transform: `translateY(${interpolateSafe(
            frame,
            [PRESS_AT + 10, PRESS_AT + 24],
            [6 * unit, 0],
            EASE_OUT_EXPO,
          )}px)`,
        }}
      >
        {footnote}
      </div>
    </AbsoluteFill>
  );
};
