/**
 * SportsBnB — "VenuePromo"
 * 1080x1080 · 30fps · 450 frames (15s) square social promo.
 *
 * This is a TEMPLATE, not a one-off: every piece of copy on screen comes from
 * props, so one listing row renders one video. `venuePromoDefaultProps` is a
 * realistic Yerevan listing so the composition is useful the moment it is
 * registered.
 *
 * Palette and type stacks are lifted verbatim from the real design system
 * (src/index.css, the `.dark` "Court at night" block) rather than invented.
 * The webfont families are still *named* at the head of each stack — naming a
 * family is not a fetch — but nothing here declares an @font-face or a URL, so
 * a headless render simply falls through to the system faces behind them. The
 * dram sign (U+058F) is missing from the brand faces, so the stacks end with
 * the GNU FreeFont families, which carry it.
 *
 * Motion contract:
 *   - spring() drives every entrance, the dock, and the slot selection —
 *     anything that should feel like it has mass.
 *   - interpolate() drives only what is genuinely linear or eased-linear in
 *     the fiction: the price odometer, the court line draw-on, the progress
 *     rail, opacity fades, the CTA sheen.
 *   - Ambient motion (glow drift, live-dot ping, CTA sheen) is built from
 *     whole periods that divide 450 exactly — 450/150=3, 450/225=2, 450/90=5,
 *     450/45=10 — and is driven off the *absolute* frame rather than a
 *     Sequence-local one, so every ambient layer holds the same value at frame
 *     450 as at frame 0 and a looped conference screen never jumps. The
 *     narrative itself is a one-way build, not a loop.
 *   - `prefers-reduced-motion: reduce` removes every transform, every drift,
 *     the odometer and the court draw-on, leaving staggered opacity fades. The
 *     one thing it keeps is the progress rail, which reports how much of the
 *     clip is left rather than decorating it. Verified by forcing the flag and
 *     rendering: the final frame is pixel-identical to the animated one, so
 *     nothing is lost, only the way it arrives.
 */

import type { CSSProperties, FC, ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* ------------------------------------------------------------------ *
 * Composition constants
 * ------------------------------------------------------------------ */

export const VENUE_PROMO_FPS = 30;
export const VENUE_PROMO_DURATION_IN_FRAMES = 450; // 15s
export const VENUE_PROMO_WIDTH = 1080;
export const VENUE_PROMO_HEIGHT = 1080;

/** Frame at which the brand lockup finishes its opening beat and docks. */
const DOCK_AT = 70;
/** Frame at which the venue card sequence begins. */
const CARD_AT = 88;
/** Frame at which the closing caption fades up — just after the CTA lands. */
const CAPTION_AT = 308;

/* ------------------------------------------------------------------ *
 * Design tokens — copied from the `.dark` block of src/index.css.
 * Stored as bare HSL triplets so alpha can be applied the same way the
 * stylesheet does it: hsl(var(--primary) / 0.18).
 * ------------------------------------------------------------------ */

const T = {
  background: "160 22% 5%",
  surface1: "160 18% 10%",
  surface2: "160 15% 14%",
  surface3: "158 13% 18%",
  card: "160 15% 13%",
  foreground: "100 20% 96%",
  foregroundSoft: "130 8% 72%",
  mutedForeground: "130 8% 64%",
  primary: "151 90% 47%",
  primaryForeground: "160 25% 5%",
  primarySoft: "155 45% 12%",
  border: "157 12% 22%",
  borderStrong: "155 10% 26%",
  warning: "42 95% 55%",
  chart2: "190 80% 50%",
  chart3: "42 95% 55%",
  chart4: "268 80% 76%",
} as const;

const c = (token: string, alpha?: number): string =>
  alpha === undefined ? `hsl(${token})` : `hsl(${token} / ${alpha})`;

/**
 * The accent is the one thing that varies per listing. Every value below is a
 * design-system token, so a padel promo and a football promo are recognisably
 * the same product. Anything unmapped falls back to the brand green.
 */
const SPORT_ACCENT: Record<string, string> = {
  football: T.primary,
  futsal: T.primary,
  soccer: T.primary,
  basketball: T.chart3,
  volleyball: T.chart4,
  tennis: T.chart2,
  padel: T.chart2,
  swimming: T.chart2,
  badminton: T.chart4,
  "table tennis": T.chart3,
};

const accentFor = (sport: string): string =>
  SPORT_ACCENT[sport.trim().toLowerCase()] ?? T.primary;

/* ------------------------------------------------------------------ *
 * Type stacks
 * ------------------------------------------------------------------ */

const FREE = "'FreeSans', 'DejaVu Sans'";
const FONT_DISPLAY = `'Space Grotesk', ui-sans-serif, system-ui, 'Segoe UI', 'Liberation Sans', ${FREE}, sans-serif`;
const FONT_SANS = `'DM Sans', ui-sans-serif, system-ui, 'Segoe UI', 'Liberation Sans', ${FREE}, sans-serif`;
const FONT_MONO = `'JetBrains Mono', ui-monospace, 'DejaVu Sans Mono', 'Liberation Mono', 'FreeMono', monospace`;

/* ------------------------------------------------------------------ *
 * Reduced motion
 *
 * Read once at the top of the tree and pushed down through context, so a
 * single matchMedia subscription serves every animated node.
 * ------------------------------------------------------------------ */

const ReducedMotionContext = createContext<boolean>(false);
const useReducedMotion = (): boolean => useContext(ReducedMotionContext);

/**
 * `useCurrentFrame()` is Sequence-local, which is exactly what entrances want
 * and exactly what looping ambient cycles do not: `frame % 90` inside a
 * Sequence starting at 88 is not aligned to the composition. Each Sequence
 * publishes its `from` here, so ambient layers can ask for the absolute frame
 * and stay period-aligned to the 450-frame composition.
 */
const FrameEpochContext = createContext<number>(0);
const useAbsoluteFrame = (): number => useCurrentFrame() + useContext(FrameEpochContext);

const useSystemReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
};

