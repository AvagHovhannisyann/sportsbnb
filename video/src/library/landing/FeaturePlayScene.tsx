/**
 * FeaturePlayScene — the payoff step of "How it works": you turn up and play.
 * Booking pass, directions, squad, and the venue knowing you are coming.
 * Follows FeatureBookScene in the marketing reel.
 * 1920×1080 · 30fps · 300 frames (10s) · one-shot scene.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring } from "remotion";

import {
  BRAND,
  CLAMP,
  EASE_OUT_EXPO,
  ENTER_SPRING,
  Eyebrow,
  FONT_DISPLAY,
  FONT_MONO,
  FONT_SANS,
  Grain,
  IconCheck,
  IconPin,
  IconWhistle,
  MaskedWords,
  Panel,
  StageWash,
  TAU,
  alpha,
  loopT,
  riseStyle,
  useSceneFrame,
} from "./shared";

/* ── Beat sheet ───────────────────────────────────────────────────────────
 *   0   step header
 *   8   headline
 *  44   body
 *  62   the booking pass arrives
 *  86   pass fields land, 9f apart
 * 124   the squad avatars pop in, 7f apart
 * 158   the check-in stamp presses on
 * 196   the three practical notes, 12f apart
 *
 * ── The pass, and why it is drawn rather than photographed ───────────────
 * A boarding-pass metaphor makes the abstract thing ("your booking") a
 * physical object the viewer already knows how to read: a stub, a perforation,
 * a stamp. It is drawn entirely from the design system's own surfaces — no
 * image asset, because this family is fully self-contained and a headless
 * render cannot fetch one.
 *
 * The perforation is a repeating-radial-gradient rather than N absolute divs,
 * which keeps the DOM small at 1920px and lets the notch spacing scale with
 * the card instead of being hard-coded.
 *
 * ── The one ambient motion ───────────────────────────────────────────────
 * The pass's edge glow breathes on a **modulo cycle** over `glowPeriod`
 * frames, so it is continuous if this scene is played on repeat and never
 * accumulates drift. Everything else is a one-shot spring.
 */

const SETTLED_FRAME = 268;

