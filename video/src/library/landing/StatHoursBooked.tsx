/**
 * StatHoursBooked — total court hours booked through SportsBnB, as a square
 * stat card. Pairs with StatVenuesListed and StatCitiesCovered in the proof
 * strip under the "How it works" band of `src/pages/HomePage.tsx`.
 * 1080×1080 · 60fps · 360 frames (6s) · one-shot count-up.
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
  IconCalendar,
  Panel,
  SETTLE_SPRING,
  StageWash,
  alpha,
  groupNumber,
  riseStyle,
  useCountUp,
  useSceneFrame,
} from "./shared";

/* ── Why the bars and the number are one motion ───────────────────────────
 * The headline figure counts on an overdamped spring (monotonic, exact at
 * `delay + duration` thanks to `durationInFrames`). Each weekday bar then
 * grows on its *own* overdamped spring, staggered 5 frames apart, and the
 * figure printed above the bars is derived from the same springs — so the
 * chart can never show a distribution that does not add up to the headline.
 *
 * Overdamped throughout, on purpose: a bar chart that bounces past its value
 * and settles back misreports the data for ~8 frames, and a marketing number
 * that overshoots is the one kind of animation bug a viewer actually notices.
 * The only underdamped spring in the file is the card's own entrance, where
 * overshoot is expressive rather than informational.
 *
 * ── Stagger ───────────────────────────────────────────────────────────────
 * eyebrow 0 → numeral 18 → bars 70 (+5 each) → peak callout 178 → footnote 214.
 */

const SETTLED_FRAME = 300;

type Day = {
  readonly label: string;
  /** Share of the week's hours, 0…1. */
  readonly share: number;
};

