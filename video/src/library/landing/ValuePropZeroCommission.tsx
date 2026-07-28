/**
 * ValuePropZeroCommission — the platform's headline commercial fact, told as a
 * price breakdown that resolves to itself. Goes in the "For venue owners" band
 * of `HomePage.tsx` and at the top of `/for-owners`.
 * 1920×1080 · 30fps · 300 frames (10s) · one-shot reveal.
 *
 * ── The product fact this composition exists to state ─────────────────────
 * SportsBnB charges **zero commission**. An owner keeps 100% of the price they
 * set, and a player pays exactly the price on the listing — the checkout
 * breakdown in `HomePage.tsx` shows "Booking fee AMD 0" and a total equal to
 * the venue price for precisely this reason. Any figure in this file that
 * implies a cut (a 5% service fee, a marked-up total) would be wrong; the
 * `defaultProps` below are the real numbers.
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
  SETTLE_SPRING,
  StageWash,
  alpha,
  groupNumber,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   eyebrow
 *  10   headline, word-staggered
 *  52   sub-paragraph
 *  74   receipt panel arrives
 *  92   line 1 — venue price      (counts up)
 * 110   line 2 — platform fee     (counts up, to zero, so it just states 0)
 * 128   rule
 * 138   total                     (counts up)
 * 176   "keeps 100%" stamp lands
 * 206   the three supporting claims, 10f apart
 *
 * The counters use the **overdamped** SETTLE_SPRING: a price that overshoots
 * 12,000 to 12,340 and comes back does not read as momentum, it reads as a
 * pricing bug — on a composition whose entire subject is that the number is
 * exactly what it says. Overdamped is monotonic, and `durationInFrames` makes
 * the arrival exact rather than asymptotic, so the last digit lands on the
 * frame it is supposed to.
 *
 * The stamp is the one place a *different* spring character is right: it
 * arrives underdamped and slightly over-scaled, because it is a thing being
 * pressed onto the receipt rather than a value settling.
 */

const SETTLED_FRAME = 262;

type LineProps = {
  readonly frame: number;
  readonly fps: number;
  readonly label: string;
  readonly value: number;
  readonly delay: number;
  readonly emphasis?: boolean;
  readonly zeroTint?: boolean;
  readonly currency: string;
};

const ReceiptLine: FC<LineProps> = ({
  frame,
  fps,
  label,
  value,
  delay,
  emphasis,
  zeroTint,
  currency,
}) => {
  const enter = riseStyle(frame, fps, delay, 12, 22);
  const count = spring({
    frame,
    fps,
    config: SETTLE_SPRING,
    delay: delay + 4,
    durationInFrames: 34,
  });
  const shown = Math.round(count * value);
  const tint = zeroTint ? BRAND.primary : BRAND.fg;

  return (
    <div
      style={{
        ...enter,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        paddingTop: emphasis ? 22 : 0,
      }}
    >
      <span
        style={{
          fontFamily: emphasis ? FONT_DISPLAY : FONT_SANS,
          fontSize: emphasis ? 34 : 30,
          fontWeight: emphasis ? 600 : 400,
          color: emphasis ? BRAND.fg : BRAND.fgSoft,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: emphasis ? 42 : 32,
          fontWeight: emphasis ? 600 : 400,
          fontVariantNumeric: "tabular-nums",
          color: tint,
        }}
      >
        {currency} {groupNumber(shown)}
      </span>
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
      fontSize: 27,
      lineHeight: 1.5,
      color: BRAND.fgSoft,
    }}
  >
    <span style={{ color: BRAND.primary, display: "inline-flex", marginTop: 4 }}>
      <IconCheck size={26} />
    </span>
    <span>{text}</span>
  </div>
);

export type ValuePropZeroCommissionProps = {
  readonly eyebrow: string;
  readonly headline: readonly string[];
  /** Index from which the headline switches to `--primary`. */
  readonly accentFrom: number;
  readonly subhead: string;
  readonly currency: string;
  /** What the owner set. The player pays exactly this. */
  readonly venuePrice: number;
  /** Zero. Always zero — see the file header. */
  readonly platformFee: number;
  readonly stampLabel: string;
  readonly claims: readonly string[];
};

export const valuePropZeroCommissionDefaultProps: ValuePropZeroCommissionProps = {
  eyebrow: "For venue owners",
  headline: ["Zero", "commission.", "You", "keep", "100%."],
  accentFrom: 2,
  subhead:
    "No cut of your price, no listing fee, no monthly cost. You set the price, the player pays the price, and the whole of it is yours.",
  currency: "AMD",
  venuePrice: 12000,
  platformFee: 0,
  stampLabel: "0% commission",
  claims: [
    "Players pay exactly the price on your listing — no fee bolted on at checkout",
    "Weekly payouts, itemised booking by booking",
    "Card or Idram, both settled in Armenian dram",
  ],
};

