/**
 * InputSuccessMatch — the half of case 72 that is not built yet.
 * Spec for MOTION-DESIGN-CASES case 72, positive counterpart. The "Passwords
 * match" line on `/signup` (`src/pages/SignupPage.tsx`, whose own header
 * comment at `:36` already names this as one of the two moments worth marking).
 *
 * WHAT IS SPECIFIED
 *   A success line earns more than an error does, and the extra is spent on
 *   exactly one property: the icon.
 *     text — `opacity 0 → 1`, `translateY(4px → 0)` over 220ms. It arrives from
 *       BELOW, where the error arrives from above (−4px, InputErrorShake). That
 *       is not decoration: the two lines occupy the same slot under the same
 *       field, and the direction is the fastest available signal of which one
 *       you are looking at, readable before the sentence is.
 *     icon — `scale 0.6 → 1` on `--ease-spring`
 *       (`cubic-bezier(0.34, 1.56, 0.64, 1)`), same 220ms. ~10% overshoot. This
 *       is the only overshoot in the whole error/success pair, and it is what
 *       separates "keep going" from "this one is done".
 *     border — to `--success` over 160ms `--ease-out-expo`, the same 160ms the
 *       error border gets. The field is not the celebration; the line is.
 *   Exit is `opacity` only, 160ms ease-in, no travel. Once the check has been
 *   read there is nothing to follow out.
 *
 * CSS EQUIVALENT
 *   .field-match      { transition: opacity 220ms cubic-bezier(0.16,1,0.3,1),
 *                                   transform 220ms cubic-bezier(0.16,1,0.3,1); }
 *   .field-match svg  { transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1); }
 *   /  enter from: opacity 0, translateY(4px); icon scale(0.6)  /
 *   framer-motion (preferred — the page already has a presence tree open for
 *   the error, so match its shape rather than reaching for tailwindcss-animate):
 *     <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
 *               exit={{ opacity: 0 }}
 *               transition={{ duration: 0.22, ease: [0.16,1,0.3,1] }}>
 *       <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }}
 *                    transition={{ duration: 0.22, ease: [0.34,1.56,0.64,1] }}>
 *
 * REDUCED MOTION
 *   Give the match line the same branch `errorMotion` already has: the variant
 *   object collapses to `{}`. The text appears at final opacity and position,
 *   the icon is drawn at `scale(1)` immediately, the border still turns green.
 *   Only the 4px slide and the icon pop are removed — and the pop is precisely
 *   the kind of small elastic bounce that reads as jitter to a
 *   vestibular-sensitive user, so it is the first thing to go, not the last.
 *   Loop freezes at frame 0: field valid-but-unannounced, no line.
 *
 * LOOP
 *   Seamless, with no masking argument required. Three drivers, each a
 *   `toggleCycle` whose off-window is a 0ms unmount reset placed at 2560ms —
 *   the exact frame the exit fade reaches zero. `opacity = rise − fall` is 0 at
 *   local frame 0 and 0 from 2560ms on; `y = 4·(1 − rise)` is 4px at both ends
 *   because the reset returns `rise` to 0; the icon's `scale` is 0.6 at both
 *   ends for the same reason. Frame 0 and frame 180 agree property by property,
 *   not merely pixel by pixel. 3000ms at 60fps.
 */

