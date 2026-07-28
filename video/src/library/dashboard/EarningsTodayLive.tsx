/**
 * EarningsTodayLive — the "today so far" earnings strip that sits above the
 * owner dashboard's stat row and stays on screen while the day runs.
 * A seamless loop. The figure never counts here — it is already correct, and a
 * number that re-counts every four seconds is a number nobody trusts.
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  SANS_FONT,
  breathe,
  cardSurface,
  chalk,
  courtGreen,
  dram,
  eyebrowStyle,
  hairline,
  interpolateSafe,
  loopT,
  muted,
  useMotionFrame,
  wrap,
} from "./dashboardKit";

const CANVAS_W = 720;

export type EarningsTodayLiveProps = {
  /** Dram taken today so far. Fixed for the length of the loop. */
  todayTotal: number;
  /** Bookings behind it. */
  todayBookings: number;
  /** Mono caps label. */
  label: string;
  /** Right-hand context line. */
  contextLine: string;
  /** Live-dot pings per loop. Any whole number keeps the seam exact. */
  pingsPerLoop: number;
};

export const earningsTodayLiveDefaultProps: EarningsTodayLiveProps = {
  todayTotal: 48000,
  todayBookings: 3,
  label: "Today so far",
  contextLine: "Updates as bookings confirm",
  pingsPerLoop: 3,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The sheen is a `backgroundPosition` translated by exactly one
 *     `backgroundSize` over the loop, so the tile at t = 1 is pixel-identical
 *     to the tile at t = 0.
 *  2. The glow and the underline gradient ride `breathe(t)` — one full cosine
 *     period, equal at both ends for any phase.
 *  3. The live dot's ping is `wrap(frame, period)` with `pingsPerLoop` whole
 *     cycles inside the loop, so the ring is back at its first keyframe on the
 *     wrap.
 *
 * There is no one-way tween in the file, and no figure moves.
 */
export const EarningsTodayLive: FC<EarningsTodayLiveProps> = ({
  todayTotal,
  todayBookings,
  label,
  contextLine,
  pingsPerLoop,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const unit = width / CANVAS_W;

  // Loop: frame 0 opens and closes the cycle, so reduced motion freezes there.
  const frame = useMotionFrame(rawFrame, 0);
  const t = loopT(frame, durationInFrames);
  const glow = breathe(t);

  const pings = Math.max(1, Math.round(pingsPerLoop));
  const pingPeriod = durationInFrames / pings;
  const pingT = wrap(frame, pingPeriod) / pingPeriod;
  const pingScale = interpolateSafe(pingT, [0, 0.8, 1], [1, 2.6, 2.6], EASE_OUT_EXPO);
  const pingAlpha = interpolateSafe(pingT, [0, 0.8, 1], [0.6, 0, 0], EASE_OUT_EXPO);

  /** One full sheen tile per loop — the exact backgroundPosition period. */
  const sheenTile = width * 1.6;
  const sheenOffset = t * sheenTile;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <div
        style={{
          position: "absolute",
          left: 28 * unit,
          right: 28 * unit,
          top: 28 * unit,
          bottom: 28 * unit,
          ...cardSurface(unit, 22),
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: `0 ${32 * unit}px`,
        }}
      >
        {/* Sheen. One tile of travel per loop — exactly periodic. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(104deg, transparent 40%, ${chalk(0.05)} 48%, ${courtGreen(0.09)} 52%, transparent 62%)`,
            backgroundSize: `${sheenTile}px 100%`,
            backgroundRepeat: "repeat-x",
            backgroundPosition: `${sheenOffset.toFixed(2)}px 0`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(70% 140% at 12% 50%, ${courtGreen(0.05 + 0.06 * glow)} 0%, transparent 68%)`,
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 12 * unit,
          }}
        >
          <span
            style={{
              position: "relative",
              display: "inline-flex",
              width: 9 * unit,
              height: 9 * unit,
              borderRadius: 999,
              backgroundColor: BRAND.primary,
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                backgroundColor: BRAND.primary,
                transform: `scale(${pingScale.toFixed(3)})`,
                opacity: pingAlpha,
              }}
            />
          </span>
          <span style={{ ...eyebrowStyle(unit * 1.1) }}>{label}</span>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "baseline",
            gap: 16 * unit,
            marginTop: 14 * unit,
          }}
        >
          <span
            style={{
              fontFamily: MONO_FONT,
              fontVariantNumeric: "tabular-nums",
              fontSize: 62 * unit,
              fontWeight: 500,
              letterSpacing: -0.02 * 62 * unit,
              lineHeight: 1,
              color: BRAND.foreground,
              textShadow: `0 0 ${(18 + 14 * glow).toFixed(1)}px ${courtGreen(0.16 + 0.12 * glow)}`,
            }}
          >
            {dram(todayTotal)}
          </span>
          <span
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 18 * unit,
              fontWeight: 600,
              color: muted(0.9),
            }}
          >
            {todayBookings === 1
              ? "1 booking"
              : `${Math.max(0, Math.round(todayBookings))} bookings`}
          </span>
        </div>

        {/* Underline: a gradient whose stop positions ride the same full
            cosine, so it breathes without ever travelling anywhere. */}
        <div
          style={{
            position: "relative",
            marginTop: 20 * unit,
            height: 2 * unit,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${courtGreen(0.15 + 0.5 * glow)} 0%, ${courtGreen(0.5 - 0.35 * glow)} 55%, transparent 100%)`,
          }}
        />

        <div
          style={{
            position: "relative",
            marginTop: 14 * unit,
            fontFamily: SANS_FONT,
            fontSize: 14.5 * unit,
            color: muted(0.85),
          }}
        >
          {contextLine}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 1 * unit,
            background: `linear-gradient(90deg, transparent, ${hairline(1)} 40%, ${hairline(1)} 60%, transparent)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
