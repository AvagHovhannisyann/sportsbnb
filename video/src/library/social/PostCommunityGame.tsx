/**
 * PostCommunityGame — an open game anyone can join: when, where, how many
 * seats are left and what each player pays.
 * 1:1 for Instagram / Facebook feed, one-way — the community / pickup post.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1080. Feed images carry no platform chrome, so the inset is optical:
 * everything sits between y=88 and y=992 inside an 88px gutter.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * One-way, so `seamless: false`. The header lands, the roster seats fill on a
 * stagger up to `spotsFilled`, and the spots-left figure stamps once the last
 * filled seat has arrived. Reduced motion freezes on the LAST frame, where the
 * roster shows its true state — the whole point of the post.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  Backdrop,
  Box,
  CalendarIcon,
  ClockIcon,
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
  SQUARE,
  type Accent,
  accentAlpha,
  accentColor,
  bodyStyle,
  chalk,
  hairline,
  headlineStyle,
  ink,
  interpolateSafe,
  loopT,
  muted,
  numeralStyle,
  popIn,
  stagger,
  useMotionFrame,
} from "./socialKit";

export type PostCommunityGameProps = {
  eyebrow: string;
  /** What the game is called on the listing. */
  gameTitle: string;
  sport: string;
  venueName: string;
  district: string;
  city: string;
  dateLabel: string;
  timeLabel: string;
  /** Seats on the roster. */
  spotsTotal: number;
  /** Seats already taken. */
  spotsFilled: number;
  /** Each player's share, in dram. */
  pricePerPlayer: number;
  currency: string;
  accent: Accent;
};

export const postCommunityGameDefaultProps: PostCommunityGameProps = {
  eyebrow: "Open game",
  gameTitle: "Thursday 7-a-side",
  sport: "Football",
  venueName: "Mika Sports Complex",
  district: "Davtashen",
  city: "Yerevan",
  dateLabel: "Thu 14 Aug",
  timeLabel: "20:00 – 21:00",
  spotsTotal: 14,
  spotsFilled: 11,
  pricePerPlayer: 1500,
  currency: DRAM,
  accent: "violet",
};

const {
  width: W,
  height: H,
  safeTop: TOP,
  safeBottom: BOTTOM,
  gutter: G,
} = SQUARE;
const CONTENT_W = W - G * 2;

const SEATS_AT = 40;
const SEAT_STEP = 5;
const SEAT_CAP = 13;
/** The stamp waits until the last seat in the stagger has landed. */
const STAMP_AT = SEATS_AT + SEAT_CAP * SEAT_STEP + 22;

/** Seven seats a row keeps a 14-player roster to two tidy lines. */
const SEATS_PER_ROW = 7;

