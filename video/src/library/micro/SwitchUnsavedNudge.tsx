/**
 * SwitchUnsavedNudge — a switch that moved, and a record that has not.
 * Spec for the second half of MOTION-DESIGN-CASES case 96, which is the part
 * that is not built. `/profile` → `src/features/profile/NotificationsTab.tsx:70-88`.
 *
 * WHAT IS SPECIFIED
 *   `onCheckedChange` only calls `setNotifications`; nothing persists until the
 *   Save button below is pressed. So four switches can sit in a state the
 *   server has never heard of, looking exactly like four saved switches. The
 *   switch itself is telling the truth about the *control* and must not change
 *   — the button is what has to say the *record* is behind.
 *
 *   On the first change the Save button rises `translateY(6px) → 0` with
 *   `opacity 0.55 → 1` over 250ms (`--dur-base`) and its label becomes
 *   "Save 1 change". Every subsequent toggle re-runs a 1px settle on it
 *   (`translateY(-1px) → 0`, 120ms) and increments the count. On a successful
 *   save the button returns to `opacity 0.55` over 250ms as the toast arrives.
 *
 * CSS EQUIVALENT
 *   .save        { opacity: .55; transform: translateY(6px);
 *                  transition: opacity 250ms cubic-bezier(0.16,1,0.3,1),
 *                              transform 250ms cubic-bezier(0.16,1,0.3,1); }
 *   .save[data-dirty] { opacity: 1; transform: none; }
 *   .save[data-bump]  { animation: bump 120ms cubic-bezier(0.16,1,0.3,1); }
 *   @keyframes bump { from { transform: translateY(-1px) } to { transform: none } }
 *   framer-motion: animate={{ opacity: dirty ? 1 : 0.55, y: dirty ? 0 : 6 }}
 *                  transition={{ duration: 0.25, ease: [0.16,1,0.3,1] }}
 *
 * REDUCED MOTION
 *   The opacity change survives — 0.55 → 1 is information, not decoration. The
 *   `translateY` and the per-toggle 1px settle both go to `transform: none`.
 *   The changed-count in the label ("Save 2 changes") is the non-visual carrier
 *   and works regardless. Do not implement the cue by mounting a bar under the
 *   list: the card sits in a tabbed panel and a mount reflows the tab body on
 *   every toggle.
 *
 * NOT A LOOP
 *   One-way. Reduced motion freezes at the LAST frame, where two switches are
 *   on and the button reads "Save 2 changes" — the state the piece is about.
 */

import type { FC } from "react";
import { interpolateColors, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_OUT_EXPO,
  EASE_STANDARD,
  MONO_FONT,
  RADIUS,
  SANS_FONT,
  framesToMs,
  hairline,
  mix,
  progress,
  shadow,
  useSpecFrame,
} from "./microKit";
import { SpecStage } from "./specStage";

const CANVAS_W = 960;
/** 2500ms at 60fps. */
const DURATION = 150;

const TOGGLE_A_MS = 300;
const BUTTON_MS = 450;
const TOGGLE_B_MS = 1400;

