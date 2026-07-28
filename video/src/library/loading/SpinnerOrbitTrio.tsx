/**
 * SpinnerOrbitTrio — the orbit rhythm. Three bodies on a tilted ellipse,
 * passing in front of and behind the core. Used for the longer, "something is
 * genuinely being computed" waits: `AIRecommendations` on the venue page and
 * the matchmaking search in `GameMatchmakingCard`, where an arc spinner would
 * imply a wait far shorter than the real one.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * Each body's angle is `2π(t + i/orbCount)` — one exact revolution per loop, a
 * modulo cycle. Position, depth scale, depth opacity and z-order are all pure
 * functions of `sin`/`cos` of that angle, so every one of them is bit-identical
 * at t = 0 and t = 1. The trail behind each body is the same function sampled
 * at a fixed angular lag, so it wraps with its body. Nothing tweens one way.
 */

import type { FC } from "react";
import { AbsoluteFill } from "remotion";

import {
  C,
  CourtBackdrop,
  Eyebrow,
  Stage,
  TAU,
  chalk,
  cosWave,
  hairline,
  ink,
  primary,
  useLoopClock,
} from "./shared";

export type SpinnerOrbitTrioProps = {
  /** How many bodies share the orbit. */
  orbCount: number;
  /** Semi-major axis of the orbit, in design-canvas px. */
  orbitRadiusX: number;
  /** Semi-minor axis — the foreshortening that sells the tilt. */
  orbitRadiusY: number;
  /** Diameter of a body at the front of the orbit. */
  orbSize: number;
  /** Tilt of the orbital plane, in degrees. */
  tiltDegrees: number;
  /** Ghosts drawn behind each body. 0 disables trails. */
  trailLength: number;
  /** Caption under the orbit. Empty string hides it. */
  label: string;
};

export const spinnerOrbitTrioDefaultProps: SpinnerOrbitTrioProps = {
  orbCount: 3,
  orbitRadiusX: 176,
  orbitRadiusY: 62,
  orbSize: 30,
  tiltDegrees: -18,
  trailLength: 5,
  label: "Matching you with a pitch",
};

const STAGE_W = 600;
const STAGE_H = 600;

type Body = {
  key: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  /** sin(angle): +1 at the front of the orbit, −1 at the back. */
  depth: number;
  color: string;
};

export const SpinnerOrbitTrio: FC<SpinnerOrbitTrioProps> = ({
  orbCount,
  orbitRadiusX,
  orbitRadiusY,
  orbSize,
  tiltDegrees,
  trailLength,
  label,
}) => {
  const clock = useLoopClock();
  const { t } = clock;

  const cx = STAGE_W / 2;
  const cy = STAGE_H / 2 - 10;
  const count = Math.max(1, Math.round(orbCount));
  const trail = Math.max(0, Math.round(trailLength));
  const breath = cosWave(t);

  const palette = [C.primary, C.cyan, C.violet];

  /**
   * Build every body and every ghost, then sort by depth so bodies at the back
   * of the orbit are painted before the core and bodies at the front after it.
   * Sorting on `sin(angle)` is itself 2π-periodic, so the paint order at t = 1
   * is the paint order at t = 0.
   */
  const bodies: Body[] = [];
  for (let i = 0; i < count; i += 1) {
    for (let g = 0; g <= trail; g += 1) {
      /** A fixed angular lag per ghost — no time offset, so no seam. */
      const angle = TAU * (t + i / count) - g * 0.12;
      const depth = Math.sin(angle);
      const perspective = 0.72 + 0.28 * ((depth + 1) / 2);
      const isHead = g === 0;
      bodies.push({
        key: `${i}-${g}`,
        x: Math.cos(angle) * orbitRadiusX,
        y: Math.sin(angle) * orbitRadiusY,
        size: orbSize * perspective * (isHead ? 1 : 1 - g / (trail + 2)),
        opacity: (isHead ? 1 : 0.42 * (1 - g / (trail + 1))) * (0.55 + 0.45 * perspective),
        depth,
        color: palette[i % palette.length],
      });
    }
  }
  bodies.sort((a, b) => a.depth - b.depth);

  const behind = bodies.filter((b) => b.depth < 0);
  const front = bodies.filter((b) => b.depth >= 0);

  const renderBody = (b: Body) => (
    <g key={b.key} transform={`translate(${b.x} ${b.y})`} opacity={b.opacity}>
      <circle r={b.size * 1.5} fill={b.color} opacity={0.14} />
      <circle r={b.size / 2} fill={b.color} />
      <circle r={b.size / 2} fill="none" stroke={chalk(0.22)} strokeWidth={0.8} />
    </g>
  );

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.13} vignette={0.55} />

      <AbsoluteFill>
        <svg
          width={STAGE_W}
          height={STAGE_H}
          viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <g transform={`translate(${cx} ${cy}) rotate(${tiltDegrees})`}>
            {/* The orbital path. Static, and drawn first so it reads as a
                track rather than as a moving element. */}
            <ellipse
              rx={orbitRadiusX}
              ry={orbitRadiusY}
              fill="none"
              stroke={hairline(0.85)}
              strokeWidth={1.4}
            />

            {behind.map(renderBody)}

            {/* The core the bodies orbit — a court-green ball on the shadow
                ink from the `.dark` shadow tokens. */}
            <g>
              <circle
                r={orbSize * (1.36 + 0.06 * breath)}
                fill={primary(0.1 + 0.05 * breath)}
              />
              <circle r={orbSize * 0.96} fill={C.surface2} stroke={C.border} strokeWidth={1.2} />
              <circle
                r={orbSize * 0.96}
                fill="none"
                stroke={primary(0.35 + 0.3 * breath)}
                strokeWidth={2}
              />
              <circle r={orbSize * 0.2 * (0.9 + 0.3 * breath)} fill={C.primary} />
              <ellipse
                cy={orbSize * 1.5}
                rx={orbSize * 1.1}
                ry={orbSize * 0.22}
                fill={ink(0.45)}
              />
            </g>

            {front.map(renderBody)}
          </g>
        </svg>

        {label.length > 0 ? (
          <Eyebrow
            x={0}
            y={cy + orbitRadiusY + 128}
            width={STAGE_W}
            align="center"
            color={primary(0.45 + 0.3 * breath)}
          >
            {label}
          </Eyebrow>
        ) : null}
      </AbsoluteFill>
    </Stage>
  );
};
