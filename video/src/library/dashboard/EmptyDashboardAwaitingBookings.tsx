/**
 * EmptyDashboardAwaitingBookings — /owner-dashboard once a venue is live but no
 * player has booked it yet, which is where every new SportsBnB owner sits.
 * A seamless idle loop. The week grid is real and simply unfilled, and a beacon
 * marks the slot the first booking will land in, so the page reads as listening.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  TAU,
  breathe,
  cardSurface,
  courtGreen,
  dram,
  eyebrowStyle,
  hairline,
  hashUnit,
  ink,
  loopT,
  muted,
  useMotionFrame,
  wrap,
} from "./dashboardKit";

const CANVAS_W = 1180;

export type EmptyDashboardAwaitingBookingsProps = {
  /** Mono caps eyebrow. */
  eyebrow: string;
  /** The venue that is live. */
  venueName: string;
  /** Headline. */
  title: string;
  /** Body under the headline. */
  body: string;
  /** The rate the owner set — and keeps in full. In dram. */
  hourlyRate: number;
  /** Column headings, left to right. */
  dayLabels: string[];
  /** Slot rows down the grid. */
  slotLabels: string[];
  /** Row-major index of the slot the beacon marks. */
  beaconIndex: number;
  /** Beacon rings on the wrap lattice. More rings, denser pulse. */
  ringCount: number;
};

export const emptyDashboardAwaitingBookingsDefaultProps: EmptyDashboardAwaitingBookingsProps =
  {
    eyebrow: "Live · awaiting first booking",
    venueName: "Ararat Arena · Court 2",
    title: "Your court is listed. Nobody has booked it yet.",
    body: "Nothing is wrong. The week below is genuinely empty, and the first slot a player takes appears right here — at the price you set, in full.",
    hourlyRate: 14000,
    dayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    slotLabels: ["17:00", "18:00", "19:00", "20:00", "21:00"],
    beaconIndex: 26,
    ringCount: 3,
  };

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The beacon is a `wrap()` lattice: ring k rides `u = wrap(t + k/K, 1)`,
 *     so the *set* of rings at t and at t + 1 is the same set. Each ring's own
 *     opacity is `sin(π·u)`, exactly 0 at u = 0 and u = 1, so the instant a
 *     ring wraps back to the centre it is fully transparent — the discontinuity
 *     in radius is never painted.
 *  2. Cell tints, the venue dot and the beacon core ride `breathe(t, φ)` — one
 *     full cosine period, identical at both ends for any phase φ.
 *  3. Nothing counts and nothing tweens one way. The grid stays empty for the
 *     whole cycle, because it is empty.
 */
export const EmptyDashboardAwaitingBookings: FC<
  EmptyDashboardAwaitingBookingsProps
