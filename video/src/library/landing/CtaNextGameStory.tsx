/**
 * CtaNextGameStory — the vertical cut of the closing CTA, sized for Instagram
 * and TikTok stories: a phone-shaped booking moment that resolves into
 * "Book the court. Skip the call."
 * 1080×1920 · 30fps · 300 frames (10s) · one-shot reveal.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring } from "remotion";

import {
  BRAND,
  CLAMP,
  EASE_OUT_EXPO,
  ENTER_SPRING,
  FONT_DISPLAY,
  FONT_MONO,
  FONT_SANS,
  Grain,
  IconArrow,
  IconCheck,
  LivePill,
  MaskedWords,
  Panel,
  StageWash,
  TAU,
  alpha,
  groupNumber,
  loopT,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   live pill
 *  12   headline, word-staggered
 *  60   sub-line
 *  80   the booking card rises into frame
 * 100   its rows land, 10f apart
 * 148   the tap ripple fires from the button
 * 164   the confirmation state swaps in
 * 214   the full-width button
 * 244   the footnote
 *
 * ── The tap ripple ────────────────────────────────────────────────────────
 * A story cut has to show the *gesture*, not just the outcome, so a single
 * ripple expands from the button at frame 148. It is a one-shot
 * `interpolate()` clamped to 0 at both ends: the ring is not painted before it
 * starts or after it finishes, so it cannot leave a stray circle parked on the
 * final frame the way an un-clamped expansion would.
 *
 * ── Vertical layout ───────────────────────────────────────────────────────
 * Authored against 1080 wide, so `scale` resolves to 1 and every px value
 * survives a re-registration at 1440×2560. The safe area is respected by hand:
 * nothing load-bearing sits in the top 180px or the bottom 220px, which is
 * where a story UI puts its own chrome.
 *
 * ── Commercial accuracy ───────────────────────────────────────────────────
 * The total equals the venue price and the fee row reads zero. SportsBnB
 * charges no commission — the owner keeps 100% and the player pays exactly the
 * listed price.
 */

const SETTLED_FRAME = 272;

const Row: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly label: string;
  readonly value: string;
  readonly delay: number;
  readonly tint?: string;
  readonly emphasis?: boolean;
}> = ({ frame, fps, label, value, delay, tint, emphasis }) => (
  <div
    style={{
      ...riseStyle(frame, fps, delay, 12, 22),
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      paddingTop: emphasis ? 22 : 0,
      borderTop: emphasis ? `1px solid ${BRAND.border}` : "none",
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
        fontSize: emphasis ? 38 : 31,
        fontWeight: emphasis ? 600 : 400,
        fontVariantNumeric: "tabular-nums",
        color: tint ?? BRAND.fg,
      }}
    >
      {value}
    </span>
  </div>
);

export type CtaNextGameStoryProps = {
  readonly eyebrow: string;
  readonly headline: readonly string[];
  readonly accentFrom: number;
  readonly subline: string;
  readonly venueName: string;
  readonly slotLabel: string;
  readonly durationLabel: string;
  readonly currency: string;
  readonly venuePrice: number;
  /** Zero. See the file header. */
  readonly bookingFee: number;
  readonly confirmLabel: string;
  readonly cta: string;
  readonly footnote: string;
  /** Frames per breath of the glow behind the card. */
  readonly glowPeriod: number;
};

export const ctaNextGameStoryDefaultProps: CtaNextGameStoryProps = {
  eyebrow: "Live availability",
  headline: ["Book", "the", "court.", "Skip", "the", "call."],
  accentFrom: 3,
  subline: "Verified venues across Armenia. Confirmed in seconds.",
  venueName: "Ararat Arena",
  slotLabel: "Thursday · 19:00",
  durationLabel: "90 min",
  currency: "AMD",
  venuePrice: 12000,
  bookingFee: 0,
  confirmLabel: "Confirmed — the slot is yours",
  cta: "Get started",
  footnote: "Free to join. No card needed until you book.",
  glowPeriod: 120,
};

