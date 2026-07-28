/**
 * LogoScaleIn — the mark arrives as one confident overshooting spring and
 * knocks three shockwave rings out of the court on impact. The punchier
 * alternative to LogoDraw: used as the opening card of paid social cuts and as
 * the "booking confirmed" flourish in the app's success sheet.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  NOISE_TILE,
  SPRING_ENTER,
  SPRING_POP,
  SPRING_SMOOTH,
  TRACKING_TIGHTER,
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

export type LogoScaleInProps = {
  readonly head: string;
  readonly tail: string;
  readonly showWordmark: boolean;
  /** Tile edge as a fraction of the shorter canvas side. */
  readonly markScale: number;
  /** Scale the tile starts from. Below ~0.3 the overshoot reads as a punch. */
  readonly fromScale: number;
  /** Degrees of counter-rotation unwound as the tile lands. */
  readonly fromRotation: number;
  /** Shockwave rings knocked out on impact. 0 disables them. */
  readonly ringCount: number;
  readonly ringColor: string;
  readonly backgroundColor: string;
};

export const logoScaleInDefaultProps: LogoScaleInProps = {
  head: WORDMARK_HEAD,
  tail: WORDMARK_TAIL,
  showWordmark: true,
  markScale: 0.34,
  fromScale: 0.22,
  fromRotation: -14,
  ringCount: 3,
  ringColor: BRAND.primary,
  backgroundColor: BRAND.background,
};

/** Frame the tile spring starts. */
const IMPACT_IN = 3;
/** Frames the landing spring takes to settle. */
const IMPACT_SETTLE = 30;

export const LogoScaleIn: FC<LogoScaleInProps> = ({
  head,
  tail,
  showWordmark,
  markScale,
  fromScale,
  fromRotation,
  ringCount,
  ringColor,
  backgroundColor,
}) => {
  const frame = useBrandFrame(1);
  const { fps, width, height } = useVideoConfig();

  const shortSide = Math.min(width, height);
  const tileSize = shortSide * markScale;

  /** The one spring the whole composition hangs off. Overshoots by design. */
  const land = spring({
    frame,
    fps,
    delay: IMPACT_IN,
    config: SPRING_POP,
    durationInFrames: IMPACT_SETTLE,
  });

  const scale = interpolate(land, [0, 1], [fromScale, 1]);
  const rotation = interpolate(land, [0, 1], [fromRotation, 0]);

  /**
   * Pitch lines fade up *after* the tile has committed, 3 frames apart, so the
   * mark reads as a container that then fills rather than a decal that flew in.
   */
  const fade = PITCH_STROKES.map((_, i) =>
    spring({
      frame,
      fps,
      delay: IMPACT_IN + 10 + i * 3,
      config: SPRING_SMOOTH,
      durationInFrames: 16,
    }),
  );

  const dot = spring({
    frame,
    fps,
    delay: IMPACT_IN + 24,
    config: SPRING_POP,
    durationInFrames: 16,
  });

  const wordIn = spring({
    frame,
    fps,
    delay: IMPACT_IN + 18,
    config: SPRING_ENTER,
    durationInFrames: 26,
  });
  const tailIn = spring({
    frame,
    fps,
    delay: IMPACT_IN + 24,
    config: SPRING_ENTER,
    durationInFrames: 26,
  });

  const glow = interpolate(land, [0, 0.7, 1], [0, 1, 0.78], {
    extrapolateRight: "clamp",
  });
  const wordSize = tileSize * 0.29;

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        <StagePlate glow={glow} backgroundColor={backgroundColor} gridTile={shortSide * 0.09} />
      </Sequence>

      <Sequence name="Shockwaves" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {Array.from({ length: Math.max(0, ringCount) }, (_, i) => {
            /**
             * Rings are keyed to the impact, not to frame 0: each one starts
             * 5 frames after the previous and is dead within 34, so they read
             * as one event breaking up rather than three pulses.
             */
            const local = frame - (IMPACT_IN + 12 + i * 5);
            const push = spring({
              frame: local,
              fps,
              config: SPRING_SMOOTH,
              durationInFrames: 34,
            });
            const size = interpolate(push, [0, 1], [tileSize * 0.9, tileSize * (2.1 + i * 0.5)], {
              easing: EASE_OUT_EXPO,
            });
            const opacity = interpolate(push, [0, 0.12, 1], [0, 0.5 - i * 0.12, 0]);
            if (opacity <= 0) {
              return null;
            }
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: size,
                  height: size,
                  borderRadius: size * 0.26,
                  border: `${Math.max(1, tileSize * 0.012 * (1 - push))}px solid ${ringColor}`,
                  opacity,
                }}
              />
            );
          })}
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Mark" layout="none">
        <AbsoluteFill
          style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}
        >
          <div
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              opacity: interpolate(land, [0, 0.25], [0, 1], { extrapolateRight: "clamp" }),
            }}
          >
            <MarkTile size={tileSize} glow={glow}>
              <PitchGlyph width={tileSize * 0.66} fade={fade} dot={dot} />
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
                  display: "inline-block",
                  color: BRAND.foreground,
                  opacity: wordIn,
                  transform: `scale(${interpolate(wordIn, [0, 1], [1.16, 1])})`,
                }}
              >
                {head}
              </span>
              <span
                style={{
                  display: "inline-block",
                  color: BRAND.primary,
                  opacity: tailIn,
                  transform: `scale(${interpolate(tailIn, [0, 1], [1.16, 1])})`,
                  textShadow: `0 0 ${wordSize * 0.6}px ${courtGreen(0.32 * tailIn)}`,
                }}
              >
                {tail}
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
