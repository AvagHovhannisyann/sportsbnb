/**
 * SignupStepDots — the segmented step indicator above the onboarding card on
 * /onboarding/player and /onboarding/owner: done steps tick, the current one
 * holds a soft ring, the rest stay hairline.
 * Event-driven; plays once as a step completes, then holds.
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
  MONO_FONT,
  SANS_FONT,
  courtGreen,
  hairline,
  ink,
  interpolateSafe,
  muted,
  useMotionFrame,
} from "./authKit";

const CANVAS_W = 720;

export type SignupStepDotsProps = {
  /** One label per step. Length defines how many dots are drawn. */
  labels: string[];
  /** 1-based index of the step the user is now on. */
  currentStep: number;
  /** Frames between one dot resolving and the next. */
  staggerFrames: number;
  /** Draw the label row under the dots. */
  showLabels: boolean;
};

export const signupStepDotsDefaultProps: SignupStepDotsProps = {
  labels: ["Basics", "Location", "Sports", "Photo"],
  currentStep: 3,
  staggerFrames: 5,
  showLabels: true,
};

/** The tick, as a stroked path so it can be drawn rather than popped in. */
const TICK_PATH = "M4.5 9.5 L8 13 L15.5 5.5";
const TICK_LEN = 17.5;

export const SignupStepDots: FC<SignupStepDotsProps> = ({
  labels,
  currentStep,
  staggerFrames,
  showLabels,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the resolved state, which is the message.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const count = Math.max(1, labels.length);

  const gap = 14 * unit;
  const dot = 34 * unit;
  const railW = (width - 96 * unit - gap * (count - 1)) / count;
  const startX = 48 * unit;
  const rowY = height * 0.42;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 130% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 72%)`,
        }}
      />

      <Sequence name="Steps" layout="none">
        {labels.map((label, i) => {
          const stepNo = i + 1;
          const done = stepNo < currentStep;
          const active = stepNo === currentStep;
          // Stagger: each dot resolves after the one to its left.
          const delay = i * staggerFrames;

          const settle = spring({
            frame,
            fps,
            delay,
            config: { damping: 22, mass: 0.8, stiffness: 150 },
            durationInFrames: 20,
          });

          // Only the tick overshoots — a confirmation is the one thing on an
          // onboarding header that has earned it.
          const tickIn = done
            ? spring({
                frame,
                fps,
                delay: delay + 3,
                config: { damping: 13, mass: 0.6, stiffness: 180 },
                durationInFrames: 18,
              })
            : 0;

          const railFill = done ? 1 : active ? settle : 0;
          const x = startX + i * (railW + gap);

          return (
            <div key={label} style={{ position: "absolute", left: x, top: 0 }}>
              {/* Rail. The segment, not a dot — this is what the app draws. */}
              <div
                style={{
                  position: "absolute",
                  top: rowY - 3 * unit,
                  width: railW,
                  height: 4 * unit,
                  borderRadius: 999,
                  backgroundColor: BRAND.input,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: railW * railFill,
                    borderRadius: 999,
                    backgroundColor: done ? BRAND.primary : courtGreen(0.75),
                  }}
                />
              </div>

              {/* Marker. */}
              <div
                style={{
                  position: "absolute",
                  left: railW / 2 - dot / 2,
                  top: rowY + 16 * unit,
                  width: dot,
                  height: dot,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done
                    ? courtGreen(0.16)
                    : active
                      ? BRAND.surface2
                      : BRAND.surface1,
                  border: `${1.5 * unit}px solid ${
                    done
                      ? courtGreen(0.55)
                      : active
                        ? courtGreen(0.5 + 0.4 * settle)
                        : hairline(1)
                  }`,
                  boxShadow: active
                    ? `0 0 0 ${4 * unit * settle}px ${courtGreen(0.16 * settle)}`
                    : "none",
                  transform: `scale(${done ? 1 : active ? 1 + 0.04 * settle : 1})`,
                }}
              >
                {done ? (
                  <svg
                    width={dot * 0.58}
                    height={dot * 0.58}
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d={TICK_PATH}
                      stroke={BRAND.primary}
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={TICK_LEN}
                      // Drawn on, not popped: 0 length → full length.
                      strokeDashoffset={TICK_LEN * (1 - tickIn)}
                    />
                  </svg>
                ) : (
                  <span
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: 13 * unit,
                      fontVariantNumeric: "tabular-nums",
                      color: active ? BRAND.foreground : muted(0.7),
                    }}
                  >
                    {stepNo}
                  </span>
                )}
              </div>

              {showLabels ? (
                <div
                  style={{
                    position: "absolute",
                    top: rowY + 16 * unit + dot + 10 * unit,
                    width: railW,
                    textAlign: "center",
                    fontFamily: SANS_FONT,
                    fontSize: 12.5 * unit,
                    fontWeight: active ? 600 : 400,
                    color: active
                      ? BRAND.foreground
                      : done
                        ? BRAND.foregroundSoft
                        : muted(0.62),
                    opacity: interpolateSafe(
                      frame,
                      [delay + 2, delay + 14],
                      [0.35, 1],
                    ),
                    textShadow: active
                      ? `0 ${2 * unit}px ${8 * unit}px ${ink(0.6)}`
                      : "none",
                  }}
                >
                  {label}
                </div>
              ) : null}
            </div>
          );
        })}
      </Sequence>
    </AbsoluteFill>
  );
};
