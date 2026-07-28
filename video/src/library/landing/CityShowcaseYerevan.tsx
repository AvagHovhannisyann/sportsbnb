/**
 * CityShowcaseYerevan — the capital's card for the city rail on the landing
 * page and the `/venues?city=Yerevan` masthead. The densest of the three city
 * cards, because Yerevan is where most of the supply is.
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
  MaskedWords,
  Panel,
  SETTLE_SPRING,
  StageWash,
  TAU,
  alpha,
  groupNumber,
  loopT,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   skyline bed
 *   6   eyebrow + city name
 *  38   the Armenian name, in Latin transliteration
 *  52   venue count counts up
 *  84   the three headline sports, 12f apart
 * 136   the district chips, 5f apart
 * 200   the sub-line
 * 222   the CTA
 *
 * ── The skyline ───────────────────────────────────────────────────────────
 * Twelve bars whose heights come from a deterministic value-noise function of
 * the column index — the same `noise(seed)` the ambient plates use, so a
 * render is a pure function of the frame and Remotion can distribute frames
 * across workers without the skyline changing shape between them. The bars'
 * glow breathes on a **modulo cycle** (`loopT(frame, breathPeriod)`), which
 * makes it continuous if the card is played on repeat.
 *
 * ── Script ────────────────────────────────────────────────────────────────
 * The Armenian name is given in Latin transliteration rather than in Armenian
 * script. `src/index.css` loads Noto Sans Armenian for exactly one codepoint
 * (U+058F, the dram sign) and a headless render cannot fetch it, so Armenian
 * glyphs would fall through to whatever the render box happened to have.
 */

const SETTLED_FRAME = 244;

const Skyline: FC<{
  readonly frame: number;
  readonly columns: number;
  readonly breathPeriod: number;
}> = ({ frame, columns, breathPeriod }) => {
  const t = loopT(frame, breathPeriod);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 340,
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        opacity: 0.6,
        WebkitMaskImage:
          "linear-gradient(to top, #000 0%, rgba(0,0,0,0.4) 58%, transparent 100%)",
        maskImage:
          "linear-gradient(to top, #000 0%, rgba(0,0,0,0.4) 58%, transparent 100%)",
      }}
    >
      {Array.from({ length: columns }, (_unused, i) => {
        const seeded = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
        const h = 0.28 + (seeded - Math.floor(seeded)) * 0.66;
        const breath = 0.5 + 0.5 * Math.sin(TAU * t - i * 0.42);
        return (
          <div
            key={`tower-${i}`}
            style={{
              flex: "1 1 0",
              height: `${h * 100}%`,
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
              background: `linear-gradient(to top, ${alpha(
                BRAND.surface2,
                0.9,
              )} 0%, ${alpha(BRAND.primary, 0.05 + breath * 0.06)} 100%)`,
              borderTop: `1px solid ${alpha(BRAND.primary, 0.12 + breath * 0.1)}`,
            }}
          />
        );
      })}
    </div>
  );
};

