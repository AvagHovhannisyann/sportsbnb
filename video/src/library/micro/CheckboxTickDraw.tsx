/**
 * CheckboxTickDraw — a checkbox that draws its tick instead of pasting it.
 * Component: `src/components/ui/checkbox.tsx:12-22`. Related catalogue work:
 * case 70's four password ticks and case 42's amenity list.
 *
 * WHAT IS SPECIFIED
 *   Two properties, two durations, one 40ms offset between them. The box fill
 *   scales up from the centre over 120ms (`--ease-out-expo`); the tick then
 *   draws along its own path over 150ms via `stroke-dashoffset`, starting 40ms
 *   in — late enough that the fill reads as the surface the tick is drawn on,
 *   early enough that the two feel like one gesture. Total 190ms, inside the
 *   150–250ms feedback band.
 *
 *   Unchecking is not the reverse at the same speed: the tick retracts over
 *   100ms and the fill follows over 120ms. Removing a choice is not an
 *   achievement and should not be given the same weight.
 *
 * CSS EQUIVALENT
 *   .box   { transition: background-color 120ms cubic-bezier(0.16,1,0.3,1),
 *                        transform        120ms cubic-bezier(0.16,1,0.3,1); }
 *   .tick  { stroke-dasharray: 22.6; stroke-dashoffset: 22.6;
 *            transition: stroke-dashoffset 150ms cubic-bezier(0.16,1,0.3,1) 40ms; }
 *   [data-state="checked"] .tick { stroke-dashoffset: 0; }
 *   framer-motion: <motion.path animate={{ pathLength: checked ? 1 : 0 }}
 *                  transition={{ duration: 0.15, delay: 0.04,
 *                                ease: [0.16,1,0.3,1] }} />
 *
 * REDUCED MOTION
 *   `transition: none` on both. The box is filled and the tick is whole on the
 *   frame the state changes — a checkbox is a statement of fact and must never
 *   be caught half-drawn. Nothing is lost: `aria-checked` was always the real
 *   carrier. Here the loop freezes at frame 0, the unchecked state.
 *
 * LOOP
 *   Seamless, and this one is exact rather than approximate: `strokeDashoffset`
 *   returns to precisely `TICK_LEN`, the measured path length, at both ends of
 *   the cycle, because both drivers are `toggleCycle` values that are exactly 0
 *   at local frame 0 and at local frame 120 (clamped rise 1 minus clamped fall
 *   1). No residual sub-pixel offset accumulates across the wrap.
 *
 * SCALE
 *   Drawn at 4× CSS pixels: the control is 16×16 and the tick is 1.5px wide.
 */

import type { FC } from "react";
import { interpolateColors, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_IN,
  EASE_OUT_EXPO,
  MONO_FONT,
  RADIUS,
  SANS_FONT,
  courtGreen,
  framesToMs,
  mix,
  toggleCycle,
  useSpecFrame,
  wrap,
} from "./microKit";
import { SpecStage, StateChip } from "./specStage";

const CANVAS_W = 960;
/** 2000ms at 60fps. */
const PERIOD = 120;

const CHECK_MS = 350;
const UNCHECK_MS = 1300;
const ZOOM = 4;

/**
 * Path length of `M5 12.5 L10 17 L19 6.5` in the 24-unit viewBox, computed
 * once by hand rather than measured in the DOM: √(5² + 4.5²) + √(9² + 10.5²)
 * = 6.727 + 13.832 = 20.56. Hard-coding it is what makes the dash maths exact
 * and machine-independent; `getTotalLength()` would need a layout pass.
 */
const TICK_LEN = 20.56;

