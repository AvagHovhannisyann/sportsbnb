/**
 * SessionExpiredLocked — the two states a live session can fail into: expired,
 * where the token simply ran out, and locked, where too many attempts tripped
 * the rate limit. Shown over the app shell before the redirect to /login.
 * One-way. Both readings are deliberately calm — neither is the user's fault in
 * a way shouting would help.
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
  SANS_FONT,
  TAU,
  amber,
  cardSurface,
  courtGreen,
  hairline,
  interpolateSafe,
  ink,
  muted,
  useMotionFrame,
} from "./authKit";

const CANVAS_W = 960;

export type SessionExpiredLockedProps = {
  /** Which failure to draw. */
  state: "expired" | "locked";
  /** Heading. */
  title: string;
  /** One or two lines of explanation. */
  body: string;
  /** Countdown or timestamp under the body. Empty string hides the row. */
  detail: string;
  /** Label on the single action. */
  ctaLabel: string;
};

export const sessionExpiredLockedDefaultProps: SessionExpiredLockedProps = {
  state: "expired",
  title: "Your session expired",
  body: "You were signed out after a spell of inactivity. Nothing was lost — your booking is still held.",
  detail: "Last active 30 minutes ago",
  ctaLabel: "Sign in again",
};

export const SessionExpiredLocked: FC<SessionExpiredLockedProps> = ({
  state,
  title,
  body,
  detail,
  ctaLabel,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the explained, settled state.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const locked = state === "locked";
  const tone = locked ? amber : courtGreen;

  const badge = spring({
    frame,
    fps,
    delay: 2,
    config: { damping: 22, mass: 0.85, stiffness: 145 },
    durationInFrames: 22,
  });

  /**
   * Expired: the clock hand completes its last sweep and stops dead — the
   * session running out, drawn literally.
   * Locked: the shackle closes once and does not reopen.
   */
  const mechanism = interpolateSafe(frame, [10, 42], [0, 1], EASE_OUT_EXPO);

  const enter = (index: number, at = 12) => {
    const delay = at + index * 3;
    return {
      opacity: interpolateSafe(frame, [delay, delay + 13], [0, 1]),
      transform: `translateY(${interpolateSafe(
        frame,
        [delay, delay + 13],
        [12 * unit, 0],
        EASE_OUT_EXPO,
      )}px)`,
    };
  };

  const cardX = 64 * unit;
  const cardW = width - cardX * 2;
  const cardY = height * 0.16;
  const cardH = height * 0.68;
  const badgeSize = 92 * unit;
  const badgeX = cardX + 44 * unit;
  const badgeY = cardY + 44 * unit;

  const handAngle = -90 + 360 * mechanism;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 100% at 50% 10%, ${BRAND.surface1} 0%, ${BRAND.background} 72%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 50% at 22% 30%, ${tone(0.08 * badge)} 0%, transparent 72%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: cardX,
          top: cardY,
          width: cardW,
          height: cardH,
          ...cardSurface(unit, 24),
        }}
      />

      <Sequence name="Badge" layout="none">
        <div
          style={{
            position: "absolute",
            left: badgeX,
            top: badgeY,
            width: badgeSize,
            height: badgeSize,
            borderRadius: 24 * unit,
            backgroundColor: locked ? "hsla(42, 95%, 55%, 0.1)" : "hsla(151, 90%, 47%, 0.09)",
            border: `${1.4 * unit}px solid ${tone(0.3)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${0.9 + 0.1 * badge})`,
            opacity: badge,
          }}
        >
          {locked ? (
            <svg width={badgeSize * 0.52} height={badgeSize * 0.52} viewBox="0 0 24 24" fill="none">
              <rect
                x={4.4}
                y={10.6}
                width={15.2}
                height={9.8}
                rx={2.6}
                stroke={BRAND.warning}
                strokeWidth={1.7}
              />
              {/* The shackle drops closed once. */}
              <path
                d="M8 10.6 V7.9 a4 4 0 0 1 8 0 V10.6"
                stroke={BRAND.warning}
                strokeWidth={1.7}
                strokeLinecap="round"
                transform={`translate(0 ${-2.6 * (1 - mechanism)})`}
              />
              <circle
                cx={12}
                cy={15.4}
                r={1.5}
                fill={BRAND.warning}
                opacity={mechanism}
              />
            </svg>
          ) : (
            <svg width={badgeSize * 0.52} height={badgeSize * 0.52} viewBox="0 0 24 24" fill="none">
              <circle cx={12} cy={12} r={9} stroke={courtGreen(0.75)} strokeWidth={1.7} />
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i / 12) * TAU;
                return (
                  <line
                    key={i}
                    x1={12 + Math.cos(a) * 7.4}
                    y1={12 + Math.sin(a) * 7.4}
                    x2={12 + Math.cos(a) * 8.4}
                    y2={12 + Math.sin(a) * 8.4}
                    stroke={courtGreen(0.35)}
                    strokeWidth={0.9}
                  />
                );
              })}
              {/* The hand finishes one turn and stops. */}
              <line
                x1={12}
                y1={12}
                x2={12 + Math.cos((handAngle * Math.PI) / 180) * 5.6}
                y2={12 + Math.sin((handAngle * Math.PI) / 180) * 5.6}
                stroke={BRAND.primary}
                strokeWidth={1.9}
                strokeLinecap="round"
              />
              <circle cx={12} cy={12} r={1.3} fill={BRAND.primary} />
            </svg>
          )}
        </div>
      </Sequence>

      <Sequence name="Copy" layout="none">
        <div
          style={{
            position: "absolute",
            left: badgeX + badgeSize + 32 * unit,
            top: badgeY + 2 * unit,
            fontFamily: MONO_FONT,
            fontSize: 11.5 * unit,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: 0.2 * 11.5 * unit,
            color: locked ? BRAND.warning : BRAND.primary,
            ...enter(0),
          }}
        >
          {locked ? "Account locked" : "Session ended"}
        </div>

        <div
          style={{
            position: "absolute",
            left: badgeX + badgeSize + 32 * unit,
            right: cardX + 44 * unit,
            top: badgeY + 26 * unit,
            fontFamily: DISPLAY_FONT,
            fontSize: 34 * unit,
            fontWeight: 700,
            letterSpacing: -0.03 * 34 * unit,
            color: BRAND.foreground,
            ...enter(1),
          }}
        >
          {title}
        </div>

        <div
          style={{
            position: "absolute",
            left: badgeX + badgeSize + 32 * unit,
            right: cardX + 44 * unit,
            top: badgeY + 76 * unit,
            fontFamily: SANS_FONT,
            fontSize: 16.5 * unit,
            lineHeight: 1.55,
            color: BRAND.foregroundSoft,
            ...enter(2),
          }}
        >
          {body}
        </div>

        {detail ? (
          <div
            style={{
              position: "absolute",
              left: badgeX,
              top: cardY + cardH - 96 * unit,
              display: "flex",
              alignItems: "center",
              gap: 9 * unit,
              ...enter(3),
            }}
          >
            <div
              style={{
                width: 6 * unit,
                height: 6 * unit,
                borderRadius: 999,
                backgroundColor: locked ? BRAND.warning : muted(0.7),
              }}
            />
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 13 * unit,
                fontVariantNumeric: "tabular-nums",
                color: muted(0.85),
              }}
            >
              {detail}
            </span>
          </div>
        ) : null}

        <div
          style={{
            position: "absolute",
            right: cardX + 44 * unit,
            top: cardY + cardH - 106 * unit,
            height: 50 * unit,
            paddingLeft: 30 * unit,
            paddingRight: 30 * unit,
            borderRadius: 13 * unit,
            backgroundColor: locked ? "transparent" : BRAND.primary,
            border: locked ? `${1.5 * unit}px solid ${BRAND.borderInteractive}` : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: SANS_FONT,
            fontSize: 16 * unit,
            fontWeight: 600,
            color: locked ? BRAND.foreground : "hsl(160, 25%, 5%)",
            boxShadow: locked
              ? "none"
              : `0 ${10 * unit}px ${24 * unit}px ${-8 * unit}px ${courtGreen(0.4)}`,
            ...enter(4),
          }}
        >
          {ctaLabel}
        </div>
      </Sequence>

      {/* Divider above the action row. */}
      <div
        style={{
          position: "absolute",
          left: cardX + 44 * unit,
          right: cardX + 44 * unit,
          top: cardY + cardH - 130 * unit,
          height: 1 * unit,
          backgroundColor: hairline(1),
          opacity: interpolateSafe(frame, [24, 40], [0, 1]),
        }}
      />

      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 100% at 50% 40%, transparent 46%, ${ink(0.4)} 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
