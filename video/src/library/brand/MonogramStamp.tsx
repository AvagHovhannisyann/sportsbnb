/**
 * MonogramStamp — the SB monogram drops in from above the frame and stamps
 * onto the court, throwing a dust ring and a shadow that settles under it. The
 * app-icon reveal: used in store screenshots, the "install the app" cut, and
 * as the badge animation on a newly verified venue.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_OUT_EXPO,
  MONO_FONT,
  NOISE_TILE,
  SPRING_SMOOTH,
  TRACKING_EYEBROW,
  chalk,
  courtGreen,
  ink,
  useBrandFrame,
} from "./brandKit";
import { MarkTile, MonogramGlyph, StagePlate } from "./BrandGeometry";

export type MonogramStampProps = {
  /** Two characters. Three or more stops reading at icon scale. */
  readonly letters: string;
  readonly caption: string;
  /** Tile edge as a fraction of the shorter canvas side. */
  readonly markScale: number;
  /** Scale the monogram falls from — above 2 it reads as coming at camera. */
  readonly fromScale: number;
  /** Degrees of tilt unwound on the way down. */
  readonly fromRotation: number;
  /** Dust rings thrown on impact. */
  readonly dustRings: number;
  readonly backgroundColor: string;
};

export const monogramStampDefaultProps: MonogramStampProps = {
  letters: "SB",
  caption: "sportsbnb",
  markScale: 0.36,
  fromScale: 2.7,
  fromRotation: 9,
  dustRings: 2,
  backgroundColor: BRAND.background,
};

/** Frame the drop starts. */
const DROP_IN = 3;
/** Frames the drop takes. Heavily damped — a stamp must not bounce. */
const DROP_FRAMES = 20;
/** Frame contact is made, and everything downstream is keyed off. */
const CONTACT = DROP_IN + DROP_FRAMES;

export const MonogramStamp: FC<MonogramStampProps> = ({
  letters,
  caption,
  markScale,
  fromScale,
  fromRotation,
  dustRings,
  backgroundColor,
}) => {
  const frame = useBrandFrame(1);
  const { fps, width, height } = useVideoConfig();

  const shortSide = Math.min(width, height);
  const tileSize = shortSide * markScale;

  /**
   * The drop. Critically damped and eased with the design system's own
   * ease-out-expo, so it accelerates down and *stops* — a spring with
   * overshoot here would read as a bounce, which is the opposite of a stamp.
   */
  const drop = spring({
    frame,
    fps,
    delay: DROP_IN,
    config: SPRING_SMOOTH,
    durationInFrames: DROP_FRAMES,
  });
  const eased = interpolate(drop, [0, 1], [0, 1], { easing: EASE_OUT_EXPO });

  /** The recoil: a short squash the frame after contact, and out. */
  const recoilIn = spring({
    frame,
    fps,
    delay: CONTACT,
    config: SPRING_SMOOTH,
    durationInFrames: 5,
  });
  const recoilOut = spring({
    frame,
    fps,
    delay: CONTACT + 5,
    config: { damping: 12, mass: 0.6, stiffness: 160 },
    durationInFrames: 20,
  });
  const recoil = recoilIn - recoilOut;

  const ringDraw = spring({
    frame,
    fps,
    delay: CONTACT + 2,
    config: SPRING_SMOOTH,
    durationInFrames: 22,
  });
  const captionIn = spring({
    frame,
    fps,
    delay: CONTACT + 10,
    config: SPRING_SMOOTH,
    durationInFrames: 22,
  });

  const scale = interpolate(eased, [0, 1], [fromScale, 1]) * (1 - 0.08 * recoil);
  const rotation = interpolate(eased, [0, 1], [fromRotation, 0]);
  const glow = interpolate(frame, [CONTACT - 4, CONTACT + 14], [0.1, 0.85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        <StagePlate glow={glow} backgroundColor={backgroundColor} gridTile={shortSide * 0.1} />
      </Sequence>

      <Sequence name="Dust" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {Array.from({ length: Math.max(0, dustRings) }, (_, i) => {
            const push = spring({
              frame,
              fps,
              delay: CONTACT + i * 4,
              config: SPRING_SMOOTH,
              durationInFrames: 30,
            });
            const size = interpolate(push, [0, 1], [tileSize, tileSize * (2.4 + i * 0.7)], {
              easing: EASE_OUT_EXPO,
            });
            const opacity = interpolate(push, [0, 0.1, 1], [0, 0.42 - i * 0.14, 0]);
            if (opacity <= 0) {
              return null;
            }
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: size,
                  height: size * 0.34,
                  borderRadius: "50%",
                  border: `${Math.max(1, tileSize * 0.01 * (1 - push))}px solid ${courtGreen(1)}`,
                  opacity,
                }}
              />
            );
          })}
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Monogram" layout="none">
        <AbsoluteFill
          style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}
        >
          {/* Contact shadow: tight and dark at rest, wide and soft in the air. */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              width: tileSize * interpolate(eased, [0, 1], [1.9, 1.05]),
              height: tileSize * 0.16,
              marginTop: tileSize * 0.62,
              borderRadius: "50%",
              background: `radial-gradient(ellipse at center, ${ink(interpolate(eased, [0, 1], [0.2, 0.8]))} 0%, transparent 72%)`,
              filter: `blur(${interpolate(eased, [0, 1], [tileSize * 0.06, tileSize * 0.02])}px)`,
            }}
          />
          <div style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}>
            <MarkTile size={tileSize} glow={glow}>
              <MonogramGlyph
                size={tileSize * 0.74}
                letters={letters}
                ring={1}
                ringReveal={ringDraw}
              />
            </MarkTile>
          </div>

          {caption.length > 0 ? (
            <div
              style={{
                position: "absolute",
                top: "50%",
                marginTop: tileSize * 0.86,
                fontFamily: MONO_FONT,
                fontSize: tileSize * 0.1,
                fontWeight: 500,
                textTransform: "uppercase",
                color: chalk(0.44 * captionIn),
                opacity: captionIn,
                transform: `translateY(${interpolate(captionIn, [0, 1], [tileSize * 0.08, 0])}px)`,
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
