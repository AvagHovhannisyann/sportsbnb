/**
 * CtaListYourVenue — the owner-facing close: "List once. Keep everything."
 * Runs at the end of `/for-owners` and after FeatureManageScene in the reel.
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
  SETTLE_SPRING,
  StageWash,
  alpha,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   eyebrow
 *   8   headline
 *  56   the four owner facts deal in, 11f apart
 * 132   the zero-commission bar
 * 168   the button
 * 196   the arrow leans, once
 * 210   the reassurance line
 *
 * ── The single tonal inversion ───────────────────────────────────────────
 * `HomePage.tsx` inverts exactly one band — the owners' one — and notes that
 * "that scarcity is what makes it land". This composition is the video
 * equivalent: it is the one CTA in the family set on a light plate, using
 * `--secondary` (chalk) as the surface and `--secondary-foreground` (near
 * black) as the type, exactly as the real section does. Using it twice would
 * spend the effect.
 *
 * Because the plate is light, the accent has to change too: `--primary` at
 * 90% lightness is an electric green that fails contrast on chalk, so the
 * accent here is `--primary-foreground`-dark type on a `--primary` chip rather
 * than green type on white. That is the same swap the real inverted section
 * performs on its button.
 *
 * ── Commercial accuracy ───────────────────────────────────────────────────
 * "0%" is the whole offer: SportsBnB takes no commission, so the owner keeps
 * 100% of the price they set. `commissionValue` is a prop only so the copy can
 * be localised, never so it can be raised.
 */

const SETTLED_FRAME = 244;

const Fact: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly term: string;
  readonly value: string;
  readonly note: string;
  readonly delay: number;
  readonly ink: string;
}> = ({ frame, fps, term, value, note, delay, ink }) => {
  const p = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay,
    durationInFrames: 28,
  });

  return (
    <div
      style={{
        flex: "1 1 0",
        padding: 34,
        borderRadius: 26,
        backgroundColor: alpha(ink, 0.05),
        border: `1px solid ${alpha(ink, 0.1)}`,
        opacity: interpolate(p, [0, 0.4], [0, 1], CLAMP),
        transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT_SANS,
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: alpha(ink, 0.6),
        }}
      >
        {term}
      </div>
      <div
        style={{
          marginTop: 14,
          fontFamily: FONT_DISPLAY,
          fontSize: 52,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums",
          color: ink,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: FONT_SANS,
          fontSize: 21,
          lineHeight: 1.4,
          color: alpha(ink, 0.65),
        }}
      >
        {note}
      </div>
    </div>
  );
};

export type CtaListYourVenueProps = {
  readonly eyebrow: string;
  readonly headline: readonly string[];
  readonly facts: readonly {
    readonly term: string;
    readonly value: string;
    readonly note: string;
  }[];
  /** Zero. See the file header. */
  readonly commissionValue: string;
  readonly commissionLine: string;
  readonly cta: string;
  readonly reassurance: string;
};

export const ctaListYourVenueDefaultProps: CtaListYourVenueProps = {
  eyebrow: "For venue owners",
  headline: ["List", "once.", "Keep", "everything."],
  facts: [
    { term: "Commission", value: "0%", note: "No listing fee, no monthly cost" },
    { term: "Payouts", value: "Weekly", note: "Itemised, straight to your account" },
    { term: "Setup", value: "10 min", note: "Photos, hours, price — that's it" },
    { term: "Support", value: "Direct", note: "Message players inside the app" },
  ],
  commissionValue: "0%",
  commissionLine: "You set the price. The player pays the price. You keep all of it.",
  cta: "List your venue",
  reassurance: "Takes about ten minutes. Nothing to pay, now or later.",
};