const Avatar: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly initials: string;
  readonly delay: number;
  readonly tint: string;
}> = ({ frame, fps, initials, delay, tint }) => {
  const p = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 170 },
    delay,
    durationInFrames: 22,
  });
  return (
    <div
      style={{
        width: 68,
        height: 68,
        marginLeft: -16,
        borderRadius: 999,
        backgroundColor: alpha(tint, 0.18),
        border: `2px solid ${BRAND.card}`,
        boxShadow: `0 0 0 1px ${alpha(tint, 0.4)}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT_DISPLAY,
        fontSize: 24,
        fontWeight: 600,
        color: tint,
        opacity: interpolate(p, [0, 0.4], [0, 1], CLAMP),
        transform: `scale(${interpolate(p, [0, 1], [0.55, 1])})`,
      }}
    >
      {initials}
    </div>
  );
};

const PassField: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly label: string;
  readonly value: string;
  readonly delay: number;
  readonly mono?: boolean;
}> = ({ frame, fps, label, value, delay, mono }) => (
  <div style={riseStyle(frame, fps, delay, 12, 22)}>
    <Eyebrow size={16} color={BRAND.muted}>
      {label}
    </Eyebrow>
    <div
      style={{
        marginTop: 8,
        fontFamily: mono ? FONT_MONO : FONT_DISPLAY,
        fontSize: 30,
        fontWeight: 600,
        fontVariantNumeric: mono ? "tabular-nums" : "normal",
        color: BRAND.fg,
      }}
    >
      {value}
    </div>
  </div>
);

const Note: FC<{
  readonly frame: number;
  readonly fps: number;
  readonly text: string;
  readonly delay: number;
}> = ({ frame, fps, text, delay }) => (
  <div
    style={{
      ...riseStyle(frame, fps, delay, 14, 24),
      display: "flex",
      gap: 16,
      alignItems: "flex-start",
      fontFamily: FONT_SANS,
      fontSize: 26,
      lineHeight: 1.5,
      color: BRAND.fgSoft,
    }}
  >
    <span style={{ color: BRAND.primary, display: "inline-flex", marginTop: 3 }}>
      <IconCheck size={24} />
    </span>
    <span>{text}</span>
  </div>
);

export type FeaturePlaySceneProps = {
  readonly stepNumber: string;
  readonly eyebrow: string;
  readonly headline: readonly string[];
  readonly accentFrom: number;
  readonly body: string;
  readonly venueName: string;
  readonly district: string;
  readonly dateLabel: string;
  readonly timeLabel: string;
  readonly durationLabel: string;
  readonly reference: string;
  readonly squad: readonly string[];
  readonly squadNote: string;
  readonly stampLabel: string;
  readonly notes: readonly string[];
  /** Frames per breath of the pass's edge glow. */
  readonly glowPeriod: number;
};

export const featurePlaySceneDefaultProps: FeaturePlaySceneProps = {
  stepNumber: "03",
  eyebrow: "Play",
  headline: ["Turn", "up", "and", "play."],
  accentFrom: 2,
  body: "The venue already knows you are coming. Show the pass at the gate, or just walk on — your name is on the sheet either way.",
  venueName: "Ararat Arena",
  district: "Kentron, Yerevan",
  dateLabel: "Thu 24 Jul",
  timeLabel: "19:00",
  durationLabel: "90 min",
  reference: "SB-4192-KT",
  squad: ["AH", "GM", "TS", "NK", "AV"],
  squadNote: "5 players confirmed",
  stampLabel: "Checked in",
  notes: [
    "Directions and parking in the app — no hunting for the entrance",
    "Message the venue directly if you are running late",
    "Cancellation terms were shown before you paid, not after",
  ],
  glowPeriod: 90,
};

export const FeaturePlayScene: FC<FeaturePlaySceneProps> = ({
  stepNumber,
  eyebrow,
  headline,
  accentFrom,
  body,
  venueName,
  district,
  dateLabel,
  timeLabel,
  durationLabel,
  reference,
  squad,
  squadNote,
  stampLabel,
  notes,
  glowPeriod,
}) => {
  const { frame, fps, period, scale } = useSceneFrame(SETTLED_FRAME);

  const pass = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    delay: 62,
    durationInFrames: 34,
  });

  /** Pressed on, so: underdamped and over-scaled. */
  const stamp = spring({
    frame,
    fps,
    config: { damping: 11, mass: 0.55, stiffness: 160 },
    delay: 158,
    durationInFrames: 28,
  });

  /** Modulo cycle — continuous across repeats, no drift. */
  const glow = 0.5 + 0.5 * Math.sin(TAU * loopT(frame, glowPeriod));

  const tints = [BRAND.primary, BRAND.cyan, BRAND.violet, BRAND.amber, BRAND.success];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <Sequence name="Stage">
        <StageWash frame={frame} period={period} />
      </Sequence>

      <AbsoluteFill
        style={{
          padding: "0 110px",
          flexDirection: "row",
          alignItems: "center",
          gap: 92,
        }}
      >
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <Sequence name="Step header">
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

          <Sequence name="Headline">
            <div
              style={{
                marginTop: 24,
                fontFamily: FONT_DISPLAY,
                fontSize: 92,
                fontWeight: 700,
                letterSpacing: "-0.038em",
                lineHeight: 1.02,
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

          <Sequence name="Body">
            <div
              style={{
                ...riseStyle(frame, fps, 44, 18),
                marginTop: 24,
                maxWidth: 620,
                fontFamily: FONT_SANS,
                fontSize: 27,
                lineHeight: 1.56,
                color: BRAND.fgSoft,
              }}
            >
              {body}
            </div>
          </Sequence>

          <Sequence name="Notes">
            <div
              style={{
                marginTop: 44,
                display: "flex",
                flexDirection: "column",
                gap: 18,
                maxWidth: 660,
              }}
            >
              {notes.map((note, i) => (
                <Note
                  key={note}
                  frame={frame}
                  fps={fps}
                  text={note}
                  delay={196 + i * 12}
                />
              ))}
            </div>
          </Sequence>
        </div>

        <Sequence name="Booking pass">
          <div
            style={{
              width: 720,
              flexShrink: 0,
              opacity: interpolate(pass, [0, 0.4], [0, 1], CLAMP),
              transform: `translateY(${interpolate(pass, [0, 1], [44, 0])}px) rotate(${interpolate(
                pass,
                [0, 1],
                [-2.4, 0],
              )}deg)`,
            }}
          >
            <Panel
              padding={0}
              radius={32}
              style={{
                overflow: "hidden",
                borderColor: alpha(BRAND.primary, 0.14 + glow * 0.1),
                boxShadow: `0 30px 70px -26px rgba(3,10,8,0.85), 0 0 ${
                  60 * glow
                }px -20px ${alpha(BRAND.primary, 0.35)}`,
              }}
            >
              <div style={{ padding: "40px 44px 34px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: 38,
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        color: BRAND.fg,
                      }}
                    >
                      {venueName}
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontFamily: FONT_SANS,
                        fontSize: 22,
                        color: BRAND.muted,
                      }}
                    >
                      <IconPin size={20} />
                      {district}
                    </div>
                  </div>
                  <span style={{ color: BRAND.primary, display: "inline-flex" }}>
                    <IconWhistle size={44} />
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 38,
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 24,
                  }}
                >
                  <PassField
                    frame={frame}
                    fps={fps}
                    label="Date"
                    value={dateLabel}
                    delay={86}
                  />
                  <PassField
                    frame={frame}
                    fps={fps}
                    label="Kick-off"
                    value={timeLabel}
                    delay={95}
                    mono
                  />
                  <PassField
                    frame={frame}
                    fps={fps}
                    label="Duration"
                    value={durationLabel}
                    delay={104}
                    mono
                  />
                </div>
              </div>

              {/* Perforation — one repeating gradient rather than N divs. */}
              <div
                style={{
                  height: 22,
                  backgroundImage: `repeating-radial-gradient(circle at 11px 11px, ${BRAND.bg} 0 7px, transparent 7px 22px)`,
                  backgroundSize: "22px 22px",
                  borderTop: `1px dashed ${BRAND.border}`,
                  borderBottom: `1px dashed ${BRAND.border}`,
                }}
              />

              <div
                style={{
                  padding: "34px 44px 40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 24,
                }}
              >
                <div>
                  <Eyebrow size={16} color={BRAND.muted}>
                    Reference
                  </Eyebrow>
                  <div
                    style={{
                      marginTop: 8,
                      fontFamily: FONT_MONO,
                      fontSize: 28,
                      letterSpacing: "0.08em",
                      color: BRAND.fgSoft,
                    }}
                  >
                    {reference}
                  </div>
                  <div
                    style={{
                      marginTop: 22,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", marginLeft: 16 }}>
                      {squad.map((initials, i) => (
                        <Avatar
                          key={initials}
                          frame={frame}
                          fps={fps}
                          initials={initials}
                          delay={124 + i * 7}
                          tint={tints[i % tints.length]}
                        />
                      ))}
                    </div>
                    <span
                      style={{
                        marginLeft: 20,
                        fontFamily: FONT_SANS,
                        fontSize: 21,
                        color: BRAND.muted,
                      }}
                    >
                      {squadNote}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    padding: "24px 30px",
                    borderRadius: 20,
                    border: `2px solid ${alpha(BRAND.primary, 0.5)}`,
                    color: BRAND.primary,
                    opacity: interpolate(stamp, [0, 0.3], [0, 1], CLAMP),
                    transform: `rotate(-8deg) scale(${interpolate(
                      stamp,
                      [0, 1],
                      [1.3, 1],
                    )})`,
                  }}
                >
                  <IconCheck size={34} />
                  <span
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {stampLabel}
                  </span>
                </div>
              </div>
            </Panel>
          </div>
        </Sequence>
      </AbsoluteFill>

      <Sequence name="Sheen">
        <AbsoluteFill
          style={{
            background: `linear-gradient(100deg, transparent 42%, ${alpha(
              BRAND.fg,
              0.04,
            )} 50%, transparent 58%)`,
            transform: `translateX(${interpolate(frame, [172, 236], [-120, 120], {
              ...CLAMP,
              easing: EASE_OUT_EXPO,
            })}%)`,
            opacity: interpolate(frame, [172, 186, 222, 236], [0, 1, 1, 0], CLAMP),
          }}
        />
      </Sequence>

      <Sequence name="Grain">
        <Grain frame={frame} period={period} scale={scale} />
      </Sequence>
    </AbsoluteFill>
  );
};
