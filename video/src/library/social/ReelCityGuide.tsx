/**
 * ReelCityGuide — "where to play in Yerevan": the city's districts scrolling
 * past with a venue count and a from-price on each.
 * 9:16 for Reels / TikTok / Stories, a seamless loop so the rail can run under
 * any length of voice-over without a visible restart.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1920. Header copy sits below y=270 (top 14%) and the footer above
 * y=1536 (bottom 20%), so the account row, sound pill, caption block and
 * action rail never cover a district name. The rail's fade masks are inside
 * the safe band; only the backdrop bleeds past it.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 *  1. The rail is a wrap() lattice. District i sits at
 *     `wrap(i·S − t·N·S, N·S)`, so over one loop the strip advances by exactly
 *     N·S — a whole revolution — and at t=1 every card is back on the pixel it
 *     started on, with the same content. Not "close enough": identical.
 *  2. The district markers use `pulse()`, exactly 0 at both ends of each cycle.
 *  3. The backdrop bloom is a full cosine period; its grid drifts exactly one
 *     cell per loop.
 * No one-way tween exists in the file.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  Backdrop,
  Box,
  Eyebrow,
  Handle,
  Lockup,
  Money,
  PinIcon,
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
  useMotionFrame,
  wrap,
} from "./socialKit";

export type CityDistrict = {
  name: string;
  /** Venues live in that district. */
  venues: number;
  /** Cheapest hourly rate found there, in dram. */
  fromPrice: number;
};

export type ReelCityGuideProps = {
  city: string;
  eyebrow: string;
  headline: [string, string];
  districts: CityDistrict[];
  currency: string;
  accent: Accent;
};

export const reelCityGuideDefaultProps: ReelCityGuideProps = {
  city: "Yerevan",
  eyebrow: "City guide",
  headline: ["Where to play", "in Yerevan"],
  districts: [
    { name: "Kentron", venues: 14, fromPrice: 9000 },
    { name: "Arabkir", venues: 9, fromPrice: 8000 },
    { name: "Davtashen", venues: 7, fromPrice: 12000 },
    { name: "Ajapnyak", venues: 6, fromPrice: 10000 },
    { name: "Erebuni", venues: 5, fromPrice: 7500 },
    { name: "Shengavit", venues: 8, fromPrice: 8500 },
  ],
  currency: DRAM,
  accent: "green",
};

const { width: W, height: H, safeTop: TOP, safeBottom: BOTTOM, gutter: G } = REEL;
const CONTENT_W = W - G * 2;

/** The rail window — entirely inside the safe band. */
const RAIL_Y = 636;
const RAIL_H = 792;
/** Card pitch: 216 tall on a 260 lattice step. */
const CARD_H = 216;
const STEP = 260;

export const ReelCityGuide: FC<ReelCityGuideProps> = ({
  city,
  eyebrow,
  headline,
  districts,
  currency,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Loop: frame 0 both opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);

  const t = loopT(frame, durationInFrames);
  const n = Math.max(1, districts.length);
  const period = n * STEP;

  const totalVenues = districts.reduce((sum, d) => sum + d.venues, 0);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={t}
        motion={1}
        accent={accent}
        cell={72}
        bloomAt={[0.5, 0.2]}
      />

      <Box x={G} y={TOP} w={CONTENT_W}>
        <Eyebrow size={27} color={accentColor(accent)}>
          {`${eyebrow} · ${totalVenues} venues`}
        </Eyebrow>
      </Box>

      <Box x={G} y={TOP + 62} w={CONTENT_W}>
        <div style={headlineStyle(98, BRAND.foreground)}>{headline[0]}</div>
        <div style={headlineStyle(98, accentColor(accent))}>{headline[1]}</div>
      </Box>

      <Box x={G} y={TOP + 240} w={CONTENT_W}>
        <span style={bodyStyle(31, muted(1))}>{COMMISSION.proof}</span>
      </Box>

      {/* ── The rail ──────────────────────────────────────────────────── */}
      <Box x={G} y={RAIL_Y} w={CONTENT_W} h={RAIL_H} style={{ overflow: "hidden" }}>
        {districts.map((district, i) => {
          const y = wrap(i * STEP - t * period, period);
          const beat = pulse({
            frame,
            fps,
            period: durationInFrames,
            phase: (i * durationInFrames) / n,
          });
          return (
            <div
              key={district.name}
              style={{
                position: "absolute",
                left: 0,
                top: y,
                width: CONTENT_W,
                height: CARD_H,
                borderRadius: 40,
                backgroundColor: BRAND.card,
                border: `2px solid ${accentAlpha(accent, 0.14 + 0.3 * beat)}`,
                boxShadow: `0 0 ${60 * beat}px -26px ${accentAlpha(accent, 0.8)}`,
                display: "flex",
                alignItems: "center",
                gap: 28,
                padding: "0 34px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 30,
                  flexShrink: 0,
                  backgroundColor: accentAlpha(accent, 0.12 + 0.12 * beat),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PinIcon size={46} color={accentColor(accent)} weight={2} />
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={headlineStyle(52, BRAND.foreground, 700)}>
                  {district.name}
                </span>
                <span style={bodyStyle(28, muted(1))}>
                  {district.venues} venues · {city}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                }}
              >
                <span style={numeralStyle(22, muted(0.9), 500)}>FROM</span>
                <Money
                  amount={district.fromPrice}
                  currency={currency}
                  size={38}
                  color={accentColor(accent)}
                />
                <span style={bodyStyle(22, muted(0.9))}>per hour</span>
              </div>
            </div>
          );
        })}

        {/* Static edge fades — no motion, so nothing to seam. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to bottom, ${BRAND.background} 0%, transparent 14%, transparent 86%, ${BRAND.background} 100%)`,
            pointerEvents: "none",
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
