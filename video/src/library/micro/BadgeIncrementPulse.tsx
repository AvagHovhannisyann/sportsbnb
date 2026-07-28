/**
 * BadgeIncrementPulse — a counter that only animates on the tick that matters.
 * Spec for MOTION-DESIGN-CASES case 53. The hold-timer chip in `CardTitle` at
 * `src/features/booking/CheckoutPage.tsx:215-226`, fed by `countdown` (`:92-97`),
 * and the same rule applied to any incrementing badge.
 *
 * WHAT IS SPECIFIED
 *   The timer fires every 1000ms (`:88`) and animates on **none of those
 *   ticks** except the minute boundary (`remaining % 60 === 0`). On that one:
 *     chip — `scale(1) → scale(1.04) → scale(1)`
 *     icon — `rotate(0deg → -8deg → 0deg)`
 *     260ms total, `--ease-spring` (`cubic-bezier(0.34, 1.56, 0.64, 1)`,
 *     `src/index.css:137`). The slight overshoot is the only thing that makes a
 *     4% scale readable at all — without it the gesture is below the threshold
 *     of noticing, which defeats the point of having one.
 *
 *   THE RESTRAINT IS THE SPECIFICATION. A per-second flicker says the same
 *   thing 1200 times over a twenty-minute hold and becomes wallpaper inside ten
 *   seconds. Twenty distinct events across twenty minutes stay legible in
 *   peripheral vision while the user reads the price breakdown — which is
 *   exactly where their eyes are. Animate the unit the user counts in, not the
 *   unit the interval fires in.
 *
 *   The digits themselves swap instantly. They are the information; the pulse
 *   is the notification that the information changed, and the two must not be
 *   the same gesture or the number is unreadable while it is being announced.
 *
 * CSS EQUIVALENT
 *   @keyframes tick-pulse {
 *     0%   { transform: scale(1);    }
 *     50%  { transform: scale(1.04); }
 *     100% { transform: scale(1);    }
 *   }
 *   .timer-chip.is-rollover { animation: tick-pulse 260ms cubic-bezier(0.34,1.56,0.64,1); }
 *   framer-motion is the better build: `useAnimationControls` keyed off the
 *   effect that already exists at `:81-90`. A CSS keyframe needs the class
 *   removed and re-added per minute to retrigger, which is a re-render either
 *   way — so take the one that does not depend on a reflow-forcing class
 *   toggle.
 *
 * REDUCED MOTION
 *   `useReducedMotion()` → no scale, no rotation. The digits still change,
 *   which is the actual information; only the emphasis is dropped. Note this
 *   degradation costs a real thing — peripheral awareness of the rollover — and
 *   that cost is correct: someone who has asked for reduced motion has asked
 *   not to be poked in the periphery. Compensate with the colour escalation
 *   case 54 already specifies at the two-minute mark, which is a state change
 *   rather than a movement.
 *   Loop freezes at frame 0, mid-dwell, chip at rest.
 *
 * PERF
 *   `transform` only, on a chip with no children that lay out. One flag worth
 *   fixing in markup rather than in motion: the chip is inside
 *   `flex items-center justify-between` (`:207`) and the string loses a
 *   character at `9:59`, so its box narrows once per session and the icon jumps
 *   ~8px left. Fix that with `min-w-[5.5ch] justify-end` on the span. It is a
 *   layout bug, and the animation would only draw attention to it.
 *
 * LOOP
 *   Seamless, by two mechanisms stacked.
 *   (a) The half-step shift. `stepCycle` is fed `frame + step/2`, so the
 *       rollovers land at local frames 22.5, 67.5, 112.5 and 157.5 of a
 *       180-frame period — never at 0 or 180. Frame 0 and frame 180 are both
 *       "mid-dwell of the first step".
 *   (b) The pulse itself. `bump = progress(0,130) − progress(130,130)`, both
 *       clamped: exactly 0 at the start of a step and exactly 1 − 1 = 0 from
 *       260ms on, and the dwell is 750ms, so it is at rest for 490ms before the
 *       next one. `scale` and `rotate` are `1 + 0.04·bump` and `-8·bump`, so
 *       they inherit that exactness rather than approximating it.
 *   The value wrapping from 4 back to 1 is a real event — a tray being read —
 *   and it happens mid-step, 375ms away from the seam in both directions.
 *   4 rollovers × 750ms = 3000ms at 60fps.
 */

