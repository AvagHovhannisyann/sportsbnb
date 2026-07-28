/**
 * MapPinRadarSweep — a venue pin sitting under a slowly turning radar sweep,
 * range rings breathing out from it. The ambient "near you" panel on the
 * /venues map header and the location loop on the venue card.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { PinGlyph, StageDressing } from "./venueChrome";
import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  SPORTS,
  TAU,
  type SportKey,
  chalk,
  hairline,
  hashRange,
  ink,
  mix,
  oscillate,
  smoothstep,
  tint,
  useMotionFrame,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type MapPinRadarSweepProps = {
  venueName: string;
  /** District line under the name. */
  district: string;
  /** Distance chip, e.g. "1.2 km away". */
  distanceLabel: string;
  /** Whole sweep revolutions across the loop. Must be a whole number. */
  sweeps: number;
  /** How many range rings travel outward. */
  ringCount: number;
  /** Seed for the deterministic neighbour pins. */
  seed: number;
  /** Drives the accent only. */
  sport: SportKey;
};

export const mapPinRadarSweepDefaultProps: MapPinRadarSweepProps = {
  venueName: "Padel Point Arabkir",
  district: "Yerevan, Arabkir",
  distanceLabel: "1.2 km away",
  sweeps: 1,
  ringCount: 3,
  seed: 23,
  sport: "padel",
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The sweep is a conic wash rotated by `sweeps · 360°`. A whole number of
 *     revolutions lands a rotation on the pixels it started on.
 *  2. The range rings are a wrap lattice: ring `k` reads
 *     `u = wrap(t + k/ringCount, 1)`, which advances by exactly 1 across the
 *     loop, so the ring that runs off the outside is already reborn at the
 *     centre. Radius and opacity are functions of `u` alone, and the opacity is
 *     exactly 0 at both u=0 and u=1 — the ring is invisible on both sides of
 *     the wrap, so the jump in radius there cannot be seen.
 *  3. Every neighbour pin's twinkle is `oscillate(t + phase)`, a full cosine
 *     period; the phases come from `hashRange`, which never reads the frame.
 *  4. The centre pin and the card do not move at all.
 *
 * No one-way tween anywhere. Reduced motion freezes at 0.
 */
export const MapPinRadarSweep: FC<MapPinRadarSweepProps> = ({
  venueName,
  district,
  distanceLabel,
  sweeps,
  ringCount,
  seed,
  sport,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const accent = SPORTS[sport].accent;

  const turns = Math.max(1, Math.round(sweeps));
  const ringsN = Math.max(1, Math.round(ringCount));

  const cx = width / 2;
  const cy = height * 0.46;
  const maxR = Math.min(width, height) * 0.42;

  const breath = oscillate(t);
  const sweepDeg = wrap(turns * t, 1) * 360;

  const ringIdx: number[] = [];
  for (let i = 0; i < ringsN; i += 1) {
    ringIdx.push(i);
  }

  const neighbours: number[] = [0, 1, 2, 3, 4, 5];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(78% 60% at 50% 46%, ${BRAND.surface1} 0%, ${BRAND.background} 78%)`,
        }}
      />

      {/* Streets, still. */}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const y = hashRange(i * 2 + 1, 0.05, 0.95, seed) * height;
          return (
            <line
              key={`h${i}`}
              x1={0}
              y1={y}
              x2={width}
              y2={y}
              stroke={hairline(0.6)}
              strokeWidth={hashRange(i, 1, 2.8, seed) * unit}
            />
          );
        })}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const x = hashRange(i * 3 + 2, 0.05, 0.95, seed + 4) * width;
          return (
            <line
              key={`v${i}`}
              x1={x}
              y1={0}
              x2={x}
              y2={height}
              stroke={hairline(0.5)}
              strokeWidth={hashRange(i + 6, 1, 2.4, seed + 4) * unit}
            />
          );
        })}
      </svg>

      {/* Fixed range circles, so the travelling rings have something to read
          against. Purely static. */}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        {[0.34, 0.62, 0.9].map((f) => (
          <circle
            key={f}
            cx={cx}
            cy={cy}
            r={maxR * f}
            fill="none"
            stroke={chalk(0.06)}
            strokeWidth={1.2 * unit}
          />
        ))}
      </svg>

      {/* The sweep. Whole revolutions only. */}
      <AbsoluteFill
        style={{
          background: `conic-gradient(from ${sweepDeg - 90}deg at 50% ${(cy / height) * 100}%, ${tint(accent, 0.26)} 0deg, ${tint(accent, 0.1)} 24deg, transparent 74deg, transparent 360deg)`,
          maskImage: `radial-gradient(${maxR}px ${maxR}px at 50% ${(cy / height) * 100}%, black 0%, black 62%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(${maxR}px ${maxR}px at 50% ${(cy / height) * 100}%, black 0%, black 62%, transparent 100%)`,
        }}
      />

      {/* Range rings — the wrap lattice. */}
      {ringIdx.map((k) => {
        const u = wrap(t + k / ringsN, 1);
        const r = u * maxR;
        // Opens from nothing and fades to nothing, so u=0 and u=1 agree.
        const alpha = 0.42 * smoothstep(Math.min(1, u * 6)) * (1 - u);
        return (
          <div
            key={`ring${k}`}
            style={{
              position: "absolute",
              left: cx - r,
              top: cy - r,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              border: `${2 * unit}px solid ${tint(accent, alpha)}`,
            }}
          />
        );
      })}

      {/* Neighbour venues, twinkling on full cosines. */}
      {neighbours.map((i) => {
        const angle = hashRange(i * 7 + 1, 0, TAU, seed + 9);
        const rad = hashRange(i * 7 + 2, 0.35, 0.95, seed + 9) * maxR;
        const x = cx + Math.cos(angle) * rad;
        const y = cy + Math.sin(angle) * rad * 0.86;
        const phase = hashRange(i * 7 + 3, 0, 1, seed + 9);
        const glow = oscillate(t + phase);
        return (
          <div
            key={`n${i}`}
            style={{
              position: "absolute",
              left: x - 7 * unit,
              top: y - 7 * unit,
              width: 14 * unit,
              height: 14 * unit,
              borderRadius: "50%",
              backgroundColor: tint(accent, mix(0.3, 0.85, glow)),
              boxShadow: `0 0 ${16 * unit * glow}px ${tint(accent, 0.6 * glow)}`,
            }}
          />
        );
      })}

      {/* The venue itself. Static. */}
      <div
        style={{
          position: "absolute",
          left: cx - 46 * unit,
          top: cy - 88 * unit,
          width: 92 * unit,
          height: 92 * unit,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: `drop-shadow(0 ${10 * unit}px ${18 * unit}px ${ink(0.75)})`,
        }}
      >
        <PinGlyph size={92 * unit} color={accent} weight={2.1} />
      </div>
      <div
        style={{
          position: "absolute",
          left: cx - 26 * unit,
          top: cy - 8 * unit,
          width: 52 * unit,
          height: 16 * unit,
          borderRadius: "50%",
          backgroundColor: ink(0.55),
          filter: `blur(${5 * unit}px)`,
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 84 * unit,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 13 * unit,
            fontWeight: 500,
            letterSpacing: 0.2 * 13 * unit,
            textTransform: "uppercase",
            color: tint(accent, 0.75 + 0.25 * breath),
          }}
        >
          Nearby
        </div>
        <div
          style={{
            marginTop: 14 * unit,
            fontFamily: DISPLAY_FONT,
            fontSize: 50 * unit,
            fontWeight: 700,
            letterSpacing: -0.04 * 50 * unit,
            color: BRAND.foreground,
          }}
        >
          {venueName}
        </div>
      </div>

      {/* Distance chip */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 104 * unit,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12 * unit,
            padding: `${16 * unit}px ${24 * unit}px`,
            borderRadius: 999,
            backgroundColor: BRAND.card,
            border: `${1 * unit}px solid ${tint(accent, 0.24 + 0.16 * breath)}`,
            boxShadow: `0 ${12 * unit}px ${26 * unit}px ${-10 * unit}px ${ink(0.85)}`,
          }}
        >
          <PinGlyph size={22 * unit} color={accent} />
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 22 * unit,
              fontWeight: 600,
              color: BRAND.foreground,
            }}
          >
            {distanceLabel}
          </span>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 20 * unit,
              color: BRAND.mutedForeground,
            }}
          >
            · {district}
          </span>
        </div>
      </div>

      <StageDressing strength={0.6} />
    </AbsoluteFill>
  );
};
