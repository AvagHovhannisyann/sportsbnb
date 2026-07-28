/**
 * PostStat — one number, counted up, with the sentence that makes it mean
 * something: hours booked, venues live, minutes-to-book, whatever the month's
 * figure is.
 * 1:1 for Instagram / Facebook feed, one-way, the monthly-metric post.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * One-way, so `seamless: false`. The figure counts on an eased ramp — the one
 * place a tween is the honest model — and the caption and context row settle
 * after it. Reduced motion freezes on the LAST frame, with the number landed.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { Backdrop, Box, Eyebrow, Handle, Lockup, BoltIcon } from "./socialChrome";
import {
  BRAND,
  COMMISSION,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  SQUARE,
  type Accent,
  accentAlpha,
  accentColor,
  bodyStyle,
  chalk,
  groupThousands,
  headlineStyle,
  ink,
  interpolateSafe,
  loopT,
  muted,
  numeralStyle,
  popIn,
  useMotionFrame,
} from "./socialKit";

export type PostStatProps = {
  eyebrow: string;
  /** The figure the counter lands on. */
  value: number;
  /** Rendered in front of the figure, e.g. "+". */
  prefix: string;
  /** Rendered after it, e.g. "h" or "%". */
  suffix: string;
  /** The line under the figure — what the number counts. */
  caption: string;
  /** The supporting sentence. */
  context: string;
  /** Small chip, e.g. "vs. last month". */
  chipLabel: string;
  accent: Accent;
};

export const postStatDefaultProps: PostStatProps = {
  eyebrow: "July in numbers",
  value: 4200,
  prefix: "",
  suffix: "h",
  caption: "of pitch time booked",
  context: "Across 61 venues in Yerevan, Gyumri and Vanadzor.",
  chipLabel: "+38% vs. June",
  accent: "green",
};

const { width: W, height: H, safeTop: TOP, safeBottom: BOTTOM, gutter: G } =
  SQUARE;
const CONTENT_W = W - G * 2;

const COUNT_FROM = 16;
const COUNT_TO = 78;

export const PostStat: FC<PostStatProps> = ({
  eyebrow,
  value,
  prefix,
  suffix,
  caption,
  context,
  chipLabel,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // One-way: the landed number is the message, so calm freezes on the last frame.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const counted = Math.round(
    interpolateSafe(frame, [COUNT_FROM, COUNT_TO], [0, value], EASE_OUT_EXPO),
  );
  const landed = interpolateSafe(frame, [COUNT_TO - 8, COUNT_TO + 8], [0, 1]);
  const figure = popIn(frame, fps, COUNT_FROM - 8, 32);
  const chip = popIn(frame, fps, 92, 24);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={loopT(frame, durationInFrames)}
        motion={1}
        accent={accent}
        cell={60}
        bloomAt={[0.5, 0.36]}
        bloom={0.6 + 0.7 * landed}
      />

      <Box
        x={G}
        y={TOP}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [0, 12], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Eyebrow size={23} color={accentColor(accent)}>
          {eyebrow}
        </Eyebrow>
        <Lockup size={44} accent={accent} />
      </Box>

      {/* ── The figure ────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 110}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [COUNT_FROM - 8, COUNT_FROM + 6], [0, 1]),
          transform: `scale(${0.9 + figure * 0.1})`,
          transformOrigin: "50% 50%",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 236,
            fontWeight: 700,
            letterSpacing: "-0.06em",
            color: accentColor(accent),
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {prefix}
          {groupThousands(counted)}
          <span style={{ fontSize: 128 }}>{suffix}</span>
        </span>
      </Box>

      <Box
        x={G}
        y={TOP + 372}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [COUNT_TO - 10, COUNT_TO + 6], [0, 1]),
          textAlign: "center",
        }}
      >
        <div style={{ ...headlineStyle(58, BRAND.foreground), textAlign: "center" }}>
          {caption}
        </div>
      </Box>

      {/* ── Chip ──────────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 462}
        w={CONTENT_W}
        style={{
          display: "flex",
          justifyContent: "center",
          opacity: interpolateSafe(frame, [92, 104], [0, 1]),
          transform: `scale(${0.88 + chip * 0.12})`,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 28px",
            borderRadius: 40,
            backgroundColor: accentAlpha(accent, 0.14),
            border: `2px solid ${accentAlpha(accent, 0.45)}`,
          }}
        >
          <BoltIcon size={28} color={accentColor(accent)} weight={2} />
          <span style={numeralStyle(26, accentColor(accent), 600)}>
            {chipLabel}
          </span>
        </div>
      </Box>

      {/* ── Context ───────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 574}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [104, 118], [0, 1]),
          textAlign: "center",
        }}
      >
        <span style={{ ...bodyStyle(32, muted(1)), display: "block", textAlign: "center" }}>
          {context}
        </span>
      </Box>

      <Box
        x={G}
        y={BOTTOM - 76}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [116, 130], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={bodyStyle(26, chalk(0.8), 600)}>{COMMISSION.badge}</span>
        <Handle size={21} />
      </Box>

      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${ink(0.35)} 0%, transparent 16%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
