/**
 * IndeterminateRailSweep — the hairline rail that runs across the top of the
 * viewport during a route change. This is the global navigation-progress bar
 * the app shell shows while a lazy route chunk and its queries are in flight —
 * the thing that fills the gap between a click in `Header` and the new page's
 * skeleton appearing.
 *
 * Indeterminate on purpose: nothing here knows how long the fetch will take, so
 * the bar must not imply a fraction. It shows *liveness*, not progress.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * The comet is a repeating gradient exactly `RAIL_PERIOD` px wide whose
 * background position advances by exactly `RAIL_PERIOD` over the cycle.
 * Shifting a tiled image by exactly one tile is the identity map: the comet
 * leaving the right edge and the next entering from the left are the same
 * comet, so there is nothing to seam. The counter-running secondary comet uses
 * the same trick in the opposite direction.
 *
 * The bloom under the rail is a *tiled radial gradient*, not a positioned div,
 * and that is deliberate. An absolutely-positioned glow tracking
 * `wrap(t · period, period)` does close at the seam — but it jumps mid-cycle,
 * when the modulo rolls over and the glow teleports from the right edge to the
 * left. Tiling it at the same `background-size` as the comet and advancing it
 * by the same one tile makes the glow leaving the right edge and the one
 * entering from the left literally the same glow: continuous everywhere, not
 * only at t = 0.
 */

import type { FC } from "react";
import { AbsoluteFill } from "remotion";

import {
  C,
  CourtBackdrop,
  Eyebrow,
  MockScreen,
  Stage,
  cosWave,
  cyan,
  ink,
  primary,
  useLoopClock,
} from "./shared";

export type IndeterminateRailSweepProps = {
  /** Rail thickness, in design-canvas px. */
  railHeight: number;
  /** How far the comet travels per cycle, in canvas px. One tile. */
  cometPeriod: number;
  /** Fraction of one period the lit head occupies, 0 → 1. */
  cometWidth: number;
  /** Run a second, slower comet the other way. */
  showCounterComet: boolean;
  /** Caption under the rail. Empty string hides it. */
  label: string;
  /** Show the page chrome the rail sits on top of. */
  showScreen: boolean;
};

export const indeterminateRailSweepDefaultProps: IndeterminateRailSweepProps = {
  railHeight: 4,
  cometPeriod: 1280,
  cometWidth: 0.3,
  showCounterComet: true,
  label: "Loading route",
  showScreen: true,
};

const STAGE_W = 1280;
const STAGE_H = 720;

export const IndeterminateRailSweep: FC<IndeterminateRailSweepProps> = ({
  railHeight,
  cometPeriod,
  cometWidth,
  showCounterComet,
  label,
  showScreen,
}) => {
  const { t } = useLoopClock();

  const breath = cosWave(t);
  const half = Math.min(0.48, Math.max(0.04, cometWidth / 2));

  const comet = (color: (a: number) => string, peak: number): string =>
    [
      `linear-gradient(90deg,`,
      `${color(0)} ${(0.5 - half) * 100}%,`,
      `${color(peak * 0.45)} ${(0.5 - half * 0.45) * 100}%,`,
      `${color(peak)} 50%,`,
      `${color(peak * 0.45)} ${(0.5 + half * 0.45) * 100}%,`,
      `${color(0)} ${(0.5 + half) * 100}%)`,
    ].join(" ");

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      {showScreen ? (
        <MockScreen w={STAGE_W} h={STAGE_H} variant="discover" />
      ) : (
        <CourtBackdrop t={t} bloom={0.1} vignette={0.5} />
      )}

      <AbsoluteFill>
        {/* Bloom under the head. Tiled at the comet's own period and centred in
            its tile, so it sits on the comet and travels with it — and, being
            tiled, it is continuous at the roll-over as well as at the seam. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: -110,
            width: STAGE_W,
            height: 220,
            backgroundImage: `radial-gradient(ellipse 50% 50% at 50% 50%, ${primary(0.26)} 0%, transparent 70%)`,
            backgroundSize: `${cometPeriod}px 220px`,
            backgroundRepeat: "repeat-x",
            backgroundPosition: `${t * cometPeriod}px 0px`,
          }}
        />

        {/* The track. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: STAGE_W,
            height: railHeight,
            backgroundColor: primary(0.1),
          }}
        />

        {showCounterComet ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: STAGE_W,
              height: railHeight,
              backgroundImage: comet(cyan, 0.5),
              backgroundSize: `${cometPeriod * 1.5}px 100%`,
              backgroundRepeat: "repeat",
              /* Negative direction, still exactly one tile per cycle. */
              backgroundPosition: `${-t * cometPeriod * 1.5}px 0px`,
              opacity: 0.6,
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: STAGE_W,
            height: railHeight,
            backgroundImage: comet(primary, 1),
            backgroundSize: `${cometPeriod}px 100%`,
            backgroundRepeat: "repeat",
            backgroundPosition: `${t * cometPeriod}px 0px`,
            boxShadow: `0 2px 12px ${primary(0.28)}`,
          }}
        />

        {/* A dimming scrim over the outgoing page, so the rail is the only
            thing the eye is asked to track. */}
        {showScreen ? (
          <AbsoluteFill style={{ backgroundColor: ink(0.45) }} />
        ) : null}

        {label.length > 0 ? (
          <>
            <div
              style={{
                position: "absolute",
                left: STAGE_W / 2 - 9,
                top: STAGE_H / 2 - 9,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: C.primary,
                opacity: 0.35 + 0.5 * breath,
                transform: `scale(${0.85 + 0.3 * breath})`,
              }}
            />
            <Eyebrow
              x={0}
              y={STAGE_H / 2 + 26}
              width={STAGE_W}
              align="center"
              color={primary(0.45 + 0.3 * breath)}
            >
              {label}
            </Eyebrow>
          </>
        ) : null}
      </AbsoluteFill>
    </Stage>
  );
};
