/**
 * CityShowcaseVanadzor — the Lori card for the city rail on the landing page
 * and the `/venues?city=Vanadzor` masthead. Composed around the forested
 * ridgeline the city sits in, rather than around buildings.
 * 1080×1350 · 30fps · 270 frames (9s) · one-shot reveal.
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
  IconArrow,
  IconPin,
  IconWhistle,
  MaskedWords,
  Panel,
  SETTLE_SPRING,
  StageWash,
  TAU,
  alpha,
  loopT,
  noise,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   ridge bed
 *   6   eyebrow + city name
 *  40   standfirst
 *  60   the season strip fills, 6f apart
 * 128   the sport chips, 10f apart
 * 178   the "indoor when it snows" note
 * 208   the venue count
 * 232   CTA
 *
 * ── The ridge ─────────────────────────────────────────────────────────────
 * Two silhouettes whose height function is **periodic in x**:
 *
 *     h(x) = base − Σ aₙ · sin(2π · kₙ · x / L + φₙ),   kₙ ∈ ℤ
 *
 * so `h(x + L) = h(x)`: each term completes a whole number of cycles across L.
 * The path is sampled once over `[-L, W + L]` and is static thereafter; only
 * the layer's translate moves, and it is taken **modulo one wavelength**:
 *
 *     shift = −wrap(L · laps · t, L)          ∈ (−L, 0]
 *
 * Unwrapped, the `laps = 2` layer would be reading source x ∈ [2160, 3240] by
 * the end of a cycle — past the 2160 the path was sampled to — and the near
 * ridge would simply run out, leaving bare card under it. Wrapped, the visible
 * window is always inside the sampled span, and the drift is continuous across
 * repeats because `wrap` is exactly 0 at both ends. `samples` is a multiple of
 * 3 so the wavelength is a whole number of sample steps.
 *
 * ── Why a season strip ────────────────────────────────────────────────────
 * Lori is the one region where the weather genuinely changes what you can
 * book, so the card leads with it: the strip shows the indoor/outdoor split by
 * month, which is a real reason to look at Vanadzor differently from Yerevan
 * rather than a decorative chart.
 */

const SETTLED_FRAME = 252;

type RidgeLayer = {
  readonly id: string;
  readonly fill: string;
  readonly base: number;
  readonly amps: readonly number[];
  readonly harmonics: readonly number[];
  readonly seed: number;
  /** Whole wavelengths travelled per cycle. Integer ⇒ exact return. */
  readonly laps: number;
  readonly rim: string;
  readonly rimAlpha: number;
};

const RIDGES: readonly RidgeLayer[] = [
  {
    id: "far",
    fill: "#101815",
    base: 0.42,
    amps: [0.13, 0.05, 0.02],
    harmonics: [1, 3, 6],
    seed: 5.2,
    laps: 1,
    rim: BRAND.cyan,
    rimAlpha: 0.12,
  },
  {
    id: "near",
    fill: BRAND.bg,
    base: 0.66,
    amps: [0.11, 0.045, 0.018],
    harmonics: [1, 2, 5],
    seed: 17.4,
    laps: 2,
    rim: BRAND.primary,
    rimAlpha: 0.18,
  },
];

const ridgeHeight = (
  x: number,
  wavelength: number,
  ridge: RidgeLayer,
  height: number,
): number => {
  let y = ridge.base * height;
  for (let n = 0; n < ridge.harmonics.length; n += 1) {
    y -=
      ridge.amps[n] *
      height *
      Math.sin(
        (TAU * ridge.harmonics[n] * x) / wavelength + noise(ridge.seed + n * 3.9) * TAU,
      );
  }
  return y;
};

