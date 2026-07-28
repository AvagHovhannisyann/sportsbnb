/**
 * LogoMaskReveal — a diagonal wipe uncovers the lockup, a court-green light
 * bar riding the leading edge as it crosses. The transition-friendly build-on:
 * used when the logo has to appear *out of* footage rather than off black, e.g.
 * the end plate of venue tour clips and the hand-off card between reel scenes.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  NOISE_TILE,
  SPRING_SMOOTH,
  TRACKING_EYEBROW,
  TRACKING_TIGHTER,
  chalk,
  courtGreen,
  useBrandFrame,
} from "./brandKit";
import {
  MarkTile,
  PitchGlyph,
  StagePlate,
  WORDMARK_HEAD,
  WORDMARK_TAIL,
} from "./BrandGeometry";

export type LogoMaskRevealProps = {
  readonly head: string;
  readonly tail: string;
  readonly tagline: string;
  /** Wipe direction in CSS gradient degrees. 115 sweeps up-and-right. */
  readonly angle: number;
  /** Width of the soft edge, in percent of the gradient axis. */
  readonly softness: number;
  readonly edgeColor: string;
  /** Frames the mark's wipe takes. The wordmark follows on a second pass. */
  readonly wipeDurationInFrames: number;
  readonly markScale: number;
  readonly backgroundColor: string;
};

export const logoMaskRevealDefaultProps: LogoMaskRevealProps = {
  head: WORDMARK_HEAD,
  tail: WORDMARK_TAIL,
  tagline: "Yerevan · Gyumri · Vanadzor",
  angle: 115,
  softness: 13,
  edgeColor: BRAND.primary,
  wipeDurationInFrames: 28,
  markScale: 0.34,
  backgroundColor: BRAND.background,
};

/**
 * Builds the pair of CSS images that make one wipe: a mask that has revealed
 * `p` of the axis, and a bright band sitting exactly on its leading edge.
 *
 * Both are generated from the same numbers, which is the point — a wipe whose
 * highlight is authored separately drifts off its own edge within a few frames.
 */
const wipeImages = (
  p: number,
  angle: number,
  softness: number,
  edgeColor: string,
): { mask: string; edge: string; edgeOpacity: number } => {
  /** Overshoot the axis at both ends so the band clears the frame entirely. */
  const front = -softness + p * (100 + 2 * softness);
  const mask = `linear-gradient(${angle}deg, #000 ${front - softness}%, transparent ${front + softness * 0.35}%)`;
  const edge = `linear-gradient(${angle}deg, ${courtGreen(0)} ${front - softness * 1.3}%, ${edgeColor} ${front - softness * 0.15}%, ${courtGreen(0)} ${front + softness * 0.5}%)`;
  /** The band exists only while the wipe is actually travelling. */
  const edgeOpacity = interpolate(p, [0, 0.06, 0.9, 1], [0, 0.85, 0.6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { mask, edge, edgeOpacity };
};

export const LogoMaskReveal: FC<LogoMaskRevealProps> = ({
  head,
  tail,
  tagline,
  angle,
  softness,
  edgeColor,
  wipeDurationInFrames,
  markScale,
  backgroundColor,
}) => {
  const frame = useBrandFrame(1);
  const { fps, width, height } = useVideoConfig();

  const shortSide = Math.min(width, height);
  const tileSize = shortSide * markScale;
  const wordSize = tileSize * 0.29;

  /** Critically damped: a wipe that overshoots would uncover and re-cover. */
  const markWipe = spring({
    frame,
    fps,
    delay: 4,
    config: SPRING_SMOOTH,
    durationInFrames: wipeDurationInFrames,
  });
  /** Second pass, 40% of a wipe later — the lockup resolves top-down. */
  const wordWipe = spring({
    frame,
    fps,
    delay: 4 + Math.round(wipeDurationInFrames * 0.4),
    config: SPRING_SMOOTH,
    durationInFrames: wipeDurationInFrames,
  });
  const taglineWipe = spring({
    frame,
    fps,
    delay: 4 + Math.round(wipeDurationInFrames * 0.75),
    config: SPRING_SMOOTH,
    durationInFrames: wipeDurationInFrames,
  });

  const mark = wipeImages(markWipe, angle, softness, edgeColor);
  const word = wipeImages(wordWipe, angle, softness, edgeColor);
  const tag = wipeImages(taglineWipe, angle, softness, edgeColor);

  const glow = interpolate(markWipe, [0, 1], [0.15, 0.85]);

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        <StagePlate glow={glow} backgroundColor={backgroundColor} gridTile={shortSide * 0.09} />
      </Sequence>

      <Sequence name="Mark" layout="none">
        <AbsoluteFill
          style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}
        >
          <div style={{ position: "relative" }}>
            <div style={{ WebkitMaskImage: mark.mask, maskImage: mark.mask }}>
              <MarkTile size={tileSize} glow={glow}>
                <PitchGlyph width={tileSize * 0.66} />
              </MarkTile>
            </div>
            {/* Leading edge, clipped to the tile so it reads as light crossing
                the object rather than a bar drawn over the whole frame. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: tileSize * 0.26,
                backgroundImage: mark.edge,
                opacity: mark.edgeOpacity,
                mixBlendMode: "screen",
              }}
            />
          </div>

          <div
            style={{
              marginTop: tileSize * 0.28,
              position: "relative",
              WebkitMaskImage: word.mask,
              maskImage: word.mask,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                fontFamily: DISPLAY_FONT,
                fontSize: wordSize,
                fontWeight: 700,
                letterSpacing: TRACKING_TIGHTER,
                lineHeight: 1,
              }}
            >
              <span style={{ color: BRAND.foreground }}>{head}</span>
              <span
                style={{
                  color: BRAND.primary,
                  textShadow: `0 0 ${wordSize * 0.55}px ${courtGreen(0.3)}`,
                }}
              >
                {tail}
              </span>
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: word.edge,
                opacity: word.edgeOpacity * 0.7,
                mixBlendMode: "screen",
              }}
            />
          </div>

          {tagline.length > 0 ? (
            <div
              style={{
                marginTop: tileSize * 0.13,
                fontFamily: MONO_FONT,
                fontSize: wordSize * 0.26,
                fontWeight: 500,
                textTransform: "uppercase",
                color: chalk(0.42),
                WebkitMaskImage: tag.mask,
                maskImage: tag.mask,
              }}
            >
              <span style={{ letterSpacing: TRACKING_EYEBROW, marginRight: `-${TRACKING_EYEBROW}` }}>
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
