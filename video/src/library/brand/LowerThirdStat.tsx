/**
 * LowerThirdStat — the metric plate: a scoreboard numeral rolling up to its
 * value beside a label and a change chip. Sits over b-roll in the owner pitch
 * and the investor cut whenever a figure is being claimed on screen, and over
 * the dashboard screen-capture in the "how hosting works" explainer.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  SPRING_ENTER,
  SPRING_POP,
  SPRING_SMOOTH,
  TRACKING_EYEBROW,
  TRACKING_TIGHTER,
  chalk,
  courtGreen,
  hairline,
  ink,
  useBrandFrame,
} from "./brandKit";

export type LowerThirdStatProps = {
  /** The number the roll lands on. */
  readonly value: number;
  /** Decimals to show. 0 keeps it a scoreboard integer. */
  readonly decimals: number;
  readonly prefix: string;
  readonly suffix: string;
  readonly label: string;
  /** Change chip, e.g. "+38% vs last season". Empty string hides it. */
  readonly delta: string;
  /** Colours the chip court-green when true, chalk when false. */
  readonly deltaPositive: boolean;
  /** Frames the number takes to roll up. */
  readonly rollDurationInFrames: number;
  readonly enterAtFrame: number;
  readonly exitAtFrame: number;
  readonly insetX: number;
  readonly insetY: number;
};

export const lowerThirdStatDefaultProps: LowerThirdStatProps = {
  value: 38400,
  decimals: 0,
  prefix: "",
  suffix: " hrs",
  label: "Booked on SportsBnB this year",
  delta: "+38% vs last season",
  deltaPositive: true,
  rollDurationInFrames: 40,
  enterAtFrame: 6,
  exitAtFrame: 145,
  insetX: 0.07,
  insetY: 0.14,
};

/** Thousands separators without `toLocaleString` — see LowerThirdVenue. */
const groupThousands = (value: string): string => {
  const negative = value.charAt(0) === "-";
  const body = negative ? value.slice(1) : value;
  const dot = body.indexOf(".");
  const whole = dot === -1 ? body : body.slice(0, dot);
  const rest = dot === -1 ? "" : body.slice(dot);
  let out = "";
  for (let i = 0; i < whole.length; i++) {
    if (i > 0 && (whole.length - i) % 3 === 0) {
      out += ",";
    }
    out += whole.charAt(i);
  }
  return `${negative ? "-" : ""}${out}${rest}`;
};

