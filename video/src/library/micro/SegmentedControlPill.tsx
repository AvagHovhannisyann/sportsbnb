/**
 * SegmentedControlPill — two buttons that are one switch with two positions.
 * Spec for MOTION-DESIGN-CASES case 33. Component:
 * `src/pages/NearbyFieldsPage.tsx:183-233`, the `view` state at `:87`, the
 * branch it drives at `:243`. This is the app's only map/list toggle —
 * `/venues` and `/venues/map` are two routes with no toggle between them.
 *
 * WHAT IS SPECIFIED
 *   Two things, and only two.
 *     (a) The active fill stops jumping between the buttons via
 *         `transition-colors`. It becomes ONE `bg-primary` pill that slides
 *         horizontally between the segments, 180ms `--ease-out-expo`, with the
 *         icon and label colours crossfading over it in 150ms.
 *     (b) The incoming panel — map or list — fades `opacity 0 → 1` over 200ms
 *         `--ease-out-expo`, starting at t = 60ms so the pill is already moving
 *         when the content answers.
 *
 *   NOT `--ease-spring`. Stated explicitly because it is the obvious wrong
 *   choice: `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoots ~10%, the container
 *   is `rounded-lg border border-border overflow-hidden` (`:183`), and the
 *   overshoot would be sliced off by the same `overflow-hidden` that already
 *   crops the focus ring (see the comment at `:186-204`). A spring you cannot
 *   see the end of is a stutter.
 *
 *   DO NOT CROSSFADE THE TWO PANELS. A crossfade needs both mounted, and
 *   mounting the `GoogleMap` (`:259`) is a tile fetch plus a canvas init.
 *   Holding it alive under a fading list — or double-mounting it — costs far
 *   more than the transition is worth. The outgoing panel unmounts instantly
 *   and the incoming one fades in over the space it left. That is why the
 *   outgoing panel here vanishes on a single frame: it is the specification.
 *
 * CSS EQUIVALENT
 *   .view-pill  { transition: transform 180ms cubic-bezier(0.16,1,0.3,1); }
 *   .view-seg   { transition: color 150ms cubic-bezier(0.16,1,0.3,1); }
 *   .view-panel { animation: fade-in 200ms cubic-bezier(0.16,1,0.3,1) 60ms both; }
 *   framer-motion for the pill: <motion.span layoutId="view-pill" /> inside
 *   whichever button is active — same shared-layout trick as case 26, same
 *   reason: the target is whatever the DOM measures, and the two segments are
 *   not the same width once one of them is localised into Armenian.
 *   Tailwind `animate-in fade-in-0` for the panel.
 *
 * REDUCED MOTION
 *   `useReducedMotion()` → the pill teleports (`transition={{ duration: 0 }}`)
 *   and the panel's fade class is not applied. The state stays completely
 *   readable: the active segment is still `bg-primary text-primary-foreground`
 *   and still carries `aria-pressed`, which is what actually communicates it.
 *   Skip the panel fade for a second, independent reason — a fading map canvas
 *   is exactly the large-area luminance change reduced-motion users opt out of,
 *   not merely a movement they would rather not see.
 *   Loop freezes at frame 0, mid-dwell on the first segment.
 *
 * PERF
 *   The pill is a `transform` on one element measured across two buttons.
 *   The panel fade is `opacity` on a container holding a map canvas — one extra
 *   composited layer for twelve frames, acceptable, but do not extend it past
 *   ~250ms and do not add a `transform`: transforming a Maps container makes
 *   the API's hit-testing and its injected pan controls disagree with the
 *   painted position for the length of the animation.
 *
 * LOOP
 *   Seamless, using the half-step shift. `stepCycle` is fed `frame + step/2`,
 *   so the toggle fires at local frames 36 and 108 of a 144-frame period and
 *   never at 0 or 144. Frame 0 and frame 144 are both "segment 1 active, pill
 *   settled, panel at opacity 1", identically — where an unshifted clock would
 *   put the panel at opacity 0 on frame 0 and opacity 1 on frame 144. Every
 *   painted value comes from the `(from, to, t)` triple, not from a raw index.
 *   2 segments × 1200ms = 2400ms at 60fps.
 */

