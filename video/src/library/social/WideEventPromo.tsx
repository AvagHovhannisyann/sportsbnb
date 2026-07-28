/**
 * WideEventPromo — a tournament or league night sold in one screen: what it
 * is, when, where, what a team pays and how many places are left.
 * 16:9 for YouTube / web / display, one-way — the event announcement slide.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1920×1080 on the classic 5% title-safe inset: copy between y=96 and y=984
 * inside a 140px gutter.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * One-way, so `seamless: false`. The event name lands, the fact rail staggers
 * in, and the entry-fee plate rises last with the places-left count. Reduced
 * motion freezes on the LAST frame, the complete poster.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  Backdrop,
  Box,
  CalendarIcon,
  Chip,
  ClockIcon,
  Eyebrow,
  Handle,
  Lockup,
  Money,
  PinIcon,
  TrophyIcon,
  type IconProps,
} from "./socialChrome";
import {
  BRAND,
  COMMISSION,
  DRAM,
  WIDE,
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
  stagger,
  useMotionFrame,
} from "./socialKit";

export type WideEventPromoProps = {
  eyebrow: string;
  /** What the event is called. */
  eventName: string;
  sport: string;
  /** Short format tags — "5-a-side", "16 teams", "group + knockout". */
  tags: string[];
  dateLabel: string;
  timeLabel: string;
  venueName: string;
  city: string;
  /** What a team pays to enter, in dram. */
  entryFee: number;
  currency: string;
  /** Team places still open. */
  placesLeft: number;
  accent: Accent;
};

export const wideEventPromoDefaultProps: WideEventPromoProps = {
  eyebrow: "Event",
  eventName: "Yerevan Autumn Cup",
  sport: "Football",
  tags: ["5-a-side", "16 teams", "Group + knockout"],
  dateLabel: "Sat 20 Sep",
  timeLabel: "10:00 – 18:00",
  venueName: "Mika Sports Complex",
  city: "Yerevan",
  entryFee: 45000,
  currency: DRAM,
  placesLeft: 4,
  accent: "amber",
};

const {
  width: W,
  height: H,
  safeTop: TOP,
  safeBottom: BOTTOM,
  gutter: G,
} = WIDE;
const CONTENT_W = W - G * 2;

const COL_W = 1040;
const PLATE_W = 520;
const PLATE_X = W - G - PLATE_W;

const FACTS_AT = 44;
const PLATE_AT = 74;

type Fact = { icon: FC<IconProps>; label: string; value: string };