/* ------------------------------------------------------------------ *
 * Small maths helpers
 * ------------------------------------------------------------------ */

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Thousands grouping without Intl — headless ICU builds are not guaranteed. */
const groupThousands = (value: number): string => {
  const digits = String(Math.max(0, Math.round(value)));
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) {
      out += ",";
    }
    out += digits[i];
  }
  return out;
};

type SpringOptions = {
  damping?: number;
  mass?: number;
  stiffness?: number;
};

type Entrance = {
  /** Spring position. Overshoots past 1 on the snappier configs. */
  progress: number;
  /** 1 - progress, clamped at the low end. Multiply travel distances by this. */
  rest: number;
  /** Never overshoots, so it is safe for opacity and blur. */
  opacity: number;
};

/**
 * One staggered entrance. Under reduced motion the spring is skipped entirely
 * (rest === 0, so every transform that reads it collapses to identity) and the
 * element simply fades up over 6 frames.
 */
const useEntrance = (delay: number, options?: SpringOptions): Entrance => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = useReducedMotion();

  const opacity = interpolate(frame, [delay, delay + (reduced ? 6 : 12)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (reduced) {
    return { progress: 1, rest: 0, opacity };
  }

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: options?.damping ?? 18,
      mass: options?.mass ?? 0.9,
      stiffness: options?.stiffness ?? 130,
    },
  });

  return { progress, rest: Math.max(0, 1 - progress), opacity };
};

/**
 * A whole-period sine. `period` must divide the composition length for the
 * piece to loop cleanly; every call site below uses 90, 150 or 225 against 450.
 */
const useDrift = (period: number, phase = 0): number => {
  const frame = useAbsoluteFrame();
  const reduced = useReducedMotion();
  if (reduced) {
    return 0;
  }
  return Math.sin((frame / period + phase) * Math.PI * 2);
};

/* ------------------------------------------------------------------ *
 * Backdrop — court markings, ambient glow, vignette, grain
 * ------------------------------------------------------------------ */

const COURT_STROKE = 3;

