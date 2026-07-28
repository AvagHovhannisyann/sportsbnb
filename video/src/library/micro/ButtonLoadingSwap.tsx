/**
 * ButtonLoadingSwap — a button entering its pending state.
 * Spec for MOTION-DESIGN-CASES case 94 ("A button entering its pending state
 * changes two things at two speeds"), which is the defect this composition
 * exists to show the fix for.
 *
 * WHAT IS SPECIFIED
 *   Today the base class carries `transition-all duration-200` and
 *   `disabled:opacity-50`, so when `isLoading` flips the opacity interpolates
 *   over 200ms while the label — a different string with a different intrinsic
 *   width — snaps in one frame. One state change rendered as two events.
 *
 *   The fix, and what this composition draws: both labels live in the same
 *   grid cell (`grid-area: 1/1`), the button carries a `min-width` measured
 *   from the wider of the two, and the swap is a crossfade. Nothing reflows,
 *   the button stays the same box, and the dimming lands with the labels
 *   rather than 80ms after them.
 *
 * CSS EQUIVALENT
 *   .btn            { min-width: 11.5rem;
 *                     transition: opacity 120ms cubic-bezier(0.16,1,0.3,1); }
 *   .btn[data-pending] { opacity: 0.5; }
 *   .btn > .label   { grid-area: 1/1; transition: opacity 90ms linear; }
 *   .btn[data-pending] .label--rest    { opacity: 0; }
 *   .btn[data-pending] .label--pending { opacity: 1; transition-delay: 60ms; }
 *   .btn .spinner   { animation: spin 1s linear infinite; }
 *   framer-motion: two children in one grid cell with
 *                  animate={{ opacity }} transition={{ duration: 0.09,
 *                  ease: "linear", delay: pending ? 0.06 : 0 }}
 *   Total settle 150ms = --dur-fast.
 *
 * REDUCED MOTION
 *   Crossfade goes to `transition: none` and the labels swap instantly. The
 *   `min-width` stays — it is layout, not motion, and it is the part that
 *   stops the jump. The spinner stops too: `.animate-spin { animation: none }`
 *   scoped to buttons, replaced by a static glyph at 60% opacity, which this
 *   composition implements literally via `usePrefersReducedMotion`.
 *
 * NOT A LOOP
 *   One-way. Reduced motion freezes at the LAST frame — the pending state.
 *   The spinner rotation is itself seamless (0° ≡ 360° every 1000ms), but the
 *   piece as a whole plays once, so it is registered `seamless: false`.
 */

import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_LINEAR,
  EASE_OUT_EXPO,
  MONO_FONT,
  RADIUS,
  SANS_FONT,
  courtGreen,
  framesToMs,
  mix,
  progress,
  spinDegrees,
  useSpecFrame,
  usePrefersReducedMotion,
} from "./microKit";
import { SpecStage, StateChip } from "./specStage";

const CANVAS_W = 960;
/** 2200ms at 60fps — the 350ms transition plus enough turns to read it. */
const DURATION = 132;

const PRESS_MS = 200;

