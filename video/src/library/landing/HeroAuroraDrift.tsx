/**
 * HeroAuroraDrift — ambient plate for the landing hero band in
 * `src/pages/HomePage.tsx`, sitting behind "Book the court. Skip the call."
 * 1920×1080 · 30fps · 240 frames (8s) · seamless loop.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate } from "remotion";

import {
  BRAND,
  CLAMP,
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
 * Every animated quantity is a pure function of exactly two loop-safe drivers:
 *
 *   1. `loopT(frame, period)` fed through `sin(2πk·t)` / `cos(2πk·t)` with an
 *      **integer** k. Those are equal at t = 0 and t = 1 for every integer k,
 *      and `loopT` takes the modulo *before* the divide, so frame 0 and frame
 *      `period` feed bit-identical floats — not merely equal in the limit.
 *      Every harmonic in ORBS below (kx, ky, kb) is an integer; that is the
 *      single invariant this file rests on.
 *   2. `bloom(wrap(frame - phase, period), …)` — a rise spring minus a fall
 *      spring, provably exactly 0 at local frame 0 and exactly 0 past
 *      `hold + fall`, wrapped through a positive modulo.
 *
 * There is no one-way tween anywhere in this file. The orbit radii, the
 * brightness breath, the wash hue and the grain offset all close on
 * themselves; frame 240 would paint identically to frame 0, which is exactly
 * the frame a `loop`ing <video> wraps onto.
 *
 * ── Why it stays readable ─────────────────────────────────────────────────
 * A backdrop that competes with the headline is a failed backdrop. Total
 * additive light is capped per orb (`peak` ≤ 0.13 alpha, and the composite is
 * `peak · (0.5 + 0.28·breath + 0.22·flare)`, so an orb never exceeds its own
 * ceiling), and a fixed `Scrim` weighted to the left-centre — where the H1 and
 * the CTA row land — sits above every luminous layer. `intensity` scales the
 * whole light budget without touching the scrim, so it can only ever make the
 * plate darker than authored, never brighter than the budget.
 */

type Orb = {
  readonly id: string;
  readonly tint: string;
  /** Diameter in design px. */
  readonly size: number;
  /** Home position, % of canvas. */
  readonly cx: number;
  readonly cy: number;
  /** Drift amplitude, % of canvas. */
  readonly ax: number;
  readonly ay: number;
  /** Integer harmonics — the whole reason the drift closes on itself. */
  readonly kx: number;
  readonly ky: number;
  readonly phaseX: number;
  readonly phaseY: number;
  /** Harmonic of the slow brightness breath. Also an integer. */
  readonly kb: number;
  readonly phaseB: number;
  /** Peak alpha. The readability budget lives here. */
  readonly peak: number;
};

const ORBS: readonly Orb[] = [
  {
    id: "green-major",
    tint: BRAND.primary,
    size: 1180,
    cx: 27,
    cy: 33,
    ax: 4.5,
    ay: 3.2,
    kx: 1,
    ky: 1,
    phaseX: 0,
    phaseY: 0,
    kb: 1,
    phaseB: 0,
    peak: 0.13,
  },
  {
    id: "cyan-major",
    tint: BRAND.cyan,
    size: 1060,
    cx: 74,
    cy: 61,
    ax: 5.2,
    ay: 4.1,
    kx: 1,
    ky: 2,
    phaseX: 1.9,
    phaseY: 0.6,
    kb: 1,
    phaseB: 2.1,
    peak: 0.1,
  },
  {
    id: "green-minor",
    tint: BRAND.primary,
    size: 760,
    cx: 61,
    cy: 21,
    ax: 6.1,
    ay: 5.4,
    kx: 2,
    ky: 1,
    phaseX: 3.1,
    phaseY: 2.2,
    kb: 2,
    phaseB: 0.8,
    peak: 0.085,
  },
  {
    id: "violet-deep",
    tint: BRAND.violet,
    size: 900,
    cx: 17,
    cy: 79,
    ax: 4.2,
    ay: 3.8,
    kx: 1,
    ky: 1,
    phaseX: 4.4,
    phaseY: 1.1,
    kb: 1,
    phaseB: 4,
    peak: 0.055,
  },
  {
    id: "cyan-floor",
    tint: BRAND.cyan,
    size: 1320,
    cx: 46,
    cy: 93,
    ax: 3.1,
    ay: 2,
    kx: 2,
    ky: 2,
    phaseX: 5.6,
    phaseY: 3.9,
    kb: 2,
    phaseB: 5.2,
    peak: 0.07,
  },
];

