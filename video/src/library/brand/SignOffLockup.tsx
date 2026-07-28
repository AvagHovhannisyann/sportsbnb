/**
 * SignOffLockup — the standard end card: mark, wordmark and domain settling on
 * a court whose lines converge behind them. This is the last four seconds of
 * every SportsBnB film — the feature reel, the owner pitch and each venue
 * promo all cut to this so the sign-off is identical across the library.
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
  SPRING_SMOOTH,
  TRACKING_EYEBROW,
  TRACKING_TIGHTER,
  chalk,
  courtGreen,
  hairline,
  useBrandFrame,
} from "./brandKit";
import { MarkTile, PitchGlyph, StagePlate, WORDMARK_HEAD, WORDMARK_TAIL } from "./BrandGeometry";

export type SignOffLockupProps = {
  readonly head: string;
  readonly tail: string;
  /** Domain line under the wordmark. */
  readonly domain: string;
  /** Mono caps line under the domain. Empty string hides it. */
  readonly footnote: string;
  /** Tile edge as a fraction of canvas height. */
  readonly markScale: number;
  /** Converging court lines behind the lockup. 0 disables them. */
  readonly rayCount: number;
  readonly backgroundColor: string;
};

export const signOffLockupDefaultProps: SignOffLockupProps = {
  head: WORDMARK_HEAD,
  tail: WORDMARK_TAIL,
  domain: "sportsbnb.am",
  footnote: "Book a pitch in Yerevan tonight",
  markScale: 0.2,
  rayCount: 7,
  backgroundColor: BRAND.background,
};

const MARK_IN = 4;

export const SignOffLockup: FC<SignOffLockupProps> = ({
  head,
  tail,
  domain,
  footnote,
  markScale,
  rayCount,
  backgroundColor,
}) => {
  const frame = useBrandFrame(1);
  const { fps, width, height } = useVideoConfig();

  const scale = width / 1920;
  const tileSize = height * markScale;
  const wordSize = tileSize * 0.42;

  const markIn = spring({
    frame,
    fps,
    delay: MARK_IN,
    config: SPRING_ENTER,
    durationInFrames: 28,
  });
  const wordIn = spring({ frame, fps, delay: 14, config: SPRING_ENTER, durationInFrames: 28 });
  const tailIn = spring({ frame, fps, delay: 19, config: SPRING_ENTER, durationInFrames: 28 });
  const ruleIn = spring({ frame, fps, delay: 26, config: SPRING_SMOOTH, durationInFrames: 26 });
  const domainIn = spring({ frame, fps, delay: 32, config: SPRING_SMOOTH, durationInFrames: 24 });
  const footIn = spring({ frame, fps, delay: 40, config: SPRING_SMOOTH, durationInFrames: 24 });

  const glow = interpolate(markIn + wordIn, [0, 2], [0.1, 0.85]);
  const lockupWidth = wordSize * (head.length + tail.length) * 0.58;

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        <StagePlate glow={glow} backgroundColor={backgroundColor} gridTile={0} />
      </Sequence>

      <Sequence name="Rays" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {Array.from({ length: Math.max(0, rayCount) }, (_, i) => {
            /** Rays open outward one after another, 3 frames apart. */
            const open = spring({
              frame,
              fps,
              delay: MARK_IN + 6 + i * 3,
              config: SPRING_SMOOTH,
              durationInFrames: 34,
            });
            const spreadStep = 180 / Math.max(1, rayCount);
            const angle = -90 + spreadStep * (i + 0.5);
            const length = interpolate(open, [0, 1], [0, width * 0.75], {
              easing: EASE_OUT_EXPO,
            });
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: length,
                  height: Math.max(1, 1.4 * scale),
                  backgroundImage: `linear-gradient(90deg, ${hairline(0)} 0%, ${courtGreen(0.22)} 45%, ${hairline(0)} 100%)`,
                  transformOrigin: "left center",
                  transform: `rotate(${angle}deg)`,
                  opacity: 0.7 * open,
                }}
              />
            );
          })}
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Lockup" layout="none">
        <AbsoluteFill
          style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}
        >
          <div
            style={{
              opacity: markIn,
              transform: `scale(${interpolate(markIn, [0, 1], [0.7, 1])})`,
            }}
          >
            <MarkTile size={tileSize} glow={glow}>
              <PitchGlyph width={tileSize * 0.66} dot={markIn} />
            </MarkTile>
          </div>

          <div
            style={{
              marginTop: tileSize * 0.3,
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
                transform: `translateY(${interpolate(wordIn, [0, 1], [wordSize * 0.28, 0])}px)`,
              }}
            >
              {head}
            </span>
            <span
              style={{
                display: "inline-block",
                color: BRAND.primary,
                opacity: tailIn,
                transform: `translateY(${interpolate(tailIn, [0, 1], [wordSize * 0.28, 0])}px)`,
                textShadow: `0 0 ${wordSize * 0.55}px ${courtGreen(0.32 * tailIn)}`,
              }}
            >
              {tail}
            </span>
          </div>

          <div
            style={{
              marginTop: wordSize * 0.42,
              width: lockupWidth,
              height: Math.max(1, 2 * scale),
              backgroundColor: hairline(1),
              transform: `scaleX(${ruleIn})`,
            }}
          />

          <div
            style={{
              marginTop: wordSize * 0.36,
              fontFamily: MONO_FONT,
              fontSize: wordSize * 0.3,
              fontWeight: 500,
              color: courtGreen(0.95),
              opacity: domainIn,
              transform: `translateY(${interpolate(domainIn, [0, 1], [wordSize * 0.16, 0])}px)`,
            }}
          >
            <span style={{ letterSpacing: "0.06em" }}>{domain}</span>
          </div>

          {footnote.length > 0 ? (
            <div
              style={{
                marginTop: wordSize * 0.3,
                fontFamily: MONO_FONT,
                fontSize: wordSize * 0.2,
                fontWeight: 500,
                textTransform: "uppercase",
                color: chalk(0.4),
                opacity: footIn,
              }}
            >
              <span
                style={{ letterSpacing: TRACKING_EYEBROW, marginRight: `-${TRACKING_EYEBROW}` }}
              >
                {footnote}
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