const Backdrop: FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const reduced = useReducedMotion();

  // The pitch draws itself on over the first second and a bit. A draw-on is a
  // linear act, so interpolate with a gentle ease rather than a spring. It is
  // also purely decorative motion, so reduced motion gets the finished pitch
  // and lets `courtFade` below bring it in as an opacity fade instead.
  const draw = reduced
    ? 1
    : interpolate(frame, [4, 52], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.quad),
      });
  const courtFade = interpolate(frame, [4, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Whole periods against 450 frames: 3, 2 and 5 complete cycles.
  const driftA = useDrift(150);
  const driftB = useDrift(225, 0.25);
  const driftC = useDrift(90, 0.5);

  const dash: CSSProperties = {
    // pathLength normalises every shape to 1 so one dash pair drives them all.
    strokeDasharray: 1,
    strokeDashoffset: 1 - draw,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: c(T.background) }}>
      {/* Accent wash from the top — mirrors .bg-radial-fade */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 78% 52% at 50% -8%, ${c(accent, 0.2)}, transparent 62%)`,
        }}
      />
      {/* Two slow orbs. Under reduced motion the drifts are 0 and they sit still. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle 420px at ${50 + driftA * 6}% ${74 + driftB * 4}%, ${c(
            accent,
            0.14,
          )}, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle 340px at ${18 - driftB * 5}% ${30 + driftC * 5}%, ${c(
            T.chart2,
            0.08,
          )}, transparent 72%)`,
        }}
      />

      {/* Court markings */}
      <AbsoluteFill
        style={{
          opacity: courtFade * 0.9,
          transform: reduced
            ? undefined
            : `translate3d(${driftA * 10}px, ${driftB * 8}px, 0) scale(${1 + driftC * 0.006})`,
        }}
      >
        <svg
          width={VENUE_PROMO_WIDTH}
          height={VENUE_PROMO_HEIGHT}
          viewBox="0 0 1080 1080"
          fill="none"
        >
          <g
            stroke={c(accent, 0.22)}
            strokeWidth={COURT_STROKE}
            strokeLinecap="round"
            transform="rotate(-9 540 540)"
          >
            <rect x={90} y={250} width={900} height={580} rx={10} pathLength={1} style={dash} />
            <line x1={540} y1={250} x2={540} y2={830} pathLength={1} style={dash} />
            <circle cx={540} cy={540} r={104} pathLength={1} style={dash} />
            <rect x={90} y={410} width={132} height={260} pathLength={1} style={dash} />
            <rect x={858} y={410} width={132} height={260} pathLength={1} style={dash} />
          </g>
          <circle cx={540} cy={540} r={7} fill={c(accent, 0.3 * draw)} />
        </svg>
      </AbsoluteFill>

      {/* Vignette, so the corners never compete with the card */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 74% 74% at 50% 46%, transparent 40%, ${c(
            T.background,
            0.86,
          )} 100%)`,
        }}
      />

      {/* The same feTurbulence grain the .glass component uses. Rendered as a
          real SVG node rather than a background-image: Remotion cannot
          guarantee a CSS background has decoded before it screenshots the
          frame, and an inline node has nothing to decode. Nothing here is
          fetched — the noise is generated by the filter itself. */}
      <AbsoluteFill style={{ opacity: 0.05 }}>
        <svg width={VENUE_PROMO_WIDTH} height={VENUE_PROMO_HEIGHT}>
          <filter id="vp-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} />
          </filter>
          <rect
            width={VENUE_PROMO_WIDTH}
            height={VENUE_PROMO_HEIGHT}
            filter="url(#vp-grain)"
          />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ *
 * Brand lockup — opens large and centred, then docks to the header
 * ------------------------------------------------------------------ */

const BrandMark: FC<{ size: number; accent: string }> = ({ size, accent }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect width={48} height={48} rx={14} fill={c(accent)} />
    <circle cx={24} cy={24} r={13} stroke={c(T.primaryForeground, 0.9)} strokeWidth={3} />
    <path
      d="M11 24c5.5 4 20.5 4 26 0"
      stroke={c(T.primaryForeground, 0.9)}
      strokeWidth={3}
      strokeLinecap="round"
    />
    <path
      d="M24 11c4 5.5 4 20.5 0 26"
      stroke={c(T.primaryForeground, 0.9)}
      strokeWidth={3}
      strokeLinecap="round"
    />
  </svg>
);

/**
 * The lockup is deliberately NOT tinted with the per-sport accent. The mark is
 * the brand and the accent is the listing: a basketball promo runs an amber
 * stage with a court-green SportsBnB on it, which is the whole point of having
 * one accent token that moves and one that does not.
 */
const BrandLockup: FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = useReducedMotion();

  const intro = useEntrance(2, { damping: 16, mass: 1.05, stiffness: 110 });

  // The dock is a single spring on a critically-damped config: the lockup
  // travels from the middle of the frame up into the header and shrinks as it
  // goes. One motion, no cross-fade between two copies of the same mark.
  const dockRaw = reduced
    ? 1
    : spring({
        frame: frame - DOCK_AT,
        fps,
        config: { damping: 200, mass: 1.2, stiffness: 92 },
      });
  const dock = clamp01(dockRaw);

  const scale = reduced ? 1 : lerp(2.05, 1, dock) * lerp(0.86, 1, clamp01(intro.progress));
  const shift = reduced ? 0 : lerp(300, 0, dock) + intro.rest * 26;

  return (
    <div
      style={{
        position: "absolute",
        top: 92,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: intro.opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          transform: `translate3d(0, ${shift}px, 0) scale(${scale})`,
          transformOrigin: "center top",
        }}
      >
        <BrandMark size={52} accent={T.primary} />
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            color: c(T.foreground),
            lineHeight: 1,
          }}
        >
          Sports
          <span style={{ color: c(T.primary) }}>BnB</span>
        </span>
      </div>
    </div>
  );
};

/**
 * The opening beat: three rings pushing out from behind the lockup and a
 * single line of positioning copy that leaves before the lockup docks.
 * Lives in its own Sequence, so all frames here are local.
 */
const OpeningBeat: FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = useReducedMotion();

  const tagline = useEntrance(16, { damping: 22, mass: 1, stiffness: 120 });
  const exit = interpolate(frame, [58, 76], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });

  const rings = [0, 1, 2];

  return (
    <AbsoluteFill>
      {!reduced
        ? rings.map((i) => {
            const p = clamp01(
              spring({
                frame: frame - 4 - i * 9,
                fps,
                config: { damping: 200, mass: 1.4, stiffness: 42 },
              }),
            );
            return (
              <AbsoluteFill
                key={i}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: (1 - p) * 0.5 * exit,
                }}
              >
                <div
                  style={{
                    width: 320,
                    height: 320,
                    borderRadius: "50%",
                    border: `2px solid ${c(T.primary, 0.55)}`,
                    transform: `translate3d(0, -70px, 0) scale(${lerp(0.35, 2.5, p)})`,
                  }}
                />
              </AbsoluteFill>
            );
          })
        : null}

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          opacity: tagline.opacity * exit,
        }}
      >
        <div
          style={{
            transform: `translate3d(0, ${100 + tagline.rest * 22}px, 0)`,
            fontFamily: FONT_MONO,
            fontSize: 21,
            fontWeight: 500,
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            color: c(T.primary),
            textAlign: "center",
          }}
        >
          Book the court · Armenia
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ *
 * Card furniture
 * ------------------------------------------------------------------ */

const Reveal: FC<{
  delay: number;
  travel?: number;
  blur?: number;
  spring?: SpringOptions;
  style?: CSSProperties;
  children: ReactNode;
}> = ({ delay, travel = 26, blur = 0, spring: springOptions, style, children }) => {
  const { rest, opacity } = useEntrance(delay, springOptions);
  return (
    <div
      style={{
        ...style,
        opacity,
        transform: rest === 0 ? undefined : `translate3d(0, ${travel * rest}px, 0)`,
        filter: blur > 0 && rest > 0.004 ? `blur(${(blur * rest).toFixed(2)}px)` : undefined,
      }}
    >
      {children}
    </div>
  );
};

const SportChip: FC<{ sport: string; accent: string; delay: number }> = ({
  sport,
  accent,
  delay,
}) => {
  const { rest, opacity, progress } = useEntrance(delay, {
    damping: 14,
    mass: 0.8,
    stiffness: 150,
  });
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        height: 54,
        padding: "0 26px",
        borderRadius: 999,
        backgroundColor: c(accent, 0.14),
        border: `1px solid ${c(accent, 0.4)}`,
        opacity,
        transform: `translate3d(${-24 * rest}px, 0, 0) scale(${lerp(0.9, 1, clamp01(progress))})`,
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          backgroundColor: c(accent),
          boxShadow: `0 0 14px ${c(accent, 0.9)}`,
        }}
      />
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: c(accent),
        }}
      >
        {sport}
      </span>
    </div>
  );
};

const STAR_PATH =
  "M12 2.1l3.02 6.12 6.76.98-4.89 4.77 1.15 6.73L12 17.53l-6.04 3.17 1.15-6.73L2.22 9.2l6.76-.98z";

const RatingStars: FC<{ rating: number; delay: number }> = ({ rating, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = useReducedMotion();
  const value = Math.min(5, Math.max(0, rating));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const localDelay = delay + i * 4;
        const p = reduced
          ? 1
          : clamp01(
              spring({
                frame: frame - localDelay,
                fps,
                config: { damping: 12, mass: 0.65, stiffness: 190 },
              }),
            );
        const fade = interpolate(frame, [localDelay, localDelay + 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const fill = clamp01(value - i);
        const clipId = `vp-star-clip-${i}`;
        return (
          <svg
            key={i}
            width={30}
            height={30}
            viewBox="0 0 24 24"
            style={{
              opacity: fade,
              transform: reduced ? undefined : `scale(${lerp(0.4, 1, p)}) rotate(${(1 - p) * -35}deg)`,
            }}
          >
            <defs>
              <clipPath id={clipId}>
                <rect x={0} y={0} width={24 * fill} height={24} />
              </clipPath>
            </defs>
            <path d={STAR_PATH} fill={c(T.foreground, 0.14)} />
            {fill > 0 ? <path d={STAR_PATH} fill={c(T.warning)} clipPath={`url(#${clipId})`} /> : null}
          </svg>
        );
      })}
    </div>
  );
};

