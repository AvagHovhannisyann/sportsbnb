/**
 * StingerLogoPop — an ink disc blows out from the centre to swallow the frame,
 * the mark punches in on a burst of court-green streaks, and the disc collapses
 * away. The branded scene change: used where a cut should *say the name*, e.g.
 * between the problem and solution halves of the pitch film.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_OUT_EXPO,
  NOISE_TILE,
  SPRING_POP,
  SPRING_SMOOTH,
  courtGreen,
  cyan,
  ink,
  noise,
  useBrandFrame,
} from "./brandKit";
import { MarkTile, PitchGlyph } from "./BrandGeometry";

export type StingerLogoPopProps = {
  /** Streaks fired from behind the mark. */
  readonly streakCount: number;
  /** Seed for the deterministic streak lengths and angles. */
  readonly seed: number;
  /** Tile edge as a fraction of canvas height. */
  readonly markScale: number;
  readonly discColor: string;
  readonly streakColor: string;
  /** Frames the disc takes to swallow the frame. */
  readonly coverDurationInFrames: number;
};

export const stingerLogoPopDefaultProps: StingerLogoPopProps = {
  streakCount: 22,
  seed: 5,
  markScale: 0.2,
  discColor: BRAND.background,
  streakColor: BRAND.primary,
  coverDurationInFrames: 14,
};

export const StingerLogoPop: FC<StingerLogoPopProps> = ({
  streakCount,
  seed,
  markScale,
  discColor,
  streakColor,
  coverDurationInFrames,
}) => {
  const frame = useBrandFrame(0.5);
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const scale = width / 1920;
  const tileSize = height * markScale;
  /** Diameter that certainly covers the frame from the centre outward. */
  const coverDiameter = Math.sqrt(width * width + height * height) * 1.05;

  const openAt = Math.max(coverDurationInFrames + 6, Math.round(durationInFrames * 0.58));

  const cover = spring({
    frame,
    fps,
    config: SPRING_SMOOTH,
    durationInFrames: coverDurationInFrames,
  });
  const uncover = spring({
    frame,
    fps,
    delay: openAt,
    config: SPRING_SMOOTH,
    durationInFrames: coverDurationInFrames,
  });
  /** 0 → 1 → 0. The disc grows to cover, then collapses back to nothing. */
  const disc = Math.max(0, cover - uncover);

  /** The mark punches in a beat *after* the frame is covered, not with it. */
  const punch = spring({
    frame,
    fps,
    delay: Math.round(coverDurationInFrames * 0.65),
    config: SPRING_POP,
    durationInFrames: 18,
  });
  const markOut = spring({
    frame,
    fps,
    delay: openAt - 2,
    config: SPRING_SMOOTH,
    durationInFrames: 10,
  });
  const markAlive = Math.max(0, punch - markOut);

  const streaks = Math.max(0, streakCount);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Sequence name="Disc" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              width: coverDiameter,
              height: coverDiameter,
              borderRadius: "50%",
              backgroundColor: discColor,
              transform: `scale(${interpolate(disc, [0, 1], [0, 1], { easing: EASE_OUT_EXPO })})`,
              boxShadow: `0 0 ${120 * scale}px ${30 * scale}px ${courtGreen(0.25 * disc)}`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${courtGreen(0.12)} 0%, ${ink(0)} 62%)`,
              }}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Streaks" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {Array.from({ length: streaks }, (_, i) => {
            const roll = (salt: number) => noise(i * 5.19 + seed * 13.7 + salt);
            /** Fired in three waves, so the burst has depth. */
            const wave = i % 3;
            const fire = spring({
              frame,
              fps,
              delay: Math.round(coverDurationInFrames * 0.6) + wave * 3,
              config: SPRING_SMOOTH,
              durationInFrames: 22,
            });
            const life = Math.max(0, fire - markOut);
            if (life <= 0) {
              return null;
            }
            const angle = (i / streaks) * 360 + (roll(1) - 0.5) * 14;
            const inner = tileSize * (0.85 + roll(2) * 0.5);
            const travel = interpolate(life, [0, 1], [0, height * (0.35 + roll(3) * 0.45)], {
              easing: EASE_OUT_EXPO,
            });
            const len = height * (0.05 + roll(4) * 0.09) * (1 - life * 0.55);
            const tint = i % 5 === 0 ? cyan(0.7) : streakColor;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: len,
                  height: Math.max(2, 4 * scale * (1 - life * 0.6)),
                  borderRadius: 999,
                  backgroundColor: tint,
                  opacity: interpolate(life, [0, 0.15, 1], [0, 0.9, 0]),
                  transformOrigin: "left center",
                  transform: `rotate(${angle}deg) translateX(${inner + travel}px)`,
                }}
              />
            );
          })}
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Mark" layout="none">
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            opacity: markAlive,
            transform: `scale(${interpolate(markAlive, [0, 1], [0.55, 1])}) rotate(${interpolate(
              markAlive,
              [0, 1],
              [-10, 0],
            )}deg)`,
          }}
        >
          <MarkTile size={tileSize} glow={markAlive}>
            <PitchGlyph width={tileSize * 0.66} dot={markAlive} />
          </MarkTile>
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Grain" layout="none">
        <AbsoluteFill
          style={{ backgroundImage: NOISE_TILE, opacity: 0.05 * disc, pointerEvents: "none" }}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
