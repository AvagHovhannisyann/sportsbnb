/**
 * ReelNewVenueAnnouncement — "just listed": a new pitch arriving on the
 * marketplace, with its district, surface, format and opening price.
 * 9:16 for Reels / TikTok / Stories, one-way, made to be posted the day a
 * listing goes live.
 *
 * ── Safe area ─────────────────────────────────────────────────────────────
 * 1080×1920. The NEW stamp, the venue name, the spec grid and the price strip
 * all sit between y=270 (top 14%) and y=1536 (bottom 20%), clear of the
 * account row, sound pill, caption block and action rail. Only the backdrop,
 * the card glow and the sweep bleed past those lines.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * One-way, so `seamless: false`. The stamp lands rotated and settles, the card
 * rises, the four spec tiles arrive on a diagonal stagger and the price strip
 * closes. Reduced motion freezes on the LAST frame, with the listing fully
 * announced.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  Backdrop,
  Box,
  Eyebrow,
  Handle,
  Lockup,
  Money,
  PinIcon,
  PitchThumb,
} from "./socialChrome";
import {
  BRAND,
  COMMISSION,
  DRAM,
  REEL,
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
  numeralStyle,
  onAccent,
  popIn,
  stagger,
  useMotionFrame,
} from "./socialKit";

export type VenueSpec = {
  label: string;
  value: string;
};

export type ReelNewVenueAnnouncementProps = {
  /** The stamp word. "NEW", "JUST LISTED", "NOW BOOKABLE". */
  stampLabel: string;
  venueName: string;
  district: string;
  city: string;
  sport: string;
  /** Four tiles: surface, format, lights, parking — whatever the listing has. */
  specs: VenueSpec[];
  pricePerHour: number;
  currency: string;
  pitchHue: number;
  accent: Accent;
};

export const reelNewVenueAnnouncementDefaultProps: ReelNewVenueAnnouncementProps =
  {
    stampLabel: "JUST LISTED",
    venueName: "Nairi Football Park",
    district: "Ajapnyak",
    city: "Yerevan",
    sport: "Football",
    specs: [
      { label: "Surface", value: "3G turf" },
      { label: "Format", value: "11-a-side" },
      { label: "Lights", value: "Until 23:00" },
      { label: "Parking", value: "Free, 40 cars" },
    ],
    pricePerHour: 26000,
    currency: DRAM,
    pitchHue: 138,
    accent: "green",
  };

const { width: W, height: H, safeTop: TOP, safeBottom: BOTTOM, gutter: G } = REEL;
const CONTENT_W = W - G * 2;

const SPEC_AT = 96;
const PRICE_AT = 146;

