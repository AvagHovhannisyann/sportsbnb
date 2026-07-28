/**
 * PostZeroCommission — the flagship claim as a single square: 0%, and the two
 * sentences that make it concrete for owners and for players.
 * 1:1 for Instagram / Facebook feed, one-way, the post to pin.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * One-way, so `seamless: false`. The ring draws with `strokeDashoffset`, the
 * figure stamps in with an overshoot, and the two claim rows land after it.
 * Reduced motion freezes on the LAST frame, where the claim is fully stated —
 * the only frame of this post that would be worth showing on its own.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  Backdrop,
  Box,
  CheckIcon,
  Eyebrow,
  Handle,
  Lockup,
} from "./socialChrome";
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
  headlineStyle,
  ink,
  interpolateSafe,
  loopT,
  muted,
  popIn,
  useMotionFrame,
} from "./socialKit";

export type PostZeroCommissionProps = {
  eyebrow: string;
  /** The figure. Kept as a string so "0%" can become "0 ֏" if wanted. */
  rate: string;
  /** The word under the figure. */
  rateLabel: string;
  /** Two rows, each a claim. */
  claims: string[];
  /** The closing line. */
  footnote: string;
  accent: Accent;
};

export const postZeroCommissionDefaultProps: PostZeroCommissionProps = {
  eyebrow: "How we make it work",
  rate: COMMISSION.rate,
  rateLabel: "commission",
  claims: [COMMISSION.ownerLine, COMMISSION.playerLine],
  footnote: COMMISSION.proof,
  accent: "green",
};

const { width: W, height: H, safeTop: TOP, safeBottom: BOTTOM, gutter: G } =
  SQUARE;
const CONTENT_W = W - G * 2;

const RING_R = 166;
const RING_C = 2 * Math.PI * RING_R;

export const PostZeroCommission: FC<PostZeroCommissionProps> = ({
  eyebrow,
  rate,
  rateLabel,
  claims,
  footnote,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // One-way: the stated claim is the message, so calm freezes on the last frame.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  /** 0 → 1 draws the ring exactly once. */
  const draw = interpolateSafe(frame, [10, 52], [0, 1], EASE_OUT_EXPO);
  const stamp = popIn(frame, fps, 26, 32);
  const stampIn = interpolateSafe(frame, [26, 40], [0, 1]);
  const footIn = interpolateSafe(frame, [118, 132], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={loopT(frame, durationInFrames)}
        motion={1}
        accent={accent}
        cell={60}
        bloomAt={[0.5, 0.4]}
        bloom={0.7 + 0.6 * draw}
        markings={false}
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
      <Box x={W / 2 - 200} y={TOP + 66} w={400} h={400}>
        <svg
          width={400}
          height={400}
          viewBox="0 0 400 400"
          style={{ display: "block" }}
        >
          <circle
            cx={200}
            cy={200}
            r={RING_R}
            fill={accentAlpha(accent, 0.07)}
            stroke={accentAlpha(accent, 0.18)}
            strokeWidth={2}
          />
          <circle
            cx={200}
            cy={200}
            r={RING_R}
            fill="none"
            stroke={accentColor(accent)}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - draw)}
            transform="rotate(-90 200 200)"
            style={{
              filter: `drop-shadow(0 0 ${26 * draw}px ${accentAlpha(accent, 0.8)})`,
            }}
          />
        </svg>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            opacity: stampIn,
            transform: `scale(${0.82 + stamp * 0.18})`,
          }}
        >
          <span
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 172,
              fontWeight: 700,
              letterSpacing: "-0.06em",
              color: accentColor(accent),
              lineHeight: 1,
            }}
          >
            {rate}
          </span>
          <span style={bodyStyle(38, chalk(0.94), 600)}>{rateLabel}</span>
        </div>
      </Box>

      {/* ── The two claims ───────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP + 500}
        w={CONTENT_W}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        {claims.slice(0, 2).map((claim, i) => {
          const at = 74 + i * 16;
          return (
            <div
              key={claim}
              style={{
                height: 116,
                borderRadius: 34,
                backgroundColor: BRAND.card,
                border: `1.5px solid ${accentAlpha(accent, 0.28)}`,
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "0 30px",
                opacity: interpolateSafe(frame, [at, at + 12], [0, 1]),
                transform: `translateY(${(1 - popIn(frame, fps, at, 26)) * 28}px)`,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  flexShrink: 0,
                  backgroundColor: accentAlpha(accent, 0.16),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckIcon size={30} color={accentColor(accent)} weight={2.8} />
              </div>
              <span style={headlineStyle(38, BRAND.foreground, 700)}>
                {claim}
              </span>
            </div>
          );
        })}
      </Box>

      {/* ── Footnote ──────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={BOTTOM - 84}
        w={CONTENT_W}
        style={{
          opacity: footIn,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={bodyStyle(28, muted(1), 600)}>{footnote}</span>
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
