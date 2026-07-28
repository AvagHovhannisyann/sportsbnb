/**
 * FeatureBookScene — steps two and three of "How it works" in
 * `src/pages/HomePage.tsx`: "Pick a real slot" and "Pay and play". Slot →
 * payment ring → confirmation, with the zero-commission breakdown intact.
 * 1920×1080 · 30fps · 330 frames (11s) · one-shot scene.
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
  IconWallet,
  MaskedWords,
  Panel,
  StageWash,
  alpha,
  groupNumber,
  pad2,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   step header
 *   8   headline
 *  44   body
 *  64   booking panel arrives
 *  84   the four summary rows land, 10f apart
 * 138   the hold timer starts counting down       (linear — clock time)
 * 156   the payment ring fills                    (linear — a progress ring)
 * 216   the ring resolves into a tick             (spring — an arrival)
 * 240   the confirmation banner
 * 272   the "keeps 100%" note
 *
 * ── Two motions that are correctly *not* springs ─────────────────────────
 * The countdown and the payment ring are both linear, and deliberately so. A
 * twenty-minute hold ticks down at a constant rate; a payment authorisation
 * bar that eases out is claiming to know how long the bank will take. Springs
 * are reserved for things that arrive: panels, rows, the tick, the banner.
 *
 * ── Commercial accuracy ───────────────────────────────────────────────────
 * The breakdown shows the venue price, a zero booking fee and a total equal to
 * the venue price. SportsBnB takes no commission — the owner keeps 100% and
 * the player pays exactly the listed price. Any non-zero fee row here would
 * contradict the product.
 */

const SETTLED_FRAME = 300;

const SummaryRow: FC<{
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
      paddingTop: emphasis ? 20 : 0,
      borderTop: emphasis ? `1px solid ${BRAND.border}` : "none",
    }}
  >
    <span
      style={{
        fontFamily: emphasis ? FONT_DISPLAY : FONT_SANS,
        fontSize: emphasis ? 30 : 26,
        fontWeight: emphasis ? 600 : 400,
        color: emphasis ? BRAND.fg : BRAND.fgSoft,
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: emphasis ? 34 : 27,
        fontWeight: emphasis ? 600 : 400,
        fontVariantNumeric: "tabular-nums",
        color: tint ?? BRAND.fg,
      }}
    >
      {value}
    </span>
  </div>
);

/**
 * The payment authorisation ring.
 *
 * Drawn with `pathLength={1}`, which normalises the circle's arc length so the
 * dash array is a plain 0…1 fraction — the same trick the ambient plates use
 * for their travelling highlights, here doing honest duty as a progress meter.
 */
