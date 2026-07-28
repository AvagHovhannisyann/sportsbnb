/**
 * StatVenuesListed — the "venues live" number from the landing hero badge in
 * `src/pages/HomePage.tsx`, as a standalone square stat card for social and
 * for the marketing site's proof strip.
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
  Meter,
  Panel,
  StageWash,
  alpha,
  groupNumber,
  riseStyle,
  useCountUp,
  useSceneFrame,
} from "./shared";

/* ── Why the counter is a spring, not a tween ─────────────────────────────
 * A number that ramps linearly and stops dead reads as a progress bar, not as
 * a value settling. The counter here is an **overdamped** spring (damping 200
 * against stiffness 100): overdamped is monotonic, so the count only ever
 * climbs — a counter that overshoots 248 to 253 and comes back does not read
 * as momentum, it reads as a bug.
 *
 * `durationInFrames` makes the arrival exact rather than asymptotic. Remotion
 * time-stretches the spring so it is at rest at `delay + duration` and
 * short-circuits to `to` past that point, so `Math.round(p · value)` is
 * *exactly* `value` from that frame onward — no 247.9997 flicker and no clamp.
 *
 * The same `p` drives the meter and the venue-dot grid, so the number, the bar
 * and the dots are one motion rather than three animations that agree.
 *
 * ── Stagger ───────────────────────────────────────────────────────────────
 * Block level via `<Sequence>`: eyebrow 0 → numeral 20 → meter 46 → dot grid
 * 62 → footnote 190. The dots then fill on a diagonal, so the grid reads as
 * being populated rather than as switching on.
 */

const SETTLED_FRAME = 300;

const DotGrid: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly cols: number;
  readonly rows: number;
  readonly progress: number;
  readonly startAt: number;
}> = ({ frame, fps, cols, rows, progress, startAt }) => {
  const total = cols * rows;
  /** Dots light in proportion to the counter, so they cannot disagree with it. */
  const litCount = progress * total;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 12,
      }}
    >
      {Array.from({ length: total }, (_unused, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        /** Diagonal order — the grid fills like a wave, not like a raster. */
        const rank = col + row;
        const p = spring({
          frame,
          fps,
          config: ENTER_SPRING,
          delay: startAt + rank * 3,
          durationInFrames: 22,
        });
        const on = i < litCount;
        const a = on ? 1 : 0.18;

        return (
          <div
            key={`dot-${i}`}
            style={{
              aspectRatio: "1 / 1",
              borderRadius: 8,
              backgroundColor: on
                ? alpha(BRAND.primary, 0.16)
                : alpha(BRAND.fg, 0.04),
              border: `1px solid ${
                on ? alpha(BRAND.primary, 0.4) : alpha(BRAND.border, 0.8)
              }`,
              opacity: interpolate(p, [0, 0.4], [0, a], CLAMP),
              transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
            }}
          />
        );
      })}
    </div>
  );
};

export type StatVenuesListedProps = {
  readonly eyebrow: string;
  /** The headline figure. */
  readonly value: number;
  readonly suffix: string;
  readonly label: string;
  readonly footnote: string;
  /** Denominator for the meter — the target the figure is measured against. */
  readonly target: number;
  readonly gridCols: number;
  readonly gridRows: number;
};

export const statVenuesListedDefaultProps: StatVenuesListedProps = {
  eyebrow: "Venues listed",
  value: 248,
  suffix: "+",
  label: "verified venues live on SportsBnB",
  footnote: "Football, tennis, basketball, padel and swimming — every one checked before it goes live",
  target: 300,
  gridCols: 12,
  gridRows: 4,
};

export const StatVenuesListed: FC<StatVenuesListedProps> = ({
  eyebrow,
  value,
  suffix,
  label,
  footnote,
  target,
  gridCols,
  gridRows,
}) => {
  /* Authored against a 1080 square, so `scale` resolves to 1 here and px
     values below survive a re-registration at 1440 or 2160. */
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME, 1080);

  const { shown, progress } = useCountUp(frame, fps, value, 20, 120);
  /** The meter reads the figure against its target, not against itself. */
  const meterProgress = progress * (value / target);

  const numeralEnter = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 14,
    durationInFrames: 30,
  });

  /** One-shot land flash, clamped to 0 well before the tail. */
  const land = interpolate(frame, [140, 158, 200], [0, 0.3, 0], {
    ...CLAMP,
    easing: EASE_OUT_EXPO,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} />
      </Sequence>

      <AbsoluteFill style={{ padding: 64 }}>
        <Panel
          padding={56}
          radius={40}
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderColor: alpha(BRAND.primary, 0.12 + land * 0.5),
          }}
        >
          <Sequence name="Header" layout="none">
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

          <Sequence name="Numeral" layout="none">
            <div
              style={{
                opacity: interpolate(numeralEnter, [0, 0.4], [0, 1], CLAMP),
                transform: `translateY(${interpolate(
                  numeralEnter,
                  [0, 1],
                  [30, 0],
                )}px)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  letterSpacing: "-0.045em",
                  color: BRAND.fg,
                  lineHeight: 0.92,
                }}
              >
                <span
                  style={{
                    fontSize: 236,
                    fontVariantNumeric: "tabular-nums",
                    textShadow: `0 0 ${60 * land}px ${alpha(BRAND.primary, land)}`,
                  }}
                >
                  {groupNumber(shown)}
                </span>
                <span style={{ fontSize: 128, color: BRAND.primary }}>{suffix}</span>
              </div>

              <div
                style={{
                  marginTop: 18,
                  maxWidth: 620,
                  fontFamily: FONT_SANS,
                  fontSize: 34,
                  lineHeight: 1.4,
                  color: BRAND.fgSoft,
                }}
              >
                {label}
              </div>
            </div>
          </Sequence>

          <Sequence name="Meter" layout="none">
            <div style={{ ...riseStyle(frame, fps, 46, 12, 24) }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 14,
                  fontFamily: FONT_MONO,
                  fontSize: 20,
                  fontVariantNumeric: "tabular-nums",
                  color: BRAND.muted,
                }}
              >
                <span>0</span>
                <span>target {groupNumber(target)}</span>
              </div>
              <Meter progress={meterProgress} height={10} radius={5} />
            </div>
          </Sequence>

          <Sequence name="Dot grid" layout="none">
            <DotGrid
              frame={frame}
              fps={fps}
              cols={gridCols}
              rows={gridRows}
              progress={progress * (value / target)}
              startAt={62}
            />
          </Sequence>

          <Sequence name="Footnote" layout="none">
            <div
              style={{
                ...riseStyle(frame, fps, 190, 12, 26),
                fontFamily: FONT_SANS,
                fontSize: 22,
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
