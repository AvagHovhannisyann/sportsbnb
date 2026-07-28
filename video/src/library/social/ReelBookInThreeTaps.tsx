/**
 * ReelBookInThreeTaps — the "it really is this short" explainer: search, slot,
 * booked, one card per tap. 9:16 for Reels / TikTok / Stories, one-way, sized
 * to be cut under a 9-second hook.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1920. All copy sits between y=270 (top 14%) and y=1536 (bottom 20%) —
 * clear of the account row, sound pill, caption block and action rail. Only
 * the backdrop and the tap ripples bleed past those lines.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * One-way, so `seamless: false`: three step cards arrive on `popIn()` springs
 * 42 frames apart, each with a tap ripple that lands on its own card, and the
 * CTA rises last. Reduced motion freezes at the LAST frame — every card
 * present, every tick stamped — because the end state is the message.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  ArrowIcon,
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
  DRAM,
  EASE_OUT_EXPO,
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
  onAccent,
  popIn,
  useMotionFrame,
} from "./socialKit";

export type BookingStep = {
  /** "Search", "Pick a slot", "Booked" — two words at most. */
  title: string;
  /** The line under it, filled from the listing. */
  detail: string;
};

export type ReelBookInThreeTapsProps = {
  /** Two lines. Kept as a tuple so the second can carry the accent colour. */
  headline: [string, string];
  eyebrow: string;
  steps: BookingStep[];
  venueName: string;
  pricePerHour: number;
  currency: string;
  ctaLabel: string;
  accent: Accent;
};

export const reelBookInThreeTapsDefaultProps: ReelBookInThreeTapsProps = {
  headline: ["Book a pitch", "in three taps"],
  eyebrow: "How it works",
  steps: [
    { title: "Search", detail: "Football · Yerevan · tonight" },
    { title: "Pick a slot", detail: "19:00 – 20:00 · 1 hour" },
    { title: "Booked", detail: "Confirmed instantly, no callback" },
  ],
  venueName: "Mika Sports Complex",
  pricePerHour: 18000,
  currency: DRAM,
  ctaLabel: "sportsbnb.am",
  accent: "green",
};

const { width: W, height: H, safeTop: TOP, safeBottom: BOTTOM, gutter: G } = REEL;
const CONTENT_W = W - G * 2;

/** Frame each step's card lands on. */
const STEP_AT = [46, 88, 130];
/** Frame the tap ripple fires on each card. */
const TAP_AT = [64, 106, 148];

const StepCard: FC<{
  frame: number;
  fps: number;
  index: number;
  step: BookingStep;
  accent: Accent;
  last: boolean;
}> = ({ frame, fps, index, step, accent, last }) => {
  const at = STEP_AT[index];
  const tap = TAP_AT[index];
  const rise = popIn(frame, fps, at, 26);
  const opacity = interpolateSafe(frame, [at, at + 10], [0, 1]);

  /** The press: down on contact, back up eight frames later. */
  const press =
    interpolateSafe(frame, [tap, tap + 5], [0, 1], EASE_OUT_EXPO) -
    interpolateSafe(frame, [tap + 6, tap + 18], [0, 1], EASE_OUT_EXPO);
  const ripple = interpolateSafe(frame, [tap, tap + 26], [0, 1], EASE_OUT_EXPO);
  const settled = interpolateSafe(frame, [tap + 4, tap + 20], [0, 1]);

  const y = 660 + index * 210;

  return (
    <Box
      x={G}
      y={y}
      w={CONTENT_W}
      h={176}
      style={{
        opacity,
        transform: `translateY(${(1 - rise) * 46}px) scale(${1 - press * 0.025})`,
        transformOrigin: "50% 50%",
        borderRadius: 40,
        backgroundColor: last ? accentAlpha(accent, 0.1) : BRAND.card,
        border: `2px solid ${accentAlpha(accent, 0.18 + settled * (last ? 0.6 : 0.3))}`,
        boxShadow: `0 24px 60px -28px ${ink(0.9)}, 0 0 ${70 * settled}px -26px ${accentAlpha(accent, 0.6)}`,
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "0 34px",
      }}
    >
      {/* Tap ripple — decorative, allowed to overflow the card. */}
      <div
        style={{
          position: "absolute",
          right: 96,
          top: 88 - 4,
          width: 0,
          height: 0,
          overflow: "visible",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -110 * ripple,
            top: -110 * ripple,
            width: 220 * ripple,
            height: 220 * ripple,
            borderRadius: 220,
            border: `4px solid ${accentAlpha(accent, 0.5 * (1 - ripple))}`,
          }}
        />
      </div>

      {/* Step number. */}
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: 28,
          flexShrink: 0,
          backgroundColor: settled > 0.5 ? accentColor(accent) : BRAND.surface3,
          border: `2px solid ${accentAlpha(accent, 0.4)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={numeralStyle(
            40,
            settled > 0.5 ? onAccent(accent) : chalk(0.8),
            700,
          )}
        >
          {index + 1}
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={headlineStyle(46, BRAND.foreground, 700)}>{step.title}</span>
        <span style={bodyStyle(29, muted(1))}>{step.detail}</span>
      </div>

      {/* Confirmation tick. */}
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          flexShrink: 0,
          backgroundColor: accentAlpha(accent, 0.16),
          border: `2px solid ${accentAlpha(accent, 0.2 + 0.6 * settled)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.35 + 0.65 * settled,
          transform: `scale(${0.8 + 0.2 * settled})`,
        }}
      >
        <CheckIcon size={32} color={accentColor(accent)} weight={2.6} />
      </div>
    </Box>
  );
};

