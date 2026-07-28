/**
 * CtaBrowseVenues — the closing call to action from `src/pages/HomePage.tsx`:
 * "Your next game is one tap away." Landscape cut for the end of the marketing
 * reel and for the site's closing band.
 * 1920×1080 · 30fps · 240 frames (8s) · one-shot reveal.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring } from "remotion";

import {
  BRAND,
  CLAMP,
  CtaButton,
  EASE_OUT_EXPO,
  ENTER_SPRING,
  FONT_MONO,
  FONT_SANS,
  FONT_DISPLAY,
  Grain,
  IconStar,
  MaskedWords,
  StageWash,
  TAU,
  alpha,
  loopT,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   the glow behind the headline starts breathing
 *  10   headline, word-staggered 5f apart
 *  62   sub-line
 *  86   the two buttons, 10f apart
 * 120   the arrow leans, once
 * 142   the footnote
 *
 * ── A CTA has exactly one job ────────────────────────────────────────────
 * Everything on this frame is centred on one axis and nothing competes with
 * the primary button: the secondary is an outline, the footnote is muted, and
 * there is no card, no chart and no product UI. That restraint is copied
 * straight from the real closing section, which deliberately has "one action,
 * nothing competing with it".
 *
 * The arrow lean at frame 120 is the page's own `group-hover:translate-x-0.5`
 * treatment played once — the single embellishment the design allows a CTA,
 * reproduced rather than invented, and clamped back to 0 so it does not sit
 * displaced on the last frame.
 *
 * ── The glow ──────────────────────────────────────────────────────────────
 * The bloom behind the headline breathes on a **modulo cycle** through a full
 * sine period, so it is continuous if this cut is looped on a screen at an
 * event; the headline reveal on top of it is one-way by design.
 */

const SETTLED_FRAME = 200;

export type CtaBrowseVenuesProps = {
  readonly headline: readonly string[];
  readonly accentFrom: number;
  readonly subline: string;
  readonly primaryCta: string;
  readonly secondaryCta: string;
  readonly footnote: string;
  /** Frames per breath of the glow behind the headline. */
  readonly glowPeriod: number;
};

export const ctaBrowseVenuesDefaultProps: CtaBrowseVenuesProps = {
  headline: ["Your", "next", "game", "is", "one", "tap", "away."],
  accentFrom: 4,
  subline: "Free to join. No card needed until you book.",
  primaryCta: "Get started",
  secondaryCta: "Browse first",
  footnote: "Built for players in Yerevan — message venue owners directly",
  glowPeriod: 120,
};

export const CtaBrowseVenues: FC<CtaBrowseVenuesProps> = ({
  headline,
  accentFrom,
  subline,
  primaryCta,
  secondaryCta,
  footnote,
  glowPeriod,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME);

  /** Modulo cycle, full sine period — continuous if this cut is looped. */
  const breath = 0.5 + 0.5 * Math.sin(TAU * loopT(frame, glowPeriod));

  const primary = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 86,
    durationInFrames: 30,
  });
  const secondary = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 96,
    durationInFrames: 30,
  });

  /** One-shot, clamped at both ends so nothing sits displaced at the tail. */
  const arrowShift = interpolate(frame, [120, 134, 150], [0, 8, 0], {
    ...CLAMP,
    easing: EASE_OUT_EXPO,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} />
      </Sequence>

      <Sequence name="Glow">
        {/* The `bg-primary/12 blur-[130px]` bloom from the real closing band,
            expressed as a radial gradient because a 130px blur filter is
            expensive to rasterise 240 times and looks identical here. */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 52% 62% at 50% 118%, ${alpha(
              BRAND.primary,
              interpolate(breath, [0, 1], [0.1, 0.16]),
            )} 0%, transparent 66%)`,
          }}
        />
      </Sequence>

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: "0 160px",
        }}
      >
        <Sequence name="Headline" layout="none">
          <div
            style={{
              maxWidth: 1400,
              textAlign: "center",
              fontFamily: FONT_DISPLAY,
              fontSize: 122,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.01,
              color: BRAND.fg,
            }}
          >
            <MaskedWords
              frame={frame}
              fps={fps}
              words={headline}
              delay={10}
              stagger={5}
              staggerCap={7}
              accentFrom={accentFrom}
              style={{ justifyContent: "center" }}
            />
          </div>
        </Sequence>

        <Sequence name="Subline" layout="none">
          <div
            style={{
              ...riseStyle(frame, fps, 62, 20),
              marginTop: 34,
              fontFamily: FONT_SANS,
              fontSize: 32,
              lineHeight: 1.5,
              color: BRAND.fgSoft,
              textAlign: "center",
            }}
          >
            {subline}
          </div>
        </Sequence>

        <Sequence name="Buttons" layout="none">
          <div
            style={{
              marginTop: 56,
              display: "flex",
              alignItems: "center",
              gap: 22,
            }}
          >
            <div
              style={{
                opacity: interpolate(primary, [0, 0.4], [0, 1], CLAMP),
                transform: `translateY(${interpolate(primary, [0, 1], [26, 0])}px)`,
              }}
            >
              <CtaButton label={primaryCta} arrowShift={arrowShift} />
            </div>
            <div
              style={{
                opacity: interpolate(secondary, [0, 0.4], [0, 1], CLAMP),
                transform: `translateY(${interpolate(secondary, [0, 1], [26, 0])}px)`,
              }}
            >
              <CtaButton label={secondaryCta} variant="outline" />
            </div>
          </div>
        </Sequence>

        <Sequence name="Footnote" layout="none">
          <div
            style={{
              ...riseStyle(frame, fps, 142, 14, 26),
              marginTop: 48,
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              fontFamily: FONT_MONO,
              fontSize: 22,
              letterSpacing: "0.02em",
              color: BRAND.muted,
            }}
          >
            <span style={{ color: BRAND.primary, display: "inline-flex" }}>
              <IconStar size={22} />
            </span>
            {footnote}
          </div>
        </Sequence>
      </AbsoluteFill>

      <Sequence name="Grain">
        <Grain frame={frame} period={period} scale={scale} />
      </Sequence>
    </AbsoluteFill>
  );
};
