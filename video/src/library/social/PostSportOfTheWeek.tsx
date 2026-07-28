/**
 * PostSportOfTheWeek — the weekly rotation post: one sport, how many venues
 * carry it, what it costs and how many hours are open this week.
 * 1:1 for Instagram / Facebook feed, a seamless loop so the same asset works
 * as a feed video or a looping Story sticker.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 *  1. The orbit ring is a dash pattern whose period equals the circle's
 *     circumference C, with the offset travelling exactly −C over the loop —
 *     the pattern lands back on itself.
 *  2. The three stat tiles use `pulse()`, exactly 0 at local frame 0 and
 *     exactly 0 again from local frame 35, phased a third of the loop apart.
 *  3. The ball mark's float rides `breathe()`, a full cosine period.
 *  4. The backdrop bloom is a full cosine period; its grid drifts exactly one
 *     cell per loop.
 * No one-way tween exists in the file.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  Backdrop,
  BallMark,
  Box,
  Eyebrow,
  Handle,
  Lockup,
  Money,
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
  breathe,
  chalk,
  headlineStyle,
  ink,
  loopT,
  muted,
  numeralStyle,
  pulse,
  useMotionFrame,
} from "./socialKit";

export type SportStat = {
  label: string;
  value: string;
};

export type PostSportOfTheWeekProps = {
  eyebrow: string;
  /** "Basketball", "Futsal", "Tennis" — the week's pick. */
  sport: string;
  city: string;
  /** Three tiles: venues, open hours, top district. */
  stats: SportStat[];
  fromPrice: number;
  currency: string;
  accent: Accent;
};

export const postSportOfTheWeekDefaultProps: PostSportOfTheWeekProps = {
  eyebrow: "Sport of the week",
  sport: "Basketball",
  city: "Yerevan",
  stats: [
    { label: "Venues", value: "18" },
    { label: "Open hours", value: "126" },
    { label: "Top area", value: "Kentron" },
  ],
  fromPrice: 7000,
  currency: DRAM,
  accent: "cyan",
};

const { width: W, height: H, safeTop: TOP, safeBottom: BOTTOM, gutter: G } =
  SQUARE;
const CONTENT_W = W - G * 2;

/** The orbit ring. r is fixed; only the dash offset moves. */
const RING_R = 150;
const RING_C = 2 * Math.PI * RING_R;

export const PostSportOfTheWeek: FC<PostSportOfTheWeekProps> = ({
  eyebrow,
  sport,
  city,
  stats,
  fromPrice,
  currency,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Loop: frame 0 both opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);

  const t = loopT(frame, durationInFrames);
  const float = breathe(t) * 10;
  const tiles = stats.slice(0, 3);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={t}
        motion={1}
        accent={accent}
        cell={60}
        bloomAt={[0.5, 0.34]}
        markings={false}
      />

      <Box
        x={G}
        y={TOP}
        w={CONTENT_W}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Eyebrow size={23} color={accentColor(accent)}>
          {`${eyebrow} · ${city}`}
        </Eyebrow>
        <Lockup size={44} accent={accent} />
      </Box>

      {/* ── The mark ──────────────────────────────────────────────────── */}
      <Box x={W / 2 - 190} y={TOP + 76} w={380} h={380}>
        <svg width={380} height={380} viewBox="0 0 380 380" style={{ display: "block" }}>
          <circle
            cx={190}
            cy={190}
            r={RING_R}
            fill="none"
            stroke={accentAlpha(accent, 0.16)}
            strokeWidth={2}
          />
          <circle
            cx={190}
            cy={190}
            r={RING_R}
            fill="none"
            stroke={accentAlpha(accent, 0.8)}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${RING_C * 0.26} ${RING_C * 0.74}`}
            strokeDashoffset={-RING_C * t}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `translateY(${float}px)`,
          }}
        >
          <BallMark size={172} color={accentColor(accent)} opacity={0.92} />
        </div>
      </Box>

      <Box x={G} y={TOP + 462} w={CONTENT_W} style={{ textAlign: "center" }}>
        <div style={{ ...headlineStyle(96, BRAND.foreground), textAlign: "center" }}>
          {sport}
        </div>
      </Box>

      {/* ── Stat tiles ────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 588}
        w={CONTENT_W}
        style={{ display: "flex", gap: 18 }}
      >
        {tiles.map((stat, i) => {
          const beat = pulse({
            frame,
            fps,
            period: durationInFrames,
            phase: (i * durationInFrames) / Math.max(1, tiles.length),
          });
          return (
            <div
              key={stat.label}
              style={{
                flex: 1,
                height: 132,
                borderRadius: 32,
                backgroundColor: BRAND.card,
                border: `1.5px solid ${accentAlpha(accent, 0.16 + 0.44 * beat)}`,
                boxShadow: `0 0 ${52 * beat}px -18px ${accentAlpha(accent, 0.85)}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <span style={headlineStyle(44, chalk(0.78 + 0.22 * beat), 700)}>
                {stat.value}
              </span>
              <span style={numeralStyle(20, muted(0.92), 500)}>
                {stat.label.toUpperCase()}
              </span>
            </div>
          );
        })}
      </Box>

      {/* ── Footer strip ──────────────────────────────────────────────── */}
      <Box
        x={G}
        y={BOTTOM - 116}
        w={CONTENT_W}
        h={116}
        style={{
          borderRadius: 34,
          backgroundColor: accentAlpha(accent, 0.1),
          border: `2px solid ${accentAlpha(accent, 0.34)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={bodyStyle(26, chalk(0.94), 600)}>{COMMISSION.badge}</span>
          <Handle size={19} />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={numeralStyle(22, muted(0.9), 500)}>FROM</span>
          <Money
            amount={fromPrice}
            currency={currency}
            size={40}
            color={accentColor(accent)}
            suffix="/ hour"
          />
        </div>
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
