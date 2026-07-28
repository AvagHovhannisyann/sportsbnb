/**
 * ReelZeroCommissionOwner — the owner-acquisition pitch: SportsBnB takes no
 * commission, so the number the owner lists is the number the owner receives.
 * 9:16 for Reels / TikTok / Stories, one-way, aimed at venue owners rather
 * than players.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1920. Every figure and every line of copy sits between y=270 (top 14%)
 * and y=1536 (bottom 20%), clear of the platform's account row, sound pill,
 * caption block and action rail. Only the backdrop and the badge's glow bleed.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * One-way, so `seamless: false`. The two payout rows land on springs, the
 * "0%" stamps in with an overshoot, and the difference row resolves last —
 * the beat the whole piece exists for. Reduced motion freezes on the LAST
 * frame, where the claim is fully stated.
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
  WalletIcon,
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
  interpolateSafe,
  loopT,
  muted,
  onAccent,
  popIn,
  useMotionFrame,
} from "./socialKit";

export type ReelZeroCommissionOwnerProps = {
  eyebrow: string;
  headline: [string, string];
  /** What the owner puts on the listing, per hour. */
  listedPrice: number;
  currency: string;
  venueName: string;
  city: string;
  /** The three reasons under the number. Rendered as ticked lines. */
  bullets: string[];
  ctaLabel: string;
  accent: Accent;
};

export const reelZeroCommissionOwnerDefaultProps: ReelZeroCommissionOwnerProps =
  {
    eyebrow: "For venue owners",
    headline: ["You list 20,000.", "You keep 20,000."],
    listedPrice: 20000,
    currency: DRAM,
    venueName: "Your pitch",
    city: "Yerevan",
    bullets: [
      "No commission on any booking",
      "No monthly listing fee",
      "Players pay you the listed price",
    ],
    ctaLabel: "List your venue",
    accent: "green",
  };

const { width: W, height: H, safeTop: TOP, safeBottom: BOTTOM, gutter: G } = REEL;
const CONTENT_W = W - G * 2;

/** The two figure rows, and then the difference. */
const ROW_AT = [92, 116];
const DIFF_AT = 150;

