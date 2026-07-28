/**
 * PayoutTimelineSteps — the four-stop payout timeline on /owner/earnings:
 * booking played → cleared → transfer sent → in your account.
 * One-way: the rail draws stop to stop and each reached stop resolves; stops
 * beyond the current one stay unfilled rather than pretending to be done.
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
  amber,
  countProgress,
  courtGreen,
  dram,
  eyebrowStyle,
  hairline,
  interpolateSafe,
  muted,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS_W = 900;

export type PayoutStop = {
  /** Stop title. */
  title: string;
  /** Timestamp or expectation under the title. */
  detail: string;
};

export type PayoutTimelineStepsProps = {
  /** The stops, earliest first. */
  stops: PayoutStop[];
  /** Index of the last completed stop. -1 means nothing has happened yet. */
  currentIndex: number;
  /** Amount the timeline is about, in dram. */
  amount: number;
  /** Mono caps heading. */
  title: string;
};

export const payoutTimelineStepsDefaultProps: PayoutTimelineStepsProps = {
  stops: [
    { title: "Slot played", detail: "Sat 20 Jul · 21:00" },
    { title: "Payment cleared", detail: "Sun 21 Jul · 09:14" },
    { title: "Transfer sent", detail: "Mon 22 Jul · 11:02" },
    { title: "In your account", detail: "Expected Wed 24 Jul" },
  ],
  currentIndex: 2,
  amount: 486000,
  title: "Payout timeline",
};

const RAIL_AT = 16;
const RAIL_PER_STOP = 22;
const STOP_FADE = 14;

export const PayoutTimelineSteps: FC<PayoutTimelineStepsProps> = ({
  stops,
  currentIndex,
  amount,
  title,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // One-way: the settled timeline is the message.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);
  const unit = width / CANVAS_W;

  const list = stops.length > 0 ? stops : [];
  const done = Math.max(-1, Math.min(list.length - 1, Math.round(currentIndex)));

  const railX = 96 * unit;
  const topY = 172 * unit;
  const stepY = (height - topY - 74 * unit) / Math.max(1, list.length - 1);

  /** The rail only ever draws as far as the stop that has actually happened. */
  const railFrames = RAIL_PER_STOP * Math.max(0, done);
  const railDraw = countProgress({
    frame,
    delay: RAIL_AT,
    duration: Math.max(1, railFrames),
  });
  const railHeight = stepY * Math.max(0, done) * (railFrames > 0 ? railDraw : 0);

  const stopDelay = (i: number): number => RAIL_AT + RAIL_PER_STOP * i;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(86% 60% at 30% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 74%)`,
        }}
      />

      <div style={{ position: "absolute", left: 54 * unit, top: 44 * unit }}>
        <div style={{ ...eyebrowStyle(unit * 1.05) }}>{title}</div>
        <div
          style={{
            marginTop: 10 * unit,
            fontFamily: MONO_FONT,
            fontVariantNumeric: "tabular-nums",
            fontSize: 40 * unit,
            fontWeight: 500,
            letterSpacing: -0.02 * 40 * unit,
            color: BRAND.foreground,
          }}
        >
          {dram(amount)}
        </div>
        <div
          style={{
            marginTop: 6 * unit,
            fontFamily: SANS_FONT,
            fontSize: 15 * unit,
            color: muted(0.9),
          }}
        >
          the whole booking price — nothing is withheld on the way
        </div>
      </div>

      <Sequence name="Rail" layout="none">
        {/* The unreached remainder of the rail, always visible so the shape of
            the journey is legible before it is complete. */}
        <div
          style={{
            position: "absolute",
            left: railX - 1.5 * unit,
            top: topY,
            width: 3 * unit,
            height: stepY * Math.max(0, list.length - 1),
            borderRadius: 999,
            backgroundColor: BRAND.input,
            opacity: interpolateSafe(frame, [0, 16], [0, 1]),
          }}
        />
        <div
          style={{
            position: "absolute",
            left: railX - 1.5 * unit,
            top: topY,
            width: 3 * unit,
            height: railHeight,
            borderRadius: 999,
            background: `linear-gradient(180deg, ${BRAND.primary}, ${courtGreen(0.5)})`,
            boxShadow: `0 0 ${14 * unit}px ${-3 * unit}px ${courtGreen(0.5)}`,
          }}
        />
      </Sequence>

      <Sequence name="Stops" layout="none">
        {list.map((stop, i) => {
          const delay = stopDelay(i);
          const appear = interpolateSafe(
            frame,
            [delay, delay + STOP_FADE],
            [0, 1],
          );
          const complete = i <= done;
          const isNext = i === done + 1;
          const y = topY + stepY * i;

          return (
            <div key={stop.title}>
              <div
                style={{
                  position: "absolute",
                  left: railX - 15 * unit,
                  top: y - 15 * unit,
                  width: 30 * unit,
                  height: 30 * unit,
                  borderRadius: 999,
                  backgroundColor: complete
                    ? BRAND.primary
                    : BRAND.background,
                  border: `${2.5 * unit}px solid ${complete ? BRAND.primary : isNext ? amber(0.8) : hairline(1)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: appear,
                  transform: `scale(${(0.7 + 0.3 * appear).toFixed(3)})`,
                  boxShadow: complete
                    ? `0 0 ${16 * unit}px ${-3 * unit}px ${courtGreen(0.55)}`
                    : "none",
                }}
              >
                {complete ? (
                  <svg width={15 * unit} height={15 * unit} viewBox="0 0 16 16">
                    <path
                      d="M3.2 8.4L6.4 11.6L12.8 4.8"
                      fill="none"
                      stroke={BRAND.primaryForeground}
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </div>

              <div
                style={{
                  position: "absolute",
                  left: railX + 34 * unit,
                  right: 54 * unit,
                  top: y - 21 * unit,
                  opacity: appear,
                  transform: `translateX(${((1 - appear) * 10 * unit).toFixed(2)}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: DISPLAY_FONT,
                    fontSize: 22 * unit,
                    fontWeight: 600,
                    color: complete ? BRAND.foreground : muted(0.95),
                  }}
                >
                  {stop.title}
                </div>
                <div
                  style={{
                    marginTop: 5 * unit,
                    fontFamily: SANS_FONT,
                    fontSize: 14.5 * unit,
                    color: isNext ? amber(0.9) : muted(0.8),
                  }}
                >
                  {stop.detail}
                </div>
              </div>
            </div>
          );
        })}
      </Sequence>
    </AbsoluteFill>
  );
};
