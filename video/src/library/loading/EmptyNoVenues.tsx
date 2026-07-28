/**
 * EmptyNoVenues — the zero-results idle loop for `DiscoverPage` and
 * `NearbyFieldsPage`: the filters returned nothing, so the grid is replaced by
 * an empty pitch, a search radius that keeps sweeping, and a "widen your
 * search" call to action.
 *
 * An empty state has to keep breathing or it reads as a crash. It also has to
 * stay *calm* — this is a dead end, not a loading state, so nothing here
 * travels or accelerates; it only breathes and rotates at a constant rate.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * Three drivers, all periodic. The search ring rotates exactly 360° per cycle
 * and its dash offset advances by exactly one dash period — both modulo cycles,
 * so the wrap is an ordinary step. The ball's bob and the copy's glow are
 * `cosWave`, a full cosine period, bit-identical at t = 0 and t = 1. The three
 * drifting motes each use `cosWave` at their own phase, which is why they are
 * staggered without any of them tweening one way.
 */

import type { FC } from "react";
import { AbsoluteFill } from "remotion";

import {
  C,
  CourtBackdrop,
  Eyebrow,
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

export type EmptyNoVenuesProps = {
  /** Headline. */
  title: string;
  /** Supporting line under the headline. */
  body: string;
  /** Label on the reset button. Empty string hides the button. */
  actionLabel: string;
  /** Radius of the sweeping search ring, in design-canvas px. */
  searchRadius: number;
  /** Drifting motes around the pitch. 0 disables them. */
  moteCount: number;
};

export const emptyNoVenuesDefaultProps: EmptyNoVenuesProps = {
  title: "No pitches match those filters",
  body: "Try widening the distance, or clearing a surface or two.",
  actionLabel: "Reset filters",
  searchRadius: 128,
  moteCount: 5,
};

const STAGE_W = 900;
const STAGE_H = 760;

export const EmptyNoVenues: FC<EmptyNoVenuesProps> = ({
  title,
  body,
  actionLabel,
  searchRadius,
  moteCount,
}) => {
  const { t } = useLoopClock();

  const breath = cosWave(t);
  const cx = STAGE_W / 2;
  const cy = 268;
  const motes = Math.max(0, Math.round(moteCount));

  /** Dash geometry: the offset advances by exactly one period per cycle. */
  const dash = 12;
  const gap = 14;
  const dashPeriod = dash + gap;

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.08} vignette={0.55} />

      <AbsoluteFill>
        <svg
          width={STAGE_W}
          height={STAGE_H}
          viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <g transform={`translate(${cx} ${cy})`}>
            {/* Search radius. One turn per cycle, dash offset one period per
                cycle — both exact, so both close. */}
            <g transform={`rotate(${t * 360})`}>
              <circle
                r={searchRadius}
                fill="none"
                stroke={hairline(1)}
                strokeWidth={1.6}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-t * dashPeriod}
              />
              <circle
                r={searchRadius}
                fill="none"
                stroke={primary(0.4)}
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray={`${TAU * searchRadius * 0.14} ${TAU * searchRadius * 0.86}`}
              />
            </g>

            <circle
              r={searchRadius * (0.62 + 0.02 * breath)}
              fill="none"
              stroke={hairline(0.6)}
              strokeWidth={1}
            />

            {/* Motes: dust over an empty court. Each on its own cosine phase. */}
            {Array.from({ length: motes }, (_, i) => {
              const phase = (TAU * i) / motes;
              const drift = cosWave(t, phase);
              const angle = (i / motes) * TAU + 0.4;
              const r = searchRadius * (0.78 + 0.16 * drift);
              return (
                <circle
                  key={i}
                  cx={Math.cos(angle) * r}
                  cy={Math.sin(angle) * r * 0.62}
                  r={2.2 + 1.6 * drift}
                  fill={chalk(0.12 + 0.18 * drift)}
                />
              );
            })}

            {/* The empty pitch — the same pictogram as the loaders, drawn in
                hairline rather than court-green because there is nothing here. */}
            <g transform={`translate(-80 -56) scale(2)`}>
              <rect
                x={1.2}
                y={1.2}
                width={77.6}
                height={53.6}
                rx={6}
                fill={ink(0.4)}
                stroke={hairline(1)}
                strokeWidth={1.6}
              />
              <line
                x1={40}
                y1={1.2}
                x2={40}
                y2={54.8}
                stroke={hairline(1)}
                strokeWidth={1.2}
              />
              <circle
                cx={40}
                cy={28}
                r={8.5}
                fill="none"
                stroke={hairline(1)}
                strokeWidth={1.2}
              />
              <rect
                x={1.2}
                y={16}
                width={9}
                height={24}
                fill="none"
                stroke={hairline(0.8)}
                strokeWidth={1.1}
              />
              <rect
                x={69.8}
                y={16}
                width={9}
                height={24}
                fill="none"
                stroke={hairline(0.8)}
                strokeWidth={1.1}
              />
            </g>

            {/* One lone ball, bobbing. A full cosine period, so it lands back
                on its own start. */}
            <g transform={`translate(0 ${-14 - 10 * breath})`}>
              <ellipse
                cy={30 + 10 * breath}
                rx={13 - 3 * breath}
                ry={3.4 - 0.9 * breath}
                fill={ink(0.6)}
              />
              <circle r={13} fill={C.foreground} />
              <circle r={13} fill="none" stroke={C.border} strokeWidth={1} />
              <path
                d="M -6 -4 L 0 -8 L 6 -4 L 4 4 L -4 4 Z"
                fill={C.bg}
                opacity={0.85}
              />
            </g>
          </g>
        </svg>

        <Eyebrow
          x={0}
          y={cy + searchRadius + 66}
          width={STAGE_W}
          align="center"
          color={primary(0.36 + 0.22 * breath)}
        >
          0 results
        </Eyebrow>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: cy + searchRadius + 100,
            width: STAGE_W,
            textAlign: "center",
            fontFamily: SANS_FONT,
            fontSize: 32,
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
            top: cy + searchRadius + 148,
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
              left: cx - 110,
              top: cy + searchRadius + 212,
              width: 220,
              height: 52,
              borderRadius: 16,
              backgroundColor: C.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SANS_FONT,
              fontSize: 17,
              fontWeight: 600,
              color: C.bg,
              boxShadow: `0 10px 26px -10px ${primary(0.55 + 0.25 * breath)}, 0 0 ${20 + 16 * breath}px -8px ${primary(0.6)}`,
            }}
          >
            {actionLabel}
          </div>
        ) : null}
      </AbsoluteFill>
    </Stage>
  );
};
