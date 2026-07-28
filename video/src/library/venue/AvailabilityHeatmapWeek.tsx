/**
 * AvailabilityHeatmapWeek — demand across a week as an hours × days grid, the
 * hot cells breathing. Sits in the owner dashboard on /owner/venues/:id so a
 * venue can see which hours are worth pricing up.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  MONO_FONT,
  SANS_FONT,
  SPORTS,
  type SportKey,
  clamp01,
  hairline,
  hashUnit,
  ink,
  mix,
  oscillate,
  tint,
  useMotionFrame,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type AvailabilityHeatmapWeekProps = {
  days: string[];
  /** First hour shown, 24h. */
  startHour: number;
  /** Number of hour rows. */
  hourCount: number;
  /** How much the hot cells breathe, 0–1. 0 is a still heatmap. */
  breathAmount: number;
  /** Seed for the deterministic demand field. */
  seed: number;
  /** Drives the accent only. */
  sport: SportKey;
};

export const availabilityHeatmapWeekDefaultProps: AvailabilityHeatmapWeekProps =
  {
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    startHour: 8,
    hourCount: 14,
    breathAmount: 0.45,
    seed: 5,
    sport: "basketball",
  };

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. Every cell's heat is `base + amp · oscillate(t + phase)`, and
 *     `oscillate` is `(1 - cos 2πt)/2` — a full cosine period. Any phase
 *     offset leaves it periodic with period 1, so every cell holds the same
 *     value at t=1 as at t=0, and holds it with the same slope.
 *  2. `base` and `phase` come from `hashUnit(cellIndex, seed)`, which never
 *     reads the frame, so the field itself is frame-invariant.
 *  3. The evening band highlight is one more full cosine.
 *
 * No one-way tween anywhere. The freeze frame for reduced motion is 0.
 */
