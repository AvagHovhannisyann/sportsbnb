/**
 * FocusRingInstant — the focus ring should appear, not fade in.
 * Spec for MOTION-DESIGN-CASES case 95. Two buttons side by side: the one the
 * app ships today, and the one it should.
 *
 * WHAT IS SPECIFIED
 *   Tailwind implements `ring-2` as `box-shadow`, and the base string in
 *   `src/components/ui/button.tsx:8` carries `transition-all duration-200`.
 *   So focusing a button interpolates the ring from transparent to `--ring`
 *   over 200ms: the indicator arrives *after* the focus does, and a user
 *   tabbing at speed runs ahead of their own ring. The correct motion here is
 *   none — the ring must be at full strength on the frame focus lands.
 *
 *   The fix is to exclude `box-shadow` from the transition list. If a settle
 *   is wanted, animate only the *offset*: `ring-offset-width 0 → 2px` over
 *   120ms while the ring itself is opaque from frame one. The indicator is
 *   never absent; it just breathes outward.
 *
 * CSS EQUIVALENT
 *   /  wrong, today  /
 *   .btn { transition: all 200ms; }
 *   /  right  /
 *   .btn { transition: background-color 200ms, color 200ms, transform 120ms; }
 *   .btn:focus-visible { box-shadow: 0 0 0 2px hsl(var(--background)),
 *                                    0 0 0 4px hsl(var(--ring)); }
 *   .btn:focus-visible { transition: outline-offset 120ms cubic-bezier(0.16,1,0.3,1); }
 *   framer-motion: do not. A focus indicator that depends on JS having
 *   hydrated is a worse indicator than one that does not.
 *
 * REDUCED MOTION
 *   Instant is already the reduced-motion answer, so the fixed version needs
 *   no fallback. If the optional offset growth is adopted, add
 *   `[class*="focus-visible:ring"] { transition-property: none; }` to the
 *   block at `src/index.css:619`. Loop freezes at frame 0 — nothing focused.
 *
 * LOOP
 *   Seamless. Three `toggleCycle` values, all of them a clamped rise minus a
 *   clamped fall and therefore exactly 0 at local frame 0 and at local frame
 *   120. The *correct* ring uses `onDurMs: 0` and `offDurMs: 0` — a legal,
 *   deliberate zero, which `progress()` treats as a step rather than an
 *   error. A step function is trivially seamless: 0 at both ends.
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
  focusRing,
  progress,
  toggleCycle,
  useSpecFrame,
  wrap,
} from "./microKit";
import { KeyCap, SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 2000ms at 60fps. */
const PERIOD = 120;

const FOCUS_MS = 400;
const BLUR_MS = 1400;