const PaymentRing: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly startAt: number;
  readonly fillFrames: number;
  readonly resolveAt: number;
  readonly size: number;
}> = ({ frame, fps, startAt, fillFrames, resolveAt, size }) => {
  /** Linear: a progress ring that eases is lying about what it measures. */
  const progress = interpolate(frame, [startAt, startAt + fillFrames], [0, 1], CLAMP);
  const resolve = spring({
    frame,
    fps,
    config: { damping: 13, mass: 0.6, stiffness: 170 },
    delay: resolveAt,
    durationInFrames: 26,
  });

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle
          cx={50}
          cy={50}
          r={42}
          fill="none"
          stroke={alpha(BRAND.fg, 0.08)}
          strokeWidth={6}
        />
        <circle
          cx={50}
          cy={50}
          r={42}
          fill="none"
          pathLength={1}
          stroke={BRAND.primary}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${1 - progress}`}
          strokeDashoffset={0.25}
          opacity={1 - resolve}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: BRAND.primary,
          opacity: resolve,
          transform: `scale(${interpolate(resolve, [0, 1], [0.5, 1])})`,
        }}
      >
        <IconCheck size={size * 0.42} />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_MONO,
          fontSize: size * 0.18,
          fontVariantNumeric: "tabular-nums",
          color: BRAND.fgSoft,
          opacity: 1 - resolve,
        }}
      >
        {Math.round(progress * 100)}%
      </div>
    </div>
  );
};

export type FeatureBookSceneProps = {
  readonly stepNumber: string;
  readonly eyebrow: string;
  readonly headline: readonly string[];
  readonly accentFrom: number;
  readonly body: string;
  readonly venueName: string;
  readonly slotLabel: string;
  readonly durationLabel: string;
  readonly currency: string;
  readonly venuePrice: number;
  /** Zero. SportsBnB takes no commission — see the file header. */
  readonly bookingFee: number;
  readonly payMethod: string;
  /** Minutes the slot is held while the player pays. */
  readonly holdMinutes: number;
  readonly confirmLabel: string;
  readonly ownerNote: string;
};

export const featureBookSceneDefaultProps: FeatureBookSceneProps = {
  stepNumber: "02",
  eyebrow: "Book",
  headline: ["Pick", "a", "real", "slot.", "Pay", "in", "the", "app."],
  accentFrom: 4,
  body: "Availability is live, not a guess. The slot you tap is held while you pay, and the price you see is the price you pay.",
  venueName: "Ararat Arena",
  slotLabel: "Thursday, 24 July · 19:00",
  durationLabel: "90 min",
  currency: "AMD",
  venuePrice: 12000,
  bookingFee: 0,
  payMethod: "Card · Idram",
  holdMinutes: 20,
  confirmLabel: "Confirmed — the slot is yours",
  ownerNote: "The venue receives the full AMD 12,000. SportsBnB takes no commission.",
};

export const FeatureBookScene: FC<FeatureBookSceneProps> = ({
  stepNumber,
  eyebrow,
  headline,
  accentFrom,
  body,
  venueName,
  slotLabel,
  durationLabel,
  currency,
  venuePrice,
  bookingFee,
  payMethod,
  holdMinutes,
  confirmLabel,
  ownerNote,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME);

  const panel = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 64,
    durationInFrames: 32,
  });
  const banner = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 240,
    durationInFrames: 28,
  });

  /**
   * The hold countdown. Linear because clock time is linear; `Math.floor` on
   * an interpolate gives a clean 1Hz tick with no per-frame state, which a
   * render distributed across workers could not carry anyway.
   */
  const elapsed = interpolate(frame, [138, 138 + fps * 6], [0, 78], CLAMP);
  const remaining = Math.max(0, holdMinutes * 60 - Math.floor(elapsed));
  const mm = Math.floor(remaining / 60);
  const ss = remaining - mm * 60;

  /** One-shot glow when the payment resolves, clamped back to 0. */
  const flash = interpolate(frame, [216, 232, 268], [0, 0.3, 0], {
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
          padding: "0 110px",
          flexDirection: "row",
          alignItems: "center",
          gap: 88,
        }}
      >
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <Sequence name="Step header">
            <div
              style={{
                ...riseStyle(frame, fps, 0, 14, 24),
                display: "flex",
                alignItems: "center",
                gap: 22,
              }}
            >
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 26,
                  fontVariantNumeric: "tabular-nums",
                  color: BRAND.primary,
                }}
              >
                {stepNumber}
              </span>
              <span
                style={{
                  width: 110,
                  height: 1,
                  backgroundColor: BRAND.border,
                  display: "inline-block",
                }}
              />
              <Eyebrow size={22}>{eyebrow}</Eyebrow>
            </div>
          </Sequence>

          <Sequence name="Headline">
            <div
              style={{
                marginTop: 24,
                maxWidth: 780,
                fontFamily: FONT_DISPLAY,
                fontSize: 82,
                fontWeight: 700,
                letterSpacing: "-0.035em",
                lineHeight: 1.03,
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

          <Sequence name="Body">
            <div
              style={{
                ...riseStyle(frame, fps, 44, 18),
                marginTop: 24,
                maxWidth: 640,
                fontFamily: FONT_SANS,
                fontSize: 27,
                lineHeight: 1.56,
                color: BRAND.fgSoft,
              }}
            >
              {body}
            </div>
          </Sequence>

          <Sequence name="Payment">
            <div
              style={{
                marginTop: 52,
                display: "flex",
                alignItems: "center",
                gap: 34,
              }}
            >
              <PaymentRing
                frame={frame}
                fps={fps}
                startAt={156}
                fillFrames={58}
                resolveAt={216}
                size={148}
              />
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    color: BRAND.fgSoft,
                  }}
                >
                  <span style={{ color: BRAND.cyan, display: "inline-flex" }}>
                    <IconWallet size={26} />
                  </span>
                  {payMethod}
                </div>
                <div
                  style={{
                    marginTop: 12,
                    fontFamily: FONT_MONO,
                    fontSize: 24,
                    fontVariantNumeric: "tabular-nums",
                    color: BRAND.amber,
                    opacity: interpolate(frame, [138, 152], [0, 1], CLAMP),
                  }}
                >
                  slot held {pad2(mm)}:{pad2(ss)}
                </div>
              </div>
            </div>
          </Sequence>
        </div>

        <Sequence name="Booking panel">
          <div
            style={{
              width: 700,
              flexShrink: 0,
              opacity: interpolate(panel, [0, 0.4], [0, 1], CLAMP),
              transform: `translateY(${interpolate(panel, [0, 1], [42, 0])}px)`,
            }}
          >
            <Panel
              padding={44}
              radius={32}
              style={{ borderColor: alpha(BRAND.primary, 0.12 + flash) }}
            >
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 32,
                  fontWeight: 600,
                  color: BRAND.fg,
                }}
              >
                {venueName}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: FONT_SANS,
                  fontSize: 23,
                  color: BRAND.muted,
                  marginBottom: 34,
                }}
              >
                {slotLabel} · {durationLabel}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <SummaryRow
                  frame={frame}
                  fps={fps}
                  label={durationLabel}
                  value={`${currency} ${groupNumber(venuePrice)}`}
                  delay={84}
                />
                <SummaryRow
                  frame={frame}
                  fps={fps}
                  label="Booking fee"
                  value={`${currency} ${groupNumber(bookingFee)}`}
                  delay={94}
                  tint={BRAND.primary}
                />
                <SummaryRow
                  frame={frame}
                  fps={fps}
                  label="Total"
                  value={`${currency} ${groupNumber(venuePrice + bookingFee)}`}
                  delay={104}
                  emphasis
                />
              </div>

              <div
                style={{
                  marginTop: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  padding: "22px 0",
                  borderRadius: 18,
                  border: `1px solid ${alpha(BRAND.primary, 0.26 + flash)}`,
                  backgroundColor: alpha(BRAND.primary, 0.1 + flash * 0.4),
                  color: BRAND.primary,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 27,
                  fontWeight: 600,
                  opacity: interpolate(banner, [0, 0.35], [0, 1], CLAMP),
                  transform: `translateY(${interpolate(banner, [0, 1], [16, 0])}px)`,
                }}
              >
                <IconCheck size={26} />
                {confirmLabel}
              </div>

              <div
                style={{
                  ...riseStyle(frame, fps, 272, 10, 24),
                  marginTop: 22,
                  fontFamily: FONT_SANS,
                  fontSize: 21,
                  lineHeight: 1.5,
                  color: BRAND.muted,
                  textAlign: "center",
                }}
              >
                {ownerNote}
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
