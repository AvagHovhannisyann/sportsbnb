/**
 * ReelWeeklySlots — this week's board for one venue: seven days of hourly
 * cells, free ones lighting in a diagonal wave, taken ones struck through.
 * 9:16 for Reels / TikTok / Stories, a seamless loop for a Monday-morning
 * "here's what's open" Story.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1920. The header, the grid and the footer all sit between y=270 (top
 * 14%) and y=1536 (bottom 20%), so the account row, sound pill, caption block
 * and action rail never cover a time. Only the backdrop bleeds.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 *  1. Every free cell lights with `pulse()`, phased by `(col + row)` so the
 *     wave runs corner to corner. `pulse()` is exactly 0 at local frame 0 and
 *     exactly 0 again from local frame 35, so every cell is dark at both ends
 *     of the cycle.
 *  2. The "free this week" counter chip rides the same pulse on phase 0.
 *  3. The backdrop bloom is a full cosine period and its grid drifts exactly
 *     one cell per loop.
 * No one-way tween exists in the file.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { Backdrop, Box, Eyebrow, Handle, Lockup, Money } from "./socialChrome";
import {
  BRAND,
  COMMISSION,
  DRAM,
  REEL,
  type Accent,
  accentAlpha,
  accentColor,
  bodyStyle,
  chalk,
  hashUnit,
  headlineStyle,
  ink,
  loopT,
  muted,
  numeralStyle,
  pulse,
  useMotionFrame,
} from "./socialKit";

export type ReelWeeklySlotsProps = {
  venueName: string;
  city: string;
  sport: string;
  /** Column headers. Seven is the design target; more will compress. */
  days: string[];
  /** Row headers — the hours on the board. */
  hours: string[];
  /** Scatter seed for which cells read as taken. Deterministic, never random. */
  seed: number;
  /** Roughly what share of cells are already taken, 0–1. */
  takenShare: number;
  pricePerHour: number;
  currency: string;
  accent: Accent;
};

export const reelWeeklySlotsDefaultProps: ReelWeeklySlotsProps = {
  venueName: "Mika Sports Complex",
  city: "Yerevan",
  sport: "Football",
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  hours: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"],
  seed: 12,
  takenShare: 0.42,
  pricePerHour: 18000,
  currency: DRAM,
  accent: "green",
};

const { width: W, height: H, safeTop: TOP, safeBottom: BOTTOM, gutter: G } = REEL;
const CONTENT_W = W - G * 2;

/** Grid geometry. The hour gutter is fixed; the day columns share the rest. */
const GRID_X = G;
const GRID_Y = 686;
const HOUR_GUTTER = 116;
const CELL_GAP = 10;

