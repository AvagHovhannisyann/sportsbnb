/**
 * PostOwnerTestimonial — a venue owner in their own words, with the number
 * that backs it up: the month's payout, all of which they keep.
 * 1:1 for Instagram / Facebook feed, one-way — the owner-acquisition post.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1080. Feed images carry no platform chrome, so the inset is optical:
 * copy sits between y=88 and y=992 inside an 88px gutter.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * One-way, so `seamless: false`. Quote lines reveal on a stagger, the owner
 * plate rises, then the payout counts up and the "you keep all of it" rule
 * lands. Reduced motion freezes on the LAST frame, where quote and payout are
 * both fully stated.
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
  PitchThumb,
} from "./socialChrome";
import {
  BRAND,
  COMMISSION,
  DRAM,
  EASE_OUT_EXPO,
  SQUARE,
  type Accent,
  accentAlpha,
  accentColor,
  bodyStyle,
  chalk,
  formatMoney,
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

export type PostOwnerTestimonialProps = {
  eyebrow: string;
  /** The quote, one array entry per set line. */
  quote: string[];
  ownerName: string;
  venueName: string;
  city: string;
  /** What the owner took home last month, in dram. */
  monthlyPayout: number;
  currency: string;
  /** The label under the payout figure. */
  payoutLabel: string;
  /** Hue for the drawn pitch avatar. */
  pitchHue: number;
  accent: Accent;
};

export const postOwnerTestimonialDefaultProps: PostOwnerTestimonialProps = {
  eyebrow: "Owner story",
  quote: ["Empty hours used to", "cost me. Now they", "book themselves."],
  ownerName: "Narek Sargsyan",
  venueName: "Arena 5",
  city: "Yerevan",
  monthlyPayout: 940000,
  currency: DRAM,
  payoutLabel: "paid out last month — all of it his",
  pitchHue: 172,
  accent: "green",
};

const {
  width: W,
  height: H,
  safeTop: TOP,
  safeBottom: BOTTOM,
  gutter: G,
} = SQUARE;
const CONTENT_W = W - G * 2;

const QUOTE_AT = 12;
const OWNER_AT = 62;
const COUNT_FROM = 84;
const COUNT_TO = 140;

export const PostOwnerTestimonial: FC<PostOwnerTestimonialProps> = ({
  eyebrow,
  quote,
  ownerName,
  venueName,
  city,
  monthlyPayout,
  currency,
  payoutLabel,
  pitchHue,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // One-way: the stated quote and payout are the message, so calm freezes last.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const lines = quote.slice(0, 3);
  const ownerRise = popIn(frame, fps, OWNER_AT, 30);
  const counted = Math.round(
    interpolateSafe(
      frame,
      [COUNT_FROM, COUNT_TO],
      [0, monthlyPayout],
      EASE_OUT_EXPO,
    ),
  );
  const landed = interpolateSafe(frame, [COUNT_TO - 12, COUNT_TO + 8], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={loopT(frame, durationInFrames)}
        motion={1}
        accent={accent}
        cell={60}
        bloomAt={[0.5, 0.7]}
        bloom={0.55 + 0.7 * landed}
        markings={false}
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
          {eyebrow}
        </Eyebrow>
        <Lockup size={44} accent={accent} />
      </Box>

      {/* ── The quote ─────────────────────────────────────────────────── */}
      <Box x={G} y={TOP + 84} w={CONTENT_W}>
        {lines.map((line, i) => {
          const at = QUOTE_AT + stagger(i, 12, 3);
          return (
            <div
              key={line}
              style={{
                ...headlineStyle(66, BRAND.foreground),
                marginBottom: 12,
                opacity: interpolateSafe(frame, [at, at + 12], [0, 1]),
                transform: `translateY(${(1 - popIn(frame, fps, at, 26)) * 24}px)`,
              }}
            >
              {i === 0 ? "“" : null}
              {line}
              {i === lines.length - 1 ? "”" : null}
            </div>
          );
        })}
      </Box>

      {/* ── Who said it ───────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 84 + lines.length * 78 + 34}
        w={CONTENT_W}
        h={124}
        style={{
          opacity: interpolateSafe(frame, [OWNER_AT, OWNER_AT + 14], [0, 1]),
          transform: `translateY(${(1 - ownerRise) * 26}px)`,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <PitchThumb size={104} hue={pitchHue} radius={34} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={headlineStyle(42, BRAND.foreground, 700)}>
            {ownerName}
          </span>
          <span style={bodyStyle(27, muted(1))}>
            {venueName} · {city}
          </span>
        </div>
      </Box>

      {/* ── The payout. No fee is deducted anywhere on this card. ─────── */}
      <Box
        x={G}
        y={BOTTOM - 300}
        w={CONTENT_W}
        h={212}
        style={{
          opacity: interpolateSafe(frame, [COUNT_FROM - 12, COUNT_FROM], [0, 1]),
          borderRadius: 40,
          backgroundColor: BRAND.card,
          border: `2px solid ${accentAlpha(accent, 0.24 + 0.24 * landed)}`,
          boxShadow: `0 0 ${110 * landed}px -40px ${accentAlpha(accent, 0.85)}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "0 30px",
        }}
      >
        <span style={numeralStyle(88, accentColor(accent), 700)}>
          {formatMoney(counted, currency)}
        </span>
        <span
          style={{
            ...bodyStyle(27, muted(1)),
            textAlign: "center",
            opacity: interpolateSafe(frame, [COUNT_TO - 10, COUNT_TO + 6], [0, 1]),
          }}
        >
          {payoutLabel}
        </span>
      </Box>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={BOTTOM - 62}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [COUNT_TO, COUNT_TO + 16], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <CheckIcon size={26} color={accentColor(accent)} weight={2.8} />
          <span style={bodyStyle(25, chalk(0.86), 600)}>
            {COMMISSION.ownerLine}
          </span>
        </div>
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
