/**
 * HeroAraratRidge — ambient plate: layered ridgelines drifting under a night
 * sky, the Ararat skyline Armenian players actually play under. Built for the
 * country/city landing headers ("Built for players in Yerevan") and the
 * `/for-owners` masthead.
 * 1920×1080 · 30fps · 300 frames (10s) · seamless loop.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate } from "remotion";

import {
  BRAND,
  Grain,
  Scrim,
  TAU,
  alpha,
  bloom,
  bloomWindow,
  loopT,
  noise,
  useLoopFrame,
  wrap,
  type FrameContext,
} from "./shared";

/* ── Why this loops ────────────────────────────────────────────────────────
 * The ridges are the interesting case, because a parallax scroll is the
 * archetypal one-way tween and would seam badly behind a headline.
 *
 * The fix is to make the terrain itself **periodic in x**. Each ridgeline is
 *
 *     h(x) = base − Σ aₙ · sin(2π · kₙ · x / L + φₙ)      with kₙ ∈ ℤ
 *
 * which satisfies `h(x + L) = h(x)` for every x, because each term completes a
 * whole number of cycles across L. The path is sampled once over `[-L, W + L]`
 * — one spare wavelength either side — and never changes: it is a *static* `d`
 * attribute. The only animated quantity is the layer's translate.
 *
 * That translate is taken **modulo one wavelength**:
 *
 *     shift = −wrap(L · laps · t, L)          ∈ (−L, 0]
 *
 * which does two things, both load-bearing:
 *
 *   1. It makes the seam exact. `wrap(0, L)` is 0 and `wrap(L · laps, L)` is 0
 *      for integer `laps`, so the transform serialises to the identical string
 *      at frame 0 and frame `period`, over an identical `d`. The two frames are
 *      byte-identical SVG. Without the modulo the seam rests on
 *      `h(x + L) === h(x)` holding *in IEEE 754*, and it does not — the two
 *      sides differ in the last few mantissa bits, which is exactly the class
 *      of "it looks fine, the loop is fine" assumption worth distrusting.
 *   2. It keeps the frame covered. Unwrapped, a `laps = 3` layer would have
 *      travelled 3L by the end of the loop and be reading source x ∈ [5760,
 *      7680] — well past the 3840 the path was sampled to — leaving bare
 *      background under the near ridge for the back half of the cycle. Wrapped,
 *      the visible window is always x ∈ [0, L] + [0, W] ⊆ the sampled span.
 *
 * Because h is periodic, wrapping the translate is invisible: the silhouette
 * that scrolls off the left is the one that scrolls back in on the right.
 * `samples` is kept a multiple of 3 so the wavelength is a whole number of
 * sample steps and the wrap lands exactly on a sample.
 *
 * The sky gradient is a full-period cosine; the stars are `bloom()`s on a
 * wrapped local frame, exactly 0 at both ends of their own cycles. Nothing in
 * this file is a one-way tween.
 *
 * ── Why it stays readable ─────────────────────────────────────────────────
 * Ridges are drawn in near-black surface tokens — `--surface-1` down to
 * `--background` — so they read as silhouette, not as light; the only emissive
 * elements are the rim light along the nearest crest (capped at 0.22 alpha on
 * a 2px stroke) and the stars, which are sub-pixel. All of it sits in the
 * lower two thirds. `Scrim` then pools over the copy column on top.
 */

type Ridge = {
  readonly id: string;
  /** Fill colour — silhouette, so these are surface tokens, not accents. */
  readonly fill: string;
  /** Baseline height as a fraction of canvas height (0 = top). */
  readonly base: number;
  /** Amplitude of each harmonic, in fractions of canvas height. */
  readonly amps: readonly number[];
  /** Integer harmonics across the wavelength L. Integers are load-bearing. */
  readonly harmonics: readonly number[];
  /** Phase seed — turns one harmonic set into distinct-looking mountains. */
  readonly seed: number;
  /** Wavelengths travelled per loop. Integer ⇒ the seam is exact. */
  readonly laps: number;
  /** Rim light along the crest. */
  readonly rim: string | null;
  readonly rimAlpha: number;
};

const RIDGES: readonly Ridge[] = [
  {
    id: "far",
    fill: BRAND.surface1,
    base: 0.56,
    amps: [0.075, 0.032, 0.014],
    harmonics: [1, 3, 7],
    seed: 3.1,
    laps: 1,
    rim: BRAND.cyan,
    rimAlpha: 0.1,
  },
  {
    id: "mid",
    fill: "#0F1614",
    base: 0.68,
    amps: [0.09, 0.038, 0.016],
    harmonics: [1, 2, 5],
    seed: 11.7,
    laps: 2,
    rim: BRAND.primary,
    rimAlpha: 0.14,
  },
  {
    id: "near",
    fill: BRAND.bg,
    base: 0.82,
    amps: [0.07, 0.03, 0.012],
    harmonics: [1, 2, 4],
    seed: 23.9,
    laps: 3,
    rim: BRAND.primary,
    rimAlpha: 0.22,
  },
];

/** The periodic height function. `h(x + L) === h(x)` by construction. */
const ridgeHeight = (
  x: number,
  wavelength: number,
  ridge: Ridge,
  height: number,
): number => {
  let y = ridge.base * height;
  for (let n = 0; n < ridge.harmonics.length; n += 1) {
    const phase = noise(ridge.seed + n * 4.7) * TAU;
    y -=
      ridge.amps[n] *
      height *
      Math.sin((TAU * ridge.harmonics[n] * x) / wavelength + phase);
  }
  return y;
};

