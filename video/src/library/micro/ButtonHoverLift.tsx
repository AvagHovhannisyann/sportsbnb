/**
 * ButtonHoverLift — the primary CTA answering the pointer.
 * Spec for MOTION-DESIGN-CASES case 10 ("Primary CTA — arrow commits, button
 * acknowledges"), part (a).
 *
 * WHAT IS SPECIFIED
 *   Two signals on one control, at two different speeds. The button body
 *   changes colour and shadow at 200ms; the arrow inside it slides 3px toward
 *   the edge at 180ms in / 140ms out, because leaving is always faster than
 *   arriving. The `hero` variant also lifts 2px (`hover:-translate-y-0.5`).
 *
 * CSS EQUIVALENT
 *   .cta { transition: background-color 200ms cubic-bezier(0.16,1,0.3,1),
 *                      box-shadow      200ms cubic-bezier(0.16,1,0.3,1),
 *                      transform       200ms cubic-bezier(0.16,1,0.3,1); }
 *   .cta:hover { background: hsl(var(--primary)/0.92);
 *                box-shadow: var(--shadow); transform: translateY(-2px); }
 *   .cta svg { transition: transform 180ms cubic-bezier(.2,.8,.2,1); }
 *   .cta:hover svg { transform: translateX(3px); }
 *   .cta svg  (resting rule, i.e. the exit) { transition-duration: 140ms; }
 *   framer-motion: whileHover={{ y: -2 }}
 *                  transition={{ duration: 0.2, ease: [0.16,1,0.3,1] }}
 *
 * REDUCED MOTION
 *   `motion-reduce:transform-none` on the arrow and on the button: no 3px
 *   slide, no 2px lift. The background and shadow changes survive, so hover is
 *   still unambiguously visible — it just does not move. Here the loop freezes
 *   at frame 0, the resting state.
 *
 * LOOP
 *   Seamless. Every animated value is a `toggleCycle`: a clamped rise minus a
 *   clamped fall. At local frame 0 neither has started (0 - 0); at local frame
 *   `period` both are finished (1 - 1). Exactly zero at both ends, so frame 0
 *   and frame 120 are the same picture. Period 2000ms > the 1440ms at which
 *   the exit has fully settled.
 */

import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_OUT_EXPO,
  EASE_SNAP,
  RADIUS,
  SANS_FONT,
  MONO_FONT,
  framesToMs,
  mix,
  shadowBlend,
  toggleCycle,
  useSpecFrame,
  wrap,
} from "./microKit";
import { Pointer, SpecStage, StateChip } from "./specStage";

const CANVAS_W = 960;
/** 2000ms at 60fps. */
const PERIOD = 120;

const HOVER_IN_MS = 300;
const HOVER_OUT_MS = 1300;

export type ButtonHoverLiftProps = {
  /** The CTA label. `/` ships "Browse venues". */
  label: string;
  /**
   * Clock multiplier. 1 is the production timing and the only value at which
   * the registered `durationInFrames` loops seamlessly; drop it to walk the
   * 200ms transition frame by frame, and scale `durationInFrames` by 1/speed.
   */
  speed: number;
};

export const buttonHoverLiftDefaultProps: ButtonHoverLiftProps = {
  label: "Browse venues",
  speed: 1,
};

