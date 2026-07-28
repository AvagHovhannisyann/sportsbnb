/**
 * ProgressLinearBar — a *determinate* linear bar. This is the photo-upload
 * meter on `AddVenuePage` / `EditVenuePage` and the CSV import bar in
 * `admin/FieldSubmissionsTab`: the fill sits at a known fraction, and the
 * motion on top of it says "still working" without lying about the number.
 *
 * ── Why it loops, and why the fill does not move ──────────────────────────
 * A determinate bar's value comes from the caller, not from the clock, so
 * `progress` is a prop and the fill is *static*. Animating it 0 → value would
 * be a one-way tween, and a one-way tween cannot loop: it would have to snap
 * back every cycle, which reads as the upload restarting.
 *
 * What loops is the gloss: a repeating gradient the width of one period, whose
 * background position advances by exactly one period per cycle. Shifting a
 * tiled image by exactly one tile is the identity map, so frame 0 and the final
 * frame are bit-identical. The leading-edge glow and the label breathe on
 * `cosWave`, a full cosine period.
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
  primary,
  useLoopClock,
} from "./shared";

export type ProgressLinearBarProps = {
  /** The determinate value, 0 → 1. Clamped. */
  progress: number;
  /** Track height, in design-canvas px. */
  barHeight: number;
  /** Headline above the bar. */
  title: string;
  /** Sub-line under the bar, left aligned. */
  detail: string;
  /** Show the percentage numeral on the right. */
  showPercent: boolean;
  /** Draw quarter ticks along the track. */
  showTicks: boolean;
};

export const progressLinearBarDefaultProps: ProgressLinearBarProps = {
  progress: 0.68,
  barHeight: 16,
  title: "Uploading venue photos",
  detail: "7 of 10 files · 4.2 MB remaining",
  showPercent: true,
  showTicks: true,
};

const STAGE_W = 1000;
const STAGE_H = 420;
const BAR_X = 90;
const BAR_W = 820;
/** One gloss period, in canvas px. */
const GLOSS_PERIOD = 420;

export const ProgressLinearBar: FC<ProgressLinearBarProps> = ({
  progress,
  barHeight,
  title,
  detail,
  showPercent,
  showTicks,
}) => {
  const { t } = useLoopClock();

  const value = Math.min(1, Math.max(0, progress));
  const fillW = BAR_W * value;
  const breath = cosWave(t);
  const barY = 214;

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.1} vignette={0.45} />

      <AbsoluteFill>
        <Eyebrow x={BAR_X} y={104} color={primary(0.5 + 0.26 * breath)}>
          Upload in progress
        </Eyebrow>

        <div
          style={{
            position: "absolute",
            left: BAR_X,
            top: 134,
            width: BAR_W,
            fontFamily: SANS_FONT,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: C.foreground,
          }}
        >
          {title}
        </div>

        {showPercent ? (
          <div
            style={{
              position: "absolute",
              left: BAR_X,
              top: 138,
              width: BAR_W,
              textAlign: "right",
              fontFamily: MONO_FONT,
              fontSize: 30,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              color: C.primary,
            }}
          >
            {Math.round(value * 100)}%
          </div>
        ) : null}

        {/* Track. */}
        <div
          style={{
            position: "absolute",
            left: BAR_X,
            top: barY,
            width: BAR_W,
            height: barHeight,
            borderRadius: barHeight / 2,
            backgroundColor: C.surface3,
            boxShadow: `inset 0 1px 2px ${hairline(1)}`,
            overflow: "hidden",
          }}
        >
          {showTicks
            ? [0.25, 0.5, 0.75].map((tick) => (
                <div
                  key={tick}
                  style={{
                    position: "absolute",
                    left: BAR_W * tick,
                    top: 0,
                    width: 1,
                    height: barHeight,
                    backgroundColor: chalk(0.08),
                  }}
                />
              ))
            : null}

          {/* Determinate fill — static, by design. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: fillW,
              height: barHeight,
              borderRadius: barHeight / 2,
              backgroundColor: C.primary,
              overflow: "hidden",
            }}
          >
            {/* The gloss. One tile per period, advanced by exactly one tile
                per cycle — this is the only thing here that moves. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `repeating-linear-gradient(100deg, ${chalk(0)} 0px, ${chalk(0)} ${GLOSS_PERIOD * 0.42}px, ${chalk(0.34)} ${GLOSS_PERIOD * 0.5}px, ${chalk(0)} ${GLOSS_PERIOD * 0.58}px, ${chalk(0)} ${GLOSS_PERIOD}px)`,
                backgroundSize: `${GLOSS_PERIOD}px 100%`,
                backgroundRepeat: "repeat",
                backgroundPosition: `${t * GLOSS_PERIOD}px 0px`,
              }}
            />
          </div>
        </div>

        {/* Leading-edge glow. Sits outside the clipped track so it can bloom. */}
        {value > 0 && value < 1 ? (
          <div
            style={{
              position: "absolute",
              left: BAR_X + fillW - 34,
              top: barY + barHeight / 2 - 34,
              width: 68,
              height: 68,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${primary(0.24 + 0.2 * breath)} 0%, transparent 70%)`,
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            left: BAR_X,
            top: barY + barHeight + 22,
            width: BAR_W,
            fontFamily: SANS_FONT,
            fontSize: 16,
            color: C.mutedForeground,
          }}
        >
          {detail}
        </div>

        {/* Endpoint labels, mono like every numeral in the app. */}
        <div
          style={{
            position: "absolute",
            left: BAR_X,
            top: barY + barHeight + 22,
            width: BAR_W,
            textAlign: "right",
            fontFamily: MONO_FONT,
            fontSize: 14,
            fontVariantNumeric: "tabular-nums",
            color: C.foregroundSoft,
          }}
        >
          {`${Math.round(value * 100)} / 100`}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
