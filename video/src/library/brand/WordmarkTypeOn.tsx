/**
 * WordmarkTypeOn — the wordmark resolves letter by letter, each glyph springing
 * up out of a blur with a court-green caret running ahead of it. Used as the
 * search-bar hero animation on the landing page and the opening card of the
 * product-update clips, where the brand should feel typed rather than stamped.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  NOISE_TILE,
  SPRING_ENTER,
  SPRING_SMOOTH,
  TRACKING_EYEBROW,
  TRACKING_TIGHTER,
  courtGreen,
  useBrandFrame,
  wrap,
} from "./brandKit";
import { StagePlate, WORDMARK_HEAD, WORDMARK_TAIL } from "./BrandGeometry";

export type WordmarkTypeOnProps = {
  /** Whole wordmark as one string; the colour split is an index into it. */
  readonly text: string;
  /** First character index that takes the court-green. */
  readonly accentFromIndex: number;
  readonly eyebrow: string;
  /** Cap height as a fraction of canvas height. */
  readonly typeScale: number;
  /** Frames between consecutive glyphs starting to arrive. */
  readonly letterStaggerInFrames: number;
  readonly showCaret: boolean;
  readonly caretColor: string;
  readonly backgroundColor: string;
};

export const wordmarkTypeOnDefaultProps: WordmarkTypeOnProps = {
  text: `${WORDMARK_HEAD}${WORDMARK_TAIL}`,
  accentFromIndex: WORDMARK_HEAD.length,
  eyebrow: "sportsbnb.am",
  typeScale: 0.16,
  letterStaggerInFrames: 4,
  showCaret: true,
  caretColor: BRAND.primary,
  backgroundColor: BRAND.background,
};

const TYPE_IN = 8;
/** Frames the caret spends on one full blink cycle once typing is done. */
const BLINK_PERIOD = 20;

export const WordmarkTypeOn: FC<WordmarkTypeOnProps> = ({
  text,
  accentFromIndex,
  eyebrow,
  typeScale,
  letterStaggerInFrames,
  showCaret,
  caretColor,
  backgroundColor,
}) => {
  const frame = useBrandFrame(1);
  const { fps, width, height } = useVideoConfig();

  const scale = width / 1920;
  const fontSize = height * typeScale;
  const letters = text.split("");

  /** Which glyph the caret is currently sitting behind. */
  const typedIndex = Math.floor((frame - TYPE_IN) / Math.max(1, letterStaggerInFrames));
  const finishedAt = TYPE_IN + letters.length * letterStaggerInFrames;

  const eyebrowIn = spring({
    frame,
    fps,
    delay: finishedAt + 4,
    config: SPRING_SMOOTH,
    durationInFrames: 22,
  });

  /** Ambient bloom grows with the word rather than being keyed separately. */
  const glow = interpolate(frame, [TYPE_IN, finishedAt], [0.08, 0.85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /** Once typing is done the caret blinks on a modulo cycle, then retires. */
  const blink = frame > finishedAt ? (wrap(frame - finishedAt, BLINK_PERIOD) < BLINK_PERIOD / 2 ? 1 : 0) : 1;
  const caretRetire = spring({
    frame,
    fps,
    delay: finishedAt + BLINK_PERIOD * 2,
    config: SPRING_SMOOTH,
    durationInFrames: 12,
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        <StagePlate glow={glow} backgroundColor={backgroundColor} gridTile={128 * scale} />
      </Sequence>

      <Sequence name="Wordmark" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontFamily: DISPLAY_FONT,
              fontSize,
              fontWeight: 700,
              letterSpacing: TRACKING_TIGHTER,
              lineHeight: 1.2,
            }}
          >
            {letters.map((letter, i) => {
              const arrive = spring({
                frame,
                fps,
                delay: TYPE_IN + i * letterStaggerInFrames,
                config: SPRING_ENTER,
                durationInFrames: 20,
              });
              const isAccent = i >= accentFromIndex;
              /** Caret rides between glyph i and i+1 while glyph i+1 is pending. */
              const caretHere = showCaret && typedIndex === i;
              return (
                <span key={i} style={{ display: "inline-flex", alignItems: "baseline" }}>
                  <span
                    style={{
                      display: "inline-block",
                      color: isAccent ? BRAND.primary : BRAND.foreground,
                      opacity: arrive,
                      /**
                       * Every glyph is laid out from frame 0 — only its paint is
                       * animated. That is what keeps the line from reflowing
                       * under the caret as letters land.
                       */
                      transform: `translateY(${interpolate(arrive, [0, 1], [fontSize * 0.28, 0])}px) scale(${interpolate(
                        arrive,
                        [0, 1],
                        [0.86, 1],
                      )})`,
                      filter: `blur(${interpolate(arrive, [0, 1], [fontSize * 0.05, 0])}px)`,
                      textShadow: isAccent
                        ? `0 0 ${fontSize * 0.4}px ${courtGreen(0.3 * arrive)}`
                        : "none",
                    }}
                  >
                    {letter}
                  </span>
                  {/* Zero-width anchor: the caret is positioned by the text flow
                      itself, so it never needs the glyph widths measured. */}
                  <span
                    style={{ position: "relative", display: "inline-block", width: 0, height: 0 }}
                  >
                    {caretHere ? (
                      <span
                        style={{
                          position: "absolute",
                          left: fontSize * 0.05,
                          bottom: -fontSize * 0.06,
                          width: fontSize * 0.07,
                          height: fontSize * 0.82,
                          backgroundColor: caretColor,
                          borderRadius: fontSize * 0.02,
                          boxShadow: `0 0 ${fontSize * 0.3}px ${courtGreen(0.5)}`,
                        }}
                      />
                    ) : null}
                  </span>
                </span>
              );
            })}

            {/* The resting caret, after the last glyph. */}
            {showCaret ? (
              <span style={{ position: "relative", display: "inline-block", width: 0, height: 0 }}>
                <span
                  style={{
                    position: "absolute",
                    left: fontSize * 0.08,
                    bottom: -fontSize * 0.06,
                    width: fontSize * 0.07,
                    height: fontSize * 0.82,
                    backgroundColor: caretColor,
                    borderRadius: fontSize * 0.02,
                    opacity:
                      typedIndex >= letters.length - 1 ? blink * (1 - caretRetire) : 0,
                    boxShadow: `0 0 ${fontSize * 0.3}px ${courtGreen(0.5)}`,
                  }}
                />
              </span>
            ) : null}
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Eyebrow" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {eyebrow.length > 0 ? (
            <div
              style={{
                position: "absolute",
                top: height * 0.5 + fontSize * 0.85,
                fontFamily: MONO_FONT,
                fontSize: fontSize * 0.14,
                fontWeight: 500,
                textTransform: "uppercase",
                color: courtGreen(0.85 * eyebrowIn),
                opacity: eyebrowIn,
                transform: `translateY(${interpolate(eyebrowIn, [0, 1], [fontSize * 0.16, 0])}px)`,
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

      <Sequence name="Grain" layout="none">
        <AbsoluteFill style={{ backgroundImage: NOISE_TILE, opacity: 0.05 }} />
      </Sequence>
    </AbsoluteFill>
  );
};