export const ReelBookInThreeTaps: FC<ReelBookInThreeTapsProps> = ({
  headline,
  eyebrow,
  steps,
  venueName,
  pricePerHour,
  currency,
  ctaLabel,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // One-way: the end state carries the message, so calm freezes on the last frame.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const eyebrowIn = interpolateSafe(frame, [0, 12], [0, 1]);
  const line1 = popIn(frame, fps, 6, 30);
  const line2 = popIn(frame, fps, 14, 30);
  const ctaRise = popIn(frame, fps, 176, 30);
  const ctaIn = interpolateSafe(frame, [176, 188], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={loopT(frame, durationInFrames)}
        motion={1}
        accent={accent}
        cell={72}
        bloomAt={[0.5, 0.24]}
      />

      <Box x={G} y={TOP} w={CONTENT_W} style={{ opacity: eyebrowIn }}>
        <Eyebrow size={27} color={accentColor(accent)}>
          {eyebrow}
        </Eyebrow>
      </Box>

      <Box x={G} y={TOP + 66} w={CONTENT_W}>
        {[headline[0], headline[1]].map((text, i) => {
          const p = i === 0 ? line1 : line2;
          return (
            <div
              key={text}
              style={{
                ...headlineStyle(102, i === 0 ? BRAND.foreground : accentColor(accent)),
                opacity: interpolateSafe(frame, [6 + i * 8, 20 + i * 8], [0, 1]),
                transform: `translateY(${(1 - p) * 40}px)`,
              }}
            >
              {text}
            </div>
          );
        })}
      </Box>

      <Box
        x={G}
        y={TOP + 66 + 236}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [24, 38], [0, 1]),
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <span style={bodyStyle(32, muted(1))}>{venueName}</span>
        <span style={{ color: BRAND.border }}>·</span>
        <Money
          amount={pricePerHour}
          currency={currency}
          size={32}
          color={chalk(0.92)}
          suffix="/ hour"
        />
      </Box>

      {steps.slice(0, 3).map((step, i) => (
        <StepCard
          key={step.title}
          frame={frame}
          fps={fps}
          index={i}
          step={step}
          accent={accent}
          last={i === Math.min(steps.length, 3) - 1}
        />
      ))}

      {/* CTA — the zero-commission promise is the closing line, not a fee row. */}
      <Box
        x={G}
        y={1318}
        w={CONTENT_W}
        h={132}
        style={{
          opacity: ctaIn,
          transform: `translateY(${(1 - ctaRise) * 40}px)`,
          borderRadius: 38,
          backgroundColor: accentColor(accent),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          boxShadow: `0 0 90px -22px ${accentAlpha(accent, 0.9)}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={headlineStyle(44, onAccent(accent), 700)}>{ctaLabel}</span>
          <span style={bodyStyle(24, ink(0.62), 600)}>{COMMISSION.proof}</span>
        </div>
        <ArrowIcon size={44} color={onAccent(accent)} weight={2.4} />
      </Box>

      <Box
        x={G}
        y={BOTTOM - 72}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [196, 212], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Lockup size={54} accent={accent} />
        <Handle size={22} />
      </Box>
    </AbsoluteFill>
  );
};
