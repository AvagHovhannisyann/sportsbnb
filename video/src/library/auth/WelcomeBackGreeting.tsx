/**
 * WelcomeBackGreeting — the hand-off after a successful sign-in on /login,
 * covering the beat between `handleLoginSuccess` and the dashboard route.
 * One-way and brief. It exists to make an unavoidable wait legible, so it must
 * never add a wait of its own.
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
  NOISE_TILE,
  SANS_FONT,
  STAGGER_CAP,
  chalk,
  courtGreen,
  eyebrowStyle,
  hairline,
  interpolateSafe,
  ink,
  useMotionFrame,
} from "./authKit";

const CANVAS_W = 1200;

export type WelcomeBackGreetingProps = {
  /** First name from the profile row. */
  name: string;
  /** Initials for the avatar tile. */
  initials: string;
  /** The line under the greeting. */
  subtitle: string;
  /** Small mono caps above the greeting. */
  eyebrow: string;
  /** Where the user is being sent — "Dashboard", a venue name, a team invite. */
  destination: string;
};

export const welcomeBackGreetingDefaultProps: WelcomeBackGreetingProps = {
  name: "Anush",
  initials: "AH",
  subtitle: "Two games this week and a court held for Thursday.",
  eyebrow: "Signed in",
  destination: "Dashboard",
};

/** 50ms between siblings at 30fps, capped at the sixth. */
const STAGGER_FRAMES = 1.5;
const ENTER_FRAMES = 13;

export const WelcomeBackGreeting: FC<WelcomeBackGreetingProps> = ({
  name,
  initials,
  subtitle,
  eyebrow,
  destination,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the greeting, fully legible and still.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;

  const enter = (index: number, at = 4) => {
    const delay = at + Math.min(index, STAGGER_CAP) * STAGGER_FRAMES;
    return {
      opacity: interpolateSafe(frame, [delay, delay + ENTER_FRAMES], [0, 1]),
      transform: `translateY(${interpolateSafe(
        frame,
        [delay, delay + ENTER_FRAMES],
        [14 * unit, 0],
        EASE_OUT_EXPO,
      )}px)`,
    };
  };

  /** The avatar is the one element that scales — a face settling into frame. */
  const avatar = spring({
    frame,
    fps,
    delay: 2,
    config: { damping: 20, mass: 0.8, stiffness: 150 },
    durationInFrames: 22,
  });

  /** The ring draws once, clockwise, and stops. */
  const ringDraw = interpolateSafe(frame, [8, 34], [0, 1], EASE_OUT_EXPO);

  const avatarSize = 108 * unit;
  const left = 96 * unit;
  const centreY = height * 0.5;
  const ringR = avatarSize * 0.62;
  const ringC = 2 * Math.PI * ringR;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 90% at 18% 42%, ${BRAND.surface1} 0%, ${BRAND.background} 66%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(38% 50% at 16% 50%, ${courtGreen(0.1 * avatar)} 0%, transparent 70%)`,
        }}
      />

      <Sequence name="Avatar" layout="none">
        <svg
          width={avatarSize * 1.5}
          height={avatarSize * 1.5}
          viewBox={`0 0 ${avatarSize * 1.5} ${avatarSize * 1.5}`}
          style={{
            position: "absolute",
            left: left - avatarSize * 0.25,
            top: centreY - avatarSize * 0.75,
          }}
        >
          <circle
            cx={avatarSize * 0.75}
            cy={avatarSize * 0.75}
            r={ringR}
            fill="none"
            stroke={hairline(1)}
            strokeWidth={2 * unit}
          />
          <circle
            cx={avatarSize * 0.75}
            cy={avatarSize * 0.75}
            r={ringR}
            fill="none"
            stroke={BRAND.primary}
            strokeWidth={2.6 * unit}
            strokeLinecap="round"
            strokeDasharray={`${ringC * 0.82} ${ringC}`}
            strokeDashoffset={ringC * 0.82 * (1 - ringDraw)}
            transform={`rotate(-90 ${avatarSize * 0.75} ${avatarSize * 0.75})`}
          />
        </svg>

        <div
          style={{
            position: "absolute",
            left,
            top: centreY - avatarSize / 2,
            width: avatarSize,
            height: avatarSize,
            borderRadius: 28 * unit,
            background: `linear-gradient(155deg, ${BRAND.surface2} 0%, ${BRAND.card} 60%, ${BRAND.surface1} 100%)`,
            border: `${1 * unit}px solid ${hairline(1)}`,
            boxShadow: `inset 0 ${1 * unit}px 0 0 ${chalk(0.07)}, 0 ${16 * unit}px ${30 * unit}px ${-10 * unit}px ${ink(0.7)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: DISPLAY_FONT,
            fontSize: 38 * unit,
            fontWeight: 700,
            letterSpacing: -0.02 * 38 * unit,
            color: BRAND.foreground,
            transform: `scale(${0.9 + 0.1 * avatar})`,
            opacity: avatar,
          }}
        >
          {initials}
        </div>
      </Sequence>

      <Sequence name="Copy" layout="none">
        <div
          style={{
            position: "absolute",
            left: left + avatarSize + 48 * unit,
            top: centreY - 78 * unit,
            ...eyebrowStyle(unit * 1.2),
            ...enter(0),
          }}
        >
          {eyebrow}
        </div>

        <div
          style={{
            position: "absolute",
            left: left + avatarSize + 48 * unit,
            top: centreY - 52 * unit,
            fontFamily: DISPLAY_FONT,
            fontSize: 54 * unit,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -0.04 * 54 * unit,
            color: BRAND.foreground,
            ...enter(1),
          }}
        >
          {`Welcome back, ${name}`}
        </div>

        <div
          style={{
            position: "absolute",
            left: left + avatarSize + 48 * unit,
            right: 96 * unit,
            top: centreY + 18 * unit,
            fontFamily: SANS_FONT,
            fontSize: 20 * unit,
            lineHeight: 1.5,
            color: BRAND.foregroundSoft,
            ...enter(2),
          }}
        >
          {subtitle}
        </div>

        {/* The hand-off line. It says where, so the wait has a shape. */}
        <div
          style={{
            position: "absolute",
            left: left + avatarSize + 48 * unit,
            top: centreY + 74 * unit,
            display: "flex",
            alignItems: "center",
            gap: 10 * unit,
            ...enter(3),
          }}
        >
          <div
            style={{
              width: 60 * unit,
              height: 2 * unit,
              borderRadius: 999,
              backgroundColor: hairline(1),
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${100 * interpolateSafe(frame, [16, 70], [0, 1])}%`,
                backgroundColor: BRAND.primary,
              }}
            />
          </div>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 14 * unit,
              color: BRAND.mutedForeground,
            }}
          >
            {`Taking you to ${destination}`}
          </span>
        </div>
      </Sequence>

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
