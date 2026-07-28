/**
 * InputFocusFill — a text field taking focus, taking a value, and being cleared.
 * Spec for MOTION-DESIGN-CASES case 95 applied to `src/components/ui/input.tsx`,
 * whose `focus-visible:ring-2 focus-visible:ring-ring` currently inherits the
 * blanket `transition-colors` on the same element.
 *
 * WHAT IS SPECIFIED
 *   Three states in one field, and the exact set of properties each is allowed
 *   to move.
 *     :focus-visible — the ring is INSTANT (0ms), per case 95. The border
 *       colour underneath it is allowed 150ms, because a border is a surface
 *       and a ring is an answer. Ring and border are two properties with two
 *       durations on the same element; `transition-colors` gives them one.
 *     filled — the floated label is the only signal, and it floats on
 *       `:focus OR :not(:placeholder-shown)`, so it does not drop when focus
 *       leaves a field that has a value. 150ms on `--ease-out-expo` for
 *       `translateY` and `font-size` together.
 *     cleared — the × empties the field instantly (0ms; a value disappearing is
 *       a state change, not a journey) and the label drops on the same 150ms.
 *
 *   The caret is the one thing here that repeats: `1s step-end infinite`, which
 *   is the browser default and is deliberately not re-timed.
 *
 * CSS EQUIVALENT
 *   .field input { transition: border-color 150ms cubic-bezier(0.16,1,0.3,1); }
 *   .field input:focus-visible { box-shadow: 0 0 0 2px hsl(var(--background)),
 *                                            0 0 0 4px hsl(var(--ring));
 *                                transition: border-color 150ms cubic-bezier(0.16,1,0.3,1); }
 *     — note `box-shadow` is absent from the transition list on purpose.
 *   .field label { transition: transform 150ms cubic-bezier(0.16,1,0.3,1),
 *                              font-size 150ms cubic-bezier(0.16,1,0.3,1); }
 *   .field input:focus + label,
 *   .field input:not(:placeholder-shown) + label { transform: translateY(-20px); }
 *   framer-motion: not needed and not wanted — this is four CSS transitions on
 *   two elements, and `AnimatePresence` around a label that never unmounts is
 *   machinery for nothing.
 *
 * REDUCED MOTION
 *   The ring is already instant, so it is untouched — that is the point of case
 *   95 and it is an accessibility win, not a compromise. The 150ms border and
 *   the 150ms label float both go to `transition: none`: the label is at its
 *   floated position on the frame focus lands, the border is its focused
 *   colour on the same frame. Nothing is lost, because none of the three
 *   states was ever communicated by the transition — only by the end value.
 *   The caret keeps blinking; `prefers-reduced-motion` is about vestibular
 *   motion, and a caret is a text cursor, not a moving object. Loop freezes at
 *   frame 0: empty, unfocused, label at rest.
 *
 * LOOP
 *   Seamless. Five `toggleCycle` drivers, each a clamped rise minus a clamped
 *   fall, so each is exactly 0 at local frame 0 and exactly 0 at local frame
 *   180. The caret is a `squareWave` at 1000ms and the period is 3000ms —
 *   a whole multiple, so the square wave closes too — and it is gated by the
 *   focus driver, which is 0 at both ends, so the caret is absent at the seam
 *   either way. 3000ms at 60fps.
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
  mix,
  mutedInk,
  squareWave,
  toggleCycle,
  useSpecFrame,
  wrap,
} from "./microKit";
import { Pointer, SpecStage, StateChip } from "./specStage";

const CANVAS_W = 960;
/** 3000ms at 60fps. A whole multiple of the 1000ms caret period. */
const PERIOD = 180;

const FOCUS_MS = 300;
const TYPE_MS = 800;
const BLUR_MS = 1800;
const CLEAR_MS = 2400;

export type InputFocusFillProps = {
  label: string;
  /** The value the field ends up holding. Set instantly, per the header. */
  value: string;
  /** Clock multiplier; 1 is production timing. `0.25` walks it for inspection. */
  speed: number;
};

export const inputFocusFillDefaultProps: InputFocusFillProps = {
  label: "Venue name",
  value: "Ararat Arena",
  speed: 1,
};

