/**
 * SelectPanelOpen — the suggestion panel arriving from the field that owns it.
 * Spec for MOTION-DESIGN-CASES case 25. Component: `SmartSearch.tsx:317-360`,
 * mounted at `src/pages/DiscoverPage.tsx:498`.
 *
 * WHAT IS SPECIFIED
 *   The panel currently appears by raw mount — `{isOpen && suggestions.length >
 *   0 && <div class="absolute z-50 …">}` — so four grouped sections and a
 *   footer hint materialise in one frame, 2px below a 48px input.
 *
 *   IN: `opacity 0 → 1` and `translateY(-6px → 0)` over 160ms
 *   `--ease-out-expo`. The downward travel is what makes the input the origin,
 *   and it has to, because the panel is `position: absolute` and would
 *   otherwise read as an unattached overlay floating over the sticky results
 *   header (`DiscoverPage.tsx:493`).
 *
 *   OUT: `opacity 1 → 0` over 110ms `cubic-bezier(0.4, 0, 1, 1)` and **no
 *   travel**. Two separate reasons, both worth keeping. Leaving is not a place
 *   the eye needs to follow — nothing is being pointed at any more. And on
 *   selection the route change at `SmartSearch.tsx:219-233` fires immediately,
 *   so a panel that took 160ms and 6px to leave would be sitting over the next
 *   page while it painted.
 *
 *   The asymmetry is the specification. 160/110 and travel/no-travel are not
 *   two roundings of one number.
 *
 * CSS EQUIVALENT
 *   Tailwind + tailwindcss-animate, on the existing panel div — no
 *   framer-motion, because the exit only matters on select and wrapping this in
 *   `AnimatePresence` would mean holding `suggestions` in state past
 *   `setSuggestions([])` (`SmartSearch.tsx:214`) purely to animate it out:
 *     animate-in  fade-in-0  slide-in-from-top-1 duration-150
 *                 ease-[cubic-bezier(0.16,1,0.3,1)]
 *     animate-out fade-out-0 duration-100 ease-[cubic-bezier(0.4,0,1,1)]
 *   Hand-written, the same thing is:
 *     .search-panel { transition: opacity 160ms cubic-bezier(0.16,1,0.3,1),
 *                                 transform 160ms cubic-bezier(0.16,1,0.3,1); }
 *     .search-panel[data-state="closed"] { transition: opacity 110ms cubic-bezier(0.4,0,1,1); }
 *
 * REDUCED MOTION
 *   `.search-panel-enter { animation: none; }` in the
 *   `@media (prefers-reduced-motion: reduce)` block at `src/index.css:619`, or
 *   gate the classes off `matchMedia`. The panel appears at final opacity and
 *   position and disappears the same way — no fade, no travel. Nothing is lost:
 *   the panel is already announced by its content, and the keyboard hint row
 *   (`SmartSearch.tsx:356-358`) carries the affordance on its own.
 *
 * PERF
 *   `transform` + `opacity` only. The panel is `absolute`, so it never reflows
 *   the sticky search header or the results grid under it.
 *
 * LOOP
 *   Seamless. `opacity = rise − fall`, both clamped `toggleCycle`s, so it is
 *   exactly 0 at local frame 0 and exactly 0 from 2510ms on. `translateY` is
 *   `−6 · (1 − rise)`, and `rise` carries a 0ms unmount reset at 2510ms — the
 *   frame the close fade reaches zero — so it returns to 0 and `y` returns to
 *   −6px with nothing painted. That reset is not a trick: it is what happens
 *   when React drops the node. Frame 0 and frame 180 agree on every property.
 *   3000ms at 60fps.
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
const OUT_MS = 110;
/** The frame the close fade reaches zero — and therefore the reset frame. */
const RESET_MS = CLOSE_AT_MS + OUT_MS;

export type SelectPanelRow = {
  group: string;
  label: string;
  meta: string;
};