const RidgeBed: FC<{
  readonly frame: number;
  readonly driftPeriod: number;
  readonly samples: number;
}> = ({ frame, driftPeriod, samples }) => {
  const t = loopT(frame, driftPeriod);
  const width = 1080;
  const height = 520;
  const wavelength = width;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height,
        opacity: 0.85,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1080 520"
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        {RIDGES.map((ridge) => {
          const shift = -wavelength * ridge.laps * t;
          const span = width + wavelength * 2;
          const step = span / samples;
          let d = `M ${-wavelength} ${height + 4}`;
          for (let i = 0; i <= samples; i += 1) {
            const x = -wavelength + i * step;
            d += ` L ${x.toFixed(2)} ${ridgeHeight(x, wavelength, ridge, height).toFixed(2)}`;
          }
          d += ` L ${width + wavelength} ${height + 4} Z`;

          return (
            <g key={ridge.id} transform={`translate(${shift.toFixed(3)} 0)`}>
              <path d={d} fill={ridge.fill} />
              <path
                d={d}
                fill="none"
                stroke={alpha(ridge.rim, ridge.rimAlpha)}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

type Month = {
  readonly label: string;
  /** Share of bookings played indoors, 0…1. */
  readonly indoor: number;
};

const SeasonStrip: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly months: readonly Month[];
  readonly startAt: number;
}> = ({ frame, fps, months, startAt }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180 }}>
    {months.map((month, i) => {
      const p = spring({
        frame,
        fps,
        config: SETTLE_SPRING,
        delay: startAt + i * 6,
        durationInFrames: 30,
      });
      return (
        <div
          key={month.label}
          style={{
            flex: "1 1 0",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 8,
              backgroundColor: alpha(BRAND.cyan, 0.1),
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                height: `${interpolate(p, [0, 1], [0, month.indoor * 100], CLAMP)}%`,
                borderRadius: 8,
                background: `linear-gradient(to top, ${alpha(
                  BRAND.primary,
                  0.35,
                )} 0%, ${alpha(BRAND.primary, 0.8)} 100%)`,
              }}
            />
          </div>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 17,
              color: BRAND.muted,
            }}
          >
            {month.label}
          </span>
        </div>
      );
    })}
  </div>
);

export type CityShowcaseVanadzorProps = {
  readonly eyebrow: string;
  readonly cityName: readonly string[];
  readonly standfirst: string;
  readonly months: readonly Month[];
  readonly stripCaption: string;
  readonly sports: readonly string[];
  readonly weatherNote: string;
  readonly venueCount: number;
  readonly venueLabel: string;
  readonly cta: string;
  /** Frames per full ridge drift cycle. */
  readonly driftPeriod: number;
};

export const cityShowcaseVanadzorDefaultProps: CityShowcaseVanadzorProps = {
  eyebrow: "City guide",
  cityName: ["Vanadzor"],
  standfirst:
    "Third city, and the one where the season actually matters — Lori gets real winters, so the indoor halls carry the year.",
  months: [
    { label: "J", indoor: 0.92 },
    { label: "F", indoor: 0.88 },
    { label: "M", indoor: 0.74 },
    { label: "A", indoor: 0.52 },
    { label: "M", indoor: 0.34 },
    { label: "J", indoor: 0.22 },
    { label: "J", indoor: 0.18 },
    { label: "A", indoor: 0.2 },
    { label: "S", indoor: 0.31 },
    { label: "O", indoor: 0.55 },
    { label: "N", indoor: 0.78 },
    { label: "D", indoor: 0.9 },
  ],
  stripCaption: "Share of bookings played indoors, by month",
  sports: ["Football", "Futsal", "Basketball", "Volleyball", "Swimming"],
  weatherNote: "Every listing says indoor or outdoor before you pay — you will not turn up to a covered pitch in a snowstorm and find it is not.",
  venueCount: 21,
  venueLabel: "venues live across Vanadzor and the Lori valley",
  cta: "Browse Vanadzor venues",
  driftPeriod: 300,
};

