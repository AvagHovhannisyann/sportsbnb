/**
 * TestimonialOwnerCard — a venue owner's words, with the numbers behind them.
 * Runs in the inverted "For venue owners" band of `src/pages/HomePage.tsx` and
 * on `/for-owners`.
 * 1080×1350 · 30fps · 300 frames (10s) · one-shot reveal.
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
  IconQuote,
  IconWallet,
  Meter,
  Panel,
  SETTLE_SPRING,
  StageWash,
  alpha,
  groupNumber,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   card arrives
 *  14   eyebrow + quote mark
 *  28   the quote, clause by clause (16f apart)
 * 120   attribution
 * 156   the two proof metrics count up, 18f apart
 * 214   the zero-commission line
 *
 * ── Why the metrics count on an overdamped spring ────────────────────────
 * These are the owner's own numbers, and a figure that overshoots its value
 * and settles back has, for about eight frames, told the viewer something
 * false about somebody's business. `SETTLE_SPRING` is monotonic; the count
 * only climbs. `durationInFrames` makes the last digit land on an exact frame
 * rather than asymptotically, so `Math.round(p · value)` is precisely `value`
 * from that frame on.
 *
 * ── Commercial accuracy ───────────────────────────────────────────────────
 * The takings line and the payout line are the same number. SportsBnB charges
 * **zero commission**: the owner keeps 100% of the price they set. That is the
 * whole reason this card ends where it ends.
 */

const SETTLED_FRAME = 268;

const Clause: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly text: string;
  readonly delay: number;
  readonly accent: boolean;
}> = ({ frame, fps, text, delay, accent }) => {
  const p = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay,
    durationInFrames: 28,
  });
  return (
    <span
      style={{
        display: "inline",
        opacity: interpolate(p, [0, 0.45], [0, 1], CLAMP),
        color: accent ? BRAND.primary : BRAND.fg,
      }}
    >
      {text}{" "}
    </span>
  );
};

const Metric: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly label: string;
  readonly value: number;
  readonly prefix: string;
  readonly suffix: string;
  readonly delay: number;
  readonly tint: string;
  /** Denominator for the meter; omit for a bare figure. */
  readonly outOf: number | null;
}> = ({ frame, fps, label, value, prefix, suffix, delay, tint, outOf }) => {
  const enter = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay,
    durationInFrames: 28,
  });
  const count = spring({
    frame,
    fps,
    config: SETTLE_SPRING,
    delay: delay + 4,
    durationInFrames: 40,
  });

  return (
    <div
      style={{
        flex: "1 1 0",
        padding: 30,
        borderRadius: 24,
        backgroundColor: alpha(BRAND.fg, 0.04),
        border: `1px solid ${BRAND.border}`,
        opacity: interpolate(enter, [0, 0.4], [0, 1], CLAMP),
        transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
      }}
    >
      <Eyebrow size={16} color={BRAND.muted}>
        {label}
      </Eyebrow>
      <div
        style={{
          marginTop: 14,
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: tint,
        }}
      >
        {prefix.length > 0 ? (
          <span style={{ fontSize: 26, color: BRAND.fgSoft }}>{prefix}</span>
        ) : null}
        <span style={{ fontSize: 62, fontVariantNumeric: "tabular-nums" }}>
          {groupNumber(count * value)}
        </span>
        {suffix.length > 0 ? <span style={{ fontSize: 34 }}>{suffix}</span> : null}
      </div>
      {outOf !== null ? (
        <div style={{ marginTop: 18 }}>
          <Meter progress={(count * value) / outOf} tint={tint} height={6} />
        </div>
      ) : null}
    </div>
  );
};

export type TestimonialOwnerCardProps = {
  readonly eyebrow: string;
  readonly clauses: readonly string[];
  readonly accentClauses: readonly number[];
  readonly name: string;
  readonly initials: string;
  readonly venue: string;
  readonly city: string;
  readonly currency: string;
  /** Weekly takings — and, since commission is zero, the payout too. */
  readonly weeklyTakings: number;
  /** Occupancy of the evening block, as a percentage. */
  readonly occupancyPercent: number;
  readonly commissionLine: string;
};

export const testimonialOwnerCardDefaultProps: TestimonialOwnerCardProps = {
  eyebrow: "Venue owners",
  clauses: [
    "Tuesday and Wednesday evenings used to sit empty",
    "because nobody knew we had the hall free.",
    "We listed in an afternoon,",
    "and we keep every dram of what we charge.",
  ],
  accentClauses: [3],
  name: "Gohar Melkonyan",
  initials: "GM",
  venue: "Nairi Sports Hall",
  city: "Arabkir, Yerevan",
  currency: "AMD",
  weeklyTakings: 276000,
  occupancyPercent: 62,
  commissionLine: "SportsBnB takes 0% — the payout is the whole of the takings",
};

