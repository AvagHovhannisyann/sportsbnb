/**
 * WordmarkSlide — "Sports" and "BnB" slide out from behind a centre gate and
 * lock together, the join rule collapsing as they meet. The standard title
 * card at the head of the feature reel and the owner pitch, and the frame the
 * YouTube thumbnail is pulled from.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  NOISE_TILE,
  SPRING_ENTER,
  SPRING_SMOOTH,
  TRACKING_EYEBROW,
  TRACKING_TIGHTER,
  chalk,
  courtGreen,
  useBrandFrame,
} from "./brandKit";
import { StagePlate, WORDMARK_HEAD, WORDMARK_TAIL } from "./BrandGeometry";

export type WordmarkSlideProps = {
  readonly head: string;
  readonly tail: string;
  /** Mono caps line above the wordmark. Empty string hides it. */
  readonly eyebrow: string;
  /** Sans line below the wordmark. Empty string hides it. */
  readonly tagline: string;
  /** Cap height as a fraction of canvas height. */
  readonly typeScale: number;
  readonly headColor: string;
  readonly tailColor: string;
  /** Frames the two halves take to travel in. */
  readonly slideDurationInFrames: number;
  readonly backgroundColor: string;
};

export const wordmarkSlideDefaultProps: WordmarkSlideProps = {
  head: WORDMARK_HEAD,
  tail: WORDMARK_TAIL,
  eyebrow: "Sports venues, Armenia",
  tagline: "Find a pitch. Book it in ninety seconds.",
  typeScale: 0.15,
  headColor: BRAND.foreground,
  tailColor: BRAND.primary,
  slideDurationInFrames: 30,
  backgroundColor: BRAND.background,
};

const HEAD_IN = 6;
/** The tail leaves 5 frames after the head — the halves must not arrive together. */
const TAIL_IN = 11;

export const WordmarkSlide: FC<WordmarkSlideProps> = ({
  head,
  tail,
  eyebrow,
  tagline,
  typeScale,
  headColor,
  tailColor,
  slideDurationInFrames,
  backgroundColor,
}) => {
  const frame = useBrandFrame(1);
  const { fps, width, height } = useVideoConfig();

  const scale = width / 1920;
  const fontSize = height * typeScale;

  const headIn = spring({
    frame,
    fps,
    delay: HEAD_IN,
    config: SPRING_ENTER,
    durationInFrames: slideDurationInFrames,
  });
  const tailIn = spring({
    frame,
    fps,
    delay: TAIL_IN,
    config: SPRING_ENTER,
    durationInFrames: slideDurationInFrames,
  });

  /** The gate rule: snaps to full height, then collapses once both halves land. */
  const gateOpen = spring({
    frame,
    fps,
    delay: 2,
    config: SPRING_SMOOTH,
    durationInFrames: 12,
  });
  const gateClose = spring({
    frame,
    fps,
    delay: TAIL_IN + slideDurationInFrames - 6,
    config: SPRING_SMOOTH,
    durationInFrames: 16,
  });
  const gate = gateOpen - gateClose;

  const eyebrowIn = spring({
    frame,
    fps,
    delay: TAIL_IN + slideDurationInFrames - 10,
    config: SPRING_SMOOTH,
    durationInFrames: 22,
  });
  const taglineIn = spring({
    frame,
    fps,
    delay: TAIL_IN + slideDurationInFrames - 2,
    config: SPRING_SMOOTH,
    durationInFrames: 24,
  });

  const glow = interpolate(headIn + tailIn, [0, 2], [0.1, 0.85]);

  /**
   * Each half lives in its own overflow-hidden gate, so it is *uncovered* as it
   * travels rather than flying across an empty frame. Vertical padding keeps
   * the clip off the glyph glow — overflow clips at the padding box, so the
   * padding is what buys the shadow its room.
   */
  const gateStyle = {
    overflow: "hidden",
    paddingTop: fontSize * 0.22,
    paddingBottom: fontSize * 0.22,
    marginTop: -fontSize * 0.22,
    marginBottom: -fontSize * 0.22,
  } as const;

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        <StagePlate glow={glow} backgroundColor={backgroundColor} gridTile={128 * scale} />
      </Sequence>

      <Sequence name="Eyebrow" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {eyebrow.length > 0 ? (
            <div
              style={{
                position: "absolute",
                top: height * 0.5 - fontSize * 0.95,
                fontFamily: MONO_FONT,
                fontSize: fontSize * 0.14,
                fontWeight: 500,
                textTransform: "uppercase",
                color: courtGreen(0.9 * eyebrowIn),
                opacity: eyebrowIn,
                transform: `translateY(${interpolate(eyebrowIn, [0, 1], [fontSize * 0.2, 0])}px)`,
              }}
            >
              <span
                style={{ letterSpacing: TRACKING_EYEBROW, marginRight: `-${TRACKING_EYEBROW}` }}
              >
                {eyebrow}
              </span>
            </div>
          ) : null}
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Wordmark" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "baseline",
              fontFamily: DISPLAY_FONT,
              fontSize,
              fontWeight: 700,
              letterSpacing: TRACKING_TIGHTER,
              lineHeight: 1,
            }}
          >
            <div style={{ ...gateStyle, textAlign: "right" }}>
              <span
                style={{
                  display: "inline-block",
                  color: headColor,
                  transform: `translateX(${interpolate(headIn, [0, 1], [-110, 0], {
                    easing: EASE_OUT_EXPO,
                  })}%)`,
                }}
              >
                {head}
              </span>
            </div>
            <div style={gateStyle}>
              <span
                style={{
                  display: "inline-block",
                  color: tailColor,
                  textShadow: `0 0 ${fontSize * 0.4}px ${courtGreen(0.32 * tailIn)}`,
                  transform: `translateX(${interpolate(tailIn, [0, 1], [110, 0], {
                    easing: EASE_OUT_EXPO,
                  })}%)`,
                }}
              >
                {tail}
              </span>
            </div>

            {/* The join rule, sitting exactly on the seam between the halves. */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: Math.max(2, 4 * scale),
                height: fontSize * 1.15 * Math.max(0, gate),
                marginLeft: -Math.max(1, 2 * scale),
                marginTop: (-fontSize * 1.15 * Math.max(0, gate)) / 2,
                backgroundColor: BRAND.primary,
                boxShadow: `0 0 ${24 * scale}px ${courtGreen(0.55 * Math.max(0, gate))}`,
                borderRadius: 999,
              }}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Tagline" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {tagline.length > 0 ? (
            <div
              style={{
                position: "absolute",
                top: height * 0.5 + fontSize * 0.72,
                fontFamily: DISPLAY_FONT,
                fontSize: fontSize * 0.2,
                fontWeight: 500,
                color: chalk(0.7),
                opacity: taglineIn,
                transform: `translateY(${interpolate(taglineIn, [0, 1], [fontSize * 0.16, 0])}px)`,
              }}
            >
              {tagline}
            </div>
          ) : null}
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Grain" layout="none">
        <AbsoluteFill style={{ backgroundImage: NOISE_TILE, opacity: 0.05 }} />
      </Sequence>
    </AbsoluteFill>
  );
};