export const AvailabilityHeatmapWeek: FC<AvailabilityHeatmapWeekProps> = ({
  days,
  startHour,
  hourCount,
  breathAmount,
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

  const cols = days.length > 0 ? days : availabilityHeatmapWeekDefaultProps.days;
  const rowsN = Math.max(1, hourCount);

  const padX = 64 * unit;
  const labelW = 74 * unit;
  const gridX = padX + labelW;
  const gridW = width - gridX - padX;
  const headerH = 150 * unit;
  const gridH = height - headerH - 96 * unit;

  const gap = 5 * unit;
  const cellW = (gridW - gap * (cols.length - 1)) / cols.length;
  const cellH = (gridH - gap * (rowsN - 1)) / rowsN;

  const amp = clamp01(breathAmount);

  /**
   * Demand is highest on weekday evenings and Saturday afternoons, which is
   * what an Armenian five-a-side venue actually sees. The shape is deliberate,
   * with hash noise layered on top rather than standing in for it.
   */
  const baseHeat = (day: number, row: number): number => {
    const hour = startHour + row;
    const evening = Math.exp(-Math.pow((hour - 20) / 3.1, 2));
    const weekend = day >= 5 ? Math.exp(-Math.pow((hour - 15) / 4.4, 2)) : 0;
    const noise = hashUnit(day * 53 + row * 7, seed) * 0.3;
    return clamp01(evening * 0.85 + weekend * 0.6 + noise * 0.5);
  };

  const bandGlow = oscillate(t);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(94% 66% at 50% 10%, ${BRAND.surface1} 0%, ${BRAND.background} 80%)`,
        }}
      />

      <div style={{ position: "absolute", left: padX, top: 48 * unit }}>
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 30 * unit,
            fontWeight: 600,
            color: BRAND.foreground,
          }}
        >
          Demand by hour
        </div>
        <div
          style={{
            marginTop: 6 * unit,
            fontFamily: SANS_FONT,
            fontSize: 17 * unit,
            color: BRAND.mutedForeground,
          }}
        >
          Last 8 weeks · your court against the neighbourhood
        </div>
      </div>

      {/* Day headers */}
      {cols.map((day, d) => (
        <div
          key={day}
          style={{
            position: "absolute",
            left: gridX + d * (cellW + gap),
            top: headerH - 32 * unit,
            width: cellW,
            textAlign: "center",
            fontFamily: MONO_FONT,
            fontSize: 15 * unit,
            fontWeight: 500,
            letterSpacing: 0.1 * 15 * unit,
            textTransform: "uppercase",
            color: d >= 5 ? tint(accent, 0.9) : BRAND.mutedForeground,
          }}
        >
          {day}
        </div>
      ))}

      {/* Hour labels + cells */}
      {Array.from({ length: rowsN }, (_, r) => (
        <div key={r}>
          <div
            style={{
              position: "absolute",
              left: padX,
              top: headerH + r * (cellH + gap) + cellH * 0.5 - 9 * unit,
              width: labelW - 14 * unit,
              textAlign: "right",
              fontFamily: MONO_FONT,
              fontSize: 14 * unit,
              fontVariantNumeric: "tabular-nums",
              color: BRAND.mutedForeground,
            }}
          >
            {startHour + r < 10 ? `0${startHour + r}` : startHour + r}:00
          </div>
          {cols.map((day, d) => {
            const base = baseHeat(d, r);
            // Per-cell phase, deterministic and frame-independent.
            const phase = hashUnit(d * 91 + r * 13 + 3, seed);
            const heat = clamp01(base * (1 - amp * 0.5) + base * amp * oscillate(t + phase));
            return (
              <div
                key={day}
                style={{
                  position: "absolute",
                  left: gridX + d * (cellW + gap),
                  top: headerH + r * (cellH + gap),
                  width: cellW,
                  height: cellH,
                  borderRadius: 6 * unit,
                  backgroundColor: tint(accent, 0.04 + 0.62 * heat),
                  border: `${1 * unit}px solid ${heat > 0.55 ? tint(accent, 0.35 * heat) : hairline(0.7)}`,
                  boxShadow:
                    heat > 0.68
                      ? `0 0 ${14 * unit * heat}px ${tint(accent, 0.3 * heat)}`
                      : undefined,
                }}
              />
            );
          })}
        </div>
      ))}

      {/* The evening band, called out because it is where the money is. */}
      <div
        style={{
          position: "absolute",
          left: gridX - 6 * unit,
          right: padX - 6 * unit,
          top: headerH + Math.max(0, 19 - startHour) * (cellH + gap) - 4 * unit,
          height: (cellH + gap) * 3,
          borderRadius: 10 * unit,
          border: `${1.4 * unit}px solid ${tint(accent, 0.18 + 0.26 * bandGlow)}`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: padX,
          bottom: 34 * unit,
          fontFamily: MONO_FONT,
          fontSize: 14 * unit,
          letterSpacing: 0.16 * 14 * unit,
          textTransform: "uppercase",
          color: tint(accent, 0.6 + 0.3 * bandGlow),
        }}
      >
        19:00 – 22:00 · your peak
      </div>

      {/* Scale */}
      <div
        style={{
          position: "absolute",
          left: padX,
          bottom: 34 * unit,
          display: "flex",
          alignItems: "center",
          gap: 10 * unit,
        }}
      >
        <span style={{ fontFamily: SANS_FONT, fontSize: 15 * unit, color: BRAND.mutedForeground }}>
          Quiet
        </span>
        <div
          style={{
            width: 180 * unit,
            height: 12 * unit,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${tint(accent, 0.05)} 0%, ${tint(accent, 0.66)} 100%)`,
          }}
        />
        <span style={{ fontFamily: SANS_FONT, fontSize: 15 * unit, color: BRAND.foregroundSoft }}>
          Busy
        </span>
      </div>

      <AbsoluteFill
        style={{
          background: `radial-gradient(98% 90% at 50% 46%, transparent 56%, ${ink(mix(0.3, 0.38, bandGlow))} 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
