/**
 * TransitionScaleDepth — the z-axis transition. The outgoing page recedes and
 * blurs while the incoming page comes forward out of it, so the two read as
 * stacked in depth rather than side by side. This is the modal-scale motion the
 * app uses for `VenueChatDialog`, `FieldRatingDialog` and the checkout
 * confirmation step, and the "open venue from the map pin" move on
 * `VenueMapPage`.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * `pingPongPhase` runs hold A → dive to B → hold B → back to A. It is exactly 0
 * at t = 0 and exactly 0 at t = 1, and both ends sit inside a hold, so scale,
 * blur and opacity all match in position *and* velocity across the wrap. Blur
 * is the one that would give a seam away first — the human eye reads a
 * discontinuity in focus more readily than one in position — which is why the
 * holds, rather than a bare symmetric tween, are doing the work here.
 */

import type { FC } from "react";
import { AbsoluteFill, interpolate } from "remotion";

import {
  Eyebrow,
  MockScreen,
  Stage,
  cosWave,
  ink,
  pingPongPhase,
  primary,
  useLoopClock,
} from "./shared";

export type TransitionScaleDepthProps = {
  /** Fraction of the cycle held on each screen. */
  holdRatio: number;
  /** Scale the outgoing page recedes to. */
  recedeScale: number;
  /** Scale the incoming page arrives from. */
  approachScale: number;
  /** Peak blur on the receding page, in px. */
  blurAmount: number;
  /** How far the receding page dims, 0 → 1. */
  dim: number;
  /** Caption in the corner. Empty string hides it. */
  label: string;
};

export const transitionScaleDepthDefaultProps: TransitionScaleDepthProps = {
  holdRatio: 0.22,
  recedeScale: 0.88,
  approachScale: 1.12,
  blurAmount: 14,
  dim: 0.6,
  label: "Scale depth",
};

const STAGE_W = 1280;
const STAGE_H = 720;

export const TransitionScaleDepth: FC<TransitionScaleDepthProps> = ({
  holdRatio,
  recedeScale,
  approachScale,
  blurAmount,
  dim,
  label,
}) => {
  const { t } = useLoopClock();
  const p = pingPongPhase({ t, hold: holdRatio });

  /** Outgoing: sits at rest, then recedes, blurs and dims. */
  const outScale = interpolate(p, [0, 1], [1, recedeScale]);
  const outBlur = interpolate(p, [0, 1], [0, blurAmount]);
  const outDim = dim * p;

  /**
   * Incoming: arrives from in front of the camera. Its opacity clears 0 only
   * after p = 0.18, so at the A hold it contributes nothing at all — the held
   * state is the outgoing page alone, exactly.
   */
  const inScale = interpolate(p, [0, 1], [approachScale, 1]);
  const inOpacity = interpolate(p, [0.18, 0.72], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const inBlur = interpolate(p, [0.18, 0.86], [blurAmount * 0.7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const midpoint = 1 - Math.abs(2 * p - 1);

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <AbsoluteFill style={{ backgroundColor: "hsl(160, 22%, 3%)" }} />

      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${outScale})`,
            transformOrigin: "center center",
            filter: `blur(${outBlur}px)`,
          }}
        >
          <MockScreen w={STAGE_W} h={STAGE_H} variant="discover" />
          <AbsoluteFill style={{ backgroundColor: ink(outDim) }} />
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${inScale})`,
            transformOrigin: "center center",
            opacity: inOpacity,
            filter: `blur(${inBlur}px)`,
            boxShadow: `0 40px 120px -20px ${ink(0.9)}`,
          }}
        >
          <MockScreen w={STAGE_W} h={STAGE_H} variant="checkout" />
        </div>

        {/* Court-green rim light at the crossing point, so the arriving page
            reads as lit from the app's own accent rather than from nowhere. */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 90% 80% at 50% 50%, transparent 45%, ${primary(0.12 * midpoint)} 100%)`,
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
