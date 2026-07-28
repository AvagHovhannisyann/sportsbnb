/**
 * ReelGameNightInvite — "we're short two players tonight": an open game with a
 * roster filling up and the spots-left count doing the persuading.
 * 9:16 for Reels / TikTok / Stories, built as a seamless loop so it can be
 * posted as a Story that repeats until the game fills.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1920. All copy sits between y=270 (top 14%) and y=1536 (bottom 20%) —
 * clear of the account row, sound pill, caption block and action rail. The
 * backdrop, the glow and the chevron rail are the only things that bleed.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 *  1. Roster seats use `pulse()`, exactly 0 at local frame 0 and exactly 0
 *     again from local frame 35, phased `i · duration / seats` apart.
 *  2. The spots-left badge rides the same `pulse()` on its own phase.
 *  3. The chevron rail is a wrap() lattice: chevron i sits at
 *     `wrap(i·S − t·N·S, N·S)`, so at t=1 every chevron is exactly where
 *     chevron i started — the set is identical, not merely similar.
 *  4. The backdrop bloom is a full cosine period and its grid drifts exactly
 *     one cell.
 * No one-way tween exists in the file.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  Backdrop,
  Box,
  CalendarIcon,
  Chip,
  Eyebrow,
  Handle,
  Lockup,
  Money,
  PinIcon,
  UsersIcon,
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
  hashUnit,
  ink,
  loopT,
  muted,
  numeralStyle,
  pulse,
  useMotionFrame,
  wrap,
} from "./socialKit";

export type ReelGameNightInviteProps = {
  sport: string;
  venueName: string;
  district: string;
  city: string;
  dateLabel: string;
  timeLabel: string;
  /** Total seats in the game. */
  squadSize: number;
  /** How many are already in. The rest render as open seats. */
  joined: number;
  /** Initials for the filled seats. Cycled if shorter than `joined`. */
  initials: string[];
  /** Split per player, in dram. */
  pricePerPlayer: number;
  currency: string;
  accent: Accent;
};

export const reelGameNightInviteDefaultProps: ReelGameNightInviteProps = {
  sport: "Football",
  venueName: "Ararat Arena",
  district: "Kentron",
  city: "Yerevan",
  dateLabel: "Friday 1 Aug",
  timeLabel: "21:00 – 22:00",
  squadSize: 10,
  joined: 8,
  initials: ["AR", "DV", "GH", "KM", "LS", "NT", "SV", "TG"],
  pricePerPlayer: 1800,
  currency: DRAM,
  accent: "green",
};

const { width: W, height: H, safeTop: TOP, safeBottom: BOTTOM, gutter: G } = REEL;
const CONTENT_W = W - G * 2;

/** Chevron rail lattice: 9 chevrons, 150px apart. */
const CHEVRON_N = 9;
const CHEVRON_S = 150;
const CHEVRON_PERIOD = CHEVRON_N * CHEVRON_S;

