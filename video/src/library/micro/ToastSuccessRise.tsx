/**
 * ToastSuccessRise — the app's answer to "did that work?", success half.
 * Spec for MOTION-DESIGN-CASES case 92 [HIGH IMPACT]. Component:
 * `src/components/ui/sonner.tsx:10-42`, mounted at `src/App.tsx:132`, fired
 * from 55 modules.
 *
 * WHAT IS SPECIFIED
 *   Success keeps sonner's default lift and nothing else: `translateY(14px) →
 *   0` with `opacity 0 → 1`, re-curved from sonner's own easing to
 *   `--ease-out-expo` over its own 400ms. A success message is allowed to
 *   slide past the eye, because a thing that slid in is passing through — and
 *   it is. Lifetime is the 4000ms default; the exit is sonner's 400ms.
 *
 *   The entire point of the case is the contrast with the error toast, which
 *   arrives *in place* — see ToastErrorInPlace. Watch the two side by side:
 *   the difference is read before the sentence is.
 *
 * CSS EQUIVALENT
 *   [data-sonner-toast][data-type="success"] {
 *     transition: transform 400ms cubic-bezier(0.16,1,0.3,1),
 *                 opacity   400ms cubic-bezier(0.16,1,0.3,1);
 *   }
 *   /  from: transform: translateY(14px); opacity: 0  /
 *   framer-motion: initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
 *                  exit={{ y: 14, opacity: 0 }}
 *                  transition={{ duration: 0.4, ease: [0.16,1,0.3,1] }}
 *   Build it in the `classNames` map already open at `sonner.tsx:34-38` — add
 *   a `success:` key. No wrapper around 55 call sites.
 *
 * REDUCED MOTION
 *   sonner's own media block kills `transition` and `animation` on
 *   `[data-sonner-toast]` and all its children with `!important`, so a
 *   reduced-motion user currently gets toasts that appear and vanish with zero
 *   transition — easier to miss than a fade, not harder. Re-enable opacity
 *   only: `[data-sonner-toast] { transition: opacity 200ms linear !important; }`
 *   and leave `transform` unset. Reduced motion means no motion, not no
 *   feedback. Here the loop freezes at frame 0 — the toast off-screen, before
 *   anything is announced.
 *
 * LOOP
 *   Seamless, and the mechanism is worth stating because it is not obvious for
 *   a piece that "plays once". Both `y` and `opacity` are driven by ONE
 *   `toggleCycle` value: `y = 14 * (1 − shown)`, `opacity = shown`. `shown` is
 *   a clamped rise minus a clamped fall, so it is exactly 0 at local frame 0
 *   (neither started) and exactly 0 at local frame 288 (1 − 1, both finished).
 *   The toast therefore both begins and ends 14px below its slot at zero
 *   opacity, which is the same picture — and it happens to be exactly what
 *   sonner does, since its exit drops the toast back the way it came.
 *   400 + 4000 + 400 = 4800ms.
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
  courtGreen,
  framesToMs,
  shadow,
  toggleCycle,
  useSpecFrame,
  wrap,
} from "./microKit";
import { SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 400ms enter + 4000ms lifetime + 400ms exit = 4800ms at 60fps. */
const PERIOD = 288;
const ENTER_MS = 400;
const EXIT_AT_MS = 4400;

export type ToastSuccessRiseProps = {
  title: string;
  description: string;
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const toastSuccessRiseDefaultProps: ToastSuccessRiseProps = {
  title: "Booking confirmed",
  description: "Ararat Arena · Sat 14:00–15:00",
  speed: 1,
};

export const ToastSuccessRise: FC<ToastSuccessRiseProps> = ({
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

  const stageW = 700 * unit;
  const stageH = 230 * unit;
  const toastW = 360 * unit;
  const toastH = 74 * unit;

  return (
    <SpecStage
      caseRef="Case 92"
      title="Toast — success enter / exit"
      css="translateY(14px) → 0 + opacity 0 → 1 · 400ms cubic-bezier(0.16, 1, 0.3, 1) · lifetime 4000ms · exit 400ms ease-in, back the way it came"
      reduced="opacity 200ms linear only, transform unset. Not sonner's default, which is no transition at all."
      phases={[
        { label: "enter", fromMs: 0, toMs: ENTER_MS },
        { label: "lifetime", fromMs: ENTER_MS, toMs: EXIT_AT_MS, tone: "muted" },
        { label: "exit", fromMs: EXIT_AT_MS, toMs: EXIT_AT_MS + 400, tone: "cyan" },
      ]}
      elapsedMs={framesToMs(wrap(frame, PERIOD), fps)}
      totalMs={framesToMs(PERIOD, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {/* The viewport corner sonner actually docks to. */}
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: toastW + 40 * unit,
            height: toastH + 44 * unit,
            border: `${1 * unit}px dashed ${BRAND.border}`,
            borderRadius: RADIUS.lg * unit,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 8 * unit,
            bottom: toastH + 50 * unit,
            fontFamily: MONO_FONT,
            fontSize: 10 * unit,
            color: BRAND.mutedForeground,
          }}
        >
          position: bottom-right
        </div>

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
            display: "flex",
            alignItems: "center",
            gap: 12 * unit,
            paddingLeft: 16 * unit,
            paddingRight: 16 * unit,
            // One driver, two properties. This is the seam.
            opacity: shown,
            transform: `translateY(${14 * (1 - shown) * unit}px)`,
          }}
        >
          <div
            style={{
              width: 28 * unit,
              height: 28 * unit,
              borderRadius: 999,
              backgroundColor: courtGreen(0.16),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width={16 * unit} height={16 * unit} viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12.5 L10 17 L19 6.5"
                stroke={BRAND.primary}
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
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
                color: BRAND.mutedForeground,
              }}
            >
              {description}
            </span>
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
          {`translateY ${(14 * (1 - shown)).toFixed(2)}px`}
        </div>
      </div>
    </SpecStage>
  );
};
