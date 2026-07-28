/**
 * WideBrandIntro — the opening title: who SportsBnB is, in one screen, with
 * the zero-commission claim stated up front rather than buried in a footer.
 * 16:9 for YouTube pre-roll / web hero / display, one-way — the first shot.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1920×1080 on the classic 5% title-safe inset: copy between y=96 and y=984
 * inside a 140px gutter, so a letterboxed player or an over-scanning TV never
 * clips a word.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * One-way, so `seamless: false`. The lockup lands, the two headline lines
 * follow, the stat rail staggers in and the commission stamp closes it.
 * Reduced motion freezes on the LAST frame, the assembled title card.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  Backdrop,
  Box,
  CommissionBadge,
  Eyebrow,
  Handle,
  Lockup,
  PitchThumb,
} from "./socialChrome";
import {
  BRAND,
  COMMISSION,
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

export type IntroStat = {
  value: string;
  label: string;
};

export type WideBrandIntroProps = {
  eyebrow: string;
  /** Two display lines. */
  headline: [string, string];
  /** The sentence under the headline. */
  blurb: string;
  /** The rail of proof points. Three fits the column. */
  stats: IntroStat[];
  /** Hue for the drawn pitch plate on the right. */
  pitchHue: number;
  accent: Accent;
};

export const wideBrandIntroDefaultProps: WideBrandIntroProps = {
  eyebrow: "Armenia's sports venues, bookable",
  headline: ["Book the pitch.", "Play the game."],
  blurb:
    "Football, basketball, tennis and more — real availability, real prices, booked in under a minute.",
  stats: [
    { value: "180+", label: "venues live" },
    { value: "3", label: "cities" },
    { value: "0%", label: "commission" },
  ],
  pitchHue: 164,
  accent: "green",
};

const {
  width: W,
  height: H,
  safeTop: TOP,
  safeBottom: BOTTOM,
  gutter: G,
} = WIDE;

/** Left copy column and right plate, both inside the title-safe box. */
const COL_W = 900;
const PLATE_SIZE = 520;
const PLATE_X = W - G - PLATE_SIZE;

const HEAD_AT = 18;
const BLURB_AT = 46;
const STATS_AT = 62;
const STAMP_AT = 96;

export const WideBrandIntro: FC<WideBrandIntroProps> = ({
  eyebrow,
  headline,
  blurb,
  stats,
  pitchHue,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // One-way: the assembled title is the message, so calm freezes on the last frame.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const lockup = popIn(frame, fps, 2, 28);
  const plate = popIn(frame, fps, 24, 34);
  const stampHeat = interpolateSafe(frame, [STAMP_AT, STAMP_AT + 18], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={loopT(frame, durationInFrames)}
        motion={1}
        accent={accent}
        cell={80}
        bloomAt={[0.26, 0.3]}
        bloom={0.8 + 0.5 * stampHeat}
      />

      <Box
        x={G}
        y={TOP}
        w={COL_W}
        style={{
          opacity: interpolateSafe(frame, [0, 12], [0, 1]),
          transform: `translateY(${(1 - lockup) * -22}px)`,
        }}
      >
        <Lockup size={62} accent={accent} />
      </Box>

      <Box
        x={G}
        y={TOP + 106}
        w={COL_W}
        style={{ opacity: interpolateSafe(frame, [10, 24], [0, 1]) }}
      >
        <Eyebrow size={26} color={accentColor(accent)}>
          {eyebrow}
        </Eyebrow>
      </Box>

      {/* ── Headline ──────────────────────────────────────────────────── */}
      <Box x={G} y={TOP + 168} w={COL_W}>
        {headline.map((line, i) => {
          const at = HEAD_AT + i * 12;
          return (
            <div
              key={line}
              style={{
                ...headlineStyle(
                  104,
                  i === 1 ? accentColor(accent) : BRAND.foreground,
                ),
                marginBottom: 8,
                opacity: interpolateSafe(frame, [at, at + 14], [0, 1]),
                transform: `translateY(${(1 - popIn(frame, fps, at, 30)) * 32}px)`,
              }}
            >
              {line}
            </div>
          );
        })}
      </Box>

      <Box
        x={G}
        y={TOP + 400}
        w={COL_W - 60}
        style={{
          opacity: interpolateSafe(frame, [BLURB_AT, BLURB_AT + 16], [0, 1]),
          transform: `translateY(${(1 - popIn(frame, fps, BLURB_AT, 28)) * 24}px)`,
        }}
      >
        <span style={{ ...bodyStyle(34, muted(1)), display: "block" }}>
          {blurb}
        </span>
      </Box>

      {/* ── Stat rail ─────────────────────────────────────────────────── */}
      <Box x={G} y={TOP + 522} w={COL_W} style={{ display: "flex", gap: 20 }}>
        {stats.slice(0, 3).map((stat, i) => {
          const at = STATS_AT + stagger(i, 8, 3);
          return (
            <div
              key={stat.label}
              style={{
                flex: 1,
                height: 148,
                borderRadius: 32,
                boxSizing: "border-box",
                backgroundColor: BRAND.card,
                border: `2px solid ${accentAlpha(accent, 0.24)}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: interpolateSafe(frame, [at, at + 12], [0, 1]),
                transform: `translateY(${(1 - popIn(frame, fps, at, 24)) * 26}px)`,
              }}
            >
              <span style={numeralStyle(56, accentColor(accent), 700)}>
                {stat.value}
              </span>
              <span style={bodyStyle(25, muted(1))}>{stat.label}</span>
            </div>
          );
        })}
      </Box>

      {/* ── The plate ─────────────────────────────────────────────────── */}
      <Box
        x={PLATE_X}
        y={TOP + 96}
        w={PLATE_SIZE}
        h={PLATE_SIZE}
        style={{
          opacity: interpolateSafe(frame, [24, 40], [0, 1]),
          transform: `translateY(${(1 - plate) * 34}px) scale(${0.94 + plate * 0.06})`,
          borderRadius: 56,
          overflow: "hidden",
          border: `2px solid ${accentAlpha(accent, 0.3)}`,
          boxShadow: `0 42px 100px -34px ${ink(0.9)}, 0 0 140px -44px ${accentAlpha(accent, 0.6)}`,
        }}
      >
        <PitchThumb size={PLATE_SIZE} hue={pitchHue} radius={0} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to top, ${ink(0.78)} 0%, ${ink(0.2)} 52%, transparent 84%)`,
          }}
        />
      </Box>

      {/* ── The claim ─────────────────────────────────────────────────── */}
      <Box
        x={PLATE_X - 40}
        y={TOP + 542}
        w={PLATE_SIZE + 40}
        style={{
          opacity: interpolateSafe(frame, [STAMP_AT, STAMP_AT + 14], [0, 1]),
          transform: `translateY(${(1 - popIn(frame, fps, STAMP_AT, 28)) * 22}px)`,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <CommissionBadge
          label={COMMISSION.badge}
          rate={COMMISSION.rate}
          size={40}
          accent={accent}
          heat={stampHeat}
        />
      </Box>

      <Box
        x={G}
        y={BOTTOM - 42}
        w={W - G * 2}
        style={{
          opacity: interpolateSafe(frame, [STAMP_AT + 12, STAMP_AT + 28], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={bodyStyle(26, chalk(0.82), 600)}>{COMMISSION.proof}</span>
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
