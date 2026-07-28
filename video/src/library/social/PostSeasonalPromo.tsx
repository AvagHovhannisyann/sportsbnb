/**
 * PostSeasonalPromo — the season's push in one square: indoor winter, summer
 * evenings, whatever the quarter is selling, with the perks and a from-price.
 * 1:1 for Instagram / Facebook feed, a seamless loop so it can run as a Story
 * sticker on repeat for the whole campaign.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1080. Feed images carry no platform chrome; the inset is optical, with
 * all copy between y=88 and y=992 inside an 88px gutter. Motes are allowed to
 * drift outside the type area because they carry nothing.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 *  1. The motes are a wrap() lattice: mote i sits at `wrap(y0ᵢ + t·H, H)`, so
 *     over one loop each one travels the canvas height exactly once and lands
 *     back on the pixel it started on. Their x, size and phase come from
 *     `hashUnit(i)` and never change, so the set at t=1 is identical to the
 *     set at t=0 — not merely similar.
 *  2. Their twinkle is `sin(2π·(y/H + φᵢ))`, a full sine period in the same
 *     wrapped coordinate, so it is continuous across the seam.
 *  3. The season badge and the perk rows use `pulse()`, exactly 0 at local
 *     frame 0 and exactly 0 again from local frame 35.
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
  TAU,
  type Accent,
  accentAlpha,
  accentColor,
  bodyStyle,
  chalk,
  hashRange,
  hashUnit,
  headlineStyle,
  ink,
  loopT,
  muted,
  pulse,
  useMotionFrame,
  wrap,
} from "./socialKit";

export type PostSeasonalPromoProps = {
  /** The season label — "Winter season", "Summer evenings". */
  season: string;
  /** Two display lines. */
  headline: [string, string];
  /** The sentence under the headline. */
  blurb: string;
  /** What the promo actually gives you. */
  perks: string[];
  /** Cheapest hourly rate in the promo, in dram. */
  fromPrice: number;
  currency: string;
  /** How many motes drift. */
  moteCount: number;
  accent: Accent;
};

export const postSeasonalPromoDefaultProps: PostSeasonalPromoProps = {
  season: "Winter season",
  headline: ["Indoor courts,", "floodlit pitches"],
  blurb: "Cold outside, booked inside. Yerevan's covered venues are live.",
  perks: [
    "Heated halls and covered pitches",
    "Evening slots open to 23:00",
    "Same price you see, always",
  ],
  fromPrice: 8000,
  currency: DRAM,
  moteCount: 34,
  accent: "cyan",
};

const {
  width: W,
  height: H,
  safeTop: TOP,
  safeBottom: BOTTOM,
  gutter: G,
} = SQUARE;
const CONTENT_W = W - G * 2;

export const PostSeasonalPromo: FC<PostSeasonalPromoProps> = ({
  season,
  headline,
  blurb,
  perks,
  fromPrice,
  currency,
  moteCount,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Loop: frame 0 both opens and closes the cycle, so calm freezes there.
  const frame = useMotionFrame(rawFrame, 0);

  const t = loopT(frame, durationInFrames);
  const badge = pulse({ frame, fps, period: durationInFrames, phase: 0 });
  const rows = perks.slice(0, 3);
  const motes = Math.max(0, Math.min(64, Math.round(moteCount)));

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={t}
        motion={1}
        accent={accent}
        cell={60}
        bloomAt={[0.5, 0.16]}
        bloom={0.9}
      />

      {/* ── The mote lattice ──────────────────────────────────────────── */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        {Array.from({ length: motes }, (_, i) => {
          const x = hashUnit(i, 3) * W;
          const y0 = hashUnit(i, 7) * H;
          const y = wrap(y0 + t * H, H);
          const size = hashRange(i, 11, 3, 9);
          const phase = hashUnit(i, 17);
          const twinkle = 0.5 + 0.5 * Math.sin(TAU * (y / H + phase));
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: size,
                height: size,
                borderRadius: size,
                backgroundColor: accentAlpha(accent, 0.16 + 0.44 * twinkle),
                boxShadow: `0 0 ${size * 3}px ${accentAlpha(accent, 0.2 * twinkle)}`,
              }}
            />
          );
        })}
      </AbsoluteFill>

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
          {season}
        </Eyebrow>
        <Lockup size={44} accent={accent} />
      </Box>

      {/* ── Headline ──────────────────────────────────────────────────── */}
      <Box x={G} y={TOP + 76} w={CONTENT_W}>
        <div style={headlineStyle(88, BRAND.foreground)}>{headline[0]}</div>
        <div style={headlineStyle(88, accentColor(accent))}>{headline[1]}</div>
      </Box>

      <Box x={G} y={TOP + 232} w={CONTENT_W}>
        <span style={{ ...bodyStyle(30, muted(1)), display: "block" }}>
          {blurb}
        </span>
      </Box>

      {/* ── Perks ─────────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 320}
        w={CONTENT_W}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        {rows.map((perk, i) => {
          const beat = pulse({
            frame,
            fps,
            period: durationInFrames,
            phase: (i * durationInFrames) / Math.max(1, rows.length),
          });
          return (
            <div
              key={perk}
              style={{
                height: 92,
                borderRadius: 30,
                backgroundColor: BRAND.card,
                border: `2px solid ${accentAlpha(accent, 0.16 + 0.3 * beat)}`,
                boxShadow: `0 0 ${58 * beat}px -26px ${accentAlpha(accent, 0.8)}`,
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "0 26px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  flexShrink: 0,
                  backgroundColor: accentAlpha(accent, 0.14 + 0.14 * beat),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckIcon size={26} color={accentColor(accent)} weight={2.8} />
              </div>
              <span style={bodyStyle(30, chalk(0.94), 600)}>{perk}</span>
            </div>
          );
        })}
      </Box>

      {/* ── Price strip. No fee line: there is no fee. ────────────────── */}
      <Box
        x={G}
        y={BOTTOM - 190}
        w={CONTENT_W}
        h={128}
        style={{
          borderRadius: 36,
          backgroundColor: BRAND.card,
          border: `2px solid ${accentAlpha(accent, 0.3 + 0.22 * badge)}`,
          boxShadow: `0 0 ${80 * badge}px -34px ${accentAlpha(accent, 0.8)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Money
            amount={fromPrice}
            currency={currency}
            size={44}
            color={accentColor(accent)}
            suffix="/ hour"
          />
          <span style={bodyStyle(23, muted(0.95))}>{COMMISSION.playerLine}</span>
        </div>
        <span style={headlineStyle(44, accentColor(accent))}>
          {COMMISSION.rate}
        </span>
      </Box>

      <Box
        x={G}
        y={BOTTOM - 40}
        w={CONTENT_W}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={bodyStyle(25, chalk(0.8), 600)}>{COMMISSION.badge}</span>
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
