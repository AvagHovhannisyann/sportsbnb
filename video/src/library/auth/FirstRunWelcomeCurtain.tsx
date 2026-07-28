/**
 * FirstRunWelcomeCurtain — the full-bleed welcome shown once, immediately after
 * a first sign-in, before /onboarding/player or /onboarding/owner takes over.
 * One-way and self-dismissing: the last third is the curtain getting out of the
 * way, because a first-run screen that outstays its welcome is a tax.
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
  EASE_IN,
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

const CANVAS_W = 1920;

export type FirstRunWelcomeCurtainProps = {
  /** Mono caps above the headline. */
  eyebrow: string;
  /** The headline. Two short lines beat one long one at this size. */
  headline: string;
  /** Supporting line. */
  subline: string;
  /** Label on the single action. */
  ctaLabel: string;
  /** Fade the whole curtain out over its final frames. */
  selfDismiss: boolean;
};

export const firstRunWelcomeCurtainDefaultProps: FirstRunWelcomeCurtainProps = {
  eyebrow: "Account ready",
  headline: "Welcome to Sportsbnb",
  subline:
    "Four short questions and your feed knows which courts, which sports and which nights.",
  ctaLabel: "Set up my profile",
  selfDismiss: true,
};

const STAGGER_FRAMES = 1.5;
const ENTER_FRAMES = 14;

export const FirstRunWelcomeCurtain: FC<FirstRunWelcomeCurtainProps> = ({
  eyebrow,
  headline,
  subline,
  ctaLabel,
  selfDismiss,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  /**
   * One-way, but it settles on the frame *before* the dismissal starts rather
   * than on the last one — a reduced-motion viewer should be left looking at
   * the welcome, not at the empty frame it fades to.
   */
  const settleAt = selfDismiss
    ? Math.max(0, durationInFrames - 30)
    : durationInFrames - 1;
  const frame = useMotionFrame(rawFrame, settleAt);

  const unit = width / CANVAS_W;

  const enter = (index: number, at = 8) => {
    const delay = at + Math.min(index, STAGGER_CAP) * STAGGER_FRAMES;
    return {
      opacity: interpolateSafe(frame, [delay, delay + ENTER_FRAMES], [0, 1]),
      transform: `translateY(${interpolateSafe(
        frame,
        [delay, delay + ENTER_FRAMES],
        [18 * unit, 0],
        EASE_OUT_EXPO,
      )}px)`,
    };
  };

  const mark = spring({
    frame,
    fps,
    delay: 2,
    config: { damping: 21, mass: 0.9, stiffness: 140 },
    durationInFrames: 26,
  });

  /** The underline wipes left to right under the headline, once. */
  const rule = interpolateSafe(frame, [22, 52], [0, 1], EASE_OUT_EXPO);

  const dismiss = selfDismiss
    ? interpolateSafe(
        frame,
        [durationInFrames - 24, durationInFrames - 1],
        [1, 0],
        EASE_IN,
      )
    : 1;

  const cx = width / 2;
  const markSize = 132 * unit;
  const markTop = height * 0.24;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background, opacity: dismiss }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 70% at 50% 34%, ${BRAND.surface1} 0%, ${BRAND.background} 68%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 40% at 50% 30%, ${courtGreen(0.12 * mark)} 0%, transparent 70%)`,
        }}
      />

      <Sequence name="Mark" layout="none">
        <div
          style={{
            position: "absolute",
            left: cx - markSize / 2,
            top: markTop,
            width: markSize,
            height: markSize,
            borderRadius: 34 * unit,
            background: `linear-gradient(155deg, ${BRAND.surface2} 0%, ${BRAND.card} 55%, ${BRAND.surface1} 100%)`,
            border: `${1 * unit}px solid ${hairline(1)}`,
            boxShadow: `inset 0 ${1 * unit}px 0 0 ${chalk(0.07)}, 0 ${20 * unit}px ${44 * unit}px ${-12 * unit}px ${ink(0.7)}, 0 0 ${52 * unit}px ${-8 * unit}px ${courtGreen(0.3 * mark)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${0.88 + 0.12 * mark})`,
            opacity: mark,
          }}
        >
          {/* The pitch pictogram, same 80×56 viewBox as the brand loader. */}
          <svg
            width={markSize * 0.62}
            height={markSize * 0.434}
            viewBox="0 0 80 56"
            fill="none"
          >
            <rect
              x={1.2}
              y={1.2}
              width={77.6}
              height={53.6}
              rx={6}
              stroke={courtGreen(0.9)}
              strokeWidth={1.8}
            />
            <line x1={40} y1={1.2} x2={40} y2={54.8} stroke={courtGreen(0.55)} strokeWidth={1.4} />
            <circle cx={40} cy={28} r={8.5} stroke={courtGreen(0.75)} strokeWidth={1.4} />
            <circle cx={40} cy={28} r={1.6 + 1.2 * mark} fill={BRAND.primary} />
          </svg>
        </div>
      </Sequence>

      <Sequence name="Copy" layout="none">
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: markTop + markSize + 44 * unit,
            textAlign: "center",
            ...enter(0),
          }}
        >
          <span style={eyebrowStyle(unit * 1.5)}>{eyebrow}</span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: markTop + markSize + 78 * unit,
            textAlign: "center",
            fontFamily: DISPLAY_FONT,
            fontSize: 78 * unit,
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: -0.04 * 78 * unit,
            color: BRAND.foreground,
            ...enter(1),
          }}
        >
          {headline}
        </div>

        {/* Hairline rule, wiped rather than faded. */}
        <div
          style={{
            position: "absolute",
            left: cx - 120 * unit * rule,
            top: markTop + markSize + 176 * unit,
            width: 240 * unit * rule,
            height: 1.5 * unit,
            background: `linear-gradient(90deg, transparent 0%, ${courtGreen(0.65)} 50%, transparent 100%)`,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: width * 0.26,
            right: width * 0.26,
            top: markTop + markSize + 204 * unit,
            textAlign: "center",
            fontFamily: SANS_FONT,
            fontSize: 24 * unit,
            lineHeight: 1.55,
            color: BRAND.foregroundSoft,
            ...enter(2),
          }}
        >
          {subline}
        </div>

        <div
          style={{
            position: "absolute",
            left: cx - 140 * unit,
            top: markTop + markSize + 296 * unit,
            width: 280 * unit,
            height: 56 * unit,
            borderRadius: 14 * unit,
            backgroundColor: BRAND.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: SANS_FONT,
            fontSize: 18 * unit,
            fontWeight: 600,
            color: "hsl(160, 25%, 5%)",
            boxShadow: `0 ${12 * unit}px ${28 * unit}px ${-8 * unit}px ${courtGreen(0.45)}`,
            ...enter(4),
          }}
        >
          {ctaLabel}
        </div>
      </Sequence>

      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 100% at 50% 40%, transparent 40%, ${ink(0.55)} 100%)`,
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
