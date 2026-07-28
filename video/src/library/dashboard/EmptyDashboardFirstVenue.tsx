/**
 * EmptyDashboardFirstVenue — /owner-dashboard for an owner who has not listed
 * anything yet, which today is every owner: zero venues, so zero of everything.
 * A seamless idle loop. The dashboard is drawn in full and honestly zeroed
 * rather than hidden, so the page reads as ready and waiting, not broken.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  TAU,
  ZERO_COMMISSION_NOTE,
  breathe,
  cardSurface,
  chalk,
  courtGreen,
  dram,
  eyebrowStyle,
  hairline,
  hashUnit,
  ink,
  muted,
  loopT,
  useMotionFrame,
} from "./dashboardKit";

const CANVAS_W = 1280;

export type EmptyGhostTile = {
  /** Mono caps label — the same labels the filled dashboard will use. */
  label: string;
  /** The honest reading right now. Written out, not animated. */
  value: string;
  /** Why it reads that way. */
  caption: string;
};

export type EmptyDashboardFirstVenueProps = {
  /** Greeting line. */
  greeting: string;
  /** Headline in the centre panel. */
  title: string;
  /** Body under the headline. */
  body: string;
  /** Call-to-action pill. Empty string hides it. */
  actionLabel: string;
  /** The zeroed stat tiles across the top. */
  tiles: EmptyGhostTile[];
  /** Marching-ant cells around each ghost tile. Whole numbers keep the seam. */
  dashCells: number;
};

export const emptyDashboardFirstVenueDefaultProps: EmptyDashboardFirstVenueProps =
  {
    greeting: "Owner dashboard",
    title: "Nothing here yet — and that is exactly right",
    body: "You have not listed a venue, so there is nothing to report. List one and this page fills itself in: every booking, every hour, every dram.",
    actionLabel: "List your first venue",
    tiles: [
      {
        label: "Revenue",
        value: dram(0),
        caption: "No venues listed",
      },
      { label: "Bookings", value: "0", caption: "Nothing to show yet" },
      { label: "Occupancy", value: "—", caption: "Needs a venue first" },
    ],
    dashCells: 28,
  };