export const ReelNewVenueAnnouncement: FC<ReelNewVenueAnnouncementProps> = ({
  stampLabel,
  venueName,
  district,
  city,
  sport,
  specs,
  pricePerHour,
  currency,
  pitchHue,
  accent,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // One-way: the announced listing is the message, so calm freezes last frame.
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const stamp = popIn(frame, fps, 4, 30);
  const cardRise = popIn(frame, fps, 34, 32);
  const priceRise = popIn(frame, fps, PRICE_AT, 30);

  const tiles = specs.slice(0, 4);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <Backdrop
        width={W}
        height={H}
        t={loopT(frame, durationInFrames)}
        motion={1}
        accent={accent}
        cell={72}
        bloomAt={[0.5, 0.26]}
      />

      {/* ── The stamp ─────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={TOP}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [4, 16], [0, 1]),
          transform: `rotate(${(1 - stamp) * -8}deg) scale(${0.8 + stamp * 0.2})`,
          transformOrigin: "0% 50%",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            padding: "14px 26px",
            borderRadius: 20,
            backgroundColor: accentColor(accent),
            boxShadow: `0 0 70px -18px ${accentAlpha(accent, 0.95)}`,
          }}
        >
          <span style={numeralStyle(30, onAccent(accent), 700)}>
            {stampLabel}
          </span>
        </div>
        <Eyebrow size={25} color={muted(1)} dot={false}>
          {`${sport} · ${city}`}
        </Eyebrow>
      </Box>

      <Box
        x={G}
        y={TOP + 96}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [16, 30], [0, 1]),
          transform: `translateY(${(1 - popIn(frame, fps, 16, 30)) * 36}px)`,
        }}
      >
        <div style={headlineStyle(94, BRAND.foreground)}>{venueName}</div>
      </Box>

      <Box
        x={G}
        y={TOP + 226}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [24, 38], [0, 1]),
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <PinIcon size={32} color={accentColor(accent)} weight={2} />
        <span style={bodyStyle(32, muted(1))}>
          {district}, {city}
        </span>
      </Box>

      {/* ── The card ───────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={640}
        w={CONTENT_W}
        h={420}
        style={{
          opacity: interpolateSafe(frame, [34, 48], [0, 1]),
          transform: `translateY(${(1 - cardRise) * 54}px) scale(${0.96 + cardRise * 0.04})`,
          transformOrigin: "50% 40%",
          borderRadius: 48,
          overflow: "hidden",
          border: `2px solid ${accentAlpha(accent, 0.3)}`,
          boxShadow: `0 44px 96px -34px ${ink(0.9)}, 0 0 120px -34px ${accentAlpha(accent, 0.6)}`,
        }}
      >
        <div style={{ position: "absolute", inset: 0 }}>
          <PitchThumb size={CONTENT_W} hue={pitchHue} radius={0} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to top, ${ink(0.86)} 0%, ${ink(0.3)} 46%, transparent 82%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 34,
            bottom: 30,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <span style={bodyStyle(30, chalk(0.95), 600)}>
            Bookable from today
          </span>
        </div>
      </Box>

      {/* ── Spec tiles ────────────────────────────────────────────────── */}
      <Box
        x={G}
        y={1092}
        w={CONTENT_W}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        {tiles.map((spec, i) => {
          const at = SPEC_AT + stagger(i, 8, 4);
          return (
            <div
              key={spec.label}
              style={{
                width: (CONTENT_W - 20) / 2,
                height: 128,
                boxSizing: "border-box",
                borderRadius: 32,
                backgroundColor: BRAND.card,
                border: `1.5px solid ${BRAND.border}`,
                padding: "0 28px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 6,
                opacity: interpolateSafe(frame, [at, at + 10], [0, 1]),
                transform: `translateY(${(1 - popIn(frame, fps, at, 24)) * 26}px)`,
              }}
            >
              <span style={numeralStyle(21, muted(0.9), 500)}>
                {spec.label.toUpperCase()}
              </span>
              <span style={bodyStyle(31, chalk(0.95), 600)}>{spec.value}</span>
            </div>
          );
        })}
      </Box>

      {/* ── Price strip ───────────────────────────────────────────────── */}
      <Box
        x={G}
        y={1372}
        w={CONTENT_W}
        h={116}
        style={{
          opacity: interpolateSafe(frame, [PRICE_AT, PRICE_AT + 12], [0, 1]),
          transform: `translateY(${(1 - priceRise) * 32}px)`,
          borderRadius: 34,
          backgroundColor: accentAlpha(accent, 0.12),
          border: `2px solid ${accentAlpha(accent, 0.45)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 34px",
        }}
      >
        <span style={bodyStyle(27, chalk(0.92), 600)}>{COMMISSION.proof}</span>
        <Money
          amount={pricePerHour}
          currency={currency}
          size={42}
          color={accentColor(accent)}
          suffix="/ hour"
        />
      </Box>

      <Box
        x={G}
        y={BOTTOM - 66}
        w={CONTENT_W}
        style={{
          opacity: interpolateSafe(frame, [PRICE_AT + 20, PRICE_AT + 34], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Lockup size={50} accent={accent} />
        <Handle size={21} />
      </Box>

      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${ink(0.45)} 0%, transparent 18%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
