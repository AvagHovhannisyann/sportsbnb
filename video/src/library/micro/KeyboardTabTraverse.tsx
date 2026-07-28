/**
 * KeyboardTabTraverse — the ring hopping across a toolbar, four controls deep.
 * Spec for MOTION-DESIGN-CASES case 95 applied to a sequence, and the explicit
 * counter-example to case 26 (the keyboard cursor rail inside the /venues
 * suggestion list, which *does* travel).
 *
 * WHAT IS SPECIFIED
 *   Between separate controls the ring does NOT travel. It disappears from one
 *   and appears on the next in the same frame, because a ring sliding across a
 *   200px gap spends 150ms attached to neither control, and a user holding Tab
 *   outruns it by the third press. The only thing allowed to move is the
 *   offset — `0 → 2px` over 120ms — which reads as the ring settling onto the
 *   control it is already on.
 *
 *   Case 26's rail is the opposite and stays that way: inside one list, with
 *   rows a few pixels apart and one continuous cursor, travel is what tells
 *   you the cursor is the same object. Between toolbar controls there is no
 *   such object.
 *
 * CSS EQUIVALENT
 *   .control:focus-visible { box-shadow: 0 0 0 2px hsl(var(--background)),
 *                                        0 0 0 4px hsl(var(--ring)); }
 *   .control { transition: outline-offset 120ms cubic-bezier(0.16,1,0.3,1); }
 *   — no `transition` on box-shadow, and no shared layout element.
 *   framer-motion: explicitly NOT `layoutId`. A shared-layout ring is exactly
 *   the travelling indicator this spec forbids between controls.
 *
 * REDUCED MOTION
 *   Nothing to suppress in the hop, which is already instant. The 120ms offset
 *   growth goes to `transition-property: none`. The focused control is still
 *   unambiguous — full-strength ring, `aria-current`, and the label change.
 *   Loop freezes at frame 0, with the first control focused.
 *
 * LOOP
 *   Seamless, with one wrinkle worth stating. A step function that changes on
 *   the step boundary would change *at* the wrap frame, which is a visible
 *   seam even though the values agree. So the index is read from a clock
 *   shifted by half a step: `floor(wrap(frame + step/2, period) / step)`. The
 *   hops then land at local frames step/2, 1.5·step, 2.5·step, 3.5·step —
 *   never at 0 or at `period`. Frame 0 and frame 144 are both "control 1
 *   focused, offset settled at 2px", pixel for pixel. 600ms per control × 4.
 */

import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_OUT_EXPO,
  MONO_FONT,
  RADIUS,
  SANS_FONT,
  focusRing,
  framesToMs,
  progress,
  useSpecFrame,
  wrap,
} from "./microKit";
import { KeyCap, SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 4 controls × 600ms = 2400ms at 60fps. */
const PERIOD = 144;
const STEP_MS = 600;

export type KeyboardTabTraverseProps = {
  /** The controls in tab order. */
  controls: readonly string[];
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const keyboardTabTraverseDefaultProps: KeyboardTabTraverseProps = {
  controls: ["Date", "Sport", "City", "Search"],
  speed: 1,
};

export const KeyboardTabTraverse: FC<KeyboardTabTraverseProps> = ({
  controls,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  const count = controls.length;
  const stepFrames = PERIOD / count;
  /** Half-step shift: the hop never lands on the wrap frame. See header. */
  const shifted = wrap(frame + stepFrames / 2, PERIOD);
  const focused = Math.min(count - 1, Math.floor(shifted / stepFrames));
  const sinceHop = shifted - focused * stepFrames;

  /** The only animated property in the whole spec. */
  const offset = 2 * progress(sinceHop, fps, 0, 120, EASE_OUT_EXPO);
  const key = progress(sinceHop, fps, 0, 50) - progress(sinceHop, fps, 90, 60);

  const stageW = 760 * unit;
  const stageH = 230 * unit;
  const cellW = 150 * unit;
  const cellH = 46 * unit;
  const cellGap = 24 * unit;
  const rowW = count * cellW + (count - 1) * cellGap;
  const rowLeft = (stageW - rowW) / 2;
  const rowTop = 56 * unit;

  return (
    <SpecStage
      caseRef="Case 95"
      title="Keyboard traversal — the ring does not travel"
      css="box-shadow ring: 0ms on hop, both directions · outline-offset 0 → 2px over 120ms var(--ease-out-expo) · no layoutId, no shared element"
      reduced="Hop is already instant; the 120ms offset growth becomes transition-property: none."
      phases={[
        { label: "Tab", fromMs: 0, toMs: 50, tone: "amber" },
        { label: "ring hop", fromMs: 0, toMs: 0 },
        { label: "offset settle", fromMs: 0, toMs: 120, tone: "cyan" },
        { label: "dwell", fromMs: 120, toMs: STEP_MS, tone: "muted" },
      ]}
      elapsedMs={framesToMs(sinceHop, fps)}
      totalMs={STEP_MS}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {controls.map((control, i) => {
          const isFocused = i === focused;
          return (
            <div
              key={control}
              style={{
                position: "absolute",
                left: rowLeft + i * (cellW + cellGap),
                top: rowTop,
                width: cellW,
                height: cellH,
                borderRadius: RADIUS.lg * unit,
                boxSizing: "border-box",
                backgroundColor: isFocused ? BRAND.surface3 : BRAND.surface1,
                border: `${1 * unit}px solid ${isFocused ? BRAND.borderInteractive : BRAND.border}`,
                // Full strength or absent. There is no in-between value.
                boxShadow: isFocused ? focusRing(unit, 1, offset) : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SANS_FONT,
                fontSize: 14 * unit,
                fontWeight: isFocused ? 600 : 400,
                color: isFocused ? BRAND.foreground : BRAND.foregroundSoft,
              }}
            >
              {control}
            </div>
          );
        })}

        {/* Tab order markers — the sequence being traversed, stated. */}
        {controls.map((control, i) => (
          <div
            key={`order-${control}`}
            style={{
              position: "absolute",
              left: rowLeft + i * (cellW + cellGap),
              top: rowTop - 24 * unit,
              width: cellW,
              textAlign: "center",
              fontFamily: MONO_FONT,
              fontSize: 10 * unit,
              color: i === focused ? BRAND.primary : BRAND.mutedForeground,
            }}
          >
            {`tabindex ${i + 1}`}
          </div>
        ))}

        <div
          style={{
            position: "absolute",
            left: rowLeft,
            top: rowTop + cellH + 40 * unit,
            display: "flex",
            alignItems: "center",
            gap: 12 * unit,
          }}
        >
          <KeyCap unit={unit} label="Tab" pressed={key} />
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 11.5 * unit,
              color: BRAND.mutedForeground,
            }}
          >
            {`focus → "${controls[focused]}" · outline-offset ${offset.toFixed(2)}px`}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: rowLeft,
            top: rowTop + cellH + 72 * unit,
            width: rowW,
            fontFamily: SANS_FONT,
            fontSize: 12 * unit,
            color: BRAND.mutedForeground,
          }}
        >
          Between controls the ring appears and disappears. Inside one list it
          travels — that is case 26, and it is a different object.
        </div>
      </div>
    </SpecStage>
  );
};
