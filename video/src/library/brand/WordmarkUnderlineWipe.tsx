/**
 * WordmarkUnderlineWipe — a hairline rule draws itself, the wordmark rises out
 * of it, and a court-green underline wipes across to lock the lockup down. The
 * calm, editorial reveal: used on blog and press headers, the investor deck
 * title slide, and anywhere the brand should arrive without a bang.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  NOISE_TILE,
  SPRING_SMOOTH,
  TRACKING_EYEBROW,
  TRACKING_TIGHTER,
  chalk,
  courtGreen,
  useBrandFrame,
} from "./brandKit";
import { StagePlate, WORDMARK_HEAD, WORDMARK_TAIL } from "./BrandGeometry";

export type WordmarkUnderlineWipeProps = {
  readonly head: string;
  readonly tail: string;
  readonly eyebrow: string;
  readonly tagline: string;
  /** Cap height as a fraction of canvas height. */
  readonly typeScale: number;
  readonly underlineColor: string;
  /** Underline thickness relative to cap height. */
  readonly underlineWeight: number;
  /** Frames the underline takes to cross the lockup. */
  readonly wipeDurationInFrames: number;
  readonly backgroundColor: string;
};

export const wordmarkUnderlineWipeDefaultProps: WordmarkUnderlineWipeProps = {
  head: WORDMARK_HEAD,
  tail: WORDMARK_TAIL,
  eyebrow: "Since 2024",
  tagline: "Every pitch in Armenia, bookable by the hour",
  typeScale: 0.14,
  underlineColor: BRAND.primary,
  underlineWeight: 0.07,
  wipeDurationInFrames: 26,
  backgroundColor: BRAND.background,
};

const RULE_IN = 4;
const WORD_IN = 14;

export const WordmarkUnderlineWipe: FC<WordmarkUnderlineWipeProps> = ({
  head,
  tail,
  eyebrow,
  tagline,
  typeScale,
  underlineColor,
  underlineWeight,
  wipeDurationInFrames,
  backgroundColor,
}) => {
  const frame = useBrandFrame(1);
  const { fps, width, height } = useVideoConfig();

  const scale = width / 1920;
  const fontSize = height * typeScale;
  const rule = Math.max(2, fontSize * underlineWeight);

  /** The hairline opens from the centre outward. */
  const ruleIn = spring({
    frame,
    fps,
    delay: RULE_IN,
    config: SPRING_SMOOTH,
    durationInFrames: 22,
  });
  /** The wordmark rises out of that rule. */
  const wordIn = spring({
    frame,
    fps,
    delay: WORD_IN,
    config: SPRING_SMOOTH,
    durationInFrames: 26,
  });
  /** Then the green underline crosses it, left to right. */
  const wipeIn = spring({
    frame,
    fps,
    delay: WORD_IN + 16,
    config: SPRING_SMOOTH,
    durationInFrames: wipeDurationInFrames,
  });
  const eyebrowIn = spring({
    frame,
    fps,
    delay: WORD_IN + 6,
    config: SPRING_SMOOTH,
    durationInFrames: 22,
  });
  const taglineIn = spring({
    frame,
    fps,
    delay: WORD_IN + 24,
    config: SPRING_SMOOTH,
    durationInFrames: 26,
  });

  const glow = interpolate(wipeIn, [0, 1], [0.15, 0.8]);
  const lockupWidth = fontSize * (head.length + tail.length) * 0.56;

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        <StagePlate glow={glow} backgroundColor={backgroundColor} gridTile={128 * scale} />
      </Sequence>

      <Sequence name="Lockup" layout="none">
        <AbsoluteFill
          style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}
        >
          {eyebrow.length > 0 ? (
            <div
              style={{
                fontFamily: MONO_FONT,
                fontSize: fontSize * 0.15,
                fontWeight: 500,
                textTransform: "uppercase",
                color: chalk(0.4 * eyebrowIn),
                marginBottom: fontSize * 0.34,
                opacity: eyebrowIn,
              }}
            >
              <span
                style={{ letterSpacing: TRACKING_EYEBROW, marginRight: `-${TRACKING_EYEBROW}` }}
              >
                {eyebrow}
              </span>
            </div>
          ) : null}

          {/* The lockup, clipped to the rule and rising out of it. */}
          <div
            style={{
              /** inset(top …): the top edge retreats, so the word grows upward. */
              clipPath: `inset(${interpolate(wordIn, [0, 1], [104, -12])}% 0% -20% 0%)`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                fontFamily: DISPLAY_FONT,
                fontSize,
                fontWeight: 700,
                letterSpacing: TRACKING_TIGHTER,
                lineHeight: 1,
                transform: `translateY(${interpolate(wordIn, [0, 1], [fontSize * 0.22, 0], {
                  easing: EASE_OUT_EXPO,
                })}px)`,
              }}
            >
              <span style={{ color: BRAND.foreground }}>{head}</span>
              <span
                style={{
                  color: BRAND.primary,
                  textShadow: `0 0 ${fontSize * 0.42}px ${courtGreen(0.3 * wipeIn)}`,
                }}
              >
                {tail}
              </span>
            </div>
          </div>

          {/* Track + travelling underline. Both are sized off the same width so
              the green rule cannot end up shorter or longer than the hairline. */}
          <div
            style={{
              position: "relative",
              width: lockupWidth,
              height: rule,
              marginTop: fontSize * 0.22,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                backgroundColor: BRAND.border,
                transform: `scaleX(${ruleIn})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                backgroundColor: underlineColor,
                transformOrigin: "left center",
                transform: `scaleX(${wipeIn})`,
                boxShadow: `0 0 ${rule * 4}px ${courtGreen(0.5 * wipeIn)}`,
              }}
            />
            {/* Leading dot, so the wipe has a head rather than an edge. */}
            <div
              style={{
                position: "absolute",
                left: lockupWidth * wipeIn,
                top: rule / 2,
                width: rule * 2.2,
                height: rule * 2.2,
                marginLeft: -rule * 1.1,
                marginTop: -rule * 1.1,
                borderRadius: "50%",
                backgroundColor: underlineColor,
                opacity: interpolate(wipeIn, [0, 0.05, 0.95, 1], [0, 1, 1, 0]),
                boxShadow: `0 0 ${rule * 6}px ${courtGreen(0.6)}`,
              }}
            />
          </div>

          {tagline.length > 0 ? (
            <div
              style={{
                marginTop: fontSize * 0.3,
                fontFamily: DISPLAY_FONT,
                fontSize: fontSize * 0.21,
                fontWeight: 500,
                color: chalk(0.72),
                clipPath: `inset(0% ${interpolate(taglineIn, [0, 1], [100, 0])}% 0% 0%)`,
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
