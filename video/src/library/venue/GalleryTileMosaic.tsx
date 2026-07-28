/**
 * GalleryTileMosaic — the venue gallery changing photo as a diagonal wave of
 * tiles, each square flipping to the next shot a beat after its neighbour. The
 * desktop hero on /venues/:id, where the photo is large enough to break up.
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
  ink,
  mix,
  photoFill,
  smoothstep,
  tint,
  useMotionFrame,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type GalleryTileMosaicProps = {
  /** One caption per photo. Length sets the number of shots in the mosaic. */
  captions: string[];
  venueName: string;
  /** Tiles across. */
  columns: number;
  /** Tiles down. */
  rows: number;
  /**
   * How much of one photo's turn the diagonal wave is spread over, 0–0.6. At 0
   * every tile flips together and the piece is a plain crossfade.
   */
  waveSpread: number;
  /** Fraction of a turn each tile spends dissolving, 0.05–0.45. */
  fadeFraction: number;
  /** Drives the accent and the procedural photo tint. */
  sport: SportKey;
  /** Seed for the generated photos. */
  seed: number;
};

export const galleryTileMosaicDefaultProps: GalleryTileMosaicProps = {
  captions: [
    "Show court",
    "Spectator gallery",
    "Locker rooms",
    "Floodlit at night",
  ],
  venueName: "Nairi Sports Hall",
  columns: 4,
  rows: 3,
  waveSpread: 0.34,
  fadeFraction: 0.22,
  sport: "volleyball",
  seed: 13,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 * A wrap lattice with a per-tile phase constant. Tile `k` reads shot `i`
 * through `u = wrap(t·N − i − d_k, N)`, where `d_k` depends only on the tile's
 * row and column — never on the frame. Across the loop `t·N` climbs by exactly
 * N, which the modulo swallows whole, so every `u` at t=1 equals its value at
 * t=0 no matter what `d_k` is.
 *
 * The visibility window is 0 at u=0, rises, holds, and is back to 0 by
 * u = 1 + fade, staying 0 until the lattice wraps — so each tile is fully
 * transparent on both sides of the seam. The tile scale is driven by that same
 * window, and the caption rides the lattice with `d = 0`.
 *
 * No one-way tween anywhere. Frame 0 and frame `durationInFrames` are the same
 * picture.
 */
export const GalleryTileMosaic: FC<GalleryTileMosaicProps> = ({
  captions,
  venueName,
  columns,
  rows,
  waveSpread,
  fadeFraction,
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

  const shots =
    captions.length > 0 ? captions : galleryTileMosaicDefaultProps.captions;
  const n = shots.length;
  const cols = Math.max(1, Math.round(columns));
  const rowCount = Math.max(1, Math.round(rows));
  const fade = Math.min(0.45, Math.max(0.05, fadeFraction));
  const spread = Math.min(0.6, Math.max(0, waveSpread));

  /** 0 at u=0, 1 across the hold, 0 again by u = 1 + fade. */
  const windowAt = (u: number): number => {
    if (u <= 0) return 0;
    if (u < fade) return smoothstep(u / fade);
    if (u <= 1) return 1;
    if (u < 1 + fade) return smoothstep(1 - (u - 1) / fade);
    return 0;
  };

  const frameX = 60 * unit;
  const frameY = 60 * unit;
  const frameW = width - frameX * 2;
  const frameH = height - frameY * 2 - 168 * unit;

  const tileW = frameW / cols;
  const tileH = frameH / rowCount;
  /** Longest diagonal step, so the wave finishes inside `spread`. */
  const diagMax = Math.max(1, cols + rowCount - 2);

  const tiles: { col: number; row: number; delay: number }[] = [];
  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      tiles.push({ col, row, delay: (spread * (col + row)) / diagMax });
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 66% at 50% 16%, ${BRAND.surface1} 0%, ${BRAND.background} 78%)`,
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
          backgroundColor: BRAND.surface1,
          border: `${1 * unit}px solid ${BRAND.borderStrong}`,
          boxShadow: `0 ${26 * unit}px ${54 * unit}px ${-18 * unit}px ${ink(0.9)}`,
        }}
      >
        {tiles.map((tile) => {
          const key = `${tile.row}-${tile.col}`;
          const left = tile.col * tileW;
          const top = tile.row * tileH;
          return (
            <div
              key={key}
              style={{
                position: "absolute",
                left,
                top,
                width: tileW,
                height: tileH,
                overflow: "hidden",
              }}
            >
              {shots.map((caption, i) => {
                const u = wrap(t * n - i - tile.delay, n);
                const alpha = windowAt(u);
                if (alpha <= 0) {
                  return null;
                }
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: alpha,
                      // Each tile shows its own crop of one whole photo, so the
                      // mosaic reassembles into a single image once the wave
                      // has passed over it.
                      transform: `scale(${mix(1.08, 1, alpha)})`,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: -left,
                        top: -top,
                        width: frameW,
                        height: frameH,
                        background: photoFill(i, accent, seed),
                      }}
                    />
                  </div>
                );
              })}

              {/* Tile seam. Static, so it costs the loop nothing. */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  boxShadow: `inset 0 0 0 ${1 * unit}px ${ink(0.22)}`,
                  pointerEvents: "none",
                }}
              />
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to bottom, ${ink(0.22)} 0%, transparent 32%, transparent 58%, ${ink(0.8)} 100%)`,
            pointerEvents: "none",
          }}
        />

        {/* Captions ride the same lattice with zero tile delay. */}
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
                bottom: 32 * unit,
                opacity: alpha,
                transform: `translateY(${mix(12, 0, alpha) * unit}px)`,
                display: "flex",
                alignItems: "center",
                gap: 12 * unit,
              }}
            >
              <span
                style={{
                  width: 4 * unit,
                  height: 26 * unit,
                  borderRadius: 999,
                  backgroundColor: accent,
                }}
              />
              <span
                style={{
                  fontFamily: SANS_FONT,
                  fontSize: 26 * unit,
                  fontWeight: 600,
                  color: BRAND.foreground,
                }}
              >
                {caption}
              </span>
            </div>
          );
        })}

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

      {/* Dot rail. Widths track the same window, so they wrap with it. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: frameY + frameH + 40 * unit,
          display: "flex",
          justifyContent: "center",
          gap: 10 * unit,
        }}
      >
        {shots.map((caption, i) => {
          const on = windowAt(wrap(t * n - i, n));
          return (
            <span
              key={`d${i}`}
              style={{
                width: mix(9, 30, on) * unit,
                height: 9 * unit,
                borderRadius: 999,
                backgroundColor:
                  on > 0.02 ? tint(accent, 0.35 + 0.5 * on) : BRAND.surface3,
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
          bottom: 38 * unit,
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
