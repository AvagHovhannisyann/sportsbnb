/**
 * SpinnerPulseRings — the pulse rhythm. Concentric court ripples expanding out
 * of a venue pin, for the map surfaces: the tile/marker load on `VenueMapPage`
 * and `NearbyFieldsPage`, and the "finding venues near you" state that
 * `LocationAutocomplete` shows while geolocation resolves.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * Each ring's radius is a one-way ramp *within its own sub-cycle* — it has to
 * be, a ripple travels outward — so the ramp is made invisible at both ends:
 * ring opacity is exactly 0 at local u = 0 and exactly 0 for u ≥ 0.82, and the
 * rings are phased at exact fractions `i/ringCount` of the loop. An element at
 * exactly zero opacity contributes no pixel, so where its radius snaps back to
 * cannot be observed. This is the same guarantee `BrandLoader` uses for its
 * court ripples. The pin itself breathes on a full cosine period.
 */

import type { FC } from "react";
import { AbsoluteFill, interpolate } from "remotion";

import {
  C,
  CourtBackdrop,
  EASE_OUT_EXPO,
  Eyebrow,
  Stage,
  chalk,
  cosWave,
  hairline,
  primary,
  useLoopClock,
  wrap,
} from "./shared";

export type SpinnerPulseRingsProps = {
  /** How many ripples are in flight at once. */
  ringCount: number;
  /** Radius a ripple starts at, in design-canvas px. */
  innerRadius: number;
  /** Radius a ripple has faded out well before reaching. */
  outerRadius: number;
  /** Peak stroke opacity of a ripple. */
  ringOpacity: number;
  /** Caption under the pin. Empty string hides it. */
  label: string;
};

export const spinnerPulseRingsDefaultProps: SpinnerPulseRingsProps = {
  ringCount: 3,
  innerRadius: 42,
  outerRadius: 240,
  ringOpacity: 0.5,
  label: "Finding venues near you",
};

const STAGE_W = 600;
const STAGE_H = 600;

export const SpinnerPulseRings: FC<SpinnerPulseRingsProps> = ({
  ringCount,
  innerRadius,
  outerRadius,
  ringOpacity,
  label,
}) => {
  const clock = useLoopClock();
  const { t } = clock;

  const cx = STAGE_W / 2;
  const cy = STAGE_H / 2 - 16;
  const count = Math.max(1, Math.round(ringCount));
  const breath = cosWave(t);

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.12} vignette={0.52} />

      <AbsoluteFill>
        <svg
          width={STAGE_W}
          height={STAGE_H}
          viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <g transform={`translate(${cx} ${cy})`}>
            {/* Two static range rings, so the ripples have something to read
                against and the dial keeps its shape at every frame. */}
            <circle
              r={outerRadius * 0.58}
              fill="none"
              stroke={hairline(0.7)}
              strokeWidth={1.2}
            />
            <circle
              r={outerRadius * 0.86}
              fill="none"
              stroke={hairline(0.45)}
              strokeWidth={1}
            />

            {Array.from({ length: count }, (_, i) => {
              /** Exact fraction of the loop — the phases tile the cycle. */
              const u = wrap(t + i / count, 1);
              const radius = interpolate(u, [0, 1], [innerRadius, outerRadius], {
                easing: EASE_OUT_EXPO,
              });
              /**
               * Exactly 0 at u = 0 and exactly 0 from u = 0.82 on, so the ring
               * is invisible for the whole span in which its radius wraps.
               */
              const opacity = interpolate(
                u,
                [0, 0.1, 0.82, 1],
                [0, ringOpacity, 0, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              );
              return (
                <circle
                  key={i}
                  r={radius}
                  fill="none"
                  stroke={C.primary}
                  strokeWidth={interpolate(u, [0, 1], [3, 0.8])}
                  opacity={opacity}
                />
              );
            })}

            {/* Filled halo under the pin — the `.live-dot` glow. */}
            <circle r={innerRadius * (0.62 + 0.12 * breath)} fill={primary(0.14)} />
            <circle
              r={innerRadius * 0.62}
              fill="none"
              stroke={primary(0.35 + 0.25 * breath)}
              strokeWidth={1.4}
            />

            {/* Venue pin: teardrop body + chalk core. */}
            <g transform={`translate(0 ${-innerRadius * 0.1}) scale(${1 + 0.05 * breath})`}>
              <path
                d="M 0 20 C -13 4 -18 -3 -18 -11 A 18 18 0 1 1 18 -11 C 18 -3 13 4 0 20 Z"
                fill={C.primary}
                stroke={chalk(0.22)}
                strokeWidth={1.2}
              />
              <circle cy={-11} r={6.4} fill={C.bg} />
            </g>
          </g>
        </svg>

        {label.length > 0 ? (
          <Eyebrow
            x={0}
            y={cy + outerRadius + 34}
            width={STAGE_W}
            align="center"
            color={primary(0.46 + 0.3 * breath)}
          >
            {label}
          </Eyebrow>
        ) : null}
      </AbsoluteFill>
    </Stage>
  );
};
