/**
 * ReelPriceReveal — the price, counted up and then held: what the player pays,
 * what the owner receives, and the fact that those are the same number.
 * 9:16 for Reels / TikTok / Stories, one-way, built as a 6-second hook.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1920. The eyebrow, the figure and both ledger rows sit between y=270
 * (top 14%) and y=1536 (bottom 20%), clear of the account row, sound pill,
 * caption block and action rail. Only the backdrop and the figure's glow
 * bleed past those lines.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * One-way, so `seamless: false`. The counter is an eased ramp — a count-up is
 * the one place a linear-ish tween is honest — and the two ledger rows and the
 * stamp land on springs afterwards. Reduced motion freezes on the LAST frame,
 * where the number is settled and the claim is complete.
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
  DISPLAY_FONT,
  DRAM,
  EASE_OUT_EXPO,
  REEL,
  type Accent,
  accentAlpha,
  accentColor,
  bodyStyle,
  chalk,
  groupThousands,
  headlineStyle,
  ink,
  interpolateSafe,
  loopT,
  muted,
  popIn,
  useMotionFrame,
} from "./socialKit";

export type ReelPriceRevealProps = {
  venueName: string;
  district: string;
  city: string;
  sport: string;
  /** The listed hourly price, in dram. The counter lands here. */
  pricePerHour: number;
  currency: string;
  /** The line under the figure. */
  subline: string;
  accent: Accent;
};

export const reelPriceRevealDefaultProps: ReelPriceRevealProps = {
  venueName: "Ararat Arena",
  district: "Kentron",
  city: "Yerevan",
  sport: "Football",
  pricePerHour: 12000,
  currency: DRAM,
  subline: "One hour, floodlights on, nothing added at checkout.",
  accent: "green",
};

const { width: W, height: H, safeTop: TOP, safeBottom: BOTTOM, gutter: G } = REEL;
const CONTENT_W = W - G * 2;

/** The count-up runs here. */
const COUNT_FROM = 26;
const COUNT_TO = 92;

/** The two ledger rows: what the player pays, what the owner receives. */
const LEDGER_AT = [110, 126];

export const ReelPriceReveal: FC<ReelPriceRevealProps> = ({
  venueName,
  district,
  city,
  sport,
  pricePerHour,
  currency,
  subline,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // One-way: the settled number is the message, so calm freezes on the last frame.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const counted = Math.round(
    interpolateSafe(
      frame,
      [COUNT_FROM, COUNT_TO],
      [0, pricePerHour],
      EASE_OUT_EXPO,
    ),
  );
  const landed = interpolateSafe(frame, [COUNT_TO - 6, COUNT_TO + 8], [0, 1]);
  const figureRise = popIn(frame, fps, COUNT_FROM - 8, 30);
  const stamp = popIn(frame, fps, 146, 30);

  const ledger: { label: string; note: string }[] = [
    { label: "Player pays", note: COMMISSION.playerLine },
    { label: "Owner receives", note: COMMISSION.ownerLine },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={loopT(frame, durationInFrames)}
        motion={1}
        accent={accent}
        cell={72}
        bloomAt={[0.5, 0.36]}
        bloom={0.7 + 0.6 * landed}
      />

      <Box
        x={G}
        y={TOP}
        w={CONTENT_W}
        style={{ opacity: interpolateSafe(frame, [0, 12], [0, 1]) }}
      >
        <Eyebrow size={27} color={accentColor(accent)}>
          {`${sport} · ${district}, ${city}`}
        </Eyebrow>
      </Box>

      <Box
        x={G}
        y={TOP + 62}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [4, 18], [0, 1]),
          transform: `translateY(${(1 - popIn(frame, fps, 4, 28)) * 34}px)`,
        }}
      >
        <div style={headlineStyle(88, BRAND.foreground)}>{venueName}</div>
      </Box>

      {/* ── The figure ────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={600}
        w={CONTENT_W}
        h={340}
        style={{
          opacity: interpolateSafe(frame, [COUNT_FROM - 8, COUNT_FROM + 4], [0, 1]),
          transform: `scale(${0.9 + figureRise * 0.1})`,
          transformOrigin: "50% 50%",
          borderRadius: 48,
          backgroundColor: BRAND.card,
          border: `2px solid ${accentAlpha(accent, 0.24 + 0.4 * landed)}`,
          boxShadow: `0 0 ${140 * landed}px -40px ${accentAlpha(accent, 0.9)}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 168,
            fontWeight: 700,
            letterSpacing: "-0.05em",
            color: accentColor(accent),
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {groupThousands(counted)}
          <span style={{ fontSize: 84, marginLeft: 18 }}>{currency}</span>
        </span>
        <span style={bodyStyle(32, chalk(0.9), 600)}>per hour</span>
      </Box>

      <Box
        x={G}
        y={968}
        w={CONTENT_W}
        style={{ opacity: interpolateSafe(frame, [COUNT_TO, COUNT_TO + 14], [0, 1]) }}
      >
        <span style={bodyStyle(31, muted(1))}>{subline}</span>
      </Box>

      {/* ── The ledger. Two rows, one number, no third line. ──────────── */}
      <Box
        x={G}
        y={1052}
        w={CONTENT_W}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {ledger.map((row, i) => {
          const at = LEDGER_AT[i];
          return (
            <div
              key={row.label}
              style={{
                height: 126,
                borderRadius: 34,
                backgroundColor: BRAND.card,
                border: `1.5px solid ${BRAND.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 34px",
                opacity: interpolateSafe(frame, [at, at + 10], [0, 1]),
                transform: `translateY(${(1 - popIn(frame, fps, at, 24)) * 30}px)`,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={bodyStyle(30, chalk(0.94), 600)}>{row.label}</span>
                <span style={bodyStyle(24, muted(0.92))}>{row.note}</span>
              </div>
              <Money
                amount={pricePerHour}
                currency={currency}
                size={42}
                color={accentColor(accent)}
              />
            </div>
          );
        })}
      </Box>

      {/* ── The stamp ─────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={1340}
        w={CONTENT_W}
        h={96}
        style={{
          opacity: interpolateSafe(frame, [146, 158], [0, 1]),
          transform: `scale(${0.9 + stamp * 0.1})`,
          transformOrigin: "50% 50%",
          borderRadius: 32,
          backgroundColor: accentAlpha(accent, 0.12),
          border: `2px solid ${accentAlpha(accent, 0.5)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <CheckIcon size={36} color={accentColor(accent)} weight={2.8} />
        <span style={headlineStyle(38, BRAND.foreground, 700)}>
          {COMMISSION.proof}
        </span>
      </Box>

      <Box
        x={G}
        y={BOTTOM - 70}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [160, 174], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Lockup size={48} accent={accent} showWord={false} />
        <Handle size={22} />
      </Box>

      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${ink(0.5)} 0%, transparent 20%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
