/**
 * ReelBeforeAfterEmptyBooked — the owner's "before and after": the same hour,
 * empty on one side of the wipe and booked on the other.
 * 9:16 for Reels / TikTok / Stories, a seamless loop so the comparison keeps
 * sweeping for as long as the audio runs.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1920. The label above the panel sits below y=270 (top 14%) and the
 * payout line and footer above y=1536 (bottom 20%), so the account row, sound
 * pill, caption block and action rail never sit on top of a word. The panel
 * itself is inside the band; only the backdrop bleeds.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 *  1. The wipe position is `sway(t, -0.25)` = `0.5 + 0.5·sin(2π(t − ¼))`, a
 *     FULL sine period: exactly 0 at t=0, 1 at t=½, and exactly 0 again at
 *     t=1. The sweep goes out and comes back, so there is no snap at the seam.
 *  2. The booked side's glow is driven by the same value, so it is dark at
 *     both ends of the cycle.
 *  3. The slot rows use `pulse()`, exactly 0 at both ends of each cycle.
 *  4. The backdrop bloom is a full cosine period; its grid drifts exactly one
 *     cell per loop.
 * No one-way tween exists in the file.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  Backdrop,
  Box,
  CheckIcon,
  ClockIcon,
  Eyebrow,
  Handle,
  Lockup,
  Money,
} from "./socialChrome";
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
  headlineStyle,
  ink,
  loopT,
  muted,
  numeralStyle,
  pulse,
  smoothstep,
  sway,
  useMotionFrame,
} from "./socialKit";

export type ReelBeforeAfterEmptyBookedProps = {
  venueName: string;
  city: string;
  /** The hours on the board. */
  slots: string[];
  /** Which of those are booked in the "after" state. Indices into `slots`. */
  bookedIndices: number[];
  /** Hourly rate, in dram. */
  pricePerHour: number;
  currency: string;
  beforeLabel: string;
  afterLabel: string;
  accent: Accent;
};

export const reelBeforeAfterEmptyBookedDefaultProps: ReelBeforeAfterEmptyBookedProps =
  {
    venueName: "Nairi Football Park",
    city: "Yerevan",
    slots: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"],
    bookedIndices: [0, 1, 2, 4, 5],
    pricePerHour: 14000,
    currency: DRAM,
    beforeLabel: "Before SportsBnB",
    afterLabel: "After SportsBnB",
    accent: "green",
  };

const { width: W, height: H, safeTop: TOP, safeBottom: BOTTOM, gutter: G } = REEL;
const CONTENT_W = W - G * 2;

const PANEL_Y = 540;
const PANEL_H = 720;
const ROW_H = 96;
const ROW_GAP = 18;