export const WideEventPromo: FC<WideEventPromoProps> = ({
  eyebrow,
  eventName,
  sport,
  tags,
  dateLabel,
  timeLabel,
  venueName,
  city,
  entryFee,
  currency,
  placesLeft,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // One-way: the finished poster is the message, so calm freezes on the last frame.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const plate = popIn(frame, fps, PLATE_AT, 32);
  const landed = interpolateSafe(frame, [PLATE_AT, PLATE_AT + 24], [0, 1]);

  const facts: Fact[] = [
    { icon: CalendarIcon, label: "Date", value: dateLabel },
    { icon: ClockIcon, label: "Time", value: timeLabel },
    { icon: PinIcon, label: "Venue", value: `${venueName}, ${city}` },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={loopT(frame, durationInFrames)}
        motion={1}
        accent={accent}
        cell={80}
        bloomAt={[0.3, 0.24]}
        bloom={0.7 + 0.6 * landed}
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
        <Eyebrow size={26} color={accentColor(accent)}>
          {`${eyebrow} · ${sport}`}
        </Eyebrow>
        <Lockup size={54} accent={accent} />
      </Box>

      {/* ── Name ──────────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 92}
        w={COL_W}
        style={{
          opacity: interpolateSafe(frame, [6, 22], [0, 1]),
          transform: `translateY(${(1 - popIn(frame, fps, 6, 32)) * 34}px)`,
          display: "flex",
          alignItems: "center",
          gap: 26,
        }}
      >
        <TrophyIcon size={72} color={accentColor(accent)} weight={1.9} />
        <div style={headlineStyle(96, BRAND.foreground)}>{eventName}</div>
      </Box>

      {/* ── Tags ──────────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 232}
        w={COL_W}
        style={{ display: "flex", gap: 14, flexWrap: "wrap" }}
      >
        {tags.slice(0, 3).map((tag, i) => {
          const at = 26 + stagger(i, 6, 3);
          return (
            <div
              key={tag}
              style={{
                opacity: interpolateSafe(frame, [at, at + 10], [0, 1]),
                transform: `translateY(${(1 - popIn(frame, fps, at, 20)) * 16}px)`,
              }}
            >
              <Chip size={25} accent={accent}>
                {tag}
              </Chip>
            </div>
          );
        })}
      </Box>

      {/* ── Facts ─────────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 320}
        w={COL_W}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        {facts.map((fact, i) => {
          const at = FACTS_AT + stagger(i, 10, 3);
          const Icon = fact.icon;
          return (
            <div
              key={fact.label}
              style={{
                height: 108,
                boxSizing: "border-box",
                borderRadius: 32,
                backgroundColor: BRAND.card,
                border: `2px solid ${accentAlpha(accent, 0.22)}`,
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "0 30px",
                opacity: interpolateSafe(frame, [at, at + 12], [0, 1]),
                transform: `translateY(${(1 - popIn(frame, fps, at, 24)) * 24}px)`,
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  flexShrink: 0,
                  backgroundColor: accentAlpha(accent, 0.14),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={32} color={accentColor(accent)} weight={2} />
              </div>
              <span style={bodyStyle(24, muted(1), 600)}>{fact.label}</span>
              <span
                style={{
                  ...bodyStyle(32, chalk(0.95), 600),
                  marginLeft: "auto",
                  textAlign: "right",
                }}
              >
                {fact.value}
              </span>
            </div>
          );
        })}
      </Box>

      {/* ── Entry plate. The fee is the fee; nothing rides on top. ────── */}
      <Box
        x={PLATE_X}
        y={TOP + 232}
        w={PLATE_W}
        h={468}
        style={{
          opacity: interpolateSafe(frame, [PLATE_AT, PLATE_AT + 14], [0, 1]),
          transform: `translateY(${(1 - plate) * 36}px)`,
          borderRadius: 48,
          backgroundColor: BRAND.card,
          border: `2px solid ${accentAlpha(accent, 0.3 + 0.26 * landed)}`,
          boxShadow: `0 40px 96px -34px ${ink(0.9)}, 0 0 ${150 * landed}px -48px ${accentAlpha(accent, 0.75)}`,
          padding: "38px 36px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Eyebrow size={22} color={muted(1)} dot={false}>
            Entry per team
          </Eyebrow>
          <Money
            amount={entryFee}
            currency={currency}
            size={62}
            color={accentColor(accent)}
          />
          <span style={bodyStyle(25, muted(0.95))}>{COMMISSION.playerLine}</span>
        </div>

        <div
          style={{
            borderRadius: 30,
            backgroundColor: accentAlpha(accent, 0.12),
            border: `2px solid ${accentAlpha(accent, 0.42)}`,
            padding: "22px 26px",
            display: "flex",
            alignItems: "center",
            gap: 18,
            opacity: interpolateSafe(frame, [PLATE_AT + 16, PLATE_AT + 30], [0, 1]),
          }}
        >
          <span style={numeralStyle(56, accentColor(accent), 700)}>
            {placesLeft}
          </span>
          <span style={headlineStyle(32, BRAND.foreground, 700)}>
            {placesLeft === 1 ? "place left" : "places left"}
          </span>
        </div>
      </Box>

      <Box
        x={G}
        y={BOTTOM - 44}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [PLATE_AT + 24, PLATE_AT + 40], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={bodyStyle(27, chalk(0.84), 600)}>{COMMISSION.proof}</span>
        <Handle size={22} />
      </Box>

      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${ink(0.4)} 0%, transparent 14%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