const RidgeLayers: FC<
  FrameContext & { readonly samples: number; readonly intensity: number }
> = ({ frame, period, scale, samples, intensity }) => {
  const t = loopT(frame, period);
  const width = 1920;
  const height = 1080;
  /** One wavelength = one canvas width, so a lap is a full screen of terrain. */
  const wavelength = width;

  return (
    <AbsoluteFill>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: "block" }}
      >
        {RIDGES.map((ridge) => {
          /**
           * Modulo one wavelength — exactly 0 at both ends of the loop, and
           * never further than one wavelength from the sampled span. See the
           * file header for why both halves of that matter.
           */
          const shift = -wrap(wavelength * ridge.laps * t, wavelength);

          /* Sample across [-L, W + L]: one spare wavelength either side keeps
             the trailing edge covered for the whole of the travel. */
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
              {ridge.rim ? (
                <path
                  d={d}
                  fill="none"
                  stroke={alpha(ridge.rim, ridge.rimAlpha * intensity)}
                  strokeWidth={2 / scale}
                  strokeLinejoin="round"
                />
              ) : null}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/**
 * Stars, each on its own `bloom` a even fraction of a loop apart. Positions are
 * static (a star does not drift in ten seconds) so the only loop-sensitive
 * quantity is brightness, and that is exactly 0 at both ends of each cycle.
 */
const Stars: FC<
  FrameContext & { readonly count: number; readonly intensity: number }
> = ({ frame, fps, period, scale, count, intensity }) => {
  const win = bloomWindow(period, 0.2, 0.4, 0.38);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {Array.from({ length: count }, (_unused, i) => {
        const lit = bloom(
          wrap(frame - Math.round((i * period) / count), period),
          fps,
          win,
        );
        if (lit <= 0) {
          return null;
        }
        const x = noise(i * 3.3 + 1) * 100;
        /** Kept in the top 46% — above the ridgelines, out of the copy band. */
        const y = 4 + noise(i * 3.3 + 2) * 42;
        const d = (1.6 + noise(i * 3.3 + 3) * 2.6) * scale;
        const a = (0.2 + noise(i * 3.3 + 4) * 0.28) * lit * intensity;
        const tint = i % 6 === 0 ? BRAND.cyan : BRAND.fg;

        return (
          <div
            key={`star-${i}`}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: d,
              height: d,
              marginLeft: -d / 2,
              marginTop: -d / 2,
              borderRadius: "50%",
              backgroundColor: alpha(tint, a),
              boxShadow: `0 0 ${d * 3}px ${d * 0.4}px ${alpha(tint, a * 0.5)}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export type HeroAraratRidgeProps = {
  /**
   * Points sampled per ridgeline. Higher is smoother crests, linearly
   * costlier. Keep it a **multiple of 3**: the path spans three wavelengths,
   * so a multiple of 3 puts a sample exactly on the wavelength boundary the
   * translate wraps at.
   */
  readonly samples: number;
  /** Stars scattered across the upper sky. */
  readonly starCount: number;
  /** Scales the emissive budget — rim light and stars only, never the scrim. */
  readonly intensity: number;
  /** Where the readability pool sits, % of canvas. */
  readonly focusX: number;
  readonly focusY: number;
};

export const heroAraratRidgeDefaultProps: HeroAraratRidgeProps = {
  samples: 129,
  starCount: 34,
  intensity: 1,
  focusX: 32,
  focusY: 42,
};

export const HeroAraratRidge: FC<HeroAraratRidgeProps> = ({
  samples,
  starCount,
  intensity,
  focusX,
  focusY,
}) => {
  const ctx = useLoopFrame(0.4);
  const t = loopT(ctx.frame, ctx.period);

  /** Sky wash on one full cosine period — exact at both ends of the loop. */
  const sky = 0.5 + 0.5 * Math.cos(TAU * t + 0.4);
  const glow = 0.5 + 0.5 * Math.cos(TAU * 2 * t + 3.1);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Night sky">
        <AbsoluteFill style={{ backgroundColor: BRAND.bg }} />
        <AbsoluteFill
          style={{
            background: `linear-gradient(to bottom, ${alpha(
              BRAND.violet,
              interpolate(sky, [0, 1], [0.04, 0.075]) * intensity,
            )} 0%, ${alpha(BRAND.cyan, 0.02 * intensity)} 34%, transparent 60%)`,
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 74% 34% at 63% 58%, ${alpha(
              BRAND.primary,
              interpolate(glow, [0, 1], [0.055, 0.095]) * intensity,
            )} 0%, transparent 66%)`,
          }}
        />
      </Sequence>

      <Sequence name="Stars">
        <Stars {...ctx} count={starCount} intensity={intensity} />
      </Sequence>

      <Sequence name="Ridgelines">
        <RidgeLayers {...ctx} samples={samples} intensity={intensity} />
      </Sequence>

      <Sequence name="Readability scrim">
        <Scrim scale={ctx.scale} focusX={focusX} focusY={focusY} />
      </Sequence>

      <Sequence name="Grain">
        <Grain frame={ctx.frame} period={ctx.period} scale={ctx.scale} opacity={0.06} />
      </Sequence>
    </AbsoluteFill>
  );
};
