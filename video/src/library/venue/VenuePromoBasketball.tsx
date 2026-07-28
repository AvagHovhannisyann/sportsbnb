/**
 * VenuePromoBasketball — the hero loop behind a full-court listing: the key,
 * the arc and a dribbling ball under a shot clock that runs down and resets.
 * Card header on /venues/:id and the vertical social cut for that listing.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { ListingPlate, StageDressing } from "./venueChrome";
import {
  BRAND,
  MONO_FONT,
  SPORTS,
  TAU,
  amber,
  bounce,
  chalk,
  ink,
  mix,
  oscillate,
  tint,
  useMotionFrame,
  wrap,
} from "./venueKit";

const CANVAS_W = 1080;

export type VenuePromoBasketballProps = {
  venueName: string;
  city: string;
  pricePerHour: number;
  rating: number;
  reviewCount: number;
  /** Dribbles per loop. Must be a whole number for the ball to land on frame 0. */
  dribbles: number;
  /** Seconds the shot clock shows at the top of the cycle. */
  shotClockFrom: number;
  /** Draw the hardwood grain under the markings. */
  showGrain: boolean;
};

export const venuePromoBasketballDefaultProps: VenuePromoBasketballProps = {
  venueName: "Vahagni Court",
  city: "Yerevan",
  pricePerHour: 8000,
  rating: 4.6,
  reviewCount: 58,
  dribbles: 6,
  shotClockFrom: 24,
  showGrain: true,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 *  1. The ball's height is `bounce(t, dribbles)` = `|sin(π · dribbles · t)|`,
 *     which is exactly 0 at t=0 and at t=1 for whole `dribbles` — the ball is
 *     on the floor at both ends.
 *  2. Its sideways drift is `oscillate(t)`, one full cosine, so it returns.
 *  3. The rim glow and the backboard sheen are also full cosines.
 *  4. The shot clock is `shotClockFrom - floor(t · (shotClockFrom + 1))`, a
 *     discrete ramp that reads `shotClockFrom` again the instant t wraps. The
 *     frame at `durationInFrames` is never rendered; the frame that replaces
 *     it is frame 0, which shows the same number.
 *
 * No one-way tween anywhere.
 */
export const VenuePromoBasketball: FC<VenuePromoBasketballProps> = ({
  venueName,
  city,
  pricePerHour,
  rating,
  reviewCount,
  dribbles,
  shotClockFrom,
  showGrain,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // Loop: frame 0 is the shared open/close state.
  const frame = useMotionFrame(rawFrame, 0);

  const t = wrap(frame, durationInFrames) / durationInFrames;
  const unit = width / CANVAS_W;
  const sport = SPORTS.basketball;

  const lift = bounce(t, dribbles);
  const sway = oscillate(t);
  const breath = oscillate(t);

  const courtTop = height * 0.09;
  const courtH = height * 0.48;
  const padX = 88 * unit;
  const courtW = width - padX * 2;
  const cx = padX + courtW / 2;
  const baseline = courtTop + courtH;

  // Key + arc, drawn from the far baseline as a half court.
  const keyW = courtW * 0.36;
  const keyH = courtH * 0.42;
  const arcR = courtW * 0.42;

  const floorY = baseline - 40 * unit;
  const ballY = floorY - lift * courtH * 0.52;
  const ballX = cx + (sway - 0.5) * courtW * 0.34;
  const squash = 1 - 0.2 * (1 - lift);

  const clock = Math.max(
    0,
    shotClockFrom - Math.floor(t * (shotClockFrom + 1)),
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(92% 52% at 50% 24%, ${sport.surface} 0%, ${BRAND.background} 74%)`,
        }}
      />

      {showGrain ? (
        <AbsoluteFill
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, ${amber(0.03)} 0px, ${amber(0.03)} ${3 * unit}px, transparent ${3 * unit}px, transparent ${11 * unit}px)`,
            maskImage: `radial-gradient(70% 48% at 50% 34%, black 0%, transparent 78%)`,
            WebkitMaskImage: `radial-gradient(70% 48% at 50% 34%, black 0%, transparent 78%)`,
          }}
        />
      ) : null}

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
        fill="none"
      >
        <g stroke={chalk(0.2)} strokeWidth={2.6 * unit} strokeLinecap="round">
          <line x1={padX} y1={courtTop} x2={padX + courtW} y2={courtTop} />
          <line x1={padX} y1={courtTop} x2={padX} y2={baseline} />
          <line x1={padX + courtW} y1={courtTop} x2={padX + courtW} y2={baseline} />
          <rect x={cx - keyW / 2} y={courtTop} width={keyW} height={keyH} />
          <circle cx={cx} cy={courtTop + keyH} r={keyW * 0.32} />
          <path
            d={`M ${cx - arcR} ${courtTop} L ${cx - arcR} ${courtTop + courtH * 0.14} A ${arcR} ${arcR} 0 0 0 ${cx + arcR} ${courtTop + courtH * 0.14} L ${cx + arcR} ${courtTop}`}
          />
        </g>

        {/* Backboard and rim. The rim carries the accent; nothing else does. */}
        <rect
          x={cx - 62 * unit}
          y={courtTop - 10 * unit}
          width={124 * unit}
          height={8 * unit}
          rx={3 * unit}
          fill={chalk(0.16 + 0.12 * breath)}
        />
        <ellipse
          cx={cx}
          cy={courtTop + 26 * unit}
          rx={34 * unit}
          ry={9 * unit}
          fill="none"
          stroke={sport.accent}
          strokeWidth={4 * unit}
          opacity={0.55 + 0.35 * breath}
        />
        {/* Net — six strands, each swinging on the same full cosine. */}
        {[-2, -1, 0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M ${cx + i * 13 * unit} ${courtTop + 30 * unit} Q ${cx + i * 8 * unit + (sway - 0.5) * 8 * unit} ${courtTop + 52 * unit} ${cx + i * 5 * unit} ${courtTop + 70 * unit}`}
            stroke={chalk(0.24)}
            strokeWidth={2 * unit}
          />
        ))}

        {/* Floor shadow, tightest at the top of the bounce. */}
        <ellipse
          cx={ballX}
          cy={floorY + 22 * unit}
          rx={mix(30, 15, lift) * unit}
          ry={mix(9, 4.5, lift) * unit}
          fill={ink(mix(0.5, 0.14, lift))}
        />

        <g transform={`translate(${ballX} ${ballY}) scale(${1 / squash} ${squash})`}>
          <circle r={24 * unit} fill={sport.accent} />
          <circle r={24 * unit} fill="none" stroke={ink(0.5)} strokeWidth={2.4 * unit} />
          {/* Seams rotate with the travel, so the ball reads as rolling. */}
          <g
            transform={`rotate(${(TAU * t * 180) / Math.PI})`}
            stroke={ink(0.5)}
            strokeWidth={2.2 * unit}
            fill="none"
          >
            <line x1={-24 * unit} y1={0} x2={24 * unit} y2={0} />
            <path d={`M ${-17 * unit} ${-17 * unit} Q 0 0 ${-17 * unit} ${17 * unit}`} />
            <path d={`M ${17 * unit} ${-17 * unit} Q 0 0 ${17 * unit} ${17 * unit}`} />
          </g>
        </g>
      </svg>

      {/* Shot clock. Tabular numerals, because a digit that shifts width is a
          scoreboard that jitters. */}
      <div
        style={{
          position: "absolute",
          top: courtTop - 62 * unit,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: MONO_FONT,
          fontSize: 30 * unit,
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: 0.1 * 30 * unit,
          color: tint(sport.accent, 0.55 + 0.35 * breath),
        }}
      >
        {clock < 10 ? `0${clock}` : clock}
      </div>

      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, transparent 44%, ${ink(0.62)} 68%, ${ink(0.92)} 100%)`,
        }}
      />

      <ListingPlate
        venueName={venueName}
        city={city}
        sportLabel={sport.label}
        accent={sport.accent}
        price={pricePerHour}
        rating={rating}
        reviewCount={reviewCount}
        unit={unit}
        width={width}
        bottom={72 * unit}
        idPrefix="promo-basketball"
      />

      <StageDressing />
    </AbsoluteFill>
  );
};
