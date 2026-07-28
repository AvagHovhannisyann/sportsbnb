/**
 * TransitionSlidePush — the lateral push used for *hierarchical* navigation:
 * the incoming page pushes the outgoing one off screen, and the outgoing one
 * parallaxes at a third of the speed so the stack reads as depth. This is the
 * drill-in on mobile (`MobileNav` routes, Discover → Venue → Checkout) and the
 * drawer push behind `owner/schedule/BookingDetailDrawer`.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * `pingPongPhase` drives everything: hold A → push to B → hold B → push back to
 * A. It is exactly 0 at t = 0 and exactly 0 at t = 1, and both ends sit inside
 * a hold, so position *and* velocity match across the wrap. On a sliding edge
 * that second condition is the one that matters — a value that matches with a
 * non-zero derivative still reads as a jolt.
 *
 * The travelling shadow that separates the two pages is a pure function of the
 * same phase, so it wraps with them.
 */

import type { FC } from "react";
import { AbsoluteFill, interpolate } from "remotion";

import {
  Eyebrow,
  MockScreen,
  Stage,
  chalk,
  cosWave,
  ink,
  pingPongPhase,
  primary,
  useLoopClock,
} from "./shared";

export type TransitionSlidePushProps = {
  /** Fraction of the cycle held on each screen. */
  holdRatio: number;
  /** Push direction: 1 slides the new page in from the right, −1 from the left. */
  direction: number;
  /**
   * How far the outgoing page travels, as a fraction of the incoming page's
   * travel. 0.3 is the iOS-style parallax; 1 is a rigid carousel.
   */
  parallax: number;
  /** How much the outgoing page dims as it leaves, 0 → 1. */
  dim: number;
  /** Corner radius applied to the incoming page as it travels. */
  travelRadius: number;
  /** Caption in the corner. Empty string hides it. */
  label: string;
};

export const transitionSlidePushDefaultProps: TransitionSlidePushProps = {
  holdRatio: 0.2,
  direction: 1,
  parallax: 0.3,
  dim: 0.55,
  travelRadius: 22,
  label: "Slide push",
};

const STAGE_W = 1280;
const STAGE_H = 720;

export const TransitionSlidePush: FC<TransitionSlidePushProps> = ({
  holdRatio,
  direction,
  parallax,
  dim,
  travelRadius,
  label,
}) => {
  const { t } = useLoopClock();
  const p = pingPongPhase({ t, hold: holdRatio });

  const dir = direction >= 0 ? 1 : -1;

  /** Incoming page: off stage → home. Outgoing page: home → parallax offset. */
  const inX = dir * STAGE_W * (1 - p);
  const outX = -dir * STAGE_W * parallax * p;

  /** Radius only while in flight, so a page at rest is square to the viewport. */
  const midpoint = 1 - Math.abs(2 * p - 1);
  const radius = travelRadius * midpoint;

  const outDim = dim * p;
  const outScale = interpolate(p, [0, 1], [1, 0.94]);

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <AbsoluteFill style={{ backgroundColor: "hsl(160, 22%, 3%)" }} />

      <AbsoluteFill>
        {/* Outgoing page. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translateX(${outX}px) scale(${outScale})`,
            transformOrigin: "center center",
            borderRadius: radius,
            overflow: "hidden",
          }}
        >
          <MockScreen w={STAGE_W} h={STAGE_H} variant="discover" />
          <AbsoluteFill style={{ backgroundColor: ink(outDim) }} />
        </div>

        {/* Incoming page, with the leading-edge shadow that sells the stack. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translateX(${inX}px)`,
            borderRadius: radius,
            overflow: "hidden",
            boxShadow: `${-dir * 40}px 0 90px -10px ${ink(0.85 * midpoint)}`,
          }}
        >
          <MockScreen w={STAGE_W} h={STAGE_H} variant="detail" />
          {/* A hairline on the leading edge — the same 1px inner highlight the
              `.glass` rule uses, so the seam between pages reads as a surface. */}
          <div
            style={{
              position: "absolute",
              left: dir > 0 ? 0 : STAGE_W - 1,
              top: 0,
              width: 1,
              height: STAGE_H,
              backgroundColor: chalk(0.12 * midpoint),
            }}
          />
        </div>

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
