/**
 * DropdownItemHighlight — the cursor travelling inside one open menu.
 * Spec for MOTION-DESIGN-CASES case 26 (the keyboard cursor rail in the
 * `/venues` suggestion list), and the deliberate opposite of case 95 as applied
 * in KeyboardTabTraverse.
 *
 * WHAT IS SPECIFIED
 *   ONE highlight element, moved. Not a background colour switched off one row
 *   and on another. `translateY` between measured row offsets, 120ms
 *   `--ease-out-expo`; the row's own label colour crossfades over the same
 *   120ms, `linear`, so it tracks the bar rather than leading or lagging it.
 *
 *   THE CONTRAST IS THE POINT. Between separate controls the focus ring must
 *   NOT travel (case 95, KeyboardTabTraverse) — it spends the transition
 *   attached to nothing, and a user holding Tab outruns it. Inside one list the
 *   opposite holds: the rows are 34px apart, the cursor is a single continuous
 *   object, and the travel is the only thing that says so. 120ms over 34px is
 *   283px/s; the same 120ms over the 174px gap between two toolbar controls
 *   would be 1450px/s, which is a streak, not a cursor.
 *
 *   Held arrow keys repeat at ~33ms once the OS delay elapses, which is faster
 *   than the 120ms travel. The bar must therefore re-target from its CURRENT
 *   position rather than restarting from the previous row — `transition` on
 *   `transform` does this for free; a keyframe animation does not, which is the
 *   reason for the build note below.
 *
 * CSS EQUIVALENT
 *   .menu-cursor { transition: transform 120ms cubic-bezier(0.16,1,0.3,1); }
 *   .menu-item   { transition: color 120ms linear; }
 *   framer-motion: <motion.span layoutId="menu-cursor" /> rendered inside the
 *   active `<li>` — the target position is whatever the DOM measures, and the
 *   rows are not a fixed height once a two-line result appears.
 *   Pair it with `aria-activedescendant` on the input; the bar is the visual
 *   half of a state the screen reader gets from the attribute.
 *
 * REDUCED MOTION
 *   `transition: none` on the cursor and the labels. The bar jumps between
 *   rows, which is what a non-animated listbox has always done and is
 *   completely legible — the highlight is a solid fill, not a subtle one. Note
 *   this makes reduced motion here identical to the *rejected* behaviour of
 *   case 95's ring, and that is fine: the argument against a travelling ring is
 *   about a 174px gap, not about travel as such.
 *   Loop freezes at frame 0, cursor settled on the last row.
 *
 * LOOP
 *   Seamless, via `stepCycle`'s lattice. Every visual property is derived from
 *   the `(from, to, t)` triple and never from the raw index, which is what
 *   makes the ends agree: at local frame 0 the step is `3 → 0` at `t = 0`, so
 *   the bar paints at row 3 and row 3 holds the label emphasis; at local frame
 *   168⁻ the step is `2 → 3` at `t = 1`, so the bar paints at row 3 and row 3
 *   holds the emphasis. Same picture, both ends. The keycap pulse is
 *   `progress(0,50) − progress(90,60)` on the step-local frame: 0 at the start
 *   of a step and 1 − 1 = 0 by 150ms, well inside the 700ms dwell.
 *   4 rows × 700ms = 2800ms at 60fps.
 */