/** Exact perimeter of a rounded rectangle: straights plus one full circle. */
const roundedPerimeter = (w: number, h: number, r: number): number => {
  const rr = Math.min(r, Math.min(w, h) / 2);
  return 2 * (w - 2 * rr) + 2 * (h - 2 * rr) + TAU * rr;
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The ghost tiles are outlined by a dash pattern of period `cell` whose
 *     offset advances by exactly `-cell` across the cycle. Shifting a periodic
 *     pattern by exactly one period repaints the identical pixels, so t = 0 and
 *     t = 1 are the same image. `cell` is the true rounded-rect perimeter over
 *     a whole number of cells, so the ants also meet cleanly at the corner.
 *  2. Every glow, the CTA ring and the drifting motes ride `breathe(t, φ)` —
 *     one full cosine period, equal at both ends for any phase.
 *  3. Nothing counts. The figures are ֏0 and 0 because they are ֏0 and 0.
 */
export const EmptyDashboardFirstVenue: FC<EmptyDashboardFirstVenueProps> = ({
  greeting,
  title,
  body,
  actionLabel,
  tiles,
  dashCells,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const unit = width / CANVAS_W;

  // Loop: frame 0 both opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);
  const t = loopT(frame, durationInFrames);
  const glow = breathe(t);

  const list = tiles.length > 0 ? tiles : [];
  const padX = 44 * unit;
  const gap = 20 * unit;
  const tileTop = 104 * unit;
  const tileH = 132 * unit;
  const tileW =
    list.length > 0
      ? (width - padX * 2 - gap * (list.length - 1)) / list.length
      : 0;

  const cells = Math.max(6, Math.round(dashCells));
  const tilePerimeter = roundedPerimeter(tileW, tileH, 18 * unit);
  const tileCell = tilePerimeter / cells;

  const panelTop = tileTop + tileH + 34 * unit;
  const panelH = height - panelTop - 44 * unit;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(92% 76% at 50% 0%, ${BRAND.surface1} 0%, ${BRAND.background} 74%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(46% 40% at 50% 68%, ${courtGreen(0.05 + 0.04 * glow)} 0%, transparent 72%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: padX,
          top: 40 * unit,
          display: "flex",
          alignItems: "center",
          gap: 14 * unit,
        }}
      >
        <span style={{ ...eyebrowStyle(unit * 1.15) }}>{greeting}</span>
        <span
          style={{
            fontFamily: SANS_FONT,
            fontSize: 14.5 * unit,
            color: muted(0.85),
          }}
        >
          ready when you are
        </span>
      </div>

      {/* The zeroed tiles. Outlined rather than filled: they are placeholders
          for a shape the owner already recognises, not broken cards. */}
      {list.map((tile, i) => (
        <div
          key={tile.label}
          style={{
            position: "absolute",
            left: padX + (tileW + gap) * i,
            top: tileTop,
            width: tileW,
            height: tileH,
            borderRadius: 18 * unit,
            backgroundColor: BRAND.surface1,
            padding: `${20 * unit}px ${22 * unit}px`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <svg
            width={tileW}
            height={tileH}
            viewBox={`0 0 ${tileW} ${tileH}`}
            style={{ position: "absolute", left: 0, top: 0 }}
          >
            <rect
              x={1 * unit}
              y={1 * unit}
              width={tileW - 2 * unit}
              height={tileH - 2 * unit}
              rx={18 * unit}
              fill="none"
              stroke={hairline(0.9)}
              strokeWidth={1.6 * unit}
              strokeDasharray={`${(tileCell * 0.42).toFixed(3)} ${(tileCell * 0.58).toFixed(3)}`}
              strokeDashoffset={(-t * tileCell).toFixed(4)}
            />
          </svg>

          <div
            style={{
              ...eyebrowStyle(unit, muted(0.75)),
              position: "relative",
            }}
          >
            {tile.label}
          </div>
          <div
            style={{
              position: "relative",
              marginTop: 12 * unit,
              fontFamily: MONO_FONT,
              fontVariantNumeric: "tabular-nums",
              fontSize: 38 * unit,
              fontWeight: 500,
              letterSpacing: -0.025 * 38 * unit,
              lineHeight: 1,
              color: chalk(0.4 + 0.08 * breathe(t, hashUnit(i, 3) * TAU)),
            }}
          >
            {tile.value}
          </div>
          <div
            style={{
              position: "relative",
              marginTop: 10 * unit,
              fontFamily: SANS_FONT,
              fontSize: 13.5 * unit,
              color: muted(0.7),
            }}
          >
            {tile.caption}
          </div>
        </div>
      ))}

      {/* The centre panel: an empty pitch, drawn properly, because the thing
          being asked for is a pitch. */}
      <div
        style={{
          position: "absolute",
          left: padX,
          right: padX,
          top: panelTop,
          height: panelH,
          ...cardSurface(unit, 22),
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          gap: 40 * unit,
          padding: `0 ${44 * unit}px`,
        }}
      >
        <svg
          width={300 * unit}
          height={panelH * 0.62}
          viewBox="0 0 300 190"
          style={{ flexShrink: 0, opacity: 0.62 + 0.14 * glow }}
        >
          <rect
            x={6}
            y={6}
            width={288}
            height={178}
            rx={6}
            fill={courtGreen(0.045)}
            stroke={courtGreen(0.34)}
            strokeWidth={2}
          />
          <line
            x1={150}
            y1={6}
            x2={150}
            y2={184}
            stroke={courtGreen(0.28)}
            strokeWidth={2}
          />
          <circle
            cx={150}
            cy={95}
            r={34}
            fill="none"
            stroke={courtGreen(0.28)}
            strokeWidth={2}
          />
          <circle cx={150} cy={95} r={4 + 2 * glow} fill={BRAND.primary} />
          <rect
            x={6}
            y={52}
            width={38}
            height={86}
            fill="none"
            stroke={courtGreen(0.24)}
            strokeWidth={2}
          />
          <rect
            x={256}
            y={52}
            width={38}
            height={86}
            fill="none"
            stroke={courtGreen(0.24)}
            strokeWidth={2}
          />
        </svg>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14 * unit,
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 34 * unit,
              fontWeight: 700,
              letterSpacing: -0.03 * 34 * unit,
              lineHeight: 1.15,
              color: BRAND.foreground,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: SANS_FONT,
              fontSize: 16.5 * unit,
              lineHeight: 1.5,
              color: BRAND.foregroundSoft,
              maxWidth: 620 * unit,
            }}
          >
            {body}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18 * unit,
              marginTop: 8 * unit,
            }}
          >
            {actionLabel.length > 0 ? (
              <div
                style={{
                  padding: `${13 * unit}px ${26 * unit}px`,
                  borderRadius: 999,
                  backgroundColor: BRAND.primary,
                  color: BRAND.primaryForeground,
                  fontFamily: DISPLAY_FONT,
                  fontSize: 17 * unit,
                  fontWeight: 700,
                  boxShadow: `0 0 0 ${(4 * unit * glow).toFixed(2)}px ${courtGreen(0.18 * glow)}, 0 ${10 * unit}px ${22 * unit}px ${-8 * unit}px ${courtGreen(0.5)}`,
                }}
              >
                {actionLabel}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9 * unit,
              }}
            >
              <div
                style={{
                  width: 7 * unit,
                  height: 7 * unit,
                  borderRadius: 999,
                  backgroundColor: BRAND.primary,
                  opacity: 0.45 + 0.55 * glow,
                }}
              />
              <span
                style={{
                  fontFamily: SANS_FONT,
                  fontSize: 15 * unit,
                  color: chalk(0.76),
                }}
              >
                {ZERO_COMMISSION_NOTE}
              </span>
            </div>
          </div>
        </div>
      </div>

      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 96% at 50% 44%, transparent 52%, ${ink(0.42)} 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
