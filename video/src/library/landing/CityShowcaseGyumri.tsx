/**
 * CityShowcaseGyumri — Armenia's second city, for the city rail on the landing
 * page and the `/venues?city=Gyumri` masthead. Composed around the black-tuff
 * arcades the city is known for rather than around a skyline.
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
  IconCheck,
  IconPin,
  MaskedWords,
  Panel,
  SETTLE_SPRING,
  StageWash,
  TAU,
  alpha,
  loopT,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   arcade bed
 *   6   eyebrow + city name
 *  40   the standfirst
 *  62   the three headline figures, 16f apart
 * 132   the venue list, 14f apart
 * 210   sub-line
 * 230   CTA
 *
 * ── The arcade ────────────────────────────────────────────────────────────
 * Seven arches drawn as SVG paths, each a half-round on a pier — the shape of
 * Gyumri's tuff arcades, reduced to a silhouette. They light in turn on a
 * **modulo cycle**, `loopT(frame + i·offset, archPeriod)` fed through a full
 * cosine period, so the sweep is continuous if the card is played on repeat
 * and there is no accumulating phase error.
 *
 * ── Script ────────────────────────────────────────────────────────────────
 * Latin transliteration only. `src/index.css` fetches Noto Sans Armenian for a
 * single codepoint and a headless render cannot reach it, so Armenian glyphs
 * would fall through to whatever font the render box happens to have.
 */

const SETTLED_FRAME = 250;

const Arcade: FC<{
  readonly frame: number;
  readonly arches: number;
  readonly archPeriod: number;
}> = ({ frame, arches, archPeriod }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 420,
      opacity: 0.55,
      WebkitMaskImage:
        "linear-gradient(to top, #000 0%, rgba(0,0,0,0.35) 62%, transparent 100%)",
      maskImage:
        "linear-gradient(to top, #000 0%, rgba(0,0,0,0.35) 62%, transparent 100%)",
    }}
  >
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1080 420"
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      {Array.from({ length: arches }, (_unused, i) => {
        const w = 1080 / arches;
        const x = i * w;
        const pier = w * 0.16;
        const span = w - pier * 2;
        const springLine = 220;
        const r = span / 2;
        /** Modulo cycle, full cosine period — continuous across repeats. */
        const t = loopT(frame + i * (archPeriod / arches), archPeriod);
        const lit = 0.5 + 0.5 * Math.cos(TAU * t);

        const d = [
          `M ${x + pier} 420`,
          `L ${x + pier} ${springLine}`,
          `A ${r} ${r} 0 0 1 ${x + pier + span} ${springLine}`,
          `L ${x + pier + span} 420`,
        ].join(" ");

        return (
          <g key={`arch-${i}`}>
            <path
              d={d}
              fill="none"
              stroke={alpha(BRAND.surface3, 0.95)}
              strokeWidth={16}
            />
            <path
              d={d}
              fill="none"
              stroke={alpha(BRAND.primary, 0.1 + lit * 0.16)}
              strokeWidth={3}
            />
          </g>
        );
      })}
    </svg>
  </div>
);