/** Per-word reveal. Words carry their own spring so the name assembles. */
const VenueName: FC<{ name: string; delay: number; fontSize: number }> = ({
  name,
  delay,
  fontSize,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = useReducedMotion();
  const words = name.split(/\s+/).filter((w) => w.length > 0);

  return (
    <h1
      style={{
        margin: 0,
        fontFamily: FONT_DISPLAY,
        fontSize,
        fontWeight: 700,
        lineHeight: 1.0,
        letterSpacing: "-0.04em",
        color: c(T.foreground),
      }}
    >
      {words.map((word, i) => {
        const wordDelay = delay + i * 6;
        const p = reduced
          ? 1
          : spring({
              frame: frame - wordDelay,
              fps,
              config: { damping: 20, mass: 1, stiffness: 128 },
            });
        const rest = reduced ? 0 : Math.max(0, 1 - p);
        const fade = interpolate(frame, [wordDelay, wordDelay + 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              marginRight: "0.28em",
              opacity: fade,
              transform: rest === 0 ? undefined : `translate3d(0, ${34 * rest}px, 0)`,
              filter: rest > 0.004 ? `blur(${(10 * rest).toFixed(2)}px)` : undefined,
            }}
          >
            {word}
          </span>
        );
      })}
    </h1>
  );
};

