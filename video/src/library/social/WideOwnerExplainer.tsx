/**
 * WideOwnerExplainer — the owner pitch done as arithmetic: listed price times
 * booked hours, minus a cut of exactly zero, equals what lands in their bank.
 * 16:9 for YouTube / web / sales deck, one-way — the explainer slide.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1920×1080 on the classic 5% title-safe inset: copy between y=96 and y=984
 * inside a 140px gutter.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * One-way, so `seamless: false`. The ledger rows land in reading order, the
 * zero row lights, and the take-home figure counts up last. Reduced motion
 * freezes on the LAST frame, where the whole sum is on screen — the only frame
 * that makes the argument.
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
} from "./socialChrome";
import {
  BRAND,
  COMMISSION,
  DRAM,
  EASE_OUT_EXPO,
  WIDE,
  type Accent,
  accentAlpha,
  accentColor,
  bodyStyle,
  chalk,
  formatMoney,
  hairline,
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

export type WideOwnerExplainerProps = {
  eyebrow: string;
  /** Two display lines. */
  headline: [string, string];
  /** The bullets under the headline. */
  points: string[];
  /** What the owner lists an hour at, in dram. */
  pricePerHour: number;
  /** Hours the venue booked in the period. */
  bookedHours: number;
  /** What the period is called on the ledger. */
  periodLabel: string;
  currency: string;
  accent: Accent;
};

export const wideOwnerExplainerDefaultProps: WideOwnerExplainerProps = {
  eyebrow: "For venue owners",
  headline: ["You set the price.", "You keep the price."],
  points: [
    "List your hours in minutes — no contract, no setup fee.",
    "Bookings land on your board the second a player confirms.",
    "We take nothing out of the middle. Not a percent.",
  ],
  pricePerHour: 18000,
  bookedHours: 52,
  periodLabel: "Last month",
  currency: DRAM,
  accent: "green",
};

const {
  width: W,
  height: H,
  safeTop: TOP,
  safeBottom: BOTTOM,
  gutter: G,
} = WIDE;

const COL_W = 780;
const LEDGER_W = 700;
const LEDGER_X = W - G - LEDGER_W;

const POINTS_AT = 30;
const LEDGER_AT = 56;
const ROW_STEP = 14;
const ZERO_AT = LEDGER_AT + ROW_STEP * 2 + 20;
const TOTAL_FROM = ZERO_AT + 22;
const TOTAL_TO = TOTAL_FROM + 54;

