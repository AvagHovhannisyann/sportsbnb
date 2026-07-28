/**
 * ValuePropLiveAvailability — "Availability is live, not a guess." The claim
 * behind the hero's Live-availability badge and step two of the "How it works"
 * band in `src/pages/HomePage.tsx`.
 * 1920×1080 · 30fps · 240 frames (8s) · one-shot reveal.
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
  IconBolt,
  IconChart,
  IconShield,
  LivePill,
  MaskedWords,
  Panel,
  StageWash,
  TAU,
  alpha,
  loopT,
  pad2,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   live pill
 *  12   headline
 *  56   sub-paragraph
 *  80   the three proof panels arrive 14f apart
 * 106   the availability strip fills, column by column, 3f apart
 * 168   the "updated Xs ago" ticker starts
 *
 * ── The ticker ────────────────────────────────────────────────────────────
 * The seconds counter is the one thing here that is *deliberately* linear:
 * clock time is linear, and springing it would be a lie about what the number
 * means. `Math.floor` on an `interpolate` gives a clean 1Hz tick without any
 * per-frame state.
 *
 * ── The pulse on the strip ────────────────────────────────────────────────
 * The strip's shimmer rides a full sine period over `pulsePeriod` frames via a
 * modulo cycle, so it is continuous if this composition is played on repeat —
 * it is not a seamless-loop composition (the headline reveal is one-way), but
 * the ambient part of it does not have to be the reason for that.
 */

const SETTLED_FRAME = 212;

type Column = {
  /** 0 = fully booked, 1 = wide open. */
  readonly load: number;
  readonly label: string;
};

const AvailabilityStrip: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly columns: readonly Column[];
  readonly startAt: number;
  readonly pulsePeriod: number;
}> = ({ frame, fps, columns, startAt, pulsePeriod }) => {
  /** Modulo cycle: continuous across repeats, no accumulating drift. */
  const t = loopT(frame, pulsePeriod);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 12,
        height: 220,
      }}
    >
      {columns.map((col, i) => {
        const p = spring({
          frame,
          fps,
          config: { damping: 200, mass: 1, stiffness: 110 },
          delay: startAt + i * 3,
          durationInFrames: 30,
        });
        const shimmer = 0.5 + 0.5 * Math.sin(TAU * t - i * 0.34);
        const h = interpolate(p, [0, 1], [0, col.load * 100], CLAMP);
        const hot = col.load > 0.72;

        return (
          <div
            key={col.label}
            style={{
              flex: "1 1 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              height: "100%",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${h}%`,
                borderRadius: 8,
                background: `linear-gradient(to top, ${alpha(
                  hot ? BRAND.primary : BRAND.cyan,
                  0.28,
                )} 0%, ${alpha(
                  hot ? BRAND.primary : BRAND.cyan,
                  interpolate(shimmer, [0, 1], [0.55, 0.85]),
                )} 100%)`,
              }}
            />
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 18,
                fontVariantNumeric: "tabular-nums",
                color: BRAND.muted,
              }}
            >
              {col.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const ProofPanel: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly delay: number;
  readonly title: string;
  readonly body: string;
  readonly icon: "bolt" | "shield" | "chart";
  readonly tint: string;
}> = ({ frame, fps, delay, title, body, icon, tint }) => {
  const p = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay,
    durationInFrames: 30,
  });

  return (
    <div
      style={{
        flex: "1 1 0",
        opacity: interpolate(p, [0, 0.4], [0, 1], CLAMP),
        transform: `translateY(${interpolate(p, [0, 1], [32, 0])}px)`,
      }}
    >
      <Panel padding={34} radius={26} style={{ height: "100%" }}>
        <div style={{ color: tint, display: "inline-flex" }}>
          {icon === "bolt" ? (
            <IconBolt size={34} />
          ) : icon === "shield" ? (
            <IconShield size={34} />
          ) : (
            <IconChart size={34} />
          )}
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: FONT_DISPLAY,
            fontSize: 30,
            fontWeight: 600,
            color: BRAND.fg,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: FONT_SANS,
            fontSize: 23,
            lineHeight: 1.5,
            color: BRAND.fgSoft,
          }}
        >
          {body}
        </div>
      </Panel>
    </div>
  );
};

export type ValuePropLiveAvailabilityProps = {
  readonly eyebrow: string;
  readonly headline: readonly string[];
  readonly accentFrom: number;
  readonly subhead: string;
  readonly columns: readonly Column[];
  readonly stripCaption: string;
  readonly panels: readonly {
    readonly title: string;
    readonly body: string;
    readonly icon: "bolt" | "shield" | "chart";
  }[];
  /** Frames per shimmer cycle on the availability strip. */
  readonly pulsePeriod: number;
};