/** One side of the board. Identical geometry, different state. */
const Board: FC<{
  frame: number;
  fps: number;
  duration: number;
  slots: string[];
  booked: boolean[];
  accent: Accent;
  label: string;
  heat: number;
}> = ({ frame, fps, duration, slots, booked, accent, label, heat }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      borderRadius: 44,
      backgroundColor: BRAND.card,
      border: `2px solid ${accentAlpha(accent, 0.14 + 0.4 * heat)}`,
      boxSizing: "border-box",
      padding: 34,
      display: "flex",
      flexDirection: "column",
      gap: ROW_GAP,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
      }}
    >
      <span style={bodyStyle(28, heat > 0.5 ? accentColor(accent) : muted(1), 600)}>
        {label}
      </span>
      <span style={numeralStyle(26, muted(0.9), 500)}>
        {booked.filter(Boolean).length}/{slots.length} BOOKED
      </span>
    </div>

    {slots.map((slot, i) => {
      const isBooked = booked[i];
      const beat = isBooked
        ? pulse({ frame, fps, period: duration, phase: (i * duration) / slots.length })
        : 0;
      return (
        <div
          key={slot}
          style={{
            height: ROW_H,
            flexShrink: 0,
            borderRadius: 26,
            backgroundColor: isBooked
              ? accentAlpha(accent, 0.12 + 0.06 * beat)
              : BRAND.muted,
            border: `1.5px solid ${isBooked ? accentAlpha(accent, 0.35 + 0.4 * beat) : BRAND.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ClockIcon
              size={30}
              color={isBooked ? accentColor(accent) : muted(0.6)}
              weight={2}
            />
            <span
              style={numeralStyle(
                34,
                isBooked ? chalk(0.95) : muted(0.65),
                600,
              )}
            >
              {slot}
            </span>
          </div>
          {isBooked ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={bodyStyle(25, accentColor(accent), 600)}>Booked</span>
              <CheckIcon size={26} color={accentColor(accent)} weight={2.8} />
            </div>
          ) : (
            <span style={bodyStyle(25, muted(0.6))}>Empty</span>
          )}
        </div>
      );
    })}
  </div>
);

export const ReelBeforeAfterEmptyBooked: FC<
  ReelBeforeAfterEmptyBookedProps
> = ({
  venueName,
  city,
  slots,
  bookedIndices,
  pricePerHour,
  currency,
  beforeLabel,
  afterLabel,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Loop: frame 0 both opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);

  const t = loopT(frame, durationInFrames);
  /** 0 → 1 → 0 across the loop. Exactly 0 at both ends. */
  const sweep = sway(t, -0.25);
  const eased = smoothstep(sweep);

  const shown = slots.slice(0, 6);
  const noneBooked = shown.map(() => false);
  const allBooked = shown.map((_, i) => bookedIndices.indexOf(i) !== -1);
  const bookedCount = allBooked.filter(Boolean).length;
  const revenue = bookedCount * pricePerHour;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={t}
        motion={1}
        accent={accent}
        cell={72}
        bloomAt={[0.5, 0.3]}
        bloom={0.6 + 0.8 * eased}
      />

      <Box x={G} y={TOP} w={CONTENT_W}>
        <Eyebrow size={27} color={accentColor(accent)}>
          {`${venueName} · ${city}`}
        </Eyebrow>
      </Box>

      <Box x={G} y={TOP + 62} w={CONTENT_W}>
        <div style={headlineStyle(94, BRAND.foreground)}>Same pitch.</div>
        <div style={headlineStyle(94, accentColor(accent))}>Full week.</div>
      </Box>

      {/* ── The board, wiped ─────────────────────────────────────────── */}
      <Box
        x={G}
        y={PANEL_Y}
        w={CONTENT_W}
        h={PANEL_H}
        style={{ borderRadius: 44, overflow: "hidden" }}
      >
        <Board
          frame={frame}
          fps={fps}
          duration={durationInFrames}
          slots={shown}
          booked={noneBooked}
          accent={accent}
          label={beforeLabel}
          heat={0}
        />

        {/* The "after" side, revealed by a clip that sweeps out and back. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: `inset(0 ${(1 - eased) * 100}% 0 0)`,
          }}
        >
          <Board
            frame={frame}
            fps={fps}
            duration={durationInFrames}
            slots={shown}
            booked={allBooked}
            accent={accent}
            label={afterLabel}
            heat={1}
          />
        </div>

        {/* The wipe edge itself. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${eased * 100}%`,
            width: 6,
            marginLeft: -3,
            backgroundColor: accentColor(accent),
            boxShadow: `0 0 40px 6px ${accentAlpha(accent, 0.8)}`,
            opacity: eased * (1 - eased) * 4,
          }}
        />
      </Box>

      {/* ── Payout line ───────────────────────────────────────────────── */}
      <Box
        x={G}
        y={1308}
        w={CONTENT_W}
        h={146}
        style={{
          borderRadius: 40,
          backgroundColor: accentAlpha(accent, 0.06 + 0.08 * eased),
          border: `2px solid ${accentAlpha(accent, 0.2 + 0.4 * eased)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 38px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={bodyStyle(27, muted(1))}>
            {bookedCount} hours booked · you receive
          </span>
          <span style={bodyStyle(24, muted(0.9))}>{COMMISSION.ownerLine}</span>
        </div>
        <Money
          amount={revenue}
          currency={currency}
          size={54}
          color={accentColor(accent)}
          weight={700}
        />
      </Box>

      <Box
        x={G}
        y={BOTTOM - 72}
        w={CONTENT_W}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Lockup size={54} accent={accent} />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={bodyStyle(24, chalk(0.8), 600)}>{COMMISSION.badge}</span>
          <Handle size={22} />
        </div>
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