export type SelectPanelOpenProps = {
  query: string;
  rows: readonly SelectPanelRow[];
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const selectPanelOpenDefaultProps: SelectPanelOpenProps = {
  query: "ararat",
  rows: [
    { group: "Venues", label: "Ararat Arena", meta: "Yerevan · Football" },
    { group: "Venues", label: "Ararat Sport Complex", meta: "Yerevan · Tennis" },
    { group: "Cities", label: "Ararat", meta: "Ararat Province" },
  ],
  speed: 1,
};

export const SelectPanelOpen: FC<SelectPanelOpenProps> = ({
  query,
  rows,
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
  /** Travel on the way in only. The close is opacity, full stop. */
  const panelY = -6 * (1 - rise);

  const stageW = 480 * unit;
  const stageH = 236 * unit;
  const inputH = 44 * unit;
  const rowH = 31 * unit;

  let lastGroup = "";

  return (
    <SpecStage
      caseRef="Case 25"
      title="Suggestion panel — open and close"
      css="in: opacity 0→1 + translateY(-6px→0) 160ms var(--ease-out-expo) · out: opacity 1→0 110ms cubic-bezier(.4,0,1,1), NO translate"
      reduced="Panel appears and disappears at final opacity and position. The keyboard hint row already carries the affordance."
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
        {/* The field the panel belongs to. It does not move. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: stageW,
            height: inputH,
            boxSizing: "border-box",
            borderRadius: RADIUS.md * unit,
            backgroundColor: BRAND.input,
            border: `${1 * unit}px solid ${BRAND.borderInteractive}`,
            display: "flex",
            alignItems: "center",
            gap: 9 * unit,
            paddingLeft: 14 * unit,
          }}
        >
          <svg width={14 * unit} height={14 * unit} viewBox="0 0 24 24" fill="none">
            <circle
              cx={10.5}
              cy={10.5}
              r={6.5}
              stroke={BRAND.mutedForeground}
              strokeWidth={2}
            />
            <path
              d="M15.5 15.5 L21 21"
              stroke={BRAND.mutedForeground}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 14 * unit,
              color: BRAND.foreground,
            }}
          >
            {query}
          </span>
        </div>

        {/* The panel. 2px below the field, absolute, its own layer. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: inputH + 2 * unit,
            width: stageW,
            borderRadius: RADIUS.lg * unit,
            backgroundColor: BRAND.popover,
            border: `${1 * unit}px solid ${BRAND.border}`,
            boxShadow: shadow(unit, "lg"),
            paddingTop: 6 * unit,
            paddingBottom: 6 * unit,
            opacity: shown,
            transform: `translateY(${panelY * unit}px)`,
          }}
        >
          {rows.map((row) => {
            const showGroup = row.group !== lastGroup;
            lastGroup = row.group;
            return (
              <div key={row.label}>
                {showGroup ? (
                  <div
                    style={{
                      paddingLeft: 14 * unit,
                      paddingTop: 5 * unit,
                      paddingBottom: 3 * unit,
                      fontFamily: MONO_FONT,
                      fontSize: 9.5 * unit,
                      letterSpacing: 0.14 * 9.5 * unit,
                      textTransform: "uppercase",
                      color: BRAND.mutedForeground,
                    }}
                  >
                    {row.group}
                  </div>
                ) : null}
                <div
                  style={{
                    height: rowH,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingLeft: 14 * unit,
                    paddingRight: 14 * unit,
                    fontFamily: SANS_FONT,
                  }}
                >
                  <span style={{ fontSize: 13 * unit, color: BRAND.foreground }}>
                    {row.label}
                  </span>
                  <span
                    style={{ fontSize: 11 * unit, color: BRAND.mutedForeground }}
                  >
                    {row.meta}
                  </span>
                </div>
              </div>
            );
          })}
          <div
            style={{
              marginTop: 4 * unit,
              paddingTop: 6 * unit,
              paddingLeft: 14 * unit,
              borderTop: `${1 * unit}px solid ${BRAND.border}`,
              fontFamily: MONO_FONT,
              fontSize: 9.5 * unit,
              color: BRAND.mutedForeground,
            }}
          >
            ↑↓ to navigate · ⏎ to select · esc to dismiss
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            fontFamily: MONO_FONT,
            fontSize: 11 * unit,
            color: BRAND.mutedForeground,
          }}
        >
          {`opacity ${shown.toFixed(3)} · translateY ${panelY.toFixed(2)}px`}
        </div>
      </div>
    </SpecStage>
  );
};
