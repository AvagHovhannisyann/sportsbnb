/**
 * HeroFloodlightHaze — ambient plate evoking floodlit five-a-side at dusk, the
 * scene the real hero photograph shows in `HomePage.tsx`. Use it where the
 * photograph is not available (owner landing, city pages, `/for-owners`).
 * 1920×1080 · 30fps · 270 frames (9s) · seamless loop.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate } from "remotion";

import {
  BRAND,
  CLAMP,
  EASE_OUT_EXPO,
  Grain,
  Scrim,
  TAU,
  alpha,
  bloom,
  bloomWindow,
  loopT,
  useLoopFrame,
  wrap,
  type FrameContext,
} from "./shared";

/* ── Why this loops ────────────────────────────────────────────────────────
 * This plate contains the family's only genuinely **one-way** motion — the X
 * travel of the haze shafts — and it is the reason `bloom()` has to be exactly
 * zero rather than nearly zero.
 *
 * A shaft's opacity is `peak · bloom(local)`. Remotion's `spring()` returns
 * exactly `from` at local frame ≤ 0 and early-returns exactly `to` past
 * `durationInFrames`, so `bloom` is exactly 0 at local frame 0 and exactly
 * `1 - 1 = 0` for every local frame past `hold + fall`. The frame on which a
 * shaft's travel snaps back to its start is therefore a frame on which the
 * shaft is not painted at all — the discontinuity exists in the arithmetic and
 * never reaches a pixel.
 *
 * Everything else closes on itself directly: pylon lamp brightness is a
 * `bloom` on a wrapped local frame, the dusk-sky gradient is a full-period
 * cosine, and the haze bed drifts by exactly one tile.
 *
 * ── Why it stays readable ─────────────────────────────────────────────────
 * Shaft peaks are 0.055 / 0.045 / 0.03 alpha — the brightest single layer on
 * the plate is roughly 5% white-equivalent light spread over 400px, which is
 * an order of magnitude below what would trouble headline copy. The lamps
 * themselves are small and parked in the top eighth, above where any hero
 * headline sits, and `Scrim` pools over the copy column regardless.
 */

type Shaft = {
  readonly id: string;
  readonly tint: string;
  /** Width in design px before the tilt widens its footprint. */
  readonly width: number;
  readonly tilt: number;
  /** Travel, % of canvas. */
  readonly from: number;
  readonly to: number;
  readonly peak: number;
};

const SHAFTS: readonly Shaft[] = [
  { id: "shaft-a", tint: BRAND.primary, width: 420, tilt: -12, from: -26, to: 124, peak: 0.055 },
  { id: "shaft-b", tint: BRAND.cyan, width: 300, tilt: -16, from: 126, to: -24, peak: 0.045 },
  { id: "shaft-c", tint: BRAND.fg, width: 220, tilt: -9, from: -22, to: 120, peak: 0.03 },
];

