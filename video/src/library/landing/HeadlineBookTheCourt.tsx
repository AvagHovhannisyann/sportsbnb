/**
 * HeadlineBookTheCourt — the landing hero's headline as a motion piece:
 * "Book the court. Skip the call." Mirrors the H1 in `src/pages/HomePage.tsx`
 * for use as a social cut-down or a video hero over HeroAuroraDrift.
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
  FONT_DISPLAY,
  FONT_SANS,
  Grain,
  IconBolt,
  IconShield,
  LivePill,
  MaskedWords,
  StageWash,
  riseStyle,
  alpha,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   live-availability pill
 *  14   line 1 — "Book the court."      (word-staggered, 4f apart)
 *  38   line 2 — "Skip the call."       in --primary
 *  70   sub-paragraph
 *  96   CTA row
 * 122   trust marks
 *
 * Every block is a nested `<Sequence>`, so its springs are written against
 * local frame 0 and the timeline composes the offsets: moving a block moves
 * everything inside it, and the arithmetic stays honest.
 *
 * Springs drive everything that *arrives* (they are underdamped, so a word
 * settles with a little weight). `interpolate()` only maps an already-computed
 * spring onto px/opacity, or drives the one thing that is genuinely linear —
 * the underline wipe. There is no linear tween standing in for a spring.
 *
 * Reduced motion pins the whole composition to frame 200, past the last beat,
 * so every spring reads exactly 1 and the finished frame renders static.
 */

const SETTLED_FRAME = 200;

type BlockProps = {
  readonly frame: number;
  readonly fps: number;
};

const TrustMark: FC<
  BlockProps & { readonly label: string; readonly delay: number; readonly icon: "shield" | "bolt" }
> = ({ frame, fps, label, delay, icon }) => {
  const style = riseStyle(frame, fps, delay, 14, 24);
  return (
    <div
      style={{
        ...style,
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        fontFamily: FONT_SANS,
        fontSize: 24,
        color: BRAND.muted,
      }}
    >
      <span style={{ color: BRAND.primary, display: "inline-flex" }}>
        {icon === "shield" ? <IconShield size={26} /> : <IconBolt size={26} />}
      </span>
      {label}
    </div>
  );
};

export type HeadlineBookTheCourtProps = {
  readonly eyebrow: string;
  /** Line one, split into words so each can be masked separately. */
  readonly lineOne: readonly string[];
  /** Line two — set in `--primary`, the way the real H1 does it. */
  readonly lineTwo: readonly string[];
  readonly subhead: string;
  readonly primaryCta: string;
  readonly secondaryCta: string;
  readonly trustMarks: readonly string[];
};

export const headlineBookTheCourtDefaultProps: HeadlineBookTheCourtProps = {
  eyebrow: "Live availability",
  lineOne: ["Book", "the", "court."],
  lineTwo: ["Skip", "the", "call."],
  subhead:
    "Verified sports venues across Armenia, with live availability and instant confirmation.",
  primaryCta: "Browse venues",
  secondaryCta: "List your venue",
  trustMarks: ["Every venue verified", "Confirmed in seconds"],
};

export const HeadlineBookTheCourt: FC<HeadlineBookTheCourtProps> = ({
  eyebrow,
  lineOne,
  lineTwo,
  subhead,
  primaryCta,
  secondaryCta,
  trustMarks,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME);

  const subStyle = riseStyle(frame, fps, 70, 22);
  const ctaP = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 96,
    durationInFrames: 30,
  });

  /**
   * The arrow lean, matching `group-hover:translate-x-0.5` on the real CTA.
   * A short one-shot nudge landing after the button has settled — the page's
   * only CTA embellishment, reproduced rather than invented.
   */
  const arrowShift = interpolate(frame, [126, 140, 156], [0, 7, 0], {
    ...CLAMP,
    easing: EASE_OUT_EXPO,
  });

  /** Genuinely linear: a rule being wiped in is a wipe, not an arrival. */
  const ruleWidth = interpolate(frame, [40, 96], [0, 100], {
    ...CLAMP,
    easing: EASE_OUT_EXPO,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} />
      </Sequence>

      <AbsoluteFill
        style={{
          padding: "0 128px",
          justifyContent: "center",
        }}
      >
        <Sequence name="Eyebrow pill" from={0}>
          <div style={riseStyle(frame, fps, 0, 18, 26)}>
            <LivePill frame={frame} label={eyebrow} />
          </div>
        </Sequence>

        <div style={{ height: 40 }} />

        <Sequence name="Headline">
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 132,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 0.98,
              color: BRAND.fg,
            }}
          >
            <MaskedWords frame={frame} fps={fps} words={lineOne} delay={14} />
            <MaskedWords
              frame={frame}
              fps={fps}
              words={lineTwo}
              delay={38}
              accentFrom={0}
            />
          </div>
        </Sequence>

        {/* Hairline under the headline — the wipe that ties the two blocks
            together while the sub-paragraph is still arriving. */}
        <div
          style={{
            marginTop: 34,
            height: 1,
            width: `${ruleWidth * 0.42}%`,
            background: `linear-gradient(90deg, ${alpha(BRAND.primary, 0.55)} 0%, ${alpha(
              BRAND.border,
              0,
            )} 100%)`,
          }}
        />

        <Sequence name="Subhead">
          <div
            style={{
              ...subStyle,
              marginTop: 30,
              maxWidth: 780,
              fontFamily: FONT_SANS,
              fontSize: 30,
              lineHeight: 1.55,
              color: BRAND.fgSoft,
            }}
          >
            {subhead}
          </div>
        </Sequence>

        <Sequence name="CTA row">
          <div
            style={{
              marginTop: 52,
              display: "flex",
              alignItems: "center",
              gap: 20,
              opacity: interpolate(ctaP, [0, 0.4], [0, 1], CLAMP),
              transform: `translateY(${interpolate(ctaP, [0, 1], [24, 0])}px)`,
            }}
          >
            <CtaButton label={primaryCta} arrowShift={arrowShift} />
            <CtaButton label={secondaryCta} variant="outline" />
          </div>
        </Sequence>

        <Sequence name="Trust marks">
          <div style={{ marginTop: 44, display: "flex", gap: 46 }}>
            {trustMarks.map((mark, i) => (
              <TrustMark
                key={mark}
                frame={frame}
                fps={fps}
                label={mark}
                delay={122 + i * 8}
                icon={i === 0 ? "shield" : "bolt"}
              />
            ))}
          </div>
        </Sequence>
      </AbsoluteFill>

      <Sequence name="Grain">
        <Grain frame={frame} period={period} scale={scale} />
      </Sequence>
    </AbsoluteFill>
  );
};
