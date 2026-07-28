/**
 * PostNewCityLaunch — "SportsBnB is live in Gyumri": the pin lands, the venue
 * count counts up and the sports that opened with it arrive on a stagger.
 * 1:1 for Instagram / Facebook feed, one-way — the launch announcement post.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1080. Feed images carry no platform chrome, so the inset is optical:
 * everything meaningful sits between y=88 and y=992 inside an 88px gutter.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * One-way, so `seamless: false`. The pin drops on a spring, the city stamps in
 * behind it, the count ramps and the sport chips stagger. Reduced motion
 * freezes on the LAST frame, where the city, the count and the price are all
 * stated — the only frame of this post worth showing on its own.
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
} from "./socialChrome";
import {
  BRAND,
  COMMISSION,
  DISPLAY_FONT,
  DRAM,
  EASE_OUT_EXPO,
  SQUARE,
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
  stagger,
  useMotionFrame,
} from "./socialKit";

export type PostNewCityLaunchProps = {
  eyebrow: string;
  /** The city that just opened. */
  city: string;
  /** The line above the city name. */
  kicker: string;
  /** Venues live in that city on day one. */
  venueCount: number;
  /** Sports those venues carry. */
  sports: string[];
  /** Cheapest hourly rate in the new city, in dram. */
  fromPrice: number;
  currency: string;
  /** The sentence under the count. */
  blurb: string;
  accent: Accent;
};

export const postNewCityLaunchDefaultProps: PostNewCityLaunchProps = {
  eyebrow: "New city",
  city: "Gyumri",
  kicker: "We just opened in",
  venueCount: 18,
  sports: ["Football", "Basketball", "Volleyball", "Tennis"],
  fromPrice: 6500,
  currency: DRAM,
  blurb: "Eighteen pitches, courts and halls, bookable from your phone.",
  accent: "amber",
};

const {
  width: W,
  height: H,
  safeTop: TOP,
  safeBottom: BOTTOM,
  gutter: G,
} = SQUARE;
const CONTENT_W = W - G * 2;

const PIN_AT = 6;
const CITY_AT = 24;
const COUNT_FROM = 44;
const COUNT_TO = 96;
const CHIPS_AT = 100;
const PRICE_AT = 124;

export const PostNewCityLaunch: FC<PostNewCityLaunchProps> = ({
  eyebrow,
  city,
  kicker,
  venueCount,
  sports,
  fromPrice,
  currency,
  blurb,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // One-way: the announced city is the message, so calm freezes on the last frame.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const pin = popIn(frame, fps, PIN_AT, 30);
  const counted = Math.round(
    interpolateSafe(
      frame,
      [COUNT_FROM, COUNT_TO],
      [0, venueCount],
      EASE_OUT_EXPO,
    ),
  );
  const landed = interpolateSafe(frame, [COUNT_TO - 10, COUNT_TO + 8], [0, 1]);
  const priceRise = popIn(frame, fps, PRICE_AT, 28);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={loopT(frame, durationInFrames)}
        motion={1}
        accent={accent}
        cell={60}
        bloomAt={[0.5, 0.24]}
        bloom={0.6 + 0.6 * landed}
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

      {/* ── The pin ───────────────────────────────────────────────────── */}
      <Box
        x={W / 2 - 68}
        y={TOP + 78}
        w={136}
        h={136}
        style={{
          opacity: interpolateSafe(frame, [PIN_AT, PIN_AT + 10], [0, 1]),
          transform: `translateY(${(1 - pin) * -60}px) scale(${0.8 + pin * 0.2})`,
          borderRadius: 46,
          backgroundColor: accentAlpha(accent, 0.14),
          border: `3px solid ${accentAlpha(accent, 0.5)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 ${90 * pin}px -26px ${accentAlpha(accent, 0.9)}`,
        }}
      >
        <PinIcon size={74} color={accentColor(accent)} weight={1.9} />
      </Box>

      {/* ── Kicker + city ─────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 240}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [CITY_AT, CITY_AT + 12], [0, 1]),
          textAlign: "center",
        }}
      >
        <span style={{ ...bodyStyle(32, muted(1), 600), display: "block" }}>
          {kicker}
        </span>
      </Box>

      <Box
        x={G}
        y={TOP + 286}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [CITY_AT + 4, CITY_AT + 18], [0, 1]),
          transform: `translateY(${(1 - popIn(frame, fps, CITY_AT + 4, 30)) * 30}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            ...headlineStyle(126, accentColor(accent)),
            textAlign: "center",
          }}
        >
          {city}
        </div>
      </Box>

      {/* ── The count ─────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 434}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [COUNT_FROM - 8, COUNT_FROM + 6], [0, 1]),
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 104,
            fontWeight: 700,
            letterSpacing: "-0.05em",
            color: BRAND.foreground,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {groupThousands(counted)}
        </span>
        <span style={bodyStyle(38, chalk(0.92), 600)}>venues live</span>
      </Box>

      <Box
        x={G + 60}
        y={TOP + 552}
        w={CONTENT_W - 120}
        style={{
          opacity: interpolateSafe(frame, [COUNT_TO - 6, COUNT_TO + 10], [0, 1]),
          textAlign: "center",
        }}
      >
        <span
          style={{ ...bodyStyle(29, muted(1)), display: "block", textAlign: "center" }}
        >
          {blurb}
        </span>
      </Box>

      {/* ── Sports ────────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 636}
        w={CONTENT_W}
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {sports.slice(0, 4).map((sport, i) => {
          const at = CHIPS_AT + stagger(i, 6, 4);
          return (
            <div
              key={sport}
              style={{
                opacity: interpolateSafe(frame, [at, at + 10], [0, 1]),
                transform: `translateY(${(1 - popIn(frame, fps, at, 20)) * 18}px)`,
              }}
            >
              <Chip size={24} accent={accent}>
                {sport}
              </Chip>
            </div>
          );
        })}
      </Box>

      {/* ── Price strip. No fee line: there is no fee. ────────────────── */}
      <Box
        x={G}
        y={BOTTOM - 128}
        w={CONTENT_W}
        h={128}
        style={{
          opacity: interpolateSafe(frame, [PRICE_AT, PRICE_AT + 14], [0, 1]),
          transform: `translateY(${(1 - priceRise) * 30}px)`,
          borderRadius: 36,
          backgroundColor: BRAND.card,
          border: `2px solid ${accentAlpha(accent, 0.4)}`,
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 2,
          }}
        >
          <span style={headlineStyle(40, accentColor(accent))}>
            {COMMISSION.rate}
          </span>
          <Handle size={19} />
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
