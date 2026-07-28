/**
 * HeadlineSlotIsYours — "The slot is yours the moment you pay", the claim the
 * "Why it's different" band of `src/pages/HomePage.tsx` is built around, told
 * with the real slot grid rather than asserted in bullets.
 * 1920×1080 · 30fps · 270 frames (9s) · one-shot reveal.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring } from "remotion";

import {
  BRAND,
  CLAMP,
  EASE_OUT_EXPO,
  ENTER_SPRING,
  Eyebrow,
  FONT_DISPLAY,
  FONT_MONO,
  FONT_SANS,
  Grain,
  IconCheck,
  MaskedWords,
  Panel,
  StageWash,
  alpha,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   eyebrow
 *   8   headline, word-staggered 5f apart
 *  56   sub-paragraph
 *  78   slot panel arrives
 *  96   six slots land on a diagonal, 7f apart
 * 152   the 19:00 slot is selected — spring, not a fade
 * 174   the hold banner
 * 202   the three claims, 12f apart
 *
 * The selection at frame 152 is the composition's whole point, so it gets its
 * own spring character: `SELECT_SPRING` is tighter and less damped than the
 * entrance springs, which is what makes the tile read as *snapping* to the
 * player's choice rather than easing into it. Everything else settles.
 *
 * The taken slots are struck through and muted from the moment they land, so
 * the grid never lies about availability — the same rule the real component
 * follows.
 */

const SETTLED_FRAME = 236;
const SELECT_SPRING = { damping: 13, mass: 0.5, stiffness: 190 } as const;

type SlotState = "open" | "taken" | "picked";

type Slot = {
  readonly time: string;
  readonly state: SlotState;
};

const SlotTile: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly slot: Slot;
  readonly delay: number;
  readonly selectAt: number;
}> = ({ frame, fps, slot, delay, selectAt }) => {
  const enter = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay,
    durationInFrames: 26,
  });
  const select =
    slot.state === "picked"
      ? spring({
          frame,
          fps,
          config: SELECT_SPRING,
          delay: selectAt,
          durationInFrames: 26,
        })
      : 0;

  const taken = slot.state === "taken";
  const bg = taken
    ? BRAND.surface3
    : slot.state === "picked"
      ? alpha(BRAND.primary, select)
      : BRAND.surface2;
  const border = slot.state === "picked" && select > 0.5 ? BRAND.primary : BRAND.border;
  const color = taken
    ? BRAND.muted
    : slot.state === "picked"
      ? select > 0.55
        ? BRAND.primaryFg
        : BRAND.fg
      : BRAND.fg;

  return (
    <div
      style={{
        opacity: interpolate(enter, [0, 0.4], [0, 1], CLAMP),
        transform: `translateY(${interpolate(enter, [0, 1], [18, 0])}px) scale(${
          1 + 0.06 * select * (1 - select)
        })`,
        borderRadius: 16,
        border: `1px solid ${border}`,
        backgroundColor: bg,
        padding: "20px 0",
        textAlign: "center",
        fontFamily: FONT_MONO,
        fontSize: 30,
        fontWeight: slot.state === "picked" ? 600 : 400,
        fontVariantNumeric: "tabular-nums",
        color,
        textDecoration: taken ? "line-through" : "none",
        boxShadow:
          slot.state === "picked"
            ? `0 0 ${40 * select}px ${alpha(BRAND.primary, 0.35 * select)}`
            : "none",
      }}
    >
      {slot.time}
    </div>
  );
};

const Claim: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly text: string;
  readonly delay: number;
}> = ({ frame, fps, text, delay }) => (
  <div
    style={{
      ...riseStyle(frame, fps, delay, 14, 24),
      display: "flex",
      gap: 16,
      alignItems: "flex-start",
      fontFamily: FONT_SANS,
      fontSize: 26,
      lineHeight: 1.5,
      color: BRAND.fgSoft,
    }}
  >
    <span style={{ color: BRAND.primary, display: "inline-flex", marginTop: 3 }}>
      <IconCheck size={24} />
    </span>
    <span>{text}</span>
  </div>
);

export type HeadlineSlotIsYoursProps = {
  readonly eyebrow: string;
  readonly headline: readonly string[];
  readonly accentFrom: number;
  readonly subhead: string;
  readonly dayLabel: string;
  readonly durationLabel: string;
  readonly slots: readonly Slot[];
  readonly holdLabel: string;
  readonly claims: readonly string[];
};

