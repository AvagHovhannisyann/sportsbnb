/**
 * SpinnerDotRelay — the dot rhythm. A relay of dots handing a lift down the
 * row, sized for *inline* busy states: the Reserve button on
 * `VenueDetailsPage` while a hold is being taken, the "sending" state of
 * `ChatInput`, and the AI typing indicator in `AIChatbot`.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * Every dot reads `cosWave(t, φ)` with `φ = 2π·i/dotCount`. A full cosine
 * period is bit-identical at t = 0 and t = 1 for any φ, so the stagger is
 * expressed as phase inside the cycle rather than as a start offset on a
 * one-way tween — which is exactly why stagger and seamlessness coexist here.
 * The trailing sheen is a tiled gradient shifted by exactly one tile.
 */

import type { FC } from "react";
import { AbsoluteFill, interpolate, interpolateColors } from "remotion";

import {
  C,
  CourtBackdrop,
  Eyebrow,
  Stage,
  TAU,
  cosWave,
  hairline,
  ink,
  primary,
  useLoopClock,
} from "./shared";

export type SpinnerDotRelayProps = {
  /** How many dots are in the relay. */
  dotCount: number;
  /** Resting diameter of a dot, in design-canvas px. */
  dotSize: number;
  /** Centre-to-centre spacing. */
  gap: number;
  /** Peak vertical lift at the crest of a dot's phase. */
  lift: number;
  /** Caption under the row. Empty string hides it. */
  label: string;
  /**
   * How tightly the lit band is focused. 1 is a soft swell across the whole
   * row; higher values narrow it to a single travelling dot.
   */
  focus: number;
};

export const spinnerDotRelayDefaultProps: SpinnerDotRelayProps = {
  dotCount: 5,
  dotSize: 26,
  gap: 46,
  lift: 30,
  label: "Holding your slot",
  focus: 4,
};

const STAGE_W = 720;
const STAGE_H = 360;

export const SpinnerDotRelay: FC<SpinnerDotRelayProps> = ({
  dotCount,
  dotSize,
  gap,
  lift,
  label,
  focus,
}) => {
  const clock = useLoopClock();
  const { t } = clock;

  const count = Math.max(2, Math.round(dotCount));
  const rowWidth = (count - 1) * gap;
  const startX = STAGE_W / 2 - rowWidth / 2;
  const baseline = STAGE_H / 2 - 6;

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.12} vignette={0.45} />

      <AbsoluteFill>
        {/* The rail the dots sit on — the same hairline the design system uses
            for an inset track. Static: it is structure. */}
        <div
          style={{
            position: "absolute",
            left: startX - gap * 0.55,
            top: baseline + dotSize / 2 + 20,
            width: rowWidth + gap * 1.1,
            height: 2,
            borderRadius: 1,
            backgroundColor: hairline(0.9),
          }}
        />

        {Array.from({ length: count }, (_, i) => {
          /**
           * Phase offset by exactly one slot of the cycle. `cosWave` crests at
           * its own phase origin, so the crest walks the row once per loop and
           * arrives back where it started.
           */
          const phase = (TAU * i) / count;
          const wave = cosWave(t, phase);
          /** Sharpen the swell into a travelling head. Still 2π-periodic. */
          const head = Math.pow(wave, Math.max(1, focus));

          const x = startX + i * gap;
          const size = dotSize * (0.78 + 0.46 * head);
          const y = baseline - lift * head;

          return (
            <div key={i}>
              {/* Court-green bloom. Opacity tracks `head`, so it is continuous
                  across the wrap along with everything else. */}
              <div
                style={{
                  position: "absolute",
                  left: x - size * 1.6,
                  top: y - size * 1.6,
                  width: size * 3.2,
                  height: size * 3.2,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${primary(0.34 * head)} 0%, transparent 68%)`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: x - size / 2,
                  top: y - size / 2,
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  backgroundColor: interpolateColors(
                    head,
                    [0, 1],
                    [C.borderStrong, C.primary],
                  ),
                  boxShadow: `0 ${6 * head}px ${14 * head}px ${ink(0.5 * head)}`,
                  opacity: interpolate(head, [0, 1], [0.55, 1]),
                }}
              />
            </div>
          );
        })}

        {label.length > 0 ? (
          <Eyebrow
            x={0}
            y={baseline + dotSize / 2 + 56}
            width={STAGE_W}
            align="center"
            color={primary(0.45 + 0.3 * cosWave(t))}
          >
            {label}
          </Eyebrow>
        ) : null}
      </AbsoluteFill>
    </Stage>
  );
};
