/**
 * PostVenueCard — one listing as a square feed post: pitch, district, format,
 * rating and the hourly price, rendered straight from a venue row.
 * 1:1 for Instagram / Facebook feed, one-way, the workhorse of the family —
 * one render per venue.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * One-way, so `seamless: false`. The plate rises, the chips arrive on a
 * stagger and the price strip lands last. Reduced motion freezes on the LAST
 * frame, where the whole card is legible — a feed post's end state is the post.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  Backdrop,
  Box,
  Chip,
  Eyebrow,
  Handle,
  Lockup,
  Money,
  PinIcon,
  PitchThumb,
  Rating,
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
  headlineStyle,
  ink,
  interpolateSafe,
  loopT,
  muted,
  popIn,
  stagger,
  useMotionFrame,
} from "./socialKit";

export type PostVenueCardProps = {
  venueName: string;
  district: string;
  city: string;
  sport: string;
  format: string;
  /** Short feature tags — surface, lights, changing rooms. */
  tags: string[];
  rating: string;
  reviews: number;
  pricePerHour: number;
  currency: string;
  pitchHue: number;
  accent: Accent;
};

export const postVenueCardDefaultProps: PostVenueCardProps = {
  venueName: "Mika Sports Complex",
  district: "Davtashen",
  city: "Yerevan",
  sport: "Football",
  format: "7-a-side",
  tags: ["3G turf", "Floodlit", "Changing rooms"],
  rating: "4.8",
  reviews: 204,
  pricePerHour: 18000,
  currency: DRAM,
  pitchHue: 166,
  accent: "green",
};

const { width: W, height: H, safeTop: TOP, safeBottom: BOTTOM, gutter: G } =
  SQUARE;
const CONTENT_W = W - G * 2;

export const PostVenueCard: FC<PostVenueCardProps> = ({
  venueName,
  district,
  city,
  sport,
  format,
  tags,
  rating,
  reviews,
  pricePerHour,
  currency,
  pitchHue,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // One-way: the finished card is the post, so calm freezes on the last frame.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const plate = popIn(frame, fps, 8, 30);
  const priceRise = popIn(frame, fps, 76, 28);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={loopT(frame, durationInFrames)}
        motion={1}
        accent={accent}
        cell={60}
        bloomAt={[0.5, 0.18]}
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
          {`${sport} · ${format}`}
        </Eyebrow>
        <Lockup size={44} accent={accent} />
      </Box>

      {/* ── Pitch plate ───────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 62}
        w={CONTENT_W}
        h={330}
        style={{
          opacity: interpolateSafe(frame, [8, 22], [0, 1]),
          transform: `translateY(${(1 - plate) * 34}px) scale(${0.97 + plate * 0.03})`,
          transformOrigin: "50% 40%",
          borderRadius: 40,
          overflow: "hidden",
          border: `2px solid ${accentAlpha(accent, 0.28)}`,
          boxShadow: `0 32px 72px -28px ${ink(0.9)}, 0 0 100px -34px ${accentAlpha(accent, 0.55)}`,
        }}
      >
        <div style={{ position: "absolute", inset: 0 }}>
          <PitchThumb size={CONTENT_W} hue={pitchHue} radius={0} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to top, ${ink(0.82)} 0%, ${ink(0.24)} 50%, transparent 84%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 28,
            bottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <PinIcon size={28} color={accentColor(accent)} weight={2} />
          <span style={bodyStyle(27, chalk(0.95), 600)}>
            {district}, {city}
          </span>
        </div>
      </Box>

      {/* ── Name + rating ─────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 424}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [26, 40], [0, 1]),
          transform: `translateY(${(1 - popIn(frame, fps, 26, 28)) * 26}px)`,
        }}
      >
        <div style={headlineStyle(70, BRAND.foreground)}>{venueName}</div>
      </Box>

      <Box
        x={G}
        y={TOP + 508}
        w={CONTENT_W}
        style={{ opacity: interpolateSafe(frame, [36, 50], [0, 1]) }}
      >
        <Rating rating={rating} reviews={reviews} size={28} />
      </Box>

      {/* ── Tags ──────────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 572}
        w={CONTENT_W}
        style={{ display: "flex", gap: 14, flexWrap: "wrap" }}
      >
        {tags.slice(0, 3).map((tag, i) => {
          const at = 48 + stagger(i, 6, 3);
          return (
            <div
              key={tag}
              style={{
                opacity: interpolateSafe(frame, [at, at + 10], [0, 1]),
                transform: `translateY(${(1 - popIn(frame, fps, at, 20)) * 18}px)`,
              }}
            >
              <Chip size={24} accent={accent}>
                {tag}
              </Chip>
            </div>
          );
        })}
      </Box>

      {/* ── Price strip. No fee line: there is no fee. ────────────────── */}
      <Box
        x={G}
        y={BOTTOM - 148}
        w={CONTENT_W}
        h={148}
        style={{
          opacity: interpolateSafe(frame, [76, 90], [0, 1]),
          transform: `translateY(${(1 - priceRise) * 32}px)`,
          borderRadius: 38,
          backgroundColor: BRAND.card,
          border: `2px solid ${accentAlpha(accent, 0.4)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 34px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Money
            amount={pricePerHour}
            currency={currency}
            size={50}
            color={accentColor(accent)}
            suffix="/ hour"
          />
          <span style={bodyStyle(24, muted(0.95))}>{COMMISSION.playerLine}</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 2,
          }}
        >
          <span style={headlineStyle(44, accentColor(accent))}>
            {COMMISSION.rate}
          </span>
          <Handle size={19} />
        </div>
      </Box>
    </AbsoluteFill>
  );
};
