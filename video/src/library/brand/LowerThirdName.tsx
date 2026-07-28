/**
 * LowerThirdName — the name plate: an accent bar strikes in, a glass panel
 * opens off it, and name and role rise inside. Used over talking-head footage
 * in the owner testimonials and the launch film, and over player interviews in
 * the community league recaps.
 */

import type { FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  SPRING_ENTER,
  SPRING_SMOOTH,
  TRACKING_EYEBROW,
  TRACKING_TIGHT,
  chalk,
  courtGreen,
  hairline,
  ink,
  useBrandFrame,
} from "./brandKit";
import { MarkTile, MonogramGlyph } from "./BrandGeometry";

export type LowerThirdNameProps = {
  readonly name: string;
  readonly role: string;
  /** Mono caps line above the name. Empty string hides it. */
  readonly kicker: string;
  readonly showMark: boolean;
  /** Frame the plate starts opening. */
  readonly enterAtFrame: number;
  /** Frame the plate starts closing. */
  readonly exitAtFrame: number;
  /** Distance from the left edge, as a fraction of canvas width. */
  readonly insetX: number;
  /** Distance from the bottom edge, as a fraction of canvas height. */
  readonly insetY: number;
  readonly accentColor: string;
};

export const lowerThirdNameDefaultProps: LowerThirdNameProps = {
  name: "Anahit Grigoryan",
  role: "Owner · Arena Nord, Yerevan",
  kicker: "Host since 2024",
  showMark: true,
  enterAtFrame: 6,
  exitAtFrame: 140,
  insetX: 0.08,
  insetY: 0.14,
  accentColor: BRAND.primary,
};

export const LowerThirdName: FC<LowerThirdNameProps> = ({
  name,
  role,
  kicker,
  showMark,
  enterAtFrame,
  exitAtFrame,
  insetX,
  insetY,
  accentColor,
}) => {
  /** Poster mid-hold: a reduced-motion viewer should see the plate open. */
  const frame = useBrandFrame(0.45);
  const { fps, width, height } = useVideoConfig();

  const scale = width / 1920;
  const nameSize = height * 0.045;

  /** The accent bar strikes first, and everything else hangs off it. */
  const barIn = spring({
    frame,
    fps,
    delay: enterAtFrame,
    config: SPRING_ENTER,
    durationInFrames: 20,
  });
  const panelIn = spring({
    frame,
    fps,
    delay: enterAtFrame + 5,
    config: SPRING_SMOOTH,
    durationInFrames: 26,
  });
  const nameIn = spring({
    frame,
    fps,
    delay: enterAtFrame + 12,
    config: SPRING_ENTER,
    durationInFrames: 24,
  });
  const roleIn = spring({
    frame,
    fps,
    delay: enterAtFrame + 17,
    config: SPRING_ENTER,
    durationInFrames: 24,
  });
  const kickerIn = spring({
    frame,
    fps,
    delay: enterAtFrame + 22,
    config: SPRING_SMOOTH,
    durationInFrames: 22,
  });

  /** Exit is its own spring, subtracted — the plate closes the way it opened. */
  const out = spring({
    frame,
    fps,
    delay: exitAtFrame,
    config: SPRING_SMOOTH,
    durationInFrames: 22,
  });

  const open = Math.max(0, panelIn - out);
  const barOpen = Math.max(0, barIn - out);
  const alive = Math.max(0, 1 - out);

  const gate = (p: number) => ({
    overflow: "hidden" as const,
    paddingTop: nameSize * 0.18,
    paddingBottom: nameSize * 0.18,
    marginTop: -nameSize * 0.18,
    marginBottom: -nameSize * 0.18,
    opacity: Math.max(0, p - out),
  });

  const rise = (p: number) =>
    `translateY(${interpolate(Math.max(0, p - out), [0, 1], [nameSize * 1.1, 0], {
      easing: EASE_OUT_EXPO,
    })}px)`;

  return (
    <AbsoluteFill>
      <Sequence name="Plate" layout="none">
        <AbsoluteFill
          style={{
            alignItems: "flex-start",
            justifyContent: "flex-end",
            paddingLeft: width * insetX,
            paddingBottom: height * insetY,
          }}
        >
          <div style={{ display: "flex", alignItems: "stretch" }}>
            {/* Accent bar — grows vertically, so it reads as a strike. */}
            <div
              style={{
                width: Math.max(3, 6 * scale),
                borderRadius: 999,
                backgroundColor: accentColor,
                transformOrigin: "bottom center",
                transform: `scaleY(${barOpen})`,
                boxShadow: `0 0 ${28 * scale}px ${courtGreen(0.55 * barOpen)}`,
              }}
            />

            {/*
              The panel animates its *width*, not scaleX: scaling the box would
              squash every glyph inside it. Text is clipped by the overflow
              instead, which is what makes it read as being uncovered.
            */}
            <div
              style={{
                marginLeft: 18 * scale,
                overflow: "hidden",
                borderRadius: 18 * scale,
                border: `1px solid ${hairline(alive)}`,
                background: `linear-gradient(120deg, ${ink(0.86 * alive)} 0%, ${ink(0.62 * alive)} 100%)`,
                boxShadow: `0 ${20 * scale}px ${46 * scale}px ${-14 * scale}px ${ink(0.8 * alive)}`,
                transform: `scaleX(${0.965 + 0.035 * open})`,
                transformOrigin: "left center",
                maxWidth: `${100 * open}%`,
                width: "max-content",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22 * scale,
                  paddingLeft: 26 * scale,
                  paddingRight: 38 * scale,
                  paddingTop: 20 * scale,
                  paddingBottom: 20 * scale,
                }}
              >
                {showMark ? (
                  <div
                    style={{
                      opacity: open,
                      transform: `scale(${interpolate(open, [0, 1], [0.7, 1])})`,
                    }}
                  >
                    <MarkTile size={nameSize * 1.7} glow={0.5 * alive} radiusRatio={0.3}>
                      <MonogramGlyph size={nameSize * 1.35} ring={0.8} />
                    </MarkTile>
                  </div>
                ) : null}

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {kicker.length > 0 ? (
                    <div style={gate(kickerIn)}>
                      <div
                        style={{
                          fontFamily: MONO_FONT,
                          fontSize: nameSize * 0.4,
                          fontWeight: 500,
                          textTransform: "uppercase",
                          color: courtGreen(0.95),
                          transform: rise(kickerIn),
                          marginBottom: nameSize * 0.16,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            letterSpacing: TRACKING_EYEBROW,
                            marginRight: `-${TRACKING_EYEBROW}`,
                          }}
                        >
                          {kicker}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div style={gate(nameIn)}>
                    <div
                      style={{
                        fontFamily: DISPLAY_FONT,
                        fontSize: nameSize,
                        fontWeight: 700,
                        letterSpacing: TRACKING_TIGHT,
                        color: BRAND.foreground,
                        transform: rise(nameIn),
                        whiteSpace: "nowrap",
                      }}
                    >
                      {name}
                    </div>
                  </div>

                  {role.length > 0 ? (
                    <div style={gate(roleIn)}>
                      <div
                        style={{
                          marginTop: nameSize * 0.14,
                          fontFamily: DISPLAY_FONT,
                          fontSize: nameSize * 0.5,
                          fontWeight: 500,
                          color: chalk(0.66),
                          transform: rise(roleIn),
                          whiteSpace: "nowrap",
                        }}
                      >
                        {role}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
