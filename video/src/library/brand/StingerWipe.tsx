/**
 * StingerWipe — a hard diagonal wipe that crosses the frame, covers it
 * completely at the midpoint with the mark on the panel, and carries on out.
 * The workhorse scene change: dropped between chapters of the feature reel and
 * between venues in the discovery montage, cutting under the covered frames.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  NOISE_TILE,
  SPRING_SMOOTH,
  TRACKING_TIGHT,
  courtGreen,
  ink,
  useBrandFrame,
} from "./brandKit";
import { MarkTile, PitchGlyph, WORDMARK_HEAD, WORDMARK_TAIL } from "./BrandGeometry";

export type StingerWipeProps = {
  /** Panel tilt in degrees. 0 is a straight vertical wipe. */
  readonly tilt: number;
  /** Travel direction: 1 sweeps left → right, -1 right → left. */
  readonly direction: 1 | -1;
  readonly showMark: boolean;
  readonly head: string;
  readonly tail: string;
  /** Tile edge as a fraction of canvas height. */
  readonly markScale: number;
  readonly panelColor: string;
  readonly edgeColor: string;
};

export const stingerWipeDefaultProps: StingerWipeProps = {
  tilt: -12,
  direction: 1,
  showMark: true,
  head: WORDMARK_HEAD,
  tail: WORDMARK_TAIL,
  markScale: 0.19,
  panelColor: BRAND.background,
  edgeColor: BRAND.primary,
};

export const StingerWipe: FC<StingerWipeProps> = ({
  tilt,
  direction,
  showMark,
  head,
  tail,
  markScale,
  panelColor,
  edgeColor,
}) => {
  /** Poster at the covered midpoint — the only frame that stands alone. */
  const frame = useBrandFrame(0.5);
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const scale = width / 1920;
  const half = Math.max(4, Math.round(durationInFrames / 2));
  const tileSize = height * markScale;

  /**
   * Two springs, not one tween: the panel accelerates in, and leaves on its own
   * curve after the covered frame. `in` runs 0 → 1 over the first half, `out`
   * over the second, and the panel centre is their sum.
   */
  const coverIn = spring({ frame, fps, config: SPRING_SMOOTH, durationInFrames: half });
  const coverOut = spring({
    frame,
    fps,
    delay: half,
    config: SPRING_SMOOTH,
    durationInFrames: half,
  });

  /** Panel centre in canvas widths. 0.5 is dead centre, i.e. full cover. */
  const centre =
    interpolate(coverIn, [0, 1], [-1.5, 0.5], { easing: EASE_OUT_EXPO }) +
    interpolate(coverOut, [0, 1], [0, 2.0], { easing: EASE_OUT_EXPO });

  /** Panel is 2.6 canvas widths so the tilt never exposes a corner. */
  const panelWidth = width * 2.6;
  const left = width * centre - panelWidth / 2;

  /** How covered the frame is, 0 → 1 → 0. Drives the mark and the flash. */
  const covered = Math.max(
    0,
    interpolate(centre, [-0.35, 0.5, 1.35], [0, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/*
        Direction is a mirror of the whole panel layer rather than a sign
        sprinkled through the geometry: the leading edge, the trailing hairline
        and the tilt all have to flip together, and mirroring is the only way
        they cannot drift apart. The mark sits in its own layer, unmirrored.
      */}
      <Sequence name="Panel" layout="none">
        <AbsoluteFill style={{ transform: `scaleX(${direction})` }}>
        <div
          style={{
            position: "absolute",
            top: -height,
            left,
            width: panelWidth,
            height: height * 3,
            transform: `rotate(${tilt}deg)`,
            transformOrigin: "center center",
            backgroundColor: panelColor,
            boxShadow: `0 0 ${140 * scale}px ${40 * scale}px ${ink(0.75)}`,
          }}
        >
          {/* Court texture on the panel, so it is a surface and not a rectangle. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(ellipse 50% 60% at 50% 50%, ${courtGreen(0.1)} 0%, transparent 70%)`,
            }}
          />
          <div style={{ position: "absolute", inset: 0, backgroundImage: NOISE_TILE, opacity: 0.05 }} />

          {/* Leading and trailing edges, both keyed off the same geometry. */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              width: Math.max(4, 10 * scale),
              backgroundColor: edgeColor,
              boxShadow: `0 0 ${60 * scale}px ${courtGreen(0.8)}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: Math.max(2, 4 * scale),
              backgroundColor: courtGreen(0.55),
            }}
          />
        </div>
        </AbsoluteFill>
      </Sequence>

      {showMark ? (
        <Sequence name="Mark" layout="none">
          <AbsoluteFill
            style={{
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              opacity: covered,
              transform: `scale(${interpolate(covered, [0, 1], [0.88, 1])})`,
            }}
          >
            <MarkTile size={tileSize} glow={covered}>
              <PitchGlyph width={tileSize * 0.66} dot={covered} />
            </MarkTile>
            <div
              style={{
                marginTop: tileSize * 0.24,
                fontFamily: DISPLAY_FONT,
                fontSize: tileSize * 0.24,
                fontWeight: 700,
                letterSpacing: TRACKING_TIGHT,
                transform: `translateY(${interpolate(covered, [0, 1], [tileSize * 0.14, 0])}px)`,
              }}
            >
              <span style={{ color: BRAND.foreground }}>{head}</span>
              <span style={{ color: BRAND.primary }}>{tail}</span>
            </div>
          </AbsoluteFill>
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