import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_OUT_EXPO,
  MONO_FONT,
  RADIUS,
  SANS_FONT,
  courtGreen,
  framesToMs,
  hairline,
  hashUnit,
  mix,
  progress,
  stepCycle,
  useSpecFrame,
} from "./microKit";
import { SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 2 segments × 1200ms = 2400ms at 60fps. */
const PERIOD = 144;
const STEP_MS = 1200;
const SLIDE_MS = 180;
const TINT_MS = 150;
const PANEL_DELAY_MS = 60;
const PANEL_FADE_MS = 200;

export type SegmentedControlPillProps = {
  /** Exactly two, because the component has exactly two. */
  segments: readonly [string, string];
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const segmentedControlPillDefaultProps: SegmentedControlPillProps = {
  segments: ["List", "Map"],
  speed: 1,
};

export const SegmentedControlPill: FC<SegmentedControlPillProps> = ({
  segments,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  const count = segments.length;
  const stepFrames = PERIOD / count;
  /** Half-step shift: the toggle never lands on the wrap frame. See header. */
  const step = stepCycle(
    frame + stepFrames / 2,
    fps,
    PERIOD,
    count,
    SLIDE_MS,
    EASE_OUT_EXPO,
  );
  const tint = progress(step.localFrame, fps, 0, TINT_MS, EASE_OUT_EXPO);
  const panel = progress(
    step.localFrame,
    fps,
    PANEL_DELAY_MS,
    PANEL_FADE_MS,
    EASE_OUT_EXPO,
  );

  const stageW = 620 * unit;
  const stageH = 236 * unit;
  const segW = 108 * unit;
  const ctrlH = 38 * unit;
  const ctrlPad = 3 * unit;
  const ctrlW = segW * count + ctrlPad * 2;
  const ctrlLeft = (stageW - ctrlW) / 2;

  const pillX = mix(step.from, step.to, step.t) * segW;
  const emphasis = (i: number): number =>
    (i === step.to ? tint : 0) + (i === step.from ? 1 - tint : 0);

  const panelTop = ctrlH + 26 * unit;
  const panelH = stageH - panelTop - 26 * unit;
  const showingMap = step.to === 1;

  return (
    <SpecStage
      caseRef="Case 33"
      title="Segmented control — one pill, two positions"
      css="pill transform: translateX 180ms var(--ease-out-expo) — NOT --ease-spring, overflow-hidden crops the overshoot · label color 150ms · panel opacity 0→1 200ms, delay 60ms · outgoing panel unmounts instantly"
      reduced="Pill teleports (duration 0); panel fade class not applied. aria-pressed and the solid fill already carry the state."
      phases={[
        { label: "pill slide", fromMs: 0, toMs: SLIDE_MS },
        { label: "label tint", fromMs: 0, toMs: TINT_MS, tone: "cyan" },
        {
          label: "panel fade",
          fromMs: PANEL_DELAY_MS,
          toMs: PANEL_DELAY_MS + PANEL_FADE_MS,
          tone: "amber",
        },
        { label: "dwell", fromMs: SLIDE_MS, toMs: STEP_MS, tone: "muted" },
      ]}
      elapsedMs={framesToMs(step.localFrame, fps)}
      totalMs={STEP_MS}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {/* The control. overflow: hidden, exactly as it ships. */}
        <div
          style={{
            position: "absolute",
            left: ctrlLeft,
            top: 0,
            width: ctrlW,
            height: ctrlH,
            boxSizing: "border-box",
            borderRadius: RADIUS.md * unit,
            backgroundColor: BRAND.surface1,
            border: `${1 * unit}px solid ${BRAND.border}`,
            overflow: "hidden",
            padding: ctrlPad,
          }}
        >
          {/* ONE pill. Moved, never re-coloured in place. */}
          <div
            style={{
              position: "absolute",
              left: ctrlPad,
              top: ctrlPad,
              width: segW,
              height: ctrlH - ctrlPad * 2,
              borderRadius: RADIUS.sm * unit,
              backgroundColor: BRAND.primary,
              transform: `translateX(${pillX}px)`,
            }}
          />
          {segments.map((seg, i) => {
            const e = emphasis(i);
            return (
              <div
                key={seg}
                style={{
                  position: "absolute",
                  left: ctrlPad + i * segW,
                  top: ctrlPad,
                  width: segW,
                  height: ctrlH - ctrlPad * 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: SANS_FONT,
                  fontSize: 13 * unit,
                  fontWeight: 600,
                  color: e > 0.5 ? BRAND.primaryForeground : BRAND.foregroundSoft,
                }}
              >
                {seg}
              </div>
            );
          })}
        </div>

        {/* Where a --ease-spring overshoot would land, and be sliced off. */}
        <div
          style={{
            position: "absolute",
            left: ctrlLeft + ctrlW,
            top: 0,
            width: segW * 0.1,
            height: ctrlH,
            borderTop: `${1 * unit}px dashed ${hairline(1)}`,
            borderRight: `${1 * unit}px dashed ${hairline(1)}`,
            borderBottom: `${1 * unit}px dashed ${hairline(1)}`,
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: ctrlLeft + ctrlW + segW * 0.1 + 8 * unit,
            top: ctrlH / 2 - 7 * unit,
            fontFamily: MONO_FONT,
            fontSize: 9.5 * unit,
            color: BRAND.mutedForeground,
          }}
        >
          spring overshoot, cropped
        </div>

        {/* The incoming panel. Fades in over the space the other one left. */}
        <div
          style={{
            position: "absolute",
            left: ctrlLeft - 60 * unit,
            top: panelTop,
            width: ctrlW + 120 * unit,
            height: panelH,
            borderRadius: RADIUS.lg * unit,
            backgroundColor: BRAND.surface1,
            border: `${1 * unit}px solid ${BRAND.border}`,
            overflow: "hidden",
            opacity: panel,
          }}
        >
          {showingMap ? (
            <>
              {/* A map: deterministic pin scatter, hashUnit, never random. */}
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={`pin-${String(i)}`}
                  style={{
                    position: "absolute",
                    left: (0.06 + 0.88 * hashUnit(i, 2)) * (ctrlW + 120 * unit),
                    top: (0.12 + 0.72 * hashUnit(i, 9)) * panelH,
                    width: 8 * unit,
                    height: 8 * unit,
                    borderRadius: 999,
                    backgroundColor: BRAND.primary,
                    boxShadow: `0 0 0 ${4 * unit}px ${courtGreen(0.14)}`,
                  }}
                />
              ))}
            </>
          ) : (
            <>
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={`row-${String(i)}`}
                  style={{
                    position: "absolute",
                    left: 12 * unit,
                    top: (10 + i * 34) * unit,
                    width: ctrlW + 96 * unit,
                    height: 28 * unit,
                    borderRadius: RADIUS.sm * unit,
                    backgroundColor: BRAND.surface2,
                  }}
                />
              ))}
            </>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            fontFamily: MONO_FONT,
            fontSize: 11 * unit,
            lineHeight: 1.8,
            color: BRAND.mutedForeground,
          }}
        >
          {`pill translateX ${(pillX / unit).toFixed(1)}px`}
          <br />
          {`panel opacity ${panel.toFixed(3)}`}
        </div>
      </div>
    </SpecStage>
  );
};
