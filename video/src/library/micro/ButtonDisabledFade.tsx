/**
 * ButtonDisabledFade — a control going out of reach.
 * Supporting spec for MOTION-DESIGN-CASES case 94, and for the arming rule in
 * case 68 (the OTP verify button, which is disabled until six digits exist).
 *
 * WHAT IS SPECIFIED
 *   `disabled:opacity-50` plus `disabled:pointer-events-none`
 *   (`src/components/ui/button.tsx:8`). Today the opacity change runs on the
 *   blanket `transition-all duration-200`; case 94 tightens it to 120ms so it
 *   lands with the label crossfade rather than trailing it. Nothing else may
 *   move: a disabled control must not shrink, slide or wobble, because those
 *   read as a response to the click it is refusing.
 *
 *   The second half of the spec is not a transition at all — the cursor
 *   becomes `not-allowed` on the same frame the state flips, with no easing.
 *   A pointer affordance that fades in has lied for 120ms.
 *
 * CSS EQUIVALENT
 *   .btn            { transition: opacity 120ms cubic-bezier(0.16,1,0.3,1); }
 *   .btn:disabled   { opacity: 0.5; pointer-events: none; cursor: not-allowed; }
 *   framer-motion: animate={{ opacity: disabled ? 0.5 : 1 }}
 *                  transition={{ duration: 0.12, ease: [0.16,1,0.3,1] }}
 *
 * REDUCED MOTION
 *   Opacity-only is already the reduced-motion answer, so this one needs no
 *   fallback — but the transition still goes to `none`, i.e. the button snaps
 *   to 0.5. Opacity is information here (this control is unavailable) and must
 *   never be caught mid-interpolation.
 *
 * NOT A LOOP
 *   One-way. Reduced motion freezes at the LAST frame — the disabled state,
 *   which is what the piece exists to show. Freezing at 0 would show a
 *   perfectly ordinary button.
 */

import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_OUT_EXPO,
  MONO_FONT,
  RADIUS,
  SANS_FONT,
  framesToMs,
  hairline,
  mix,
  mutedInk,
  progress,
  shadowBlend,
  useSpecFrame,
} from "./microKit";
import { SpecStage, StateChip } from "./specStage";

const CANVAS_W = 960;
/** 1000ms at 60fps. */
const DURATION = 60;

const FLIP_MS = 300;

export type ButtonDisabledFadeProps = {
  label: string;
  /** Why the control is unavailable. Shown as the helper line. */
  reason: string;
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const buttonDisabledFadeDefaultProps: ButtonDisabledFadeProps = {
  label: "Verify code",
  reason: "Enter all 6 digits to continue",
  speed: 1,
};

export const ButtonDisabledFade: FC<ButtonDisabledFadeProps> = ({
  label,
  reason,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  // One-way: reduced motion holds the disabled state, which is the message.
  const frame = useSpecFrame(rawFrame, speed, (durationInFrames - 1) * speed);
  const unit = width / CANVAS_W;

  /** The only thing that animates. 120ms, and then it is done. */
  const off = progress(frame, fps, FLIP_MS, 120, EASE_OUT_EXPO);
  /** The cursor swap. 0ms — a step, deliberately. */
  const barred = progress(frame, fps, FLIP_MS, 0);

  const stageW = 760 * unit;
  const stageH = 220 * unit;
  const btnW = 190 * unit;
  const btnH = 48 * unit;
  const btnLeft = (stageW - btnW) / 2;
  const btnTop = (stageH - btnH) / 2 - 14 * unit;

  return (
    <SpecStage
      caseRef="Case 94"
      title="Button — disabled"
      css="opacity: 1 → 0.5 over 120ms var(--ease-out-expo) · pointer-events: none · cursor: not-allowed at 0ms (no transition)"
      reduced="transition: none — the button snaps to 0.5. Opacity is information, never caught mid-fade."
      phases={[
        { label: "enabled", fromMs: 0, toMs: FLIP_MS, tone: "muted" },
        { label: "dim", fromMs: FLIP_MS, toMs: FLIP_MS + 120 },
        { label: "cursor swap", fromMs: FLIP_MS, toMs: FLIP_MS, tone: "amber" },
        { label: "disabled", fromMs: FLIP_MS + 120, toMs: 1000, tone: "rose" },
      ]}
      elapsedMs={framesToMs(frame, fps)}
      totalMs={framesToMs(DURATION, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        <div
          style={{
            position: "absolute",
            left: btnLeft,
            top: btnTop,
            width: btnW,
            height: btnH,
            borderRadius: RADIUS.lg * unit,
            backgroundColor: BRAND.primary,
            boxShadow: shadowBlend(unit, "sm", "none", off),
            // The entire animation. No transform, by rule.
            opacity: mix(1, 0.5, off),
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

        {/* `cursor: not-allowed`, drawn. It appears on one frame. */}
        <div
          style={{
            position: "absolute",
            left: btnLeft + btnW * 0.6,
            top: btnTop + btnH * 0.52,
            opacity: barred,
          }}
        >
          <svg width={26 * unit} height={26 * unit} viewBox="0 0 24 24" fill="none">
            <circle
              cx={12}
              cy={12}
              r={9}
              stroke={BRAND.destructive}
              strokeWidth={2}
            />
            <path
              d="M5.6 5.6 L18.4 18.4"
              stroke={BRAND.destructive}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: btnTop + btnH + 26 * unit,
            width: stageW,
            textAlign: "center",
            fontFamily: SANS_FONT,
            fontSize: 13 * unit,
            color: mutedInk(0.85),
          }}
        >
          {reason}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: btnTop + btnH + 52 * unit,
            width: stageW,
            textAlign: "center",
            fontFamily: MONO_FONT,
            fontSize: 11.5 * unit,
            color: BRAND.mutedForeground,
          }}
        >
          {`opacity ${mix(1, 0.5, off).toFixed(3)} · transform: none (by rule)`}
        </div>

        <div
          style={{
            position: "absolute",
            left: btnLeft + btnW / 2 - 46 * unit,
            top: btnTop - 44 * unit,
            display: "flex",
            gap: 8 * unit,
          }}
        >
          <StateChip unit={unit} label=":disabled" tone="rose" active={off} />
        </div>

        {/* A hairline marking the 50% floor, so the readout has a target. */}
        <div
          style={{
            position: "absolute",
            left: btnLeft - 26 * unit,
            top: btnTop,
            width: 14 * unit,
            height: btnH,
            borderLeft: `${1 * unit}px solid ${hairline(0.9)}`,
            borderTop: `${1 * unit}px solid ${hairline(0.9)}`,
            borderBottom: `${1 * unit}px solid ${hairline(0.9)}`,
          }}
        />
      </div>
    </SpecStage>
  );
};