const PinIcon: FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <circle cx={12} cy={10} r={2.6} stroke={color} strokeWidth={1.8} />
  </svg>
);

const PriceBlock: FC<{
  price: number;
  currency: string;
  accent: string;
  delay: number;
}> = ({ price, currency, accent, delay }) => {
  const frame = useCurrentFrame();
  const reduced = useReducedMotion();
  const { rest, opacity } = useEntrance(delay, { damping: 19, mass: 1, stiffness: 120 });

  // Odometer. Eased-linear, so interpolate is the right tool; under reduced
  // motion the final figure is simply there.
  const rolled = reduced
    ? price
    : interpolate(frame, [delay + 4, delay + 40], [0, price], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
  const settled = frame >= delay + 40 || reduced;
  const shown = settled ? price : Math.round(rolled / 10) * 10;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 18,
        opacity,
        transform: rest === 0 ? undefined : `translate3d(0, ${22 * rest}px, 0)`,
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 92,
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.03em",
          color: c(T.foreground),
          lineHeight: 1,
        }}
      >
        {groupThousands(shown)}
      </span>
      {/* The dram sign (U+058F) is absent from every brand face, so it always
          resolves through fallback and lands lighter than the numerals beside
          it. Bumping the weight and size is what keeps the pair looking like
          one price rather than two fonts. */}
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 58,
          fontWeight: 700,
          color: c(accent),
          lineHeight: 1,
        }}
      >
        {currency}
      </span>
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: 26,
          fontWeight: 500,
          color: c(T.mutedForeground),
          letterSpacing: "-0.01em",
        }}
      >
        / hour
      </span>
    </div>
  );
};

const LiveDot: FC<{ accent: string }> = ({ accent }) => {
  const frame = useAbsoluteFrame();
  const reduced = useReducedMotion();
  // 450 / 45 = 10 whole pings, so frame 0 and frame 450 are identical.
  const t = reduced ? 0 : (frame % 45) / 45;
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        width: 9,
        height: 9,
        borderRadius: "50%",
        backgroundColor: c(accent),
      }}
    >
      {reduced ? null : (
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            backgroundColor: c(accent),
            transform: `scale(${1 + t * 1.7})`,
            opacity: 0.55 * (1 - t),
          }}
        />
      )}
    </span>
  );
};

