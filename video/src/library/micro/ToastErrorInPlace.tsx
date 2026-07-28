/**
 * ToastErrorInPlace — the same channel, refusing to slide.
 * Spec for MOTION-DESIGN-CASES case 92 [HIGH IMPACT], error half.
 *
 * WHAT IS SPECIFIED
 *   Today success and failure enter identically — sonner's default rise,
 *   same 400ms, same curve, distinguished only by the words. Split them.
 *   The error toast gets NO lift: `opacity 0 → 1` plus `scale 0.97 → 1` from
 *   its own bottom-right corner (`transform-origin: 100% 100%`), so it arrives
 *   where it is rather than sliding past the eye. The left edge picks up a 3px
 *   `--destructive-solid` rule that wipes down over the same interval
 *   (`scaleY(0) → 1`, `transform-origin: 0 0`).
 *
 *   A thing that grew where it is has stopped; a thing that slid in is passing
 *   through. The user reads urgency before they read the sentence. Lifetime
 *   rises from the 4000ms default to 6000ms via `toastOptions.duration`.
 *
 * CSS EQUIVALENT
 *   [data-sonner-toast][data-type="error"] {
 *     transform-origin: 100% 100%;
 *     transition: transform 250ms cubic-bezier(0.16,1,0.3,1),
 *                 opacity   250ms cubic-bezier(0.16,1,0.3,1);
 *   }
 *   [data-type="error"] .rule {
 *     transform-origin: 0 0;
 *     transition: transform 250ms cubic-bezier(0.16,1,0.3,1);
 *   }
 *   framer-motion: initial={{ opacity: 0, scale: 0.97 }}
 *                  animate={{ opacity: 1, scale: 1 }}
 *                  style={{ transformOrigin: "100% 100%" }}
 *                  transition={{ duration: 0.25, ease: [0.16,1,0.3,1] }}
 *
 * REDUCED MOTION
 *   Same override as the success toast: `transition: opacity 200ms linear
 *   !important`, transform unset. The scale and the edge wipe both go; the
 *   destructive rule is still *there*, it just does not wipe in. Colour and
 *   text carry the whole message, which is the test any error state has to
 *   pass anyway. Loop freezes at frame 0, before the toast exists.
 *
 * LOOP
 *   Seamless. One `toggleCycle` drives opacity, scale and the edge rule:
 *   `scale = 0.97 + 0.03 * shown`, `edge = shown`, `opacity = shown`. `shown`
 *   is exactly 0 at local frame 0 and exactly 0 at local frame 399 (clamped
 *   rise 1 minus clamped fall 1), so the toast starts and ends at 97% scale,
 *   zero opacity, with the edge rule collapsed. 250 + 6000 + 400 = 6650ms,
 *   which is 399 frames at 60fps — an exact integer, which is why the fps is
 *   60 and not 30 here.
 */

import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_IN,
  EASE_OUT_EXPO,
  MONO_FONT,
  RADIUS,
  SANS_FONT,
  framesToMs,
  roseSolid,
  shadow,
  toggleCycle,
  useSpecFrame,
  wrap,
} from "./microKit";
import { SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 250ms enter + 6000ms lifetime + 400ms exit = 6650ms = 399 frames @60. */
const PERIOD = 399;
const ENTER_MS = 250;
const EXIT_AT_MS = 6250;

export type ToastErrorInPlaceProps = {
  title: string;
  description: string;
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const toastErrorInPlaceDefaultProps: ToastErrorInPlaceProps = {
  title: "Payment declined",
  description: "Your bank refused the charge. The slot is held for 4 more minutes.",
  speed: 1,
};

export const ToastErrorInPlace: FC<ToastErrorInPlaceProps> = ({
  title,
  description,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  const shown = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: 0,
    onDurMs: ENTER_MS,
    offAtMs: EXIT_AT_MS,
    offDurMs: 400,
    onEase: EASE_OUT_EXPO,
    offEase: EASE_IN,
  });

  const scale = 0.97 + 0.03 * shown;

  const stageW = 700 * unit;
  const stageH = 230 * unit;
  const toastW = 380 * unit;
  const toastH = 86 * unit;

  return (
    <SpecStage
      caseRef="Case 92"
      title="Toast — error enter / exit"
      css="opacity 0 → 1 + scale 0.97 → 1, transform-origin 100% 100% · 250ms var(--ease-out-expo) · 3px edge rule scaleY(0)→1, origin 0 0, same 250ms · lifetime 6000ms"
      reduced="opacity 200ms linear only. No scale, no edge wipe — the rule is simply present."
      phases={[
        { label: "enter + rule", fromMs: 0, toMs: ENTER_MS, tone: "rose" },
        { label: "lifetime 6000ms", fromMs: ENTER_MS, toMs: EXIT_AT_MS, tone: "muted" },
        { label: "exit", fromMs: EXIT_AT_MS, toMs: EXIT_AT_MS + 400, tone: "cyan" },
      ]}
      elapsedMs={framesToMs(wrap(frame, PERIOD), fps)}
      totalMs={framesToMs(PERIOD, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        <div
          style={{
            position: "absolute",
            right: 20 * unit,
            bottom: 22 * unit,
            width: toastW,
            height: toastH,
            borderRadius: RADIUS.lg * unit,
            backgroundColor: BRAND.popover,
            border: `${1 * unit}px solid ${BRAND.border}`,
            boxShadow: shadow(unit, "lg"),
            overflow: "hidden",
            opacity: shown,
            // It grows where it stands. Nothing translates.
            transform: `scale(${scale})`,
            transformOrigin: "100% 100%",
          }}
        >
          {/* The 3px rule. Wipes down from the top-left, same 250ms. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 3 * unit,
              height: "100%",
              backgroundColor: BRAND.destructiveSolid,
              transform: `scaleY(${shown})`,
              transformOrigin: "0 0",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              paddingLeft: 20 * unit,
              paddingRight: 16 * unit,
              display: "flex",
              alignItems: "center",
              gap: 12 * unit,
            }}
          >
            <div
              style={{
                width: 28 * unit,
                height: 28 * unit,
                borderRadius: 999,
                backgroundColor: roseSolid(0.28),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width={16 * unit} height={16 * unit} viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 6.5 V13.2"
                  stroke={BRAND.destructive}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
                <circle cx={12} cy={17} r={1.35} fill={BRAND.destructive} />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 * unit }}>
              <span
                style={{
                  fontFamily: SANS_FONT,
                  fontSize: 14 * unit,
                  fontWeight: 600,
                  color: BRAND.foreground,
                }}
              >
                {title}
              </span>
              <span
                style={{
                  fontFamily: SANS_FONT,
                  fontSize: 12.5 * unit,
                  lineHeight: 1.35,
                  color: BRAND.mutedForeground,
                }}
              >
                {description}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 26 * unit,
            fontFamily: MONO_FONT,
            fontSize: 11.5 * unit,
            color: BRAND.mutedForeground,
            lineHeight: 1.8,
          }}
        >
          {`opacity ${shown.toFixed(3)}`}
          <br />
          {`scale ${scale.toFixed(4)}`}
          <br />
          {`rule scaleY ${shown.toFixed(3)}`}
          <br />
          translateY 0 — by rule
        </div>
      </div>
    </SpecStage>
  );
};
