/**
 * InputErrorShake — the shake, shown next to the reason it is not shipped.
 * Spec for MOTION-DESIGN-CASES case 72 ("Inline errors that do not shake"),
 * covering `src/pages/SignupPage.tsx:667-673` and the identical blocks in
 * `ForgotPasswordPage.tsx:141-143` and `ResetPasswordPage.tsx:208-210,254-256`.
 *
 * WHAT IS SPECIFIED
 *   Two fields, side by side, both receiving the same validation failure.
 *
 *   LEFT — shipped. The message enters `opacity 0 → 1` with
 *   `translateY(-4px → 0)` and leaves `opacity → 0` with `translateY(→ -2px)`.
 *   The field's border goes to `--destructive` on the same curve. The field
 *   itself does not move at all.
 *
 *   RIGHT — the rejected alternative, drawn so the difference is a measurement
 *   rather than an opinion: `translateX` ±6px, three decaying cycles over
 *   400ms. It is rejected because `validateField` runs on **every keystroke**
 *   (`SignupPage.tsx:216`), so "Passwords don't match" fires on the first
 *   character of the confirmation field and shaking there punishes someone for
 *   typing the second. A shake is for an event the user cannot fix by
 *   continuing; a per-keystroke validator produces the opposite kind of error.
 *
 * NUMBER DISAGREEMENT, STATED
 *   The catalogue gives the error 160ms `--ease-out-expo` "as shipped, via
 *   `transitionBase`". `transitionBase` in `src/lib/motion.ts:25` is
 *   `duration: 0.25`. The two do not agree. This spec renders 160ms, because
 *   an error line that is *usually about to be withdrawn* should not outlast a
 *   fast typist's next keystroke; whoever implements it should change
 *   `errorMotion`'s transition rather than assume 250ms was intended.
 *
 * CSS EQUIVALENT
 *   .field-error { transition: opacity 160ms cubic-bezier(0.16,1,0.3,1),
 *                              transform 160ms cubic-bezier(0.16,1,0.3,1); }
 *   /  enter from: opacity 0, translateY(-4px) — exit to: opacity 0, translateY(-2px)  /
 *   input[aria-invalid="true"] { border-color: hsl(var(--destructive));
 *                                transition: border-color 160ms cubic-bezier(0.16,1,0.3,1); }
 *   framer-motion: the keyed `motion.p` inside `<AnimatePresence initial={false}>`
 *   that already exists — `errorMotion`, `SignupPage.tsx:315-322` — with its
 *   transition set to `{ duration: 0.16, ease: [0.16,1,0.3,1] }`.
 *   The right-hand field has no build instructions. It is not being built.
 *
 * REDUCED MOTION
 *   `errorMotion` already collapses to `{}` under `useReducedMotion()`, so the
 *   message appears at final opacity and position with no travel — keep that.
 *   The border colour change may stay: a 160ms colour interpolation moves no
 *   pixels and carries the state. The right-hand shake would be the single
 *   worst thing on the page for a vestibular-sensitive user, which is a second
 *   independent reason not to build it.
 *   Loop freezes at frame 0 — valid field, no message.
 *
 * LOOP
 *   Seamless, by two mechanisms.
 *   (a) The message. `opacity = rise − fall`, both clamped, so it is exactly 0
 *       at local frame 0 and exactly 0 from 2360ms on. `translateY` is driven
 *       by the same two, and both carry a 0ms "unmount reset" at 2360ms — the
 *       exact frame opacity reaches 0 — which snaps `y` from its −2px exit
 *       value back to its −4px entry value while nothing is painted. That is
 *       literally what React does when `AnimatePresence` finishes the exit and
 *       drops the node; here it makes frame 0 and frame 180 the same picture.
 *   (b) The shake. `6 · (1 − p) · sin(2π · 3p)` over its 400ms window, where
 *       `p` is a clamped `progress`. `sin(0) = sin(6π) = 0`, and `p` is pinned
 *       at 0 before the window and 1 after it, so the term is exactly zero
 *       everywhere outside — a full three periods of a sine, not a tween.
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
  TAU,
  framesToMs,
  progress,
  rose,
  toggleCycle,
  useSpecFrame,
  wrap,
} from "./microKit";
import { SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 3000ms at 60fps. */
const PERIOD = 180;

const ERROR_MS = 400;
const ENTER_MS = 160;
const EXIT_AT_MS = 2200;
/** The frame opacity is exactly 0 again, and therefore the reset frame. */
const RESET_MS = EXIT_AT_MS + ENTER_MS;
/** The rejected shake: ±6px, three cycles, 400ms. */
const SHAKE_MS = 400;
const SHAKE_CYCLES = 3;

