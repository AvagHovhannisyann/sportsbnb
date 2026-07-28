/**
 * LogoDraw — the SportsBnB mark drawing itself line by line, touchline first,
 * then halfway, centre circle and the goal boxes, before the wordmark settles
 * underneath. The opening beat of the brand film and the pre-roll on every
 * venue promo; also the 3s splash the mobile app plays on a cold start.
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
  SPRING_POP,
  SPRING_SMOOTH,
  TRACKING_EYEBROW,
  TRACKING_TIGHTER,
  chalk,
  courtGreen,
  useBrandFrame,
} from "./brandKit";
import {
  MarkTile,
  PITCH_STROKES,
  PitchGlyph,
  StagePlate,
  WORDMARK_HEAD,
  WORDMARK_TAIL,
} from "./BrandGeometry";

export type LogoDrawProps = {
  /** Chalk-white half of the lockup. */
  readonly head: string;
  /** Court-green half of the lockup. */
  readonly tail: string;
  /** Mono caps line under the wordmark. Empty string hides it. */
  readonly tagline: string;
  readonly showWordmark: boolean;
  /** Tile edge as a fraction of the shorter canvas side. */
  readonly markScale: number;
  readonly strokeColor: string;
  /** Frames each individual pitch line takes to draw. */
  readonly drawDurationInFrames: number;
  /** Frames between consecutive lines starting to draw. */
  readonly strokeStaggerInFrames: number;
  readonly backgroundColor: string;
};

export const logoDrawDefaultProps: LogoDrawProps = {
  head: WORDMARK_HEAD,
  tail: WORDMARK_TAIL,
  tagline: "Book the court",
  showWordmark: true,
  markScale: 0.34,
  strokeColor: BRAND.primary,
  drawDurationInFrames: 22,
  strokeStaggerInFrames: 6,
  backgroundColor: BRAND.background,
};

/** Frame the tile itself starts arriving. Everything else keys off this. */
const TILE_IN = 2;
/** Frame the first pitch line starts drawing. */
const DRAW_IN = 12;

export const LogoDraw: FC<LogoDrawProps> = ({
  head,
  tail,
  tagline,
  showWordmark,
  markScale,
  strokeColor,
  drawDurationInFrames,
  strokeStaggerInFrames,
  backgroundColor,
}) => {
  /** Poster on the resolved lockup — the frame a reduced-motion viewer wants. */
  const frame = useBrandFrame(1);
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const shortSide = Math.min(width, height);
  const tileSize = shortSide * markScale;

  const tileIn = spring({
    frame,
    fps,
    delay: TILE_IN,
    config: SPRING_ENTER,
    durationInFrames: 26,
  });

  /**
   * One spring per pitch line, each delayed a further `strokeStaggerInFrames`.
   * Critically damped, because a stroke that overshoots would have to *un*draw
   * itself — a dash offset past 1 clips the tail off the line.
   */
  const reveal = PITCH_STROKES.map((_, i) =>
    spring({
      frame,
      fps,
      delay: DRAW_IN + i * strokeStaggerInFrames,
      config: SPRING_SMOOTH,
      durationInFrames: drawDurationInFrames,
    }),
  );

  const lastStrokeEnd =
    DRAW_IN + (PITCH_STROKES.length - 1) * strokeStaggerInFrames + drawDurationInFrames;

  /** The centre spot lands only once the pitch it sits on exists. */
  const dot = spring({
    frame,
    fps,
    delay: lastStrokeEnd - 6,
    config: SPRING_POP,
    durationInFrames: 18,
  });

  const wordIn = spring({
    frame,
    fps,
    delay: lastStrokeEnd - 2,
    config: SPRING_ENTER,
    durationInFrames: 24,
  });
  const tailIn = spring({
    frame,
    fps,
    delay: lastStrokeEnd + 4,
    config: SPRING_ENTER,
    durationInFrames: 24,
  });
  const taglineIn = spring({
    frame,
    fps,
    delay: lastStrokeEnd + 12,
    config: SPRING_SMOOTH,
    durationInFrames: 24,
  });

  /** Ambient bloom: rides the draw, then breathes down to a resting level. */
  const glow = interpolate(
    frame,
    [0, DRAW_IN, lastStrokeEnd, durationInFrames],
    [0, 0.2, 1, 0.72],
    { extrapolateRight: "clamp", easing: EASE_OUT_EXPO },
  );

  const wordSize = tileSize * 0.29;

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        <StagePlate glow={glow} backgroundColor={backgroundColor} gridTile={shortSide * 0.09} />
      </Sequence>

      <Sequence name="Mark" layout="none">
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              opacity: tileIn,
              transform: `scale(${interpolate(tileIn, [0, 1], [0.86, 1])})`,
            }}
          >
            <MarkTile size={tileSize} glow={glow}>
              <PitchGlyph
                width={tileSize * 0.66}
                reveal={reveal}
                color={strokeColor}
                dot={dot}
              />
            </MarkTile>
          </div>

          {showWordmark ? (
            <div
              style={{
                marginTop: tileSize * 0.28,
                display: "flex",
                alignItems: "baseline",
                fontFamily: DISPLAY_FONT,
                fontSize: wordSize,
                fontWeight: 700,
                letterSpacing: TRACKING_TIGHTER,
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  color: BRAND.foreground,
                  opacity: wordIn,
                  transform: `translateY(${interpolate(wordIn, [0, 1], [wordSize * 0.34, 0])}px)`,
                  display: "inline-block",
                }}
              >
                {head}
              </span>
              <span
                style={{
                  color: BRAND.primary,
                  opacity: tailIn,
                  transform: `translateY(${interpolate(tailIn, [0, 1], [wordSize * 0.34, 0])}px)`,
                  display: "inline-block",
                  textShadow: `0 0 ${wordSize * 0.6}px ${courtGreen(0.3 * tailIn)}`,
                }}
              >
                {tail}
              </span>
            </div>
          ) : null}

          {showWordmark && tagline.length > 0 ? (
            <div
              style={{
                marginTop: tileSize * 0.12,
                fontFamily: MONO_FONT,
                fontSize: wordSize * 0.26,
                fontWeight: 500,
                textTransform: "uppercase",
                color: chalk(0.42 * taglineIn),
                overflow: "hidden",
                height: wordSize * 0.42,
                display: "flex",
                alignItems: "center",
              }}
            >
              {/* Letter-spacing hangs a phantom gap off the last glyph, which
                  drags a centred line half a track left. The negative margin
                  takes it back out before centring measures the box. */}
              <span
                style={{
                  letterSpacing: TRACKING_EYEBROW,
                  marginRight: `-${TRACKING_EYEBROW}`,
                  transform: `translateY(${interpolate(taglineIn, [0, 1], [wordSize * 0.4, 0])}px)`,
                  display: "inline-block",
                }}
              >
                {tagline}
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