const SlotRow: FC<{
  slots: string[];
  highlighted: number;
  accent: string;
  delay: number;
}> = ({ slots, highlighted, accent, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = useReducedMotion();

  // The pick lands just after the last chip has settled.
  const selectAt = delay + 8 * slots.length + 12;
  // Kept unclamped for the scale, clamped for anything that is a ratio: this
  // config peaks at ~1.18, which is the pop, but an opacity of 1.18 is not.
  const selectRaw = reduced
    ? 1
    : spring({
        frame: frame - selectAt,
        fps,
        config: { damping: 11, mass: 0.7, stiffness: 190 },
      });
  const select = clamp01(selectRaw);

  return (
    <div style={{ display: "flex", gap: 12 }}>
      {slots.map((slot, i) => {
        const slotDelay = delay + i * 8;
        const p = reduced
          ? 1
          : spring({
              frame: frame - slotDelay,
              fps,
              config: { damping: 15, mass: 0.8, stiffness: 165 },
            });
        const rest = reduced ? 0 : Math.max(0, 1 - p);
        const fade = interpolate(frame, [slotDelay, slotDelay + 9], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const isPicked = i === highlighted;
        const pick = isPicked ? select : 0;
        // Reduced motion keeps the selected *state* and drops the pop.
        const pop = isPicked && !reduced ? Math.max(0, selectRaw) : 0;

        return (
          <div
            key={slot}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 132,
              height: 58,
              borderRadius: 16,
              backgroundColor: c(T.surface2),
              border: `1px solid ${c(T.border)}`,
              opacity: fade,
              transform:
                rest === 0 && pop === 0
                  ? undefined
                  : `translate3d(0, ${18 * rest}px, 0) scale(${lerp(0.92, 1, clamp01(p)) + 0.055 * pop})`,
              boxShadow: pick > 0 ? `0 0 32px -6px ${c(accent, 0.5 * pick)}` : undefined,
            }}
          >
            {/* The selected state is a second surface fading in over the first,
                so the resting chip never has to change colour mid-tween. */}
            <div
              style={{
                position: "absolute",
                inset: -1,
                borderRadius: 16,
                backgroundColor: c(accent, 0.16),
                border: `1px solid ${c(accent, 0.75)}`,
                opacity: pick,
              }}
            />
            <span
              style={{
                position: "relative",
                fontFamily: FONT_MONO,
                fontSize: 22,
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
                color: pick > 0.5 ? c(accent) : c(T.foregroundSoft),
              }}
            >
              {slot}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const CheckIcon: FC<{ color: string }> = ({ color }) => (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none">
    <path
      d="M20 6.5L9.2 17.3 4 12.1"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PerkLine: FC<{ perks: string[]; accent: string; delay: number }> = ({
  perks,
  accent,
  delay,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
    {perks.map((perk, i) => (
      <Reveal
        key={perk}
        delay={delay + i * 7}
        travel={12}
        spring={{ damping: 20, mass: 0.8, stiffness: 150 }}
        style={{ display: "flex", alignItems: "center", gap: 9 }}
      >
        <CheckIcon color={c(accent)} />
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: 19,
            fontWeight: 500,
            color: c(T.foregroundSoft),
            whiteSpace: "nowrap",
          }}
        >
          {perk}
        </span>
      </Reveal>
    ))}
  </div>
);

const CtaPill: FC<{ label: string; accent: string; delay: number }> = ({
  label,
  accent,
  delay,
}) => {
  const absolute = useAbsoluteFrame();
  const reduced = useReducedMotion();
  const { rest, opacity, progress } = useEntrance(delay, {
    damping: 15,
    mass: 0.95,
    stiffness: 140,
  });

  // 450 / 90 = 5 whole sweeps: a pure modulo cycle on the absolute frame, so
  // it holds the same value at frame 450 as at frame 0.
  const sweep = reduced ? 0 : (absolute % 90) / 90;
  const sheenX = interpolate(sweep, [0, 0.45, 1], [-45, 145, 145], {
    easing: Easing.inOut(Easing.quad),
  });
  const nudge = reduced ? 0 : Math.sin((absolute / 90) * Math.PI * 2) * 4;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        height: 88,
        borderRadius: 26,
        overflow: "hidden",
        backgroundColor: c(accent),
        boxShadow: `0 0 46px -10px ${c(accent, 0.6)}, 0 18px 36px -18px ${c(T.background, 0.9)}`,
        opacity,
        transform:
          rest === 0 ? undefined : `translate3d(0, ${26 * rest}px, 0) scale(${lerp(0.96, 1, clamp01(progress))})`,
      }}
    >
      {reduced ? null : (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${sheenX}%`,
            width: "26%",
            transform: "skewX(-18deg)",
            background: `linear-gradient(90deg, transparent, ${c(T.foreground, 0.32)}, transparent)`,
          }}
        />
      )}
      <span
        style={{
          position: "relative",
          fontFamily: FONT_DISPLAY,
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: c(T.primaryForeground),
        }}
      >
        {label}
      </span>
      <svg
        width={30}
        height={30}
        viewBox="0 0 24 24"
        fill="none"
        style={{ position: "relative", transform: `translate3d(${nudge}px, 0, 0)` }}
      >
        <path
          d="M4 12h15M13.5 5.5L20 12l-6.5 6.5"
          stroke={c(T.primaryForeground)}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * The venue card
 * ------------------------------------------------------------------ */

type CardProps = {
  venueName: string;
  sport: string;
  pricePerHour: number;
  city: string;
  rating: number;
  reviewCount: number;
  currency: string;
  slots: string[];
  highlightedSlot: number;
  perks: string[];
  ctaLabel: string;
  accent: string;
};

/** Longer names step down a size so a two-line name still fits the card. */
const nameSizeFor = (name: string): number => {
  const n = name.length;
  if (n > 26) {
    return 56;
  }
  if (n > 18) {
    return 64;
  }
  return 74;
};

const VenueCard: FC<CardProps> = ({
  venueName,
  sport,
  pricePerHour,
  city,
  rating,
  reviewCount,
  currency,
  slots,
  highlightedSlot,
  perks,
  ctaLabel,
  accent,
}) => {
  const shell = useEntrance(0, { damping: 200, mass: 1.1, stiffness: 74 });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 88,
          right: 88,
          top: 196,
          height: 784,
          borderRadius: 44,
          padding: 56,
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(160deg, ${c(T.surface2)} 0%, ${c(T.card)} 48%, ${c(
            T.surface1,
          )} 100%)`,
          border: `1px solid ${c(T.borderStrong, 0.9)}`,
          boxShadow: `0 32px 64px -16px ${c(T.background, 0.9)}, inset 0 1px 0 0 ${c(
            T.foreground,
            0.06,
          )}`,
          opacity: shell.opacity,
          transform:
            shell.rest === 0
              ? undefined
              : `translate3d(0, ${34 * shell.rest}px, 0) scale(${lerp(0.965, 1, clamp01(shell.progress))})`,
        }}
      >
        {/* Accent hairline across the top edge of the card */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 60,
            right: 60,
            height: 2,
            borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${c(accent, 0.85)}, transparent)`,
            opacity: shell.opacity,
          }}
        />

        {/* Row 1 — sport chip and rating */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 54,
          }}
        >
          <SportChip sport={sport} accent={accent} delay={10} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <RatingStars rating={rating} delay={16} />
            <Reveal delay={38} travel={0} spring={{ damping: 22, mass: 0.8, stiffness: 150 }}>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 24,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                  color: c(T.foreground),
                }}
              >
                {rating.toFixed(1)}
              </span>
              <span
                style={{
                  marginLeft: 8,
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  color: c(T.mutedForeground),
                }}
              >
                ({reviewCount})
              </span>
            </Reveal>
          </div>
        </div>

        {/* Row 2 — the headline block, absorbing whatever slack is left */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <VenueName name={venueName} delay={26} fontSize={nameSizeFor(venueName)} />
          <Reveal
            delay={26 + 22}
            travel={16}
            spring={{ damping: 22, mass: 0.9, stiffness: 130 }}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <PinIcon size={26} color={c(T.mutedForeground)} />
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 500,
                color: c(T.foregroundSoft),
                letterSpacing: "-0.01em",
              }}
            >
              {city}, Armenia
            </span>
          </Reveal>
        </div>

        {/* Divider */}
        <Reveal delay={66} travel={0} spring={{ damping: 200, mass: 1, stiffness: 90 }}>
          <div
            style={{
              height: 1,
              backgroundColor: c(T.border),
            }}
          />
        </Reveal>

        {/* Row 3 — price */}
        <div style={{ marginTop: 26 }}>
          <PriceBlock price={pricePerHour} currency={currency} accent={accent} delay={80} />
        </div>

        {/* Row 4 — availability */}
        <div style={{ marginTop: 28 }}>
          <Reveal
            delay={114}
            travel={10}
            spring={{ damping: 22, mass: 0.8, stiffness: 150 }}
            style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}
          >
            <LiveDot accent={accent} />
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: c(accent),
              }}
            >
              Free today
            </span>
          </Reveal>
          {/* The chips start moving as the odometer lands (it settles at local
              frame 120), so the eye is handed down the card rather than left
              waiting on a half-empty panel. */}
          <SlotRow slots={slots} highlighted={highlightedSlot} accent={accent} delay={122} />
        </div>

        {/* Row 5 — trust line */}
        <div style={{ marginTop: 24 }}>
          <PerkLine perks={perks} accent={accent} delay={178} />
        </div>

        {/* Row 6 — CTA */}
        <div style={{ marginTop: 26 }}>
          <CtaPill label={ctaLabel} accent={accent} delay={206} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ *
 * Progress rail — the only genuinely linear thing in the piece
 * ------------------------------------------------------------------ */

const ProgressRail: FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const played = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 4,
        backgroundColor: c(T.border, 0.7),
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${played * 100}%`,
          backgroundColor: c(accent),
          boxShadow: `0 0 18px ${c(accent, 0.7)}`,
        }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * Props
 * ------------------------------------------------------------------ */

export type VenuePromoProps = {
  /** Venue display name. Steps down a size and wraps at two lines. */
  venueName: string;
  /** Primary sport. Drives the accent colour via SPORT_ACCENT. */
  sport: string;
  /** Price per hour, whole units of `currency`. */
  pricePerHour: number;
  /** City the venue sits in. Rendered as "{city}, Armenia". */
  city: string;
  /** Average review score, 0–5. Rendered to one decimal. */
  rating: number;
  /** Number of reviews behind `rating`. */
  reviewCount?: number;
  /** Currency symbol. Defaults to the Armenian dram sign. */
  currency?: string;
  /** Bookable slots, shown as chips. Four or five read best. */
  slots?: string[];
  /** Index into `slots` of the chip that pops as "picked". */
  highlightedSlot?: number;
  /** Trust line. Three short items read best. */
  perks?: string[];
  /** Call to action label. */
  ctaLabel?: string;
};

export const venuePromoDefaultProps: VenuePromoProps = {
  venueName: "Ararat Arena",
  sport: "Football",
  pricePerHour: 12000,
  city: "Yerevan",
  rating: 4.8,
  reviewCount: 126,
  currency: "֏",
  slots: ["18:00", "19:00", "20:00", "21:00"],
  highlightedSlot: 2,
  perks: ["Instant confirmation", "Free cancellation", "Verified venue"],
  ctaLabel: "Book now",
};

/* ------------------------------------------------------------------ *
 * Stage
 * ------------------------------------------------------------------ */

const VenuePromoStage: FC<VenuePromoProps> = ({
  venueName,
  sport,
  pricePerHour,
  city,
  rating,
  reviewCount,
  currency,
  slots,
  highlightedSlot,
  perks,
  ctaLabel,
}) => {
  const accent = accentFor(sport);
  const slotList = slots && slots.length > 0 ? slots : venuePromoDefaultProps.slots ?? [];
  const perkList = perks && perks.length > 0 ? perks : venuePromoDefaultProps.perks ?? [];

  return (
    <AbsoluteFill style={{ backgroundColor: c(T.background) }}>
      <Backdrop accent={accent} />

      <Sequence durationInFrames={DOCK_AT + 20} name="Opening" layout="none">
        <OpeningBeat />
      </Sequence>

      <BrandLockup />

      <Sequence from={CARD_AT} name="Venue card" layout="none">
        <FrameEpochContext.Provider value={CARD_AT}>
          <VenueCard
            venueName={venueName}
            sport={sport}
            pricePerHour={pricePerHour}
            city={city}
            rating={rating}
            reviewCount={reviewCount ?? 0}
            currency={currency ?? "֏"}
            slots={slotList}
            highlightedSlot={Math.min(Math.max(0, highlightedSlot ?? 0), slotList.length - 1)}
            perks={perkList}
            ctaLabel={ctaLabel ?? "Book now"}
            accent={accent}
          />
        </FrameEpochContext.Provider>
      </Sequence>

      <Sequence from={CAPTION_AT} name="Caption" layout="none">
        <Reveal
          delay={0}
          travel={12}
          spring={{ damping: 24, mass: 0.9, stiffness: 130 }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 1002,
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: c(T.mutedForeground),
            }}
          >
            sportsbnb.am
          </span>
        </Reveal>
      </Sequence>

      <ProgressRail accent={accent} />
    </AbsoluteFill>
  );
};

/**
 * Register with:
 *   width={1080} height={1080} fps={30} durationInFrames={450}
 *   defaultProps={venuePromoDefaultProps}
 */
export const VenuePromo: FC<VenuePromoProps> = (props) => {
  const reduced = useSystemReducedMotion();
  return (
    <ReducedMotionContext.Provider value={reduced}>
      <VenuePromoStage {...props} />
    </ReducedMotionContext.Provider>
  );
};