export const ValuePropZeroCommission: FC<ValuePropZeroCommissionProps> = ({
  eyebrow,
  headline,
  accentFrom,
  subhead,
  currency,
  venuePrice,
  platformFee,
  stampLabel,
  claims,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME);

  const panel = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 74,
    durationInFrames: 34,
  });

  /** The stamp: underdamped and over-scaled, because it is pressed on. */
  const stamp = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 140 },
    delay: 176,
    durationInFrames: 30,
  });

  /** A one-shot flash under the stamp, clamped back to 0 well before the end. */
  const flash = interpolate(frame, [176, 190, 218], [0, 0.32, 0], {
    ...CLAMP,
    easing: EASE_OUT_EXPO,
  });

  /** Genuinely linear: the receipt's divider being drawn. */
  const rule = interpolate(frame, [128, 152], [0, 1], {
    ...CLAMP,
    easing: EASE_OUT_EXPO,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} />
      </Sequence>

      <AbsoluteFill
        style={{
          padding: "0 120px",
          flexDirection: "row",
          alignItems: "center",
          gap: 96,
        }}
      >
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <Sequence name="Eyebrow">
            <div style={riseStyle(frame, fps, 0, 14, 24)}>
              <Eyebrow>{eyebrow}</Eyebrow>
            </div>
          </Sequence>

          <Sequence name="Headline">
            <div
              style={{
                marginTop: 24,
                fontFamily: FONT_DISPLAY,
                fontSize: 96,
                fontWeight: 700,
                letterSpacing: "-0.035em",
                lineHeight: 1.02,
                color: BRAND.fg,
              }}
            >
              <MaskedWords
                frame={frame}
                fps={fps}
                words={headline}
                delay={10}
                stagger={5}
                accentFrom={accentFrom}
              />
            </div>
          </Sequence>

          <Sequence name="Subhead">
            <div
              style={{
                ...riseStyle(frame, fps, 52, 20),
                marginTop: 30,
                maxWidth: 640,
                fontFamily: FONT_SANS,
                fontSize: 28,
                lineHeight: 1.58,
                color: BRAND.fgSoft,
              }}
            >
              {subhead}
            </div>
          </Sequence>

          <Sequence name="Claims">
            <div
              style={{
                marginTop: 44,
                display: "flex",
                flexDirection: "column",
                gap: 20,
                maxWidth: 660,
              }}
            >
              {claims.map((claim, i) => (
                <Claim
                  key={claim}
                  frame={frame}
                  fps={fps}
                  text={claim}
                  delay={206 + i * 10}
                />
              ))}
            </div>
          </Sequence>
        </div>

        <Sequence name="Receipt">
          <div
            style={{
              width: 700,
              flexShrink: 0,
              position: "relative",
              opacity: interpolate(panel, [0, 0.4], [0, 1], CLAMP),
              transform: `translateY(${interpolate(panel, [0, 1], [40, 0])}px)`,
            }}
          >
            <Panel padding={44} radius={32}>
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 26,
                  fontWeight: 600,
                  color: BRAND.fg,
                  marginBottom: 6,
                }}
              >
                What the player pays
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 22,
                  color: BRAND.muted,
                  marginBottom: 34,
                }}
              >
                Ararat Arena · 90 min · Thursday, 19:00
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <ReceiptLine
                  frame={frame}
                  fps={fps}
                  label="Venue price"
                  value={venuePrice}
                  delay={92}
                  currency={currency}
                />
                <ReceiptLine
                  frame={frame}
                  fps={fps}
                  label="Platform fee"
                  value={platformFee}
                  delay={110}
                  zeroTint
                  currency={currency}
                />
              </div>

              <div
                style={{
                  marginTop: 26,
                  height: 1,
                  width: `${rule * 100}%`,
                  backgroundColor: BRAND.border,
                }}
              />

              <div style={{ marginTop: 4 }}>
                <ReceiptLine
                  frame={frame}
                  fps={fps}
                  label="Total"
                  value={venuePrice + platformFee}
                  delay={138}
                  emphasis
                  currency={currency}
                />
              </div>

              <div
                style={{
                  marginTop: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  padding: "20px 0",
                  borderRadius: 18,
                  border: `1px solid ${alpha(BRAND.primary, 0.25 + flash)}`,
                  backgroundColor: alpha(BRAND.primary, 0.1 + flash * 0.5),
                  color: BRAND.primary,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 27,
                  fontWeight: 600,
                  opacity: interpolate(stamp, [0, 0.3], [0, 1], CLAMP),
                  transform: `scale(${interpolate(stamp, [0, 1], [1.14, 1])})`,
                }}
              >
                <IconCheck size={26} />
                {stampLabel} · owner keeps {groupNumber(venuePrice)}
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