const WeekBars: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly days: readonly Day[];
  readonly startAt: number;
  readonly peakIndex: number;
}> = ({ frame, fps, days, startAt, peakIndex }) => {
  let max = 0;
  for (let i = 0; i < days.length; i += 1) {
    max = Math.max(max, days[i].share);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 16,
        height: 300,
      }}
    >
      {days.map((day, i) => {
        const p = spring({
          frame,
          fps,
          config: SETTLE_SPRING,
          delay: startAt + i * 5,
          durationInFrames: 34,
        });
        const peak = i === peakIndex;
        const h = interpolate(p, [0, 1], [0, (day.share / max) * 100], CLAMP);

        return (
          <div
            key={day.label}
            style={{
              flex: "1 1 0",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${h}%`,
                borderRadius: 12,
                background: peak
                  ? `linear-gradient(to top, ${alpha(BRAND.primary, 0.35)} 0%, ${
                      BRAND.primary
                    } 100%)`
                  : `linear-gradient(to top, ${alpha(BRAND.cyan, 0.18)} 0%, ${alpha(
                      BRAND.cyan,
                      0.62,
                    )} 100%)`,
                boxShadow: peak
                  ? `0 0 ${34 * p}px ${alpha(BRAND.primary, 0.32 * p)}`
                  : "none",
              }}
            />
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 22,
                fontVariantNumeric: "tabular-nums",
                color: peak ? BRAND.primary : BRAND.muted,
              }}
            >
              {day.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export type StatHoursBookedProps = {
  readonly eyebrow: string;
  readonly value: number;
  readonly unit: string;
  readonly label: string;
  readonly days: readonly Day[];
  /** Which bar is called out. Index into `days`. */
  readonly peakIndex: number;
  readonly peakCallout: string;
  readonly footnote: string;
};

export const statHoursBookedDefaultProps: StatHoursBookedProps = {
  eyebrow: "Hours booked",
  value: 41200,
  unit: "hours",
  label: "of court time booked through SportsBnB",
  days: [
    { label: "Mon", share: 0.09 },
    { label: "Tue", share: 0.12 },
    { label: "Wed", share: 0.14 },
    { label: "Thu", share: 0.17 },
    { label: "Fri", share: 0.19 },
    { label: "Sat", share: 0.16 },
    { label: "Sun", share: 0.13 },
  ],
  peakIndex: 4,
  peakCallout: "Friday evening is the busiest slot of the week",
  footnote: "Every hour paid in full to the venue — SportsBnB takes no commission",
};

export const StatHoursBooked: FC<StatHoursBookedProps> = ({
  eyebrow,
  value,
  unit,
  label,
  days,
  peakIndex,
  peakCallout,
  footnote,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME, 1080);
  const { shown } = useCountUp(frame, fps, value, 18, 130);

  const numeralEnter = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 12,
    durationInFrames: 30,
  });

  /** One-shot land flash on the card edge, back to 0 long before the tail. */
  const land = interpolate(frame, [148, 166, 208], [0, 0.28, 0], {
    ...CLAMP,
    easing: EASE_OUT_EXPO,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} tint={BRAND.cyan} />
      </Sequence>

      <AbsoluteFill style={{ padding: 64 }}>
        <Panel
          padding={56}
          radius={40}
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderColor: alpha(BRAND.cyan, 0.12 + land * 0.5),
          }}
        >
          <Sequence name="Header" layout="none">
            <div
              style={{
                ...riseStyle(frame, fps, 0, 14, 24),
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <span style={{ color: BRAND.cyan, display: "inline-flex" }}>
                <IconCalendar size={28} />
              </span>
              <Eyebrow size={22} color={BRAND.cyan}>
                {eyebrow}
              </Eyebrow>
            </div>
          </Sequence>

          <Sequence name="Numeral" layout="none">
            <div
              style={{
                opacity: interpolate(numeralEnter, [0, 0.4], [0, 1], CLAMP),
                transform: `translateY(${interpolate(numeralEnter, [0, 1], [30, 0])}px)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 20,
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  letterSpacing: "-0.045em",
                  color: BRAND.fg,
                  lineHeight: 0.92,
                }}
              >
                <span
                  style={{
                    fontSize: 196,
                    fontVariantNumeric: "tabular-nums",
                    textShadow: `0 0 ${60 * land}px ${alpha(BRAND.cyan, land)}`,
                  }}
                >
                  {groupNumber(shown)}
                </span>
                <span style={{ fontSize: 66, color: BRAND.cyan, fontWeight: 600 }}>
                  {unit}
                </span>
              </div>
              <div
                style={{
                  marginTop: 16,
                  maxWidth: 640,
                  fontFamily: FONT_SANS,
                  fontSize: 32,
                  lineHeight: 1.4,
                  color: BRAND.fgSoft,
                }}
              >
                {label}
              </div>
            </div>
          </Sequence>

          <Sequence name="Week bars" layout="none">
            <WeekBars
              frame={frame}
              fps={fps}
              days={days}
              startAt={70}
              peakIndex={peakIndex}
            />
          </Sequence>

          <Sequence name="Peak callout" layout="none">
            <div
              style={{
                ...riseStyle(frame, fps, 178, 12, 26),
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "18px 24px",
                borderRadius: 16,
                border: `1px solid ${alpha(BRAND.primary, 0.24)}`,
                backgroundColor: alpha(BRAND.primary, 0.09),
                fontFamily: FONT_SANS,
                fontSize: 24,
                color: BRAND.primary,
              }}
            >
              {peakCallout}
            </div>
          </Sequence>

          <Sequence name="Footnote" layout="none">
            <div
              style={{
                ...riseStyle(frame, fps, 214, 12, 26),
                fontFamily: FONT_SANS,
                fontSize: 22,
                lineHeight: 1.45,
                color: BRAND.muted,
              }}
            >
              {footnote}
            </div>
          </Sequence>
        </Panel>
      </AbsoluteFill>

      <Sequence name="Grain">
        <Grain frame={frame} period={period} scale={scale} opacity={0.045} />
      </Sequence>
    </AbsoluteFill>
  );
};
