/**
 * TestimonialPlayerCard — a player's words, as a portrait social card for the
 * social-proof strip beneath "Why it's different" in `src/pages/HomePage.tsx`.
 * 1080×1350 · 30fps · 270 frames (9s) · one-shot reveal.
 */

import type { FC } from "react";
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
  IconCheck,
  IconPin,
  IconQuote,
  IconStar,
  Panel,
  StageWash,
  alpha,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   card arrives
 *  16   quote mark
 *  26   the quote, revealed clause by clause (14f apart)
 * 104   the five rating stars, 6f apart
 * 140   attribution — avatar, name, city
 * 176   the booking chip that backs the claim up
 *
 * ── Why the quote reveals by clause, not by word or by character ─────────
 * Word-by-word is right for a headline of three or four words; on a
 * thirty-word testimonial it turns into a slot machine. Character-by-character
 * would read as a chat message, which is the wrong register for a quotation.
 * Splitting on the author's own punctuation gives the reveal the same rhythm a
 * person would use reading it aloud, and the stagger cap keeps the last clause
 * from arriving embarrassingly late.
 *
 * ── The booking chip ──────────────────────────────────────────────────────
 * A testimonial without evidence is decoration. The chip states the actual
 * booking behind the quote — venue, slot, price — with the price equal to the
 * listed price, because SportsBnB adds no commission at checkout.
 */

const SETTLED_FRAME = 240;

const Clause: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly text: string;
  readonly delay: number;
  readonly accent: boolean;
}> = ({ frame, fps, text, delay, accent }) => {
  const p = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay,
    durationInFrames: 28,
  });
  return (
    <span
      style={{
        display: "inline",
        opacity: interpolate(p, [0, 0.45], [0, 1], CLAMP),
        color: accent ? BRAND.primary : BRAND.fg,
      }}
    >
      {text}{" "}
    </span>
  );
};

const RatingStars: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly rating: number;
  readonly startAt: number;
}> = ({ frame, fps, rating, startAt }) => (
  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
    {Array.from({ length: 5 }, (_unused, i) => {
      const p = spring({
        frame,
        fps,
        config: { damping: 12, mass: 0.5, stiffness: 180 },
        delay: startAt + i * 6,
        durationInFrames: 20,
      });
      const filled = i < Math.round(rating);
      return (
        <span
          key={`star-${i}`}
          style={{
            display: "inline-flex",
            color: filled ? BRAND.amber : alpha(BRAND.fg, 0.16),
            opacity: interpolate(p, [0, 0.4], [0, 1], CLAMP),
            transform: `scale(${interpolate(p, [0, 1], [0.4, 1])})`,
          }}
        >
          <IconStar size={38} />
        </span>
      );
    })}
    <span
      style={{
        marginLeft: 12,
        fontFamily: FONT_MONO,
        fontSize: 30,
        fontVariantNumeric: "tabular-nums",
        color: BRAND.fgSoft,
        opacity: interpolate(frame, [startAt + 30, startAt + 44], [0, 1], CLAMP),
      }}
    >
      {rating.toFixed(1)}
    </span>
  </div>
);

export type TestimonialPlayerCardProps = {
  readonly eyebrow: string;
  /** Split on the author's own punctuation — see the file header. */
  readonly clauses: readonly string[];
  /** Indices of clauses set in `--primary`, the line the card is really for. */
  readonly accentClauses: readonly number[];
  readonly rating: number;
  readonly name: string;
  readonly initials: string;
  readonly role: string;
  readonly city: string;
  readonly bookingChip: string;
};

export const testimonialPlayerCardDefaultProps: TestimonialPlayerCardProps = {
  eyebrow: "Players",
  clauses: [
    "We used to spend twenty minutes ringing round pitches on a Thursday afternoon,",
    "and half the time we still turned up to find someone else on it.",
    "Now I book the slot on the way home from work",
    "and it is ours before I get off the bus.",
  ],
  accentClauses: [2, 3],
  rating: 5,
  name: "Aram Hovhannisyan",
  initials: "AH",
  role: "Plays 5-a-side, twice a week",
  city: "Kentron, Yerevan",
  bookingChip: "Ararat Arena · Thu 19:00 · 90 min · AMD 12,000",
};

