/**
 * SignOffCredits — the long-form sign-off: a credits block whose rows rule
 * themselves in one after another under the mark, closing on a "made in" line.
 * Tails the launch film, the partner case-study videos and the annual recap,
 * anywhere the end card has to carry attributions rather than a CTA.
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
import { MarkTile, MonogramGlyph, StagePlate } from "./BrandGeometry";

export type CreditRow = {
  readonly label: string;
  readonly value: string;
};

export type SignOffCreditsProps = {
  readonly title: string;
  /** Label/value pairs, ruled in one after another. */
  readonly rows: readonly CreditRow[];
  readonly footer: string;
  /** Tile edge as a fraction of canvas height. */
  readonly markScale: number;
  /** Frames between consecutive rows arriving. */
  readonly staggerInFrames: number;
  readonly backgroundColor: string;
};

export const signOffCreditsDefaultProps: SignOffCreditsProps = {
  title: "SportsBnB",
  rows: [
    { label: "Venues live", value: "142 across 6 cities" },
    { label: "Booked this year", value: "38,400 hours" },
    { label: "Average confirmation", value: "under 90 seconds" },
    { label: "Owner payouts", value: "weekly, no fees" },
  ],
  footer: "Made in Yerevan",
  markScale: 0.13,
  staggerInFrames: 11,
  backgroundColor: BRAND.background,
};

const ROWS_IN = 22;

export const SignOffCredits: FC<SignOffCreditsProps> = ({
  title,
  rows,
  footer,
  markScale,
  staggerInFrames,
  backgroundColor,
}) => {
  const frame = useBrandFrame(1);
  const { fps, width, height } = useVideoConfig();

  const scale = width / 1920;
  const tileSize = height * markScale;
  const rowSize = height * 0.042;

  const markIn = spring({ frame, fps, delay: 3, config: SPRING_ENTER, durationInFrames: 28 });
  const titleIn = spring({ frame, fps, delay: 10, config: SPRING_ENTER, durationInFrames: 28 });
  const lastRowAt = ROWS_IN + Math.max(0, rows.length - 1) * staggerInFrames + 24;
  const footerIn = spring({
    frame,
    fps,
    delay: lastRowAt,
    config: SPRING_SMOOTH,
    durationInFrames: 26,
  });

  const glow = interpolate(frame, [0, lastRowAt], [0.1, 0.75], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        <StagePlate glow={glow} backgroundColor={backgroundColor} gridTile={128 * scale} />
      </Sequence>

      <Sequence name="Credits" layout="none">
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              opacity: markIn,
              transform: `scale(${interpolate(markIn, [0, 1], [0.8, 1])})`,
            }}
          >
            <MarkTile size={tileSize} glow={glow}>
              <MonogramGlyph size={tileSize * 0.78} />
            </MarkTile>
          </div>

          <div
            style={{
              marginTop: tileSize * 0.34,
              fontFamily: DISPLAY_FONT,
              fontSize: rowSize * 1.5,
              fontWeight: 700,
              letterSpacing: TRACKING_TIGHT,
              color: BRAND.foreground,
              opacity: titleIn,
              transform: `translateY(${interpolate(titleIn, [0, 1], [rowSize * 0.5, 0])}px)`,
            }}
          >
            {title}
          </div>

          <div style={{ marginTop: rowSize * 1.4, width: width * 0.46 }}>
            {rows.map((row, i) => {
              const rowIn = spring({
                frame,
                fps,
                delay: ROWS_IN + i * staggerInFrames,
                config: SPRING_SMOOTH,
                durationInFrames: 26,
              });
              return (
                <div
                  key={`${row.label}-${i}`}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    paddingTop: rowSize * 0.52,
                    paddingBottom: rowSize * 0.52,
                    opacity: rowIn,
                    transform: `translateY(${interpolate(rowIn, [0, 1], [rowSize * 0.6, 0])}px)`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: rowSize * 0.62,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      color: chalk(0.42),
                    }}
                  >
                    <span
                      style={{
                        letterSpacing: TRACKING_EYEBROW,
                        marginRight: `-${TRACKING_EYEBROW}`,
                      }}
                    >
                      {row.label}
                    </span>
                  </span>
                  <span
                    style={{
                      fontFamily: DISPLAY_FONT,
                      fontSize: rowSize,
                      fontWeight: 600,
                      letterSpacing: TRACKING_TIGHT,
                      color: BRAND.foreground,
                    }}
                  >
                    {row.value}
                  </span>
                  {/* The rule draws with the row rather than after it. */}
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: Math.max(1, 1 * scale),
                      backgroundColor: hairline(1),
                      transformOrigin: "left center",
                      transform: `scaleX(${rowIn})`,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {footer.length > 0 ? (
            <div
              style={{
                marginTop: rowSize * 1.5,
                display: "flex",
                alignItems: "center",
                gap: rowSize * 0.5,
                opacity: footerIn,
                transform: `translateY(${interpolate(footerIn, [0, 1], [rowSize * 0.4, 0])}px)`,
              }}
            >
              <span
                style={{
                  width: rowSize * 0.28,
                  height: rowSize * 0.28,
                  borderRadius: "50%",
                  backgroundColor: BRAND.primary,
                  boxShadow: `0 0 ${rowSize}px ${courtGreen(0.6)}`,
                }}
              />
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: rowSize * 0.6,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  color: chalk(0.5),
                }}
              >
                <span
                  style={{ letterSpacing: TRACKING_EYEBROW, marginRight: `-${TRACKING_EYEBROW}` }}
                >
                  {footer}
                </span>
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
