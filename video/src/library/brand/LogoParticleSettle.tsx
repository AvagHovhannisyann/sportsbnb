/**
 * LogoParticleSettle — scattered court-green motes fly in, settle onto the
 * outline of the mark, and hand over to the solid logo as they burn out. The
 * "assembling" build-on: used on the marketing site's about-page header and as
 * the reveal beat after the launch-metrics montage.
 */

import { useMemo, type FC } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  NOISE_TILE,
  SPRING_ENTER,
  SPRING_SMOOTH,
  TAU,
  TRACKING_TIGHTER,
  chalk,
  courtGreen,
  cyan,
  noise,
  useBrandFrame,
} from "./brandKit";
import {
  MarkTile,
  PitchGlyph,
  StagePlate,
  WORDMARK_HEAD,
  WORDMARK_TAIL,
} from "./BrandGeometry";

export type LogoParticleSettleProps = {
  readonly head: string;
  readonly tail: string;
  readonly showWordmark: boolean;
  readonly markScale: number;
  /** How many motes assemble the mark. */
  readonly particleCount: number;
  /** Seed for the deterministic scatter — change it for a different flock. */
  readonly seed: number;
  /** How far out the motes start, as a multiple of the tile size. */
  readonly spread: number;
  /** Frames between the first and last mote starting its flight. */
  readonly settleStaggerInFrames: number;
  readonly backgroundColor: string;
};

export const logoParticleSettleDefaultProps: LogoParticleSettleProps = {
  head: WORDMARK_HEAD,
  tail: WORDMARK_TAIL,
  showWordmark: true,
  markScale: 0.34,
  particleCount: 64,
  seed: 11,
  spread: 1.35,
  settleStaggerInFrames: 34,
  backgroundColor: BRAND.background,
};

type Particle = {
  readonly id: string;
  /** Landing site, in tile-local units where the tile spans -0.5 … 0.5. */
  readonly ax: number;
  readonly ay: number;
  /** Launch site, same units. */
  readonly sx: number;
  readonly sy: number;
  readonly size: number;
  readonly tint: (a: number) => string;
  /** Fraction of the stagger window this mote starts at. */
  readonly delayFrac: number;
  /** Degrees of spin unwound on arrival. */
  readonly spin: number;
};

/**
 * Where a mote lands. Three families, so the assembled swarm reads as the mark
 * and not as a generic ring: the tile's own rounded perimeter, the centre
 * circle, and the halfway line.
 */
const anchorFor = (i: number, count: number): { x: number; y: number } => {
  const u = (i % count) / count;
  if (u < 0.62) {
    /** Perimeter of a square inset to the tile's padding, walked side by side. */
    const p = (u / 0.62) * 4;
    const side = Math.floor(p);
    const s = p - side;
    const r = 0.38;
    if (side === 0) return { x: -r + 2 * r * s, y: -r };
    if (side === 1) return { x: r, y: -r + 2 * r * s };
    if (side === 2) return { x: r - 2 * r * s, y: r };
    return { x: -r, y: r - 2 * r * s };
  }
  if (u < 0.86) {
    /** Centre circle. */
    const a = ((u - 0.62) / 0.24) * TAU;
    return { x: Math.cos(a) * 0.13, y: Math.sin(a) * 0.13 };
  }
  /** Halfway line. */
  const s = (u - 0.86) / 0.14;
  return { x: 0, y: -0.34 + 0.68 * s };
};

const buildParticles = (count: number, seed: number, spread: number): readonly Particle[] =>
  Array.from({ length: count }, (_, i): Particle => {
    const roll = (salt: number) => noise(i * 3.77 + seed * 19.13 + salt);
    const anchor = anchorFor(i, count);
    /** Launch on a ray through the anchor, so arrival reads as converging. */
    const angle = Math.atan2(anchor.y, anchor.x) + (roll(1) - 0.5) * 1.5;
    const distance = spread * (0.55 + roll(2) * 0.9);
    const kind = i % 6;
    return {
      id: `mote-${i}`,
      ax: anchor.x,
      ay: anchor.y,
      sx: Math.cos(angle) * distance,
      sy: Math.sin(angle) * distance,
      size: 0.008 + roll(3) * 0.014,
      tint: kind === 0 ? cyan : kind === 4 ? chalk : courtGreen,
      delayFrac: roll(4),
      spin: (roll(5) - 0.5) * 180,
    };
  });

