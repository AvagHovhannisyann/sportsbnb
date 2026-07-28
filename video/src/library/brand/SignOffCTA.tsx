/**
 * SignOffCTA — the conversion end card: headline, supporting line and a
 * court-green call-to-action pill with a sheen crossing it, the mark holding
 * the right third. Tails the paid social cuts and the app-install videos, where
 * the sign-off has to ask for the click rather than just name the brand.
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
  TRACKING_TIGHT,
  chalk,
  courtGreen,
  ink,
  useBrandFrame,
} from "./brandKit";
import { MarkTile, PitchGlyph, StagePlate, WORDMARK_HEAD, WORDMARK_TAIL } from "./BrandGeometry";

export type SignOffCTAProps = {
  readonly eyebrow: string;
  readonly headline: string;
  readonly subhead: string;
  /** Text inside the pill. */
  readonly ctaLabel: string;
  readonly domain: string;
  readonly head: string;
  readonly tail: string;
  /** Tile edge as a fraction of canvas height. */
  readonly markScale: number;
  readonly backgroundColor: string;
};

export const signOffCTADefaultProps: SignOffCTAProps = {
  eyebrow: "Ready when you are",
  headline: "Your next match starts here",
  subhead: "Real availability, instant confirmation, no phone calls.",
  ctaLabel: "Book a pitch",
  domain: "sportsbnb.am",
  head: WORDMARK_HEAD,
  tail: WORDMARK_TAIL,
  markScale: 0.3,
  backgroundColor: BRAND.background,
};