export const CtaListYourVenue: FC<CtaListYourVenueProps> = ({
  eyebrow,
  headline,
  facts,
  commissionValue,
  commissionLine,
  cta,
  reassurance,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME);

  /**
   * `--secondary` / `--secondary-foreground` from the `.dark` block: chalk
   * plate, near-black ink. The one inverted composition in the family.
   */
  const plate = BRAND.fg;
  const ink = "#0C120F";

  const bar = spring({
    frame,
    fps,
    config: SETTLE_SPRING,
    delay: 132,
    durationInFrames: 34,
  });
  const button = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 168,
    durationInFrames: 30,
  });

  const arrowShift = interpolate(frame, [196, 210, 226], [0, 8, 0], {
    ...CLAMP,
    easing: EASE_OUT_EXPO,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      {/* The dark stage still exists underneath, so the plate reads as a card
          laid on the app rather than as a different product. */}
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} />
      </Sequence>

      <AbsoluteFill style={{ padding: 56 }}>
        <div
          style={{
            height: "100%",
            borderRadius: 44,
            backgroundColor: plate,
            padding: "72px 88px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 40px 90px -30px rgba(3,10,8,0.9)",
          }}
        >
          <div>
            <Sequence name="Eyebrow">
              <div style={riseStyle(frame, fps, 0, 14, 24)}>
                <Eyebrow size={22} color={alpha(ink, 0.55)}>
                  {eyebrow}
                </Eyebrow>
              </div>
            </Sequence>

            <Sequence name="Headline">
              <div
                style={{
                  marginTop: 24,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 108,
                  fontWeight: 700,
                  letterSpacing: "-0.042em",
                  lineHeight: 1,
                  color: ink,
                }}
              >
                <MaskedWords
                  frame={frame}
                  fps={fps}
                  words={headline}
                  delay={8}
                  stagger={5}
                />
              </div>
            </Sequence>

            <Sequence name="Facts">
              <div style={{ marginTop: 56, display: "flex", gap: 22 }}>
                {facts.map((fact, i) => (
                  <Fact
                    key={fact.term}
                    frame={frame}
                    fps={fps}
                    term={fact.term}
                    value={fact.value}
                    note={fact.note}
                    delay={56 + i * 11}
                    ink={ink}
                  />
                ))}
              </div>
            </Sequence>
          </div>

          <div>
            <Sequence name="Commission bar">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 26,
                  padding: "26px 34px",
                  borderRadius: 24,
                  backgroundColor: alpha(ink, 0.06),
                  opacity: interpolate(bar, [0, 0.3], [0, 1], CLAMP),
                  transform: `translateY(${interpolate(bar, [0, 1], [22, 0])}px)`,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 24px",
                    borderRadius: 999,
                    backgroundColor: BRAND.primary,
                    color: BRAND.primaryFg,
                    fontFamily: FONT_MONO,
                    fontSize: 30,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <IconCheck size={24} />
                  {commissionValue}
                </span>
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    lineHeight: 1.4,
                    color: alpha(ink, 0.8),
                  }}
                >
                  {commissionLine}
                </span>
              </div>
            </Sequence>

            <Sequence name="Button">
              <div
                style={{
                  marginTop: 40,
                  display: "flex",
                  alignItems: "center",
                  gap: 30,
                  opacity: interpolate(button, [0, 0.4], [0, 1], CLAMP),
                  transform: `translateY(${interpolate(button, [0, 1], [26, 0])}px)`,
                }}
              >
                {/*
                  On the inverted plate the button inverts too: near-black fill
                  with chalk type, matching `bg-secondary-foreground
                  text-secondary` on the real section's CTA.
                */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 14,
                    height: 86,
                    padding: "0 44px",
                    borderRadius: 22,
                    backgroundColor: ink,
                    color: plate,
                    fontFamily: FONT_DISPLAY,
                    fontSize: 29,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {cta}
                  <span
                    style={{
                      display: "inline-flex",
                      transform: `translateX(${arrowShift}px)`,
                    }}
                  >
                    <svg
                      width={28}
                      height={28}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 12h15M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </div>

                <span
                  style={{
                    ...riseStyle(frame, fps, 210, 12, 26),
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: alpha(ink, 0.6),
                  }}
                >
                  {reassurance}
                </span>
              </div>
            </Sequence>
          </div>
        </div>
      </AbsoluteFill>

      <Sequence name="Grain">
        {/* Lighter over a chalk plate: grain that reads as texture on near-black
            reads as dirt on white. */}
        <Grain frame={frame} period={period} scale={scale} opacity={0.03} />
      </Sequence>
    </AbsoluteFill>
  );
};