import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_OUT_EXPO,
  EASE_SPRING,
  MONO_FONT,
  RADIUS,
  SANS_FONT,
  courtGreen,
  framesToMs,
  progress,
  stepCycle,
  useSpecFrame,
} from "./microKit";
import { SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 4 rollovers × 750ms = 3000ms at 60fps. */
const PERIOD = 180;
const STEP_MS = 750;
/** 260ms total: 130ms out on the spring, 130ms back. */
const HALF_MS = 130;
const PULSE_MS = HALF_MS * 2;

export type BadgeIncrementPulseProps = {
  /** The count the badge starts from; it increments once per step. */
  from: number;
  label: string;
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const badgeIncrementPulseDefaultProps: BadgeIncrementPulseProps = {
  from: 1,
  label: "new booking requests",
  speed: 1,
};

export const BadgeIncrementPulse: FC<BadgeIncrementPulseProps> = ({
  from,
  label,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  const count = 4;
  const stepFrames = PERIOD / count;
  /** Half-step shift: the rollover never lands on the wrap frame. */
  const step = stepCycle(
    frame + stepFrames / 2,
    fps,
    PERIOD,
    count,
    PULSE_MS,
    EASE_SPRING,
  );

  /** Exactly 0 at the start of a step and exactly 0 from 260ms on. */
  const bump =
    progress(step.localFrame, fps, 0, HALF_MS, EASE_SPRING) -
    progress(step.localFrame, fps, HALF_MS, HALF_MS, EASE_OUT_EXPO);

  const scale = 1 + 0.04 * bump;
  const rotate = -8 * bump;
  const value = from + step.to;

  const stageW = 560 * unit;
  const stageH = 226 * unit;
  const chipH = 44 * unit;

  return (
    <SpecStage
      caseRef="Case 53"
      title="Counter — the rollover, and the 59 ticks that do nothing"
      css="scale 1 → 1.04 → 1 and icon rotate 0 → -8deg → 0 · 260ms var(--ease-spring) · fires ONLY on the boundary, never on the interval · digits swap instantly"
      reduced="No scale, no rotation — the digits still change. Compensate with case 54's colour escalation, which is a state, not a movement."
      phases={[
        { label: "out (spring)", fromMs: 0, toMs: HALF_MS },
        { label: "back", fromMs: HALF_MS, toMs: PULSE_MS, tone: "cyan" },
        { label: "nothing happens", fromMs: PULSE_MS, toMs: STEP_MS, tone: "muted" },
      ]}
      elapsedMs={framesToMs(step.localFrame, fps)}
      totalMs={STEP_MS}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {/* The chip. transform-only; the box never changes size. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 46 * unit,
            height: chipH,
            display: "inline-flex",
            alignItems: "center",
            gap: 10 * unit,
            paddingLeft: 14 * unit,
            paddingRight: 16 * unit,
            borderRadius: 999,
            backgroundColor: BRAND.surface2,
            border: `${1 * unit}px solid ${BRAND.border}`,
            transform: `scale(${scale})`,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              transform: `rotate(${rotate}deg)`,
            }}
          >
            <svg width={17 * unit} height={17 * unit} viewBox="0 0 24 24" fill="none">
              <circle
                cx={12}
                cy={12.5}
                r={8.5}
                stroke={BRAND.primary}
                strokeWidth={1.9}
              />
              <path
                d="M12 8 V12.8 L15.2 14.6"
                stroke={BRAND.primary}
                strokeWidth={1.9}
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontVariantNumeric: "tabular-nums",
              fontSize: 19 * unit,
              // min-w-[5.5ch] justify-end — the layout fix, not a motion one.
              minWidth: 5.5 * 11 * unit,
              textAlign: "right",
              color: BRAND.foreground,
            }}
          >
            {value}
          </span>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 12.5 * unit,
              color: BRAND.mutedForeground,
            }}
          >
            {label}
          </span>
        </div>

        {/* The interval, drawn. One tall mark per boundary; the rest are the
            ticks that fire and animate nothing. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 46 * unit + chipH + 34 * unit,
            width: stageW,
            height: 26 * unit,
            display: "flex",
            alignItems: "flex-end",
            gap: 3 * unit,
          }}
        >
          {Array.from({ length: 40 }, (_, i) => {
            const boundary = i % 10 === 0;
            return (
              <div
                key={`tick-${String(i)}`}
                style={{
                  flex: 1,
                  height: boundary ? 26 * unit : 9 * unit,
                  borderRadius: 1 * unit,
                  backgroundColor: boundary ? BRAND.primary : BRAND.surface3,
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: 46 * unit + chipH + 70 * unit,
            width: stageW,
            fontFamily: MONO_FONT,
            fontSize: 11 * unit,
            lineHeight: 1.8,
            color: BRAND.mutedForeground,
          }}
        >
          {`scale ${scale.toFixed(4)} · rotate ${rotate.toFixed(2)}deg`}
          <br />
          Tall marks are the boundaries that animate. The short ones fire the
          same interval and move nothing.
        </div>

        <div
          style={{
            position: "absolute",
            right: 0,
            top: 46 * unit + 8 * unit,
            padding: `${3 * unit}px ${9 * unit}px`,
            borderRadius: RADIUS.sm * unit,
            backgroundColor: courtGreen(0.06 + 0.16 * bump),
            border: `${1 * unit}px solid ${courtGreen(0.2 + 0.5 * bump)}`,
            fontFamily: MONO_FONT,
            fontSize: 10 * unit,
            color: bump > 0.05 ? BRAND.primary : BRAND.mutedForeground,
          }}
        >
          {bump > 0.05 ? "rollover" : "idle tick"}
        </div>
      </div>
    </SpecStage>
  );
};