export const CityShowcaseVanadzor: FC<CityShowcaseVanadzorProps> = ({
  eyebrow,
  cityName,
  standfirst,
  months,
  stripCaption,
  sports,
  weatherNote,
  venueCount,
  venueLabel,
  cta,
  driftPeriod,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME, 1080);

  const countP = spring({
    frame,
    fps,
    config: SETTLE_SPRING,
    delay: 208,
    durationInFrames: 36,
  });
  const ctaP = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 232,
    durationInFrames: 28,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} tint={BRAND.cyan} />
      </Sequence>

      <Sequence name="Ridge bed">
        <AbsoluteFill>
          <RidgeBed frame={frame} driftPeriod={driftPeriod} samples={96} />
        </AbsoluteFill>
      </Sequence>

      <AbsoluteFill style={{ padding: 56 }}>
        <Panel
          padding={52}
          radius={40}
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: alpha(BRAND.card, 0.88),
          }}
        >
          <div>
            <Sequence name="Header" layout="none">
              <div
                style={{
                  ...riseStyle(frame, fps, 6, 12, 22),
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span style={{ color: BRAND.primary, display: "inline-flex" }}>
                  <IconPin size={26} />
                </span>
                <Eyebrow size={22}>{eyebrow}</Eyebrow>
              </div>
            </Sequence>

            <Sequence name="City name" layout="none">
              <div
                style={{
                  marginTop: 22,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 100,
                  fontWeight: 700,
                  letterSpacing: "-0.045em",
                  lineHeight: 0.98,
                  color: BRAND.fg,
                }}
              >
                <MaskedWords
                  frame={frame}
                  fps={fps}
                  words={cityName}
                  delay={12}
                  duration={30}
                />
              </div>
            </Sequence>

            <Sequence name="Standfirst" layout="none">
              <div
                style={{
                  ...riseStyle(frame, fps, 40, 16, 26),
                  marginTop: 22,
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  lineHeight: 1.5,
                  color: BRAND.fgSoft,
                }}
              >
                {standfirst}
              </div>
            </Sequence>

            <Sequence name="Season strip" layout="none">
              <div style={{ marginTop: 38 }}>
                <Eyebrow size={16} color={BRAND.muted} style={{ marginBottom: 18 }}>
                  {stripCaption}
                </Eyebrow>
                <SeasonStrip
                  frame={frame}
                  fps={fps}
                  months={months}
                  startAt={60}
                />
              </div>
            </Sequence>

            <Sequence name="Sports" layout="none">
              <div
                style={{
                  marginTop: 34,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                {sports.map((sport, i) => {
                  const p = spring({
                    frame,
                    fps,
                    config: ENTER_SPRING,
                    delay: 128 + i * 10,
                    durationInFrames: 22,
                  });
                  return (
                    <span
                      key={sport}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px 22px",
                        borderRadius: 999,
                        border: `1px solid ${BRAND.border}`,
                        backgroundColor: alpha(BRAND.fg, 0.04),
                        fontFamily: FONT_SANS,
                        fontSize: 22,
                        color: BRAND.fgSoft,
                        opacity: interpolate(p, [0, 0.4], [0, 1], CLAMP),
                        transform: `translateY(${interpolate(p, [0, 1], [12, 0])}px)`,
                      }}
                    >
                      <span style={{ color: BRAND.primary, display: "inline-flex" }}>
                        <IconWhistle size={18} />
                      </span>
                      {sport}
                    </span>
                  );
                })}
              </div>
            </Sequence>
          </div>

          <div>
            <Sequence name="Weather note" layout="none">
              <div
                style={{
                  ...riseStyle(frame, fps, 178, 14, 26),
                  padding: "22px 26px",
                  borderRadius: 20,
                  border: `1px solid ${alpha(BRAND.cyan, 0.22)}`,
                  backgroundColor: alpha(BRAND.cyan, 0.07),
                  fontFamily: FONT_SANS,
                  fontSize: 22,
                  lineHeight: 1.5,
                  color: BRAND.fgSoft,
                }}
              >
                {weatherNote}
              </div>
            </Sequence>

            <Sequence name="Venue count" layout="none">
              <div
                style={{
                  marginTop: 30,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 14,
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 72,
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    lineHeight: 0.9,
                    fontVariantNumeric: "tabular-nums",
                    color: BRAND.primary,
                  }}
                >
                  {Math.round(countP * venueCount)}
                </span>
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    lineHeight: 1.35,
                    color: BRAND.fgSoft,
                  }}
                >
                  {venueLabel}
                </span>
              </div>
            </Sequence>

            <Sequence name="CTA" layout="none">
              <div
                style={{
                  marginTop: 26,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 28,
                  fontWeight: 600,
                  color: BRAND.primary,
                  opacity: interpolate(ctaP, [0, 0.4], [0, 1], CLAMP),
                  transform: `translateY(${interpolate(ctaP, [0, 1], [14, 0])}px)`,
                }}
              >
                {cta}
                <span
                  style={{
                    display: "inline-flex",
                    transform: `translateX(${interpolate(
                      frame,
                      [252, 264, 276],
                      [0, 8, 0],
                      { ...CLAMP, easing: EASE_OUT_EXPO },
                    )}px)`,
                  }}
                >
                  <IconArrow size={26} />
                </span>
              </div>
            </Sequence>
          </div>
        </Panel>
      </AbsoluteFill>

      <Sequence name="Grain">
        <Grain frame={frame} period={period} scale={scale} opacity={0.045} />
      </Sequence>
    </AbsoluteFill>
  );
};
