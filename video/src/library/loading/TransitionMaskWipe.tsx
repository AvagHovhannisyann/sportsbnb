/**
 * TransitionMaskWipe — a diagonal court-line wipe. The incoming page is
 * revealed by a moving mask with a lit leading edge, rather than by moving
 * either page. Used for the marketing-to-app boundary (`HomePage` → `Discover`,
 * `ForOwnersPage` → owner onboarding), where a push would imply a hierarchy
 * that is not there.
 *
 * A mask wipe is the one transition that never moves layout, so it is also the
 * safe choice for anything with a map or a video still in it — those repaint
 * badly under a transform.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * `pingPongPhase` runs hold A → wipe to B → hold B → wipe back to A. It is
 * exactly 0 at t = 0 and exactly 0 at t = 1, and both ends sit inside a hold,
 * so the mask edge matches in position *and* velocity across the wrap. The
 * gradient mask is authored so that at p = 0 it is fully transparent and at
 * p = 1 fully opaque, both past the end of the soft band — so the held states
 * are exact, not merely close.
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

export type TransitionMaskWipeProps = {
  /** Fraction of the cycle held on each screen. */
  holdRatio: number;
  /** Angle of the wipe line, in degrees. 0 wipes downward, 90 rightward. */
  wipeAngle: number;
  /** Width of the soft edge, as a fraction of the wipe travel. */
  featherRatio: number;
  /** Thickness of the lit court line riding the edge, in canvas px. */
  edgeWidth: number;
  /** Reverse the wipe direction. */
  reverse: boolean;
  /** Caption in the corner. Empty string hides it. */
  label: string;
};

export const transitionMaskWipeDefaultProps: TransitionMaskWipeProps = {
  holdRatio: 0.2,
  wipeAngle: 108,
  featherRatio: 0.18,
  edgeWidth: 5,
  reverse: false,
  label: "Mask wipe",
};

const STAGE_W = 1280;
const STAGE_H = 720;

export const TransitionMaskWipe: FC<TransitionMaskWipeProps> = ({
  holdRatio,
  wipeAngle,
  featherRatio,
  edgeWidth,
  reverse,
  label,
}) => {
  const { t } = useLoopClock();
  const raw = pingPongPhase({ t, hold: holdRatio });
  const p = reverse ? 1 - raw : raw;

  const feather = Math.min(0.4, Math.max(0.02, featherRatio));

  /**
   * The mask front runs from `-feather` to `1 + feather` so that the soft band
   * is fully off the canvas at both held states. At p = 0 the whole mask is
   * transparent and at p = 1 the whole mask is opaque — exactly, not nearly,
   * which is what makes the held states genuine holds and the seam exact.
   */
  const front = interpolate(p, [0, 1], [-feather, 1 + feather]);
  const a = (front - feather) * 100;
  const b = (front + feather) * 100;

  const mask = `linear-gradient(${wipeAngle}deg, #000 ${a}%, transparent ${b}%)`;

  /** Where the lit line sits along the same axis, as a percentage. */
  const edgeAt = front * 100;
  const midpoint = 1 - Math.abs(2 * p - 1);

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <AbsoluteFill>
        {/* Outgoing page, always fully painted underneath. */}
        <MockScreen w={STAGE_W} h={STAGE_H} variant="bookings" />

        {/* Incoming page, revealed by the mask. Nothing here transforms. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            WebkitMaskImage: mask,
            maskImage: mask,
          }}
        >
          <MockScreen w={STAGE_W} h={STAGE_H} variant="checkout" />
        </div>

        {/* The lit court line on the wipe edge: a thin band drawn along the
            same gradient axis, so it stays glued to the mask front. */}
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${wipeAngle}deg, transparent ${edgeAt - edgeWidth * 0.12}%, ${primary(0.9)} ${edgeAt}%, transparent ${edgeAt + edgeWidth * 0.12}%)`,
            opacity: Math.min(1, midpoint * 3),
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${wipeAngle}deg, transparent ${edgeAt - edgeWidth * 0.6}%, ${primary(0.28)} ${edgeAt}%, transparent ${edgeAt + edgeWidth * 0.6}%)`,
            opacity: Math.min(1, midpoint * 3),
            pointerEvents: "none",
          }}
        />

        {/* A faint darkening ahead of the front, so the incoming page arrives
            out of shadow instead of appearing at full brightness. */}
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${wipeAngle}deg, transparent ${edgeAt}%, ${ink(0.3 * midpoint)} ${edgeAt + 14}%, transparent ${edgeAt + 34}%)`,
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
