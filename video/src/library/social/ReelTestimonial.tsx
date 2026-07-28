/**
 * ReelTestimonial — one player's quote, typed onto a card with their rating,
 * the venue they played and how long the booking took.
 * 9:16 for Reels / TikTok / Stories, one-way, cut to sit under a talking-head
 * clip or to stand alone as a Story.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1920. The eyebrow, quote card, attribution and proof strip sit between
 * y=270 (top 14%) and y=1536 (bottom 20%), clear of the account row, sound
 * pill, caption block and action rail. Only the backdrop and the quote mark
 * bleed past those lines.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * One-way, so `seamless: false`. The quote reveals a line at a time on
 * springs, the stars stamp in one by one, and the proof strip closes. Reduced
 * motion freezes on the LAST frame — the quote fully written and every star
 * lit, which is the state that carries the message.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  Backdrop,
  Box,
  Eyebrow,
  Handle,
  Lockup,
  PinIcon,
  StarIcon,
} from "./socialChrome";
import {
  BRAND,
  COMMISSION,
  DISPLAY_FONT,
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
  numeralStyle,
  popIn,
  useMotionFrame,
} from "./socialKit";

export type ReelTestimonialProps = {
  eyebrow: string;
  /** The quote, one array entry per rendered line. Keep lines under ~26 chars. */
  quoteLines: string[];
  authorName: string;
  /** "Player, Kentron" or "Owner, Mika Sports Complex". */
  authorRole: string;
  /** Two letters for the drawn avatar — no photographs, no network. */
  authorInitials: string;
  /** 1–5. Rendered as filled stars. */
  stars: number;
  venueName: string;
  city: string;
  /** The proof line at the bottom, e.g. "Booked in 40 seconds". */
  proofLabel: string;
  accent: Accent;
};

export const reelTestimonialDefaultProps: ReelTestimonialProps = {
  eyebrow: "Player story",
  quoteLines: [
    "I used to ring four",
    "pitches to find one",
    "free. Now it takes",
    "about a minute.",
  ],
  authorName: "Aram G.",
  authorRole: "Plays every Friday, Kentron",
  authorInitials: "AG",
  stars: 5,
  venueName: "Ararat Arena",
  city: "Yerevan",
  proofLabel: "Booked in 40 seconds",
  accent: "green",
};

const { width: W, height: H, safeTop: TOP, safeBottom: BOTTOM, gutter: G } = REEL;
const CONTENT_W = W - G * 2;

export const ReelTestimonial: FC<ReelTestimonialProps> = ({
  eyebrow,
  quoteLines,
  authorName,
  authorRole,
  authorInitials,
  stars,
  venueName,
  city,
  proofLabel,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // One-way: the finished quote is the message, so calm freezes on the last frame.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const lines = quoteLines.slice(0, 5);
  const cardRise = popIn(frame, fps, 10, 30);
  const attribAt = 40 + lines.length * 16;
  const proofAt = attribAt + 56;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={loopT(frame, durationInFrames)}
        motion={1}
        accent={accent}
        cell={72}
        bloomAt={[0.5, 0.32]}
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

      {/* ── The quote card ────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 76}
        w={CONTENT_W}
        h={800}
        style={{
          opacity: interpolateSafe(frame, [10, 24], [0, 1]),
          transform: `translateY(${(1 - cardRise) * 44}px)`,
          borderRadius: 52,
          backgroundColor: BRAND.card,
          border: `2px solid ${accentAlpha(accent, 0.24)}`,
          boxShadow: `0 40px 90px -34px ${ink(0.9)}`,
          padding: 52,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* The quote mark, deliberately oversized and clipped by the card. */}
        <span
          style={{
            position: "absolute",
            left: 34,
            top: -46,
            fontFamily: DISPLAY_FONT,
            fontSize: 220,
            fontWeight: 700,
            color: accentAlpha(accent, 0.18),
            lineHeight: 1,
          }}
        >
          &ldquo;
        </span>

        {lines.map((line, i) => {
          const at = 26 + i * 16;
          return (
            <div
              key={line}
              style={{
                ...headlineStyle(72, BRAND.foreground, 700),
                lineHeight: 1.18,
                opacity: interpolateSafe(frame, [at, at + 12], [0, 1]),
                transform: `translateY(${(1 - popIn(frame, fps, at, 26)) * 26}px)`,
              }}
            >
              {line}
            </div>
          );
        })}

        {/* Stars, stamped one at a time. */}
        <div style={{ display: "flex", gap: 14, marginTop: 36 }}>
          {Array.from({ length: 5 }, (_, i) => {
            const at = attribAt - 14 + i * 6;
            const lit = i < stars;
            const p = popIn(frame, fps, at, 20);
            return (
              <div
                key={i}
                style={{
                  opacity: lit
                    ? interpolateSafe(frame, [at, at + 8], [0, 1])
                    : 0.22,
                  transform: `scale(${lit ? 0.6 + p * 0.4 : 1})`,
                }}
              >
                <StarIcon size={46} color={lit ? BRAND.amber : muted(0.5)} />
              </div>
            );
          })}
        </div>
      </Box>

      {/* ── Attribution ───────────────────────────────────────────────── */}
      <Box
        x={G}
        y={1180}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [attribAt, attribAt + 14], [0, 1]),
          transform: `translateY(${(1 - popIn(frame, fps, attribAt, 28)) * 30}px)`,
          display: "flex",
          alignItems: "center",
          gap: 26,
        }}
      >
        <div
          style={{
            width: 108,
            height: 108,
            borderRadius: 36,
            flexShrink: 0,
            backgroundColor: accentAlpha(accent, 0.16),
            border: `2px solid ${accentAlpha(accent, 0.4)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={numeralStyle(42, accentColor(accent), 700)}>
            {authorInitials}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={headlineStyle(46, BRAND.foreground, 700)}>
            {authorName}
          </span>
          <span style={bodyStyle(28, muted(1))}>{authorRole}</span>
        </div>
      </Box>

      {/* ── Proof strip ───────────────────────────────────────────────── */}
      <Box
        x={G}
        y={1330}
        w={CONTENT_W}
        h={124}
        style={{
          opacity: interpolateSafe(frame, [proofAt, proofAt + 14], [0, 1]),
          transform: `translateY(${(1 - popIn(frame, fps, proofAt, 28)) * 30}px)`,
          borderRadius: 36,
          backgroundColor: accentAlpha(accent, 0.1),
          border: `2px solid ${accentAlpha(accent, 0.36)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 34px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <PinIcon size={32} color={accentColor(accent)} weight={2} />
          <span style={bodyStyle(29, chalk(0.94), 600)}>{venueName}</span>
        </div>
        <span style={bodyStyle(28, accentColor(accent), 600)}>{proofLabel}</span>
      </Box>

      <Box
        x={G}
        y={BOTTOM - 70}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [proofAt + 20, proofAt + 34], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Lockup size={52} accent={accent} />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={bodyStyle(23, chalk(0.78), 600)}>{COMMISSION.badge}</span>
          <Handle size={21} />
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
