/**
 * PopoverAnchorGrow — a popover that grows out of the control that opened it.
 * Spec for MOTION-DESIGN-CASES case 49. Component: the Radix `Popover` at
 * `src/pages/VenueAvailabilityPage.tsx:252-268`, whose content is the shared
 * `src/components/ui/calendar.tsx` (react-day-picker 8.10.1).
 *
 * WHAT IS SPECIFIED
 *   A 7×6 grid currently materialises over the form with whatever
 *   `PopoverContent` ships. Anchor it instead:
 *     transform-origin — `var(--radix-popover-content-transform-origin)`. Radix
 *       computes it from the measured trigger, so a popover that flips to
 *       `side="top"` because the row is near the viewport bottom grows from its
 *       bottom edge instead. This single line is what makes the gesture mean
 *       "this belongs to *Select date*" rather than "something appeared".
 *     open — `scale 0.95 → 1`, `opacity 0 → 1`, and a 4px slide from the
 *       trigger side, 160ms `--ease-out-expo`.
 *     close — the same three, reversed, 120ms `cubic-bezier(0.4, 0, 1, 1)`.
 *       Asymmetric on purpose: dismissal should never make anyone wait.
 *
 *   THE DAY CELLS DO NOT TRANSITION, and that is part of the spec, not an
 *   omission. `day_selected` in `src/components/ui/calendar.tsx` puts
 *   `bg-primary` on a 36×36 cell; 42 cells transitioning while the popover
 *   scales is 43 simultaneously animating elements for one arrow key. Selection
 *   stays instant. The grid on screen here changes its selected day mid-loop
 *   with no transition at all — that is the specified behaviour being shown.
 *
 * CSS EQUIVALENT
 *   Tailwind + tailwindcss-animate data-attribute variants, no JS — Radix
 *   already sets `data-state` and holds the node mounted through the exit,
 *   which is the hard part:
 *     transform-origin: var(--radix-popover-content-transform-origin);
 *     data-[state=open]:animate-in    data-[state=open]:fade-in-0
 *     data-[state=open]:zoom-in-95    data-[side=bottom]:slide-in-from-top-1
 *     data-[state=closed]:animate-out data-[state=closed]:fade-out-0
 *     data-[state=closed]:zoom-out-95 duration-150
 *   framer-motion is the wrong tool here: the exit needs the node alive, and
 *   Radix is already doing that.
 *
 * REDUCED MOTION
 *   `motion-reduce:animate-none` on `PopoverContent`. It appears and disappears
 *   instantly, at full size and opacity. Orientation does not suffer: the
 *   `initialFocus` prop already on `CalendarComponent` (`:265`) moves focus into
 *   the grid regardless of whether anything animated, so a keyboard user is put
 *   in the right place by focus rather than by the zoom.
 *   Loop freezes at frame 0 — trigger idle, popover closed.
 *
 * PERF
 *   `transform` + `opacity` on a portalled node with its own layer. One
 *   composited element, twelve frames at 60fps for the close.
 *
 * LOOP
 *   Seamless. `opacity = rise − fall`, both clamped, exactly 0 at local frame 0
 *   and exactly 0 from 2520ms on. `scale` and the 4px slide are driven by
 *   `rise` alone, which carries a 0ms unmount reset at 2520ms — the frame the
 *   close reaches zero opacity — returning them to 0.95 and −4px with nothing
 *   painted, exactly as Radix unmounting the node would. The selected-day index
 *   is `floor(local / (period/3))` and wraps with the period, so the grid
 *   agrees at both ends too. 3000ms at 60fps.
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
  hashUnit,
  mix,
  shadow,
  toggleCycle,
  useSpecFrame,
  wrap,
} from "./microKit";
import { SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 3000ms at 60fps. */
const PERIOD = 180;

const OPEN_MS = 400;
const IN_MS = 160;
const CLOSE_AT_MS = 2400;
const OUT_MS = 120;
/** The frame the close reaches zero opacity — and therefore the reset frame. */
const RESET_MS = CLOSE_AT_MS + OUT_MS;

const COLS = 7;
const ROWS = 6;
/** Which cells are blocked. Deterministic — hashUnit, never Math.random(). */
const BLOCKED_AT = 0.79;
/** Days the demo selects, in order. Instant, per the header. */
const SELECTED_DAYS = [11, 12, 18] as const;

