/**
 * GalleryCrossfadeStack — the venue photo gallery dissolving from one frame to
 * the next, with the caption changing under it. The hero carousel on
 * /venues/:id when the listing has more photos than the grid can show.
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
  mix,
  photoFill,
  smoothstep,
  tint,
  useMotionFrame,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type GalleryCrossfadeStackProps = {
  /** One caption per frame of the gallery. Length sets the slide count. */
  captions: string[];
  venueName: string;
  /** Fraction of each slide's turn spent dissolving, 0.05–0.45. */
  fadeFraction: number;
  /** How far each slide drifts in across its turn, as a scale delta. */
  zoom: number;
  /** Drives the accent and the procedural photo tint. */
  sport: SportKey;
  /** Seed for the generated photos. */
  seed: number;
};

export const galleryCrossfadeStackDefaultProps: GalleryCrossfadeStackProps = {
  captions: [
    "Main pitch, floodlit",
    "Changing rooms",
    "Covered seating",
    "Parking on site",
  ],
  venueName: "Ararat Arena",
  fadeFraction: 0.28,
  zoom: 0.07,
  sport: "football",
  seed: 7,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 * A wrap lattice. Every slide `i` reads its own local clock
 * `u_i = wrap(t·N − i, N)`, which advances by exactly N across the loop and
 * therefore returns to its starting value at t=1.
 *
 * The visibility window `W(u)` is 0 at u=0, rises, holds, falls back to 0 by
 * u=1+fade and stays 0 until the lattice wraps — so the value is 0 on *both*
 * sides of the wrap and the seam is invisible. The per-slide zoom is a one-way
 * ramp, which is legal here precisely because it only ever runs while W(u) > 0
 * and resets while the slide is fully transparent.
 *
 * Nothing on screen tweens one way across the composition.
 */
export const GalleryCrossfadeStack: FC<GalleryCrossfadeStackProps> = ({
  captions,
  venueName,
  fadeFraction,
  zoom,
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

  const shots = captions.length > 0 ? captions : galleryCrossfadeStackDefaultProps.captions;
  const n = shots.length;
  const fade = Math.min(0.45, Math.max(0.05, fadeFraction));

  /** The window. 0 at u=0, 1 across the hold, 0 again by u = 1 + fade. */
  const windowAt = (u: number): number => {
    if (u <= 0) return 0;
    if (u < fade) return smoothstep(u / fade);
    if (u <= 1) return 1;
    if (u < 1 + fade) return smoothstep(1 - (u - 1) / fade);
    return 0;
  };

  const frameX = 64 * unit;
  const frameY = 64 * unit;
  const frameW = width - frameX * 2;
  const frameH = height - frameY * 2 - 150 * unit;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
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
          const u = wrap(t * n - i, n);
          const alpha = windowAt(u);
          if (alpha <= 0) {
            return null;
          }
          // Slow push across the slide's own turn. Legal in a loop because it
          // only runs inside the window and resets while alpha is 0.
          const push = clamp01(u / (1 + fade));
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                opacity: alpha,
                background: photoFill(i, accent, seed),
                transform: `scale(${1 + zoom * push})`,
                transformOrigin: `${40 + (i % 3) * 10}% ${46 + (i % 2) * 8}%`,
              }}
            />
          );
        })}

        {/* Floodlight streak, fixed. It belongs to the glass, not the photo. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(118deg, transparent 38%, ${chalk(0.05)} 50%, transparent 62%)`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to bottom, ${ink(0.25)} 0%, transparent 34%, transparent 62%, ${ink(0.78)} 100%)`,
            pointerEvents: "none",
          }}
        />

        {/* Captions ride the same lattice, so they change with the picture. */}
        {shots.map((caption, i) => {
          const u = wrap(t * n - i, n);
          const alpha = windowAt(u);
          if (alpha <= 0) {
            return null;
          }
          return (
            <div
              key={`c${i}`}
              style={{
                position: "absolute",
                left: 34 * unit,
                bottom: 30 * unit,
                opacity: alpha,
                transform: `translateY(${mix(10, 0, alpha) * unit}px)`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 * unit }}>
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

        {/* Counter. Discrete, and it reads slide 1 again the instant t wraps. */}
        <div
          style={{
            position: "absolute",
            right: 26 * unit,
            top: 24 * unit,
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
          {(Math.floor(t * n) % n) + 1} / {n}
        </div>
      </div>

      {/* Dot rail under the frame. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: frameY + frameH + 34 * unit,
          display: "flex",
          justifyContent: "center",
          gap: 10 * unit,
        }}
      >
        {shots.map((caption, i) => {
          const u = wrap(t * n - i, n);
          const on = windowAt(u);
          return (
            <span
              key={`d${i}`}
              style={{
                width: mix(9, 30, on) * unit,
                height: 9 * unit,
                borderRadius: 999,
                backgroundColor: on > 0.02 ? tint(accent, 0.35 + 0.5 * on) : BRAND.surface3,
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 34 * unit,
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
