/**
 * StingerShutter — court-green blades slam shut from alternating sides, hold
 * the frame long enough for the mark to flash, then clear the other way. The
 * high-energy scene change: used between highlight cuts in match recaps and
 * between the three panels of the "how it works" explainer.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_OUT_EXPO,
  NOISE_TILE,
  SPRING_SMOOTH,
  courtGreen,
  hairline,
  ink,
  useBrandFrame,
} from "./brandKit";
import { MarkTile, MonogramGlyph } from "./BrandGeometry";

export type StingerShutterProps = {
  /** How many blades split the frame. */
  readonly bladeCount: number;
  /** Frames between consecutive blades starting to close. */
  readonly staggerInFrames: number;
  /** Frames the frame stays fully covered before the blades clear. */
  readonly holdInFrames: number;
  readonly bladeColor: string;
  readonly edgeColor: string;
  readonly showMark: boolean;
  /** Tile edge as a fraction of canvas height. */
  readonly markScale: number;
};

export const stingerShutterDefaultProps: StingerShutterProps = {
  bladeCount: 6,
  staggerInFrames: 2,
  holdInFrames: 6,
  bladeColor: BRAND.background,
  edgeColor: BRAND.primary,
  showMark: true,
  markScale: 0.17,
};

const CLOSE_AT = 1;

export const StingerShutter: FC<StingerShutterProps> = ({
  bladeCount,
  staggerInFrames,
  holdInFrames,
  bladeColor,
  edgeColor,
  showMark,
  markScale,
}) => {
  const frame = useBrandFrame(0.5);
  const { fps, width, height } = useVideoConfig();

  const scale = width / 1920;
  const blades = Math.max(1, Math.round(bladeCount));
  const bladeHeight = height / blades;
  const tileSize = height * markScale;

  const closeSpan = 16;
  /** The frame at which the *last* blade has finished closing. */
  const closedAt = CLOSE_AT + (blades - 1) * staggerInFrames + closeSpan;
  const openAt = closedAt + holdInFrames;

  /** Fully-covered window, used for the mark. Zero before and after. */
  const lastClose = spring({
    frame,
    fps,
    delay: CLOSE_AT + (blades - 1) * staggerInFrames,
    config: SPRING_SMOOTH,
    durationInFrames: closeSpan,
  });
  const firstOpen = spring({
    frame,
    fps,
    delay: openAt,
    config: SPRING_SMOOTH,
    durationInFrames: closeSpan,
  });
  const covered = Math.max(0, lastClose - firstOpen);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Sequence name="Blades" layout="none">
        {Array.from({ length: blades }, (_, i) => {
          /** Alternating sides — the shutter must interlock, not sweep. */
          const dir = i % 2 === 0 ? 1 : -1;
          const close = spring({
            frame,
            fps,
            delay: CLOSE_AT + i * staggerInFrames,
            config: SPRING_SMOOTH,
            durationInFrames: closeSpan,
          });
          /** Blades clear in reverse order, so the shutter unzips. */
          const open = spring({
            frame,
            fps,
            delay: openAt + (blades - 1 - i) * staggerInFrames,
            config: SPRING_SMOOTH,
            durationInFrames: closeSpan,
          });
          const offset =
            interpolate(close, [0, 1], [dir * 112, 0], { easing: EASE_OUT_EXPO }) +
            interpolate(open, [0, 1], [0, -dir * 112], { easing: EASE_OUT_EXPO });

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 0,
                top: i * bladeHeight,
                width: "100%",
                /** Overlap by a pixel: blade seams must never show a hairline. */
                height: bladeHeight + 1,
                transform: `translateX(${offset}%)`,
                backgroundColor: bladeColor,
                borderTop: `1px solid ${hairline(0.5)}`,
                boxShadow: `0 0 ${40 * scale}px ${ink(0.7)}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(${dir > 0 ? 90 : 270}deg, ${courtGreen(0.12)} 0%, transparent 55%)`,
                }}
              />
              {/* Leading edge on the side the blade arrived from. */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: dir > 0 ? 0 : undefined,
                  right: dir > 0 ? undefined : 0,
                  width: Math.max(3, 7 * scale),
                  backgroundColor: edgeColor,
                  boxShadow: `0 0 ${34 * scale}px ${courtGreen(0.7)}`,
                }}
              />
            </div>
          );
        })}
      </Sequence>

      {showMark ? (
        <Sequence name="Flash" layout="none">
          <AbsoluteFill
            style={{
              alignItems: "center",
              justifyContent: "center",
              opacity: covered,
            }}
          >
            <div
              style={{
                position: "absolute",
                width: tileSize * 3.4,
                height: tileSize * 3.4,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${courtGreen(0.22 * covered)} 0%, transparent 68%)`,
              }}
            />
            <div style={{ transform: `scale(${interpolate(covered, [0, 1], [0.7, 1])})` }}>
              <MarkTile size={tileSize} glow={covered}>
                <MonogramGlyph size={tileSize * 0.76} />
              </MarkTile>
            </div>
          </AbsoluteFill>
        </Sequence>
      ) : null}

      <Sequence name="Grain" layout="none">
        <AbsoluteFill
          style={{ backgroundImage: NOISE_TILE, opacity: 0.05 * covered, pointerEvents: "none" }}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