export type FocusRingInstantProps = {
  label: string;
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const focusRingInstantDefaultProps: FocusRingInstantProps = {
  label: "Reserve",
  speed: 1,
};

export const FocusRingInstant: FC<FocusRingInstantProps> = ({
  label,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  /** What ships: box-shadow dragged along by `transition-all duration-200`. */
  const wrongRing = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: FOCUS_MS,
    onDurMs: 200,
    offAtMs: BLUR_MS,
    offDurMs: 200,
    onEase: EASE_OUT_EXPO,
    offEase: EASE_OUT_EXPO,
  });

  /** What should ship: 0ms. Present on the frame focus lands. */
  const rightRing = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: FOCUS_MS,
    onDurMs: 0,
    offAtMs: BLUR_MS,
    offDurMs: 0,
  });

  /** The optional part — the gap, and only the gap, growing over 120ms. */
  const offset = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: FOCUS_MS,
    onDurMs: 120,
    offAtMs: BLUR_MS,
    offDurMs: 0,
    onEase: EASE_OUT_EXPO,
  });

  /** The Tab keypress that causes all of it. */
  const key = progress(wrap(frame, PERIOD), fps, FOCUS_MS - 40, 60);
  const keyUp = progress(wrap(frame, PERIOD), fps, FOCUS_MS + 40, 60);

  const stageW = 760 * unit;
  const stageH = 230 * unit;
  const btnW = 150 * unit;
  const btnH = 46 * unit;
  const gap = 150 * unit;
  const leftX = stageW / 2 - btnW - gap / 2;
  const rightX = stageW / 2 + gap / 2;
  const btnTop = 62 * unit;

  const panel = (
    x: number,
    caption: string,
    verdict: string,
    ring: string,
    tone: string,
    readout: string,
  ) => (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: btnTop - 34 * unit,
          width: btnW,
          textAlign: "center",
          fontFamily: MONO_FONT,
          fontSize: 10.5 * unit,
          textTransform: "uppercase",
          letterSpacing: 0.12 * 10.5 * unit,
          color: tone,
        }}
      >
        {caption}
      </div>
      <div
        style={{
          position: "absolute",
          left: x,
          top: btnTop,
          width: btnW,
          height: btnH,
          borderRadius: RADIUS.lg * unit,
          backgroundColor: BRAND.surface2,
          border: `${1 * unit}px solid ${BRAND.borderStrong}`,
          boxShadow: ring,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SANS_FONT,
          fontSize: 14.5 * unit,
          fontWeight: 500,
          color: BRAND.foreground,
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: "absolute",
          left: x - 20 * unit,
          top: btnTop + btnH + 26 * unit,
          width: btnW + 40 * unit,
          textAlign: "center",
          fontFamily: SANS_FONT,
          fontSize: 12 * unit,
          color: tone,
        }}
      >
        {verdict}
      </div>
      <div
        style={{
          position: "absolute",
          left: x - 20 * unit,
          top: btnTop + btnH + 46 * unit,
          width: btnW + 40 * unit,
          textAlign: "center",
          fontFamily: MONO_FONT,
          fontSize: 11 * unit,
          color: BRAND.mutedForeground,
        }}
      >
        {readout}
      </div>
    </>
  );

  return (
    <SpecStage
      caseRef="Case 95"
      title="Focus ring — instant, not faded"
      css="box-shadow ring: 0ms. Excluded from the transition list. Optional: outline-offset 0 → 2px over 120ms var(--ease-out-expo), ring opaque from frame one."
      reduced="Already instant, so nothing to suppress. If the offset growth ships, set transition-property: none on it."
      phases={[
        { label: "Tab keydown", fromMs: FOCUS_MS - 40, toMs: FOCUS_MS, tone: "amber" },
        { label: "ring (correct)", fromMs: FOCUS_MS, toMs: FOCUS_MS },
        { label: "ring (today)", fromMs: FOCUS_MS, toMs: FOCUS_MS + 200, tone: "rose" },
        { label: "offset growth", fromMs: FOCUS_MS, toMs: FOCUS_MS + 120, tone: "cyan" },
      ]}
      elapsedMs={framesToMs(wrap(frame, PERIOD), fps)}
      totalMs={framesToMs(PERIOD, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {panel(
          leftX,
          "today · transition-all 200ms",
          "the ring arrives after the focus",
          focusRing(unit, wrongRing, 2),
          BRAND.destructive,
          `ring alpha ${wrongRing.toFixed(3)}`,
        )}
        {panel(
          rightX,
          "spec · 0ms + 120ms offset",
          "present on the frame focus lands",
          focusRing(unit, rightRing, 2 * offset),
          BRAND.primary,
          `alpha ${rightRing.toFixed(0)} · offset ${(2 * offset).toFixed(2)}px`,
        )}

        <div
          style={{
            position: "absolute",
            left: stageW / 2 - 24 * unit,
            top: btnTop + 2 * unit,
          }}
        >
          <KeyCap unit={unit} label="Tab" pressed={key - keyUp} />
        </div>

        <div
          style={{
            position: "absolute",
            left: stageW / 2 - 0.5 * unit,
            top: 0,
            width: 1 * unit,
            height: stageH - 40 * unit,
            backgroundColor: courtGreen(0.12),
          }}
        />
      </div>
    </SpecStage>
  );
};
