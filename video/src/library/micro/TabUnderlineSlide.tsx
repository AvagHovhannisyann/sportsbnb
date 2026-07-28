/**
 * TabUnderlineSlide — a tab rail whose indicator changes width as it travels.
 *
 * NO CATALOGUE CASE COVERS THIS DIRECTLY, and the header says so rather than
 * inventing a number. The nearest neighbours are case 33 (the segmented
 * control — same "one indicator, two positions" idea, fixed widths, a filled
 * pill) and cases 66 / 86 (the /login and join panels, which are several
 * screens in one slot and specify the *panel* half of a tab swap). This piece
 * is the part neither of them states: an underline crossing labels of
 * different widths.
 *
 * WHAT IS SPECIFIED
 *   `transform: translateX` AND `width`, both 180ms `--ease-out-expo`, on ONE
 *   underline element. Width is the whole reason this is not case 33: the
 *   segments there are equal, so a pill only needs `translateX` and stays on
 *   the compositor. An underline that must span "Overview" and then "Reviews"
 *   changes size, and `width` is a layout property — so animate `transform:
 *   scaleX()` on a 1px-wide element instead, with the label widths written into
 *   the scale factor. `scaleX` composites; `width` triggers layout on every
 *   frame of the transition and will show up in a profile on a slow phone.
 *
 *   The incoming panel enters with `opacity 0 → 1` and an 8px `translateX` in
 *   the direction of travel, 200ms starting at t = 60ms. The 8px is small on
 *   purpose: it says "this content is to the right of the last content", which
 *   is a spatial claim tabs actually make, and anything larger becomes a
 *   carousel — which they do not.
 *
 *   The outgoing panel is not crossfaded out. Same reason as case 33: two
 *   panels mounted at once to animate one of them away is a cost paid on every
 *   tab press for a frame nobody looks at.
 *
 * CSS EQUIVALENT
 *   .tab-underline { width: 1px; transform-origin: 0 50%;
 *                    transition: transform 180ms cubic-bezier(0.16,1,0.3,1); }
 *   /  transform: translateX(<left>px) scaleX(<width>)  — one composited property  /
 *   .tab-panel     { animation: tab-in 200ms cubic-bezier(0.16,1,0.3,1) 60ms both; }
 *   @keyframes tab-in { from { opacity: 0; transform: translateX(8px); } }
 *   framer-motion: <motion.span layoutId="tab-underline" /> inside the active
 *   trigger gets both the position and the width from the DOM measurement,
 *   which is the honest version — the label widths are not knowable ahead of
 *   time once the rail is localised into Armenian, where "Ակնարկ" and
 *   "Կարծիքներ" differ by roughly half the rail.
 *
 * REDUCED MOTION
 *   `transition: none` on the underline and no animation class on the panel.
 *   The underline jumps; the panel appears at full opacity in place. This
 *   loses nothing at all — the active tab is also `aria-selected="true"` with a
 *   weight change, and the underline is a 2px solid bar in `--primary`, which
 *   is not a subtlety that needed motion to be found.
 *   Loop freezes at frame 0, mid-dwell on the first tab.
 *
 * LOOP
 *   Seamless, via the half-step shift. `stepCycle` is fed `frame + step/2`, so
 *   the tab changes at local frames 27, 81 and 135 of a 162-frame period —
 *   never at 0 or 162. Frame 0 and frame 162 are both "tab 1 selected,
 *   underline settled at its width, panel at opacity 1 and translateX 0",
 *   value for value. The panel's direction term is `sign(to − from) · 8 ·
 *   (1 − p)` and `p` is 1 at both ends, so the sign never reaches the paint.
 *   3 tabs × 900ms = 2700ms at 60fps.
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
  mix,
  progress,
  stepCycle,
  useSpecFrame,
} from "./microKit";
import { SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 3 tabs × 900ms = 2700ms at 60fps. */
const PERIOD = 162;
const STEP_MS = 900;
const SLIDE_MS = 180;
const PANEL_DELAY_MS = 60;
const PANEL_FADE_MS = 200;

/** Approximate advance width per character at 14px in the sans stack. */
const CHAR_W = 7.6;
const TAB_PAD = 18;

