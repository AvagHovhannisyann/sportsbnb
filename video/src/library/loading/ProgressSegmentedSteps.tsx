/**
 * ProgressSegmentedSteps — a *determinate* stepper. The four-step checkout
 * header on the booking flow (slot → details → payment → confirmation) and the
 * venue-listing wizard on `AddVenuePage` / `OwnerOnboarding`, where the user
 * needs to know both where they are and how much is left.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * `currentStep` is a prop: which segments are done is a fact about the flow,
 * not about the clock, so the completed segments are static. Advancing them
 * over the cycle would be a one-way tween that has to snap back, which reads as
 * the user being thrown back to step one.
 *
 * What loops is confined to the *active* segment: a gloss that is a repeating
 * gradient one period wide, advanced by exactly one period per cycle (a modulo
 * cycle — the identity map), and the active node's `loopPulse` ring, which is
 * exactly `0 − 0` at the bottom of its cycle and exactly `1 − 1` once settled.
 * `hold + fall + 1 = 45 ≤ period`, so the pulse is closed before the wrap.
 */

import type { FC } from "react";
import { AbsoluteFill } from "remotion";

import {
  C,
  CourtBackdrop,
  Eyebrow,
  MONO_FONT,
  SANS_FONT,
  Stage,
  chalk,
  cosWave,
  hairline,
  ink,
  loopPulse,
  primary,
  useLoopClock,
} from "./shared";

export type ProgressSegmentedStepsProps = {
  /** Step labels. The count of these is the count of segments. */
  steps: string[];
  /** Zero-based index of the step in progress. */
  currentStep: number;
  /** Diameter of a step node, in design-canvas px. */
  nodeSize: number;
  /** Thickness of the connecting rail. */
  railHeight: number;
  /** Headline above the stepper. Empty string hides it. */
  title: string;
};

export const progressSegmentedStepsDefaultProps: ProgressSegmentedStepsProps = {
  steps: ["Pick a slot", "Your details", "Payment", "Confirmed"],
  currentStep: 2,
  nodeSize: 46,
  railHeight: 8,
  title: "Booking Ararat Arena · Pitch 2",
};

const STAGE_W = 1200;
const STAGE_H = 420;
const ROW_X = 110;
const ROW_W = 980;
/** One gloss period on the active rail, in canvas px. */
const GLOSS_PERIOD = 220;

export const ProgressSegmentedSteps: FC<ProgressSegmentedStepsProps> = ({
  steps,
  currentStep,
  nodeSize,
  railHeight,
  title,
}) => {
  const { t, frame, fps, period, reduced } = useLoopClock();

  const count = Math.max(2, steps.length);
  const active = Math.min(count - 1, Math.max(0, Math.round(currentStep)));
  const breath = cosWave(t);
  const rowY = 236;
  const gap = ROW_W / (count - 1);

  const pulse = reduced
    ? 0
    : loopPulse({ frame, fps, period, rise: 14, hold: 26, fall: 18 });

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.1} vignette={0.45} />

      <AbsoluteFill>
        <Eyebrow x={ROW_X} y={104} color={primary(0.5 + 0.26 * breath)}>
          {`Step ${active + 1} of ${count}`}
        </Eyebrow>

        {title.length > 0 ? (
          <div
            style={{
              position: "absolute",
              left: ROW_X,
              top: 134,
              width: ROW_W,
              fontFamily: SANS_FONT,
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: C.foreground,
            }}
          >
            {title}
          </div>
        ) : null}

        {/* Rails, drawn before the nodes so the nodes cap them. */}
        {Array.from({ length: count - 1 }, (_, i) => {
          const x = ROW_X + i * gap + nodeSize / 2;
          const w = gap - nodeSize;
          const done = i < active;
          const isActive = i === active;

          return (
            <div
              key={`rail-${i}`}
              style={{
                position: "absolute",
                left: x,
                top: rowY - railHeight / 2,
                width: w,
                height: railHeight,
                borderRadius: railHeight / 2,
                backgroundColor: done ? C.primary : C.surface3,
                boxShadow: done ? "none" : `inset 0 1px 2px ${hairline(1)}`,
                overflow: "hidden",
              }}
            >
              {isActive ? (
                <>
                  {/* The active rail is half-filled: this segment is underway. */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: w * 0.5,
                      backgroundColor: C.primary,
                      borderRadius: railHeight / 2,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `repeating-linear-gradient(100deg, ${primary(0)} 0px, ${primary(0)} ${GLOSS_PERIOD * 0.34}px, ${primary(0.75)} ${GLOSS_PERIOD * 0.5}px, ${primary(0)} ${GLOSS_PERIOD * 0.66}px, ${primary(0)} ${GLOSS_PERIOD}px)`,
                      backgroundSize: `${GLOSS_PERIOD}px 100%`,
                      backgroundRepeat: "repeat",
                      backgroundPosition: `${t * GLOSS_PERIOD}px 0px`,
                    }}
                  />
                </>
              ) : null}
            </div>
          );
        })}

        {/* Nodes and labels. */}
        {steps.map((step, i) => {
          const cx = ROW_X + i * gap;
          const done = i < active;
          const isActive = i === active;
          const size = nodeSize * (isActive ? 1 + 0.08 * pulse : 1);

          return (
            <div key={`node-${i}`}>
              {isActive ? (
                <div
                  style={{
                    position: "absolute",
                    left: cx - nodeSize,
                    top: rowY - nodeSize,
                    width: nodeSize * 2,
                    height: nodeSize * 2,
                    borderRadius: "50%",
                    border: `2px solid ${primary(0.5 * Math.max(0, 1 - pulse))}`,
                    transform: `scale(${0.55 + 0.45 * pulse})`,
                    opacity: Math.min(1, pulse * 4) * Math.max(0, 1 - pulse),
                  }}
                />
              ) : null}

              <div
                style={{
                  position: "absolute",
                  left: cx - size / 2,
                  top: rowY - size / 2,
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  backgroundColor: done || isActive ? C.primary : C.surface2,
                  border: `2px solid ${done || isActive ? C.primary : C.border}`,
                  boxShadow:
                    done || isActive
                      ? `0 6px 16px -6px ${primary(0.6)}, 0 0 ${18 + 10 * breath}px -6px ${primary(0.5)}`
                      : `0 2px 4px ${ink(0.4)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO_FONT,
                  fontSize: nodeSize * 0.38,
                  fontWeight: 500,
                  color: done || isActive ? C.bg : chalk(0.4),
                }}
              >
                {done ? "✓" : i + 1}
              </div>

              <div
                style={{
                  position: "absolute",
                  left: cx - gap / 2,
                  top: rowY + nodeSize / 2 + 22,
                  width: gap,
                  textAlign: "center",
                  fontFamily: SANS_FONT,
                  fontSize: 15,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive
                    ? C.foreground
                    : done
                      ? C.foregroundSoft
                      : C.mutedForeground,
                }}
              >
                {step}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </Stage>
  );
};