const Figure: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly value: number;
  readonly suffix: string;
  readonly label: string;
  readonly delay: number;
  readonly tint: string;
}> = ({ frame, fps, value, suffix, label, delay, tint }) => {
  const p = spring({
    frame,
    fps,
    config: SETTLE_SPRING,
    delay,
    durationInFrames: 38,
  });
  const enter = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay,
    durationInFrames: 26,
  });

  return (
    <div
      style={{
        flex: "1 1 0",
        opacity: interpolate(enter, [0, 0.4], [0, 1], CLAMP),
        transform: `translateY(${interpolate(enter, [0, 1], [22, 0])}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 0.95,
          color: tint,
        }}
      >
        <span style={{ fontSize: 68, fontVariantNumeric: "tabular-nums" }}>
          {Math.round(p * value)}
        </span>
        <span style={{ fontSize: 34 }}>{suffix}</span>
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: FONT_SANS,
          fontSize: 21,
          lineHeight: 1.35,
          color: BRAND.muted,
        }}
      >
        {label}
      </div>
    </div>
  );
};

const VenueRow: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly name: string;
  readonly detail: string;
  readonly delay: number;
}> = ({ frame, fps, name, detail, delay }) => (
  <div
    style={{
      ...riseStyle(frame, fps, delay, 14, 24),
      display: "flex",
      alignItems: "center",
      gap: 18,
      padding: "20px 24px",
      borderRadius: 20,
      backgroundColor: alpha(BRAND.fg, 0.04),
      border: `1px solid ${BRAND.border}`,
    }}
  >
    <span style={{ color: BRAND.primary, display: "inline-flex" }}>
      <IconCheck size={24} />
    </span>
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 27,
          fontWeight: 600,
          color: BRAND.fg,
        }}
      >
        {name}
      </div>
      <div
        style={{
          marginTop: 4,
          fontFamily: FONT_SANS,
          fontSize: 20,
          color: BRAND.muted,
        }}
      >
        {detail}
      </div>
    </div>
  </div>
);

export type CityShowcaseGyumriProps = {
  readonly eyebrow: string;
  readonly cityName: readonly string[];
  readonly standfirst: string;
  readonly figures: readonly {
    readonly value: number;
    readonly suffix: string;
    readonly label: string;
  }[];
  readonly venues: readonly { readonly name: string; readonly detail: string }[];
  readonly subline: string;
  readonly cta: string;
  /** Frames per full sweep of the arcade light. */
  readonly archPeriod: number;
};

export const cityShowcaseGyumriDefaultProps: CityShowcaseGyumriProps = {
  eyebrow: "City guide",
  cityName: ["Gyumri"],
  standfirst:
    "Armenia's second city, and the first outside Yerevan where every sport on the app has somewhere to play.",
  figures: [
    { value: 34, suffix: "", label: "venues live" },
    { value: 6, suffix: "", label: "sports covered" },
    { value: 0, suffix: "%", label: "commission, as everywhere" },
  ],
  venues: [
    { name: "Shirak Arena", detail: "Football · 7-a-side · floodlit" },
    { name: "Vardanants Hall", detail: "Basketball & volleyball · indoor" },
    { name: "Kumayri Courts", detail: "Tennis · clay · four courts" },
  ],
  subline: "Same live availability, same instant confirmation, same zero commission.",
  cta: "Browse Gyumri venues",
  archPeriod: 120,
};

export const CityShowcaseGyumri: FC<CityShowcaseGyumriProps> = ({
  eyebrow,
  cityName,
  standfirst,
  figures,
  venues,
  subline,
  cta,
  archPeriod,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME, 1080);

  const ctaP = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 230,
    durationInFrames: 28,
  });

  const tints = [BRAND.primary, BRAND.cyan, BRAND.primary];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} tint={BRAND.amber} />
      </Sequence>

      <Sequence name="Arcade">
        <AbsoluteFill>
          <Arcade frame={frame} arches={7} archPeriod={archPeriod} />
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
            <Sequence name="Header">
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

            <Sequence name="City name">
              <div
                style={{
                  marginTop: 22,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 118,
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

            <Sequence name="Standfirst">
              <div
                style={{
                  ...riseStyle(frame, fps, 40, 16, 26),
                  marginTop: 24,
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  lineHeight: 1.5,
                  color: BRAND.fgSoft,
                }}
              >
                {standfirst}
              </div>
            </Sequence>

            <Sequence name="Figures">
              <div
                style={{
                  marginTop: 44,
                  paddingTop: 36,
                  borderTop: `1px solid ${BRAND.border}`,
                  display: "flex",
                  gap: 24,
                }}
              >
                {figures.map((figure, i) => (
                  <Figure
                    key={figure.label}
                    frame={frame}
                    fps={fps}
                    value={figure.value}
                    suffix={figure.suffix}
                    label={figure.label}
                    delay={62 + i * 16}
                    tint={tints[i % tints.length]}
                  />
                ))}
              </div>
            </Sequence>
          </div>

          <div>
            <Sequence name="Venues">
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {venues.map((venue, i) => (
                  <VenueRow
                    key={venue.name}
                    frame={frame}
                    fps={fps}
                    name={venue.name}
                    detail={venue.detail}
                    delay={132 + i * 14}
                  />
                ))}
              </div>
            </Sequence>

            <Sequence name="Subline">
              <div
                style={{
                  ...riseStyle(frame, fps, 210, 14, 26),
                  marginTop: 28,
                  fontFamily: FONT_MONO,
                  fontSize: 21,
                  letterSpacing: "0.02em",
                  color: BRAND.muted,
                }}
              >
                {subline}
              </div>
            </Sequence>

            <Sequence name="CTA">
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
                      [250, 262, 274],
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
