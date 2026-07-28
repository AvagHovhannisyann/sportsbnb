/**
 * PasswordRequirementChecklist — the five-item requirement list under the
 * password field on /signup and /reset-password, each row flipping from unmet
 * to met.
 * The five checks are exactly the ones `passwordStrength` computes in
 * `src/pages/SignupPage.tsx`: length, lowercase, uppercase, number, special.
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
  SANS_FONT,
  courtGreen,
  hairline,
  interpolateSafe,
  muted,
  useMotionFrame,
} from "./authKit";

const CANVAS_W = 720;

export type PasswordRequirement = {
  label: string;
  /** Whether this check ends the composition satisfied. */
  met: boolean;
};

export type PasswordRequirementChecklistProps = {
  /** One row per requirement, in the order the app lists them. */
  requirements: PasswordRequirement[];
  /** Heading above the list. Empty string hides it. */
  title: string;
  /** Frames between one row resolving and the next. */
  staggerFrames: number;
};

export const passwordRequirementChecklistDefaultProps: PasswordRequirementChecklistProps =
  {
    requirements: [
      { label: "At least 8 characters", met: true },
      { label: "One lowercase letter", met: true },
      { label: "One uppercase letter", met: true },
      { label: "One number", met: true },
      { label: "One special character", met: false },
    ],
    title: "Your password needs",
    staggerFrames: 6,
  };

const TICK_PATH = "M4.5 9.6 L8 13.1 L15.6 5.5";
const TICK_LEN = 17.5;

export const PasswordRequirementChecklist: FC<
  PasswordRequirementChecklistProps
> = ({ requirements, title, staggerFrames }) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // One-way: reduced motion holds the resolved list.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const padX = 48 * unit;
  const headerH = title ? 44 * unit : 8 * unit;
  const rowH = Math.min(
    52 * unit,
    (height - headerH - 48 * unit) / Math.max(1, requirements.length),
  );
  const top = 28 * unit + headerH;

  const metCount = requirements.filter((r) => r.met).length;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(100% 110% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 76%)`,
        }}
      />

      {title ? (
        <div
          style={{
            position: "absolute",
            left: padX,
            top: 28 * unit,
            fontFamily: DISPLAY_FONT,
            fontSize: 18 * unit,
            fontWeight: 600,
            letterSpacing: -0.025 * 18 * unit,
            color: BRAND.foreground,
            opacity: interpolateSafe(frame, [0, 10], [0, 1]),
          }}
        >
          {title}
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          right: padX,
          top: 30 * unit,
          fontFamily: SANS_FONT,
          fontSize: 13.5 * unit,
          fontWeight: 500,
          color: metCount === requirements.length ? BRAND.primary : muted(0.8),
          opacity: interpolateSafe(
            frame,
            [requirements.length * staggerFrames, requirements.length * staggerFrames + 12],
            [0, 1],
          ),
        }}
      >
        {`${metCount} of ${requirements.length}`}
      </div>

      <Sequence name="Requirements" layout="none">
        {requirements.map((req, i) => {
          const delay = i * staggerFrames;

          /**
           * The overshoot is the point: a requirement flipping from unmet to
           * met is one of the two places /signup spends its `--ease-spring`.
           * Unmet rows get no spring at all — nothing to celebrate.
           */
          const flip = req.met
            ? spring({
                frame,
                fps,
                delay,
                config: { damping: 12, mass: 0.6, stiffness: 180 },
                durationInFrames: 18,
              })
            : 0;

          const draw = req.met
            ? interpolateSafe(frame, [delay + 2, delay + 13], [0, 1], EASE_OUT_EXPO)
            : 0;

          const rowY = top + i * rowH;
          const box = 24 * unit;

          return (
            <div
              key={req.label}
              style={{
                position: "absolute",
                left: padX,
                right: padX,
                top: rowY,
                height: rowH,
                display: "flex",
                alignItems: "center",
                opacity: interpolateSafe(frame, [delay, delay + 10], [0.55, 1]),
              }}
            >
              <div
                style={{
                  width: box,
                  height: box,
                  borderRadius: 7 * unit,
                  backgroundColor: req.met
                    ? courtGreen(0.13 + 0.07 * flip)
                    : BRAND.surface1,
                  border: `${1.4 * unit}px solid ${req.met ? courtGreen(0.2 + 0.35 * flip) : hairline(1)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  // The overshoot, clamped so the box never grows the row.
                  transform: `scale(${1 + 0.1 * flip * (1 - flip) * 4})`,
                }}
              >
                {req.met ? (
                  <svg width={box * 0.7} height={box * 0.7} viewBox="0 0 20 20" fill="none">
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
                ) : (
                  <div
                    style={{
                      width: 7 * unit,
                      height: 1.6 * unit,
                      borderRadius: 999,
                      backgroundColor: muted(0.5),
                    }}
                  />
                )}
              </div>

              <span
                style={{
                  marginLeft: 13 * unit,
                  fontFamily: SANS_FONT,
                  fontSize: 15 * unit,
                  // The label's colour settles with the tick, not before it.
                  color: req.met
                    ? `hsla(100, 20%, 96%, ${0.6 + 0.4 * Math.min(1, draw)})`
                    : muted(0.78),
                }}
              >
                {req.label}
              </span>
            </div>
          );
        })}
      </Sequence>
    </AbsoluteFill>
  );
};
