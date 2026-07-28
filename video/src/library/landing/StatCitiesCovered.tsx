/**
 * StatCitiesCovered — cities SportsBnB covers, as a square stat card with the
 * Armenian map plotted from real coordinates. Third of the proof-strip trio
 * with StatVenuesListed and StatHoursBooked.
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
  IconPin,
  Panel,
  StageWash,
  alpha,
  loopT,
  riseStyle,
  useCountUp,
  useSceneFrame,
} from "./shared";

/* ── Coordinates, not decoration ──────────────────────────────────────────
 * The pins are placed from real latitude/longitude and projected with a plain
 * equirectangular mapping over Armenia's bounding box (lon 43.4…46.7,
 * lat 38.8…41.3), so the constellation on the card is the actual shape of the
 * country's cities rather than a pleasing scatter. Gyumri really does sit
 * north-west of Yerevan and Kapan really is that far south; a viewer from
 * Armenia will read the arrangement before they read the labels.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * The headline counts on an overdamped spring — monotonic, and exact at
 * `delay + duration` because `durationInFrames` is set. Each pin then drops in
 * on an *underdamped* spring 9 frames apart: a pin landing on a map should
 * have a little weight to it, which is the one place overshoot is expressive
 * rather than a misreport.
 *
 * The rings around the three named cities pulse on a **modulo cycle**
 * (`loopT(frame, ringPeriod)`), so they are continuous if this card is played
 * on repeat and carry no accumulating drift.
 */

const SETTLED_FRAME = 300;

type City = {
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
  /** Named cities get a label and a pulse ring; the rest are plain dots. */
  readonly featured: boolean;
};

/** Armenia's bounding box, used for the equirectangular projection. */
const BOUNDS = { lonMin: 43.4, lonMax: 46.7, latMin: 38.8, latMax: 41.3 };

const project = (city: City): { readonly x: number; readonly y: number } => ({
  x: ((city.lon - BOUNDS.lonMin) / (BOUNDS.lonMax - BOUNDS.lonMin)) * 100,
  /** Latitude grows northward, screen y grows downward — hence the 1 −. */
  y: (1 - (city.lat - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin)) * 100,
});

