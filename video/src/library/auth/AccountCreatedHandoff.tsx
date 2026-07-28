/**
 * AccountCreatedHandoff — the second half of account creation on /signup: the
 * new account named, and the three things waiting on the other side of it.
 * The celebration is one sweep of light across the name and nothing else. No
 * particles: a marketplace that throws confetti at a signup has nothing left
 * for the first completed booking.
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
  MONO_FONT,
  NOISE_TILE,
  SANS_FONT,
  STAGGER_CAP,
  chalk,
  courtGreen,
  hairline,
  interpolateSafe,
  ink,
  muted,
  useMotionFrame,
} from "./authKit";

const CANVAS_W = 1200;

export type AccountCreatedHandoffProps = {
  /** The name on the new account. */
  name: string;
  /** Which branch of the product this account lands in. */
  role: "player" | "owner";
  /** Three short lines. Four is a list; three is a promise. */
  nextSteps: string[];
  /** Mono caps above the name. */
  eyebrow: string;
  /** Run the light sweep across the name. */
  sweep: boolean;
};

export const accountCreatedHandoffDefaultProps: AccountCreatedHandoffProps = {
  name: "Anush Hovhannisyan",
  role: "player",
  nextSteps: [
    "Courts near you in Yerevan",
    "Open games looking for players",
    "Teams you can join this week",
  ],
  eyebrow: "Welcome aboard",
  sweep: true,
};

const STAGGER_FRAMES = 3;
const ENTER_FRAMES = 14;

/** The sweep crosses the name once, between these frames, and never returns. */
const SWEEP_FROM = 26;
const SWEEP_TO = 62;

export const AccountCreatedHandoff: FC<AccountCreatedHandoffProps> = ({
  name,
  role,
  nextSteps,
  eyebrow,
  sweep,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the named, listed end state.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;

  const enter = (index: number, at = 6) => {
    const delay = at + Math.min(index, STAGGER_CAP) * STAGGER_FRAMES;
    return {
      opacity: interpolateSafe(frame, [delay, delay + ENTER_FRAMES], [0, 1]),
      transform: `translateY(${interpolateSafe(
        frame,
        [delay, delay + ENTER_FRAMES],
        [16 * unit, 0],
        EASE_OUT_EXPO,
      )}px)`,
    };
  };

  const plate = spring({
    frame,
    fps,
    delay: 2,
    config: { damping: 22, mass: 0.9, stiffness: 145 },
    durationInFrames: 24,
  });

  /** 0 → 1 as the highlight travels; parked off-screen either side. */
  const sweepAt = sweep
    ? interpolateSafe(frame, [SWEEP_FROM, SWEEP_TO], [0, 1])
    : 1;

  const padX = 88 * unit;
  const plateY = height * 0.2;
  const plateH = 132 * unit;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(80% 90% at 30% 20%, ${BRAND.surface1} 0%, ${BRAND.background} 68%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(44% 42% at 26% 32%, ${courtGreen(0.09 * plate)} 0%, transparent 74%)`,
        }}
      />

      <Sequence name="Name plate" layout="none">
        <div
          style={{
            position: "absolute",
            left: padX,
            top: plateY - 34 * unit,
            fontFamily: MONO_FONT,
            fontSize: 13 * unit,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: 0.2 * 13 * unit,
            color: BRAND.primary,
            ...enter(0),
          }}
        >
          {eyebrow}
        </div>

        <div
          style={{
            position: "absolute",
            left: padX,
            right: padX,
            top: plateY,
            height: plateH,
            overflow: "hidden",
            opacity: plate,
            transform: `translateY(${(1 - plate) * 12 * unit}px)`,
          }}
        >
          <div
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 66 * unit,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -0.04 * 66 * unit,
              color: BRAND.foreground,
            }}
          >
            {name}
          </div>

          <div
            style={{
              marginTop: 12 * unit,
              display: "flex",
              alignItems: "center",
              gap: 10 * unit,
              ...enter(2),
            }}
          >
            <span
              style={{
                padding: `${5 * unit}px ${12 * unit}px`,
                borderRadius: 999,
                backgroundColor: "hsla(155, 45%, 12%, 0.9)",
                border: `${1 * unit}px solid ${courtGreen(0.32)}`,
                fontFamily: SANS_FONT,
                fontSize: 13 * unit,
                fontWeight: 600,
                color: BRAND.primary,
              }}
            >
              {role === "owner" ? "Venue owner" : "Player"}
            </span>
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 15 * unit,
                color: muted(0.85),
              }}
            >
              Account created — your feed is being built
            </span>
          </div>

          {/* The whole celebration: one narrow highlight, crossing once. */}
          {sweep ? (
            <div
              style={{
                position: "absolute",
                left: `${-30 + 140 * sweepAt}%`,
                top: 0,
                width: "26%",
                height: 84 * unit,
                background: `linear-gradient(105deg, transparent 0%, ${chalk(0.16)} 45%, ${courtGreen(0.2)} 60%, transparent 100%)`,
                pointerEvents: "none",
              }}
            />
          ) : null}
        </div>
      </Sequence>

      <Sequence name="Next" layout="none">
        <div
          style={{
            position: "absolute",
            left: padX,
            top: plateY + plateH + 34 * unit,
            width: 46 * unit,
            height: 1.5 * unit,
            backgroundColor: courtGreen(0.5),
            opacity: interpolateSafe(frame, [20, 34], [0, 1]),
          }}
        />

        {nextSteps.map((step, i) => (
          <div
            key={step}
            style={{
              position: "absolute",
              left: padX,
              right: padX,
              top: plateY + plateH + 62 * unit + i * 46 * unit,
              display: "flex",
              alignItems: "center",
              gap: 14 * unit,
              ...enter(i + 4, 22),
            }}
          >
            <div
              style={{
                width: 8 * unit,
                height: 8 * unit,
                borderRadius: 999,
                backgroundColor: BRAND.primary,
                boxShadow: `0 0 ${10 * unit}px ${courtGreen(0.5)}`,
              }}
            />
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 20 * unit,
                color: BRAND.foregroundSoft,
              }}
            >
              {step}
            </span>
          </div>
        ))}
      </Sequence>

      {/* Hairline frame edge — the same one the auth panels carry. */}
      <div
        style={{
          position: "absolute",
          left: padX,
          right: padX,
          top: plateY + plateH + 20 * unit,
          height: 1 * unit,
          backgroundColor: hairline(1),
          opacity: interpolateSafe(frame, [16, 30], [0, 1]),
        }}
      />

      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 100% at 40% 40%, transparent 46%, ${ink(0.45)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: NOISE_TILE,
          opacity: 0.04,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
