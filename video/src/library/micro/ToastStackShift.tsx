/**
 * ToastStackShift — dismissing one toast out of three.
 * Companion to MOTION-DESIGN-CASES case 92; this is the part of sonner's
 * behaviour the case flags as inherited rather than introduced — its base
 * transition includes `height 400ms`, a layout-animated property on every
 * toast that stacks or collapses.
 *
 * WHAT IS SPECIFIED
 *   Three stacked toasts, bottom-docked. The newest is swiped away: it leaves
 *   with `opacity 1 → 0` and `translateX(0 → 24px)` over 200ms `ease-in` — a
 *   dismissal is the one gesture allowed to travel sideways, because sideways
 *   is the direction the finger went. The two survivors then close the gap
 *   over 400ms `--ease-out-expo`, starting at the 200ms mark so the space
 *   closes *after* the toast has gone rather than under it.
 *
 *   The 400ms is sonner's own and must be left alone — overriding its height
 *   animation breaks its stack maths. What must NOT happen is a second
 *   height-animated element inside the toast; the case is explicit.
 *
 * CSS EQUIVALENT
 *   [data-sonner-toast][data-removed] {
 *     transition: opacity 200ms cubic-bezier(0.4,0,1,1),
 *                 transform 200ms cubic-bezier(0.4,0,1,1);
 *     opacity: 0; transform: translateX(24px);
 *   }
 *   [data-sonner-toast] {
 *     transition: transform 400ms cubic-bezier(0.16,1,0.3,1) 200ms;
 *   }
 *   framer-motion: <AnimatePresence mode="popLayout"> with <motion.li layout />
 *                  — `popLayout` is what removes the exiting toast from flow
 *                  immediately, so the survivors measure against final slots.
 *
 * REDUCED MOTION
 *   The dismissed toast disappears at `opacity 200ms linear` with no
 *   translation, and the survivors reposition instantly (`transition: none` on
 *   the transform). A stack that re-flows under a reduced-motion user is
 *   exactly the large-area movement the query exists to suppress.
 *
 * NOT A LOOP
 *   One-way. Reduced motion freezes at the LAST frame — two toasts, gap
 *   closed — because that is the settled truth of the interaction.
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
  mix,
  progress,
  shadow,
  useSpecFrame,
} from "./microKit";
import { SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 1800ms at 60fps. */
const DURATION = 108;

const DISMISS_MS = 400;
const SHIFT_MS = 600;

export type ToastStackShiftProps = {
  /** Bottom (newest) first — the bottom one is the one dismissed. */
  messages: readonly string[];
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const toastStackShiftDefaultProps: ToastStackShiftProps = {
  messages: [
    "Preferences saved",
    "Anush joined Friday 5-a-side",
    "Booking confirmed · Ararat Arena",
  ],
  speed: 1,
};

export const ToastStackShift: FC<ToastStackShiftProps> = ({
  messages,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, (durationInFrames - 1) * speed);
  const unit = width / CANVAS_W;

  /** The swipe: 200ms, ease-in, sideways because that is where the finger went. */
  const leave = progress(frame, fps, DISMISS_MS, 200, EASE_IN);
  /** The gap closing: sonner's 400ms, delayed to start when the toast is gone. */
  const close = progress(frame, fps, SHIFT_MS, 400, EASE_OUT_EXPO);

  const stageW = 700 * unit;
  const stageH = 230 * unit;
  const toastW = 340 * unit;
  const toastH = 52 * unit;
  const gap = 10 * unit;
  const slot = toastH + gap;

  return (
    <SpecStage
      caseRef="Case 92"
      title="Toast — stack collapse"
      css="dismissed: opacity → 0 + translateX(24px), 200ms ease-in · survivors: transform 400ms var(--ease-out-expo), delayed 200ms · sonner's own height 400ms, left alone"
      reduced="opacity 200ms linear on the leaver, no translate; survivors reposition instantly."
      phases={[
        { label: "swipe out", fromMs: DISMISS_MS, toMs: DISMISS_MS + 200, tone: "amber" },
        { label: "gap closes", fromMs: SHIFT_MS, toMs: SHIFT_MS + 400 },
        { label: "settled", fromMs: SHIFT_MS + 400, toMs: 1800, tone: "muted" },
      ]}
      elapsedMs={framesToMs(frame, fps)}
      totalMs={framesToMs(DURATION, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {messages.map((message, i) => {
          const dismissed = i === 0;
          // Slot 0 is the bottom. Survivors drop by one slot as it empties.
          const restBottom = i * slot;
          const bottom = dismissed ? restBottom : mix(restBottom, restBottom - slot, close);
          return (
            <div
              key={message}
              style={{
                position: "absolute",
                right: 20 * unit,
                bottom: 20 * unit + bottom,
                width: toastW,
                height: toastH,
                borderRadius: RADIUS.lg * unit,
                backgroundColor: BRAND.popover,
                border: `${1 * unit}px solid ${BRAND.border}`,
                boxShadow: shadow(unit, dismissed ? "md" : "lg"),
                display: "flex",
                alignItems: "center",
                gap: 10 * unit,
                paddingLeft: 14 * unit,
                paddingRight: 14 * unit,
                opacity: dismissed ? 1 - leave : 1,
                transform: dismissed ? `translateX(${24 * leave * unit}px)` : "none",
              }}
            >
              <span
                style={{
                  width: 7 * unit,
                  height: 7 * unit,
                  borderRadius: 999,
                  backgroundColor: BRAND.primary,
                  boxShadow: `0 0 ${8 * unit}px ${courtGreen(0.5)}`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: SANS_FONT,
                  fontSize: 13 * unit,
                  color: BRAND.foreground,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {message}
              </span>
            </div>
          );
        })}

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
          {`leaver opacity ${(1 - leave).toFixed(2)} · x ${(24 * leave).toFixed(1)}px`}
          <br />
          {`survivors Δy ${(-(toastH / unit + 10) * close).toFixed(1)}px`}
          <br />
          stack height animates — sonner&apos;s, not ours
        </div>
      </div>
    </SpecStage>
  );
};
