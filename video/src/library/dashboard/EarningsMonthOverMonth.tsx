/**
 * EarningsMonthOverMonth — the comparison behind the "+12%" badge on the owner
 * dashboard's revenue tile, drawn out so the badge is checkable.
 * One-way: two columns rise to their real heights and both figures land
 * exactly, then the delta chip resolves from the two figures themselves.
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  countProgress,
  countTo,
  courtGreen,
  dram,
  eyebrowStyle,
  hairline,
  ink,
  interpolateSafe,
  muted,
  rose,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS_W = 1200;

export type EarningsMonthOverMonthProps = {
  /** Previous month's revenue, in dram. */
  previous: number;
  /** Current month's revenue, in dram. */
  current: number;
  /** Label under the left column. */
  previousLabel: string;
  /** Label under the right column. */
  currentLabel: string;
  /** Mono caps heading. */
  title: string;
};

export const earningsMonthOverMonthDefaultProps: EarningsMonthOverMonthProps = {
  previous: 1446000,
  current: 1620000,
  previousLabel: "June",
  currentLabel: "July",
  title: "Revenue, month over month",
};

const PREV_DELAY = 16;
const CUR_DELAY = 34;
const GROW_DURATION = 64;
const SETTLED = CUR_DELAY + GROW_DURATION;

/**
 * The change, computed from the two figures rather than written as a literal.
 * `changeOf` in OwnerOverviewPage refuses to show a badge when the prior
 * period is zero, and so does this — an invented percentage on someone's own
 * business dashboard is worse than no percentage.
 */
const changeOf = (now: number, before: number): string | null => {
  if (before === 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
};

export const EarningsMonthOverMonth: FC<EarningsMonthOverMonthProps> = ({
  previous,
  current,
  previousLabel,
  currentLabel,
  title,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: the settled comparison is the message.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = width / CANVAS_W;

  const ceiling = Math.max(previous, current, 1);

  const prevGrow = countProgress({
    frame,
    delay: PREV_DELAY,
    duration: GROW_DURATION,
  });
  const curGrow = countProgress({
    frame,
    delay: CUR_DELAY,
    duration: GROW_DURATION,
  });

  const prevShown = countTo({
    frame,
    from: 0,
    to: previous,
    delay: PREV_DELAY,
    duration: GROW_DURATION,
  });
  const curShown = countTo({
    frame,
    from: 0,
    to: current,
    delay: CUR_DELAY,
    duration: GROW_DURATION,
  });

  const change = changeOf(current, previous);
  const up = current >= previous;
  const accent = up ? BRAND.primary : BRAND.destructive;

  const plotTop = height * 0.24;
  const plotBottom = height * 0.72;
  const plotHeight = plotBottom - plotTop;
  const colWidth = 168 * unit;
  const gap = 120 * unit;
  const leftX = width / 2 - colWidth - gap / 2;
  const rightX = width / 2 + gap / 2;

  const Column: FC<{
    x: number;
    grow: number;
    value: number;
    shown: number;
    label: string;
    color: string;
    glowAlpha: number;
  }> = ({ x, grow, value, shown, label, color, glowAlpha }) => {
    const full = (value / ceiling) * plotHeight;
    const h = full * grow;
    return (
      <>
        <div
          style={{
            position: "absolute",
            left: x,
            top: plotBottom - h,
            width: colWidth,
            height: h,
            borderRadius: `${12 * unit}px ${12 * unit}px ${4 * unit}px ${4 * unit}px`,
            background: `linear-gradient(180deg, ${color} 0%, ${color} 40%, ${BRAND.surface2} 100%)`,
            boxShadow: `0 0 ${28 * unit}px ${-6 * unit}px ${courtGreen(glowAlpha)}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: x,
            width: colWidth,
            top: plotBottom - h - 44 * unit,
            textAlign: "center",
            fontFamily: MONO_FONT,
            fontVariantNumeric: "tabular-nums",
            fontSize: 26 * unit,
            fontWeight: 500,
            color: BRAND.foreground,
            opacity: grow > 0 ? 1 : 0,
          }}
        >
          {dram(shown)}
        </div>
        <div
          style={{
            position: "absolute",
            left: x,
            width: colWidth,
            top: plotBottom + 20 * unit,
            textAlign: "center",
            fontFamily: SANS_FONT,
            fontSize: 18 * unit,
            color: BRAND.foregroundSoft,
          }}
        >
          {label}
        </div>
      </>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(80% 70% at 50% 4%, ${BRAND.surface1} 0%, ${BRAND.background} 74%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: width * 0.08,
          top: height * 0.1,
          ...eyebrowStyle(unit * 1.2),
        }}
      >
        {title}
      </div>

      <Sequence name="Columns" layout="none">
        {/* Baseline the columns stand on. */}
        <div
          style={{
            position: "absolute",
            left: width * 0.08,
            right: width * 0.08,
            top: plotBottom,
            height: 1 * unit,
            backgroundColor: hairline(1),
          }}
        />

        <Column
          x={leftX}
          grow={prevGrow}
          value={previous}
          shown={prevShown}
          label={previousLabel}
          color={BRAND.surface3}
          glowAlpha={0}
        />
        <Column
          x={rightX}
          grow={curGrow}
          value={current}
          shown={curShown}
          label={currentLabel}
          color={accent}
          glowAlpha={0.35 * curGrow}
        />
      </Sequence>

      {change ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: height * 0.85,
            display: "flex",
            justifyContent: "center",
            opacity: interpolateSafe(frame, [SETTLED - 12, SETTLED + 6], [0, 1]),
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12 * unit,
              padding: `${11 * unit}px ${20 * unit}px`,
              borderRadius: 999,
              backgroundColor: up ? BRAND.primarySoft : "hsla(358, 68%, 42%, 0.16)",
              border: `${1 * unit}px solid ${up ? courtGreen(0.3) : rose(0.35)}`,
            }}
          >
            <svg width={14 * unit} height={14 * unit} viewBox="0 0 12 12">
              <path
                d={up ? "M6 10V2.6M6 2.6L2.9 5.7M6 2.6L9.1 5.7" : "M6 2V9.4M6 9.4L2.9 6.3M6 9.4L9.1 6.3"}
                fill="none"
                stroke={accent}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: 19 * unit,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: accent,
              }}
            >
              {change}
            </span>
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 16 * unit,
                color: muted(0.95),
              }}
            >
              against {previousLabel} · {dram(Math.abs(current - previous))}{" "}
              {up ? "more" : "less"}
            </span>
          </div>
        </div>
      ) : null}

      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 100% at 50% 46%, transparent 52%, ${ink(0.42)} 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
