/**
 * ReelVenueSpotlight — a single venue, rendered straight from a listing row.
 * 9:16 for Reels / TikTok / Stories; a seamless ambient loop meant to sit
 * under a voice-over or a trending audio for as long as the edit needs it.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1920. Nothing meaningful above y=270 (top 14%, the account row and the
 * sound pill) or below y=1536 (bottom 20%, the caption block and the action
 * rail). Only the backdrop, the card's bleed glow and the orbit ring cross
 * those lines, and none of them carries information.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 *  1. The backdrop's bloom rides `breathe()` — a full cosine period — and its
 *     grid drifts exactly one 72px cell over the loop.
 *  2. The availability ring is a dash pattern whose period equals the circle's
 *     circumference C; the offset travels exactly −C over the loop, so the
 *     pattern lands back on itself.
 *  3. The card sheen is a repeating linear gradient whose `backgroundPosition`
 *     advances by exactly one tile width.
 *  4. The three stat pips use `pulse()`, which is exactly 0 at local frame 0
 *     and exactly 0 again from local frame 35 — both ends of every cycle.
 * There is no one-way tween anywhere in the file.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  Box,
  Chip,
  ClockIcon,
  Eyebrow,
  Handle,
  Lockup,
  Money,
  PinIcon,
  PitchThumb,
  Rating,
  Backdrop,
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
  breathe,
  chalk,
  headlineStyle,
  ink,
  loopT,
  muted,
  pulse,
  useMotionFrame,
} from "./socialKit";

export type ReelVenueSpotlightProps = {
  venueName: string;
  district: string;
  city: string;
  sport: string;
  /** "5-a-side", "Indoor court", whatever the listing says. */
  format: string;
  /** Price per hour, in dram, as a number so it can be formatted here. */
  pricePerHour: number;
  /** Currency glyph. "֏" by default; pass "AMD" on a box without an
   *  Armenian-capable system font. */
  currency: string;
  rating: string;
  reviews: number;
  /** Free hours left today — the scarcity line. */
  slotsLeft: number;
  /** Hue of the drawn pitch, kept in the brand's green range. */
  pitchHue: number;
  accent: Accent;
};

export const reelVenueSpotlightDefaultProps: ReelVenueSpotlightProps = {
  venueName: "Mika Sports Complex",
  district: "Davtashen",
  city: "Yerevan",
  sport: "Football",
  format: "7-a-side",
  pricePerHour: 18000,
  currency: DRAM,
  rating: "4.8",
  reviews: 204,
  slotsLeft: 3,
  pitchHue: 166,
  accent: "green",
};

const { width: W, height: H, safeTop: TOP, gutter: G } = REEL;
const CONTENT_W = W - G * 2;

