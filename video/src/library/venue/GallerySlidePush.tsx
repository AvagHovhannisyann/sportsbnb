/**
 * GallerySlidePush — the venue gallery as a filmstrip that pushes left, one
 * photo at a time, forever. The mobile photo rail on /venues/:id and the
 * autoplay strip on the venue card in search results.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { StageDressing } from "./venueChrome";
import {
  BRAND,
  MONO_FONT,
  SANS_FONT,
  SPORTS,
  type SportKey,
  chalk,
  clamp01,
  ink,
  photoFill,
  smoothstep,
  tint,
  useMotionFrame,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type GallerySlidePushProps = {
  /** One caption per photo. Length sets the strip length. */
  captions: string[];
  venueName: string;
  /** Gap between photos in design px. */
  gutter: number;
  /** Fraction of each step spent moving; the rest is a hold. 0.2–1. */
  moveFraction: number;
  sport: SportKey;
  seed: number;
};

export const gallerySlidePushDefaultProps: GallerySlidePushProps = {
  captions: [
    "Centre court",
    "Glass walls",
    "Night lighting",
    "Racket hire",
    "Café terrace",
  ],
  venueName: "Padel Point Arabkir",
  gutter: 18,
  moveFraction: 0.55,
  sport: "padel",
  seed: 21,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 * A wrap lattice on position rather than opacity. Each photo sits at
 * `x_i = wrap(i·step − advance, N·step) − step`, so a photo that runs off the
 * left edge reappears on the right in the same motion. `advance` climbs by
 * exactly `N·step` across the loop, which the modulo swallows whole: every
 * photo is on the pixel at t=1 that it occupied at t=0.
 *
 * The step easing is `smoothstep` applied *within* each of the N steps, so the
 * strip pauses on each photo and moves between them, but the underlying
 * `advance` is still a whole number of steps at t=1. The vignette and the rail
 * are static.
 *
 * No one-way tween anywhere.
 */
export const GallerySlidePush: FC<GallerySlidePushProps> = ({
  captions,
  venueName,
  gutter,
  moveFraction,
  sport,
  seed,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const accent = SPORTS[sport].accent;

  const shots = captions.length > 0 ? captions : gallerySlidePushDefaultProps.captions;
  const n = shots.length;

  const frameX = 60 * unit;
  const frameY = 70 * unit;
  const frameW = width - frameX * 2;
  const frameH = height - frameY * 2 - 130 * unit;

  const gap = gutter * unit;
  const photoW = frameW;
  const step = photoW + gap;

  // Move-then-hold, N times. `eased` is 0 at t=0 and exactly N at t=1.
  const move = Math.min(1, Math.max(0.2, moveFraction));
  const stepIndex = Math.floor(t * n);
  const withinStep = t * n - stepIndex;
  const eased = stepIndex + smoothstep(Math.min(1, withinStep / move));
  const advance = eased * step;

  const current = stepIndex % n;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(94% 60% at 50% 20%, ${BRAND.surface1} 0%, ${BRAND.background} 80%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: frameX,
          top: frameY,
          width: frameW,
          height: frameH,
          borderRadius: 26 * unit,
          overflow: "hidden",
          border: `${1 * unit}px solid ${BRAND.borderStrong}`,
          boxShadow: `0 ${26 * unit}px ${54 * unit}px ${-18 * unit}px ${ink(0.9)}`,
        }}
      >
        {shots.map((caption, i) => {
          const x = wrap(i * step - advance, n * step) - step;
          // Off-strip photos are skipped: at any moment only two can be in view.
          if (x > photoW || x < -step) {
            return null;
          }
          // How centred this photo is, for the caption and the edge shading.
          const centred = clamp01(1 - Math.abs(x) / step);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: 0,
                width: photoW,
                height: frameH,
                background: photoFill(i, accent, seed),
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(to bottom, ${ink(0.2)} 0%, transparent 36%, transparent 58%, ${ink(0.8)} 100%)`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 32 * unit,
                  bottom: 28 * unit,
                  display: "flex",
                  alignItems: "center",
                  gap: 10 * unit,
                  opacity: centred,
                }}
              >
                <span
                  style={{
                    width: 7 * unit,
                    height: 7 * unit,
                    borderRadius: "50%",
                    backgroundColor: accent,
                  }}
                />
                <span
                  style={{
                    fontFamily: SANS_FONT,
                    fontSize: 24 * unit,
                    fontWeight: 600,
                    color: BRAND.foreground,
                  }}
                >
                  {caption}
                </span>
              </div>
            </div>
          );
        })}

        {/* Fixed edge shading, so a photo entering does not pop into frame. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, ${ink(0.5)} 0%, transparent 9%, transparent 91%, ${ink(0.5)} 100%)`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 24 * unit,
            top: 22 * unit,
            padding: `${8 * unit}px ${14 * unit}px`,
            borderRadius: 999,
            backgroundColor: ink(0.55),
            border: `${1 * unit}px solid ${chalk(0.14)}`,
            fontFamily: MONO_FONT,
            fontSize: 15 * unit,
            fontVariantNumeric: "tabular-nums",
            color: BRAND.foregroundSoft,
          }}
        >
          {current + 1} / {n}
        </div>
      </div>

      {/* Progress rail — one segment per photo. Only the *current* segment
          fills, and it empties as the strip advances. The tempting version,
          where past segments stay filled, would be a one-way sweep across the
          loop: full at the last frame, empty at frame 0. This one is a
          function of (step, position-within-step) alone, so it holds the same
          picture at t=1 as at t=0. */}
      <div
        style={{
          position: "absolute",
          left: frameX,
          right: frameX,
          top: frameY + frameH + 30 * unit,
          display: "flex",
          gap: 8 * unit,
        }}
      >
        {shots.map((caption, i) => (
          <div
            key={`r${i}`}
            style={{
              flex: 1,
              height: 6 * unit,
              borderRadius: 999,
              backgroundColor: BRAND.surface3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${100 * (i === current ? withinStep : 0)}%`,
                backgroundColor: tint(accent, 0.85),
              }}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 30 * unit,
          textAlign: "center",
          fontFamily: MONO_FONT,
          fontSize: 14 * unit,
          letterSpacing: 0.2 * 14 * unit,
          textTransform: "uppercase",
          color: BRAND.mutedForeground,
        }}
      >
        {venueName}
      </div>

      <StageDressing strength={0.5} />
    </AbsoluteFill>
  );
};
