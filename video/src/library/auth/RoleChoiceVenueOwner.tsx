/**
 * RoleChoiceVenueOwner — the "I want to → List Venues" tile being chosen on
 * /signup, the branch that sends the user to /onboarding/owner and the owner
 * dashboard instead of the player one.
 * Same grammar as RoleChoicePlayer, mirrored: the owner tile is on the right,
 * so the selection travels the other way and the floodlight motif replaces the
 * player one.
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

export type RoleChoiceVenueOwnerProps = {
  /** Group label. The app says "I want to". */
  groupLabel: string;
  /** Label on the tile being chosen — the owner branch. */
  chosenLabel: string;
  /** Label on the tile not chosen. */
  otherLabel: string;
  /** What choosing this actually changes, in one line. */
  footnote: string;
  /** Small badge over the chosen tile, e.g. the destination dashboard. */
  badge: string;
};

export const roleChoiceVenueOwnerDefaultProps: RoleChoiceVenueOwnerProps = {
  groupLabel: "I want to",
  chosenLabel: "List Venues",
  otherLabel: "Play Sports",
  footnote: "We'll ask for your venue details next — it takes about a minute.",
  badge: "Owner dashboard",
};

const PRESS_AT = 6;

export const RoleChoiceVenueOwner: FC<RoleChoiceVenueOwnerProps> = ({
  groupLabel,
  chosenLabel,
  otherLabel,
  footnote,
  badge,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the chosen state.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;

  const select = spring({
    frame,
    fps,
    delay: PRESS_AT,
    config: { damping: 24, mass: 0.75, stiffness: 165 },
    durationInFrames: 18,
  });

  const press = interpolateSafe(
    frame,
    [PRESS_AT - 3, PRESS_AT, PRESS_AT + 4],
    [0, 1, 0],
  );

  /** The floodlight over the listed venue warms up as the choice lands. */
  const lightUp = interpolateSafe(frame, [PRESS_AT + 4, PRESS_AT + 22], [0, 1]);

  const gap = 14 * unit;
  const padX = 48 * unit;
  const tileW = (width - padX * 2 - gap) / 2;
  const tileH = 148 * unit;
  const tileY = height * 0.28;
  const chosenX = padX + tileW + gap;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(100% 110% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 76%)`,
        }}
      />
      {/* The chosen side of the frame warms very slightly. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(46% 60% at 76% 46%, ${courtGreen(0.08 * lightUp)} 0%, transparent 72%)`,
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

      <Sequence name="Alternative" layout="none">
        <div
          style={{
            position: "absolute",
            left: padX,
            top: tileY,
            width: tileW,
            height: tileH,
            borderRadius: 16 * unit,
            backgroundColor: BRAND.surface1,
            border: `${1.8 * unit}px solid ${hairline(1)}`,
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
              fontWeight: 500,
              color: muted(0.85),
            }}
          >
            {otherLabel}
          </span>
        </div>
      </Sequence>

      <Sequence name="Chosen" layout="none">
        <div
          style={{
            position: "absolute",
            left: chosenX,
            top: tileY,
            width: tileW,
            height: tileH,
            borderRadius: 16 * unit,
            backgroundColor: `hsla(155, 45%, 12%, ${0.35 + 0.65 * select})`,
            border: `${1.8 * unit}px solid ${courtGreen(0.2 + 0.45 * select)}`,
            boxShadow: `0 ${14 * unit}px ${28 * unit}px ${-10 * unit}px ${ink(0.6 * select)}`,
            transform: `translateY(${-3 * unit * select + 2 * unit * press}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* A venue with its floodlight coming on. */}
          <svg
            width={34 * unit}
            height={34 * unit}
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: 12 * unit }}
          >
            <polygon
              points="18.4,3.4 13.6,11.2 23.2,11.2"
              fill={courtGreen(0.16 * lightUp)}
              stroke="none"
            />
            <g stroke={`hsla(151, 90%, 47%, ${0.3 + 0.7 * select})`} fill="none">
              <path d="M3 20.5 V7.8 L11 4.6 L11 20.5" />
              <path d="M3 20.5 H21.5" />
              <rect x={5.4} y={10.4} width={2.6} height={2.8} />
              <rect x={5.4} y={15} width={2.6} height={2.8} />
              <path d="M18.4 6.2 V11.2" />
              <circle cx={18.4} cy={4.4} r={1.5} />
            </g>
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

        {/* Destination badge — the branch this choice commits to. */}
        <div
          style={{
            position: "absolute",
            left: chosenX + tileW / 2,
            top: tileY - 16 * unit,
            transform: `translateX(-50%) translateY(${interpolateSafe(
              frame,
              [PRESS_AT + 8, PRESS_AT + 20],
              [6 * unit, 0],
              EASE_OUT_EXPO,
            )}px)`,
            padding: `${5 * unit}px ${11 * unit}px`,
            borderRadius: 999,
            backgroundColor: BRAND.popover,
            border: `${1 * unit}px solid ${courtGreen(0.32)}`,
            fontFamily: SANS_FONT,
            fontSize: 11.5 * unit,
            fontWeight: 600,
            color: BRAND.primary,
            opacity: interpolateSafe(frame, [PRESS_AT + 8, PRESS_AT + 20], [0, 1]),
          }}
        >
          {badge}
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
          opacity: interpolateSafe(frame, [PRESS_AT + 12, PRESS_AT + 26], [0, 1]),
        }}
      >
        {footnote}
      </div>
    </AbsoluteFill>
  );
};
