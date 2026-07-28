/**
 * WideProductTour — the product in four moves: search, pick a slot, pay the
 * listed price, play. The cards ride a conveyor so the tour never "ends".
 * 16:9 for YouTube / web hero / display, a seamless loop so it can sit behind
 * a page section or under a voice-over of any length.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1920×1080 on the classic 5% title-safe inset: everything meaningful sits
 * between y=96 and y=984 inside a 140px gutter. Only the backdrop and the
 * rail's edge fades touch the margins, and neither carries information.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 *  1. The rail is a wrap() lattice. Card i sits at
 *     `wrap(i·S − t·N·S, N·S)`, so over one loop the strip advances by exactly
 *     N·S — one whole revolution — and at t=1 every card is on the pixel it
 *     started on, showing the same step. Identical, not close.
 *  2. Each card's rim light uses `pulse()`, exactly 0 at local frame 0 and
 *     exactly 0 again from local frame 35, phased `i · duration / N` apart.
 *  3. The step numerals' float rides `breathe()`, a full cosine period.
 *  4. The backdrop bloom is a full cosine period; its grid drifts exactly one
 *     cell per loop.
 * No one-way tween exists in the file.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  Backdrop,
  Box,
  BoltIcon,
  CalendarIcon,
  Eyebrow,
  Handle,
  Lockup,
  SearchIcon,
  TrophyIcon,
  WalletIcon,
  type IconProps,
} from "./socialChrome";
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
  pulse,
  useMotionFrame,
  wrap,
} from "./socialKit";

/** Which drawn glyph a step shows. No image files, no network. */
export type TourGlyph = "search" | "calendar" | "wallet" | "trophy" | "bolt";

export type TourStep = {
  title: string;
  detail: string;
  glyph: TourGlyph;
};

export type WideProductTourProps = {
  eyebrow: string;
  /** Two display lines above the rail. */
  headline: [string, string];
  steps: TourStep[];
  accent: Accent;
};

export const wideProductTourDefaultProps: WideProductTourProps = {
  eyebrow: "Product tour",
  headline: ["Four taps", "from idea to kickoff"],
  steps: [
    {
      title: "Search",
      detail: "Filter by sport, district and the hour you actually want.",
      glyph: "search",
    },
    {
      title: "Pick a slot",
      detail: "Live availability straight from the venue's own board.",
      glyph: "calendar",
    },
    {
      title: "Pay the listed price",
      detail: COMMISSION.playerLine + ". No service fee, ever.",
      glyph: "wallet",
    },
    {
      title: "Play",
      detail: "Confirmation in the app, the venue notified the same second.",
      glyph: "trophy",
    },
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

/** The rail window, entirely inside the title-safe box. */
const RAIL_Y = 456;
const RAIL_H = 412;
/** Card pitch: 500 wide on a 560 lattice step. */
const CARD_W = 500;
const STEP = 560;

const GLYPHS: Record<TourGlyph, FC<IconProps>> = {
  search: SearchIcon,
  calendar: CalendarIcon,
  wallet: WalletIcon,
  trophy: TrophyIcon,
  bolt: BoltIcon,
};

export const WideProductTour: FC<WideProductTourProps> = ({
  eyebrow,
  headline,
  steps,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Loop: frame 0 both opens and closes the cycle, so calm freezes there.
  const frame = useMotionFrame(rawFrame, 0);

  const t = loopT(frame, durationInFrames);
  const breath = breathe(t);
  const n = Math.max(1, steps.length);
  const period = n * STEP;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={t}
        motion={1}
        accent={accent}
        cell={80}
        bloomAt={[0.5, 0.18]}
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

      <Box x={G} y={TOP + 76} w={CONTENT_W}>
        <div style={headlineStyle(88, BRAND.foreground)}>{headline[0]}</div>
        <div style={headlineStyle(88, accentColor(accent))}>{headline[1]}</div>
      </Box>

      {/* ── The conveyor ──────────────────────────────────────────────── */}
      <Box
        x={G}
        y={RAIL_Y}
        w={CONTENT_W}
        h={RAIL_H}
        style={{ overflow: "hidden" }}
      >
        {steps.map((step, i) => {
          const x = wrap(i * STEP - t * period, period);
          const beat = pulse({
            frame,
            fps,
            period: durationInFrames,
            phase: (i * durationInFrames) / n,
          });
          const Glyph = GLYPHS[step.glyph];
          return (
            <div
              key={step.title}
              style={{
                position: "absolute",
                left: x,
                top: 0,
                width: CARD_W,
                height: RAIL_H,
                boxSizing: "border-box",
                borderRadius: 44,
                backgroundColor: BRAND.card,
                border: `2px solid ${accentAlpha(accent, 0.16 + 0.3 * beat)}`,
                boxShadow: `0 0 ${76 * beat}px -30px ${accentAlpha(accent, 0.85)}`,
                padding: "40px 38px",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 28,
                    backgroundColor: accentAlpha(accent, 0.12 + 0.14 * beat),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Glyph size={44} color={accentColor(accent)} weight={2} />
                </div>
                <span
                  style={{
                    fontFamily: DISPLAY_FONT,
                    fontSize: 76,
                    fontWeight: 700,
                    letterSpacing: "-0.06em",
                    color: accentAlpha(accent, 0.28 + 0.16 * beat),
                    transform: `translateY(${breath * 5}px)`,
                  }}
                >
                  {i + 1}
                </span>
              </div>

              <span style={headlineStyle(52, BRAND.foreground, 700)}>
                {step.title}
              </span>
              <span style={{ ...bodyStyle(28, muted(1)), display: "block" }}>
                {step.detail}
              </span>
            </div>
          );
        })}

        {/* Static edge fades — no motion, so nothing to seam. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to right, ${BRAND.background} 0%, transparent 9%, transparent 91%, ${BRAND.background} 100%)`,
            pointerEvents: "none",
          }}
        />
      </Box>

      <Box
        x={G}
        y={BOTTOM - 48}
        w={CONTENT_W}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={bodyStyle(27, chalk(0.84), 600)}>{COMMISSION.proof}</span>
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