export type SwitchUnsavedNudgeProps = {
  /** The setting rows, top to bottom. The first two are the ones toggled. */
  rows: readonly string[];
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const switchUnsavedNudgeDefaultProps: SwitchUnsavedNudgeProps = {
  rows: ["Booking reminders", "Match invitations", "Weekly digest"],
  speed: 1,
};

export const SwitchUnsavedNudge: FC<SwitchUnsavedNudgeProps> = ({
  rows,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, (durationInFrames - 1) * speed);
  const unit = width / CANVAS_W;

  /** The two thumbs. 150ms each, unchanged — the switch is not the fix. */
  const switchA = progress(frame, fps, TOGGLE_A_MS, 150, EASE_STANDARD);
  const switchB = progress(frame, fps, TOGGLE_B_MS, 150, EASE_STANDARD);

  /** The button's entrance, once the form is dirty at all. */
  const dirty = progress(frame, fps, BUTTON_MS, 250, EASE_OUT_EXPO);
  /** The per-toggle settle: −1px, 120ms, on the second change only. */
  const bump = progress(frame, fps, TOGGLE_B_MS + 60, 120, EASE_OUT_EXPO);
  const bumpY = frame >= (TOGGLE_B_MS + 60) * (fps / 1000) ? -1 * (1 - bump) : 0;

  const changes = (switchA > 0 ? 1 : 0) + (switchB > 0 ? 1 : 0);

  const stageW = 620 * unit;
  const stageH = 240 * unit;
  const rowH = 40 * unit;

  const renderSwitch = (on: number) => (
    <div
      style={{
        width: 44 * unit,
        height: 24 * unit,
        borderRadius: 999,
        boxSizing: "border-box",
        border: `${2 * unit}px solid transparent`,
        backgroundColor: interpolateColors(on, [0, 1], [BRAND.input, BRAND.primary]),
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 20 * unit,
          height: 20 * unit,
          borderRadius: 999,
          backgroundColor: BRAND.background,
          boxShadow: shadow(unit, "md"),
          transform: `translateX(${20 * on * unit}px)`,
        }}
      />
    </div>
  );

  return (
    <SpecStage
      caseRef="Case 96"
      title="Switch — unsaved changes"
      css="save button: opacity .55→1 + translateY(6px)→0 over 250ms var(--ease-out-expo) · per-toggle settle translateY(-1px)→0 120ms · thumb unchanged at 150ms"
      reduced="Opacity 0.55 → 1 survives (it is information). translateY and the 1px settle both become transform: none."
      phases={[
        { label: "toggle 1", fromMs: TOGGLE_A_MS, toMs: TOGGLE_A_MS + 150, tone: "cyan" },
        { label: "button rise", fromMs: BUTTON_MS, toMs: BUTTON_MS + 250 },
        { label: "toggle 2", fromMs: TOGGLE_B_MS, toMs: TOGGLE_B_MS + 150, tone: "cyan" },
        { label: "settle", fromMs: TOGGLE_B_MS + 60, toMs: TOGGLE_B_MS + 180, tone: "amber" },
      ]}
      elapsedMs={framesToMs(frame, fps)}
      totalMs={framesToMs(DURATION, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {rows.map((row, i) => (
          <div
            key={row}
            style={{
              position: "absolute",
              left: 0,
              top: i * (rowH + 8 * unit),
              width: stageW,
              height: rowH,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: SANS_FONT,
              fontSize: 14.5 * unit,
              color: BRAND.foreground,
            }}
          >
            <span>{row}</span>
            {renderSwitch(i === 0 ? switchA : i === 1 ? switchB : 0)}
          </div>
        ))}

        {/* `<Separator />`. Static, and the reason the button is easy to miss. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 3 * (rowH + 8 * unit) + 12 * unit,
            width: stageW,
            height: 1 * unit,
            backgroundColor: hairline(1),
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 0,
            top: 3 * (rowH + 8 * unit) + 32 * unit,
            height: 44 * unit,
            paddingLeft: 20 * unit,
            paddingRight: 20 * unit,
            borderRadius: RADIUS.lg * unit,
            backgroundColor: BRAND.primary,
            color: BRAND.primaryForeground,
            fontFamily: SANS_FONT,
            fontSize: 14.5 * unit,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            opacity: mix(0.55, 1, dirty),
            transform: `translateY(${(mix(6, 0, dirty) + bumpY) * unit}px)`,
          }}
        >
          {changes === 0
            ? "Save preferences"
            : `Save ${changes} change${changes === 1 ? "" : "s"}`}
        </div>

        <div
          style={{
            position: "absolute",
            left: 190 * unit,
            top: 3 * (rowH + 8 * unit) + 44 * unit,
            fontFamily: MONO_FONT,
            fontSize: 11.5 * unit,
            color: BRAND.mutedForeground,
          }}
        >
          {`opacity ${mix(0.55, 1, dirty).toFixed(2)} · y ${(mix(6, 0, dirty) + bumpY).toFixed(2)}px`}
        </div>
      </div>
    </SpecStage>
  );
};