export const CtaNextGameStory: FC<CtaNextGameStoryProps> = ({
  eyebrow,
  headline,
  accentFrom,
  subline,
  venueName,
  slotLabel,
  durationLabel,
  currency,
  venuePrice,
  bookingFee,
  confirmLabel,
  cta,
  footnote,
  glowPeriod,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME, 1080);

  /** Modulo cycle, full sine period — continuous if the story is looped. */
  const breath = 0.5 + 0.5 * Math.sin(TAU * loopT(frame, glowPeriod));

  const card = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 80,
    durationInFrames: 34,
  });
  const confirm = spring({
    frame,
    fps,
    config: { damping: 13, mass: 0.6, stiffness: 170 },
    delay: 164,
    durationInFrames: 28,
  });
  const button = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 214,
    durationInFrames: 30,
  });

  /** One-shot, clamped both ends: no stray ring on the final frame. */
  const ripple = interpolate(frame, [148, 182], [0, 1], CLAMP);
  const rippleAlive = frame >= 148 && frame <= 182;

  const arrowShift = interpolate(frame, [244, 258, 274], [0, 8, 0], {
    ...CLAMP,
    easing: EASE_OUT_EXPO,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} />
      </Sequence>

      <Sequence name="Glow">
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 70% 34% at 50% 56%, ${alpha(
              BRAND.primary,
              interpolate(breath, [0, 1], [0.08, 0.13]),
            )} 0%, transparent 68%)`,
          }}
        />
      </Sequence>

      <AbsoluteFill
        style={{
          padding: "196px 72px 236px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ width: "100%" }}>
          <Sequence name="Pill">
            <div
              style={{
                ...riseStyle(frame, fps, 0, 16, 26),
                display: "flex",
                justifyContent: "center",
              }}
            >
              <LivePill frame={frame} label={eyebrow} fontSize={22} />
            </div>
          </Sequence>

          <Sequence name="Headline">
            <div
              style={{
                marginTop: 36,
                textAlign: "center",
                fontFamily: FONT_DISPLAY,
                fontSize: 106,
                fontWeight: 700,
                letterSpacing: "-0.045em",
                lineHeight: 0.98,
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
                style={{ justifyContent: "center" }}
              />
            </div>
          </Sequence>

          <Sequence name="Subline">
            <div
              style={{
                ...riseStyle(frame, fps, 60, 18),
                marginTop: 28,
                textAlign: "center",
                fontFamily: FONT_SANS,
                fontSize: 30,
                lineHeight: 1.5,
                color: BRAND.fgSoft,
              }}
            >
              {subline}
            </div>
          </Sequence>
        </div>

        <Sequence name="Booking card">
          <div
            style={{
              width: "100%",
              position: "relative",
              opacity: interpolate(card, [0, 0.4], [0, 1], CLAMP),
              transform: `translateY(${interpolate(card, [0, 1], [56, 0])}px)`,
            }}
          >
            <Panel padding={48} radius={38}>
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 42,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: BRAND.fg,
                }}
              >
                {venueName}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  color: BRAND.muted,
                  marginBottom: 40,
                }}
              >
                {slotLabel} · {durationLabel}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <Row
                  frame={frame}
                  fps={fps}
                  label={durationLabel}
                  value={`${currency} ${groupNumber(venuePrice)}`}
                  delay={100}
                />
                <Row
                  frame={frame}
                  fps={fps}
                  label="Booking fee"
                  value={`${currency} ${groupNumber(bookingFee)}`}
                  delay={110}
                  tint={BRAND.primary}
                />
                <Row
                  frame={frame}
                  fps={fps}
                  label="Total"
                  value={`${currency} ${groupNumber(venuePrice + bookingFee)}`}
                  delay={120}
                  emphasis
                />
              </div>

              <div
                style={{
                  position: "relative",
                  marginTop: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  height: 92,
                  borderRadius: 22,
                  border: `1px solid ${alpha(BRAND.primary, 0.3)}`,
                  backgroundColor: alpha(BRAND.primary, 0.12),
                  color: BRAND.primary,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 30,
                  fontWeight: 600,
                  overflow: "hidden",
                }}
              >
                {rippleAlive ? (
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: 120,
                      height: 120,
                      marginLeft: -60,
                      marginTop: -60,
                      borderRadius: 999,
                      border: `2px solid ${BRAND.primary}`,
                      opacity: interpolate(ripple, [0, 1], [0.55, 0], CLAMP),
                      transform: `scale(${interpolate(ripple, [0, 1], [0.4, 7], {
                        easing: EASE_OUT_EXPO,
                      })})`,
                    }}
                  />
                ) : null}
                <span
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 16,
                    opacity: confirm,
                    transform: `scale(${interpolate(confirm, [0, 1], [0.86, 1])})`,
                  }}
                >
                  <IconCheck size={30} />
                  {confirmLabel}
                </span>
                <span
                  style={{
                    position: "absolute",
                    opacity: 1 - confirm,
                    fontFamily: FONT_DISPLAY,
                    fontSize: 30,
                    fontWeight: 600,
                  }}
                >
                  Pay and confirm
                </span>
              </div>
            </Panel>
          </div>
        </Sequence>

        <div style={{ width: "100%" }}>
          <Sequence name="Button">
            <div
              style={{
                opacity: interpolate(button, [0, 0.4], [0, 1], CLAMP),
                transform: `translateY(${interpolate(button, [0, 1], [28, 0])}px)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                height: 108,
                borderRadius: 26,
                backgroundColor: BRAND.primary,
                color: BRAND.primaryFg,
                fontFamily: FONT_DISPLAY,
                fontSize: 34,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                boxShadow: `0 24px 50px -22px ${alpha(BRAND.primary, 0.8)}`,
              }}
            >
              {cta}
              <span
                style={{
                  display: "inline-flex",
                  transform: `translateX(${arrowShift}px)`,
                }}
              >
                <IconArrow size={32} />
              </span>
            </div>
          </Sequence>

          <Sequence name="Footnote">
            <div
              style={{
                ...riseStyle(frame, fps, 244, 14, 26),
                marginTop: 26,
                textAlign: "center",
                fontFamily: FONT_SANS,
                fontSize: 24,
                color: BRAND.muted,
              }}
            >
              {footnote}
            </div>
          </Sequence>
        </div>
      </AbsoluteFill>

      <Sequence name="Grain">
        <Grain frame={frame} period={period} scale={scale} opacity={0.045} />
      </Sequence>
    </AbsoluteFill>
  );
};