export const SignOffCTA: FC<SignOffCTAProps> = ({
  eyebrow,
  headline,
  subhead,
  ctaLabel,
  domain,
  head,
  tail,
  markScale,
  backgroundColor,
}) => {
  const frame = useBrandFrame(1);
  const { fps, width, height } = useVideoConfig();

  const scale = width / 1920;
  const tileSize = height * markScale;
  const headSize = height * 0.09;

  const eyebrowIn = spring({ frame, fps, delay: 4, config: SPRING_SMOOTH, durationInFrames: 22 });
  const headlineIn = spring({ frame, fps, delay: 10, config: SPRING_ENTER, durationInFrames: 30 });
  const subheadIn = spring({ frame, fps, delay: 20, config: SPRING_SMOOTH, durationInFrames: 26 });
  const ctaIn = spring({ frame, fps, delay: 30, config: SPRING_POP, durationInFrames: 26 });
  const markIn = spring({ frame, fps, delay: 8, config: SPRING_ENTER, durationInFrames: 32 });
  const domainIn = spring({ frame, fps, delay: 44, config: SPRING_SMOOTH, durationInFrames: 24 });

  /** The sheen crosses the pill once, after it has landed. */
  const sheen = spring({ frame, fps, delay: 44, config: SPRING_SMOOTH, durationInFrames: 30 });

  const glow = interpolate(markIn + ctaIn, [0, 2], [0.12, 0.9]);
  const pillPadX = height * 0.045;
  const pillPadY = height * 0.028;

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        <StagePlate glow={glow} backgroundColor={backgroundColor} gridTile={128 * scale} />
      </Sequence>

      <Sequence name="Copy" layout="none">
        <AbsoluteFill
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: width * 0.1,
            paddingRight: width * 0.08,
            gap: width * 0.06,
          }}
        >
          <div style={{ flex: 1 }}>
            {eyebrow.length > 0 ? (
              <div
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: headSize * 0.24,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  color: courtGreen(0.95),
                  opacity: eyebrowIn,
                  transform: `translateX(${interpolate(eyebrowIn, [0, 1], [-24 * scale, 0])}px)`,
                  marginBottom: headSize * 0.34,
                }}
              >
                <span
                  style={{ letterSpacing: TRACKING_EYEBROW, marginRight: `-${TRACKING_EYEBROW}` }}
                >
                  {eyebrow}
                </span>
              </div>
            ) : null}

            <div
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: headSize,
                fontWeight: 700,
                letterSpacing: TRACKING_TIGHT,
                lineHeight: 1.05,
                color: BRAND.foreground,
                opacity: headlineIn,
                transform: `translateY(${interpolate(headlineIn, [0, 1], [headSize * 0.3, 0], {
                  easing: EASE_OUT_EXPO,
                })}px)`,
              }}
            >
              {headline}
            </div>

            {subhead.length > 0 ? (
              <div
                style={{
                  marginTop: headSize * 0.34,
                  fontFamily: DISPLAY_FONT,
                  fontSize: headSize * 0.34,
                  fontWeight: 500,
                  lineHeight: 1.35,
                  color: chalk(0.7),
                  opacity: subheadIn,
                  transform: `translateY(${interpolate(subheadIn, [0, 1], [headSize * 0.2, 0])}px)`,
                  maxWidth: width * 0.4,
                }}
              >
                {subhead}
              </div>
            ) : null}

            {/* The pill. Primary fill, ink label — the app's own button spec. */}
            <div
              style={{
                marginTop: headSize * 0.55,
                display: "inline-flex",
                alignItems: "center",
                gap: pillPadX * 0.5,
                position: "relative",
                overflow: "hidden",
                paddingLeft: pillPadX,
                paddingRight: pillPadX,
                paddingTop: pillPadY,
                paddingBottom: pillPadY,
                borderRadius: 999,
                backgroundColor: BRAND.primary,
                boxShadow: `0 0 ${60 * scale}px ${courtGreen(0.35 * ctaIn)}, 0 ${14 * scale}px ${34 * scale}px ${-10 * scale}px ${ink(0.7)}`,
                opacity: interpolate(ctaIn, [0, 0.2], [0, 1], { extrapolateRight: "clamp" }),
                transform: `scale(${interpolate(ctaIn, [0, 1], [0.82, 1])})`,
              }}
            >
              <span
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontSize: headSize * 0.34,
                  fontWeight: 700,
                  letterSpacing: TRACKING_TIGHT,
                  color: BRAND.background,
                  whiteSpace: "nowrap",
                }}
              >
                {ctaLabel}
              </span>
              <span
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontSize: headSize * 0.34,
                  fontWeight: 700,
                  color: BRAND.background,
                  transform: `translateX(${interpolate(ctaIn, [0, 1], [-8 * scale, 0])}px)`,
                }}
              >
                →
              </span>
              {/* Sheen, clipped to the pill by the parent's overflow. */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: "45%",
                  left: `${interpolate(sheen, [0, 1], [-60, 130])}%`,
                  background: `linear-gradient(105deg, ${chalk(0)} 0%, ${chalk(0.45)} 50%, ${chalk(0)} 100%)`,
                  opacity: interpolate(sheen, [0, 0.08, 0.92, 1], [0, 1, 1, 0]),
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              opacity: markIn,
              transform: `translateX(${interpolate(markIn, [0, 1], [60 * scale, 0], {
                easing: EASE_OUT_EXPO,
              })}px) scale(${interpolate(markIn, [0, 1], [0.86, 1])})`,
            }}
          >
            <MarkTile size={tileSize} glow={glow}>
              <PitchGlyph width={tileSize * 0.66} dot={markIn} />
            </MarkTile>
            <div
              style={{
                marginTop: tileSize * 0.18,
                fontFamily: DISPLAY_FONT,
                fontSize: tileSize * 0.16,
                fontWeight: 700,
                letterSpacing: TRACKING_TIGHT,
                opacity: domainIn,
              }}
            >
              <span style={{ color: BRAND.foreground }}>{head}</span>
              <span style={{ color: BRAND.primary }}>{tail}</span>
            </div>
            <div
              style={{
                marginTop: tileSize * 0.07,
                fontFamily: MONO_FONT,
                fontSize: tileSize * 0.1,
                color: chalk(0.45),
                opacity: domainIn,
              }}
            >
              {domain}
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Grain" layout="none">
        <AbsoluteFill style={{ backgroundImage: NOISE_TILE, opacity: 0.05 }} />
      </Sequence>
    </AbsoluteFill>
  );
};