export const WideOwnerExplainer: FC<WideOwnerExplainerProps> = ({
  eyebrow,
  headline,
  points,
  pricePerHour,
  bookedHours,
  periodLabel,
  currency,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // One-way: the finished sum is the message, so calm freezes on the last frame.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const gross = Math.round(pricePerHour * bookedHours);
  /** The whole argument: nothing is deducted, so take-home *is* gross. */
  const takeHome = gross;

  const counted = Math.round(
    interpolateSafe(frame, [TOTAL_FROM, TOTAL_TO], [0, takeHome], EASE_OUT_EXPO),
  );
  const landed = interpolateSafe(frame, [TOTAL_TO - 12, TOTAL_TO + 8], [0, 1]);
  const zeroHeat = interpolateSafe(frame, [ZERO_AT, ZERO_AT + 16], [0, 1]);
  const ledger = popIn(frame, fps, LEDGER_AT - 12, 32);

  const rows: { label: string; value: string }[] = [
    { label: "Listed price", value: `${formatMoney(pricePerHour, currency)} / h` },
    { label: "Hours booked", value: `${bookedHours} h` },
    { label: "Booked value", value: formatMoney(gross, currency) },
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
        bloomAt={[0.72, 0.42]}
        bloom={0.6 + 0.7 * landed}
        markings={false}
      />

      <Box
        x={G}
        y={TOP}
        w={W - G * 2}
        style={{
          opacity: interpolateSafe(frame, [0, 12], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Eyebrow size={26} color={accentColor(accent)}>
          {eyebrow}
        </Eyebrow>
        <Lockup size={54} accent={accent} />
      </Box>

      {/* ── Headline ──────────────────────────────────────────────────── */}
      <Box x={G} y={TOP + 92} w={COL_W}>
        {headline.map((line, i) => {
          const at = 8 + i * 12;
          return (
            <div
              key={line}
              style={{
                ...headlineStyle(
                  84,
                  i === 1 ? accentColor(accent) : BRAND.foreground,
                ),
                marginBottom: 8,
                opacity: interpolateSafe(frame, [at, at + 14], [0, 1]),
                transform: `translateY(${(1 - popIn(frame, fps, at, 30)) * 30}px)`,
              }}
            >
              {line}
            </div>
          );
        })}
      </Box>

      {/* ── Points ────────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 292}
        w={COL_W}
        style={{ display: "flex", flexDirection: "column", gap: 24 }}
      >
        {points.slice(0, 3).map((point, i) => {
          const at = POINTS_AT + stagger(i, 10, 3);
          return (
            <div
              key={point}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 20,
                opacity: interpolateSafe(frame, [at, at + 12], [0, 1]),
                transform: `translateY(${(1 - popIn(frame, fps, at, 26)) * 22}px)`,
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
              <span style={{ ...bodyStyle(31, chalk(0.92)), display: "block" }}>
                {point}
              </span>
            </div>
          );
        })}
      </Box>

      {/* ── The ledger ────────────────────────────────────────────────── */}
      <Box
        x={LEDGER_X}
        y={TOP + 92}
        w={LEDGER_W}
        h={646}
        style={{
          opacity: interpolateSafe(frame, [LEDGER_AT - 12, LEDGER_AT], [0, 1]),
          transform: `translateY(${(1 - ledger) * 34}px)`,
          borderRadius: 48,
          backgroundColor: BRAND.card,
          border: `2px solid ${accentAlpha(accent, 0.24 + 0.2 * landed)}`,
          boxShadow: `0 40px 96px -34px ${ink(0.9)}, 0 0 ${140 * landed}px -46px ${accentAlpha(accent, 0.7)}`,
          padding: "40px 42px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <Eyebrow size={22} color={muted(1)} dot={false}>
          {periodLabel}
        </Eyebrow>

        {rows.map((row, i) => {
          const at = LEDGER_AT + i * ROW_STEP;
          return (
            <div
              key={row.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: interpolateSafe(frame, [at, at + 12], [0, 1]),
              }}
            >
              <span style={bodyStyle(30, muted(1))}>{row.label}</span>
              <span style={numeralStyle(34, chalk(0.94), 600)}>{row.value}</span>
            </div>
          );
        })}

        {/* The punchline row. It is a zero, and it always will be. */}
        <div
          style={{
            marginTop: 4,
            borderTop: `2px solid ${hairline(1)}`,
            paddingTop: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: interpolateSafe(frame, [ZERO_AT, ZERO_AT + 12], [0, 1]),
          }}
        >
          <span style={bodyStyle(30, chalk(0.9), 600)}>
            SportsBnB&rsquo;s cut
          </span>
          <span
            style={{
              ...numeralStyle(40, accentColor(accent), 700),
              textShadow: `0 0 ${26 * zeroHeat}px ${accentAlpha(accent, 0.8)}`,
            }}
          >
            {formatMoney(0, currency)}
          </span>
        </div>

        {/* ── Take-home ───────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: "auto",
            borderRadius: 32,
            backgroundColor: accentAlpha(accent, 0.1 + 0.06 * landed),
            border: `2px solid ${accentAlpha(accent, 0.36 + 0.3 * landed)}`,
            padding: "26px 30px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            opacity: interpolateSafe(frame, [TOTAL_FROM - 10, TOTAL_FROM], [0, 1]),
          }}
        >
          <span style={bodyStyle(26, muted(1), 600)}>{COMMISSION.ownerLine}</span>
          <span style={numeralStyle(64, accentColor(accent), 700)}>
            {formatMoney(counted, currency)}
          </span>
        </div>
      </Box>

      <Box
        x={G}
        y={BOTTOM - 44}
        w={W - G * 2}
        style={{
          opacity: interpolateSafe(frame, [TOTAL_TO, TOTAL_TO + 16], [0, 1]),
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