const CityMap: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly cities: readonly City[];
  readonly startAt: number;
  readonly ringPeriod: number;
}> = ({ frame, fps, cities, startAt, ringPeriod }) => {
  /** Modulo cycle — continuous across repeats. */
  const t = loopT(frame, ringPeriod);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Faint graticule, so the pins read as sitting on a map. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(to right, ${alpha(
            BRAND.border,
            0.5,
          )} 1px, transparent 1px), linear-gradient(to bottom, ${alpha(
            BRAND.border,
            0.5,
          )} 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          opacity: 0.5,
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, #000 0%, transparent 82%)",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, #000 0%, transparent 82%)",
        }}
      />

      {cities.map((city, i) => {
        const at = project(city);
        const p = spring({
          frame,
          fps,
          config: ENTER_SPRING,
          delay: startAt + i * 9,
          durationInFrames: 26,
        });
        if (p <= 0) {
          return null;
        }
        const size = city.featured ? 20 : 12;
        /** Ring phase offset per city, so they do not all breathe together. */
        const ring = loopT(t + i * 0.18, 1);

        return (
          <div
            key={city.name}
            style={{
              position: "absolute",
              left: `${at.x}%`,
              top: `${at.y}%`,
              transform: `translate(-50%, -50%) translateY(${interpolate(
                p,
                [0, 1],
                [-22, 0],
              )}px)`,
              opacity: interpolate(p, [0, 0.4], [0, 1], CLAMP),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative", width: size, height: size }}>
              {city.featured ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 999,
                    border: `2px solid ${BRAND.primary}`,
                    opacity: interpolate(ring, [0, 1], [0.55, 0], CLAMP),
                    transform: `scale(${interpolate(ring, [0, 1], [1, 3.4], {
                      easing: EASE_OUT_EXPO,
                    })})`,
                  }}
                />
              ) : null}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 999,
                  backgroundColor: city.featured ? BRAND.primary : BRAND.cyan,
                  boxShadow: `0 0 ${size}px ${alpha(
                    city.featured ? BRAND.primary : BRAND.cyan,
                    0.5,
                  )}`,
                }}
              />
            </div>
            {city.featured ? (
              <span
                style={{
                  marginTop: 10,
                  fontFamily: FONT_MONO,
                  fontSize: 20,
                  letterSpacing: "0.06em",
                  color: BRAND.fg,
                  whiteSpace: "nowrap",
                }}
              >
                {city.name}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export type StatCitiesCoveredProps = {
  readonly eyebrow: string;
  readonly value: number;
  readonly label: string;
  readonly cities: readonly City[];
  readonly footnote: string;
  /** Frames per pulse ring cycle on the featured cities. */
  readonly ringPeriod: number;
};

export const statCitiesCoveredDefaultProps: StatCitiesCoveredProps = {
  eyebrow: "Cities covered",
  value: 9,
  label: "Armenian cities with venues you can book tonight",
  cities: [
    { name: "Yerevan", lat: 40.18, lon: 44.51, featured: true },
    { name: "Gyumri", lat: 40.79, lon: 43.85, featured: true },
    { name: "Vanadzor", lat: 40.81, lon: 44.49, featured: true },
    { name: "Abovyan", lat: 40.27, lon: 44.63, featured: false },
    { name: "Hrazdan", lat: 40.5, lon: 44.77, featured: false },
    { name: "Armavir", lat: 40.15, lon: 44.03, featured: false },
    { name: "Ejmiatsin", lat: 40.17, lon: 44.29, featured: false },
    { name: "Ijevan", lat: 40.88, lon: 45.15, featured: false },
    { name: "Kapan", lat: 39.2, lon: 46.4, featured: false },
  ],
  footnote: "Yerevan, Gyumri and Vanadzor first — the rest of the country next",
  ringPeriod: 90,
};

export const StatCitiesCovered: FC<StatCitiesCoveredProps> = ({
  eyebrow,
  value,
  label,
  cities,
  footnote,
  ringPeriod,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME, 1080);
  const { shown } = useCountUp(frame, fps, value, 18, 96);

  const numeralEnter = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 12,
    durationInFrames: 30,
  });

  const land = interpolate(frame, [112, 130, 172], [0, 0.28, 0], {
    ...CLAMP,
    easing: EASE_OUT_EXPO,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} tint={BRAND.violet} />
      </Sequence>

      <AbsoluteFill style={{ padding: 64 }}>
        <Panel
          padding={56}
          radius={40}
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderColor: alpha(BRAND.primary, 0.12 + land * 0.5),
          }}
        >
          <Sequence name="Header">
            <div
              style={{
                ...riseStyle(frame, fps, 0, 14, 24),
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <span style={{ color: BRAND.primary, display: "inline-flex" }}>
                <IconPin size={28} />
              </span>
              <Eyebrow size={22}>{eyebrow}</Eyebrow>
            </div>
          </Sequence>

          <Sequence name="Numeral">
            <div
              style={{
                marginTop: 26,
                opacity: interpolate(numeralEnter, [0, 0.4], [0, 1], CLAMP),
                transform: `translateY(${interpolate(numeralEnter, [0, 1], [30, 0])}px)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 24,
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  letterSpacing: "-0.045em",
                  color: BRAND.fg,
                  lineHeight: 0.9,
                }}
              >
                <span
                  style={{
                    fontSize: 210,
                    fontVariantNumeric: "tabular-nums",
                    textShadow: `0 0 ${60 * land}px ${alpha(BRAND.primary, land)}`,
                  }}
                >
                  {shown}
                </span>
                <span
                  style={{
                    fontSize: 40,
                    fontWeight: 600,
                    color: BRAND.fgSoft,
                    maxWidth: 340,
                    lineHeight: 1.25,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {label}
                </span>
              </div>
            </div>
          </Sequence>

          <Sequence name="City map">
            <div style={{ flex: "1 1 0", marginTop: 34, minHeight: 0 }}>
              <CityMap
                frame={frame}
                fps={fps}
                cities={cities}
                startAt={54}
                ringPeriod={ringPeriod}
              />
            </div>
          </Sequence>

          <Sequence name="Footnote">
            <div
              style={{
                ...riseStyle(frame, fps, 186, 12, 26),
                marginTop: 24,
                fontFamily: FONT_SANS,
                fontSize: 23,
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