export const ReelGameNightInvite: FC<ReelGameNightInviteProps> = ({
  sport,
  venueName,
  district,
  city,
  dateLabel,
  timeLabel,
  squadSize,
  joined,
  initials,
  pricePerPlayer,
  currency,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Loop: frame 0 both opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);

  const t = loopT(frame, durationInFrames);
  const seats = Math.max(1, squadSize);
  const filled = Math.min(joined, seats);
  const open = seats - filled;

  const badgeBeat = pulse({
    frame,
    fps,
    period: durationInFrames,
    phase: 0,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={t}
        motion={1}
        accent={accent}
        cell={72}
        bloomAt={[0.5, 0.28]}
      />

      <Box x={G} y={TOP} w={CONTENT_W}>
        <Eyebrow size={27} color={accentColor(accent)}>
          {`Open game · ${city}`}
        </Eyebrow>
      </Box>

      <Box x={G} y={TOP + 62} w={CONTENT_W}>
        <div style={headlineStyle(104, BRAND.foreground)}>{sport}</div>
        <div style={headlineStyle(104, accentColor(accent))}>{timeLabel}</div>
      </Box>

      {/* Venue + date strip. */}
      <Box
        x={G}
        y={TOP + 300}
        w={CONTENT_W}
        h={124}
        style={{
          borderRadius: 34,
          backgroundColor: BRAND.card,
          border: `1.5px solid ${BRAND.border}`,
          display: "flex",
          alignItems: "center",
          gap: 30,
          padding: "0 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <PinIcon size={32} color={accentColor(accent)} weight={2} />
          <span style={bodyStyle(29, chalk(0.94), 600)}>{venueName}</span>
        </div>
        <div style={{ width: 1.5, height: 46, backgroundColor: BRAND.border }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <CalendarIcon size={32} color={muted(1)} weight={2} />
          <span style={bodyStyle(29, muted(1))}>{dateLabel}</span>
        </div>
      </Box>

      {/* ── Roster ────────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={780}
        w={CONTENT_W}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <UsersIcon size={32} color={muted(1)} weight={2} />
          <span style={bodyStyle(28, muted(1), 600)}>
            {filled} of {seats} in
          </span>
        </div>
        <span style={bodyStyle(28, muted(1), 600)}>{district}</span>
      </Box>

      <Box
        x={G}
        y={834}
        w={CONTENT_W}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 22,
          justifyContent: "flex-start",
        }}
      >
        {Array.from({ length: seats }, (_, i) => {
          const isFilled = i < filled;
          const beat = pulse({
            frame,
            fps,
            period: durationInFrames,
            phase: (i * durationInFrames) / seats,
          });
          const size = 152;
          const hue = 140 + Math.round(hashUnit(i, 7) * 40);
          return (
            <div
              key={i}
              style={{
                width: size,
                height: size,
                borderRadius: 46,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isFilled
                  ? `hsl(${hue}, 32%, 18%)`
                  : "transparent",
                border: isFilled
                  ? `2px solid ${accentAlpha(accent, 0.25 + 0.45 * beat)}`
                  : `3px dashed ${accentAlpha(accent, 0.32 + 0.4 * beat)}`,
                boxShadow: isFilled
                  ? `0 0 ${44 * beat}px -16px ${accentAlpha(accent, 0.9)}`
                  : "none",
                transform: `scale(${1 + 0.035 * beat})`,
              }}
            >
              <span
                style={
                  isFilled
                    ? numeralStyle(44, chalk(0.72 + 0.28 * beat), 600)
                    : numeralStyle(52, accentAlpha(accent, 0.6 + 0.4 * beat), 700)
                }
              >
                {isFilled
                  ? initials.length > 0
                    ? initials[i % initials.length]
                    : "··"
                  : "+"}
              </span>
            </div>
          );
        })}
      </Box>

      {/* ── Spots-left badge + split ──────────────────────────────────── */}
      <Box
        x={G}
        y={1224}
        w={CONTENT_W}
        h={146}
        style={{
          borderRadius: 40,
          backgroundColor: accentAlpha(accent, 0.1 + 0.05 * badgeBeat),
          border: `2px solid ${accentAlpha(accent, 0.4 + 0.4 * badgeBeat)}`,
          boxShadow: `0 0 ${100 * badgeBeat}px -30px ${accentAlpha(accent, 0.9)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 38px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <span style={headlineStyle(74, accentColor(accent))}>{open}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={headlineStyle(38, BRAND.foreground, 700)}>
              {open === 1 ? "spot left" : "spots left"}
            </span>
            <span style={bodyStyle(25, muted(1))}>{COMMISSION.playerLine}</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          <Money
            amount={pricePerPlayer}
            currency={currency}
            size={40}
            color={chalk(0.95)}
          />
          <span style={bodyStyle(23, muted(0.95))}>per player</span>
        </div>
      </Box>

      {/* ── Chevron rail — the wrap() lattice ─────────────────────────── */}
      <Box x={0} y={1400} w={W} h={74} style={{ overflow: "hidden" }}>
        <svg width={W} height={74} viewBox={`0 0 ${W} 74`} style={{ display: "block" }}>
          {Array.from({ length: CHEVRON_N }, (_, i) => {
            const x = wrap(i * CHEVRON_S - t * CHEVRON_PERIOD, CHEVRON_PERIOD);
            return (
              <path
                key={i}
                d={`M ${x} 18 L ${x + 30} 37 L ${x} 56`}
                fill="none"
                stroke={accentAlpha(accent, 0.55)}
                strokeWidth={7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to right, ${BRAND.background} 0%, transparent 16%, transparent 84%, ${BRAND.background} 100%)`,
          }}
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
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Chip size={22} accent={accent}>
            {COMMISSION.badge}
          </Chip>
          <Handle size={22} />
        </div>
      </Box>

      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${ink(0.45)} 0%, transparent 20%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