export const PostCommunityGame: FC<PostCommunityGameProps> = ({
  eyebrow,
  gameTitle,
  sport,
  venueName,
  district,
  city,
  dateLabel,
  timeLabel,
  spotsTotal,
  spotsFilled,
  pricePerPlayer,
  currency,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // One-way: the roster's true state is the message, so calm freezes last.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const total = Math.max(1, Math.min(28, Math.round(spotsTotal)));
  const filled = Math.max(0, Math.min(total, Math.round(spotsFilled)));
  const left = total - filled;

  const seatSize = Math.floor((CONTENT_W - (SEATS_PER_ROW - 1) * 16) / SEATS_PER_ROW);
  const stamp = popIn(frame, fps, STAMP_AT, 28);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={loopT(frame, durationInFrames)}
        motion={1}
        accent={accent}
        cell={60}
        bloomAt={[0.5, 0.2]}
      />

      <Box
        x={G}
        y={TOP}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [0, 12], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Eyebrow size={23} color={accentColor(accent)}>
          {`${eyebrow} · ${sport}`}
        </Eyebrow>
        <Lockup size={44} accent={accent} />
      </Box>

      {/* ── Title ─────────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 68}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [6, 20], [0, 1]),
          transform: `translateY(${(1 - popIn(frame, fps, 6, 30)) * 28}px)`,
        }}
      >
        <div style={headlineStyle(80, BRAND.foreground)}>{gameTitle}</div>
      </Box>

      {/* ── When and where ────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 178}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [16, 30], [0, 1]),
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <CalendarIcon size={30} color={accentColor(accent)} weight={2} />
          <span style={bodyStyle(30, chalk(0.94), 600)}>{dateLabel}</span>
          <span style={{ color: hairline(1), fontSize: 30 }}>|</span>
          <ClockIcon size={30} color={accentColor(accent)} weight={2} />
          <span style={bodyStyle(30, chalk(0.94), 600)}>{timeLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <PinIcon size={30} color={accentColor(accent)} weight={2} />
          <span style={bodyStyle(28, muted(1))}>
            {venueName} · {district}, {city}
          </span>
        </div>
      </Box>

      {/* ── The roster ────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 314}
        w={CONTENT_W}
        style={{ display: "flex", flexWrap: "wrap", gap: 16 }}
      >
        {Array.from({ length: total }, (_, i) => {
          const taken = i < filled;
          const at = SEATS_AT + stagger(i, SEAT_STEP, SEAT_CAP);
          const seat = popIn(frame, fps, at, 20);
          const shown = taken
            ? interpolateSafe(frame, [at, at + 10], [0, 1])
            : interpolateSafe(frame, [SEATS_AT, SEATS_AT + 12], [0, 1]);
          return (
            <div
              key={i}
              style={{
                width: seatSize,
                height: seatSize,
                borderRadius: seatSize * 0.32,
                boxSizing: "border-box",
                backgroundColor: taken
                  ? accentAlpha(accent, 0.18)
                  : BRAND.surface1,
                border: `2px solid ${taken ? accentAlpha(accent, 0.55) : hairline(1)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: shown,
                transform: taken ? `scale(${0.82 + seat * 0.18})` : "scale(1)",
                boxShadow: taken
                  ? `0 0 ${34 * seat}px -14px ${accentAlpha(accent, 0.8)}`
                  : "none",
              }}
            >
              <UsersIcon
                size={seatSize * 0.5}
                color={taken ? accentColor(accent) : muted(0.5)}
                weight={2}
              />
            </div>
          );
        })}
      </Box>

      {/* ── Spots left ────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={BOTTOM - 260}
        w={CONTENT_W}
        h={124}
        style={{
          opacity: interpolateSafe(frame, [STAMP_AT, STAMP_AT + 12], [0, 1]),
          transform: `scale(${0.9 + stamp * 0.1})`,
          transformOrigin: "50% 50%",
          borderRadius: 36,
          backgroundColor: accentAlpha(accent, 0.12),
          border: `2px solid ${accentAlpha(accent, 0.5)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <span style={numeralStyle(78, accentColor(accent), 700)}>{left}</span>
        <span style={headlineStyle(44, BRAND.foreground, 700)}>
          {left === 1 ? "spot left" : "spots left"}
        </span>
      </Box>

      {/* ── Price. Each player pays this, and nothing on top of it. ───── */}
      <Box
        x={G}
        y={BOTTOM - 116}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [STAMP_AT + 10, STAMP_AT + 24], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Money
          amount={pricePerPlayer}
          currency={currency}
          size={44}
          color={BRAND.foreground}
          suffix="/ player"
        />
        <span style={headlineStyle(40, accentColor(accent))}>
          {COMMISSION.rate}
        </span>
      </Box>

      <Box
        x={G}
        y={BOTTOM - 40}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [STAMP_AT + 16, STAMP_AT + 30], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={bodyStyle(25, chalk(0.8), 600)}>
          {COMMISSION.playerLine}
        </span>
        <Handle size={21} />
      </Box>

      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${ink(0.35)} 0%, transparent 16%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
