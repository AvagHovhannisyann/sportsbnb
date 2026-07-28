/**
 * SkeletonStatTile — the placeholder for a KPI row. This is the loading state
 * of the metric tiles at the top of `owner/OwnerOverviewPage`,
 * `owner/OwnerAnalyticsPage` and `AdminDashboard`: eyebrow label, a big numeral,
 * a delta chip, and a sparkline along the bottom of the tile.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * The sheen advances by exactly one tile of a `SWEEP_PERIOD`-wide tiled
 * gradient per cycle — a modulo cycle, the identity map — at intensity
 * `sin²(πt)`, exactly 0 at both ends. Each tile's elevation is `loopPulse`,
 * phased by the frame at which the light front crosses that tile, so the row
 * lifts left to right and every spring is exactly `0 − 0` at the bottom of its
 * cycle and exactly `1 − 1` once settled. The sparkline is a fixed polyline —
 * it is placeholder geometry, not data, and must not appear to animate.
 */

import type { FC } from "react";
import { AbsoluteFill } from "remotion";

import {
  CourtBackdrop,
  Eyebrow,
  ShimmerBlock,
  SkeletonPanel,
  Stage,
  cosWave,
  hairline,
  loopPulse,
  primary,
  sheenAxis,
  useLoopClock,
  useSweep,
  wrap,
} from "./shared";

export type SkeletonStatTileProps = {
  /** How many tiles are in the row. */
  tileCount: number;
  /** Tile height, in design-canvas px. */
  tileHeight: number;
  /** Gap between tiles. */
  tileGap: number;
  /** Draw the placeholder sparkline along the bottom of each tile. */
  showSparkline: boolean;
  /** Draw the delta chip beside the numeral. */
  showDelta: boolean;
  /** Caption above the row. Empty string hides it. */
  label: string;
};

export const skeletonStatTileDefaultProps: SkeletonStatTileProps = {
  tileCount: 4,
  tileHeight: 208,
  tileGap: 22,
  showSparkline: true,
  showDelta: true,
  label: "Loading this week",
};

const STAGE_W = 1200;
const STAGE_H = 460;
const SWEEP_PERIOD = 1720;
const SWEEP_START = -260;

const ROW_X = 60;
const ROW_Y = 132;
const ROW_W = 1080;

/**
 * A fixed sparkline shape. Deterministic on purpose: the tile is a placeholder,
 * so its chart must hold still. Anything sampled per frame would flicker.
 */
const SPARK = [0.34, 0.52, 0.41, 0.66, 0.58, 0.78, 0.7, 0.92];

export const SkeletonStatTile: FC<SkeletonStatTileProps> = ({
  tileCount,
  tileHeight,
  tileGap,
  showSparkline,
  showDelta,
  label,
}) => {
  const clock = useLoopClock();
  const { t, frame, fps, period, reduced } = clock;
  const sweep = useSweep(clock, SWEEP_PERIOD, SWEEP_START);

  const tiles = Math.max(1, Math.round(tileCount));
  const tileW = (ROW_W - (tiles - 1) * tileGap) / tiles;

  const passFrame = (gx: number, gy: number, w: number, h: number): number =>
    ((sheenAxis(gx + w / 2, gy + h / 2) - SWEEP_START) / SWEEP_PERIOD) * period;

  const liftOf = (gx: number, gy: number, w: number, h: number): number =>
    reduced
      ? 0
      : loopPulse({
          frame,
          fps,
          period,
          phase: wrap(passFrame(gx, gy, w, h) - 9, period),
          rise: 15,
          hold: 26,
          fall: 18,
        });

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.09} vignette={0.45} />

      <AbsoluteFill>
        {label.length > 0 ? (
          <Eyebrow x={ROW_X} y={78} color={primary(0.5 + 0.26 * cosWave(t))}>
            {label}
          </Eyebrow>
        ) : null}

        {Array.from({ length: tiles }, (_, i) => {
          const x = ROW_X + i * (tileW + tileGap);
          const lift = liftOf(x, ROW_Y, tileW, tileHeight);
          const pad = 24;
          const sparkH = 46;
          const sparkY = tileHeight - pad - sparkH;
          const sparkW = tileW - pad * 2;

          const points = SPARK.map((v, k) => {
            const px = pad + (k / (SPARK.length - 1)) * sparkW;
            const py = sparkY + sparkH - v * sparkH;
            return `${px},${py}`;
          }).join(" ");

          return (
            <SkeletonPanel
              key={i}
              x={x}
              y={ROW_Y}
              w={tileW}
              h={tileHeight}
              r={22}
              lift={lift}
            >
              {/* Icon chip + eyebrow label. */}
              <ShimmerBlock
                sweep={sweep}
                ox={x}
                oy={ROW_Y}
                x={pad}
                y={pad}
                w={34}
                h={34}
                r={11}
                tone="brand"
              />
              <ShimmerBlock
                sweep={sweep}
                ox={x}
                oy={ROW_Y}
                x={pad + 46}
                y={pad + 11}
                w={tileW - pad * 2 - 46}
                h={12}
                r={6}
                tone="faint"
              />

              {/* The numeral — the biggest thing on a stat tile, so the biggest
                  bar on its skeleton. */}
              <ShimmerBlock
                sweep={sweep}
                ox={x}
                oy={ROW_Y}
                x={pad}
                y={pad + 56}
                w={Math.min(tileW - pad * 2, 132)}
                h={34}
                r={10}
                tone="strong"
              />
              {showDelta ? (
                <ShimmerBlock
                  sweep={sweep}
                  ox={x}
                  oy={ROW_Y}
                  x={pad}
                  y={pad + 100}
                  w={78}
                  h={22}
                  r={11}
                  tone={i % 3 === 2 ? "warn" : "brand"}
                />
              ) : null}

              {showSparkline ? (
                <svg
                  width={tileW}
                  height={tileHeight}
                  viewBox={`0 0 ${tileW} ${tileHeight}`}
                  style={{ position: "absolute", inset: 0 }}
                >
                  <polyline
                    points={points}
                    fill="none"
                    stroke={hairline(1)}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={points}
                    fill="none"
                    stroke={primary(0.16 + 0.3 * lift)}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </SkeletonPanel>
          );
        })}
      </AbsoluteFill>
    </Stage>
  );
};