export type PopoverAnchorGrowProps = {
  triggerLabel: string;
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const popoverAnchorGrowDefaultProps: PopoverAnchorGrowProps = {
  triggerLabel: "Select date",
  speed: 1,
};

export const PopoverAnchorGrow: FC<PopoverAnchorGrowProps> = ({
  triggerLabel,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  const local = wrap(frame, PERIOD);

  const rise = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: OPEN_MS,
    onDurMs: IN_MS,
    offAtMs: RESET_MS,
    offDurMs: 0,
    onEase: EASE_OUT_EXPO,
  });
  const fall = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: CLOSE_AT_MS,
    onDurMs: OUT_MS,
    offAtMs: RESET_MS,
    offDurMs: 0,
    onEase: EASE_IN,
  });

  const shown = rise - fall;
  const scale = mix(0.95, 1, rise);
  /** `slide-in-from-top-1` — 4px, from the side the trigger is on. */
  const slideY = -4 * (1 - rise);

  /** Instant. No transition on the cells, by specification. */
  const selected =
    SELECTED_DAYS[
      Math.min(
        SELECTED_DAYS.length - 1,
        Math.floor((local / PERIOD) * SELECTED_DAYS.length),
      )
    ];

  const stageW = 460 * unit;
  const stageH = 236 * unit;
  const trigW = 176 * unit;
  const trigH = 40 * unit;
  const cell = 27 * unit;
  const rowH = 23 * unit;
  const gridPad = 9 * unit;
  const popW = COLS * cell + gridPad * 2;
  const popLeft = (stageW - popW) / 2;
  const trigLeft = (stageW - trigW) / 2;

  return (
    <SpecStage
      caseRef="Case 49"
      title="Popover — grows from its trigger"
      css="open: scale .95→1 + opacity 0→1 + 4px slide, 160ms var(--ease-out-expo) · close: 120ms cubic-bezier(.4,0,1,1) · transform-origin: var(--radix-popover-content-transform-origin) · day cells: no transition"
      reduced="motion-reduce:animate-none — appears and disappears at full size. initialFocus already puts a keyboard user inside the grid."
      phases={[
        { label: "open", fromMs: OPEN_MS, toMs: OPEN_MS + IN_MS },
        { label: "open, idle", fromMs: OPEN_MS + IN_MS, toMs: CLOSE_AT_MS, tone: "muted" },
        { label: "close", fromMs: CLOSE_AT_MS, toMs: RESET_MS, tone: "cyan" },
      ]}
      elapsedMs={framesToMs(local, fps)}
      totalMs={framesToMs(PERIOD, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {/* The trigger. The origin of the gesture, and it never moves. */}
        <div
          style={{
            position: "absolute",
            left: trigLeft,
            top: 0,
            width: trigW,
            height: trigH,
            boxSizing: "border-box",
            borderRadius: RADIUS.md * unit,
            backgroundColor: shown > 0.02 ? BRAND.surface2 : BRAND.surface1,
            border: `${1 * unit}px solid ${shown > 0.02 ? BRAND.borderInteractive : BRAND.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8 * unit,
            paddingLeft: 13 * unit,
            fontFamily: SANS_FONT,
            fontSize: 13.5 * unit,
            color: BRAND.foreground,
          }}
        >
          <svg width={14 * unit} height={14 * unit} viewBox="0 0 24 24" fill="none">
            <rect
              x={3.5}
              y={5}
              width={17}
              height={15.5}
              rx={2.5}
              stroke={BRAND.mutedForeground}
              strokeWidth={1.8}
            />
            <path
              d="M3.5 10 H20.5 M8 3.5 V6.5 M16 3.5 V6.5"
              stroke={BRAND.mutedForeground}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </svg>
          {triggerLabel}
        </div>

        {/* The transform-origin marker — the thing the whole case is about. */}
        <div
          style={{
            position: "absolute",
            left: trigLeft - 3 * unit,
            top: trigH + 1 * unit,
            width: 6 * unit,
            height: 6 * unit,
            borderRadius: 999,
            backgroundColor: BRAND.primary,
            opacity: 0.25 + 0.75 * shown,
          }}
        />

        {/* The popover. Grows from the trigger's bottom-left. */}
        <div
          style={{
            position: "absolute",
            left: popLeft,
            top: trigH + 6 * unit,
            width: popW,
            borderRadius: RADIUS.lg * unit,
            backgroundColor: BRAND.popover,
            border: `${1 * unit}px solid ${BRAND.border}`,
            boxShadow: shadow(unit, "xl"),
            padding: gridPad,
            opacity: shown,
            transform: `translateY(${slideY * unit}px) scale(${scale})`,
            // Radix writes the measured value here; the offset below is the
            // trigger's left edge relative to the popover's.
            transformOrigin: `${trigLeft - popLeft}px 0px`,
          }}
        >
          <div style={{ display: "flex", marginBottom: 4 * unit }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div
                key={`h-${String(i)}`}
                style={{
                  width: cell,
                  textAlign: "center",
                  fontFamily: MONO_FONT,
                  fontSize: 9.5 * unit,
                  color: BRAND.mutedForeground,
                }}
              >
                {d}
              </div>
            ))}
          </div>
          {Array.from({ length: ROWS }, (_, r) => (
            <div key={`r-${String(r)}`} style={{ display: "flex", height: rowH }}>
              {Array.from({ length: COLS }, (_, c) => {
                const index = r * COLS + c;
                const day = index - 2;
                const inMonth = day >= 1 && day <= 31;
                const blocked = inMonth && hashUnit(index, 7) > BLOCKED_AT;
                const isSelected = day === selected;
                return (
                  <div
                    key={`c-${String(index)}`}
                    style={{
                      width: cell,
                      height: rowH,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: RADIUS.sm * unit,
                      // No transition on this element. That is the spec.
                      backgroundColor: isSelected
                        ? BRAND.primary
                        : blocked
                          ? courtGreen(0.06)
                          : "transparent",
                      fontFamily: SANS_FONT,
                      fontSize: 11 * unit,
                      color: isSelected
                        ? BRAND.primaryForeground
                        : !inMonth
                          ? BRAND.border
                          : blocked
                            ? BRAND.mutedForeground
                            : BRAND.foregroundSoft,
                      textDecoration: blocked ? "line-through" : "none",
                    }}
                  >
                    {inMonth ? day : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: 6 * unit,
            fontFamily: MONO_FONT,
            fontSize: 11 * unit,
            lineHeight: 1.8,
            color: BRAND.mutedForeground,
          }}
        >
          {`scale ${scale.toFixed(4)}`}
          <br />
          {`opacity ${shown.toFixed(3)}`}
          <br />
          {`slide ${slideY.toFixed(2)}px`}
        </div>
      </div>
    </SpecStage>
  );
};
