/**
 * PayoutStatusPending — the payout row on /owner/earnings while a transfer is
 * still with the bank: money already earned, not yet landed.
 * A seamless loop: a shimmer whose `backgroundPosition` advances by exactly one
 * tile per cycle, plus a dashed ring that turns a whole number of times.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  TAU,
  amber,
  breathe,
  cardSurface,
  chalk,
  dram,
  eyebrowStyle,
  hairline,
  loopT,
  muted,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS_W = 720;

export type PayoutStatusPendingProps = {
  /** The amount in flight, in dram. The owner's full takings. */
  amount: number;
  /** Status line. */
  statusLabel: string;
  /** When it is expected. */
  etaLabel: string;
  /** Destination, masked as the app masks it. */
  destinationLabel: string;
  /** Turns the ring makes per loop. Whole numbers keep the seam exact. */
  turnsPerLoop: number;
};

export const payoutStatusPendingDefaultProps: PayoutStatusPendingProps = {
  amount: 486000,
  statusLabel: "Payout in progress",
  etaLabel: "Expected within 2 business days",
  destinationLabel: "Ameriabank ···· 4417",
  turnsPerLoop: 2,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The shimmer is a repeating linear-gradient whose `backgroundPosition`
 *     moves by exactly one `backgroundSize` over the cycle, so the painted
 *     pixels at t = 1 are the pixels at t = 0.
 *  2. The ring rotates `turnsPerLoop · 360°`, and its dash pattern divides the
 *     circumference into equal cells, so it is symmetric under a cell anyway.
 *  3. The amber glow rides `breathe(t)` — one full cosine period.
 *
 * The amount never counts: it is money the owner has already earned, and a
 * figure that climbs every four seconds would be a lie about when it arrived.
 */
export const PayoutStatusPending: FC<PayoutStatusPendingProps> = ({
  amount,
  statusLabel,
  etaLabel,
  destinationLabel,
  turnsPerLoop,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const unit = width / CANVAS_W;

  // Loop: frame 0 both opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);
  const t = loopT(frame, durationInFrames);
  const glow = breathe(t);

  const turns = Math.max(1, Math.round(turnsPerLoop));

  const ringR = 34 * unit;
  const ringCircumference = TAU * ringR;
  const cells = 12;
  const cell = ringCircumference / cells;

  /** One shimmer tile of travel per loop — the exact period. */
  const tile = width * 1.25;
  const shimmerX = t * tile;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <div
        style={{
          position: "absolute",
          inset: 22 * unit,
          ...cardSurface(unit, 20),
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          gap: 26 * unit,
          padding: `0 ${30 * unit}px`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(100deg, transparent 42%, ${chalk(0.04)} 50%, ${amber(0.07)} 54%, transparent 64%)`,
            backgroundSize: `${tile}px 100%`,
            backgroundRepeat: "repeat-x",
            backgroundPosition: `${shimmerX.toFixed(2)}px 0`,
          }}
        />

        {/* The turning ring — a transfer in flight, not a spinner for its own
            sake: it stops existing the moment the payout lands. */}
        <svg
          width={ringR * 2 + 12 * unit}
          height={ringR * 2 + 12 * unit}
          viewBox={`0 0 ${ringR * 2 + 12 * unit} ${ringR * 2 + 12 * unit}`}
          style={{ position: "relative", flexShrink: 0 }}
        >
          <circle
            cx={ringR + 6 * unit}
            cy={ringR + 6 * unit}
            r={ringR}
            fill="none"
            stroke={hairline(1)}
            strokeWidth={4 * unit}
          />
          <g
            transform={`rotate(${(t * 360 * turns).toFixed(3)} ${ringR + 6 * unit} ${ringR + 6 * unit})`}
          >
            <circle
              cx={ringR + 6 * unit}
              cy={ringR + 6 * unit}
              r={ringR}
              fill="none"
              stroke={amber(0.55 + 0.35 * glow)}
              strokeWidth={4 * unit}
              strokeLinecap="round"
              strokeDasharray={`${(cell * 0.45).toFixed(3)} ${(cell * 0.55).toFixed(3)}`}
            />
          </g>
        </svg>

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 7 * unit,
            flex: 1,
            minWidth: 0,
          }}
        >
          <span style={{ ...eyebrowStyle(unit, amber(0.95)) }}>
            {statusLabel}
          </span>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontVariantNumeric: "tabular-nums",
              fontSize: 42 * unit,
              fontWeight: 500,
              letterSpacing: -0.02 * 42 * unit,
              color: BRAND.foreground,
              lineHeight: 1.05,
            }}
          >
            {dram(amount)}
          </span>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 14.5 * unit,
              color: muted(0.9),
            }}
          >
            {etaLabel}
          </span>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6 * unit,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 14 * unit,
              fontWeight: 600,
              color: BRAND.foregroundSoft,
            }}
          >
            {destinationLabel}
          </span>
          <span
            style={{
              fontFamily: SANS_FONT,
              fontSize: 13 * unit,
              color: muted(0.75),
            }}
          >
            full amount · no fee
          </span>
        </div>
      </div>

      <div style={{ position: "absolute", width: 0, height: height * 0 }} />
    </AbsoluteFill>
  );
};