export type InputErrorShakeProps = {
  label: string;
  value: string;
  message: string;
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const inputErrorShakeDefaultProps: InputErrorShakeProps = {
  label: "Confirm password",
  value: "••••••••",
  message: "Passwords do not match",
  speed: 1,
};

export const InputErrorShake: FC<InputErrorShakeProps> = ({
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

  /** Enter, with the 0ms unmount reset at the frame opacity hits zero. */
  const rise = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: ERROR_MS,
    onDurMs: ENTER_MS,
    offAtMs: RESET_MS,
    offDurMs: 0,
    onEase: EASE_OUT_EXPO,
  });
  /** Exit, carrying the same reset so the pair closes together. */
  const fall = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: EXIT_AT_MS,
    onDurMs: ENTER_MS,
    offAtMs: RESET_MS,
    offDurMs: 0,
    onEase: EASE_IN,
  });

  const shown = rise - fall;
  /** −4px on the way in, −2px on the way out. See the loop note. */
  const messageY = -4 * (1 - rise) - 2 * fall;

  /** Border colour. Same window, same curve, no travel. */
  const invalid = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: ERROR_MS,
    onDurMs: ENTER_MS,
    offAtMs: EXIT_AT_MS,
    offDurMs: ENTER_MS,
    onEase: EASE_OUT_EXPO,
    offEase: EASE_IN,
  });

  /** The rejected gesture. Three full sine periods, decaying to nothing. */
  const shakeP = progress(local, fps, ERROR_MS, SHAKE_MS);
  const shakeX = 6 * (1 - shakeP) * Math.sin(TAU * SHAKE_CYCLES * shakeP);

  const stageW = 800 * unit;
  const stageH = 236 * unit;
  const colW = 340 * unit;
  const gap = stageW - colW * 2;
  const fieldH = 46 * unit;
  const fieldTop = 62 * unit;

  const renderField = (left: number, shakeOffset: number) => (
    <>
      <div
        style={{
          position: "absolute",
          left,
          top: fieldTop,
          width: colW,
          height: fieldH,
          boxSizing: "border-box",
          borderRadius: RADIUS.md * unit,
          backgroundColor: BRAND.input,
          border: `${1 * unit}px solid ${invalid > 0.5 ? BRAND.destructive : BRAND.border}`,
          transform: `translateX(${shakeOffset * unit}px)`,
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
      <div
        style={{
          position: "absolute",
          left,
          top: fieldTop - 22 * unit,
          fontFamily: SANS_FONT,
          fontSize: 12 * unit,
          color: BRAND.mutedForeground,
        }}
      >
        {label}
      </div>
      {/* The message. Opacity is exactly 0 at both ends of the period. */}
      <div
        style={{
          position: "absolute",
          left,
          top: fieldTop + fieldH + 9 * unit,
          width: colW,
          opacity: shown,
          transform: `translateY(${messageY * unit}px) translateX(${shakeOffset * unit}px)`,
          fontFamily: SANS_FONT,
          fontSize: 12.5 * unit,
          color: BRAND.destructive,
        }}
      >
        {message}
      </div>
    </>
  );

  return (
    <SpecStage
      caseRef="Case 72"
      title="Input — error, and the shake that is not shipped"
      css="message opacity 0→1 + translateY(-4px→0) 160ms var(--ease-out-expo) · exit → -2px 160ms ease-in · border-color 160ms · field translateX: none"
      reduced="errorMotion already collapses to {} — message appears in place, no travel. Border colour may stay; it moves no pixels."
      phases={[
        { label: "error in", fromMs: ERROR_MS, toMs: ERROR_MS + ENTER_MS, tone: "rose" },
        { label: "shake (rejected)", fromMs: ERROR_MS, toMs: ERROR_MS + SHAKE_MS, tone: "amber" },
        { label: "shown", fromMs: ERROR_MS + ENTER_MS, toMs: EXIT_AT_MS, tone: "muted" },
        { label: "resolved", fromMs: EXIT_AT_MS, toMs: RESET_MS, tone: "cyan" },
      ]}
      elapsedMs={framesToMs(local, fps)}
      totalMs={framesToMs(PERIOD, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {/* ── shipped ─────────────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            fontFamily: MONO_FONT,
            fontSize: 10.5 * unit,
            letterSpacing: 0.12 * 10.5 * unit,
            textTransform: "uppercase",
            color: BRAND.primary,
          }}
        >
          shipped · translateX: none
        </div>
        {renderField(0, 0)}

        {/* ── rejected ────────────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: colW + gap,
            top: 0,
            fontFamily: MONO_FONT,
            fontSize: 10.5 * unit,
            letterSpacing: 0.12 * 10.5 * unit,
            textTransform: "uppercase",
            color: BRAND.warning,
          }}
        >
          rejected · shake ±6px
        </div>
        {renderField(colW + gap, shakeX)}

        {/* The strike-through band that says this column is a counter-example. */}
        <div
          style={{
            position: "absolute",
            left: colW + gap - 12 * unit,
            top: fieldTop - 34 * unit,
            width: colW + 24 * unit,
            height: fieldH + 74 * unit,
            borderRadius: RADIUS.lg * unit,
            border: `${1 * unit}px dashed ${rose(0.4)}`,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 0,
            top: fieldTop + fieldH + 54 * unit,
            width: stageW,
            fontFamily: MONO_FONT,
            fontSize: 11 * unit,
            lineHeight: 1.8,
            color: BRAND.mutedForeground,
          }}
        >
          {`opacity ${shown.toFixed(3)} · translateY ${messageY.toFixed(2)}px · translateX ${shakeX.toFixed(2)}px (right only)`}
          <br />
          validateField runs on keydown — the error is usually withdrawn by the
          next character. A shake would punish the typing that fixes it.
        </div>
      </div>
    </SpecStage>
  );
};