import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_LINEAR,
  EASE_OUT_EXPO,
  MONO_FONT,
  RADIUS,
  SANS_FONT,
  courtGreen,
  framesToMs,
  mix,
  progress,
  stepCycle,
  useSpecFrame,
} from "./microKit";
import { KeyCap, SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 4 rows × 700ms = 2800ms at 60fps. */
const PERIOD = 168;
const STEP_MS = 700;
const TRAVEL_MS = 120;

export type DropdownItemHighlightProps = {
  /** The rows in the open menu, top to bottom. */
  items: readonly string[];
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const dropdownItemHighlightDefaultProps: DropdownItemHighlightProps = {
  items: [
    "Ararat Arena · Yerevan",
    "Mika Sports Complex · Yerevan",
    "Hrazdan Field · Kotayk",
    "Vanadzor Indoor · Lori",
  ],
  speed: 1,
};

export const DropdownItemHighlight: FC<DropdownItemHighlightProps> = ({
  items,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  const count = items.length;
  const step = stepCycle(frame, fps, PERIOD, count, TRAVEL_MS, EASE_OUT_EXPO);
  /** Label colour, on the same 120ms but linear — it tracks, it does not lead. */
  const tint = progress(step.localFrame, fps, 0, TRAVEL_MS, EASE_LINEAR);
  /** ↓ keycap. Zero at the start of a step and zero again by 150ms. */
  const key =
    progress(step.localFrame, fps, 0, 50) - progress(step.localFrame, fps, 90, 60);

  const stageW = 560 * unit;
  const stageH = 232 * unit;
  const rowH = 34 * unit;
  const listTop = 34 * unit;
  const listPad = 6 * unit;

  /** Every property below is a from → to blend. Never a raw index. */
  const cursorY = mix(step.from, step.to, step.t) * rowH;
  const emphasis = (i: number): number =>
    (i === step.to ? tint : 0) + (i === step.from ? 1 - tint : 0);

  return (
    <SpecStage
      caseRef="Case 26"
      title="Menu cursor — inside one list, it travels"
      css="one element, transform: translateY(row) · 120ms var(--ease-out-expo) · label color 120ms linear · framer-motion layoutId=&quot;menu-cursor&quot;, paired with aria-activedescendant"
      reduced="transition: none — the bar jumps between rows. A solid fill needs no travel to be found."
      phases={[
        { label: "travel", fromMs: 0, toMs: TRAVEL_MS },
        { label: "↓ keypress", fromMs: 0, toMs: 150, tone: "amber" },
        { label: "dwell", fromMs: TRAVEL_MS, toMs: STEP_MS, tone: "muted" },
      ]}
      elapsedMs={framesToMs(step.localFrame, fps)}
      totalMs={STEP_MS}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: listTop,
            width: stageW,
            height: count * rowH + listPad * 2,
            borderRadius: RADIUS.lg * unit,
            backgroundColor: BRAND.popover,
            border: `${1 * unit}px solid ${BRAND.border}`,
            paddingTop: listPad,
            paddingBottom: listPad,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {/* ONE cursor. It is moved; it is never switched. */}
          <div
            style={{
              position: "absolute",
              left: listPad,
              top: listPad,
              width: stageW - listPad * 2,
              height: rowH,
              borderRadius: RADIUS.md * unit,
              backgroundColor: courtGreen(0.14),
              borderLeft: `${2 * unit}px solid ${BRAND.primary}`,
              boxSizing: "border-box",
              transform: `translateY(${cursorY}px)`,
            }}
          />

          {items.map((item, i) => {
            const e = emphasis(i);
            return (
              <div
                key={item}
                style={{
                  position: "relative",
                  height: rowH,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingLeft: 18 * unit,
                  paddingRight: 16 * unit,
                  fontFamily: SANS_FONT,
                  fontSize: 13 * unit,
                  color: e > 0.5 ? BRAND.foreground : BRAND.foregroundSoft,
                }}
              >
                <span>{item}</span>
                <span
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: 9.5 * unit,
                    color: BRAND.primary,
                    opacity: e,
                  }}
                >
                  aria-selected
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: listTop + count * rowH + listPad * 2 + 20 * unit,
            display: "flex",
            alignItems: "center",
            gap: 12 * unit,
          }}
        >
          <KeyCap unit={unit} label="↓" pressed={key} />
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 11 * unit,
              color: BRAND.mutedForeground,
            }}
          >
            {`translateY ${(cursorY / unit).toFixed(1)}px · ${(rowH / unit).toFixed(0)}px rows over 120ms = 283px/s`}
          </span>
        </div>
      </div>
    </SpecStage>
  );
};
