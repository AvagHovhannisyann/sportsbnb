/**
 * FirstRunTourHint — the coach-mark shown on a first visit to the dashboard,
 * pointing at one control and explaining it in a sentence.
 * A seamless loop, because it waits for the user rather than the other way
 * round. It breathes; it never bounces.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  SANS_FONT,
  TAU,
  cardSurface,
  chalk,
  courtGreen,
  hairline,
  interpolateSafe,
  ink,
  useMotionFrame,
  wrap,
} from "./authKit";

const CANVAS_W = 720;

export type FirstRunTourHintProps = {
  /** Bubble heading. */
  title: string;
  /** One sentence. If it needs two, it is not a coach-mark. */
  body: string;
  /** Which edge of the bubble the tail leaves from. */
  pointer: "up" | "down" | "left" | "right";
  /** Text on the highlighted control. */
  targetLabel: string;
  /** Travel of the nudge in design px. Keep it small — 4 reads, 12 nags. */
  nudgeDistance: number;
};

export const firstRunTourHintDefaultProps: FirstRunTourHintProps = {
  title: "Your saved courts live here",
  body: "Anything you star while browsing shows up in this tab.",
  pointer: "up",
  targetLabel: "Saved",
  nudgeDistance: 4,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The halo around the target is `0.5 + 0.5·cos(2πt)` — one full cosine
 *     period, so its value at t=1 is bit-identical to its value at t=0.
 *  2. The nudge is `sin(2πt)`, one full sine period, which is 0 at both ends
 *     and therefore continuous *and* zero-velocity across the seam.
 *  3. The attention ring expands on `u = wrap(t + offset, 1)` with an opacity
 *     that is exactly 0 at u=0 and u=1, so the radius resetting is never drawn.
 *
 * No element uses a one-way tween, and nothing in the file reads `frame`
 * except through `t`.
 */
export const FirstRunTourHint: FC<FirstRunTourHintProps> = ({
  title,
  body,
  pointer,
  targetLabel,
  nudgeDistance,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the state the cycle opens and closes on.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;

  const halo = 0.5 + 0.5 * Math.cos(TAU * t);
  const nudge = Math.sin(TAU * t) * nudgeDistance * unit;

  const vertical = pointer === "up" || pointer === "down";
  const nudgeX = vertical ? 0 : nudge * (pointer === "left" ? -1 : 1);
  const nudgeY = vertical ? nudge * (pointer === "up" ? -1 : 1) : 0;

  // The highlighted control.
  const chipW = 132 * unit;
  const chipH = 44 * unit;
  const chipX = width / 2 - chipW / 2;
  const chipY = pointer === "up" ? height * 0.14 : height * 0.72;

  // The bubble.
  const bubbleW = 380 * unit;
  const bubbleH = 118 * unit;
  const bubbleX = width / 2 - bubbleW / 2;
  const bubbleY =
    pointer === "up" ? chipY + chipH + 34 * unit : chipY - bubbleH - 34 * unit;

  const tailY = pointer === "up" ? bubbleY - 9 * unit : bubbleY + bubbleH - 9 * unit;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 100% at 50% 30%, ${BRAND.surface1} 0%, ${BRAND.background} 76%)`,
        }}
      />

      {/* Attention rings — opacity 0 at both ends of each cycle. */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        {[0, 0.5].map((offset) => {
          const u = wrap(t + offset, 1);
          const r = interpolateSafe(u, [0, 1], [chipW * 0.5, chipW * 1.15]);
          const o = interpolateSafe(u, [0, 0.14, 0.8, 1], [0, 0.24, 0, 0]);
          return (
            <ellipse
              key={offset}
              cx={chipX + chipW / 2}
              cy={chipY + chipH / 2}
              rx={r}
              ry={r * 0.42}
              fill="none"
              stroke={courtGreen(o)}
              strokeWidth={1.4 * unit}
            />
          );
        })}
      </svg>

      {/* The control being pointed at. */}
      <div
        style={{
          position: "absolute",
          left: chipX,
          top: chipY,
          width: chipW,
          height: chipH,
          borderRadius: 12 * unit,
          backgroundColor: BRAND.surface2,
          border: `${1.5 * unit}px solid ${courtGreen(0.3 + 0.35 * halo)}`,
          boxShadow: `0 0 0 ${5 * unit * halo}px ${courtGreen(0.12 * halo)}, 0 ${8 * unit}px ${18 * unit}px ${-6 * unit}px ${ink(0.6)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SANS_FONT,
          fontSize: 15 * unit,
          fontWeight: 600,
          color: BRAND.foreground,
        }}
      >
        {targetLabel}
      </div>

      {/* The bubble, nudging gently toward its target. */}
      <div
        style={{
          position: "absolute",
          left: bubbleX,
          top: bubbleY,
          width: bubbleW,
          height: bubbleH,
          ...cardSurface(unit, 16),
          transform: `translate(${nudgeX}px, ${nudgeY}px)`,
          padding: `${18 * unit}px ${20 * unit}px`,
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 17 * unit,
            fontWeight: 600,
            letterSpacing: -0.025 * 17 * unit,
            color: BRAND.foreground,
            marginBottom: 7 * unit,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 14 * unit,
            lineHeight: 1.5,
            color: BRAND.mutedForeground,
          }}
        >
          {body}
        </div>
      </div>

      {/* Tail. A rotated square, so it inherits the bubble's border exactly. */}
      <div
        style={{
          position: "absolute",
          left: width / 2 - 9 * unit,
          top: tailY,
          width: 18 * unit,
          height: 18 * unit,
          backgroundColor: BRAND.card,
          borderLeft: `${1 * unit}px solid ${BRAND.border}`,
          borderTop: `${1 * unit}px solid ${BRAND.border}`,
          transform: `translate(${nudgeX}px, ${nudgeY}px) rotate(${pointer === "up" ? 45 : 225}deg)`,
        }}
      />

      {/* Dotted leader between control and bubble. Static: two moving things
          pointing at one target is one too many. */}
      <div
        style={{
          position: "absolute",
          left: width / 2 - 0.75 * unit,
          top: pointer === "up" ? chipY + chipH : bubbleY + bubbleH,
          width: 1.5 * unit,
          height: 26 * unit,
          backgroundImage: `repeating-linear-gradient(to bottom, ${hairline(1)} 0px, ${hairline(1)} ${3 * unit}px, transparent ${3 * unit}px, transparent ${6 * unit}px)`,
        }}
      />

      <AbsoluteFill
        style={{
          boxShadow: `inset 0 0 ${80 * unit}px ${chalk(0.02)}`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
