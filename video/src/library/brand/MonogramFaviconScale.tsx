/**
 * MonogramFaviconScale — the same mark stepped down 512 → 16px, each size
 * springing in in turn, with the pictogram handing over to the monogram at the
 * size where its detail stops surviving. The proof slide in the brand
 * guidelines video and the asset-handoff clip that ships with the icon set.
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
  TRACKING_TIGHT,
  chalk,
  courtGreen,
  hairline,
  useBrandFrame,
} from "./brandKit";
import { MarkTile, MonogramGlyph, PitchGlyph, StagePlate } from "./BrandGeometry";

export type MonogramFaviconScaleProps = {
  /** Icon edges in px, largest first. Rendered at 1920-wide design scale. */
  readonly sizes: readonly number[];
  /**
   * Below this edge the full pitch pictogram is replaced by the two-stroke
   * monogram. This is the actual design rule the clip exists to show.
   */
  readonly pictogramFloorPx: number;
  readonly title: string;
  readonly eyebrow: string;
  readonly showLabels: boolean;
  /** Frames between consecutive icons arriving. */
  readonly staggerInFrames: number;
  readonly backgroundColor: string;
};

export const monogramFaviconScaleDefaultProps: MonogramFaviconScaleProps = {
  sizes: [512, 256, 128, 64, 32, 16],
  pictogramFloorPx: 64,
  title: "One mark, every size",
  eyebrow: "Identity · icon set",
  showLabels: true,
  staggerInFrames: 7,
  backgroundColor: BRAND.background,
};

const ROW_IN = 12;

export const MonogramFaviconScale: FC<MonogramFaviconScaleProps> = ({
  sizes,
  pictogramFloorPx,
  title,
  eyebrow,
  showLabels,
  staggerInFrames,
  backgroundColor,
}) => {
  const frame = useBrandFrame(1);
  const { fps, width, height } = useVideoConfig();

  const scale = width / 1920;
  const titleSize = height * 0.062;

  const eyebrowIn = spring({ frame, fps, delay: 2, config: SPRING_SMOOTH, durationInFrames: 20 });
  const titleIn = spring({ frame, fps, delay: 6, config: SPRING_ENTER, durationInFrames: 26 });
  const baselineIn = spring({
    frame,
    fps,
    delay: ROW_IN - 4,
    config: SPRING_SMOOTH,
    durationInFrames: 26,
  });

  const lastIn = ROW_IN + Math.max(0, sizes.length - 1) * staggerInFrames + 24;
  const glow = interpolate(frame, [ROW_IN, lastIn], [0.1, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        <StagePlate glow={glow} backgroundColor={backgroundColor} gridTile={128 * scale} />
      </Sequence>

      <Sequence name="Heading" layout="none">
        <AbsoluteFill style={{ alignItems: "center" }}>
          <div style={{ marginTop: height * 0.13, textAlign: "center" }}>
            <div
              style={{
                fontFamily: MONO_FONT,
                fontSize: titleSize * 0.26,
                fontWeight: 500,
                textTransform: "uppercase",
                color: courtGreen(0.9 * eyebrowIn),
                opacity: eyebrowIn,
                marginBottom: titleSize * 0.34,
              }}
            >
              <span
                style={{ letterSpacing: TRACKING_EYEBROW, marginRight: `-${TRACKING_EYEBROW}` }}
              >
                {eyebrow}
              </span>
            </div>
            <div
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: titleSize,
                fontWeight: 700,
                letterSpacing: TRACKING_TIGHT,
                color: BRAND.foreground,
                opacity: titleIn,
                transform: `translateY(${interpolate(titleIn, [0, 1], [titleSize * 0.3, 0])}px)`,
              }}
            >
              {title}
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Icon row" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "flex-end",
              gap: 56 * scale,
              marginTop: height * 0.07,
            }}
          >
            {/* Shared baseline — the icons sit on a line, not in mid-air. */}
            <div
              style={{
                position: "absolute",
                left: -60 * scale,
                right: -60 * scale,
                bottom: showLabels ? -34 * scale : -18 * scale,
                height: Math.max(1, 2 * scale),
                backgroundColor: hairline(1),
                transformOrigin: "center",
                transform: `scaleX(${baselineIn})`,
              }}
            />

            {sizes.map((px, i) => {
              const arrive = spring({
                frame,
                fps,
                delay: ROW_IN + i * staggerInFrames,
                config: SPRING_ENTER,
                durationInFrames: 26,
              });
              const edge = px * scale;
              const usesPictogram = px >= pictogramFloorPx;
              return (
                <div
                  key={px}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    opacity: arrive,
                    transform: `translateY(${interpolate(arrive, [0, 1], [40 * scale, 0])}px) scale(${interpolate(
                      arrive,
                      [0, 1],
                      [0.7, 1],
                    )})`,
                  }}
                >
                  <MarkTile size={edge} glow={glow * arrive} radiusRatio={0.24}>
                    {usesPictogram ? (
                      <PitchGlyph
                        width={edge * 0.66}
                        strokeWidth={interpolate(px, [64, 512], [3.6, 2.2], {
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        })}
                        dot={px >= 128 ? 1 : 0}
                      />
                    ) : (
                      <MonogramGlyph size={edge * 0.86} ring={px >= 32 ? 1 : 0} />
                    )}
                  </MarkTile>
                  {showLabels ? (
                    <div
                      style={{
                        marginTop: 18 * scale,
                        fontFamily: MONO_FONT,
                        fontSize: 15 * scale,
                        fontWeight: 500,
                        color: usesPictogram ? chalk(0.5) : courtGreen(0.9),
                        letterSpacing: "0.08em",
                      }}
                    >
                      {px}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Footnote" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end" }}>
          <div
            style={{
              marginBottom: height * 0.09,
              fontFamily: MONO_FONT,
              fontSize: 17 * scale,
              color: chalk(0.42),
              opacity: spring({
                frame,
                fps,
                delay: lastIn - 6,
                config: SPRING_SMOOTH,
                durationInFrames: 22,
              }),
            }}
          >
            Pictogram down to {pictogramFloorPx}px · monogram below it
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Grain" layout="none">
        <AbsoluteFill style={{ backgroundImage: NOISE_TILE, opacity: 0.05 }} />
      </Sequence>
    </AbsoluteFill>
  );
};
