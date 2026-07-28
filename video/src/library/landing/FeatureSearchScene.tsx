/**
 * FeatureSearchScene — step one of "How it works" in `src/pages/HomePage.tsx`:
 * "Find your court". Reproduces the HeroSearch control and the venue result
 * cards as motion, without a single screenshot.
 * 1920×1080 · 30fps · 300 frames (10s) · one-shot scene.
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
  IconSearch,
  IconStar,
  MaskedWords,
  Panel,
  StageWash,
  alpha,
  groupNumber,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   step number + eyebrow
 *  10   headline
 *  46   body copy
 *  62   search bar arrives
 *  84   query types in            (linear — typing is linear)
 * 140   filter chips select, 9f apart
 * 172   three result cards land on a stagger
 * 244   the result count settles
 *
 * ── Why the caret and the typing are `interpolate`, not `spring` ─────────
 * Typing is the one motion in this family that is genuinely linear: a person
 * enters characters at a roughly constant rate, and springing the substring
 * index would produce a burst of characters followed by a crawl, which reads
 * as a stutter rather than as typing. `Math.floor` on a linear interpolate
 * gives a clean per-character step with no per-frame state — important,
 * because Remotion renders frames out of order across workers and any hidden
 * state would tear.
 *
 * Everything that *arrives* — the bar, the chips, the cards — is a spring.
 */

const SETTLED_FRAME = 268;

const FilterChip: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly label: string;
  readonly delay: number;
  readonly selected: boolean;
  readonly selectAt: number;
}> = ({ frame, fps, label, delay, selected, selectAt }) => {
  const enter = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay,
    durationInFrames: 24,
  });
  const pick = selected
    ? spring({
        frame,
        fps,
        config: { damping: 14, mass: 0.5, stiffness: 180 },
        delay: selectAt,
        durationInFrames: 22,
      })
    : 0;

  return (
    <div
      style={{
        opacity: interpolate(enter, [0, 0.4], [0, 1], CLAMP),
        transform: `translateY(${interpolate(enter, [0, 1], [14, 0])}px) scale(${
          1 + 0.05 * pick * (1 - pick)
        })`,
        padding: "14px 26px",
        borderRadius: 999,
        border: `1px solid ${
          pick > 0.5 ? BRAND.primary : BRAND.border
        }`,
        backgroundColor:
          pick > 0 ? alpha(BRAND.primary, 0.16 * pick) : BRAND.surface2,
        color: pick > 0.5 ? BRAND.primary : BRAND.fgSoft,
        fontFamily: FONT_SANS,
        fontSize: 24,
        fontWeight: 500,
      }}
    >
      {label}
    </div>
  );
};

type Result = {
  readonly name: string;
  readonly district: string;
  readonly sport: string;
  readonly price: number;
  readonly rating: number;
};

const ResultCard: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly result: Result;
  readonly delay: number;
  readonly currency: string;
}> = ({ frame, fps, result, delay, currency }) => {
  const p = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay,
    durationInFrames: 30,
  });

  return (
    <div
      style={{
        flex: "1 1 0",
        opacity: interpolate(p, [0, 0.4], [0, 1], CLAMP),
        transform: `translateY(${interpolate(p, [0, 1], [46, 0])}px)`,
      }}
    >
      <Panel padding={0} radius={26} style={{ overflow: "hidden" }}>
        {/*
          Stand-in for the venue photograph. A gradient plate rather than an
          <Img>: this family is fully self-contained, and a headless render
          cannot fetch an asset. The plate carries the sport's chart colour, so
          the three cards still read as three different venues.
        */}
        <div
          style={{
            height: 168,
            background: `linear-gradient(135deg, ${alpha(
              BRAND.primary,
              0.22,
            )} 0%, ${alpha(BRAND.cyan, 0.14)} 52%, ${alpha(BRAND.bg, 0.9)} 100%)`,
            borderBottom: `1px solid ${BRAND.border}`,
            display: "flex",
            alignItems: "flex-end",
            padding: 20,
          }}
        >
          <span
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              backgroundColor: alpha(BRAND.bg, 0.72),
              border: `1px solid ${BRAND.border}`,
              fontFamily: FONT_SANS,
              fontSize: 19,
              color: BRAND.fgSoft,
            }}
          >
            {result.sport}
          </span>
        </div>

        <div style={{ padding: 28 }}>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 30,
              fontWeight: 600,
              color: BRAND.fg,
              letterSpacing: "-0.015em",
            }}
          >
            {result.name}
          </div>
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: FONT_SANS,
              fontSize: 21,
              color: BRAND.muted,
            }}
          >
            <IconPin size={20} />
            {result.district}
          </div>
          <div
            style={{
              marginTop: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 26,
                fontVariantNumeric: "tabular-nums",
                color: BRAND.fg,
              }}
            >
              {currency} {groupNumber(result.price)}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: FONT_MONO,
                fontSize: 22,
                color: BRAND.amber,
              }}
            >
              <IconStar size={20} />
              {result.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </Panel>
    </div>
  );
};

export type FeatureSearchSceneProps = {
  readonly stepNumber: string;
  readonly eyebrow: string;
  readonly headline: readonly string[];
  readonly accentFrom: number;
  readonly body: string;
  readonly query: string;
  readonly filters: readonly string[];
  /** Indices into `filters` that get picked on camera. */
  readonly selectedFilters: readonly number[];
  readonly results: readonly Result[];
  readonly currency: string;
  readonly resultCount: number;
};

