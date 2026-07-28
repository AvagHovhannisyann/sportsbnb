/**
 * AvailabilityDayStrip — the seven-day availability rail that sits under the
 * hero on /venues/:id: each day a row of hour blocks, free ones lit, taken ones
 * dark, with a scan light running the strip.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  MONO_FONT,
  SANS_FONT,
  SPORTS,
  type SportKey,
  chalk,
  clamp01,
  hairline,
  hashUnit,
  ink,
  mix,
  oscillate,
  pulse,
  tint,
  useMotionFrame,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type AvailabilityDayStripProps = {
  /** Day labels, left to right. Seven reads best. */
  days: string[];
  /** First bookable hour of the day, 24h. */
  openHour: number;
  /** Last bookable hour of the day, 24h. Exclusive. */
  closeHour: number;
  /** Roughly what fraction of blocks are already taken, 0–1. */
  bookedDensity: number;
  /** Seed for the deterministic booked/free pattern. */
  seed: number;
  /** Drives the accent only. */
  sport: SportKey;
};

export const availabilityDayStripDefaultProps: AvailabilityDayStripProps = {
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  openHour: 8,
  closeHour: 23,
  bookedDensity: 0.42,
  seed: 12,
  sport: "football",
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The scan light is a `repeating-linear-gradient` whose `backgroundPosition`
 *     advances by exactly one tile width across the loop. A repeating pattern
 *     shifted by one whole tile is pixel-identical to the unshifted one.
 *  2. Each free block breathes on `pulse()` — the rise/hold/settle spring that
 *     is exactly 0 at both ends of its period — with per-block phases spread
 *     across that same period.
 *  3. The header's "live" dot is `oscillate(t)`, one full cosine.
 *  4. Which blocks are booked comes from `hashUnit(index, seed)`, evaluated
 *     once per block and never from the frame, so the pattern is identical on
 *     frame 0 and frame `durationInFrames`.
 *
 * No one-way tween anywhere.
 */
export const AvailabilityDayStrip: FC<AvailabilityDayStripProps> = ({
  days,
  openHour,
  closeHour,
  bookedDensity,
  seed,
  sport,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const accent = SPORTS[sport].accent;

  const hours = Math.max(1, closeHour - openHour);
  const rows = days.length > 0 ? days : availabilityDayStripDefaultProps.days;

  const padX = 56 * unit;
  const labelW = 92 * unit;
  const gridX = padX + labelW;
  const gridW = width - gridX - padX;
  const blockGap = 4 * unit;
  const blockW = (gridW - blockGap * (hours - 1)) / hours;

  const topY = 128 * unit;
  const rowH = (height - topY - 70 * unit) / rows.length;

  // One tile of the scan pattern. Shifting by exactly this is shifting by nothing.
  const scanTile = gridW / 2;
  const period = durationInFrames;

  const isBooked = (day: number, hour: number): boolean =>
    hashUnit(day * 31 + hour, seed) < clamp01(bookedDensity);

  const live = oscillate(t);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(92% 70% at 50% 12%, ${BRAND.surface1} 0%, ${BRAND.background} 78%)`,
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "absolute",
          left: padX,
          right: padX,
          top: 46 * unit,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: SANS_FONT,
            fontSize: 30 * unit,
            fontWeight: 600,
            color: BRAND.foreground,
          }}
        >
          This week
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 * unit }}>
          <span
            style={{
              width: 9 * unit,
              height: 9 * unit,
              borderRadius: "50%",
              backgroundColor: accent,
              boxShadow: `0 0 ${(8 + 12 * live) * unit}px ${tint(accent, 0.8)}`,
            }}
          />
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 14 * unit,
              fontWeight: 500,
              letterSpacing: 0.18 * 14 * unit,
              textTransform: "uppercase",
              color: tint(accent, 0.75 + 0.25 * live),
            }}
          >
            Live availability
          </span>
        </div>
      </div>

      {/* Hour ruler */}
      <div
        style={{
          position: "absolute",
          left: gridX,
          top: topY - 30 * unit,
          width: gridW,
          display: "flex",
        }}
      >
        {Array.from({ length: hours }, (_, h) => (
          <div
            key={h}
            style={{
              width: blockW,
              marginRight: h === hours - 1 ? 0 : blockGap,
              textAlign: "center",
              fontFamily: MONO_FONT,
              fontSize: 12 * unit,
              fontVariantNumeric: "tabular-nums",
              color: h % 2 === 0 ? BRAND.mutedForeground : "transparent",
            }}
          >
            {openHour + h}
          </div>
        ))}
      </div>

      {/* The rows */}
      {rows.map((day, d) => (
        <div key={day} style={{ position: "absolute", left: padX, top: topY + d * rowH }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: rowH * 0.5 - 11 * unit,
              width: labelW,
              fontFamily: SANS_FONT,
              fontSize: 21 * unit,
              fontWeight: 600,
              color: d >= rows.length - 2 ? BRAND.foreground : BRAND.foregroundSoft,
            }}
          >
            {day}
          </div>
          {Array.from({ length: hours }, (_, h) => {
            const booked = isBooked(d, h);
            const phase = wrap((d * hours + h) * 7.3, period);
            const glow = booked ? 0 : pulse({ frame, fps, period, phase });
            return (
              <div
                key={h}
                style={{
                  position: "absolute",
                  left: labelW + h * (blockW + blockGap),
                  top: rowH * 0.5 - 15 * unit,
                  width: blockW,
                  height: 30 * unit,
                  borderRadius: 7 * unit,
                  backgroundColor: booked
                    ? BRAND.surface3
                    : tint(accent, 0.16 + 0.34 * glow),
                  border: `${1 * unit}px solid ${booked ? hairline(0.9) : tint(accent, 0.3 + 0.4 * glow)}`,
                  boxShadow: booked
                    ? undefined
                    : `0 0 ${16 * unit * glow}px ${tint(accent, 0.4 * glow)}`,
                  opacity: booked ? 0.55 : 1,
                }}
              />
            );
          })}
        </div>
      ))}

      {/* The scan light — one whole tile of travel, i.e. none at all. */}
      <div
        style={{
          position: "absolute",
          left: gridX,
          top: topY,
          width: gridW,
          height: rowH * rows.length,
          backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, ${chalk(0.05)} ${scanTile * 0.42}px, ${chalk(0.09)} ${scanTile * 0.5}px, ${chalk(0.05)} ${scanTile * 0.58}px, transparent ${scanTile}px)`,
          backgroundPosition: `${t * scanTile}px 0px`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          left: padX,
          bottom: 26 * unit,
          display: "flex",
          alignItems: "center",
          gap: 26 * unit,
        }}
      >
        {[
          { label: "Free", fill: tint(accent, 0.3), edge: tint(accent, 0.5) },
          { label: "Booked", fill: BRAND.surface3, edge: hairline(1) },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 9 * unit }}>
            <span
              style={{
                width: 22 * unit,
                height: 14 * unit,
                borderRadius: 5 * unit,
                backgroundColor: item.fill,
                border: `${1 * unit}px solid ${item.edge}`,
              }}
            />
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 16 * unit,
                color: BRAND.mutedForeground,
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <AbsoluteFill
        style={{
          background: `radial-gradient(96% 88% at 50% 44%, transparent 52%, ${ink(mix(0.34, 0.42, live))} 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
