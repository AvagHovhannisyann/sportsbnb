/**
 * SwitchThumbTravel — the Radix switch, at the timing it already ships.
 * Spec for the first half of MOTION-DESIGN-CASES case 96; the component is
 * `src/components/ui/switch.tsx:12,20`.
 *
 * WHAT IS SPECIFIED
 *   Track `w-11 h-6` (44×24px) with `border-2 border-transparent`, thumb
 *   `h-5 w-5` (20px), `data-[state=checked]:translate-x-5` — 20px of travel,
 *   which is 44 − 2 − 2 − 20 exactly. The thumb runs on Tailwind's default
 *   `transition-transform`: 150ms `cubic-bezier(0.4, 0, 0.2, 1)`. The track
 *   crossfades `--input` → `--primary` under `transition-colors`, same 150ms.
 *
 *   Case 96 is explicit that this is already correct and must NOT be re-curved
 *   to `--ease-out-expo`, and certainly not to `--ease-spring`: a switch thumb
 *   that overshoots leaves its own track. 150ms is `--dur-fast`.
 *
 * CSS EQUIVALENT
 *   .track { transition: background-color 150ms cubic-bezier(0.4,0,0.2,1); }
 *   .thumb { transition: transform        150ms cubic-bezier(0.4,0,0.2,1); }
 *   [data-state="checked"] .thumb { transform: translateX(20px); }
 *   framer-motion: animate={{ x: on ? 20 : 0 }}
 *                  transition={{ duration: 0.15, ease: [0.4,0,0.2,1] }}
 *
 * REDUCED MOTION
 *   `transition: none` on the thumb — it is at the far end of the track on the
 *   frame the state flips. The track colour still changes (it is the state,
 *   not decoration) and `role="switch"` + `aria-checked` carry it regardless.
 *   Here the loop freezes at frame 0, the unchecked state.
 *
 * LOOP
 *   Seamless. `toggleCycle`: a clamped rise minus a clamped fall, so local
 *   frame 0 is 0 − 0 and local frame 120 is 1 − 1 — both exactly the unchecked
 *   position. Period 2000ms; the switch-off has settled at 1400ms.
 *
 * SCALE
 *   Drawn at 2.6× CSS pixels so a 20px travel is legible; every figure quoted
 *   on screen is in CSS px.
 */

import type { FC } from "react";
import { interpolateColors, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_STANDARD,
  MONO_FONT,
  SANS_FONT,
  framesToMs,
  shadow,
  toggleCycle,
  useSpecFrame,
  wrap,
} from "./microKit";
import { Pointer, SpecStage, StateChip } from "./specStage";

const CANVAS_W = 960;
/** 2000ms at 60fps. */
const PERIOD = 120;

const ON_MS = 350;
const OFF_MS = 1250;
/** Drawing scale. The switch is 44×24 CSS px, which is too small to inspect. */
const ZOOM = 2.6;

export type SwitchThumbTravelProps = {
  /** The setting the switch governs. `/profile` ships four of these. */
  label: string;
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const switchThumbTravelDefaultProps: SwitchThumbTravelProps = {
  label: "Booking reminders",
  speed: 1,
};

export const SwitchThumbTravel: FC<SwitchThumbTravelProps> = ({
  label,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  const on = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: ON_MS,
    onDurMs: 150,
    offAtMs: OFF_MS,
    offDurMs: 150,
    onEase: EASE_STANDARD,
    offEase: EASE_STANDARD,
  });

  const px = unit * ZOOM;
  const trackW = 44 * px;
  const trackH = 24 * px;
  const thumb = 20 * px;
  /** 44 − border-2 ×2 − 20 = 20. `translate-x-5` is not a coincidence. */
  const travel = 20 * px;

  const stageW = 760 * unit;
  const stageH = 220 * unit;
  const trackLeft = (stageW - trackW) / 2;
  const trackTop = (stageH - trackH) / 2 - 8 * unit;

  return (
    <SpecStage
      caseRef="Case 96"
      title="Switch — thumb travel"
      css="transform: translateX(20px) · 150ms cubic-bezier(0.4, 0, 0.2, 1) · track background-color 150ms, same curve · never --ease-spring"
      reduced="transition: none. The thumb is simply at the other end; the track colour still changes."
      phases={[
        { label: "off", fromMs: 0, toMs: ON_MS, tone: "muted" },
        { label: "on", fromMs: ON_MS, toMs: ON_MS + 150 },
        { label: "held", fromMs: ON_MS + 150, toMs: OFF_MS, tone: "muted" },
        { label: "off", fromMs: OFF_MS, toMs: OFF_MS + 150, tone: "cyan" },
      ]}
      elapsedMs={framesToMs(wrap(frame, PERIOD), fps)}
      totalMs={framesToMs(PERIOD, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        <div
          style={{
            position: "absolute",
            left: trackLeft,
            top: trackTop,
            width: trackW,
            height: trackH,
            borderRadius: 999,
            backgroundColor: interpolateColors(on, [0, 1], [BRAND.input, BRAND.primary]),
            border: `${2 * px}px solid transparent`,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: thumb,
              height: thumb,
              borderRadius: 999,
              backgroundColor: BRAND.background,
              boxShadow: shadow(unit, "lg"),
              transform: `translateX(${travel * on}px)`,
            }}
          />
        </div>

        {/* Travel ruler. The number under a moving part is the spec. */}
        <div
          style={{
            position: "absolute",
            left: trackLeft + 2 * px + thumb / 2,
            top: trackTop + trackH + 14 * unit,
            width: travel,
            height: 1 * unit,
            backgroundColor: BRAND.borderStrong,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: trackLeft,
            top: trackTop + trackH + 22 * unit,
            width: trackW,
            textAlign: "center",
            fontFamily: MONO_FONT,
            fontSize: 11.5 * unit,
            color: on > 0.02 ? BRAND.primary : BRAND.mutedForeground,
          }}
        >
          {`translateX(${(20 * on).toFixed(1)}px)`}
        </div>

        <div
          style={{
            position: "absolute",
            left: trackLeft - 250 * unit,
            top: trackTop + trackH / 2 - 10 * unit,
            width: 230 * unit,
            textAlign: "right",
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
            left: trackLeft + trackW + 34 * unit,
            top: trackTop + trackH / 2 - 13 * unit,
          }}
        >
          <StateChip unit={unit} label="aria-checked" active={on} />
        </div>

        <Pointer
          unit={unit}
          x={trackLeft + trackW * 0.5}
          y={trackTop + trackH + 2 * unit}
          opacity={0.55 + 0.45 * on}
        />
      </div>
    </SpecStage>
  );
};
