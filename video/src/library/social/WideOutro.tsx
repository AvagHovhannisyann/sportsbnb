/**
 * WideOutro — the end card: the mark inside a travelling ring, the call to
 * action, the domain, and the claim the whole family is built on.
 * 16:9 for YouTube end screens / web / display, a seamless loop so it can hold
 * for as long as the end-screen cards are on and never show a restart.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1920×1080 on the classic 5% title-safe inset: everything sits between y=96
 * and y=984 inside a 140px gutter, which also keeps it clear of the YouTube
 * end-screen card grid that overlays the outer edges.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 *  1. The ring is a dash pattern whose period equals the circle's exact
 *     circumference C, with `strokeDashoffset` travelling exactly −C over the
 *     loop, so the pattern lands back on itself.
 *  2. The base rule is a repeating linear gradient with a 64px tile whose
 *     `backgroundPosition` advances by exactly 64px over the loop.
 *  3. The mark's float and the ring's glow ride `breathe()` — a full cosine
 *     period, identical at t=0 and t=1.
 *  4. The CTA pill uses `pulse()`, exactly 0 at local frame 0 and exactly 0
 *     again from local frame 35.
 *  5. The backdrop bloom is a full cosine period; its grid drifts exactly one
 *     cell per loop.
 * No one-way tween exists in the file.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { ArrowIcon, Backdrop, Box, Handle, Lockup } from "./socialChrome";
import {
  BRAND,
  COMMISSION,
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

export type WideOutroProps = {
  /** Two display lines. */
  headline: [string, string];
  /** The button copy. */
  ctaLabel: string;
  /** The line under the button. */
  footnote: string;
  /** The closing claim, bottom-left. */
  claim: string;
  accent: Accent;
};

export const wideOutroDefaultProps: WideOutroProps = {
  headline: ["Find a pitch.", "Book it tonight."],
  ctaLabel: "Start on sportsbnb.am",
  footnote: "Yerevan · Gyumri · Vanadzor",
  claim: COMMISSION.proof,
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

const RING_BOX = 300;
const RING_R = 128;
/** The dash period is exactly the circumference, so −C is one revolution. */
const RING_C = 2 * Math.PI * RING_R;

/** The base rule's tile. It travels exactly one tile per loop. */
const RULE_TILE = 64;

export const WideOutro: FC<WideOutroProps> = ({
  headline,
  ctaLabel,
  footnote,
  claim,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Loop: frame 0 both opens and closes the cycle, so calm freezes there.
  const frame = useMotionFrame(rawFrame, 0);

  const t = loopT(frame, durationInFrames);
  const breath = breathe(t);
  const cta = pulse({ frame, fps, period: durationInFrames, phase: 0 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={t}
        motion={1}
        accent={accent}
        cell={80}
        bloomAt={[0.5, 0.3]}
        bloom={0.9}
      />

      {/* ── Mark in a travelling ring ─────────────────────────────────── */}
      <Box
        x={(W - RING_BOX) / 2}
        y={TOP + 44}
        w={RING_BOX}
        h={RING_BOX}
        style={{ transform: `translateY(${breath * -6}px)` }}
      >
        <svg
          width={RING_BOX}
          height={RING_BOX}
          viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}
          style={{ display: "block" }}
        >
          <circle
            cx={RING_BOX / 2}
            cy={RING_BOX / 2}
            r={RING_R}
            fill="none"
            stroke={accentAlpha(accent, 0.16)}
            strokeWidth={3}
          />
          <circle
            cx={RING_BOX / 2}
            cy={RING_BOX / 2}
            r={RING_R}
            fill="none"
            stroke={accentColor(accent)}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${RING_C * 0.26} ${RING_C * 0.74}`}
            strokeDashoffset={-t * RING_C}
            style={{
              filter: `drop-shadow(0 0 ${18 + 8 * breath}px ${accentAlpha(accent, 0.85)})`,
            }}
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
          <Lockup size={92} accent={accent} showWord={false} />
        </div>
      </Box>

      {/* ── Headline ──────────────────────────────────────────────────── */}
      <Box x={G} y={TOP + 372} w={CONTENT_W} style={{ textAlign: "center" }}>
        <div
          style={{ ...headlineStyle(92, BRAND.foreground), textAlign: "center" }}
        >
          {headline[0]}
        </div>
        <div
          style={{
            ...headlineStyle(92, accentColor(accent)),
            textAlign: "center",
          }}
        >
          {headline[1]}
        </div>
      </Box>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 574}
        w={CONTENT_W}
        style={{ display: "flex", justifyContent: "center" }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 20,
            padding: "26px 46px",
            borderRadius: 60,
            backgroundColor: accentColor(accent),
            transform: `scale(${1 + cta * 0.035})`,
            boxShadow: `0 0 ${70 + 60 * cta}px ${-26}px ${accentAlpha(accent, 0.9)}`,
          }}
        >
          <span
            style={{
              ...headlineStyle(40, onAccent(accent), 700),
              letterSpacing: "-0.02em",
            }}
          >
            {ctaLabel}
          </span>
          <ArrowIcon size={38} color={onAccent(accent)} weight={2.4} />
        </div>
      </Box>

      <Box x={G} y={TOP + 692} w={CONTENT_W} style={{ textAlign: "center" }}>
        <span
          style={{ ...bodyStyle(29, muted(1), 600), display: "block" }}
        >
          {footnote}
        </span>
      </Box>

      {/* ── The base rule. One tile of travel per loop. ───────────────── */}
      <Box
        x={G}
        y={BOTTOM - 96}
        w={CONTENT_W}
        h={6}
        style={{
          borderRadius: 3,
          overflow: "hidden",
          backgroundImage: `repeating-linear-gradient(90deg, ${accentAlpha(accent, 0.85)} 0px, ${accentAlpha(accent, 0.85)} ${RULE_TILE / 2}px, ${accentAlpha(accent, 0.12)} ${RULE_TILE / 2}px, ${accentAlpha(accent, 0.12)} ${RULE_TILE}px)`,
          backgroundSize: `${RULE_TILE}px 100%`,
          backgroundPosition: `${-t * RULE_TILE}px 0px`,
        }}
      />

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
        <span style={bodyStyle(27, chalk(0.84), 600)}>{claim}</span>
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
