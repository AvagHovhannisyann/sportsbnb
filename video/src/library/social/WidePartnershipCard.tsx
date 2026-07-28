/**
 * WidePartnershipCard — the co-branded slide: SportsBnB and a partner, the
 * bond between them and what the partnership actually gives people.
 * 16:9 for YouTube / web / display, a seamless loop so it can hold on screen
 * at the end of a segment or sit in a page section indefinitely.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1920×1080 on the classic 5% title-safe inset: copy between y=96 and y=984
 * inside a 140px gutter. The partner mark is drawn from its initial — this
 * family never fetches a logo file.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 *  1. The bond between the two marks is a dashed stroke with a 48px dash
 *     period whose `strokeDashoffset` travels exactly −48px over the loop, so
 *     the dash pattern lands back on itself.
 *  2. The two marks' float and the bloom ride `breathe()` — a full cosine
 *     period, identical at t=0 and t=1.
 *  3. The benefit tiles use `pulse()`, exactly 0 at local frame 0 and exactly
 *     0 again from local frame 35, phased a third of the loop apart.
 *  4. The backdrop bloom is a full cosine period; its grid drifts exactly one
 *     cell per loop.
 * No one-way tween exists in the file.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { Backdrop, Box, Eyebrow, Handle, Lockup } from "./socialChrome";
import {
  BRAND,
  COMMISSION,
  DISPLAY_FONT,
  WIDE,
  type Accent,
  accentAlpha,
  accentColor,
  bodyStyle,
  breathe,
  chalk,
  headlineStyle,
  ink,
  loopT,
  muted,
  onAccent,
  pulse,
  useMotionFrame,
} from "./socialKit";

export type WidePartnershipCardProps = {
  eyebrow: string;
  /** The partner's name, spelled as they spell it. */
  partnerName: string;
  /** One or two letters for the drawn partner mark. */
  partnerInitial: string;
  /** Hue for the partner mark, so it is not always brand green. */
  partnerHue: number;
  /** Two display lines under the marks. */
  headline: [string, string];
  /** What the partnership gives people. */
  benefits: string[];
  accent: Accent;
};

export const widePartnershipCardDefaultProps: WidePartnershipCardProps = {
  eyebrow: "Partnership",
  partnerName: "Yerevan City Sport",
  partnerInitial: "Y",
  partnerHue: 32,
  headline: ["Municipal courts,", "open to everyone"],
  benefits: [
    "42 city-run venues now bookable online",
    "Published prices, no phone calls",
    COMMISSION.ownerLine + " — the city included",
  ],
  accent: "green",
};

const {
  width: W,
  height: H,
  safeTop: TOP,
  safeBottom: BOTTOM,
  gutter: G,
} = WIDE;
const CONTENT_W = W - G * 2;

const MARK = 176;
const BOND_W = 300;
/** The dash period. The offset travels exactly this far over one loop. */
const DASH = 48;

