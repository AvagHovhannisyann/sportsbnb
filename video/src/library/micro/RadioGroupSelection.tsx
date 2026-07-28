/**
 * RadioGroupSelection — selection moving between mutually exclusive options.
 * The pattern behind case 71 (player vs owner on /signup) and the payment
 * provider list in case 56.
 *
 * WHAT IS SPECIFIED
 *   A radio group has one thing a checkbox does not: whatever is arriving is
 *   arriving *from* somewhere. So the two halves get different timings. The
 *   incoming dot scales 0 → 1 over 180ms on `--ease-spring`
 *   (`cubic-bezier(0.34, 1.56, 0.64, 1)`) — the one place in this family an
 *   overshoot is allowed, because the dot is inside a ring with room to spare
 *   and a selection is a small win. The outgoing dot leaves over 120ms with no
 *   overshoot, on `ease-in`: it is not a win, it is a consequence.
 *   Ring colour follows the dot at 150ms; the row's background tints at 150ms.
 *
 * CSS EQUIVALENT
 *   .dot  { transform: scale(0); transition: transform 120ms cubic-bezier(0.4,0,1,1); }
 *   [data-state="checked"] .dot {
 *           transform: scale(1); transition: transform 180ms cubic-bezier(0.34,1.56,0.64,1); }
 *   .ring { transition: border-color 150ms cubic-bezier(0.16,1,0.3,1),
 *                       background-color 150ms cubic-bezier(0.16,1,0.3,1); }
 *   framer-motion: animate={{ scale: checked ? 1 : 0 }}
 *                  transition={{ duration: checked ? 0.18 : 0.12,
 *                                ease: checked ? [0.34,1.56,0.64,1] : [0.4,0,1,1] }}
 *
 * REDUCED MOTION
 *   `transform: none` and the dot is drawn at full size immediately; the
 *   colour changes survive at 150ms because they are the state. Explicitly do
 *   not keep the spring at duration 0 — an overshoot with no time to resolve
 *   is a layout jump. Loop freezes at frame 0, which is option 3 selected
 *   (see the seam note).
 *
 * LOOP
 *   Seamless, via the `stepCycle` lattice. Step `i` begins by travelling from
 *   `i − 1` to `i`, so at local frame 0 the travel `2 → 0` sits at t = 0 and
 *   paints option 3 selected; at local frame `period` we are at the settled
 *   end of step 2, which is also option 3 selected. Identical pictures, so the
 *   wrap is invisible. 1000ms per option × 3 = 3000ms.
 */

import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_IN,
  EASE_OUT_EXPO,
  EASE_SPRING,
  MONO_FONT,
  RADIUS,
  SANS_FONT,
  courtGreen,
  framesToMs,
  hairline,
  progress,
  stepCycle,
  useSpecFrame,
} from "./microKit";
import { SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 3000ms at 60fps — three options, one second each. */
const PERIOD = 180;
const TRAVEL_MS = 180;

export type RadioGroupSelectionProps = {
  /** The three mutually exclusive options, top to bottom. */
  options: readonly string[];
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const radioGroupSelectionDefaultProps: RadioGroupSelectionProps = {
  options: ["Idram", "Telcell", "Card — Visa / Mastercard"],
  speed: 1,
};

export const RadioGroupSelection: FC<RadioGroupSelectionProps> = ({
  options,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  const count = options.length;
  const step = stepCycle(frame, fps, PERIOD, count, TRAVEL_MS, EASE_SPRING);
  /** The outgoing dot runs on its own, shorter, un-sprung curve. */
  const leaving = progress(step.localFrame, fps, 0, 120, EASE_IN);
  /** Ring and row colour, 150ms, following the dot rather than leading it. */
  const tint = progress(step.localFrame, fps, 0, 150, EASE_OUT_EXPO);

  const rowH = 54 * unit;
  const gap = 10 * unit;
  const stageW = 560 * unit;
  const stageH = count * rowH + (count - 1) * gap;
  const ring = 20 * unit;

  return (
    <SpecStage
      caseRef="Case 71"
      title="Radio group — selection"
      css="incoming dot scale 0→1 180ms var(--ease-spring) · outgoing dot 120ms ease-in, no overshoot · ring + row colour 150ms var(--ease-out-expo)"
      reduced="transform: none, dot drawn at full size at once. Colour still moves at 150ms; the spring is dropped, not zeroed."
      phases={[
        { label: "dot in (spring)", fromMs: 0, toMs: TRAVEL_MS },
        { label: "dot out", fromMs: 0, toMs: 120, tone: "amber" },
        { label: "colour", fromMs: 0, toMs: 150, tone: "cyan" },
        { label: "hold", fromMs: TRAVEL_MS, toMs: 1000, tone: "muted" },
      ]}
      elapsedMs={framesToMs(step.localFrame, fps)}
      totalMs={framesToMs(PERIOD / count, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {options.map((option, i) => {
          const isArriving = i === step.to;
          const isLeaving = i === step.from && step.from !== step.to;
          const dot = isArriving ? step.t : isLeaving ? 1 - leaving : 0;
          const heat = isArriving ? tint : isLeaving ? 1 - tint : 0;

          return (
            <div
              key={option}
              style={{
                position: "absolute",
                left: 0,
                top: i * (rowH + gap),
                width: stageW,
                height: rowH,
                borderRadius: RADIUS.lg * unit,
                boxSizing: "border-box",
                backgroundColor: courtGreen(0.04 + 0.08 * heat),
                border: `${1.5 * unit}px solid ${
                  heat > 0 ? courtGreen(0.2 + 0.55 * heat) : hairline(1)
                }`,
                display: "flex",
                alignItems: "center",
                paddingLeft: 18 * unit,
                gap: 14 * unit,
              }}
            >
              <div
                style={{
                  width: ring,
                  height: ring,
                  borderRadius: 999,
                  boxSizing: "border-box",
                  border: `${2 * unit}px solid ${
                    heat > 0 ? courtGreen(0.35 + 0.65 * heat) : BRAND.borderStrong
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: ring * 0.5,
                    height: ring * 0.5,
                    borderRadius: 999,
                    backgroundColor: BRAND.primary,
                    // The spring lives here and nowhere else.
                    transform: `scale(${dot})`,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: SANS_FONT,
                  fontSize: 15 * unit,
                  color: heat > 0.4 ? BRAND.foreground : BRAND.foregroundSoft,
                }}
              >
                {option}
              </span>
              {isArriving ? (
                <span
                  style={{
                    marginLeft: "auto",
                    marginRight: 16 * unit,
                    fontFamily: MONO_FONT,
                    fontSize: 11 * unit,
                    color: BRAND.primary,
                  }}
                >
                  {`scale(${dot.toFixed(3)})`}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </SpecStage>
  );
};
