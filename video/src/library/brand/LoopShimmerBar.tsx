/**
 * LoopShimmerBar — a wide, short indeterminate progress strip: monogram, label,
 * a shimmer travelling down the track and three pips ticking behind it. The
 * fastest rhythm in the loop set. Sits at the top of the app shell during route
 * transitions and above the results list while search filters re-query.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * Three seam-safe drivers:
 *   1. The shimmer is a `repeating-linear-gradient` whose background position
 *      advances by EXACTLY one gradient period across the loop — the highlight
 *      leaving the right edge and the next one entering from the left are the
 *      same highlight, so there is nothing to seam.
 *   2. Breath and tint are `sin(2π·t)` at integer harmonics: identical floats
 *      at t = 0 and t = 1 because `loopT` takes the modulo before the divide.
 *   3. The pips use `popPulse(wrap(frame - phase, period))`, which is exactly 0
 *      at local frame 0 and exactly 1 - 1 = 0 once both its springs have
 *      short-circuited.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";

import {
  BRAND,
  MONO_FONT,
  TAU,
  TRACKING_EYEBROW,
  bloomWindow,
  chalk,
  courtGreen,
  cyan,
  hairline,
  loopT,
  popPulse,
  staggerPhase,
  useBrandFrame,
  wrap,
} from "./brandKit";
import { MarkTile, MonogramGlyph } from "./BrandGeometry";

export type LoopShimmerBarProps = {
  /** Mono caps label to the right of the mark. Empty string hides it. */
  readonly label: string;
  readonly showMark: boolean;
  /** Pips at the tail of the bar, pulsing a beat apart. */
  readonly pipCount: number;
  /** Track thickness as a fraction of canvas height. */
  readonly trackWeight: number;
  readonly accentColor: string;
  readonly backgroundColor: string;
  /** Horizontal padding as a fraction of canvas width. */
  readonly padding: number;
};

export const loopShimmerBarDefaultProps: LoopShimmerBarProps = {
  label: "Loading venues",
  showMark: true,
  pipCount: 3,
  trackWeight: 0.05,
  accentColor: BRAND.primary,
  backgroundColor: BRAND.background,
  padding: 0.035,
};

export const LoopShimmerBar: FC<LoopShimmerBarProps> = ({
  label,
  showMark,
  pipCount,
  trackWeight,
  accentColor,
  backgroundColor,
  padding,
}) => {
  const frame = useBrandFrame(0.35);
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const period = durationInFrames;
  const t = loopT(frame, period);
  const breath = 0.5 + 0.5 * Math.sin(TAU * t);

  const pad = width * padding;
  const markSize = height * 0.56;
  const track = Math.max(3, height * trackWeight);
  /**
   * One gradient period, chosen wider than the track so exactly one highlight
   * is in view at a time. The position advances by precisely this much across
   * the loop, which is the seam guarantee.
   */
  const gradientPeriod = width * 0.55;

  const window = bloomWindow(period, 0.18, 0.34, 0.44);
  const pips = Math.max(0, pipCount);

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Bed" layout="none">
        <AbsoluteFill
          style={{
            background: `linear-gradient(90deg, ${courtGreen(0.05 + 0.05 * breath)} 0%, transparent 55%)`,
          }}
        />
        <AbsoluteFill
          style={{
            borderBottom: `1px solid ${hairline(1)}`,
          }}
        />
      </Sequence>

      <Sequence name="Row" layout="none">
        <AbsoluteFill
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: pad,
            paddingRight: pad,
            gap: pad * 0.7,
          }}
        >
          {showMark ? (
            <MarkTile size={markSize} glow={0.3 + 0.5 * breath} radiusRatio={0.28}>
              <MonogramGlyph size={markSize * 0.82} letterColor={accentColor} ring={0.9} />
            </MarkTile>
          ) : null}

          {label.length > 0 ? (
            <div
              style={{
                fontFamily: MONO_FONT,
                fontSize: height * 0.13,
                fontWeight: 500,
                textTransform: "uppercase",
                color: chalk(0.4 + 0.2 * breath),
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{ letterSpacing: TRACKING_EYEBROW, marginRight: `-${TRACKING_EYEBROW}` }}
              >
                {label}
              </span>
            </div>
          ) : null}

          {/* The track. flex:1 so the bar owns whatever the row leaves it. */}
          <div
            style={{
              flex: 1,
              position: "relative",
              height: track,
              borderRadius: 999,
              backgroundColor: hairline(1),
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `repeating-linear-gradient(90deg, ${courtGreen(0)} 0px, ${courtGreen(0)} ${gradientPeriod * 0.42}px, ${accentColor} ${gradientPeriod * 0.66}px, ${cyan(0.35)} ${gradientPeriod * 0.78}px, ${courtGreen(0)} ${gradientPeriod}px)`,
                backgroundSize: `${gradientPeriod}px 100%`,
                backgroundPosition: `${t * gradientPeriod}px 0px`,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: track * 0.9, alignItems: "center" }}>
            {Array.from({ length: pips }, (_, i) => {
              const local = wrap(frame - staggerPhase(i, pips, period), period);
              const lit = Math.max(0, popPulse(local, fps, window));
              const d = track * (1 + 0.5 * lit);
              return (
                <div
                  key={i}
                  style={{
                    width: d,
                    height: d,
                    borderRadius: "50%",
                    backgroundColor: accentColor,
                    opacity: 0.24 + 0.76 * lit,
                    boxShadow: `0 0 ${d * 2.4 * lit}px ${courtGreen(0.6 * lit)}`,
                  }}
                />
              );
            })}
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
