/**
 * EmptyConnectionLost — the offline / query-failed idle loop shown by
 * `common/RouteErrorBoundary` and `common/StatusPanel` when a fetch rejects or
 * the browser goes offline. Signal arcs try to reach out and fade before they
 * connect, with a retry call to action underneath.
 *
 * Deliberately on `--warning`, not `--destructive`: losing a connection is
 * recoverable and the user did nothing wrong. Red here would read as a failed
 * payment, which this is not.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * The arcs expand one way — a signal has to travel outward — so the one-way
 * ramp is made unobservable: each arc's opacity is exactly 0 at local u = 0 and
 * exactly 0 from u = 0.78 onward, and the arcs are phased at exact fractions
 * `i/arcCount` of the loop. An element at exactly zero opacity contributes no
 * pixel, so the radius wrapping back cannot be seen. Everything else — the
 * router glow, the crossed-out badge, the button — is `cosWave`, a full cosine
 * period. The retry spinner turns exactly 360° per cycle, a modulo cycle.
 */

import type { FC } from "react";
import { AbsoluteFill, interpolate } from "remotion";

import {
  C,
  CourtBackdrop,
  EASE_OUT_EXPO,
  Eyebrow,
  SANS_FONT,
  Stage,
  chalk,
  cosWave,
  hairline,
  ink,
  rad,
  useLoopClock,
  warn,
  wrap,
} from "./shared";

export type EmptyConnectionLostProps = {
  /** Headline. */
  title: string;
  /** Supporting line under the headline. */
  body: string;
  /** Label on the retry button. Empty string hides the button. */
  actionLabel: string;
  /** Signal arcs in flight at once. */
  arcCount: number;
  /** Furthest radius an arc reaches, in design-canvas px. */
  arcReach: number;
};

export const emptyConnectionLostDefaultProps: EmptyConnectionLostProps = {
  title: "Can't reach SportsBnB",
  body: "Your connection dropped. Nothing was lost — try again in a moment.",
  actionLabel: "Try again",
  arcCount: 3,
  arcReach: 190,
};

const STAGE_W = 900;
const STAGE_H = 760;

export const EmptyConnectionLost: FC<EmptyConnectionLostProps> = ({
  title,
  body,
  actionLabel,
  arcCount,
  arcReach,
}) => {
  const { t } = useLoopClock();

  const breath = cosWave(t);
  const cx = STAGE_W / 2;
  const cy = 262;
  const arcs = Math.max(1, Math.round(arcCount));

  /**
   * An arc, drawn as a wedge of a circle so it reads as a broadcast rather than
   * as the full ripple the "searching" state uses. Two symmetric wedges, so the
   * shape stays balanced about the vertical.
   */
  const arcPath = (r: number, spreadDeg: number): string => {
    const a0 = -spreadDeg / 2;
    const a1 = spreadDeg / 2;
    const p0 = { x: Math.sin(rad(a0)) * r, y: -Math.cos(rad(a0)) * r };
    const p1 = { x: Math.sin(rad(a1)) * r, y: -Math.cos(rad(a1)) * r };
    return `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y}`;
  };

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.05} vignette={0.6} />

      <AbsoluteFill>
        <svg
          width={STAGE_W}
          height={STAGE_H}
          viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <g transform={`translate(${cx} ${cy})`}>
            {Array.from({ length: arcs }, (_, i) => {
              /** Exact fraction of the loop — the phases tile the cycle. */
              const u = wrap(t + i / arcs, 1);
              const r = interpolate(u, [0, 1], [56, arcReach], {
                easing: EASE_OUT_EXPO,
              });
              /** Exactly 0 at u = 0 and from u = 0.78 on. */
              const opacity = interpolate(u, [0, 0.14, 0.78, 1], [0, 0.55, 0, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <g key={i}>
                  <path
                    d={arcPath(r, 96)}
                    fill="none"
                    stroke={C.warning}
                    strokeWidth={interpolate(u, [0, 1], [4, 1.2])}
                    strokeLinecap="round"
                    opacity={opacity}
                  />
                  <path
                    d={arcPath(r, 96)}
                    fill="none"
                    stroke={C.warning}
                    strokeWidth={interpolate(u, [0, 1], [4, 1.2])}
                    strokeLinecap="round"
                    opacity={opacity * 0.7}
                    transform="rotate(180)"
                  />
                </g>
              );
            })}

            {/* Range rings for reference — static structure. */}
            <circle
              r={arcReach * 0.98}
              fill="none"
              stroke={hairline(0.5)}
              strokeWidth={1}
              strokeDasharray="4 8"
            />

            {/* The router. Warm glow under it, so it reads as powered but
                unreachable rather than dead. */}
            <circle r={54 + 6 * breath} fill={warn(0.09 + 0.05 * breath)} />
            <rect
              x={-46}
              y={-18}
              width={92}
              height={38}
              rx={12}
              fill={C.surface2}
              stroke={C.border}
              strokeWidth={1.4}
            />
            <line
              x1={-30}
              y1={-18}
              x2={-42}
              y2={-46}
              stroke={C.borderStrong}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <line
              x1={30}
              y1={-18}
              x2={42}
              y2={-46}
              stroke={C.borderStrong}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle cx={-26} cy={2} r={4} fill={warn(0.5 + 0.5 * breath)} />
            <circle cx={-10} cy={2} r={4} fill={hairline(1)} />
            <circle cx={6} cy={2} r={4} fill={hairline(1)} />

            {/* The strike-through — the one unambiguous "no signal" mark. */}
            <line
              x1={-66}
              y1={44}
              x2={66}
              y2={-52}
              stroke={ink(0.85)}
              strokeWidth={9}
              strokeLinecap="round"
            />
            <line
              x1={-66}
              y1={44}
              x2={66}
              y2={-52}
              stroke={C.warning}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.7 + 0.3 * breath}
            />
          </g>
        </svg>

        <Eyebrow
          x={0}
          y={cy + arcReach + 46}
          width={STAGE_W}
          align="center"
          color={warn(0.5 + 0.3 * breath)}
        >
          Offline
        </Eyebrow>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: cy + arcReach + 80,
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
            left: STAGE_W * 0.14,
            top: cy + arcReach + 128,
            width: STAGE_W * 0.72,
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
              left: cx - 108,
              top: cy + arcReach + 190,
              width: 216,
              height: 52,
              borderRadius: 16,
              backgroundColor: C.surface2,
              border: `1px solid ${C.borderInteractive}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              fontFamily: SANS_FONT,
              fontSize: 17,
              fontWeight: 600,
              color: C.foreground,
              boxShadow: `0 8px 22px -10px ${ink(0.8)}`,
            }}
          >
            {/* Retry glyph: exactly one turn per cycle, a modulo cycle. */}
            <svg width={18} height={18} viewBox="0 0 24 24">
              <g transform={`rotate(${t * 360} 12 12)`}>
                <path
                  d="M 20 12 A 8 8 0 1 1 15.5 4.8"
                  fill="none"
                  stroke={chalk(0.8)}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
                <path d="M 20 3.5 L 20 9 L 14.5 9 Z" fill={chalk(0.8)} />
              </g>
            </svg>
            {actionLabel}
          </div>
        ) : null}

        {/* Faint horizon line, so the mark is not floating in nothing. */}
        <div
          style={{
            position: "absolute",
            left: STAGE_W * 0.16,
            top: cy + arcReach + 22,
            width: STAGE_W * 0.68,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${hairline(1)} 22%, ${hairline(1)} 78%, transparent)`,
          }}
        />
      </AbsoluteFill>
    </Stage>
  );
};