export const featureSearchSceneDefaultProps: FeatureSearchSceneProps = {
  stepNumber: "01",
  eyebrow: "Search",
  headline: ["Find", "your", "court."],
  accentFrom: 1,
  body: "Filter by sport, neighbourhood and time. Every venue is verified, with real photos and the actual price — no fee added at checkout.",
  query: "Football pitch in Kentron, tonight",
  filters: ["Football", "Kentron", "Tonight", "Indoor", "Under 15,000"],
  selectedFilters: [0, 1, 2],
  results: [
    { name: "Ararat Arena", district: "Kentron, Yerevan", sport: "Football · 5-a-side", price: 12000, rating: 4.8 },
    { name: "Nairi Sports Hall", district: "Arabkir, Yerevan", sport: "Football · Futsal", price: 9500, rating: 4.6 },
    { name: "Hrazdan Fields", district: "Shengavit, Yerevan", sport: "Football · 7-a-side", price: 14000, rating: 4.9 },
  ],
  currency: "AMD",
  resultCount: 34,
};

export const FeatureSearchScene: FC<FeatureSearchSceneProps> = ({
  stepNumber,
  eyebrow,
  headline,
  accentFrom,
  body,
  query,
  filters,
  selectedFilters,
  results,
  currency,
  resultCount,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME);

  const bar = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 62,
    durationInFrames: 30,
  });

  /** Linear by nature — see the header note. */
  const typedChars = Math.floor(
    interpolate(frame, [84, 84 + query.length * 1.6], [0, query.length], CLAMP),
  );
  const typed = query.substring(0, typedChars);
  const typing = frame >= 84 && typedChars < query.length;
  /** Caret blinks on a 20-frame modulo cycle, and rests solid while typing. */
  const caretOn = typing || Math.floor(frame / 10) % 2 === 0;

  const countP = spring({
    frame,
    fps,
    config: { damping: 200, mass: 1, stiffness: 110 },
    delay: 244,
    durationInFrames: 30,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} />
      </Sequence>

      <AbsoluteFill style={{ padding: "84px 110px", justifyContent: "center" }}>
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
                width: 120,
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
              fontFamily: FONT_DISPLAY,
              fontSize: 88,
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
              accentFrom={accentFrom}
            />
          </div>
        </Sequence>

        <Sequence name="Body">
          <div
            style={{
              ...riseStyle(frame, fps, 46, 18),
              marginTop: 22,
              maxWidth: 900,
              fontFamily: FONT_SANS,
              fontSize: 27,
              lineHeight: 1.55,
              color: BRAND.fgSoft,
            }}
          >
            {body}
          </div>
        </Sequence>

        <Sequence name="Search bar">
          <div
            style={{
              marginTop: 46,
              opacity: interpolate(bar, [0, 0.4], [0, 1], CLAMP),
              transform: `translateY(${interpolate(bar, [0, 1], [26, 0])}px)`,
              display: "flex",
              alignItems: "center",
              gap: 22,
              height: 96,
              padding: "0 32px",
              borderRadius: 24,
              backgroundColor: BRAND.surface2,
              /* The design system's `--border-interactive`: a field's edge is a
                 UI component boundary, and WCAG 1.4.11 wants 3:1 for that. */
              border: `1px solid ${alpha(BRAND.borderStrong, 1)}`,
              boxShadow: `0 18px 40px -22px rgba(3,10,8,0.9)`,
            }}
          >
            <span style={{ color: BRAND.primary, display: "inline-flex" }}>
              <IconSearch size={32} />
            </span>
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: 30,
                color: typed.length > 0 ? BRAND.fg : BRAND.muted,
              }}
            >
              {typed.length > 0 ? typed : "Sport, city or venue"}
            </span>
            <span
              style={{
                width: 3,
                height: 36,
                backgroundColor: BRAND.primary,
                opacity: caretOn && frame >= 84 ? 1 : 0,
              }}
            />
          </div>
        </Sequence>

        <Sequence name="Filters">
          <div style={{ marginTop: 26, display: "flex", gap: 16 }}>
            {filters.map((filter, i) => {
              let selectedRank = -1;
              for (let j = 0; j < selectedFilters.length; j += 1) {
                if (selectedFilters[j] === i) {
                  selectedRank = j;
                }
              }
              return (
                <FilterChip
                  key={filter}
                  frame={frame}
                  fps={fps}
                  label={filter}
                  delay={104 + i * 6}
                  selected={selectedRank >= 0}
                  selectAt={140 + Math.max(0, selectedRank) * 9}
                />
              );
            })}
            <div
              style={{
                marginLeft: "auto",
                alignSelf: "center",
                fontFamily: FONT_MONO,
                fontSize: 24,
                fontVariantNumeric: "tabular-nums",
                color: BRAND.primary,
                opacity: interpolate(countP, [0, 0.4], [0, 1], CLAMP),
              }}
            >
              {Math.round(countP * resultCount)} venues match
            </div>
          </div>
        </Sequence>

        <Sequence name="Results">
          <div style={{ marginTop: 40, display: "flex", gap: 26 }}>
            {results.map((result, i) => (
              <ResultCard
                key={result.name}
                frame={frame}
                fps={fps}
                result={result}
                delay={172 + i * 12}
                currency={currency}
              />
            ))}
          </div>
        </Sequence>
      </AbsoluteFill>

      <Sequence name="Sheen">
        <AbsoluteFill
          style={{
            background: `linear-gradient(104deg, transparent 42%, ${alpha(
              BRAND.fg,
              0.045,
            )} 50%, transparent 58%)`,
            transform: `translateX(${interpolate(frame, [206, 262], [-120, 120], {
              ...CLAMP,
              easing: EASE_OUT_EXPO,
            })}%)`,
            opacity: interpolate(frame, [206, 220, 250, 262], [0, 1, 1, 0], CLAMP),
          }}
        />
      </Sequence>

      <Sequence name="Grain">
        <Grain frame={frame} period={period} scale={scale} />
      </Sequence>
    </AbsoluteFill>
  );
};