const SportRow: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly name: string;
  readonly count: number;
  readonly max: number;
  readonly delay: number;
  readonly tint: string;
}> = ({ frame, fps, name, count, max, delay, tint }) => {
  const p = spring({
    frame,
    fps,
    config: SETTLE_SPRING,
    delay,
    durationInFrames: 34,
  });

  return (
    <div style={{ opacity: interpolate(p, [0, 0.25], [0, 1], CLAMP) }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 28,
            fontWeight: 600,
            color: BRAND.fg,
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 24,
            fontVariantNumeric: "tabular-nums",
            color: tint,
          }}
        >
          {Math.round(p * count)}
        </span>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 5,
          backgroundColor: alpha(BRAND.fg, 0.06),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${interpolate(p, [0, 1], [0, (count / max) * 100], CLAMP)}%`,
            height: "100%",
            borderRadius: 5,
            background: `linear-gradient(90deg, ${alpha(tint, 0.45)} 0%, ${tint} 100%)`,
          }}
        />
      </div>
    </div>
  );
};

export type CityShowcaseYerevanProps = {
  readonly eyebrow: string;
  readonly cityName: readonly string[];
  readonly transliteration: string;
  readonly venueCount: number;
  readonly sports: readonly { readonly name: string; readonly count: number }[];
  readonly districts: readonly string[];
  readonly subline: string;
  readonly cta: string;
  /** Frames per breath of the skyline glow. */
  readonly breathPeriod: number;
};

export const cityShowcaseYerevanDefaultProps: CityShowcaseYerevanProps = {
  eyebrow: "City guide",
  cityName: ["Yerevan"],
  transliteration: "Yerevan · the capital · 1.1m people",
  venueCount: 186,
  sports: [
    { name: "Football", count: 74 },
    { name: "Tennis & padel", count: 48 },
    { name: "Basketball", count: 36 },
  ],
  districts: [
    "Kentron",
    "Arabkir",
    "Shengavit",
    "Ajapnyak",
    "Davtashen",
    "Nor Nork",
    "Erebuni",
    "Malatia",
  ],
  subline: "Most of them free at 19:00 tonight — and the price you see is the price you pay.",
  cta: "Browse Yerevan venues",
  breathPeriod: 90,
};

export const CityShowcaseYerevan: FC<CityShowcaseYerevanProps> = ({
  eyebrow,
  cityName,
  transliteration,
  venueCount,
  sports,
  districts,
  subline,
  cta,
  breathPeriod,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME, 1080);

  const countP = spring({
    frame,
    fps,
    config: SETTLE_SPRING,
    delay: 52,
    durationInFrames: 44,
  });

  const ctaP = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 222,
    durationInFrames: 28,
  });

  let max = 1;
  for (let i = 0; i < sports.length; i += 1) {
    max = Math.max(max, sports[i].count);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} />
      </Sequence>

      <Sequence name="Skyline">
        <AbsoluteFill>
          <Skyline frame={frame} columns={14} breathPeriod={breathPeriod} />
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
                  fontSize: 116,
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
              <div
                style={{
                  ...riseStyle(frame, fps, 38, 12, 24),
                  marginTop: 16,
                  fontFamily: FONT_MONO,
                  fontSize: 23,
                  letterSpacing: "0.04em",
                  color: BRAND.muted,
                }}
              >
                {transliteration}
              </div>
            </Sequence>

            <Sequence name="Venue count" layout="none">
              <div
                style={{
                  marginTop: 40,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 16,
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 96,
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    lineHeight: 0.9,
                    fontVariantNumeric: "tabular-nums",
                    color: BRAND.primary,
                  }}
                >
                  {groupNumber(countP * venueCount)}
                </span>
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    color: BRAND.fgSoft,
                  }}
                >
                  venues you can book
                </span>
              </div>
            </Sequence>

            <Sequence name="Sports" layout="none">
              <div
                style={{
                  marginTop: 40,
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                {sports.map((sport, i) => (
                  <SportRow
                    key={sport.name}
                    frame={frame}
                    fps={fps}
                    name={sport.name}
                    count={sport.count}
                    max={max}
                    delay={84 + i * 12}
                    tint={
                      i === 0 ? BRAND.primary : i === 1 ? BRAND.cyan : BRAND.violet
                    }
                  />
                ))}
              </div>
            </Sequence>
          </div>

          <div>
            <Sequence name="Districts" layout="none">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                {districts.map((district, i) => {
                  const p = spring({
                    frame,
                    fps,
                    config: ENTER_SPRING,
                    delay: 136 + i * 5,
                    durationInFrames: 22,
                  });
                  return (
                    <span
                      key={district}
                      style={{
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
                      {district}
                    </span>
                  );
                })}
              </div>
            </Sequence>

            <Sequence name="Subline" layout="none">
              <div
                style={{
                  ...riseStyle(frame, fps, 200, 14, 26),
                  marginTop: 30,
                  fontFamily: FONT_SANS,
                  fontSize: 25,
                  lineHeight: 1.5,
                  color: BRAND.fgSoft,
                }}
              >
                {subline}
              </div>
            </Sequence>

            <Sequence name="CTA" layout="none">
              <div
                style={{
                  marginTop: 30,
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
                      [244, 256, 268],
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
