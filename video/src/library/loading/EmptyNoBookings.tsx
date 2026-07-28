/**
 * EmptyNoBookings — the first-run idle loop for `MyBookingsPage` (and the
 * "Upcoming" tab of `PlayerDashboard`) when the account has no bookings yet.
 * A stack of blank booking stubs breathes on a fanned pile, with a "find a
 * pitch" call to action.
 *
 * This is a *first-run* empty state, not an error, so the copy points forward
 * and the motion is welcoming rather than apologetic: nothing here dims, fades
 * out, or uses the warning colour.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * Every stub's tilt, lift and shadow is `cosWave(t, φ)` at its own phase φ — a
 * full cosine period, bit-identical at t = 0 and t = 1 for any φ, which is how
 * the stubs are staggered without any of them running a one-way tween. The
 * perforation dots and the button glow ride the same wave. There is not a
 * single value in this file that is not 2π-periodic in `t`.
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
  TAU,
  chalk,
  cosWave,
  hairline,
  ink,
  primary,
  useLoopClock,
} from "./shared";

export type EmptyNoBookingsProps = {
  /** Headline. */
  title: string;
  /** Supporting line under the headline. */
  body: string;
  /** Label on the call to action. Empty string hides the button. */
  actionLabel: string;
  /** Blank stubs in the fanned pile. */
  stubCount: number;
  /** Degrees of tilt between neighbouring stubs. */
  fanSpread: number;
};

export const emptyNoBookingsDefaultProps: EmptyNoBookingsProps = {
  title: "No bookings yet",
  body: "Find a pitch near you and your first slot will show up here.",
  actionLabel: "Browse pitches",
  stubCount: 3,
  fanSpread: 7,
};

const STAGE_W = 900;
const STAGE_H = 760;
const STUB_W = 320;
const STUB_H = 190;

export const EmptyNoBookings: FC<EmptyNoBookingsProps> = ({
  title,
  body,
  actionLabel,
  stubCount,
  fanSpread,
}) => {
  const { t } = useLoopClock();

  const breath = cosWave(t);
  const cx = STAGE_W / 2;
  const cy = 252;
  const stubs = Math.max(1, Math.round(stubCount));

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.1} vignette={0.5} />

      <AbsoluteFill>
        {/* The pile, painted back to front so the top stub is the last drawn. */}
        {Array.from({ length: stubs }, (_, i) => {
          const depth = stubs - 1 - i;
          /** Own phase per stub — the stagger, inside a periodic driver. */
          const phase = (TAU * depth) / Math.max(1, stubs);
          const wave = cosWave(t, phase);

          const tilt = (depth - (stubs - 1) / 2) * fanSpread + (wave - 0.5) * 2.2;
          const lift = depth * 16 - wave * 6;
          const scale = 1 - depth * 0.045;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: cx - STUB_W / 2,
                top: cy - STUB_H / 2 + lift,
                width: STUB_W,
                height: STUB_H,
                borderRadius: 18,
                backgroundColor: depth === 0 ? C.surface2 : C.card,
                border: `1px solid ${C.border}`,
                transform: `rotate(${tilt}deg) scale(${scale})`,
                transformOrigin: "center bottom",
                boxShadow: [
                  `0 ${14 + 6 * wave}px ${30 + 10 * wave}px -10px ${ink(0.6)}`,
                  `inset 0 1px 0 0 ${chalk(0.05)}`,
                ].join(", "),
                overflow: "hidden",
                opacity: 1 - depth * 0.12,
              }}
            >
              {/* Torn edge: a row of notches down the middle of the stub. */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: STUB_H * 0.62,
                  width: STUB_W,
                  height: 1,
                  backgroundImage: `repeating-linear-gradient(90deg, ${hairline(1)} 0px, ${hairline(1)} 7px, transparent 7px, transparent 14px)`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: -9,
                  top: STUB_H * 0.62 - 9,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: C.bg,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: STUB_W - 9,
                  top: STUB_H * 0.62 - 9,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: C.bg,
                }}
              />

              {/* Blank content bars — this stub has no booking on it. */}
              <div
                style={{
                  position: "absolute",
                  left: 24,
                  top: 26,
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor:
                    depth === 0 ? primary(0.16 + 0.08 * wave) : C.surface3,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 82,
                  top: 32,
                  width: 150,
                  height: 13,
                  borderRadius: 7,
                  backgroundColor: C.borderStrong,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 82,
                  top: 56,
                  width: 96,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: C.border,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 24,
                  top: STUB_H * 0.62 + 22,
                  fontFamily: MONO_FONT,
                  fontSize: 12,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: depth === 0 ? primary(0.5 + 0.2 * wave) : hairline(1),
                }}
              >
                No slot
              </div>
            </div>
          );
        })}

        <Eyebrow
          x={0}
          y={cy + STUB_H / 2 + 96}
          width={STAGE_W}
          align="center"
          color={primary(0.36 + 0.24 * breath)}
        >
          Your bookings
        </Eyebrow>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: cy + STUB_H / 2 + 130,
            width: STAGE_W,
            textAlign: "center",
            fontFamily: SANS_FONT,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: C.foreground,
          }}
        >
          {title}
        </div>

        <div
          style={{
            position: "absolute",
            left: STAGE_W * 0.16,
            top: cy + STUB_H / 2 + 182,
            width: STAGE_W * 0.68,
            textAlign: "center",
            fontFamily: SANS_FONT,
            fontSize: 17,
            lineHeight: 1.5,
            color: C.mutedForeground,
          }}
        >
          {body}
        </div>

        {actionLabel.length > 0 ? (
          <div
            style={{
              position: "absolute",
              left: cx - 118,
              top: cy + STUB_H / 2 + 246,
              width: 236,
              height: 54,
              borderRadius: 16,
              backgroundColor: C.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SANS_FONT,
              fontSize: 17,
              fontWeight: 600,
              color: C.bg,
              transform: `translateY(${-2 * breath}px)`,
              boxShadow: `0 12px 28px -10px ${primary(0.6)}, 0 0 ${22 + 18 * breath}px -8px ${primary(0.55)}`,
            }}
          >
            {actionLabel}
          </div>
        ) : null}
      </AbsoluteFill>
    </Stage>
  );
};
