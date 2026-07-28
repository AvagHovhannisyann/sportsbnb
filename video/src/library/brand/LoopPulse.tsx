/**
 * LoopPulse — the calm brand loop: the mark breathing inside three concentric
 * rings, with a slow ripple leaving it every third of a cycle. Plays behind the
 * app's full-screen "checking availability" state and on the marketing site's
 * 404 and maintenance pages, where it may sit on screen for minutes.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * Every animated quantity is a pure function of exactly two seam-safe drivers:
 *   1. `t = loopT(frame, period)` fed through a FULL sine/cosine period at an
 *      integer harmonic — `sin(2πk·t)` is identical at t = 0 and t = 1, and
 *      `loopT` takes the modulo *before* the divide so both ends are exactly
 *      the float 0, not 0 and 1-ε.
 *   2. `popPulse(wrap(frame - phase, period))` — a rise spring minus a fall
 *      spring, both with an explicit `durationInFrames`, so the value is
 *      exactly 0 at local frame 0 and exactly 1 - 1 = 0 once both have
 *      short-circuited. The ripple's one-way radius is multiplied by it, so
 *      the frame where the radius snaps back is a frame where nothing paints.
 * There is no one-way tween anywhere in the file.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_OUT_EXPO,
  MONO_FONT,
  NOISE_TILE,
  TAU,
  TRACKING_EYEBROW,
  bloomWindow,
  chalk,
  courtGreen,
  loopT,
  popPulse,
  staggerPhase,
  useBrandFrame,
  wrap,
} from "./brandKit";
import { MarkTile, PitchGlyph, StagePlate } from "./BrandGeometry";

export type LoopPulseProps = {
  /** Tile edge as a fraction of the shorter canvas side. */
  readonly markScale: number;
  /** Static rings around the mark, breathing on offset harmonics. */
  readonly ringCount: number;
  /** Ripples leaving the mark per cycle. They are phase-spread over the loop. */
  readonly rippleCount: number;
  /** How much the mark scales across one breath, e.g. 0.04 = ±4%. */
  readonly breathAmount: number;
  readonly caption: string;
  readonly accentColor: string;
  readonly backgroundColor: string;
};

export const loopPulseDefaultProps: LoopPulseProps = {
  markScale: 0.3,
  ringCount: 3,
  rippleCount: 3,
  breathAmount: 0.045,
  caption: "Checking availability",
  accentColor: BRAND.primary,
  backgroundColor: BRAND.background,
};

export const LoopPulse: FC<LoopPulseProps> = ({
  markScale,
  ringCount,
  rippleCount,
  breathAmount,
  caption,
  accentColor,
  backgroundColor,
}) => {
  /**
   * Poster at 0.3 of the loop rather than 0: at t = 0 every ripple is exactly
   * zero by construction, so frame 0 is the emptiest frame in the piece.
   */
  const frame = useBrandFrame(0.3);
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const period = durationInFrames;
  const t = loopT(frame, period);
  const shortSide = Math.min(width, height);
  const tileSize = shortSide * markScale;

  /** Full cosine period ⇒ breath(t=0) === breath(t=1), exactly. */
  const breath = 0.5 + 0.5 * Math.sin(TAU * t);
  /** Second harmonic, so the glow and the scale never crest together. */
  const swell = 0.5 + 0.5 * Math.cos(TAU * 2 * t + 1.1);

  const window = bloomWindow(period, 0.2, 0.4, 0.42);

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        {/* Grid drifts exactly one tile per loop — a modulo cycle in CSS. */}
        <StagePlate
          glow={0.35 + 0.45 * breath}
          backgroundColor={backgroundColor}
          gridTile={shortSide * 0.1}
          gridShift={t * shortSide * 0.1}
        />
      </Sequence>

      <Sequence name="Ripples" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {Array.from({ length: Math.max(0, rippleCount) }, (_, i) => {
            const local = wrap(frame - staggerPhase(i, rippleCount, period), period);
            const push = popPulse(local, fps, window);
            /**
             * The radius is one-way within a cycle — safe only because `push`
             * is provably exactly 0 at both ends of that cycle, so the frame
             * on which the radius snaps back paints nothing at all.
             */
            const size = interpolate(push, [0, 1], [tileSize * 1.05, tileSize * 2.6], {
              easing: EASE_OUT_EXPO,
            });
            const opacity = 0.34 * Math.max(0, push) * (1 - Math.max(0, push) * 0.7);
            if (opacity <= 0) {
              return null;
            }
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: size,
                  height: size,
                  borderRadius: size * 0.26,
                  border: `${Math.max(1, tileSize * 0.014 * (1 - push))}px solid ${accentColor}`,
                  opacity,
                }}
              />
            );
          })}
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Rings" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {Array.from({ length: Math.max(0, ringCount) }, (_, i) => {
            /** Integer harmonic per ring, phase-spread — closed and staggered. */
            const k = i + 1;
            const wave = 0.5 + 0.5 * Math.sin(TAU * k * t - (i * TAU) / Math.max(1, ringCount));
            const size = tileSize * (1.5 + i * 0.42) * (1 + 0.02 * wave);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  border: `1px solid ${courtGreen(0.06 + 0.12 * wave)}`,
                  opacity: 0.9,
                }}
              />
            );
          })}
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Mark" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: `scale(${1 + breathAmount * (breath - 0.5) * 2})` }}>
            <MarkTile size={tileSize} glow={0.4 + 0.6 * swell}>
              <PitchGlyph
                width={tileSize * 0.66}
                color={accentColor}
                dot={0.85 + 0.3 * breath}
              />
            </MarkTile>
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Caption" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {caption.length > 0 ? (
            <div
              style={{
                position: "absolute",
                top: "50%",
                marginTop: tileSize * 0.95,
                fontFamily: MONO_FONT,
                fontSize: tileSize * 0.11,
                fontWeight: 500,
                textTransform: "uppercase",
                color: chalk(0.3 + 0.16 * breath),
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