const AuroraField: FC<FrameContext & { readonly intensity: number }> = ({
  frame,
  fps,
  period,
  scale,
  intensity,
}) => {
  const t = loopT(frame, period);
  const win = bloomWindow(period, 0.22, 0.37, 0.45);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {ORBS.map((orb, i) => {
        const x = orb.cx + orb.ax * Math.sin(TAU * orb.kx * t + orb.phaseX);
        const y = orb.cy + orb.ay * Math.cos(TAU * orb.ky * t + orb.phaseY);

        /** 0 → 1 breath on an integer harmonic. Identical at both seam ends. */
        const breath = 0.5 + 0.5 * Math.sin(TAU * orb.kb * t + orb.phaseB);

        /** Staggered flare: orb i peaks 1/5 of a loop after orb i-1. */
        const flarePhase = Math.round((i * period) / ORBS.length);
        const flare = bloom(wrap(frame - flarePhase, period), fps, win);

        const a = orb.peak * intensity * (0.5 + 0.28 * breath + 0.22 * flare);
        const size =
          orb.size * scale * (1 + 0.07 * Math.cos(TAU * orb.kx * t + orb.phaseX));

        return (
          <div
            key={orb.id}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              borderRadius: "50%",
              background: `radial-gradient(circle at 50% 50%, ${alpha(
                orb.tint,
                a,
              )} 0%, ${alpha(orb.tint, a * 0.42)} 34%, ${alpha(orb.tint, 0)} 70%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * `.bg-grid-soft`, drifting exactly one tile per loop on both axes — a modulo
 * cycle expressed in CSS rather than in JS, so the final frame tiles
 * identically to the first. Masked toward the floor so it reads as a pitch
 * receding under the copy rather than as graph paper behind it.
 */
const CourtGrid: FC<FrameContext & { readonly intensity: number }> = ({
  frame,
  period,
  scale,
  intensity,
}) => {
  const t = loopT(frame, period);
  const tile = 128 * scale;
  const shift = -tile * t;
  const glow = 0.5 + 0.5 * Math.sin(TAU * t - 0.9);
  const mask =
    "radial-gradient(ellipse 92% 78% at 50% 108%, #000 0%, rgba(0,0,0,0.42) 52%, transparent 86%)";

  return (
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(to right, ${alpha(
          BRAND.border,
          0.62,
        )} 1px, transparent 1px), linear-gradient(to bottom, ${alpha(
          BRAND.border,
          0.62,
        )} 1px, transparent 1px)`,
        backgroundSize: `${tile}px ${tile}px`,
        backgroundPosition: `${shift}px ${shift}px`,
        opacity: interpolate(glow, [0, 1], [0.5, 0.74]) * intensity,
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );
};

/**
 * Drifting specks. Belt and braces on the loop: the orbits are closed (integer
 * harmonics) *and* the brightness is a bloom, so a mote is loop-safe on
 * position independently of whether it happens to be lit at the seam. The
 * blooms climb an even 1/N-of-a-loop ladder, which reads as a slow wave
 * crossing the frame rather than N things blinking together.
 */
const Motes: FC<
  FrameContext & { readonly count: number; readonly intensity: number }
> = ({ frame, fps, period, scale, count, intensity }) => {
  const win = bloomWindow(period, 0.17, 0.41, 0.4);
  const t = loopT(frame, period);

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
        const roll = (salt: number) => {
          const x = Math.sin((i * 7.13 + salt) * 127.1 + 311.7) * 43758.5453;
          return x - Math.floor(x);
        };
        const kind = i % 5;
        const tint =
          kind === 0 ? BRAND.cyan : kind === 3 ? BRAND.fg : BRAND.primary;
        const kx = 1 + Math.floor(roll(5) * 2);
        const ky = 1 + Math.floor(roll(6) * 2);
        const dx = (16 + roll(3) * 52) * scale * Math.sin(TAU * kx * t + roll(7) * TAU);
        const dy = (14 + roll(4) * 46) * scale * Math.cos(TAU * ky * t + roll(8) * TAU);
        const d = (3 + roll(9) * 7) * scale;
        const a = (kind === 3 ? 0.24 : 0.34 + roll(10) * 0.16) * lit * intensity;

        return (
          <div
            key={`mote-${i}`}
            style={{
              position: "absolute",
              left: `${4 + roll(1) * 92}%`,
              top: `${8 + roll(2) * 84}%`,
              width: d,
              height: d,
              marginLeft: -d / 2,
              marginTop: -d / 2,
              borderRadius: "50%",
              backgroundColor: alpha(tint, a),
              boxShadow: `0 0 ${d * 3.2}px ${d * 0.6}px ${alpha(tint, a * 0.42)}`,
              transform: `translate(${dx}px, ${dy}px) scale(${interpolate(
                lit,
                [0, 1],
                [0.55, 1],
                CLAMP,
              )})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export type HeroAuroraDriftProps = {
  /**
   * Multiplies the whole light budget. 1 is the authored ceiling, measured to
   * keep chalk-white copy well clear of AA everywhere on the plate; values
   * below 1 only ever darken it further.
   */
  readonly intensity: number;
  /** Number of drifting specks. */
  readonly moteCount: number;
  /** Where the readability pool sits, % of canvas — follow your headline. */
  readonly focusX: number;
  readonly focusY: number;
};

export const heroAuroraDriftDefaultProps: HeroAuroraDriftProps = {
  intensity: 1,
  moteCount: 26,
  focusX: 33,
  focusY: 47,
};

export const HeroAuroraDrift: FC<HeroAuroraDriftProps> = ({
  intensity,
  moteCount,
  focusX,
  focusY,
}) => {
  const ctx = useLoopFrame();
  const t = loopT(ctx.frame, ctx.period);

  /** 0.5 at t = 0 and at t = 1 — a full period, so the seam is exact. */
  const hue = 0.5 + 0.5 * Math.sin(TAU * t);
  /** Second harmonic, phase-shifted, so the two washes never crest together. */
  const swell = 0.5 + 0.5 * Math.cos(TAU * 2 * t + 1.2);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Base wash">
        <AbsoluteFill style={{ backgroundColor: BRAND.bg }} />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse ${interpolate(
              hue,
              [0, 1],
              [78, 92],
            )}% ${interpolate(swell, [0, 1], [46, 56])}% at 50% -12%, ${alpha(
              hue > 0.5 ? BRAND.cyan : BRAND.primary,
              interpolate(swell, [0, 1], [0.1, 0.14]) * intensity,
            )} 0%, transparent 64%)`,
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 120% 62% at 50% 118%, ${BRAND.surface1} 0%, transparent 70%)`,
            opacity: 0.9,
          }}
        />
      </Sequence>

      <Sequence name="Aurora field">
        <AuroraField {...ctx} intensity={intensity} />
      </Sequence>

      <Sequence name="Court grid">
        <CourtGrid {...ctx} intensity={intensity} />
      </Sequence>

      {/*
        The scrim sits *above* every luminous layer and below the motes, which
        are small and specular enough to survive on top. It is entirely static,
        so it is trivially identical at both ends of the loop.
      */}
      <Sequence name="Readability scrim">
        <Scrim scale={ctx.scale} focusX={focusX} focusY={focusY} />
      </Sequence>

      <Sequence name="Motes">
        <Motes {...ctx} count={moteCount} intensity={intensity} />
      </Sequence>

      <Sequence name="Grain">
        <Grain frame={ctx.frame} period={ctx.period} scale={ctx.scale} />
      </Sequence>
    </AbsoluteFill>
  );
};
