/**
 * OnboardingChecklistProgress — the "finish setting up" card on the player and
 * owner dashboards, listing what is done and what is still open.
 * One-way: it plays when the card mounts, counts what is complete, and stops.
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  SANS_FONT,
  cardSurface,
  courtGreen,
  hairline,
  interpolateSafe,
  muted,
  useMotionFrame,
} from "./authKit";

const CANVAS_W = 720;

export type ChecklistTask = {
  label: string;
  /** Right-hand hint: what the step costs, or what it unlocks. */
  meta: string;
  done: boolean;
};

export type OnboardingChecklistProgressProps = {
  /** Card heading. */
  title: string;
  /** The tasks, in the order the dashboard lists them. */
  tasks: ChecklistTask[];
  /** Frames between one row arriving and the next. */
  staggerFrames: number;
  /** Show the "n of m" counter and the track under the heading. */
  showCounter: boolean;
};

export const onboardingChecklistProgressDefaultProps: OnboardingChecklistProgressProps =
  {
    title: "Finish setting up",
    tasks: [
      { label: "Confirm your email", meta: "Done", done: true },
      { label: "Pick your sports", meta: "Done", done: true },
      { label: "Add a profile photo", meta: "30 seconds", done: true },
      { label: "Set your home district", meta: "Improves your feed", done: false },
      { label: "Join or start a team", meta: "Optional", done: false },
    ],
    staggerFrames: 7,
    showCounter: true,
  };

const TICK_PATH = "M4.5 9.6 L8 13.1 L15.6 5.5";
const TICK_LEN = 17.5;

export const OnboardingChecklistProgress: FC<
  OnboardingChecklistProgressProps
> = ({ title, tasks, staggerFrames, showCounter }) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the counted, settled list.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const doneCount = tasks.filter((task) => task.done).length;
  const total = Math.max(1, tasks.length);

  /** The track fills as the rows resolve, not before them. */
  const lastRowAt = (total - 1) * staggerFrames + 16;
  const fill = interpolateSafe(frame, [8, lastRowAt], [0, doneCount / total]);

  /** Counter rolls with the track, so the two never disagree. */
  const shownCount = Math.round(fill * total);

  const cardX = 36 * unit;
  const cardW = width - cardX * 2;
  const cardY = 28 * unit;
  const cardH = height - cardY * 2;

  const listTop = cardY + (showCounter ? 118 : 76) * unit;
  const rowH = Math.min(58 * unit, (cardH - (listTop - cardY) - 26 * unit) / total);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(100% 90% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 76%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: cardX,
          top: cardY,
          width: cardW,
          height: cardH,
          ...cardSurface(unit, 22),
        }}
      />

      <Sequence name="Header" layout="none">
        <div
          style={{
            position: "absolute",
            left: cardX + 26 * unit,
            top: cardY + 26 * unit,
            fontFamily: DISPLAY_FONT,
            fontSize: 22 * unit,
            fontWeight: 600,
            letterSpacing: -0.025 * 22 * unit,
            color: BRAND.foreground,
            opacity: interpolateSafe(frame, [0, 12], [0, 1]),
          }}
        >
          {title}
        </div>

        {showCounter ? (
          <>
            <div
              style={{
                position: "absolute",
                right: cardX + 26 * unit,
                top: cardY + 30 * unit,
                fontFamily: MONO_FONT,
                fontSize: 14 * unit,
                fontVariantNumeric: "tabular-nums",
                color: shownCount === total ? BRAND.primary : muted(0.85),
                opacity: interpolateSafe(frame, [4, 16], [0, 1]),
              }}
            >
              {`${shownCount} / ${total}`}
            </div>

            <div
              style={{
                position: "absolute",
                left: cardX + 26 * unit,
                top: cardY + 72 * unit,
                width: cardW - 52 * unit,
                height: 5 * unit,
                borderRadius: 999,
                backgroundColor: BRAND.input,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: (cardW - 52 * unit) * fill,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${courtGreen(0.5)} 0%, ${BRAND.primary} 100%)`,
                }}
              />
            </div>
          </>
        ) : null}
      </Sequence>

      <Sequence name="Tasks" layout="none">
        {tasks.map((task, i) => {
          const delay = 6 + i * staggerFrames;

          const arrive = interpolateSafe(frame, [delay, delay + 12], [0, 1]);
          const arriveY = interpolateSafe(
            frame,
            [delay, delay + 12],
            [10 * unit, 0],
            EASE_OUT_EXPO,
          );

          /** Only completed rows get the overshoot. */
          const tick = task.done
            ? spring({
                frame,
                fps,
                delay: delay + 4,
                config: { damping: 13, mass: 0.6, stiffness: 180 },
                durationInFrames: 16,
              })
            : 0;
          const draw = task.done
            ? interpolateSafe(frame, [delay + 6, delay + 17], [0, 1], EASE_OUT_EXPO)
            : 0;

          const box = 26 * unit;

          return (
            <div
              key={task.label}
              style={{
                position: "absolute",
                left: cardX + 26 * unit,
                right: cardX + 26 * unit,
                top: listTop + i * rowH,
                height: rowH,
                display: "flex",
                alignItems: "center",
                opacity: arrive,
                transform: `translateY(${arriveY}px)`,
                borderTop:
                  i === 0 ? "none" : `${1 * unit}px solid ${hairline(0.7)}`,
              }}
            >
              <div
                style={{
                  width: box,
                  height: box,
                  borderRadius: 8 * unit,
                  backgroundColor: task.done ? courtGreen(0.14) : BRAND.surface1,
                  border: `${1.4 * unit}px solid ${task.done ? courtGreen(0.45) : hairline(1)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${1 + 0.36 * tick * (1 - tick)})`,
                }}
              >
                {task.done ? (
                  <svg width={box * 0.66} height={box * 0.66} viewBox="0 0 20 20" fill="none">
                    <path
                      d={TICK_PATH}
                      stroke={BRAND.primary}
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={TICK_LEN}
                      strokeDashoffset={TICK_LEN * (1 - draw)}
                    />
                  </svg>
                ) : null}
              </div>

              <span
                style={{
                  marginLeft: 14 * unit,
                  flex: 1,
                  fontFamily: SANS_FONT,
                  fontSize: 15 * unit,
                  fontWeight: task.done ? 400 : 500,
                  color: task.done ? BRAND.foregroundSoft : BRAND.foreground,
                }}
              >
                {task.label}
              </span>

              <span
                style={{
                  fontFamily: SANS_FONT,
                  fontSize: 12.5 * unit,
                  color: task.done ? courtGreen(0.75) : muted(0.7),
                }}
              >
                {task.meta}
              </span>
            </div>
          );
        })}
      </Sequence>
    </AbsoluteFill>
  );
};
