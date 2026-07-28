/**
 * LowerThirdVenue — the venue name plate: name, district, and a row of chips
 * for surface, hourly price and rating, each snapping in on its own beat. Runs
 * over drone and walkthrough footage in venue promos and the discovery reel, so
 * a viewer can price a pitch without the voiceover having to say it.
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
  TRACKING_TIGHT,
  amber,
  chalk,
  courtGreen,
  hairline,
  ink,
  useBrandFrame,
} from "./brandKit";

export type LowerThirdVenueProps = {
  readonly venueName: string;
  readonly district: string;
  /** Surface chip, e.g. "3G turf" or "Indoor parquet". */
  readonly surface: string;
  /** Hourly price, in whole currency units. */
  readonly pricePerHour: number;
  /** Currency label. Kept as text so the plate works outside AMD too. */
  readonly currency: string;
  /** 0 – 5, shown to one decimal. */
  readonly rating: number;
  readonly reviewCount: number;
  readonly enterAtFrame: number;
  readonly exitAtFrame: number;
  readonly insetX: number;
  readonly insetY: number;
};

export const lowerThirdVenueDefaultProps: LowerThirdVenueProps = {
  venueName: "Arena Nord",
  district: "Ajapnyak, Yerevan",
  surface: "3G turf · floodlit",
  pricePerHour: 12000,
  currency: "AMD",
  rating: 4.8,
  reviewCount: 213,
  enterAtFrame: 6,
  exitAtFrame: 170,
  insetX: 0.07,
  insetY: 0.13,
};

/**
 * Thousands separators without `toLocaleString`. The render runs headless with
 * an unknown ICU locale, and a price that silently changes shape between the
 * studio and the farm is worse than one that is plainly formatted.
 */
const groupThousands = (value: number): string => {
  const rounded = Math.round(Math.abs(value));
  const digits = String(rounded);
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) {
      out += ",";
    }
    out += digits.charAt(i);
  }
  return value < 0 ? `-${out}` : out;
};

type Chip = {
  readonly key: string;
  readonly text: string;
  readonly color: string;
  readonly strong: boolean;
};

export const LowerThirdVenue: FC<LowerThirdVenueProps> = ({
  venueName,
  district,
  surface,
  pricePerHour,
  currency,
  rating,
  reviewCount,
  enterAtFrame,
  exitAtFrame,
  insetX,
  insetY,
}) => {
  const frame = useBrandFrame(0.45);
  const { fps, width, height } = useVideoConfig();

  const scale = width / 1920;
  const nameSize = height * 0.055;

  const barIn = spring({
    frame,
    fps,
    delay: enterAtFrame,
    config: SPRING_ENTER,
    durationInFrames: 20,
  });
  const nameIn = spring({
    frame,
    fps,
    delay: enterAtFrame + 8,
    config: SPRING_ENTER,
    durationInFrames: 26,
  });
  const districtIn = spring({
    frame,
    fps,
    delay: enterAtFrame + 14,
    config: SPRING_ENTER,
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

  const chips: readonly Chip[] = [
    { key: "surface", text: surface, color: chalk(0.72), strong: false },
    {
      key: "price",
      text: `${groupThousands(pricePerHour)} ${currency} / hour`,
      color: BRAND.primary,
      strong: true,
    },
    {
      key: "rating",
      text: `★ ${rating.toFixed(1)} · ${groupThousands(reviewCount)} reviews`,
      color: amber(0.95),
      strong: false,
    },
  ];

  const gate = (p: number) => ({
    overflow: "hidden" as const,
    paddingTop: nameSize * 0.16,
    paddingBottom: nameSize * 0.16,
    marginTop: -nameSize * 0.16,
    marginBottom: -nameSize * 0.16,
    opacity: Math.max(0, p - out),
  });

  return (
    <AbsoluteFill>
      <Sequence name="Venue plate" layout="none">
        <AbsoluteFill
          style={{
            alignItems: "flex-start",
            justifyContent: "flex-end",
            paddingLeft: width * insetX,
            paddingBottom: height * insetY,
          }}
        >
          {/* Scrim: the plate has to survive bright daytime pitch footage. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: height * 0.52,
              background: `linear-gradient(to top, ${ink(0.82 * alive)} 0%, ${ink(0.45 * alive)} 42%, ${ink(0)} 100%)`,
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

            <div style={{ marginLeft: 22 * scale }}>
              <div style={gate(nameIn)}>
                <div
                  style={{
                    fontFamily: DISPLAY_FONT,
                    fontSize: nameSize,
                    fontWeight: 700,
                    letterSpacing: TRACKING_TIGHT,
                    lineHeight: 1.05,
                    color: BRAND.foreground,
                    transform: `translateY(${interpolate(
                      Math.max(0, nameIn - out),
                      [0, 1],
                      [nameSize * 1.15, 0],
                      { easing: EASE_OUT_EXPO },
                    )}px)`,
                    whiteSpace: "nowrap",
                    textShadow: `0 ${4 * scale}px ${20 * scale}px ${ink(0.8)}`,
                  }}
                >
                  {venueName}
                </div>
              </div>

              <div style={gate(districtIn)}>
                <div
                  style={{
                    marginTop: nameSize * 0.16,
                    fontFamily: MONO_FONT,
                    fontSize: nameSize * 0.34,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    color: chalk(0.6),
                    transform: `translateY(${interpolate(
                      Math.max(0, districtIn - out),
                      [0, 1],
                      [nameSize * 0.8, 0],
                      { easing: EASE_OUT_EXPO },
                    )}px)`,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{ letterSpacing: TRACKING_EYEBROW, marginRight: `-${TRACKING_EYEBROW}` }}
                  >
                    {district}
                  </span>
                </div>
              </div>

              {/* Chips land one at a time, 6 frames apart — the plate should
                  assemble in front of the viewer, not appear complete. */}
              <div style={{ display: "flex", gap: 12 * scale, marginTop: nameSize * 0.42 }}>
                {chips.map((chip, i) => {
                  const chipIn = spring({
                    frame,
                    fps,
                    delay: enterAtFrame + 22 + i * 6,
                    config: SPRING_POP,
                    durationInFrames: 24,
                  });
                  const shown = Math.max(0, chipIn - out);
                  if (shown <= 0) {
                    return null;
                  }
                  return (
                    <div
                      key={chip.key}
                      style={{
                        paddingLeft: 18 * scale,
                        paddingRight: 18 * scale,
                        paddingTop: 10 * scale,
                        paddingBottom: 10 * scale,
                        borderRadius: 999,
                        border: `1px solid ${chip.strong ? courtGreen(0.45) : hairline(1)}`,
                        backgroundColor: chip.strong ? BRAND.primarySoft : ink(0.6),
                        opacity: shown,
                        transform: `translateY(${interpolate(shown, [0, 1], [16 * scale, 0])}px) scale(${interpolate(
                          shown,
                          [0, 1],
                          [0.86, 1],
                        )})`,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: MONO_FONT,
                          fontSize: nameSize * 0.3,
                          fontWeight: 500,
                          color: chip.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {chip.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