export const valuePropLiveAvailabilityDefaultProps: ValuePropLiveAvailabilityProps = {
  eyebrow: "Live availability",
  headline: ["Availability", "is", "live,", "not", "a", "guess."],
  accentFrom: 3,
  subhead:
    "The slot you tap is the slot you get — held for twenty minutes while you pay, and gone from every other screen the second it is yours.",
  columns: [
    { load: 0.32, label: "16" },
    { load: 0.54, label: "17" },
    { load: 0.71, label: "18" },
    { load: 0.88, label: "19" },
    { load: 0.95, label: "20" },
    { load: 0.79, label: "21" },
    { load: 0.58, label: "22" },
    { load: 0.34, label: "23" },
  ],
  stripCaption: "Tonight across Yerevan",
  panels: [
    {
      title: "Instant",
      body: "Confirmed in seconds, not after a phone call the next morning.",
      icon: "bolt",
    },
    {
      title: "Enforced",
      body: "Double-booking is impossible — the database, not trust, guarantees it.",
      icon: "shield",
    },
    {
      title: "Honest",
      body: "Real photos, the actual price, and no fee bolted on at checkout.",
      icon: "chart",
    },
  ],
  pulsePeriod: 60,
};

export const ValuePropLiveAvailability: FC<ValuePropLiveAvailabilityProps> = ({
  eyebrow,
  headline,
  accentFrom,
  subhead,
  columns,
  stripCaption,
  panels,
  pulsePeriod,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME);

  const strip = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 96,
    durationInFrames: 32,
  });

  /**
   * Linear on purpose: clock time is linear. Floor gives a clean 1Hz tick with
   * no per-frame state, which a render out of order could not carry anyway.
   */
  const secondsAgo = Math.floor(
    interpolate(frame, [168, 168 + fps * 8], [1, 9], CLAMP),
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} tint={BRAND.cyan} />
      </Sequence>

      <AbsoluteFill style={{ padding: "88px 120px", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 72 }}>
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <Sequence name="Live pill" layout="none">
              <div style={riseStyle(frame, fps, 0, 16, 26)}>
                <LivePill frame={frame} label={eyebrow} />
              </div>
            </Sequence>

            <Sequence name="Headline" layout="none">
              <div
                style={{
                  marginTop: 30,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 82,
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
                  delay={12}
                  stagger={5}
                  accentFrom={accentFrom}
                />
              </div>
            </Sequence>

            <Sequence name="Subhead" layout="none">
              <div
                style={{
                  ...riseStyle(frame, fps, 56, 20),
                  marginTop: 26,
                  maxWidth: 620,
                  fontFamily: FONT_SANS,
                  fontSize: 27,
                  lineHeight: 1.58,
                  color: BRAND.fgSoft,
                }}
              >
                {subhead}
              </div>
            </Sequence>
          </div>

          <Sequence name="Availability strip" layout="none">
            <div
              style={{
                width: 780,
                flexShrink: 0,
                opacity: interpolate(strip, [0, 0.4], [0, 1], CLAMP),
                transform: `translateY(${interpolate(strip, [0, 1], [36, 0])}px)`,
              }}
            >
              <Panel padding={38} radius={30}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 28,
                  }}
                >
                  <Eyebrow size={18} color={BRAND.muted}>
                    {stripCaption}
                  </Eyebrow>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 19,
                      fontVariantNumeric: "tabular-nums",
                      color: BRAND.primary,
                      opacity: interpolate(frame, [168, 182], [0, 1], CLAMP),
                    }}
                  >
                    updated {pad2(secondsAgo)}s ago
                  </span>
                </div>
                <AvailabilityStrip
                  frame={frame}
                  fps={fps}
                  columns={columns}
                  startAt={106}
                  pulsePeriod={pulsePeriod}
                />
              </Panel>
            </div>
          </Sequence>
        </div>

        <Sequence name="Proof panels" layout="none">
          <div style={{ marginTop: 72, display: "flex", gap: 26 }}>
            {panels.map((panel, i) => (
              <ProofPanel
                key={panel.title}
                frame={frame}
                fps={fps}
                delay={80 + i * 14}
                title={panel.title}
                body={panel.body}
                icon={panel.icon}
                tint={
                  i === 0 ? BRAND.primary : i === 1 ? BRAND.cyan : BRAND.violet
                }
              />
            ))}
          </div>
        </Sequence>
      </AbsoluteFill>

      <Sequence name="Sheen">
        {/*
          A single specular pass across the whole frame once the layout has
          landed. One-shot and clamped back to 0 at both ends, so it cannot
          leave a bright edge parked on the last frame.
        */}
        <AbsoluteFill
          style={{
            background: `linear-gradient(102deg, transparent 40%, ${alpha(
              BRAND.fg,
              0.05,
            )} 50%, transparent 60%)`,
            transform: `translateX(${interpolate(
              frame,
              [150, 210],
              [-120, 120],
              { ...CLAMP, easing: EASE_OUT_EXPO },
            )}%)`,
            opacity: interpolate(frame, [150, 166, 196, 210], [0, 1, 1, 0], CLAMP),
          }}
        />
      </Sequence>

      <Sequence name="Grain">
        <Grain frame={frame} period={period} scale={scale} />
      </Sequence>
    </AbsoluteFill>
  );
};
