/**
 * BadgeCountUp — a number that arrived from the network, and says so.
 * Spec for MOTION-DESIGN-CASES case 13. The conditional glass pill at
 * `src/pages/HomePage.tsx:326-346`, fed by the `count: "exact", head: true`
 * query in the effect at `HomePage.tsx:118-126`.
 *
 * WHAT IS SPECIFIED
 *   The pill's landing already exists — a `motion.div` on
 *   `{ duration: FEEDBACK, ease: EASE }` (`:334-344`), with the source comment
 *   at `:328` explaining that the count arrives long after the hero. What is
 *   missing is the numeral.
 *     pill    — `opacity 0 → 1` and `translateY(-6px → 0)` over 320ms
 *       `--ease-out-expo`.
 *     numeral — runs `0 → venueCount`, starting at **+120ms** (after the pill
 *       has committed to being there) and taking 900ms, eased
 *       `cubic-bezier(.16,1,.3,1)` so it decelerates into the final value
 *       instead of stopping dead on it.
 *     tick cap — ~30 updates regardless of the target, so the digits read
 *       rather than blur. 900ms / 30 = one change every 30ms, which is the
 *       fastest a number can change and still be a number.
 *     the last frame assigns the target itself, rather than a rounded
 *       interpolation. A count-up that finishes on 47 when the answer is 48 is
 *       worse than no count-up.
 *
 *   This is the only genuinely live figure above the fold, and the animation is
 *   the entire argument for it: it is the difference between a marketing number
 *   and a fetched one.
 *
 * CSS EQUIVALENT
 *   The pill is CSS; the numeral is not.
 *     .count-pill { animation: pill-in 320ms cubic-bezier(0.16,1,0.3,1) both; }
 *     @keyframes pill-in { from { opacity: 0; transform: translateY(-6px); } }
 *   framer-motion / JS for the numeral — reuse the `useCountUp` helper already
 *   written for the owner dashboard (`src/pages/owner/OwnerOverviewPage.tsx:93-130`)
 *   rather than adding a second counting mechanism: it already assigns `target`
 *   on the last frame, tweens from whatever is currently displayed, and gates
 *   on the data having arrived. `animate()` on a `MotionValue` is fewer lines
 *   and adds a second animation runtime for one number.
 *
 * REDUCED MOTION
 *   Under `prefersReduced`: render the pill at final opacity and position, and
 *   print `venueCount` directly. No count-up, no fade. `useCountUp` already
 *   does exactly this. The rule behind it is worth stating in general — a
 *   number is information, and information must never be mid-animation when
 *   someone reads it. Every other spec in this folder can afford to degrade to
 *   "the same thing, instantly"; this one has to, because a partial value is
 *   not a partial animation, it is a wrong answer.
 *   Freezes at the LAST frame, which is the settled figure.
 *
 * PERF
 *   `transform` + `opacity` for the pill. The numeral is a text-content
 *   mutation ~30 times over 900ms — genuinely a layout + paint per tick — but
 *   the span already carries `font-mono … tabular-nums`, so every digit has the
 *   same advance width and the box never reflows its neighbours. The pill is
 *   `hidden … sm:flex`, so none of this runs below 640px.
 *
 * NOT A LOOP
 *   One-way. It is a landing: the pill arrives, the number resolves, and that
 *   is the end of the event. There is no exit to close a cycle with, and
 *   inventing one would be inventing a spec. Reduced motion freezes on the last
 *   frame — the settled figure — because that is the state carrying the
 *   message. 2000ms at 60fps.
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
  numeralStyle,
  progress,
  useSpecFrame,
} from "./microKit";
import { SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 2000ms at 60fps. */
const DURATION = 120;

const PILL_MS = 200;
const PILL_DUR_MS = 320;
/** +120ms after the pill starts, per the case. */
const COUNT_MS = PILL_MS + 120;
const COUNT_DUR_MS = 900;
/** ~30 updates, whatever the target. */
const TICKS = 30;