export const TestimonialOwnerCard: FC<TestimonialOwnerCardProps> = ({
  eyebrow,
  clauses,
  accentClauses,
  name,
  initials,
  venue,
  city,
  currency,
  weeklyTakings,
  occupancyPercent,
  commissionLine,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME, 1080);

  const card = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 0,
    durationInFrames: 34,
  });
  const attribution = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 120,
    durationInFrames: 30,
  });

  /** One-shot glow on the commission line, clamped back to 0 before the tail. */
  const flash = interpolate(frame, [214, 232, 262], [0, 0.28, 0], {
    ...CLAMP,
    easing: EASE_OUT_EXPO,
  });

  const isAccent = (index: number): boolean => {
    for (let i = 0; i < accentClauses.length; i += 1) {
      if (accentClauses[i] === index) {
        return true;
      }
    }
    return false;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} tint={BRAND.cyan} />
      </Sequence>

      <AbsoluteFill style={{ padding: 56 }}>
        <div
          style={{
            height: "100%",
            opacity: interpolate(card, [0, 0.4], [0, 1], CLAMP),
            transform: `translateY(${interpolate(card, [0, 1], [40, 0])}px)`,
          }}
        >
          <Panel
            padding={52}
            radius={40}
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <Sequence name="Header" layout="none">
                <div
                  style={{
                    ...riseStyle(frame, fps, 14, 12, 22),
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Eyebrow size={22} color={BRAND.cyan}>
                    {eyebrow}
                  </Eyebrow>
                  <span
                    style={{
                      display: "inline-flex",
                      color: alpha(BRAND.cyan, 0.3),
                      opacity: interpolate(frame, [18, 36], [0, 1], CLAMP),
                    }}
                  >
                    <IconQuote size={64} />
                  </span>
                </div>
              </Sequence>

              <Sequence name="Quote" layout="none">
                <div
                  style={{
                    marginTop: 36,
                    fontFamily: FONT_DISPLAY,
                    fontSize: 48,
                    fontWeight: 600,
                    lineHeight: 1.28,
                    letterSpacing: "-0.02em",
                    color: BRAND.fg,
                  }}
                >
                  {clauses.map((clause, i) => (
                    <Clause
                      key={clause}
                      frame={frame}
                      fps={fps}
                      text={clause}
                      delay={28 + i * 16}
                      accent={isAccent(i)}
                    />
                  ))}
                </div>
              </Sequence>

              <Sequence name="Attribution" layout="none">
                <div
                  style={{
                    marginTop: 40,
                    display: "flex",
                    alignItems: "center",
                    gap: 22,
                    opacity: interpolate(attribution, [0, 0.4], [0, 1], CLAMP),
                    transform: `translateY(${interpolate(
                      attribution,
                      [0, 1],
                      [18, 0],
                    )}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 84,
                      height: 84,
                      borderRadius: 999,
                      backgroundColor: alpha(BRAND.cyan, 0.16),
                      border: `1px solid ${alpha(BRAND.cyan, 0.34)}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: FONT_DISPLAY,
                      fontSize: 30,
                      fontWeight: 600,
                      color: BRAND.cyan,
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: 32,
                        fontWeight: 600,
                        color: BRAND.fg,
                      }}
                    >
                      {name}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontFamily: FONT_SANS,
                        fontSize: 23,
                        color: BRAND.muted,
                      }}
                    >
                      {venue} · {city}
                    </div>
                  </div>
                </div>
              </Sequence>
            </div>

            <div>
              <Sequence name="Metrics" layout="none">
                <div style={{ display: "flex", gap: 20 }}>
                  <Metric
                    frame={frame}
                    fps={fps}
                    label="Weekly payout"
                    value={weeklyTakings}
                    prefix={currency}
                    suffix=""
                    delay={156}
                    tint={BRAND.primary}
                    outOf={null}
                  />
                  <Metric
                    frame={frame}
                    fps={fps}
                    label="Evenings filled"
                    value={occupancyPercent}
                    prefix=""
                    suffix="%"
                    delay={174}
                    tint={BRAND.cyan}
                    outOf={100}
                  />
                </div>
              </Sequence>

              <Sequence name="Commission line" layout="none">
                <div
                  style={{
                    ...riseStyle(frame, fps, 214, 14, 26),
                    marginTop: 26,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "22px 26px",
                    borderRadius: 20,
                    border: `1px solid ${alpha(BRAND.primary, 0.24 + flash)}`,
                    backgroundColor: alpha(BRAND.primary, 0.09 + flash * 0.4),
                    fontFamily: FONT_SANS,
                    fontSize: 25,
                    color: BRAND.primary,
                  }}
                >
                  <IconWallet size={26} />
                  {commissionLine}
                </div>
              </Sequence>

              <div
                style={{
                  marginTop: 20,
                  fontFamily: FONT_MONO,
                  fontSize: 20,
                  fontVariantNumeric: "tabular-nums",
                  color: BRAND.muted,
                  opacity: interpolate(frame, [236, 252], [0, 1], CLAMP),
                }}
              >
                takings {currency} {groupNumber(weeklyTakings)} · commission{" "}
                {currency} 0 · payout {currency} {groupNumber(weeklyTakings)}
              </div>
            </div>
          </Panel>
        </div>
      </AbsoluteFill>

      <Sequence name="Grain">
        <Grain frame={frame} period={period} scale={scale} opacity={0.045} />
      </Sequence>
    </AbsoluteFill>
  );
};
