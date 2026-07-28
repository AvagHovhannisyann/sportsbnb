/**
 * ButtonPressScale — the press acknowledgement.
 * Spec for MOTION-DESIGN-CASES case 10, part (b).
 *
 * WHAT IS SPECIFIED
 *   `active:scale-[0.98]` already exists in `buttonVariants`
 *   (`src/components/ui/button.tsx:8`), but it inherits the blanket
 *   `transition-all duration-200`. 200ms for a press acknowledgement lands
 *   after the finger has already gone and reads as lag. The press tightens to
 *   120ms; the release is allowed 160ms, because a control returning to rest
 *   is not urgent and a 120ms return reads as a snap-back.
 *
 * CSS EQUIVALENT
 *   .btn        { transition: transform 160ms cubic-bezier(.2,.8,.2,1); }
 *   .btn:active { transform: scale(0.98); transition-duration: 120ms; }
 *   framer-motion: whileTap={{ scale: 0.98 }}
 *                  transition={{ duration: 0.12, ease: [0.2,0.8,0.2,1] }}
 *                  — this is `tapScale` in src/lib/motion.ts, which currently
 *                  says 0.97; 0.98 is what the CSS ships and the two should
 *                  agree.
 *
 * REDUCED MOTION
 *   `motion-reduce:active:scale-100`. The press is then carried by the
 *   background darkening alone (`active:bg-primary/85`), which is instant and
 *   needs no transition. Note the scale is currently unguarded — the block at
 *   `src/index.css:619` covers `.live-dot` and `.card-lift` only. Here the
 *   loop freezes at frame 0, the unpressed state.
 *
 * LOOP
 *   Seamless. `toggleCycle` again: rise minus fall, both clamped, so local
 *   frame 0 is 0 - 0 and local frame `period` is 1 - 1. Period 1500ms, the
 *   release has settled by 860ms.
 */

import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_SNAP,
  MONO_FONT,
  RADIUS,
  SANS_FONT,
  framesToMs,
  mix,
  shadowBlend,
  toggleCycle,
  useSpecFrame,
  wrap,
} from "./microKit";
import { Pointer, SpecStage, StateChip } from "./specStage";

const CANVAS_W = 960;
/** 1500ms at 60fps. */
const PERIOD = 90;

const PRESS_MS = 400;
const RELEASE_MS = 700;

export type ButtonPressScaleProps = {
  label: string;
  /** Clock multiplier; 1 is production timing. See ButtonHoverLift. */
  speed: number;
};

export const buttonPressScaleDefaultProps: ButtonPressScaleProps = {
  label: "Reserve slot",
  speed: 1,
};

export const ButtonPressScale: FC<ButtonPressScaleProps> = ({
  label,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  const press = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: PRESS_MS,
    onDurMs: 120,
    offAtMs: RELEASE_MS,
    offDurMs: 160,
    onEase: EASE_SNAP,
    offEase: EASE_SNAP,
  });

  const scale = mix(1, 0.98, press);

  const stageW = 760 * unit;
  const stageH = 220 * unit;
  const btnW = 200 * unit;
  const btnH = 48 * unit;
  const btnLeft = (stageW - btnW) / 2;
  const btnTop = (stageH - btnH) / 2 - 6 * unit;

  return (
    <SpecStage
      caseRef="Case 10"
      title="Button — press"
      css="transform: scale(0.98) · press 120ms cubic-bezier(.2,.8,.2,1) · release 160ms · NOT the inherited transition-all 200ms"
      reduced="scale stays 1. The press is carried by the fill darkening, which is instant."
      phases={[
        { label: "press", fromMs: PRESS_MS, toMs: PRESS_MS + 120 },
        { label: "held", fromMs: PRESS_MS + 120, toMs: RELEASE_MS, tone: "muted" },
        { label: "release", fromMs: RELEASE_MS, toMs: RELEASE_MS + 160, tone: "cyan" },
      ]}
      elapsedMs={framesToMs(wrap(frame, PERIOD), fps)}
      totalMs={framesToMs(PERIOD, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {/* Ghost outline at rest size. Without it a 2% scale is invisible —
            the whole reason a press this small is worth specifying is that it
            is felt rather than seen, and a spec has to show it anyway. */}
        <div
          style={{
            position: "absolute",
            left: btnLeft,
            top: btnTop,
            width: btnW,
            height: btnH,
            borderRadius: RADIUS.lg * unit,
            border: `${1 * unit}px dashed ${BRAND.borderStrong}`,
            opacity: 0.55 + 0.45 * press,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: btnLeft,
            top: btnTop,
            width: btnW,
            height: btnH,
            borderRadius: RADIUS.lg * unit,
            // active also darkens the fill; that half is instant in CSS.
            backgroundColor: `hsla(151, 90%, 47%, ${mix(1, 0.85, press)})`,
            boxShadow: shadowBlend(unit, "sm", "xs", press),
            transform: `scale(${scale})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: SANS_FONT,
            fontSize: 15 * unit,
            fontWeight: 600,
            color: BRAND.primaryForeground,
          }}
        >
          {label}
        </div>

        <div
          style={{
            position: "absolute",
            left: btnLeft,
            top: btnTop + btnH + 24 * unit,
            width: btnW,
            textAlign: "center",
            fontFamily: MONO_FONT,
            fontSize: 12 * unit,
            color: press > 0.02 ? BRAND.primary : BRAND.mutedForeground,
          }}
        >
          {`scale(${scale.toFixed(4)})`}
        </div>

        <div
          style={{
            position: "absolute",
            left: btnLeft + btnW / 2 - 34 * unit,
            top: btnTop - 42 * unit,
          }}
        >
          <StateChip unit={unit} label=":active" active={press} />
        </div>

        <Pointer
          unit={unit}
          x={btnLeft + btnW * 0.58}
          y={btnTop + btnH * 0.5}
          pressed={press}
        />
      </div>
    </SpecStage>
  );
};