export const ButtonHoverLift: FC<ButtonHoverLiftProps> = ({ label, speed }) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  // Loop: reduced motion freezes at frame 0, which is the resting state.
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  /** Body: colour + shadow + the hero variant's 2px lift, all at 200ms. */
  const body = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: HOVER_IN_MS,
    onDurMs: 200,
    offAtMs: HOVER_OUT_MS,
    offDurMs: 200,
    onEase: EASE_OUT_EXPO,
    offEase: EASE_OUT_EXPO,
  });

  /** Arrow: 180ms in, 140ms out. The asymmetry is the point of the case. */
  const arrow = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: HOVER_IN_MS,
    onDurMs: 180,
    offAtMs: HOVER_OUT_MS,
    offDurMs: 140,
    onEase: EASE_SNAP,
    offEase: EASE_SNAP,
  });

  /** The pointer's own travel, so the hover has a visible cause. */
  const cursor = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: 120,
    onDurMs: 220,
    offAtMs: HOVER_OUT_MS,
    offDurMs: 220,
    onEase: EASE_OUT_EXPO,
    offEase: EASE_OUT_EXPO,
  });

  const stageW = 760 * unit;
  const stageH = 220 * unit;
  const btnW = 210 * unit;
  const btnH = 48 * unit;
  const btnLeft = (stageW - btnW) / 2;
  const btnTop = (stageH - btnH) / 2 - 10 * unit;

  return (
    <SpecStage
      caseRef="Case 10"
      title="Button — hover"
      css="transition: background-color 200ms, box-shadow 200ms, transform 200ms var(--ease-out-expo) · arrow translateX(3px) 180ms in / 140ms out cubic-bezier(.2,.8,.2,1)"
      reduced="No 3px arrow slide, no 2px lift. Background and shadow still change, so hover stays visible."
      phases={[
        { label: "body 200ms", fromMs: HOVER_IN_MS, toMs: HOVER_IN_MS + 200 },
        { label: "arrow in", fromMs: HOVER_IN_MS, toMs: HOVER_IN_MS + 180, tone: "cyan" },
        { label: "body out", fromMs: HOVER_OUT_MS, toMs: HOVER_OUT_MS + 200, tone: "muted" },
        { label: "arrow out", fromMs: HOVER_OUT_MS, toMs: HOVER_OUT_MS + 140, tone: "amber" },
      ]}
      elapsedMs={framesToMs(wrap(frame, PERIOD), fps)}
      totalMs={framesToMs(PERIOD, fps)}
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
            // hover:bg-primary/92 — the fill loses 8% alpha, it does not
            // change hue. Over the dark plate that reads as a small step down.
            backgroundColor: `hsla(151, 90%, 47%, ${mix(1, 0.92, body)})`,
            boxShadow: shadowBlend(unit, "sm", "base", body),
            transform: `translateY(${-2 * body * unit}px)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8 * unit,
            fontFamily: SANS_FONT,
            fontSize: 15 * unit,
            fontWeight: 500,
            color: BRAND.primaryForeground,
          }}
        >
          <span>{label}</span>
          <svg
            width={16 * unit}
            height={16 * unit}
            viewBox="0 0 24 24"
            fill="none"
            stroke={BRAND.primaryForeground}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: `translateX(${3 * arrow * unit}px)` }}
          >
            <path d="M4 12 H19" />
            <path d="M13 6 L19 12 L13 18" />
          </svg>
        </div>

        {/* Live readout — the two numbers a developer is checking. */}
        <div
          style={{
            position: "absolute",
            left: btnLeft,
            top: btnTop + btnH + 22 * unit,
            width: btnW,
            textAlign: "center",
            fontFamily: MONO_FONT,
            fontSize: 11.5 * unit,
            color: BRAND.mutedForeground,
          }}
        >
          {`translateY ${(-2 * body).toFixed(2)}px · arrow ${(3 * arrow).toFixed(2)}px`}
        </div>

        <div
          style={{
            position: "absolute",
            left: btnLeft + btnW / 2 - 42 * unit,
            top: btnTop - 40 * unit,
            display: "flex",
            gap: 8 * unit,
          }}
        >
          <StateChip unit={unit} label=":hover" active={body} />
        </div>

        <Pointer
          unit={unit}
          x={mix(btnLeft + btnW + 78 * unit, btnLeft + btnW * 0.62, cursor)}
          y={mix(btnTop + btnH + 54 * unit, btnTop + btnH * 0.58, cursor)}
        />
      </div>
    </SpecStage>
  );
};