export type CheckboxTickDrawProps = {
  /** The label beside the box. */
  label: string;
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const checkboxTickDrawDefaultProps: CheckboxTickDrawProps = {
  label: "Send me a reminder 2 hours before",
  speed: 1,
};

export const CheckboxTickDraw: FC<CheckboxTickDrawProps> = ({
  label,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  /** The fill: 120ms in, 120ms out, starting on the change. */
  const fill = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: CHECK_MS,
    onDurMs: 120,
    offAtMs: UNCHECK_MS + 100,
    offDurMs: 120,
    onEase: EASE_OUT_EXPO,
    offEase: EASE_IN,
  });

  /** The tick: 150ms in at +40ms, 100ms out, leaving before the fill does. */
  const tick = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: CHECK_MS + 40,
    onDurMs: 150,
    offAtMs: UNCHECK_MS,
    offDurMs: 100,
    onEase: EASE_OUT_EXPO,
    offEase: EASE_IN,
  });

  const px = unit * ZOOM;
  const box = 16 * px;
  const stageW = 760 * unit;
  const stageH = 220 * unit;
  const boxLeft = stageW / 2 - 170 * unit;
  const boxTop = (stageH - box) / 2 - 10 * unit;

  return (
    <SpecStage
      title="Checkbox — tick draw"
      css="fill scale+colour 120ms var(--ease-out-expo) · stroke-dashoffset 20.56 → 0 over 150ms, delayed 40ms · uncheck 100ms tick / 120ms fill, ease-in"
      reduced="transition: none — box filled and tick whole on the frame the state changes. Never caught half-drawn."
      phases={[
        { label: "fill", fromMs: CHECK_MS, toMs: CHECK_MS + 120 },
        { label: "tick draw", fromMs: CHECK_MS + 40, toMs: CHECK_MS + 190, tone: "cyan" },
        { label: "tick retract", fromMs: UNCHECK_MS, toMs: UNCHECK_MS + 100, tone: "amber" },
        { label: "fill out", fromMs: UNCHECK_MS + 100, toMs: UNCHECK_MS + 220, tone: "muted" },
      ]}
      elapsedMs={framesToMs(wrap(frame, PERIOD), fps)}
      totalMs={framesToMs(PERIOD, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        <div
          style={{
            position: "absolute",
            left: boxLeft,
            top: boxTop,
            width: box,
            height: box,
            borderRadius: RADIUS.sm * px * 0.25,
            boxSizing: "border-box",
            border: `${1 * px}px solid ${BRAND.primary}`,
            backgroundColor: interpolateColors(
              fill,
              [0, 1],
              ["rgba(0, 0, 0, 0)", BRAND.primary],
            ),
            // The fill grows from the centre — a 3% swell, not a pop.
            transform: `scale(${mix(1, 1.03, fill)})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width={box * 0.82}
            height={box * 0.82}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M5 12.5 L10 17 L19 6.5"
              stroke={BRAND.primaryForeground}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={TICK_LEN}
              // Exactly TICK_LEN at both ends of the loop. This is the seam.
              strokeDashoffset={TICK_LEN * (1 - tick)}
            />
          </svg>
        </div>

        <div
          style={{
            position: "absolute",
            left: boxLeft + box + 22 * unit,
            top: boxTop + box / 2 - 11 * unit,
            fontFamily: SANS_FONT,
            fontSize: 15 * unit,
            color: BRAND.foreground,
          }}
        >
          {label}
        </div>

        <div
          style={{
            position: "absolute",
            left: boxLeft,
            top: boxTop + box + 26 * unit,
            fontFamily: MONO_FONT,
            fontSize: 11.5 * unit,
            color: tick > 0.02 ? BRAND.primary : BRAND.mutedForeground,
          }}
        >
          {`stroke-dashoffset: ${(TICK_LEN * (1 - tick)).toFixed(2)} / ${TICK_LEN}`}
        </div>

        <div
          style={{
            position: "absolute",
            left: boxLeft,
            top: boxTop - 44 * unit,
            display: "flex",
            gap: 8 * unit,
          }}
        >
          <StateChip unit={unit} label="data-state=checked" active={fill} />
        </div>

        {/* The dash gauge — a literal read-out of the number above. */}
        <div
          style={{
            position: "absolute",
            left: boxLeft + box + 22 * unit,
            top: boxTop + box + 30 * unit,
            width: 220 * unit,
            height: 5 * unit,
            borderRadius: 999,
            backgroundColor: courtGreen(0.14),
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${tick * 100}%`,
              height: "100%",
              backgroundColor: BRAND.primary,
            }}
          />
        </div>
      </div>
    </SpecStage>
  );
};