> = ({
  eyebrow,
  venueName,
  title,
  body,
  hourlyRate,
  dayLabels,
  slotLabels,
  beaconIndex,
  ringCount,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const unit = width / CANVAS_W;

  // Loop: frame 0 both opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);
  const t = loopT(frame, durationInFrames);
  const glow = breathe(t);

  const cols = Math.max(1, dayLabels.length);
  const rows = Math.max(1, slotLabels.length);
  const cellCount = cols * rows;

  const padX = 40 * unit;
  const copyW = 400 * unit;
  const gridLeft = padX + copyW + 44 * unit;
  const gridRight = width - padX;
  const labelW = 54 * unit;
  const cellsLeft = gridLeft + labelW;
  const gridTop = 116 * unit;
  const gridBottom = height - 56 * unit;
  const gap = 8 * unit;
  const cellW = (gridRight - cellsLeft - gap * (cols - 1)) / cols;
  const cellH = (gridBottom - gridTop - gap * (rows - 1)) / rows;

  const beacon = Math.max(0, Math.min(cellCount - 1, Math.round(beaconIndex)));
  const beaconCol = beacon % cols;
  const beaconRow = Math.floor(beacon / cols);
  const beaconCx = cellsLeft + (cellW + gap) * beaconCol + cellW / 2;
  const beaconCy = gridTop + (cellH + gap) * beaconRow + cellH / 2;

  const rings = Math.max(1, Math.round(ringCount));
  const rMin = Math.min(cellW, cellH) * 0.34;
  const rMax = Math.max(cellW, cellH) * 2.6;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(92% 78% at 26% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 76%)`,
        }}
      />

      {/* ── The copy side ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: padX,
          top: 62 * unit,
          width: copyW,
          display: "flex",
          flexDirection: "column",
          gap: 16 * unit,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 10 * unit }}
        >
          <div
            style={{
              width: 8 * unit,
              height: 8 * unit,
              borderRadius: 999,
              backgroundColor: BRAND.primary,
              opacity: 0.4 + 0.6 * glow,
              boxShadow: `0 0 ${(10 * glow).toFixed(1)}px ${courtGreen(0.6 * glow)}`,
            }}
          />
          <span style={{ ...eyebrowStyle(unit) }}>{eyebrow}</span>
        </div>

        <div
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 21 * unit,
            fontWeight: 700,
            letterSpacing: -0.02 * 21 * unit,
            color: BRAND.foregroundSoft,
          }}
        >
          {venueName}
        </div>

        <div
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 32 * unit,
            fontWeight: 700,
            letterSpacing: -0.03 * 32 * unit,
            lineHeight: 1.18,
            color: BRAND.foreground,
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 16 * unit,
            lineHeight: 1.5,
            color: muted(0.95),
          }}
        >
          {body}
        </div>

        <div
          style={{
            marginTop: 8 * unit,
            ...cardSurface(unit, 16),
            padding: `${16 * unit}px ${18 * unit}px`,
            display: "flex",
            alignItems: "baseline",
            gap: 10 * unit,
          }}
        >
          <span
            style={{
              fontFamily: MONO_FONT,
              fontVariantNumeric: "tabular-nums",
              fontSize: 30 * unit,
              fontWeight: 500,
              letterSpacing: -0.02 * 30 * unit,
              color: BRAND.primary,
            }}
          >
            {dram(hourlyRate)}
          </span>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 14.5 * unit,
              color: muted(0.9),
            }}
          >
            per hour — we take {dram(0)} of it
          </span>
        </div>
      </div>

      {/* ── The empty week ────────────────────────────────────────────── */}
      {dayLabels.map((day, c) => (
        <div
          key={day}
          style={{
            position: "absolute",
            left: cellsLeft + (cellW + gap) * c,
            width: cellW,
            top: gridTop - 30 * unit,
            textAlign: "center",
            fontFamily: MONO_FONT,
            fontSize: 12 * unit,
            textTransform: "uppercase",
            letterSpacing: 0.14 * 12 * unit,
            color: muted(0.72),
          }}
        >
          {day}
        </div>
      ))}

      {slotLabels.map((slot, r) => (
        <div
          key={slot}
          style={{
            position: "absolute",
            left: gridLeft,
            width: labelW - 12 * unit,
            top: gridTop + (cellH + gap) * r + cellH / 2 - 8 * unit,
            textAlign: "right",
            fontFamily: MONO_FONT,
            fontVariantNumeric: "tabular-nums",
            fontSize: 12.5 * unit,
            color: muted(0.7),
          }}
        >
          {slot}
        </div>
      ))}

      {/* Beacon rings sit under the cells so the grid stays legible. */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {Array.from({ length: rings }, (unused, k) => {
          const u = wrap(t + k / rings, 1);
          const r = rMin + (rMax - rMin) * u;
          // sin(πu) is exactly 0 at both ends, so the radius reset is unpainted.
          const alpha = Math.sin(Math.PI * u);
          return (
            <circle
              key={k}
              cx={beaconCx}
              cy={beaconCy}
              r={r}
              fill="none"
              stroke={courtGreen(0.3 * alpha)}
              strokeWidth={2 * unit}
            />
          );
        })}
      </svg>

      {Array.from({ length: cellCount }, (unused, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const isBeacon = i === beacon;
        const shimmer = breathe(t, hashUnit(i, 17) * TAU);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cellsLeft + (cellW + gap) * col,
              top: gridTop + (cellH + gap) * row,
              width: cellW,
              height: cellH,
              borderRadius: 9 * unit,
              backgroundColor: isBeacon
                ? courtGreen(0.1 + 0.08 * glow)
                : BRAND.input,
              border: isBeacon
                ? `${1.6 * unit}px solid ${courtGreen(0.4 + 0.35 * glow)}`
                : `${1 * unit}px solid ${hairline(0.5 + 0.18 * shimmer)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isBeacon
                ? `0 0 ${(18 * unit * glow).toFixed(2)}px ${-4 * unit}px ${courtGreen(0.55)}`
                : "none",
            }}
          >
            {isBeacon ? (
              <div
                style={{
                  width: 9 * unit,
                  height: 9 * unit,
                  borderRadius: 999,
                  backgroundColor: BRAND.primary,
                  opacity: 0.55 + 0.45 * glow,
                }}
              />
            ) : null}
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: cellsLeft,
          right: padX,
          top: gridBottom + 22 * unit,
          textAlign: "center",
          fontFamily: SANS_FONT,
          fontSize: 14 * unit,
          color: muted(0.75),
        }}
      >
        an empty week is not a failed week — it is an unbooked one
      </div>

      <AbsoluteFill
        style={{
          background: `radial-gradient(122% 98% at 40% 46%, transparent 54%, ${ink(0.4)} 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
