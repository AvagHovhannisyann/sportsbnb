/**
 * FeatureManageScene — the owner's side of the product, matching the "For
 * venue owners" band of `src/pages/HomePage.tsx`: a week of empty hours
 * filling up, and a payout that is the whole of the price.
 * 1920×1080 · 30fps · 330 frames (11s) · one-shot scene.
 */

import { Fragment, type FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring } from "remotion";

import {
  BRAND,
  CLAMP,
  ENTER_SPRING,
  Eyebrow,
  FONT_DISPLAY,
  FONT_MONO,
  FONT_SANS,
  Grain,
  IconChart,
  IconWallet,
  MaskedWords,
  Meter,
  Panel,
  SETTLE_SPRING,
  StageWash,
  alpha,
  groupNumber,
  riseStyle,
  useCountUp,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   step header
 *   8   headline
 *  44   body
 *  64   calendar panel arrives
 *  84   the 7×6 slot grid fills on a diagonal, 2f apart
 * 178   the occupancy meter and its number settle
 * 200   payout panel arrives
 * 218   the payout figure counts up
 * 250   the commission row states zero
 * 272   the four owner facts land, 10f apart
 *
 * ── Why the grid fills diagonally ────────────────────────────────────────
 * Ranked by `col + row` rather than by index, so the calendar populates as a
 * wave crossing the panel instead of as a raster scan. Same device as the dot
 * grid in StatVenuesListed, and the reason both read as "filling up" rather
 * than as "switching on".
 *
 * ── Commercial accuracy ───────────────────────────────────────────────────
 * The payout equals gross takings exactly. SportsBnB charges **zero
 * commission** — the owner keeps 100% of the price they set. The commission
 * row exists precisely to show a zero, and `commissionRate` is typed as a
 * number only so the composition can *prove* the arithmetic on screen; the
 * default is and should stay 0.
 */

const SETTLED_FRAME = 306;

type Booking = {
  /** 0…6, Monday first. */
  readonly day: number;
  /** Row in the evening block, 0…5. */
  readonly hour: number;
};

const CalendarGrid: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly dayLabels: readonly string[];
  readonly hourLabels: readonly string[];
  readonly booked: readonly Booking[];
  readonly startAt: number;
}> = ({ frame, fps, dayLabels, hourLabels, booked, startAt }) => {
  const isBooked = (day: number, hour: number): boolean => {
    for (let i = 0; i < booked.length; i += 1) {
      if (booked[i].day === day && booked[i].hour === hour) {
        return true;
      }
    }
    return false;
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `72px repeat(${dayLabels.length}, 1fr)`,
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span />
        {dayLabels.map((label) => (
          <span
            key={label}
            style={{
              textAlign: "center",
              fontFamily: FONT_MONO,
              fontSize: 20,
              color: BRAND.muted,
            }}
          >
            {label}
          </span>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `72px repeat(${dayLabels.length}, 1fr)`,
          gap: 10,
        }}
      >
        {hourLabels.map((hourLabel, row) => (
          <Fragment key={`row-${hourLabel}`}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                fontFamily: FONT_MONO,
                fontSize: 19,
                fontVariantNumeric: "tabular-nums",
                color: BRAND.muted,
              }}
            >
              {hourLabel}
            </span>
            {dayLabels.map((dayLabel, col) => {
              const on = isBooked(col, row);
              /** Diagonal rank — the panel fills as a wave. */
              const p = spring({
                frame,
                fps,
                config: ENTER_SPRING,
                delay: startAt + (col + row) * 2,
                durationInFrames: 20,
              });
              return (
                <div
                  key={`c-${dayLabel}-${hourLabel}`}
                  style={{
                    height: 46,
                    borderRadius: 10,
                    backgroundColor: on
                      ? alpha(BRAND.primary, 0.2)
                      : alpha(BRAND.fg, 0.035),
                    border: `1px solid ${
                      on ? alpha(BRAND.primary, 0.42) : alpha(BRAND.border, 0.9)
                    }`,
                    opacity: interpolate(p, [0, 0.4], [0, 1], CLAMP),
                    transform: `scale(${interpolate(p, [0, 1], [0.72, 1])})`,
                  }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

const OwnerFact: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly term: string;
  readonly value: string;
  readonly note: string;
  readonly delay: number;
}> = ({ frame, fps, term, value, note, delay }) => (
  <div
    style={{
      ...riseStyle(frame, fps, delay, 16, 26),
      flex: "1 1 0",
      padding: 26,
      borderRadius: 20,
      backgroundColor: alpha(BRAND.fg, 0.04),
      border: `1px solid ${BRAND.border}`,
    }}
  >
    <Eyebrow size={16} color={BRAND.muted}>
      {term}
    </Eyebrow>
    <div
      style={{
        marginTop: 10,
        fontFamily: FONT_DISPLAY,
        fontSize: 40,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        fontVariantNumeric: "tabular-nums",
        color: BRAND.fg,
      }}
    >
      {value}
    </div>
    <div
      style={{
        marginTop: 8,
        fontFamily: FONT_SANS,
        fontSize: 19,
        lineHeight: 1.4,
        color: BRAND.muted,
      }}
    >
      {note}
    </div>
  </div>
);

export type FeatureManageSceneProps = {
  readonly stepNumber: string;
  readonly eyebrow: string;
  readonly headline: readonly string[];
  readonly accentFrom: number;
  readonly body: string;
  readonly dayLabels: readonly string[];
  readonly hourLabels: readonly string[];
  readonly booked: readonly Booking[];
  readonly occupancyLabel: string;
  readonly currency: string;
  /** Gross takings for the week. */
  readonly grossTakings: number;
  /** Zero. The owner keeps 100% — see the file header. */
  readonly commissionRate: number;
  readonly facts: readonly {
    readonly term: string;
    readonly value: string;
    readonly note: string;
  }[];
};

export const featureManageSceneDefaultProps: FeatureManageSceneProps = {
  stepNumber: "04",
  eyebrow: "Manage",
  headline: ["Fill", "the", "empty", "hours."],
  accentFrom: 2,
  body: "List once, set your hours and price, then take bookings around the clock. We collect payment; you get a weekly payout with every booking itemised.",
  dayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  hourLabels: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"],
  booked: [
    { day: 0, hour: 2 },
    { day: 0, hour: 3 },
    { day: 1, hour: 1 },
    { day: 1, hour: 2 },
    { day: 1, hour: 4 },
    { day: 2, hour: 2 },
    { day: 2, hour: 3 },
    { day: 2, hour: 4 },
    { day: 3, hour: 0 },
    { day: 3, hour: 2 },
    { day: 3, hour: 3 },
    { day: 3, hour: 4 },
    { day: 4, hour: 1 },
    { day: 4, hour: 2 },
    { day: 4, hour: 3 },
    { day: 4, hour: 4 },
    { day: 4, hour: 5 },
    { day: 5, hour: 1 },
    { day: 5, hour: 2 },
    { day: 5, hour: 3 },
    { day: 5, hour: 5 },
    { day: 6, hour: 2 },
    { day: 6, hour: 3 },
  ],
  occupancyLabel: "of your evening slots booked this week",
  currency: "AMD",
  grossTakings: 276000,
  commissionRate: 0,
  facts: [
    { term: "Commission", value: "0%", note: "No listing fee, no monthly cost" },
    { term: "Payouts", value: "Weekly", note: "Itemised, straight to your account" },
    { term: "Setup", value: "10 min", note: "Photos, hours, price — that's it" },
    { term: "Support", value: "Direct", note: "Message players inside the app" },
  ],
};

export const FeatureManageScene: FC<FeatureManageSceneProps> = ({
  stepNumber,
  eyebrow,
  headline,
  accentFrom,
  body,
  dayLabels,
  hourLabels,
  booked,
  occupancyLabel,
  currency,
  grossTakings,
  commissionRate,
  facts,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME);

  const calendar = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 64,
    durationInFrames: 32,
  });
  const payoutPanel = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 200,
    durationInFrames: 30,
  });

  const totalCells = dayLabels.length * hourLabels.length;
  const occupancy = booked.length / totalCells;
  const occupancyP = spring({
    frame,
    fps,
    config: SETTLE_SPRING,
    delay: 178,
    durationInFrames: 36,
  });

  const commission = Math.round(grossTakings * commissionRate);
  const payout = grossTakings - commission;
  const { shown: shownPayout } = useCountUp(frame, fps, payout, 218, 40);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} />
      </Sequence>

      <AbsoluteFill style={{ padding: "72px 100px", justifyContent: "center" }}>
        <Sequence name="Step header" layout="none">
          <div
            style={{
              ...riseStyle(frame, fps, 0, 14, 24),
              display: "flex",
              alignItems: "center",
              gap: 22,
            }}
          >
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 26,
                fontVariantNumeric: "tabular-nums",
                color: BRAND.primary,
              }}
            >
              {stepNumber}
            </span>
            <span
              style={{
                width: 110,
                height: 1,
                backgroundColor: BRAND.border,
                display: "inline-block",
              }}
            />
            <Eyebrow size={22}>{eyebrow}</Eyebrow>
          </div>
        </Sequence>

        <div style={{ display: "flex", gap: 60, marginTop: 22 }}>
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <Sequence name="Headline" layout="none">
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 76,
                  fontWeight: 700,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.03,
                  color: BRAND.fg,
                }}
              >
                <MaskedWords
                  frame={frame}
                  fps={fps}
                  words={headline}
                  delay={8}
                  accentFrom={accentFrom}
                />
              </div>
            </Sequence>

            <Sequence name="Body" layout="none">
              <div
                style={{
                  ...riseStyle(frame, fps, 44, 18),
                  marginTop: 22,
                  maxWidth: 580,
                  fontFamily: FONT_SANS,
                  fontSize: 25,
                  lineHeight: 1.56,
                  color: BRAND.fgSoft,
                }}
              >
                {body}
              </div>
            </Sequence>

            <Sequence name="Payout" layout="none">
              <div
                style={{
                  marginTop: 38,
                  opacity: interpolate(payoutPanel, [0, 0.4], [0, 1], CLAMP),
                  transform: `translateY(${interpolate(
                    payoutPanel,
                    [0, 1],
                    [30, 0],
                  )}px)`,
                }}
              >
                <Panel padding={34} radius={26}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      color: BRAND.primary,
                    }}
                  >
                    <IconWallet size={28} />
                    <Eyebrow size={18}>This week's payout</Eyebrow>
                  </div>
                  <div
                    style={{
                      marginTop: 18,
                      display: "flex",
                      alignItems: "baseline",
                      gap: 14,
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 700,
                      letterSpacing: "-0.03em",
                      color: BRAND.fg,
                    }}
                  >
                    <span style={{ fontSize: 34, color: BRAND.fgSoft }}>
                      {currency}
                    </span>
                    <span
                      style={{ fontSize: 78, fontVariantNumeric: "tabular-nums" }}
                    >
                      {groupNumber(shownPayout)}
                    </span>
                  </div>
                  <div
                    style={{
                      ...riseStyle(frame, fps, 250, 10, 24),
                      marginTop: 18,
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: FONT_MONO,
                      fontSize: 22,
                      fontVariantNumeric: "tabular-nums",
                      color: BRAND.muted,
                    }}
                  >
                    <span>SportsBnB commission</span>
                    <span style={{ color: BRAND.primary }}>
                      {currency} {groupNumber(commission)}
                    </span>
                  </div>
                </Panel>
              </div>
            </Sequence>
          </div>

          <Sequence name="Calendar" layout="none">
            <div
              style={{
                width: 980,
                flexShrink: 0,
                opacity: interpolate(calendar, [0, 0.4], [0, 1], CLAMP),
                transform: `translateY(${interpolate(calendar, [0, 1], [36, 0])}px)`,
              }}
            >
              <Panel padding={38} radius={30}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 26,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      color: BRAND.cyan,
                    }}
                  >
                    <IconChart size={26} />
                    <Eyebrow size={18} color={BRAND.cyan}>
                      Your week
                    </Eyebrow>
                  </div>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 22,
                      fontVariantNumeric: "tabular-nums",
                      color: BRAND.primary,
                    }}
                  >
                    {Math.round(occupancyP * occupancy * 100)}% {occupancyLabel}
                  </span>
                </div>

                <CalendarGrid
                  frame={frame}
                  fps={fps}
                  dayLabels={dayLabels}
                  hourLabels={hourLabels}
                  booked={booked}
                  startAt={84}
                />

                <div style={{ marginTop: 28 }}>
                  <Meter progress={occupancyP * occupancy} height={8} radius={4} />
                </div>
              </Panel>
            </div>
          </Sequence>
        </div>

        <Sequence name="Owner facts" layout="none">
          <div style={{ marginTop: 42, display: "flex", gap: 20 }}>
            {facts.map((fact, i) => (
              <OwnerFact
                key={fact.term}
                frame={frame}
                fps={fps}
                term={fact.term}
                value={fact.value}
                note={fact.note}
                delay={272 + i * 10}
              />
            ))}
          </div>
        </Sequence>
      </AbsoluteFill>

      <Sequence name="Grain">
        <Grain frame={frame} period={period} scale={scale} />
      </Sequence>
    </AbsoluteFill>
  );
};
