/**
 * WatermarkCornerBug — the persistent corner bug: monogram, wordmark and a
 * light sweep crossing the plate on a slow cycle. Sits in the corner of every
 * long-form cut (owner testimonials, match recaps, the launch film) for the
 * whole runtime, which is exactly why it has to loop without a seam.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * Two seam-safe drivers, no one-way tween anywhere:
 *   1. The sweep is a repeating gradient whose background position advances by
 *      EXACTLY one gradient period across the loop, so the highlight leaving
 *      one side and the next one entering are the same highlight.
 *   2. Breath and glow are `sin(2π·t)` / `cos(4π·t)` — integer harmonics of a
 *      full period, and `loopT` takes the modulo before the divide, so t is
 *      exactly the float 0 at both ends rather than 0 and 1-ε.
 * The one pulsed element, the status dot, uses `popPulse(wrap(...))`, which is
 * exactly 0 at local frame 0 and exactly 1 - 1 = 0 once its springs have
 * short-circuited.
 *
 * `backgroundColor` defaults to transparent: the bug is meant to be composited
 * over footage (or rendered to an alpha codec), not shown on its own.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  TAU,
  TRACKING_EYEBROW,
  TRACKING_TIGHT,
  bloomWindow,
  chalk,
  courtGreen,
  hairline,
  ink,
  loopT,
  popPulse,
  useBrandFrame,
  wrap,
} from "./brandKit";
import { MarkTile, MonogramGlyph, WORDMARK_HEAD, WORDMARK_TAIL } from "./BrandGeometry";

export type WatermarkCornerBugProps = {
  readonly head: string;
  readonly tail: string;
  /** Mono caps line under the wordmark. Empty string hides it. */
  readonly subline: string;
  readonly showMonogram: boolean;
  /** Plate opacity — 0.8 sits over footage without fighting it. */
  readonly plateOpacity: number;
  /** Corner radius as a fraction of canvas height. */
  readonly radiusRatio: number;
  /** Transparent by default: this is composited, not watched on its own. */
  readonly backgroundColor: string;
};

export const watermarkCornerBugDefaultProps: WatermarkCornerBugProps = {
  head: WORDMARK_HEAD,
  tail: WORDMARK_TAIL,
  subline: "sportsbnb.am",
  showMonogram: true,
  plateOpacity: 0.82,
  radiusRatio: 0.22,
  backgroundColor: "transparent",
};

export const WatermarkCornerBug: FC<WatermarkCornerBugProps> = ({
  head,
  tail,
  subline,
  showMonogram,
  plateOpacity,
  radiusRatio,
  backgroundColor,
}) => {
  const frame = useBrandFrame(0.3);
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const period = durationInFrames;
  const t = loopT(frame, period);

  /** Full sine period ⇒ identical at both ends of the loop. */
  const breath = 0.5 + 0.5 * Math.sin(TAU * t);
  /** Second harmonic so the sweep and the glow never crest together. */
  const swell = 0.5 + 0.5 * Math.cos(TAU * 2 * t);

  const pad = height * 0.16;
  const markSize = height * 0.5;
  const wordSize = height * 0.24;
  /** One sweep period, wider than the plate so only one highlight shows. */
  const sweepPeriod = width * 1.35;

  const window = bloomWindow(period, 0.16, 0.42, 0.4);
  const dot = Math.max(0, popPulse(wrap(frame, period), fps, window));

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Plate" layout="none">
        <AbsoluteFill
          style={{
            borderRadius: height * radiusRatio,
            overflow: "hidden",
            border: `1px solid ${hairline(plateOpacity)}`,
            background: `linear-gradient(125deg, ${ink(plateOpacity)} 0%, ${ink(plateOpacity * 0.78)} 100%)`,
            boxShadow: `0 ${height * 0.06}px ${height * 0.2}px ${-height * 0.06}px ${ink(0.7)}`,
          }}
        >
          {/* Sweep: position advances exactly one gradient period per loop. */}
          <AbsoluteFill
            style={{
              backgroundImage: `repeating-linear-gradient(108deg, ${chalk(0)} 0px, ${chalk(0)} ${sweepPeriod * 0.52}px, ${chalk(0.07)} ${sweepPeriod * 0.66}px, ${courtGreen(0.1)} ${sweepPeriod * 0.72}px, ${chalk(0)} ${sweepPeriod}px)`,
              backgroundSize: `${sweepPeriod}px 100%`,
              backgroundPosition: `${t * sweepPeriod}px 0px`,
            }}
          />
          <AbsoluteFill
            style={{
              background: `radial-gradient(ellipse 60% 120% at 12% 50%, ${courtGreen(0.05 + 0.07 * swell)} 0%, transparent 70%)`,
            }}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Lockup" layout="none">
        <AbsoluteFill
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: pad,
            paddingRight: pad,
            gap: pad * 0.75,
          }}
        >
          {showMonogram ? (
            <MarkTile size={markSize} glow={0.3 + 0.5 * breath} radiusRatio={0.3}>
              <MonogramGlyph size={markSize * 0.82} ring={0.85} />
            </MarkTile>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: height * 0.04 }}>
            <div
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: wordSize,
                fontWeight: 700,
                letterSpacing: TRACKING_TIGHT,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: BRAND.foreground }}>{head}</span>
              <span
                style={{
                  color: BRAND.primary,
                  textShadow: `0 0 ${wordSize * (0.3 + 0.3 * breath)}px ${courtGreen(0.18 + 0.16 * breath)}`,
                }}
              >
                {tail}
              </span>
            </div>

            {subline.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: height * 0.05,
                  fontFamily: MONO_FONT,
                  fontSize: wordSize * 0.44,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  color: chalk(0.34 + 0.12 * breath),
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: wordSize * 0.2 * (1 + 0.4 * dot),
                    height: wordSize * 0.2 * (1 + 0.4 * dot),
                    borderRadius: "50%",
                    backgroundColor: BRAND.primary,
                    opacity: 0.5 + 0.5 * dot,
                    boxShadow: `0 0 ${wordSize * 0.5 * dot}px ${courtGreen(0.7 * dot)}`,
                  }}
                />
                <span
                  style={{ letterSpacing: TRACKING_EYEBROW, marginRight: `-${TRACKING_EYEBROW}` }}
                >
                  {subline}
                </span>
              </div>
            ) : null}
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