export type BadgeCountUpProps = {
  /** The figure the query returns. */
  target: number;
  label: string;
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const badgeCountUpDefaultProps: BadgeCountUpProps = {
  target: 248,
  label: "venues live",
  speed: 1,
};

export const BadgeCountUp: FC<BadgeCountUpProps> = ({
  target,
  label,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  // One-way: reduced motion holds the settled figure, which is the message.
  const frame = useSpecFrame(rawFrame, speed, (durationInFrames - 1) * speed);
  const unit = width / CANVAS_W;

  const pill = progress(frame, fps, PILL_MS, PILL_DUR_MS, EASE_OUT_EXPO);
  const p = progress(frame, fps, COUNT_MS, COUNT_DUR_MS, EASE_OUT_EXPO);

  /** Quantised to TICKS steps; the last frame assigns the target itself. */
  const shown =
    p >= 1 ? target : Math.round((target * Math.floor(p * TICKS)) / TICKS);

  const stageW = 520 * unit;
  const stageH = 220 * unit;
  const pillH = 52 * unit;

  return (
    <SpecStage
      caseRef="Case 13"
      title="Badge — a number that was fetched"
      css="pill opacity 0→1 + translateY(-6px→0) 320ms var(--ease-out-expo) · numeral 0 → N over 900ms same curve, delay +120ms, capped at ~30 ticks, target assigned on the final frame"
      reduced="Pill at final opacity and position, venueCount printed directly. A number must never be mid-animation when it is read."
      phases={[
        { label: "pill in", fromMs: PILL_MS, toMs: PILL_MS + PILL_DUR_MS },
        { label: "count up", fromMs: COUNT_MS, toMs: COUNT_MS + COUNT_DUR_MS, tone: "cyan" },
        { label: "settled", fromMs: COUNT_MS + COUNT_DUR_MS, toMs: 2000, tone: "muted" },
      ]}
      elapsedMs={framesToMs(frame, fps)}
      totalMs={framesToMs(DURATION, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 60 * unit,
            height: pillH,
            display: "inline-flex",
            alignItems: "center",
            gap: 12 * unit,
            paddingLeft: 18 * unit,
            paddingRight: 22 * unit,
            borderRadius: 999,
            backgroundColor: courtGreen(0.08),
            border: `${1 * unit}px solid ${courtGreen(0.28)}`,
            opacity: pill,
            transform: `translateY(${-6 * (1 - pill) * unit}px)`,
          }}
        >
          <span
            style={{
              width: 9 * unit,
              height: 9 * unit,
              borderRadius: 999,
              backgroundColor: BRAND.primary,
              boxShadow: `0 0 ${8 * unit}px ${courtGreen(0.7)}`,
            }}
          />
          <span style={numeralStyle(unit, 26)}>{shown}</span>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 13 * unit,
              color: BRAND.foregroundSoft,
            }}
          >
            {label}
          </span>
        </div>

        {/* The tick lattice, drawn so the 30-update cap is a measurement. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 60 * unit + pillH + 30 * unit,
            width: stageW,
            height: 22 * unit,
            display: "flex",
            gap: 2 * unit,
          }}
        >
          {Array.from({ length: TICKS }, (_, i) => (
            <div
              key={`tick-${String(i)}`}
              style={{
                flex: 1,
                borderRadius: 1 * unit,
                backgroundColor:
                  p * TICKS > i ? BRAND.primary : BRAND.surface3,
                opacity: p * TICKS > i ? 1 : 0.8,
              }}
            />
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: 60 * unit + pillH + 62 * unit,
            width: stageW,
            fontFamily: MONO_FONT,
            fontSize: 11 * unit,
            lineHeight: 1.8,
            color: BRAND.mutedForeground,
          }}
        >
          {`tick ${Math.min(TICKS, Math.floor(p * TICKS))} / ${TICKS} · value ${shown} → ${target}`}
          <br />
          {`tabular-nums — every digit the same advance width, so the box never reflows`}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: 20 * unit,
            fontFamily: MONO_FONT,
            fontSize: 9.5 * unit,
            letterSpacing: 0.14 * 9.5 * unit,
            textTransform: "uppercase",
            color: BRAND.mutedForeground,
            border: `${1 * unit}px solid ${BRAND.border}`,
            borderRadius: RADIUS.sm * unit,
            padding: `${3 * unit}px ${8 * unit}px`,
            display: "inline-block",
          }}
        >
          supabase count · head: true
        </div>
      </div>
    </SpecStage>
  );
};
