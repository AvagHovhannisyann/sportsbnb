/**
 * PostQuoteCard — a line worth screenshotting: one short quote set large, an
 * accent rule running under it and the speaker credited below.
 * 1:1 for Instagram / Facebook feed, a seamless loop so the same asset serves
 * as a feed video and as a looping Story sticker.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1080. No platform chrome sits over a feed image, so the only inset is
 * the optical one: copy lives between y=88 and y=992 inside an 88px gutter.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 *  1. The rule under the quote is a repeating linear gradient with a 56px
 *     tile whose `backgroundPosition` advances by exactly 56px over the loop,
 *     so the stripe pattern lands back on the pixel it started on.
 *  2. The quote glyph's float rides `breathe()` — a full cosine period.
 *  3. The speaker dot and the card's rim light use `pulse()`, exactly 0 at
 *     local frame 0 and exactly 0 again from local frame 35.
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
  SQUARE,
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
} from "./socialKit";

export type PostQuoteCardProps = {
  eyebrow: string;
  /** The quote, one array entry per set line. Three lines is the sweet spot. */
  quote: string[];
  /** Who said it. */
  speakerName: string;
  /** Their relationship to SportsBnB — "venue owner, Gyumri", "captain". */
  speakerRole: string;
  /** The line that closes the card. */
  footnote: string;
  accent: Accent;
};

export const postQuoteCardDefaultProps: PostQuoteCardProps = {
  eyebrow: "In their words",
  quote: ["We stopped", "chasing calls.", "The board fills itself."],
  speakerName: "Aram Petrosyan",
  speakerRole: "Owner · Mika Sports Complex, Yerevan",
  footnote: COMMISSION.proof,
  accent: "cyan",
};

const {
  width: W,
  height: H,
  safeTop: TOP,
  safeBottom: BOTTOM,
  gutter: G,
} = SQUARE;
const CONTENT_W = W - G * 2;

/** The stripe tile. The rule travels exactly one tile per loop. */
const RULE_TILE = 56;

export const PostQuoteCard: FC<PostQuoteCardProps> = ({
  eyebrow,
  quote,
  speakerName,
  speakerRole,
  footnote,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Loop: frame 0 both opens and closes the cycle, so calm freezes there.
  const frame = useMotionFrame(rawFrame, 0);

  const t = loopT(frame, durationInFrames);
  const breath = breathe(t);
  const rim = pulse({ frame, fps, period: durationInFrames, phase: 0 });
  const dot = pulse({
    frame,
    fps,
    period: durationInFrames,
    phase: durationInFrames * 0.5,
  });

  const lines = quote.slice(0, 4);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={t}
        motion={1}
        accent={accent}
        cell={60}
        bloomAt={[0.28, 0.3]}
        bloom={0.8}
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
        <Eyebrow size={23} color={accentColor(accent)}>
          {eyebrow}
        </Eyebrow>
        <Lockup size={44} accent={accent} />
      </Box>

      {/* ── The glyph. Floats on a full cosine period. ─────────────────── */}
      <Box
        x={G}
        y={TOP + 74}
        w={CONTENT_W}
        style={{ transform: `translateY(${breath * 7}px)` }}
      >
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 168,
            fontWeight: 700,
            lineHeight: 0.7,
            color: accentAlpha(accent, 0.5 + 0.14 * rim),
            letterSpacing: "-0.06em",
          }}
        >
          &ldquo;
        </span>
      </Box>

      {/* ── The quote ─────────────────────────────────────────────────── */}
      <Box x={G} y={TOP + 214} w={CONTENT_W}>
        {lines.map((line, i) => (
          <div
            key={line}
            style={{
              ...headlineStyle(74, i === lines.length - 1 ? accentColor(accent) : BRAND.foreground),
              marginBottom: 10,
            }}
          >
            {line}
          </div>
        ))}
      </Box>

      {/* ── The rule. One tile of travel per loop. ─────────────────────── */}
      <Box
        x={G}
        y={TOP + 214 + lines.length * 84 + 34}
        w={CONTENT_W}
        h={10}
        style={{
          borderRadius: 5,
          overflow: "hidden",
          backgroundImage: `repeating-linear-gradient(90deg, ${accentColor(accent)} 0px, ${accentColor(accent)} ${RULE_TILE / 2}px, ${accentAlpha(accent, 0.16)} ${RULE_TILE / 2}px, ${accentAlpha(accent, 0.16)} ${RULE_TILE}px)`,
          backgroundSize: `${RULE_TILE}px 100%`,
          backgroundPosition: `${t * RULE_TILE}px 0px`,
          boxShadow: `0 0 ${34 + 26 * rim}px ${-14}px ${accentAlpha(accent, 0.7)}`,
        }}
      />

      {/* ── Attribution ───────────────────────────────────────────────── */}
      <Box
        x={G}
        y={BOTTOM - 224}
        w={CONTENT_W}
        h={128}
        style={{
          borderRadius: 36,
          backgroundColor: BRAND.card,
          border: `2px solid ${accentAlpha(accent, 0.2 + 0.24 * rim)}`,
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: "0 32px",
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            flexShrink: 0,
            backgroundColor: accentColor(accent),
            boxShadow: `0 0 ${16 + 22 * dot}px ${accentAlpha(accent, 0.9)}`,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={headlineStyle(40, BRAND.foreground, 700)}>
            {speakerName}
          </span>
          <span style={bodyStyle(26, muted(1))}>{speakerRole}</span>
        </div>
      </Box>

      <Box
        x={G}
        y={BOTTOM - 62}
        w={CONTENT_W}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={bodyStyle(25, chalk(0.8), 600)}>{footnote}</span>
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