export const ReelVenueSpotlight: FC<ReelVenueSpotlightProps> = ({
  venueName,
  district,
  city,
  sport,
  format,
  pricePerHour,
  currency,
  rating,
  reviews,
  slotsLeft,
  pitchHue,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Loop: frame 0 opens and closes the cycle, so that is where calm freezes.
  const frame = useMotionFrame(rawFrame, 0);

  const t = loopT(frame, durationInFrames);
  const breath = breathe(t);

  /** Availability ring. r and C are fixed; only the dash offset moves. */
  const ringR = 152;
  const ringC = 2 * Math.PI * ringR;

  /** Sheen tile width. One tile of travel per loop. */
  const sheenTile = 780;

  const stats: { label: string; value: string }[] = [
    { label: "Rating", value: rating },
    { label: "Reviews", value: String(reviews) },
    { label: "Free today", value: `${slotsLeft}h` },
  ];

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
      />

      {/* Orbit ring — allowed to bleed past the safe lines; decorative only. */}
      <Box x={W / 2 - 420} y={430} w={840} h={840} style={{ opacity: 0.75 }}>
        <svg width={840} height={840} viewBox="0 0 840 840" style={{ display: "block" }}>
          <circle
            cx={420}
            cy={420}
            r={ringR * 2.1}
            fill="none"
            stroke={accentAlpha(accent, 0.16)}
            strokeWidth={2}
          />
          <circle
            cx={420}
            cy={420}
            r={ringR * 2.1}
            fill="none"
            stroke={accentAlpha(accent, 0.75)}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${ringC * 0.22} ${ringC * 0.78}`}
            strokeDashoffset={-ringC * t}
          />
        </svg>
      </Box>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box x={G} y={TOP} w={CONTENT_W}>
        <Eyebrow size={27} color={accentColor(accent)}>
          {`${sport} · ${city}`}
        </Eyebrow>
      </Box>

      <Box x={G} y={TOP + 62} w={CONTENT_W}>
        <div style={headlineStyle(96, BRAND.foreground)}>{venueName}</div>
      </Box>

      <Box
        x={G}
        y={TOP + 62 + 118}
        w={CONTENT_W}
        style={{ display: "flex", alignItems: "center", gap: 14 }}
      >
        <PinIcon size={34} color={muted(1)} />
        <span style={bodyStyle(34, BRAND.mutedForeground)}>
          {district} · {format}
        </span>
      </Box>

      {/* ── The card ───────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={620}
        w={CONTENT_W}
        h={560}
        style={{
          borderRadius: 48,
          overflow: "hidden",
          border: `2px solid ${accentAlpha(accent, 0.32 + 0.08 * breath)}`,
          boxShadow: `0 40px 90px -32px ${ink(0.85)}, 0 0 ${110 + 20 * breath}px -30px ${accentAlpha(accent, 0.55)}`,
        }}
      >
        <div style={{ position: "absolute", inset: 0 }}>
          <PitchThumb size={CONTENT_W} hue={pitchHue} radius={0} />
        </div>

        {/* Sheen — exactly one tile of travel per loop. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(105deg, transparent 0%, ${chalk(0.1)} 42%, ${chalk(0.16)} 50%, ${chalk(0.1)} 58%, transparent 100%)`,
            backgroundSize: `${sheenTile}px 100%`,
            backgroundPosition: `${t * sheenTile}px 0`,
            backgroundRepeat: "repeat-x",
            mixBlendMode: "screen",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to top, ${ink(0.88)} 0%, ${ink(0.35)} 42%, transparent 78%)`,
          }}
        />

        {/* Live availability strip inside the card. */}
        <div
          style={{
            position: "absolute",
            left: 36,
            bottom: 34,
            right: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <ClockIcon size={34} color={accentColor(accent)} />
            <span style={bodyStyle(32, chalk(0.94), 600)}>
              {slotsLeft} free {slotsLeft === 1 ? "hour" : "hours"} today
            </span>
          </div>
          <Chip size={24} filled accent={accent}>
            Book now
          </Chip>
        </div>
      </Box>

      {/* ── Price + zero commission ────────────────────────────────────── */}
      <Box
        x={G}
        y={1224}
        w={CONTENT_W}
        h={148}
        style={{
          borderRadius: 40,
          backgroundColor: BRAND.card,
          border: `2px solid ${accentAlpha(accent, 0.3)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Money
            amount={pricePerHour}
            currency={currency}
            size={62}
            color={accentColor(accent)}
            suffix="/ hour"
          />
          <span style={bodyStyle(26, muted(0.95))}>{COMMISSION.playerLine}</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          <span style={headlineStyle(56, accentColor(accent))}>
            {COMMISSION.rate}
          </span>
          <span style={bodyStyle(24, muted(0.95))}>commission</span>
        </div>
      </Box>

      {/* ── Stat pips ─────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={1404}
        w={CONTENT_W}
        style={{ display: "flex", justifyContent: "space-between", gap: 20 }}
      >
        {stats.map((stat, i) => {
          const beat = pulse({
            frame,
            fps,
            period: durationInFrames,
            phase: (i * durationInFrames) / stats.length,
          });
          return (
            <div
              key={stat.label}
              style={{
                flex: 1,
                height: 108,
                borderRadius: 30,
                backgroundColor: BRAND.muted,
                border: `1.5px solid ${accentAlpha(accent, 0.18 + 0.42 * beat)}`,
                boxShadow: `0 0 ${46 * beat}px -14px ${accentAlpha(accent, 0.8 * beat)}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              <span style={headlineStyle(38, chalk(0.75 + 0.25 * beat), 700)}>
                {stat.value}
              </span>
              <span style={bodyStyle(21, muted(0.9))}>{stat.label}</span>
            </div>
          );
        })}
      </Box>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={REEL.safeBottom - 76}
        w={CONTENT_W}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Lockup size={54} accent={accent} />
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Rating rating={rating} reviews={reviews} size={26} />
          <Handle size={22} />
        </div>
      </Box>
    </AbsoluteFill>
  );
};
