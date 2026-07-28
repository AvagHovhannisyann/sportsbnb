/**
 * WatermarkLiveBadge — the small LIVE pill: a court-green dot pulsing inside a
 * halo, with a hairline ring breathing around the plate. Overlays live-match
 * streams and the real-time availability screen recordings, and is the video
 * twin of the app's `.live-dot` rule.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * Two seam-safe drivers:
 *   1. `popPulse(wrap(frame - phase, period))` for the dot and its halo rings —
 *      a rise spring minus a fall spring, both with an explicit
 *      `durationInFrames`, so the value is exactly 0 at local frame 0 and
 *      exactly 1 - 1 = 0 once both have short-circuited. The halo's one-way
 *      radius is multiplied by it, so the frame where the radius snaps back is
 *      a frame on which the halo is not painted at all.
 *   2. `sin(2π·t)` at integer harmonics for the plate breath, with `loopT`
 *      taking the modulo before the divide so t is exactly 0 at both ends.
 *
 * `backgroundColor` defaults to transparent: this is composited over footage.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  TAU,
  TRACKING_EYEBROW,
  bloomWindow,
  chalk,
  courtGreen,
  hairline,
  ink,
  loopT,
  popPulse,
  staggerPhase,
  useBrandFrame,
  wrap,
} from "./brandKit";

export type WatermarkLiveBadgeProps = {
  /** Pill text. Kept short — this is a badge, not a caption. */
  readonly label: string;
  /** Halo rings leaving the dot per cycle, phase-spread across the loop. */
  readonly haloCount: number;
  readonly dotColor: string;
  readonly labelColor: string;
  /** Plate opacity — 0.8 sits over footage without fighting it. */
  readonly plateOpacity: number;
  /** Transparent by default: this is composited, not watched on its own. */
  readonly backgroundColor: string;
};

export const watermarkLiveBadgeDefaultProps: WatermarkLiveBadgeProps = {
  label: "Live now",
  haloCount: 2,
  dotColor: BRAND.primary,
  labelColor: BRAND.foreground,
  plateOpacity: 0.8,
  backgroundColor: "transparent",
};

export const WatermarkLiveBadge: FC<WatermarkLiveBadgeProps> = ({
  label,
  haloCount,
  dotColor,
  labelColor,
  plateOpacity,
  backgroundColor,
}) => {
  const frame = useBrandFrame(0.3);
  const { fps, height, durationInFrames } = useVideoConfig();

  const period = durationInFrames;
  const t = loopT(frame, period);
  /** Full sine period ⇒ identical at both ends. */
  const breath = 0.5 + 0.5 * Math.sin(TAU * t);

  const dotSize = height * 0.17;
  const window = bloomWindow(period, 0.14, 0.36, 0.44);
  const halos = Math.max(0, haloCount);
  const core = Math.max(0, popPulse(wrap(frame, period), fps, window));

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Plate" layout="none">
        <AbsoluteFill
          style={{
            borderRadius: 999,
            border: `1px solid ${courtGreen(0.2 + 0.18 * breath)}`,
            background: `linear-gradient(120deg, ${ink(plateOpacity)} 0%, ${ink(plateOpacity * 0.8)} 100%)`,
            boxShadow: `0 0 ${height * (0.14 + 0.12 * breath)}px ${courtGreen(0.14 + 0.12 * breath)}, 0 ${height * 0.05}px ${height * 0.16}px ${-height * 0.05}px ${ink(0.7)}`,
          }}
        />
        <AbsoluteFill
          style={{
            borderRadius: 999,
            border: `1px solid ${hairline(0.6)}`,
            opacity: 0.6,
          }}
        />
      </Sequence>

      <Sequence name="Badge" layout="none">
        <AbsoluteFill
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: dotSize * 0.85,
          }}
        >
          <div
            style={{
              position: "relative",
              width: dotSize,
              height: dotSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Array.from({ length: halos }, (_, i) => {
              const local = wrap(frame - staggerPhase(i, halos, period), period);
              const push = popPulse(local, fps, window);
              const size = interpolate(push, [0, 1], [dotSize, dotSize * 3.2], {
                easing: EASE_OUT_EXPO,
              });
              const opacity = 0.5 * Math.max(0, push) * (1 - Math.max(0, push) * 0.8);
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
                    borderRadius: "50%",
                    border: `${Math.max(1, dotSize * 0.09 * (1 - push))}px solid ${dotColor}`,
                    opacity,
                  }}
                />
              );
            })}
            <div
              style={{
                width: dotSize * (0.86 + 0.2 * core),
                height: dotSize * (0.86 + 0.2 * core),
                borderRadius: "50%",
                backgroundColor: dotColor,
                boxShadow: `0 0 ${dotSize * (1 + 1.4 * core)}px ${courtGreen(0.4 + 0.4 * core)}`,
              }}
            />
          </div>

          <div
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: height * 0.26,
              fontWeight: 700,
              textTransform: "uppercase",
              color: labelColor,
              whiteSpace: "nowrap",
              /** Breathes with the dot rather than sitting at a flat value. */
              opacity: 0.82 + 0.18 * breath,
              textShadow: `0 0 ${height * 0.1}px ${chalk(0.12)}`,
            }}
          >
            <span style={{ letterSpacing: TRACKING_EYEBROW, marginRight: `-${TRACKING_EYEBROW}` }}>
              {label}
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