export const headlineSlotIsYoursDefaultProps: HeadlineSlotIsYoursProps = {
  eyebrow: "Why it's different",
  headline: ["The", "slot", "is", "yours", "the", "moment", "you", "pay."],
  accentFrom: 3,
  subhead:
    "No messaging an owner and hoping. Payment and reservation happen together, so a confirmed booking means exactly that.",
  dayLabel: "Thursday, 24 July",
  durationLabel: "90 min",
  slots: [
    { time: "17:00", state: "taken" },
    { time: "18:30", state: "open" },
    { time: "19:00", state: "picked" },
    { time: "20:30", state: "open" },
    { time: "21:00", state: "taken" },
    { time: "22:00", state: "open" },
  ],
  holdLabel: "Slot held until 20:00",
  claims: [
    "Double-booking is impossible — enforced by the database, not by trust",
    "Cancellation terms shown before you pay, never discovered afterwards",
    "Card or Idram, both settled in Armenian dram",
  ],
};

export const HeadlineSlotIsYours: FC<HeadlineSlotIsYoursProps> = ({
  eyebrow,
  headline,
  accentFrom,
  subhead,
  dayLabel,
  durationLabel,
  slots,
  holdLabel,
  claims,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME);

  const panel = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 78,
    durationInFrames: 32,
  });
  const hold = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 174,
    durationInFrames: 28,
  });

  /** One-shot: the confirmation glow, clamped back to 0 before the tail. */
  const flash = interpolate(frame, [152, 168, 200], [0, 0.28, 0], {
    ...CLAMP,
    easing: EASE_OUT_EXPO,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} tint={BRAND.primary} />
      </Sequence>

      <AbsoluteFill
        style={{
          padding: "0 120px",
          flexDirection: "row",
          alignItems: "center",
          gap: 88,
        }}
      >
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <Sequence name="Eyebrow" layout="none">
            <div style={riseStyle(frame, fps, 0, 14, 24)}>
              <Eyebrow>{eyebrow}</Eyebrow>
            </div>
          </Sequence>

          <Sequence name="Headline" layout="none">
            <div
              style={{
                marginTop: 24,
                maxWidth: 820,
                fontFamily: FONT_DISPLAY,
                fontSize: 84,
                fontWeight: 700,
                letterSpacing: "-0.033em",
                lineHeight: 1.04,
                color: BRAND.fg,
              }}
            >
              <MaskedWords
                frame={frame}
                fps={fps}
                words={headline}
                delay={8}
                stagger={5}
                staggerCap={8}
                accentFrom={accentFrom}
              />
            </div>
          </Sequence>

          <Sequence name="Subhead" layout="none">
            <div
              style={{
                ...riseStyle(frame, fps, 56, 20),
                marginTop: 28,
                maxWidth: 660,
                fontFamily: FONT_SANS,
                fontSize: 27,
                lineHeight: 1.58,
                color: BRAND.fgSoft,
              }}
            >
              {subhead}
            </div>
          </Sequence>

          <Sequence name="Claims" layout="none">
            <div
              style={{
                marginTop: 40,
                display: "flex",
                flexDirection: "column",
                gap: 18,
                maxWidth: 680,
              }}
            >
              {claims.map((claim, i) => (
                <Claim
                  key={claim}
                  frame={frame}
                  fps={fps}
                  text={claim}
                  delay={202 + i * 12}
                />
              ))}
            </div>
          </Sequence>
        </div>

        <Sequence name="Slot panel" layout="none">
          <div
            style={{
              width: 660,
              flexShrink: 0,
              opacity: interpolate(panel, [0, 0.4], [0, 1], CLAMP),
              transform: `translateY(${interpolate(panel, [0, 1], [42, 0])}px)`,
            }}
          >
            <Panel padding={44} radius={32}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 30,
                    fontWeight: 600,
                    color: BRAND.fg,
                  }}
                >
                  {dayLabel}
                </span>
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 22,
                    fontVariantNumeric: "tabular-nums",
                    color: BRAND.muted,
                  }}
                >
                  {durationLabel}
                </span>
              </div>

              <div
                style={{
                  marginTop: 32,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 14,
                }}
              >
                {slots.map((slot, i) => (
                  <SlotTile
                    key={slot.time}
                    frame={frame}
                    fps={fps}
                    slot={slot}
                    delay={96 + i * 7}
                    selectAt={152}
                  />
                ))}
              </div>

              <div
                style={{
                  marginTop: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  padding: "20px 0",
                  borderRadius: 18,
                  border: `1px solid ${alpha(BRAND.primary, 0.25 + flash)}`,
                  backgroundColor: alpha(BRAND.primary, 0.1 + flash * 0.4),
                  color: BRAND.primary,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 26,
                  fontWeight: 600,
                  opacity: interpolate(hold, [0, 0.35], [0, 1], CLAMP),
                  transform: `translateY(${interpolate(hold, [0, 1], [14, 0])}px)`,
                }}
              >
                <IconCheck size={24} />
                {holdLabel}
              </div>
            </Panel>
          </div>
        </Sequence>
      </AbsoluteFill>

      <Sequence name="Grain">
        <Grain frame={frame} period={period} scale={scale} />
      </Sequence>
    </AbsoluteFill>
  );
};