export const WidePartnershipCard: FC<WidePartnershipCardProps> = ({
  eyebrow,
  partnerName,
  partnerInitial,
  partnerHue,
  headline,
  benefits,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Loop: frame 0 both opens and closes the cycle, so calm freezes there.
  const frame = useMotionFrame(rawFrame, 0);

  const t = loopT(frame, durationInFrames);
  const breath = breathe(t);
  const rows = benefits.slice(0, 3);

  const partnerColor = `hsl(${partnerHue}, 82%, 58%)`;
  const rowY = TOP + 130;
  const pairW = MARK * 2 + BOND_W;
  const pairX = (W - pairW) / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={t}
        motion={1}
        accent={accent}
        cell={80}
        bloomAt={[0.5, 0.26]}
        bloom={0.85}
        markings={false}
      />

      <Box
        x={G}
        y={TOP}
        w={CONTENT_W}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Eyebrow size={26} color={accentColor(accent)}>
          {eyebrow}
        </Eyebrow>
        <Lockup size={54} accent={accent} />
      </Box>

      {/* ── The two marks and the bond ────────────────────────────────── */}
      <Box
        x={pairX}
        y={rowY}
        w={MARK}
        h={MARK}
        style={{
          borderRadius: MARK * 0.3,
          backgroundColor: accentColor(accent),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateY(${breath * -6}px)`,
          boxShadow: `0 0 ${90 + 30 * breath}px ${-MARK * 0.22}px ${accentAlpha(accent, 0.75)}`,
        }}
      >
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: MARK * 0.56,
            fontWeight: 700,
            letterSpacing: "-0.05em",
            color: onAccent(accent),
          }}
        >
          S
        </span>
      </Box>

      <Box x={pairX + MARK} y={rowY} w={BOND_W} h={MARK}>
        <svg
          width={BOND_W}
          height={MARK}
          viewBox={`0 0 ${BOND_W} ${MARK}`}
          style={{ display: "block" }}
        >
          <path
            d={`M0 ${MARK / 2} H${BOND_W}`}
            stroke={chalk(0.24)}
            strokeWidth={4}
            strokeDasharray={`${DASH * 0.5} ${DASH * 0.5}`}
            strokeDashoffset={-t * DASH}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 46,
              backgroundColor: BRAND.background,
              border: `3px solid ${chalk(0.2)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: 46,
                fontWeight: 600,
                color: chalk(0.7),
              }}
            >
              &times;
            </span>
          </div>
        </div>
      </Box>

      <Box
        x={pairX + MARK + BOND_W}
        y={rowY}
        w={MARK}
        h={MARK}
        style={{
          borderRadius: MARK * 0.3,
          backgroundColor: partnerColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateY(${breath * 6}px)`,
          boxShadow: `0 0 ${90 - 30 * breath}px ${-MARK * 0.22}px hsla(${partnerHue}, 82%, 58%, 0.7)`,
        }}
      >
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: MARK * 0.56,
            fontWeight: 700,
            letterSpacing: "-0.05em",
            color: BRAND.primaryForeground,
          }}
        >
          {partnerInitial.slice(0, 2)}
        </span>
      </Box>

      <Box x={G} y={rowY + MARK + 26} w={CONTENT_W} style={{ textAlign: "center" }}>
        <span style={{ ...bodyStyle(30, muted(1), 600), display: "block" }}>
          sportsbnb &times; {partnerName}
        </span>
      </Box>

      {/* ── Headline ──────────────────────────────────────────────────── */}
      <Box x={G} y={rowY + MARK + 84} w={CONTENT_W} style={{ textAlign: "center" }}>
        <div style={{ ...headlineStyle(78, BRAND.foreground), textAlign: "center" }}>
          {headline[0]}
        </div>
        <div
          style={{ ...headlineStyle(78, accentColor(accent)), textAlign: "center" }}
        >
          {headline[1]}
        </div>
      </Box>

      {/* ── Benefits ──────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={BOTTOM - 208}
        w={CONTENT_W}
        style={{ display: "flex", gap: 22 }}
      >
        {rows.map((benefit, i) => {
          const beat = pulse({
            frame,
            fps,
            period: durationInFrames,
            phase: (i * durationInFrames) / Math.max(1, rows.length),
          });
          return (
            <div
              key={benefit}
              style={{
                flex: 1,
                height: 132,
                boxSizing: "border-box",
                borderRadius: 34,
                backgroundColor: BRAND.card,
                border: `2px solid ${accentAlpha(accent, 0.16 + 0.28 * beat)}`,
                boxShadow: `0 0 ${64 * beat}px -28px ${accentAlpha(accent, 0.8)}`,
                display: "flex",
                alignItems: "center",
                padding: "0 30px",
              }}
            >
              <span style={{ ...bodyStyle(28, chalk(0.92), 600), display: "block" }}>
                {benefit}
              </span>
            </div>
          );
        })}
      </Box>

      <Box
        x={G}
        y={BOTTOM - 44}
        w={CONTENT_W}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={bodyStyle(27, chalk(0.84), 600)}>{COMMISSION.badge}</span>
        <Handle size={22} />
      </Box>

      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${ink(0.4)} 0%, transparent 14%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