export const LogoParticleSettle: FC<LogoParticleSettleProps> = ({
  head,
  tail,
  showWordmark,
  markScale,
  particleCount,
  seed,
  spread,
  settleStaggerInFrames,
  backgroundColor,
}) => {
  const frame = useBrandFrame(1);
  const { fps, width, height } = useVideoConfig();

  const shortSide = Math.min(width, height);
  const tileSize = shortSide * markScale;
  const wordSize = tileSize * 0.29;

  const particles = useMemo(
    () => buildParticles(Math.max(1, particleCount), seed, spread),
    [particleCount, seed, spread],
  );

  /** Frame by which the last mote has certainly landed. */
  const allSettled = 6 + settleStaggerInFrames + 30;

  /** The solid mark takes over from the swarm rather than joining it. */
  const markIn = spring({
    frame,
    fps,
    delay: allSettled - 12,
    config: SPRING_SMOOTH,
    durationInFrames: 22,
  });
  const wordIn = spring({
    frame,
    fps,
    delay: allSettled - 2,
    config: SPRING_ENTER,
    durationInFrames: 26,
  });
  const tailIn = spring({
    frame,
    fps,
    delay: allSettled + 5,
    config: SPRING_ENTER,
    durationInFrames: 26,
  });

  const glow = interpolate(frame, [0, allSettled], [0, 0.9], {
    extrapolateRight: "clamp",
    easing: EASE_OUT_EXPO,
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence name="Stage" layout="none">
        <StagePlate glow={glow} backgroundColor={backgroundColor} gridTile={shortSide * 0.09} />
      </Sequence>

      <Sequence name="Swarm" layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: tileSize, height: tileSize }}>
            {particles.map((p) => {
              const arrive = spring({
                frame,
                fps,
                delay: 6 + p.delayFrac * settleStaggerInFrames,
                config: SPRING_SMOOTH,
                durationInFrames: 30,
              });
              /** Motes dim out as the solid mark takes their place. */
              const alive = 1 - markIn;
              if (alive <= 0) {
                return null;
              }
              const x = interpolate(arrive, [0, 1], [p.sx, p.ax]) * tileSize;
              const y = interpolate(arrive, [0, 1], [p.sy, p.ay]) * tileSize;
              const d = p.size * tileSize * interpolate(arrive, [0, 1], [0.5, 1]);
              const a = alive * interpolate(arrive, [0, 0.25, 1], [0, 0.9, 0.75]);
              return (
                <div
                  key={p.id}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: d,
                    height: d,
                    marginLeft: -d / 2,
                    marginTop: -d / 2,
                    borderRadius: "50%",
                    backgroundColor: p.tint(a),
                    boxShadow: `0 0 ${d * 3}px ${d * 0.5}px ${p.tint(a * 0.4)}`,
                    transform: `translate(${x}px, ${y}px) rotate(${interpolate(arrive, [0, 1], [p.spin, 0])}deg)`,
                  }}
                />
              );
            })}
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Mark" layout="none">
        <AbsoluteFill
          style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}
        >
          <div
            style={{
              opacity: markIn,
              transform: `scale(${interpolate(markIn, [0, 1], [0.94, 1])})`,
            }}
          >
            <MarkTile size={tileSize} glow={glow}>
              <PitchGlyph width={tileSize * 0.66} dot={markIn} />
            </MarkTile>
          </div>

          {showWordmark ? (
            <div
              style={{
                marginTop: tileSize * 0.28,
                display: "flex",
                alignItems: "baseline",
                fontFamily: DISPLAY_FONT,
                fontSize: wordSize,
                fontWeight: 700,
                letterSpacing: TRACKING_TIGHTER,
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  color: BRAND.foreground,
                  opacity: wordIn,
                  transform: `translateY(${interpolate(wordIn, [0, 1], [wordSize * 0.3, 0])}px)`,
                }}
              >
                {head}
              </span>
              <span
                style={{
                  display: "inline-block",
                  color: BRAND.primary,
                  opacity: tailIn,
                  transform: `translateY(${interpolate(tailIn, [0, 1], [wordSize * 0.3, 0])}px)`,
                  textShadow: `0 0 ${wordSize * 0.6}px ${courtGreen(0.3 * tailIn)}`,
                }}
              >
                {tail}
              </span>
            </div>
          ) : null}
        </AbsoluteFill>
      </Sequence>

      <Sequence name="Grain" layout="none">
        <AbsoluteFill style={{ backgroundImage: NOISE_TILE, opacity: 0.05 }} />
      </Sequence>
    </AbsoluteFill>
  );
};