export const InputFocusFill: FC<InputFocusFillProps> = ({
  label,
  value,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  /** The ring. 0ms in and 0ms out — a step function, deliberately. */
  const ring = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: FOCUS_MS,
    onDurMs: 0,
    offAtMs: BLUR_MS,
    offDurMs: 0,
  });

  /** The border underneath it. 150ms, both directions. */
  const tint = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: FOCUS_MS,
    onDurMs: 150,
    offAtMs: BLUR_MS,
    offDurMs: 150,
    onEase: EASE_OUT_EXPO,
    offEase: EASE_OUT_EXPO,
  });

  /** The value itself. Instant on, instant off — see header. */
  const filled = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: TYPE_MS,
    onDurMs: 0,
    offAtMs: CLEAR_MS,
    offDurMs: 0,
  });

  /**
   * The floated label. Its window opens with focus and closes with the clear,
   * which is exactly `:focus OR :not(:placeholder-shown)` — the label does not
   * drop at blur, because the field still has a value then.
   */
  const floated = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: FOCUS_MS,
    onDurMs: 150,
    offAtMs: CLEAR_MS,
    offDurMs: 150,
    onEase: EASE_OUT_EXPO,
    offEase: EASE_OUT_EXPO,
  });

  /** The clear affordance only exists while there is something to clear. */
  const clearBtn = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: TYPE_MS,
    onDurMs: 150,
    offAtMs: CLEAR_MS,
    offDurMs: 150,
    onEase: EASE_OUT_EXPO,
    offEase: EASE_OUT_EXPO,
  });

  const caret = ring * squareWave(frame, fps, 1000);

  const stageW = 620 * unit;
  const stageH = 230 * unit;
  const fieldW = 420 * unit;
  const fieldH = 48 * unit;
  const fieldLeft = (stageW - fieldW) / 2;
  const fieldTop = 74 * unit;

  const borderColour = tint > 0.5 ? BRAND.primary : BRAND.border;
  const textW = value.length * 8.2 * unit;

  return (
    <SpecStage
      caseRef="Case 95"
      title="Input — focus, filled, cleared"
      css="ring 0ms (step) · border-color 150ms var(--ease-out-expo) · label translateY + font-size 150ms same curve · value set/clear 0ms · caret 1s step-end"
      reduced="Ring stays instant — unchanged. Border and label float both go to transition: none; the label is already floated on the frame focus lands."
      phases={[
        { label: "focus / ring", fromMs: FOCUS_MS, toMs: FOCUS_MS + 150 },
        { label: "value set", fromMs: TYPE_MS, toMs: TYPE_MS + 150, tone: "cyan" },
        { label: "held", fromMs: TYPE_MS + 150, toMs: BLUR_MS, tone: "muted" },
        { label: "blur", fromMs: BLUR_MS, toMs: BLUR_MS + 150, tone: "amber" },
        { label: "clear", fromMs: CLEAR_MS, toMs: CLEAR_MS + 150, tone: "rose" },
      ]}
      elapsedMs={framesToMs(wrap(frame, PERIOD), fps)}
      totalMs={framesToMs(PERIOD, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {/* The field. Border and ring are two properties at two durations. */}
        <div
          style={{
            position: "absolute",
            left: fieldLeft,
            top: fieldTop,
            width: fieldW,
            height: fieldH,
            boxSizing: "border-box",
            borderRadius: RADIUS.md * unit,
            backgroundColor: BRAND.input,
            border: `${1 * unit}px solid ${borderColour}`,
            boxShadow: ring > 0.5 ? focusRing(unit, 1, 2) : "none",
            display: "flex",
            alignItems: "center",
            paddingLeft: 14 * unit,
            paddingRight: 14 * unit,
          }}
        >
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 14 * unit,
              color: BRAND.foreground,
              opacity: filled,
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </span>
          {/* Caret. Sits after the value while there is one, at the start
              otherwise — which is where a real caret lands on focus. */}
          <span
            style={{
              width: 1.5 * unit,
              height: 18 * unit,
              marginLeft: filled > 0.5 ? 2 * unit : 0,
              backgroundColor: BRAND.primary,
              opacity: caret,
              transform: `translateX(${filled > 0.5 ? 0 : -textW}px)`,
            }}
          />
        </div>

        {/* The floated label. One driver, two properties. */}
        <div
          style={{
            position: "absolute",
            left: fieldLeft + 14 * unit,
            top: fieldTop + fieldH / 2 - 9 * unit,
            fontFamily: SANS_FONT,
            fontSize: mix(14, 11, floated) * unit,
            color: floated > 0.5 ? BRAND.primary : BRAND.mutedForeground,
            transform: `translateY(${mix(0, -32, floated) * unit}px)`,
            transformOrigin: "0% 50%",
          }}
        >
          {label}
        </div>

        {/* The clear button, which exists exactly while a value does. */}
        <div
          style={{
            position: "absolute",
            left: fieldLeft + fieldW - 30 * unit,
            top: fieldTop + fieldH / 2 - 9 * unit,
            width: 18 * unit,
            height: 18 * unit,
            borderRadius: 999,
            backgroundColor: mutedInk(0.18),
            opacity: clearBtn,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width={10 * unit} height={10 * unit} viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5"
              stroke={BRAND.foregroundSoft}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div
          style={{
            position: "absolute",
            left: fieldLeft,
            top: fieldTop - 42 * unit,
            display: "flex",
            gap: 8 * unit,
          }}
        >
          <StateChip unit={unit} label=":focus-visible" active={ring} />
          <StateChip unit={unit} label="filled" tone="cyan" active={filled} />
        </div>

        <div
          style={{
            position: "absolute",
            left: fieldLeft,
            top: fieldTop + fieldH + 26 * unit,
            width: fieldW,
            fontFamily: MONO_FONT,
            fontSize: 11.5 * unit,
            lineHeight: 1.75,
            color: BRAND.mutedForeground,
          }}
        >
          {`ring ${ring > 0.5 ? "on" : "off"} · border-color ${(tint * 100).toFixed(0)}%`}
          <br />
          {`label translateY ${mix(0, -32, floated).toFixed(1)}px`}
        </div>

        <Pointer
          unit={unit}
          x={fieldLeft + fieldW - 26 * unit}
          y={fieldTop + fieldH * 0.5}
          opacity={clearBtn}
        />
      </div>
    </SpecStage>
  );
};
