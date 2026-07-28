/**
 * MonogramFlip — the pitch mark turns over in 3D and lands on the SB monogram,
 * a sheen crossing the tile as it passes edge-on. The identity's "two faces of
 * one mark" beat: used in the brand guidelines video and as the avatar
 * transition when a venue owner's account is upgraded to a verified host.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useVideoConfig } from "remotion";

import {
  BRAND,
  MONO_FONT,
  NOISE_TILE,
  SPRING_ENTER,
  SPRING_SMOOTH,
  TRACKING_EYEBROW,
  chalk,
  courtGreen,
  useBrandFrame,
} from "./brandKit";
import { MarkTile, MonogramGlyph, PitchGlyph, StagePlate } from "./BrandGeometry";

export type MonogramFlipProps = {
  readonly letters: string;
  readonly caption: string;
  /** Which way the tile turns over. */
  readonly axis: "x" | "y";
  /** Tile edge as a fraction of the shorter canvas side. */
  readonly markScale: number;
  /** Frame the flip starts — the tile settles on screen before it turns. */
  readonly flipAtFrame: number;
  /** Frames the half-turn takes. */
  readonly flipDurationInFrames: number;
  /** CSS perspective in px at 1080 design scale. Lower reads as more 3D. */
  readonly perspective: number;
  readonly backgroundColor: string;
};

export const monogramFlipDefaultProps: MonogramFlipProps = {
  letters: "SB",
  caption: "One mark, two faces",
  axis: "y",
  markScale: 0.36,
  flipAtFrame: 26,
  flipDurationInFrames: 30,
  perspective: 1400,
  backgroundColor: BRAND.background,
};

export const MonogramFlip: FC<MonogramFlipProps> = ({
  letters,
  caption,
  axis,
  markScale,
  flipAtFrame,
  flipDurationInFrames,
  perspective,
  backgroundColor,
}) => {
  const frame = useBrandFrame(1);
  const { fps, width, height } = useVideoConfig();

  const shortSide = Math.min(width, height);
  const tileSize = shortSide * markScale;

  /** The tile arrives, and only then turns — two beats, not one. */
  const enter = spring({ frame, fps, delay: 3, config: SPRING_ENTER, durationInFrames: 26 });
  const turn = spring({
    frame,
    fps,
    delay: flipAtFrame,
    config: SPRING_ENTER,
    durationInFrames: flipDurationInFrames,
  });
  const angle = turn * 180;

  /**
   * How close the tile is to edge-on, 0 → 1 → 0. This is what drives the
   * sheen and the slight lift, so both are locked to the geometry rather than
   * keyed on their own timeline and left to drift.
   */
  const edgeOn = Math.sin((Math.min(1, Math.max(0, turn)) * Math.PI));

  const captionIn = spring({
    frame,
    fps,
    delay: flipAtFrame + flipDurationInFrames - 8,
    config: SPRING_SMOOTH,
    durationInFrames: 24,
  });

  const glow = interpolate(enter, [0, 1], [0.1, 0.75]) + 0.2 * edgeOn;
  const rotate = axis === "y" ? `rotateY(${angle}deg)` : `rotateX(${-angle}deg)`;
  const backPreRotate = axis === "y" ? "rotateY(180deg)" : "rotateX(180deg)";

  const faceStyle = {
    position: "absolute" as const,
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden" as const,
    WebkitBackfaceVisibility: "hidden" as const,
  };

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        <StagePlate glow={glow} backgroundColor={backgroundColor} gridTile={shortSide * 0.1} />
      </Sequence>

      <Sequence name="Flip" layout="none">
        <AbsoluteFill
          style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}
        >
          <div
            style={{
              perspective: perspective * (shortSide / 1080),
              opacity: enter,
              transform: `scale(${interpolate(enter, [0, 1], [0.8, 1])}) translateY(${-tileSize * 0.06 * edgeOn}px)`,
            }}
          >
            <div
              style={{
                position: "relative",
                width: tileSize,
                height: tileSize,
                transformStyle: "preserve-3d",
                transform: rotate,
              }}
            >
              <div style={faceStyle}>
                <MarkTile size={tileSize} glow={glow}>
                  <PitchGlyph width={tileSize * 0.66} />
                </MarkTile>
              </div>
              <div style={{ ...faceStyle, transform: backPreRotate }}>
                <MarkTile size={tileSize} glow={glow}>
                  <MonogramGlyph size={tileSize * 0.74} letters={letters} />
                </MarkTile>
              </div>

              {/* Sheen: brightest exactly when the tile is edge-on. */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: tileSize * 0.26,
                  background: `linear-gradient(115deg, ${courtGreen(0)} 30%, ${courtGreen(0.55)} 50%, ${courtGreen(0)} 70%)`,
                  opacity: 0.9 * edgeOn,
                  mixBlendMode: "screen",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>

          {caption.length > 0 ? (
            <div
              style={{
                marginTop: tileSize * 0.3,
                fontFamily: MONO_FONT,
                fontSize: tileSize * 0.09,
                fontWeight: 500,
                textTransform: "uppercase",
                color: chalk(0.44 * captionIn),
                opacity: captionIn,
                transform: `translateY(${interpolate(captionIn, [0, 1], [tileSize * 0.07, 0])}px)`,
              }}
            >
              <span
                style={{ letterSpacing: TRACKING_EYEBROW, marginRight: `-${TRACKING_EYEBROW}` }}
              >
                {caption}
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