const HazeShafts: FC<FrameContext & { readonly intensity: number }> = ({
  frame,
  fps,
  period,
  scale,
  intensity,
}) => {
  const win = bloomWindow(period, 0.26, 0.39, 0.5);
  const travelEnd = win.hold + win.fall;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {SHAFTS.map((shaft, i) => {
        /** Shafts enter a third of a loop apart. */
        const local = wrap(frame - Math.round((i * period) / SHAFTS.length), period);
        const lit = bloom(local, fps, win);

        /**
         * The one-way part. Eased with the design system's own
         * `--ease-out-expo`, so the sweep decelerates into the far edge rather
         * than sliding at constant speed. Safe because `lit` is exactly 0 both
         * before this travel starts and after it ends.
         */
        const x = interpolate(local, [0, travelEnd], [shaft.from, shaft.to], {
          ...CLAMP,
          easing: EASE_OUT_EXPO,
        });

        const w = shaft.width * scale;
        const h = 1080 * 2.4 * scale;

        return (
          <div
            key={shaft.id}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: "50%",
              width: w,
              height: h,
              marginLeft: -w / 2,
              marginTop: -h / 2,
              transform: `rotate(${shaft.tilt}deg)`,
              background: `linear-gradient(90deg, ${alpha(shaft.tint, 0)} 0%, ${alpha(
                shaft.tint,
                shaft.peak * 0.35 * intensity,
              )} 26%, ${alpha(shaft.tint, shaft.peak * intensity)} 50%, ${alpha(
                shaft.tint,
                shaft.peak * 0.35 * intensity,
              )} 74%, ${alpha(shaft.tint, 0)} 100%)`,
              opacity: lit,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

type Pylon = {
  readonly id: string;
  /** Head position, % of canvas. */
  readonly x: number;
  readonly y: number;
  readonly lampCount: number;
  readonly headWidth: number;
  readonly peak: number;
};

const PYLONS: readonly Pylon[] = [
  { id: "pylon-left", x: 13, y: 11, lampCount: 6, headWidth: 190, peak: 0.3 },
  { id: "pylon-mid", x: 47, y: 7, lampCount: 6, headWidth: 168, peak: 0.24 },
  { id: "pylon-right", x: 83, y: 13, lampCount: 6, headWidth: 210, peak: 0.34 },
];

/**
 * Three floodlight heads across the top eighth of the frame, each warming and
 * cooling on its own `bloom` a third of a loop apart — so the plate always has
 * one bank coming up and two easing off. The lamps are drawn as a rank of
 * small rectangles rather than as a glow blob, which is what makes them read
 * as fixtures instead of as lens flare.
 */
const Pylons: FC<FrameContext & { readonly intensity: number }> = ({
  frame,
  fps,
  period,
  scale,
  intensity,
}) => {
  const win = bloomWindow(period, 0.24, 0.36, 0.42);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {PYLONS.map((pylon, i) => {
        const local = wrap(frame - Math.round((i * period) / PYLONS.length), period);
        const lit = bloom(local, fps, win);
        const w = pylon.headWidth * scale;
        const lampW = (w / pylon.lampCount) * 0.62;
        const lampH = lampW * 0.72;
        const a = pylon.peak * (0.42 + 0.58 * lit) * intensity;

        return (
          <div
            key={pylon.id}
            style={{
              position: "absolute",
              left: `${pylon.x}%`,
              top: `${pylon.y}%`,
              width: w,
              marginLeft: -w / 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: lampH * 0.4,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: lampW * 0.5,
                padding: lampW * 0.34,
                borderRadius: lampW * 0.4,
                border: `1px solid ${alpha(BRAND.border, 0.8)}`,
                backgroundColor: alpha(BRAND.bg, 0.6),
              }}
            >
              {Array.from({ length: pylon.lampCount }, (_unused, j) => (
                <div
                  key={`${pylon.id}-lamp-${j}`}
                  style={{
                    width: lampW,
                    height: lampH,
                    borderRadius: lampW * 0.18,
                    backgroundColor: alpha(BRAND.fg, a),
                    boxShadow: `0 0 ${lampW * 2.6}px ${lampW * 0.5}px ${alpha(
                      BRAND.primary,
                      a * 0.38,
                    )}`,
                  }}
                />
              ))}
            </div>
            {/* Mast — a hairline, so the fixture has somewhere to hang from. */}
            <div
              style={{
                width: Math.max(1, 2 * scale),
                height: 120 * scale,
                background: `linear-gradient(to bottom, ${alpha(
                  BRAND.borderStrong,
                  0.7,
                )} 0%, ${alpha(BRAND.borderStrong, 0)} 100%)`,
              }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export type HeroFloodlightHazeProps = {
  /** Scales the whole light budget. 1 is the authored, measured ceiling. */
  readonly intensity: number;
  /** Whether the floodlight fixtures are drawn, or only their haze. */
  readonly showPylons: boolean;
  /** Where the readability pool sits, % of canvas. */
  readonly focusX: number;
  readonly focusY: number;
};

export const heroFloodlightHazeDefaultProps: HeroFloodlightHazeProps = {
  intensity: 1,
  showPylons: true,
  focusX: 34,
  focusY: 52,
};

export const HeroFloodlightHaze: FC<HeroFloodlightHazeProps> = ({
  intensity,
  showPylons,
  focusX,
  focusY,
}) => {
  const ctx = useLoopFrame(0.33);
  const t = loopT(ctx.frame, ctx.period);

  /** Dusk sky, breathing on one full cosine period — exact at the seam. */
  const dusk = 0.5 + 0.5 * Math.cos(TAU * t + 1.6);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Dusk sky">
        <AbsoluteFill style={{ backgroundColor: BRAND.bg }} />
        <AbsoluteFill
          style={{
            background: `linear-gradient(to bottom, ${alpha(
              BRAND.violet,
              interpolate(dusk, [0, 1], [0.05, 0.085]) * intensity,
            )} 0%, transparent 46%)`,
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 110% 56% at 50% 116%, ${alpha(
              BRAND.surface1,
              0.94,
            )} 0%, transparent 72%)`,
          }}
        />
      </Sequence>

      <Sequence name="Haze shafts">
        <HazeShafts {...ctx} intensity={intensity} />
      </Sequence>

      {showPylons ? (
        <Sequence name="Floodlight pylons">
          <Pylons {...ctx} intensity={intensity} />
        </Sequence>
      ) : null}

      <Sequence name="Readability scrim">
        <Scrim scale={ctx.scale} focusX={focusX} focusY={focusY} />
      </Sequence>

      <Sequence name="Grain">
        {/* Slightly heavier than the family default: a haze plate is nearly all
            gradient, and gradient is exactly what bands on 8-bit output. */}
        <Grain frame={ctx.frame} period={ctx.period} scale={ctx.scale} opacity={0.065} />
      </Sequence>
    </AbsoluteFill>
  );
};
