/**
 * AccountCreatedCheck — the confirmation after `signUp` succeeds on /signup,
 * shown in the moment before the redirect into onboarding.
 * Deliberately restrained: one ring, one tick, two lines. This is a marketplace
 * confirming an account, not a game handing out a trophy — the user's next
 * action is four onboarding questions, and nothing here should delay it.
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
  TAU,
  chalk,
  courtGreen,
  hairline,
  interpolateSafe,
  ink,
  muted,
  useMotionFrame,
} from "./authKit";

const CANVAS = 1080;

export type AccountCreatedCheckProps = {
  /** Headline. */
  headline: string;
  /** The line under it — usually the email the confirmation went to. */
  subline: string;
  /** Mono caps chip under the copy. Empty string hides it. */
  badge: string;
  /** Diameter of the ring in design px. */
  ringSize: number;
};

export const accountCreatedCheckDefaultProps: AccountCreatedCheckProps = {
  headline: "Account created",
  subline: "We sent a confirmation to anush@example.am",
  badge: "Next: four quick questions",
  ringSize: 260,
};

/** The tick, in the ring's own 24-unit space. */
const TICK_PATH = "M7 12.4 L10.6 16 L17.4 8.4";
const TICK_LEN = 18.5;

export const AccountCreatedCheck: FC<AccountCreatedCheckProps> = ({
  headline,
  subline,
  badge,
  ringSize,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the confirmed state.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = Math.min(width, height) / CANVAS;

  /** The ring draws once, clockwise from twelve. Not a spin, not a bounce. */
  const ring = interpolateSafe(frame, [4, 34], [0, 1], EASE_OUT_EXPO);
  /** The tick follows the ring rather than racing it. */
  const tick = interpolateSafe(frame, [26, 44], [0, 1], EASE_OUT_EXPO);

  /**
   * The single overshoot in the file, and the only one the family allows for a
   * celebration: the badge settling, at 0.36s — the same `--ease-spring` beat
   * the magic-link confirmation uses on /login.
   */
  const settle = spring({
    frame,
    fps,
    delay: 30,
    config: { damping: 15, mass: 0.7, stiffness: 165 },
    durationInFrames: 20,
  });

  const cx = width / 2;
  const cy = height * 0.4;
  const r = (ringSize / 2) * unit;
  const circumference = TAU * r;
  const stroke = 8 * unit;

  const copy = (index: number, at = 40) => {
    const delay = at + index * 4;
    return {
      opacity: interpolateSafe(frame, [delay, delay + 14], [0, 1]),
      transform: `translateY(${interpolateSafe(
        frame,
        [delay, delay + 14],
        [16 * unit, 0],
        EASE_OUT_EXPO,
      )}px)`,
    };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(72% 62% at 50% 38%, ${BRAND.surface1} 0%, ${BRAND.background} 70%)`,
        }}
      />
      {/* A single, slow bloom. It arrives with the tick and does not pulse. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(38% 34% at 50% 40%, ${courtGreen(0.13 * tick)} 0%, transparent 72%)`,
        }}
      />

      <Sequence name="Ring" layout="none">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={courtGreen(0.05 * tick)}
            stroke={hairline(1)}
            strokeWidth={stroke * 0.4}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={BRAND.primary}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - ring)}
            transform={`rotate(-90 ${cx} ${cy})`}
          />

          <g transform={`translate(${cx - r} ${cy - r}) scale(${(r * 2) / 24})`}>
            <path
              d={TICK_PATH}
              fill="none"
              stroke={BRAND.primary}
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={TICK_LEN}
              strokeDashoffset={TICK_LEN * (1 - tick)}
            />
          </g>
        </svg>
      </Sequence>

      <Sequence name="Copy" layout="none">
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: cy + r + 62 * unit,
            textAlign: "center",
            fontFamily: DISPLAY_FONT,
            fontSize: 62 * unit,
            fontWeight: 700,
            letterSpacing: -0.04 * 62 * unit,
            color: BRAND.foreground,
            ...copy(0),
          }}
        >
          {headline}
        </div>

        <div
          style={{
            position: "absolute",
            left: width * 0.14,
            right: width * 0.14,
            top: cy + r + 138 * unit,
            textAlign: "center",
            fontFamily: SANS_FONT,
            fontSize: 22 * unit,
            lineHeight: 1.5,
            color: BRAND.foregroundSoft,
            ...copy(1),
          }}
        >
          {subline}
        </div>

        {badge ? (
          <div
            style={{
              position: "absolute",
              left: cx,
              top: cy + r + 202 * unit,
              transform: `translateX(-50%) scale(${0.94 + 0.06 * settle})`,
              opacity: settle,
              display: "flex",
              alignItems: "center",
              gap: 9 * unit,
              padding: `${9 * unit}px ${18 * unit}px`,
              borderRadius: 999,
              backgroundColor: BRAND.popover,
              border: `${1 * unit}px solid ${courtGreen(0.3)}`,
            }}
          >
            <div
              style={{
                width: 7 * unit,
                height: 7 * unit,
                borderRadius: 999,
                backgroundColor: BRAND.primary,
              }}
            />
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 14 * unit,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: 0.16 * 14 * unit,
                color: muted(0.95),
              }}
            >
              {badge}
            </span>
          </div>
        ) : null}
      </Sequence>

      <AbsoluteFill
        style={{
          background: `radial-gradient(110% 90% at 50% 42%, transparent 40%, ${ink(0.5)} 100%)`,
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
      <AbsoluteFill
        style={{
          boxShadow: `inset 0 ${1 * unit}px 0 0 ${chalk(0.04)}`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