const PayoutRow: FC<{
  frame: number;
  fps: number;
  index: number;
  label: string;
  amount: number;
  currency: string;
  accent: Accent;
  emphasised: boolean;
}> = ({ frame, fps, index, label, amount, currency, accent, emphasised }) => {
  const at = ROW_AT[index];
  const rise = popIn(frame, fps, at, 26);
  return (
    <div
      style={{
        height: 148,
        borderRadius: 36,
        backgroundColor: emphasised ? accentAlpha(accent, 0.12) : BRAND.card,
        border: `2px solid ${emphasised ? accentAlpha(accent, 0.55) : BRAND.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 36px",
        opacity: interpolateSafe(frame, [at, at + 10], [0, 1]),
        transform: `translateX(${(1 - rise) * (index === 0 ? -50 : 50)}px)`,
        boxShadow: emphasised
          ? `0 0 80px -30px ${accentAlpha(accent, 0.85)}`
          : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <WalletIcon
          size={38}
          color={emphasised ? accentColor(accent) : muted(1)}
          weight={2}
        />
        <span style={bodyStyle(32, emphasised ? chalk(0.96) : muted(1), 600)}>
          {label}
        </span>
      </div>
      <Money
        amount={amount}
        currency={currency}
        size={54}
        color={emphasised ? accentColor(accent) : chalk(0.9)}
        weight={700}
      />
    </div>
  );
};

export const ReelZeroCommissionOwner: FC<ReelZeroCommissionOwnerProps> = ({
  eyebrow,
  headline,
  listedPrice,
  currency,
  venueName,
  city,
  bullets,
  ctaLabel,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // One-way: freeze on the last frame, where the claim is fully stated.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const line1 = popIn(frame, fps, 8, 30);
  const line2 = popIn(frame, fps, 16, 30);
  const stamp = popIn(frame, fps, DIFF_AT, 30);
  const stampIn = interpolateSafe(frame, [DIFF_AT, DIFF_AT + 10], [0, 1]);
  const ctaRise = popIn(frame, fps, 236, 30);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={loopT(frame, durationInFrames)}
        motion={1}
        accent={accent}
        cell={72}
        bloomAt={[0.5, 0.42]}
      />

      <Box
        x={G}
        y={TOP}
        w={CONTENT_W}
        style={{ opacity: interpolateSafe(frame, [0, 12], [0, 1]) }}
      >
        <Eyebrow size={27} color={accentColor(accent)}>
          {`${eyebrow} · ${city}`}
        </Eyebrow>
      </Box>

      <Box x={G} y={TOP + 66} w={CONTENT_W}>
        {[headline[0], headline[1]].map((text, i) => (
          <div
            key={text}
            style={{
              ...headlineStyle(96, i === 0 ? BRAND.foreground : accentColor(accent)),
              opacity: interpolateSafe(frame, [8 + i * 8, 22 + i * 8], [0, 1]),
              transform: `translateY(${(1 - (i === 0 ? line1 : line2)) * 40}px)`,
            }}
          >
            {text}
          </div>
        ))}
      </Box>

      <Box
        x={G}
        y={TOP + 300}
        w={CONTENT_W}
        style={{ opacity: interpolateSafe(frame, [30, 44], [0, 1]) }}
      >
        <span style={bodyStyle(32, muted(1))}>
          {venueName} · one hour on SportsBnB
        </span>
      </Box>

      {/* ── The two rows and the difference ───────────────────────────── */}
      <Box
        x={G}
        y={720}
        w={CONTENT_W}
        style={{ display: "flex", flexDirection: "column", gap: 22 }}
      >
        <PayoutRow
          frame={frame}
          fps={fps}
          index={0}
          label="You list"
          amount={listedPrice}
          currency={currency}
          accent={accent}
          emphasised={false}
        />
        <PayoutRow
          frame={frame}
          fps={fps}
          index={1}
          label="You receive"
          amount={listedPrice}
          currency={currency}
          accent={accent}
          emphasised
        />
      </Box>

      {/* The stamp. There is no fee row anywhere in this file — the whole
          point is that the subtraction does not happen. */}
      <Box
        x={G}
        y={1046}
        w={CONTENT_W}
        h={150}
        style={{
          opacity: stampIn,
          transform: `scale(${0.86 + stamp * 0.14}) rotate(${(1 - stamp) * -4}deg)`,
          transformOrigin: "50% 50%",
          borderRadius: 40,
          border: `3px solid ${accentAlpha(accent, 0.6)}`,
          backgroundColor: accentAlpha(accent, 0.1),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 26,
          boxShadow: `0 0 ${110 * stamp}px -26px ${accentAlpha(accent, 0.9)}`,
        }}
      >
        <span style={headlineStyle(104, accentColor(accent))}>
          {COMMISSION.rate}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={headlineStyle(40, BRAND.foreground, 700)}>
            {COMMISSION.badge}
          </span>
          <span style={bodyStyle(26, muted(1))}>{COMMISSION.ownerLine}</span>
        </div>
      </Box>

      {/* ── Bullets ───────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={1236}
        w={CONTENT_W}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        {bullets.slice(0, 3).map((line, i) => {
          const at = 176 + i * 14;
          return (
            <div
              key={line}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                opacity: interpolateSafe(frame, [at, at + 12], [0, 1]),
                transform: `translateX(${(1 - popIn(frame, fps, at, 24)) * 32}px)`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  flexShrink: 0,
                  backgroundColor: accentAlpha(accent, 0.16),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckIcon size={26} color={accentColor(accent)} weight={2.8} />
              </div>
              <span style={bodyStyle(31, chalk(0.94), 600)}>{line}</span>
            </div>
          );
        })}
      </Box>

      <Box
        x={G}
        y={1400}
        w={CONTENT_W}
        h={116}
        style={{
          opacity: interpolateSafe(frame, [236, 248], [0, 1]),
          transform: `translateY(${(1 - ctaRise) * 34}px)`,
          borderRadius: 34,
          backgroundColor: accentColor(accent),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 90px -24px ${accentAlpha(accent, 0.9)}`,
        }}
      >
        <span style={headlineStyle(42, onAccent(accent), 700)}>{ctaLabel}</span>
      </Box>

      <Box
        x={G}
        y={BOTTOM - 72}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [252, 266], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Lockup size={54} accent={accent} />
        <Handle size={22} />
      </Box>

      {/* Bleed scrim so the bottom margin stays visually quiet. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${ink(0.5)} 0%, transparent 22%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