export const LowerThirdStat: FC<LowerThirdStatProps> = ({
  value,
  decimals,
  prefix,
  suffix,
  label,
  delta,
  deltaPositive,
  rollDurationInFrames,
  enterAtFrame,
  exitAtFrame,
  insetX,
  insetY,
}) => {
  const frame = useBrandFrame(0.5);
  const { fps, width, height } = useVideoConfig();

  const scale = width / 1920;
  const numberSize = height * 0.11;

  const barIn = spring({
    frame,
    fps,
    delay: enterAtFrame,
    config: SPRING_ENTER,
    durationInFrames: 20,
  });
  /**
   * The roll is critically damped on purpose: a spring that overshoots would
   * take the counter *past* the value and walk it back, which reads as a bug
   * rather than as motion.
   */
  const roll = spring({
    frame,
    fps,
    delay: enterAtFrame + 6,
    config: SPRING_SMOOTH,
    durationInFrames: rollDurationInFrames,
  });
  const labelIn = spring({
    frame,
    fps,
    delay: enterAtFrame + 14,
    config: SPRING_ENTER,
    durationInFrames: 24,
  });
  const deltaIn = spring({
    frame,
    fps,
    delay: enterAtFrame + rollDurationInFrames - 4,
    config: SPRING_POP,
    durationInFrames: 24,
  });
  const out = spring({
    frame,
    fps,
    delay: exitAtFrame,
    config: SPRING_SMOOTH,
    durationInFrames: 22,
  });
  const alive = Math.max(0, 1 - out);

  const eased = interpolate(roll, [0, 1], [0, 1], { easing: EASE_OUT_EXPO });
  const shown = groupThousands((value * eased).toFixed(Math.max(0, decimals)));

  const gate = (p: number) => ({
    overflow: "hidden" as const,
    paddingTop: numberSize * 0.1,
    paddingBottom: numberSize * 0.1,
    marginTop: -numberSize * 0.1,
    marginBottom: -numberSize * 0.1,
    opacity: Math.max(0, p - out),
  });

  return (
    <AbsoluteFill>
      <Sequence name="Stat plate" layout="none">
        <AbsoluteFill
          style={{
            alignItems: "flex-start",
            justifyContent: "flex-end",
            paddingLeft: width * insetX,
            paddingBottom: height * insetY,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: height * 0.55,
              background: `linear-gradient(to top, ${ink(0.8 * alive)} 0%, ${ink(0.4 * alive)} 46%, ${ink(0)} 100%)`,
            }}
          />

          <div style={{ position: "relative", display: "flex", alignItems: "stretch" }}>
            <div
              style={{
                width: Math.max(3, 7 * scale),
                borderRadius: 999,
                backgroundColor: BRAND.primary,
                transformOrigin: "bottom center",
                transform: `scaleY(${Math.max(0, barIn - out)})`,
                boxShadow: `0 0 ${30 * scale}px ${courtGreen(0.6 * Math.max(0, barIn - out))}`,
              }}
            />

            <div style={{ marginLeft: 24 * scale }}>
              <div style={gate(barIn)}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    /** `.stat-numeral`: mono, tabular, slightly tightened. */
                    fontFamily: MONO_FONT,
                    fontVariantNumeric: "tabular-nums",
                    fontSize: numberSize,
                    fontWeight: 500,
                    letterSpacing: TRACKING_TIGHTER,
                    lineHeight: 1,
                    color: BRAND.foreground,
                    transform: `translateY(${interpolate(
                      Math.max(0, barIn - out),
                      [0, 1],
                      [numberSize * 0.6, 0],
                      { easing: EASE_OUT_EXPO },
                    )}px)`,
                    textShadow: `0 ${5 * scale}px ${24 * scale}px ${ink(0.85)}`,
                  }}
                >
                  {prefix.length > 0 ? (
                    <span style={{ color: chalk(0.6), fontSize: numberSize * 0.55 }}>{prefix}</span>
                  ) : null}
                  <span>{shown}</span>
                  {suffix.length > 0 ? (
                    <span style={{ color: BRAND.primary, fontSize: numberSize * 0.46 }}>
                      {suffix}
                    </span>
                  ) : null}
                </div>
              </div>

              <div style={gate(labelIn)}>
                <div
                  style={{
                    marginTop: numberSize * 0.12,
                    fontFamily: DISPLAY_FONT,
                    fontSize: numberSize * 0.26,
                    fontWeight: 600,
                    color: chalk(0.72),
                    transform: `translateY(${interpolate(
                      Math.max(0, labelIn - out),
                      [0, 1],
                      [numberSize * 0.34, 0],
                      { easing: EASE_OUT_EXPO },
                    )}px)`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </div>
              </div>

              {delta.length > 0 ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10 * scale,
                    marginTop: numberSize * 0.24,
                    paddingLeft: 16 * scale,
                    paddingRight: 16 * scale,
                    paddingTop: 9 * scale,
                    paddingBottom: 9 * scale,
                    borderRadius: 999,
                    border: `1px solid ${deltaPositive ? courtGreen(0.45) : hairline(1)}`,
                    backgroundColor: deltaPositive ? BRAND.primarySoft : ink(0.6),
                    opacity: Math.max(0, deltaIn - out),
                    transform: `scale(${interpolate(Math.max(0, deltaIn - out), [0, 1], [0.84, 1])})`,
                  }}
                >
                  <span
                    style={{
                      width: 8 * scale,
                      height: 8 * scale,
                      borderRadius: "50%",
                      backgroundColor: deltaPositive ? BRAND.primary : chalk(0.5),
                    }}
                  />
                  <span
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: numberSize * 0.2,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      color: deltaPositive ? BRAND.primary : chalk(0.66),
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        letterSpacing: TRACKING_EYEBROW,
                        marginRight: `-${TRACKING_EYEBROW}`,
                      }}
                    >
                      {delta}
                    </span>
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