export type TabUnderlineSlideProps = {
  tabs: readonly string[];
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const tabUnderlineSlideDefaultProps: TabUnderlineSlideProps = {
  tabs: ["Overview", "Availability", "Reviews"],
  speed: 1,
};

export const TabUnderlineSlide: FC<TabUnderlineSlideProps> = ({
  tabs,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  const count = tabs.length;
  const stepFrames = PERIOD / count;
  /** Half-step shift: the tab change never lands on the wrap frame. */
  const step = stepCycle(
    frame + stepFrames / 2,
    fps,
    PERIOD,
    count,
    SLIDE_MS,
    EASE_OUT_EXPO,
  );
  const panelP = progress(
    step.localFrame,
    fps,
    PANEL_DELAY_MS,
    PANEL_FADE_MS,
    EASE_OUT_EXPO,
  );

  /** Label geometry, in canvas px. Radix measures these; here they are math. */
  const widths = tabs.map((t) => t.length * CHAR_W + TAB_PAD * 2);
  const lefts = widths.map((_, i) =>
    widths.slice(0, i).reduce((sum, w) => sum + w, 0),
  );
  const railW = widths.reduce((sum, w) => sum + w, 0);

  const barLeft = mix(lefts[step.from], lefts[step.to], step.t);
  const barW = mix(widths[step.from], widths[step.to], step.t);
  /** Direction of travel, +1 or −1. Never reaches the paint at the seam. */
  const dir = step.to >= step.from ? 1 : -1;
  const panelX = dir * 8 * (1 - panelP);

  const stageW = 640 * unit;
  const stageH = 232 * unit;
  const railLeft = (stageW - railW * unit) / 2;
  const railH = 40 * unit;
  const panelTop = railH + 28 * unit;
  const panelH = stageH - panelTop - 30 * unit;

  const emphasis = (i: number): number =>
    (i === step.to ? step.t : 0) + (i === step.from ? 1 - step.t : 0);

  return (
    <SpecStage
      title="Tabs — the underline changes width as it travels"
      css="one bar: transform translateX + scaleX, 180ms var(--ease-out-expo) — scaleX, never width · panel opacity 0→1 + translateX(8px→0) 200ms, delay 60ms · outgoing panel unmounts"
      reduced="transition: none on the bar, no animation class on the panel. aria-selected and a 2px --primary bar carry it without motion."
      phases={[
        { label: "bar slide + scale", fromMs: 0, toMs: SLIDE_MS },
        {
          label: "panel in",
          fromMs: PANEL_DELAY_MS,
          toMs: PANEL_DELAY_MS + PANEL_FADE_MS,
          tone: "cyan",
        },
        { label: "dwell", fromMs: SLIDE_MS, toMs: STEP_MS, tone: "muted" },
      ]}
      elapsedMs={framesToMs(step.localFrame, fps)}
      totalMs={STEP_MS}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {/* The rail. */}
        <div
          style={{
            position: "absolute",
            left: railLeft,
            top: 0,
            width: railW * unit,
            height: railH,
            borderBottom: `${1 * unit}px solid ${BRAND.border}`,
          }}
        >
          {tabs.map((tab, i) => {
            const e = emphasis(i);
            return (
              <div
                key={tab}
                style={{
                  position: "absolute",
                  left: lefts[i] * unit,
                  top: 0,
                  width: widths[i] * unit,
                  height: railH,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: SANS_FONT,
                  fontSize: 14 * unit,
                  fontWeight: e > 0.5 ? 600 : 400,
                  color: e > 0.5 ? BRAND.foreground : BRAND.foregroundSoft,
                }}
              >
                {tab}
              </div>
            );
          })}

          {/* ONE bar. translateX + scaleX on a 1px element — composited. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: -1 * unit,
              width: 1,
              height: 2 * unit,
              backgroundColor: BRAND.primary,
              transformOrigin: "0% 50%",
              transform: `translateX(${barLeft * unit}px) scaleX(${barW * unit})`,
            }}
          />
        </div>

        {/* The incoming panel. 8px in the direction of travel, then nothing. */}
        <div
          style={{
            position: "absolute",
            left: railLeft,
            top: panelTop,
            width: railW * unit,
            height: panelH,
            borderRadius: RADIUS.lg * unit,
            backgroundColor: BRAND.surface1,
            border: `${1 * unit}px solid ${BRAND.border}`,
            opacity: panelP,
            transform: `translateX(${panelX * unit}px)`,
            padding: 14 * unit,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontFamily: SANS_FONT,
              fontSize: 13 * unit,
              fontWeight: 600,
              color: BRAND.foreground,
            }}
          >
            {tabs[step.to]}
          </div>
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={`line-${String(i)}`}
              style={{
                marginTop: 10 * unit,
                width: `${String(88 - i * 16)}%`,
                height: 8 * unit,
                borderRadius: 999,
                backgroundColor: BRAND.surface3,
              }}
            />
          ))}
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
          {`translateX ${barLeft.toFixed(1)}px · scaleX ${barW.toFixed(1)} · panel translateX ${panelX.toFixed(2)}px`}
        </div>
      </div>
    </SpecStage>
  );
};