import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_IN,
  EASE_OUT_EXPO,
  EASE_SPRING,
  MONO_FONT,
  RADIUS,
  SANS_FONT,
  courtGreen,
  framesToMs,
  mix,
  toggleCycle,
  useSpecFrame,
  wrap,
} from "./microKit";
import { SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 3000ms at 60fps. */
const PERIOD = 180;

const MATCH_MS = 400;
const ENTER_MS = 220;
const EXIT_AT_MS = 2400;
const EXIT_MS = 160;
/** The frame the exit fade reaches zero — and therefore the reset frame. */
const RESET_MS = EXIT_AT_MS + EXIT_MS;

export type InputSuccessMatchProps = {
  label: string;
  value: string;
  message: string;
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const inputSuccessMatchDefaultProps: InputSuccessMatchProps = {
  label: "Confirm password",
  value: "••••••••••",
  message: "Passwords match",
  speed: 1,
};

export const InputSuccessMatch: FC<InputSuccessMatchProps> = ({
  label,
  value,
  message,
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
    onAtMs: MATCH_MS,
    onDurMs: ENTER_MS,
    offAtMs: RESET_MS,
    offDurMs: 0,
    onEase: EASE_OUT_EXPO,
  });
  const fall = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: EXIT_AT_MS,
    onDurMs: EXIT_MS,
    offAtMs: RESET_MS,
    offDurMs: 0,
    onEase: EASE_IN,
  });
  /** The one sprung value in the pair. Overshoots ~10% and settles. */
  const pop = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: MATCH_MS,
    onDurMs: ENTER_MS,
    offAtMs: RESET_MS,
    offDurMs: 0,
    onEase: EASE_SPRING,
  });

  const shown = rise - fall;
  const lineY = 4 * (1 - rise);
  const iconScale = mix(0.6, 1, pop);

  /** The field border, on the error's 160ms rather than the line's 220ms. */
  const valid = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: MATCH_MS,
    onDurMs: 160,
    offAtMs: EXIT_AT_MS,
    offDurMs: 160,
    onEase: EASE_OUT_EXPO,
    offEase: EASE_IN,
  });

  const stageW = 560 * unit;
  const stageH = 226 * unit;
  const fieldH = 46 * unit;
  const fieldTop = 74 * unit;

  return (
    <SpecStage
      caseRef="Case 72"
      title="Input — success, the one thing allowed to overshoot"
      css="line opacity 0→1 + translateY(4px→0) 220ms var(--ease-out-expo) · icon scale 0.6→1 220ms var(--ease-spring) · border 160ms · exit opacity-only 160ms ease-in"
      reduced="Same {} branch as errorMotion: line in place at full opacity, icon drawn at scale(1). The spring is the first thing dropped, not the last."
      phases={[
        { label: "line + icon in", fromMs: MATCH_MS, toMs: MATCH_MS + ENTER_MS },
        { label: "border", fromMs: MATCH_MS, toMs: MATCH_MS + 160, tone: "cyan" },
        { label: "shown", fromMs: MATCH_MS + ENTER_MS, toMs: EXIT_AT_MS, tone: "muted" },
        { label: "exit", fromMs: EXIT_AT_MS, toMs: RESET_MS, tone: "amber" },
      ]}
      elapsedMs={framesToMs(local, fps)}
      totalMs={framesToMs(PERIOD, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: fieldTop - 22 * unit,
            fontFamily: SANS_FONT,
            fontSize: 12 * unit,
            color: BRAND.mutedForeground,
          }}
        >
          {label}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: fieldTop,
            width: stageW,
            height: fieldH,
            boxSizing: "border-box",
            borderRadius: RADIUS.md * unit,
            backgroundColor: BRAND.input,
            border: `${1 * unit}px solid ${valid > 0.5 ? BRAND.success : BRAND.border}`,
            display: "flex",
            alignItems: "center",
            paddingLeft: 14 * unit,
            fontFamily: SANS_FONT,
            fontSize: 14 * unit,
            letterSpacing: 2 * unit,
            color: BRAND.foreground,
          }}
        >
          {value}
        </div>

        {/* The line. Arrives from BELOW — the error arrives from above. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: fieldTop + fieldH + 10 * unit,
            display: "flex",
            alignItems: "center",
            gap: 7 * unit,
            opacity: shown,
            transform: `translateY(${lineY * unit}px)`,
          }}
        >
          <span
            style={{
              width: 18 * unit,
              height: 18 * unit,
              borderRadius: 999,
              backgroundColor: courtGreen(0.16),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // The only sprung property in the error/success pair.
              transform: `scale(${iconScale})`,
            }}
          >
            <svg width={11 * unit} height={11 * unit} viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12.5 L10 17 L19 6.5"
                stroke={BRAND.success}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 12.5 * unit,
              color: BRAND.success,
            }}
          >
            {message}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: fieldTop + fieldH + 50 * unit,
            width: stageW,
            fontFamily: MONO_FONT,
            fontSize: 11 * unit,
            lineHeight: 1.8,
            color: BRAND.mutedForeground,
          }}
        >
          {`opacity ${shown.toFixed(3)} · translateY ${lineY.toFixed(2)}px · icon scale ${iconScale.toFixed(3)}`}
          <br />
          Error enters from −4px on a flat curve. Success enters from +4px with a
          spring. Same slot, opposite direction, read before the words are.
        </div>
      </div>
    </SpecStage>
  );
};