export const TestimonialPlayerCard: FC<TestimonialPlayerCardProps> = ({
  eyebrow,
  clauses,
  accentClauses,
  rating,
  name,
  initials,
  role,
  city,
  bookingChip,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME, 1080);

  const card = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 0,
    durationInFrames: 34,
  });
  const attribution = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 140,
    durationInFrames: 30,
  });

  const isAccent = (index: number): boolean => {
    for (let i = 0; i < accentClauses.length; i += 1) {
      if (accentClauses[i] === index) {
        return true;
      }
    }
    return false;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} />
      </Sequence>

      <AbsoluteFill style={{ padding: 56 }}>
        <div
          style={{
            height: "100%",
            opacity: interpolate(card, [0, 0.4], [0, 1], CLAMP),
            transform: `translateY(${interpolate(card, [0, 1], [40, 0])}px)`,
          }}
        >
          <Panel
            padding={56}
            radius={40}
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <Sequence name="Header">
                <div
                  style={{
                    ...riseStyle(frame, fps, 8, 12, 22),
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Eyebrow size={22}>{eyebrow}</Eyebrow>
                  <span
                    style={{
                      display: "inline-flex",
                      color: alpha(BRAND.primary, 0.35),
                      opacity: interpolate(frame, [16, 34], [0, 1], CLAMP),
                    }}
                  >
                    <IconQuote size={68} />
                  </span>
                </div>
              </Sequence>

              <Sequence name="Quote">
                <div
                  style={{
                    marginTop: 40,
                    fontFamily: FONT_DISPLAY,
                    fontSize: 52,
                    fontWeight: 600,
                    lineHeight: 1.26,
                    letterSpacing: "-0.022em",
                    color: BRAND.fg,
                  }}
                >
                  {clauses.map((clause, i) => (
                    <Clause
                      key={clause}
                      frame={frame}
                      fps={fps}
                      text={clause}
                      delay={26 + i * 14}
                      accent={isAccent(i)}
                    />
                  ))}
                </div>
              </Sequence>
            </div>

            <div>
              <Sequence name="Rating">
                <div style={riseStyle(frame, fps, 100, 12, 24)}>
                  <RatingStars
                    frame={frame}
                    fps={fps}
                    rating={rating}
                    startAt={104}
                  />
                </div>
              </Sequence>

              <Sequence name="Attribution">
                <div
                  style={{
                    marginTop: 40,
                    paddingTop: 36,
                    borderTop: `1px solid ${BRAND.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                    opacity: interpolate(attribution, [0, 0.4], [0, 1], CLAMP),
                    transform: `translateY(${interpolate(
                      attribution,
                      [0, 1],
                      [20, 0],
                    )}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: 999,
                      backgroundColor: alpha(BRAND.primary, 0.16),
                      border: `1px solid ${alpha(BRAND.primary, 0.34)}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: FONT_DISPLAY,
                      fontSize: 34,
                      fontWeight: 600,
                      color: BRAND.primary,
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: 34,
                        fontWeight: 600,
                        color: BRAND.fg,
                      }}
                    >
                      {name}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontFamily: FONT_SANS,
                        fontSize: 24,
                        color: BRAND.muted,
                      }}
                    >
                      {role}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontFamily: FONT_SANS,
                        fontSize: 23,
                        color: BRAND.muted,
                      }}
                    >
                      <IconPin size={20} />
                      {city}
                    </div>
                  </div>
                </div>
              </Sequence>

              <Sequence name="Booking chip">
                <div
                  style={{
                    ...riseStyle(frame, fps, 176, 14, 26),
                    marginTop: 32,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "20px 26px",
                    borderRadius: 18,
                    border: `1px solid ${alpha(BRAND.primary, 0.24)}`,
                    backgroundColor: alpha(BRAND.primary, 0.08),
                    fontFamily: FONT_MONO,
                    fontSize: 22,
                    fontVariantNumeric: "tabular-nums",
                    color: BRAND.primary,
                  }}
                >
                  <IconCheck size={22} />
                  {bookingChip}
                </div>
              </Sequence>
            </div>
          </Panel>
        </div>
      </AbsoluteFill>

      <Sequence name="Grain">
        <Grain frame={frame} period={period} scale={scale} opacity={0.045} />
      </Sequence>
    </AbsoluteFill>
  );
};
