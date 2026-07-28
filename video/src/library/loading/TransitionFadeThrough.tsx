/**
 * TransitionFadeThrough — the default route change: the outgoing page falls
 * back through the court-green ground and the incoming page rises out of it.
 * This is the shell transition between any two top-level routes (Discover →
 * Venue, Bookings → Venue), and the motion the `.animate-fade-in` utility in
 * `src/index.css` is a one-directional cut-down of.
 *
 * A fade-*through* rather than a cross-fade: the two pages never overlap at
 * partial opacity, because two half-visible layouts stacked on each other read
 * as a rendering fault rather than as a transition.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * `pingPongPhase` runs hold A → A-to-B → hold B → B-to-A across the cycle. It
 * is exactly 0 at t = 0 and exactly 0 at t = 1, and both ends sit *inside* a
 * hold, so the derivative is 0 there too: the loop matches in position and in
 * velocity, which is what stops a moving edge from showing a seam. Every value
 * below is a pure function of that phase, so the whole composition inherits it.
 */

import type { FC } from "react";
import { AbsoluteFill, interpolate } from "remotion";

import {
  CourtBackdrop,
  Eyebrow,
  MockScreen,
  Stage,
  cosWave,
  ink,
  pingPongPhase,
  primary,
  useLoopClock,
} from "./shared";

export type TransitionFadeThroughProps = {
  /** Fraction of the cycle held on each screen before the next traverse. */
  holdRatio: number;
  /** How far a screen travels vertically as it fades, in design-canvas px. */
  travel: number;
  /** Peak strength of the court-green flash at the midpoint, 0 → 1. */
  flash: number;
  /** How far the outgoing screen scales down. 1 disables the scale. */
  scaleOut: number;
  /** Caption in the corner. Empty string hides it. */
  label: string;
};

export const transitionFadeThroughDefaultProps: TransitionFadeThroughProps = {
  holdRatio: 0.22,
  travel: 26,
  flash: 0.16,
  scaleOut: 0.96,
  label: "Fade through",
};

const STAGE_W = 1280;
const STAGE_H = 720;

export const TransitionFadeThrough: FC<TransitionFadeThroughProps> = ({
  holdRatio,
  travel,
  flash,
  scaleOut,
  label,
}) => {
  const { t } = useLoopClock();
  const p = pingPongPhase({ t, hold: holdRatio });

  /**
   * The outgoing page is gone by p = 0.46 and the incoming page only starts at
   * p = 0.54, so there is a clear window where neither is on screen — that gap
   * is what makes this a fade *through* rather than a cross-fade.
   */
  const outOpacity = interpolate(p, [0, 0.46], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const inOpacity = interpolate(p, [0.54, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const outY = interpolate(p, [0, 0.46], [0, travel], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const inY = interpolate(p, [0.54, 1], [-travel, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const outScale = interpolate(p, [0, 0.46], [1, scaleOut], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const inScale = interpolate(p, [0.54, 1], [scaleOut, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /** Triangular: 0 at both ends of the traverse, peak in the gap. */
  const midpoint = 1 - Math.abs(2 * p - 1);

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      {/* The ground both pages fall through. Always present, so the gap in the
          middle of the traverse shows the app rather than black. */}
      <CourtBackdrop t={t} bloom={0.14} vignette={0.4} />

      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: outOpacity,
            transform: `translateY(${outY}px) scale(${outScale})`,
            transformOrigin: "center center",
          }}
        >
          <MockScreen w={STAGE_W} h={STAGE_H} variant="discover" />
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: inOpacity,
            transform: `translateY(${inY}px) scale(${inScale})`,
            transformOrigin: "center center",
          }}
        >
          <MockScreen w={STAGE_W} h={STAGE_H} variant="detail" />
        </div>

        {/* Court-green flash at the crossing point, plus a vignette that
            tightens with it — this is what carries the eye across the gap. */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${primary(flash * midpoint)} 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, ${ink(0.5 * midpoint)} 100%)`,
            pointerEvents: "none",
          }}
        />

        {label.length > 0 ? (
          <Eyebrow
            x={0}
            y={STAGE_H - 44}
            width={STAGE_W}
            align="center"
            color={primary(0.34 + 0.24 * cosWave(t))}
          >
            {label}
          </Eyebrow>
        ) : null}
      </AbsoluteFill>
    </Stage>
  );
};