export type ButtonLoadingSwapProps = {
  /** Resting label. */
  label: string;
  /** Pending label. The wider of the two sets the button's `min-width`. */
  pendingLabel: string;
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const buttonLoadingSwapDefaultProps: ButtonLoadingSwapProps = {
  label: "Save preferences",
  pendingLabel: "Saving…",
  speed: 1,
};

export const ButtonLoadingSwap: FC<ButtonLoadingSwapProps> = ({
  label,
  pendingLabel,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const reduced = usePrefersReducedMotion();
  const frame = useSpecFrame(rawFrame, speed, (durationInFrames - 1) * speed);
  const unit = width / CANVAS_W;

  /** Resting label leaves over 90ms, linear, with no delay. */
  const restOut = progress(frame, fps, PRESS_MS, 90, EASE_LINEAR);
  /** Pending label arrives over 90ms, linear, 60ms later. */
  const pendingIn = progress(frame, fps, PRESS_MS + 60, 90, EASE_LINEAR);
  /** Dimming, retuned from 200ms to 120ms so it lands with them. */
  const dim = progress(frame, fps, PRESS_MS, 120, EASE_OUT_EXPO);

  /**
   * Tailwind's `animate-spin`: 1s linear infinite. Case 94 says explicitly not
   * to re-time it — it is the one thing in the app that already reads as
   * "still going". Under reduced motion it stops dead at 0° and 60% opacity.
   */
  const spin = reduced ? 0 : spinDegrees(frame, fps, 1000);

  const stageW = 760 * unit;
  const stageH = 220 * unit;
  /** The measured `min-width`: the wider label plus its gap and padding. */
  const btnW = 196 * unit;
  const btnH = 48 * unit;
  const btnLeft = (stageW - btnW) / 2;
  const btnTop = (stageH - btnH) / 2 - 12 * unit;

  return (
    <SpecStage
      caseRef="Case 94"
      title="Button — loading"
      css="min-width locked · labels crossfade 90ms linear, incoming delayed 60ms · opacity → 0.5 over 120ms · spinner 1s linear infinite"
      reduced="Labels swap instantly, min-width stays, spinner stops at 0° and 60% opacity."
      phases={[
        { label: "rest out", fromMs: PRESS_MS, toMs: PRESS_MS + 90, tone: "muted" },
        { label: "pending in", fromMs: PRESS_MS + 60, toMs: PRESS_MS + 150, tone: "cyan" },
        { label: "dim", fromMs: PRESS_MS, toMs: PRESS_MS + 120 },
        { label: "spinner (loops)", fromMs: PRESS_MS + 60, toMs: 2200, tone: "amber" },
      ]}
      elapsedMs={framesToMs(frame, fps)}
      totalMs={framesToMs(DURATION, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {/* The min-width guide. The point of the case is that this box never
            changes size, so the box is drawn. */}
        <div
          style={{
            position: "absolute",
            left: btnLeft - 8 * unit,
            top: btnTop - 8 * unit,
            width: btnW + 16 * unit,
            height: btnH + 16 * unit,
            borderRadius: (RADIUS.lg + 4) * unit,
            border: `${1 * unit}px dashed ${courtGreen(0.25)}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: btnLeft - 8 * unit,
            top: btnTop - 26 * unit,
            fontFamily: MONO_FONT,
            fontSize: 10 * unit,
            color: courtGreen(0.7),
          }}
        >
          min-width: 196px — measured once, never animated
        </div>

        <div
          style={{
            position: "absolute",
            left: btnLeft,
            top: btnTop,
            width: btnW,
            height: btnH,
            borderRadius: RADIUS.lg * unit,
            backgroundColor: BRAND.primary,
            opacity: mix(1, 0.5, dim),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: SANS_FONT,
            fontSize: 15 * unit,
            fontWeight: 600,
            color: BRAND.primaryForeground,
          }}
        >
          {/* Both labels, one cell. Absolute rather than CSS grid because the
              spec is "same box, stacked", and absolute states that outright. */}
          <span
            style={{
              position: "absolute",
              opacity: 1 - restOut,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
          <span
            style={{
              position: "absolute",
              opacity: pendingIn,
              display: "flex",
              alignItems: "center",
              gap: 8 * unit,
              whiteSpace: "nowrap",
            }}
          >
            <svg
              width={16 * unit}
              height={16 * unit}
              viewBox="0 0 24 24"
              fill="none"
              style={{
                transform: `rotate(${spin}deg)`,
                opacity: reduced ? 0.6 : 1,
              }}
            >
              {/* lucide `Loader2`: a 3/4 arc with a round cap. */}
              <path
                d="M21 12 a9 9 0 1 1 -6.2 -8.56"
                stroke={BRAND.primaryForeground}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            </svg>
            {pendingLabel}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: btnTop + btnH + 34 * unit,
            width: stageW,
            textAlign: "center",
            fontFamily: MONO_FONT,
            fontSize: 11.5 * unit,
            color: BRAND.mutedForeground,
          }}
        >
          {`rest ${(1 - restOut).toFixed(2)} · pending ${pendingIn.toFixed(2)} · button ${mix(1, 0.5, dim).toFixed(2)}`}
        </div>

        <div
          style={{
            position: "absolute",
            left: btnLeft + btnW / 2 - 52 * unit,
            top: btnTop + btnH + 58 * unit,
            display: "flex",
            gap: 8 * unit,
          }}
        >
          <StateChip unit={unit} label="idle" active={1 - restOut} tone="muted" />
          <StateChip unit={unit} label="pending" active={pendingIn} />
        </div>
      </div>
    </SpecStage>
  );
};