export const ReelWeeklySlots: FC<ReelWeeklySlotsProps> = ({
  venueName,
  city,
  sport,
  days,
  hours,
  seed,
  takenShare,
  pricePerHour,
  currency,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Loop: frame 0 both opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);

  const t = loopT(frame, durationInFrames);
  const cols = Math.max(1, days.length);
  const rows = Math.max(1, hours.length);
  const cellW = (CONTENT_W - HOUR_GUTTER - CELL_GAP * cols) / cols;
  const cellH = 96;

  /** Deterministic occupancy — hashUnit, never Math.random(). */
  const isTaken = (col: number, row: number): boolean =>
    hashUnit(col * 31 + row * 7, seed) < takenShare;

  let freeCount = 0;
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      if (!isTaken(c, r)) freeCount += 1;
    }
  }

  const chipBeat = pulse({ frame, fps, period: durationInFrames, phase: 0 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={t}
        motion={1}
        accent={accent}
        cell={72}
        bloomAt={[0.5, 0.24]}
      />

      <Box x={G} y={TOP} w={CONTENT_W}>
        <Eyebrow size={27} color={accentColor(accent)}>
          {`This week · ${sport} · ${city}`}
        </Eyebrow>
      </Box>

      <Box x={G} y={TOP + 62} w={CONTENT_W}>
        <div style={headlineStyle(88, BRAND.foreground)}>{venueName}</div>
        <div style={headlineStyle(88, accentColor(accent))}>
          {freeCount} free hours
        </div>
      </Box>

      {/* ── Day header ────────────────────────────────────────────────── */}
      <Box x={GRID_X + HOUR_GUTTER} y={GRID_Y - 54} w={CONTENT_W - HOUR_GUTTER}>
        {days.map((day, c) => (
          <span
            key={day}
            style={{
              position: "absolute",
              left: c * (cellW + CELL_GAP),
              top: 0,
              width: cellW,
              textAlign: "center",
              ...numeralStyle(26, muted(0.95), 600),
            }}
          >
            {day}
          </span>
        ))}
      </Box>

      {/* ── The board ─────────────────────────────────────────────────── */}
      <Box
        x={GRID_X}
        y={GRID_Y}
        w={CONTENT_W}
        h={rows * (cellH + CELL_GAP)}
      >
        {hours.map((hour, r) => (
          <span
            key={hour}
            style={{
              position: "absolute",
              left: 0,
              top: r * (cellH + CELL_GAP) + cellH / 2 - 18,
              width: HOUR_GUTTER - 14,
              ...numeralStyle(30, muted(0.9), 500),
            }}
          >
            {hour}
          </span>
        ))}

        {days.map((day, c) =>
          hours.map((hour, r) => {
            const taken = isTaken(c, r);
            const beat = taken
              ? 0
              : pulse({
                  frame,
                  fps,
                  period: durationInFrames,
                  /** Diagonal wave: the phase depends on col + row. */
                  phase:
                    (((c + r) % (cols + rows)) * durationInFrames) /
                    (cols + rows),
                });
            return (
              <div
                key={`${day}-${hour}`}
                style={{
                  position: "absolute",
                  left: HOUR_GUTTER + c * (cellW + CELL_GAP),
                  top: r * (cellH + CELL_GAP),
                  width: cellW,
                  height: cellH,
                  borderRadius: 20,
                  boxSizing: "border-box",
                  backgroundColor: taken
                    ? BRAND.muted
                    : accentAlpha(accent, 0.1 + 0.22 * beat),
                  border: `1.5px solid ${taken ? BRAND.border : accentAlpha(accent, 0.3 + 0.5 * beat)}`,
                  boxShadow: taken
                    ? "none"
                    : `0 0 ${34 * beat}px -10px ${accentAlpha(accent, 0.9)}`,
                  transform: `scale(${1 + 0.04 * beat})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {taken ? (
                  <div
                    style={{
                      width: cellW * 0.42,
                      height: 2,
                      backgroundColor: muted(0.45),
                    }}
                  />
                ) : (
                  <span
                    style={numeralStyle(24, chalk(0.5 + 0.5 * beat), 600)}
                  >
                    FREE
                  </span>
                )}
              </div>
            );
          }),
        )}
      </Box>

      {/* ── Price + zero commission chip ──────────────────────────────── */}
      <Box
        x={G}
        y={1338}
        w={CONTENT_W}
        h={112}
        style={{
          borderRadius: 36,
          backgroundColor: accentAlpha(accent, 0.08 + 0.05 * chipBeat),
          border: `2px solid ${accentAlpha(accent, 0.3 + 0.35 * chipBeat)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 34px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={bodyStyle(28, chalk(0.94), 600)}>
            {COMMISSION.badge}
          </span>
          <span style={bodyStyle(24, muted(0.95))}>
            {COMMISSION.playerLine}
          </span>
        </div>
        <Money
          amount={pricePerHour}
          currency={currency}
          size={40}
          color={accentColor(accent)}
          suffix="/ hour"
        />
      </Box>

      <Box
        x={G}
        y={BOTTOM - 70}
        w={CONTENT_W}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Lockup size={52} accent={accent} />
        <Handle size={21} />
      </Box>

      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${ink(0.45)} 0%, transparent 18%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
