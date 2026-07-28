/**
 * StatCounter — SportsBnB platform snapshot card.
 *
 * 1080×1080 · 60fps · 480 frames (8.0s exactly).
 *
 * A single square stats card: four marketplace numbers — venues listed, hours
 * booked, cities covered, average rating — counting up under spring drive,
 * inside the app's own "Court at night" surface.
 *
 * ── Why the counters are springs, not tweens ──────────────────────────────
 * A number that ramps linearly and then stops dead reads as a progress bar,
 * not as a value settling. Each counter here is
 *
 *     p = spring({ frame, fps, delay, durationInFrames: COUNT_DURATION,
 *                  config: COUNT_SPRING })
 *
 * with `COUNT_SPRING` deliberately *overdamped* (damping 200 against stiffness
 * 100, mass 1). Overdamped matters: a counter that overshoots 240 to 247 and
 * comes back does not read as momentum, it reads as a bug. Overdamped is
 * monotonic — the value only ever climbs — while still decelerating into rest
 * the way a spring does and a `linear`/`ease-out` tween does not.
 *
 * `durationInFrames` is what makes the arrival exact rather than asymptotic:
 * Remotion time-stretches the spring so it is at rest at `delay + duration`,
 * and `spring()` short-circuits to `to` past that point. So the last digit
 * lands on the target frame, every time, and `Math.round(p * value)` is
 * exactly `value` from frame 219 onwards — no "239.9997" flicker, no need for
 * a clamp. The same `p` drives the tile's meter bar, so the bar and the number
 * are the same motion rather than two animations that happen to agree.
 *
 * Entrances use a different, *under*damped config (`ENTER_SPRING`) — those
 * want the small overshoot, because a card sliding into place should feel like
 * it has mass. Two spring characters, chosen per job.
 *
 * `interpolate()` is used only where it belongs: opacity ramps, the one-shot
 * specular sweep, the land flash, and mapping an already-computed spring
 * `0→1` onto px/scale. There is no linear tween standing in for a spring
 * anywhere.
 *
 * ── Stagger ───────────────────────────────────────────────────────────────
 * Nothing appears at once, at two levels.
 *
 *   Block level, via `<Sequence>`: header 0 → title 26 → grid 64 → footer 140.
 *   Tile level, via nested `<Sequence>`: +0, +13, +26, +39, so the 2×2 grid
 *   fills on a diagonal. Each tile then staggers internally — accent edge,
 *   icon chip, trend chip, numeral, label, meter — off its own local frame 0.
 *   The headline reveals word by word behind a mask.
 *
 * Nested `Sequence` is what keeps the arithmetic honest: a tile's springs are
 * written against local frame 0 and the timeline composes the offsets, so
 * moving the grid moves everything inside it.
 *
 * ── Reduced motion ────────────────────────────────────────────────────────
 * `(prefers-reduced-motion: reduce)` pins every animated component to
 * `SETTLED_FRAME`, well past the last beat, so all springs read exactly 1, all
 * counters read their final value, and the one-shot flashes clamp to 0. Every
 * `Sequence` also opens at `from = 0`, so nothing is gated behind a start
 * frame that will never arrive. Ambient motion (the live-dot ping, the glow
 * breathe, the sweep) is switched off rather than slowed.
 *
 * The result is the finished card, static — the exact analogue of what
 * `src/index.css` already does under the same query for `.live-dot` and
 * `.card-lift`. Headless Chrome reports `no-preference`, so renders are
 * unaffected; the guard is for the card embedded in the app via `<Player>`.
 *
 * ── Self-containment ──────────────────────────────────────────────────────
 * No network of any kind. No `<Img>`, no `@font-face`, no remote CSS, no
 * `<link>`. `src/index.css` pulls Space Grotesk / DM Sans / JetBrains Mono
 * from Google Fonts, which a headless render cannot reach, so the documented
 * *system tails* of those same three stacks are used verbatim. Every glyph on
 * screen is ASCII plus `·` (U+00B7) and `—` (U+2014); no Armenian script and
 * no `֏`, both of which depend on a font the render box is not guaranteed to
 * have. The only asset is the inline `data:` SVG noise tile copied from the
 * `.glass::before` rule, and the icons are hand-drawn SVG paths.
 *
 * ── Colour ────────────────────────────────────────────────────────────────
 * Every value is lifted from the `.dark` block of `src/index.css` ("Court at
 * night"), the theme the app ships. The four per-tile accents are the real
 * `--chart-1..4` tokens, in token order. Nothing is invented.
 *
 * ── Registration ──────────────────────────────────────────────────────────
 *   <Composition id="StatCounter" component={StatCounter}
 *     durationInFrames={480} fps={60} width={1080} height={1080} />
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type FC,
  type ReactNode,
} from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* ────────────────────────── composition constants ─────────────────────── */

export const STAT_COUNTER_FPS = 60;
/** 480 frames @ 60fps = exactly 8.0s. */
export const STAT_COUNTER_DURATION_IN_FRAMES = 480;
export const STAT_COUNTER_WIDTH = 1080;
export const STAT_COUNTER_HEIGHT = 1080;

/**
 * Any frame past the last beat. Under reduced motion every component reads
 * this instead of the real clock, so springs return exactly their rest value
 * and one-shot flashes clamp to 0 — the finished card, held still.
 */
const SETTLED_FRAME = 900;

/* ──────────────────────────────── palette ─────────────────────────────── */

/**
 * `src/index.css`, `.dark` — copied, not approximated. Alpha variants are
 * written inline as `hsl(H S% L% / a)` against these same triples.
 */
const P = {
  background: "hsl(160 22% 5%)",
  surface1: "hsl(160 18% 10%)",
  surface3: "hsl(158 13% 18%)",
  card: "hsl(160 15% 13%)",
  foreground: "hsl(100 20% 96%)",
  foregroundSoft: "hsl(130 8% 72%)",
  mutedForeground: "hsl(130 8% 64%)",
  border: "hsl(157 12% 22%)",
  borderStrong: "hsl(155 10% 26%)",
  primary: "hsl(151 90% 47%)",
  primaryForeground: "hsl(160 25% 5%)",
  primarySoft: "hsl(155 45% 12%)",
  success: "hsl(151 80% 44%)",
} as const;

/**
 * `--chart-1..4`, in token order. These are the same four hues the product's
 * charts use, so the card reads as part of the same system.
 */
const ACCENTS = {
  chart1: { h: 151, s: 90, l: 47 },
  chart2: { h: 190, s: 80, l: 50 },
  chart3: { h: 42, s: 95, l: 55 },
  chart4: { h: 268, s: 80, l: 76 },
} as const;

type Accent = { h: number; s: number; l: number };

const tone = (a: Accent, alpha = 1): string =>
  alpha >= 1
    ? `hsl(${a.h} ${a.s}% ${a.l}%)`
    : `hsl(${a.h} ${a.s}% ${a.l}% / ${alpha})`;

/* ──────────────────────────────── type ────────────────────────────────── */

/**
 * The system tails of the three `--font-*` stacks in `src/index.css`, with the
 * webfont heads (and 'Noto Sans Armenian', which is only there to carry `֏`)
 * removed — a headless render cannot fetch any of them, and nothing on this
 * card needs the dram sign.
 */
const FONT_DISPLAY =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const FONT_SANS =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const FONT_MONO =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

/** `.stat-numeral` — scoreboard numerals. */
const NUMERAL: CSSProperties = {
  fontFamily: FONT_MONO,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.02em",
};

/** `.eyebrow` — mono caps, and the letter-spacing *is* the effect at 11px. */
const EYEBROW: CSSProperties = {
  fontFamily: FONT_MONO,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.2em",
};

/* ─────────────────────────── spring characters ────────────────────────── */

/**
 * Overdamped. `damping 200` against `stiffness 100` puts the system well past
 * critical, so the response is monotonic — no overshoot, no ring-back. Correct
 * for a number, wrong for a card.
 */
const COUNT_SPRING = { damping: 200, mass: 1, stiffness: 100 };

/** Underdamped — the small settle that makes a panel feel like it has mass. */
const ENTER_SPRING = { damping: 15, mass: 0.85, stiffness: 130 };

/** Slightly tighter, for small elements that should not wobble visibly. */
const REVEAL_SPRING = { damping: 18, mass: 0.7, stiffness: 150 };

/* ───────────────────────────── timeline beats ─────────────────────────── */

const BEAT_HEADER = 0;
const BEAT_TITLE = 26;
const BEAT_GRID = 64;
const BEAT_FOOTER = 140;

/** Diagonal fill of the 2×2 grid. */
const TILE_STAGGER = 13;

/** Local to a tile: when its number starts moving, and for how long. */
const COUNT_DELAY = 8;
const COUNT_DURATION = 108;
/** Local frame at which a tile's number is finished. */
const COUNT_END = COUNT_DELAY + COUNT_DURATION;

/** One-shot specular sweep across the panel, in global frames. */
const SWEEP_IN = 252;
const SWEEP_OUT = 356;

/** `.live-dot::after` is `live-ping 1.8s` — 108 frames at 60fps. */
const PING_PERIOD = 108;
/** Ambient glow breathe: 120 frames = 2s, so it closes 4× over the 8s. */
const BREATHE_PERIOD = 120;

/* ───────────────────────────── reduced motion ─────────────────────────── */

const ReducedMotionContext = createContext<boolean>(false);

/**
 * `(prefers-reduced-motion: reduce)`, live.
 *
 * Headless Chrome reports `no-preference`, so renders are unaffected; a viewer
 * who has asked their OS to calm things down and then meets this card embedded
 * in the app gets the finished, still version.
 */
const usePrefersReducedMotion = (): boolean => {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const list = window.matchMedia(query);
    const onChange = () => setReduced(list.matches);
    onChange();
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, []);

  return reduced;
};

const useReduced = (): boolean => useContext(ReducedMotionContext);

/**
 * The local frame for whatever `<Sequence>` the caller sits in — or
 * `SETTLED_FRAME` when the viewer wants less motion, which resolves every
 * spring in this file to its rest value.
 */
const useMotionFrame = (): number => {
  const frame = useCurrentFrame();
  return useReduced() ? SETTLED_FRAME : frame;
};

/**
 * A `<Sequence>` that opens immediately under reduced motion, so nothing is
 * gated behind a start frame the frozen clock will never reach.
 */
const Beat: FC<{ from: number; children: ReactNode }> = ({ from, children }) => {
  const reduced = useReduced();
  return (
    <Sequence from={reduced ? 0 : from} layout="none">
      {children}
    </Sequence>
  );
};

/* ──────────────────────────────── helpers ─────────────────────────────── */

/**
 * Thousands separators, written out rather than delegated to
 * `toLocaleString` — the locale of a headless render box is not something to
 * leave to chance when the glyph in the middle of "18,600" depends on it.
 */
const group = (value: number): string => {
  const digits = Math.round(Math.abs(value)).toFixed(0);
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) {
      out += ",";
    }
    out += digits.charAt(i);
  }
  return (value < 0 ? "-" : "") + out;
};

/** Full cosine period — exactly equal at t = 0 and t = 1, for any phase. */
const breathe = (frame: number, period: number, phase = 0): number =>
  0.5 + 0.5 * Math.cos((2 * Math.PI * frame) / period + phase);

/* ──────────────────────────────── content ─────────────────────────────── */

type IconKind = "pitch" | "clock" | "pin" | "star";

type Stat = {
  key: string;
  /** The number the counter arrives at. */
  value: number;
  /** 0 → integer with thousands separators, 1 → one decimal place. */
  decimals: 0 | 1;
  suffix?: { text: string; onAccent: boolean };
  label: string;
  /** Meter fill at rest, 0–1. What the number means against its ceiling. */
  meter: number;
  /** Read out under the meter, so the ratio is stated rather than implied. */
  meterNote: string;
  chip: string;
  chipArrow: boolean;
  accent: Accent;
  icon: IconKind;
};

const STATS: Stat[] = [
  {
    key: "venues",
    value: 240,
    decimals: 0,
    suffix: { text: "+", onAccent: true },
    label: "Venues listed",
    meter: 0.8,
    meterNote: "of 300 by year-end",
    chip: "42 this month",
    chipArrow: true,
    accent: ACCENTS.chart1,
    icon: "pitch",
  },
  {
    key: "hours",
    value: 18600,
    decimals: 0,
    label: "Hours booked",
    meter: 0.72,
    meterNote: "season to date",
    chip: "2.1K this week",
    chipArrow: true,
    accent: ACCENTS.chart2,
    icon: "clock",
  },
  {
    key: "cities",
    value: 11,
    decimals: 0,
    label: "Cities covered",
    meter: 0.55,
    meterNote: "of 20 largest",
    chip: "3 this quarter",
    chipArrow: true,
    accent: ACCENTS.chart4,
    icon: "pin",
  },
  {
    key: "rating",
    value: 4.9,
    decimals: 1,
    suffix: { text: "/5", onAccent: false },
    label: "Average rating",
    meter: 0.98,
    meterNote: "3,412 ratings",
    chip: "top 2% in region",
    chipArrow: false,
    accent: ACCENTS.chart3,
    icon: "star",
  },
];

/* ────────────────────────────────── icons ─────────────────────────────── */

const StatIcon: FC<{ kind: IconKind; color: string; size: number }> = ({
  kind,
  color,
  size,
}) => {
  const stroke = {
    fill: "none",
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {kind === "pitch" ? (
        <>
          <rect x={2.6} y={4.8} width={18.8} height={14.4} rx={2.4} {...stroke} />
          <path d="M12 4.8V19.2" {...stroke} />
          <circle cx={12} cy={12} r={2.9} {...stroke} />
          <path d="M2.6 9.4H5.5V14.6H2.6" {...stroke} />
          <path d="M21.4 9.4H18.5V14.6H21.4" {...stroke} />
        </>
      ) : null}

      {kind === "clock" ? (
        <>
          <circle cx={12} cy={12} r={8.6} {...stroke} />
          <path d="M12 6.9V12.25L15.7 14.45" {...stroke} />
        </>
      ) : null}

      {kind === "pin" ? (
        <>
          <path
            d="M12 21.2c4.2-4.5 6.3-7.9 6.3-10.5a6.3 6.3 0 1 0-12.6 0c0 2.6 2.1 6 6.3 10.5z"
            {...stroke}
          />
          <circle cx={12} cy={10.6} r={2.4} {...stroke} />
        </>
      ) : null}

      {kind === "star" ? (
        <path
          d="M12 3.2l2.72 5.51 6.08.89-4.4 4.28 1.04 6.06L12 17.08l-5.44 2.86 1.04-6.06-4.4-4.28 6.08-.89z"
          {...stroke}
        />
      ) : null}
    </svg>
  );
};

/** The up-arrow inside a trend chip. Drawn, not a `↑` the box may not have. */
const TrendArrow: FC<{ color: string }> = ({ color }) => (
  <svg width={11} height={11} viewBox="0 0 12 12">
    <path
      d="M6 10V2.6M6 2.6L2.9 5.7M6 2.6L9.1 5.7"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * The brand mark: a pitch seen from above — outer round-rect, halfway line,
 * centre circle. Same geometry language as the `pitch` stat icon, at weight.
 */
const BrandMark: FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.3,
      background: `linear-gradient(150deg, ${P.primary} 0%, hsl(163 85% 38%) 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 0 28px -6px hsl(151 90% 47% / 0.55), 0 8px 16px -4px hsl(160 30% 2% / 0.6)`,
    }}
  >
    <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24">
      <g
        fill="none"
        stroke={P.primaryForeground}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x={3.2} y={5.4} width={17.6} height={13.2} rx={2.6} />
        <path d="M12 5.4V18.6" />
        <circle cx={12} cy={12} r={2.7} />
      </g>
    </svg>
  </div>
);

/* ───────────────────────────── shared motion ──────────────────────────── */

/**
 * Masked slide-up. The mask is what separates this from a fade: the glyphs
 * arrive from behind a hard edge, which is the reveal the product's own
 * `fade-in` keyframe gestures at with `translateY(8px)`.
 */
const Reveal: FC<{
  delay: number;
  distance?: number;
  /** Descender room, so `y` and `g` are not clipped by the mask. */
  drop?: number;
  children: ReactNode;
}> = ({ delay, distance = 24, drop = 10, children }) => {
  const frame = useMotionFrame();
  const { fps } = useVideoConfig();

  const p = spring({
    frame,
    fps,
    delay,
    config: REVEAL_SPRING,
    durationInFrames: 32,
  });

  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        paddingBottom: drop,
        marginBottom: -drop,
        verticalAlign: "bottom",
      }}
    >
      <span
        style={{
          display: "inline-block",
          transform: `translateY(${((1 - p) * distance).toFixed(3)}px)`,
          opacity: interpolate(p, [0, 0.32], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        {children}
      </span>
    </span>
  );
};

/* ──────────────────────────────── backdrop ────────────────────────────── */

/** The `.glass::before` noise tile, verbatim. The card's only asset. */
const NOISE_TILE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")";

const Backdrop: FC = () => {
  // `useMotionFrame`, not `useCurrentFrame`: the wash and the grid fade must
  // already be *finished* at frame 0 under reduced motion, not fade in from
  // nothing over the first 44 frames.
  const frame = useMotionFrame();
  const reduced = useReduced();

  // Ambient. Held at its peak rather than slowed, so nothing is in motion.
  const glow = reduced ? 1 : 0.9 + 0.1 * breathe(frame, BREATHE_PERIOD);

  const wash = interpolate(frame, [0, 26], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const gridIn = interpolate(frame, [6, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill>
      {/* `.bg-grid-soft` — 56px, faded off at the edges so it never fights
          the type it sits behind. */}
      <AbsoluteFill
        style={{
          opacity: 0.85 * gridIn,
          backgroundImage: `linear-gradient(to right, hsl(157 12% 22% / 0.5) 1px, transparent 1px), linear-gradient(to bottom, hsl(157 12% 22% / 0.5) 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
          WebkitMaskImage:
            "radial-gradient(ellipse 62% 58% at 50% 42%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
          maskImage:
            "radial-gradient(ellipse 62% 58% at 50% 42%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* `.bg-radial-fade`, breathing. */}
      <AbsoluteFill
        style={{
          opacity: wash * glow,
          background: `radial-gradient(ellipse 82% 54% at 50% -6%, hsl(151 90% 47% / 0.16), transparent 62%)`,
        }}
      />

      {/* Court geometry, bottom-left, at the threshold of visible. */}
      <AbsoluteFill style={{ opacity: wash * 0.5 }}>
        <svg width={992} height={992} viewBox="0 0 992 992">
          <g
            fill="none"
            stroke={tone(ACCENTS.chart1, 0.13)}
            strokeWidth={1.5}
          >
            <circle cx={90} cy={930} r={210} />
            <circle cx={90} cy={930} r={330} />
            <path d="M90 1010 A 470 470 0 0 0 560 1010" />
          </g>
        </svg>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          opacity: 0.035,
          backgroundImage: NOISE_TILE,
          backgroundRepeat: "repeat",
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * One specular pass across the whole panel, once, after the numbers have
 * landed — so the last four seconds of the hold are not dead air. Clamped on
 * both sides, so it is exactly invisible outside its window, and switched off
 * entirely under reduced motion.
 */
const Sweep: FC = () => {
  const frame = useCurrentFrame();
  const reduced = useReduced();

  if (reduced) {
    return null;
  }

  const travel = interpolate(frame, [SWEEP_IN, SWEEP_OUT], [-70, 170], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const alpha = interpolate(
    frame,
    [SWEEP_IN, SWEEP_IN + 26, SWEEP_OUT - 26, SWEEP_OUT],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        opacity: alpha,
        transform: `translateX(${travel.toFixed(2)}%)`,
        background: `linear-gradient(100deg, transparent 38%, hsl(100 20% 96% / 0.045) 48%, hsl(151 90% 47% / 0.075) 52%, transparent 62%)`,
        pointerEvents: "none",
      }}
    />
  );
};

/* ───────────────────────────────── header ─────────────────────────────── */

/**
 * `.live-dot` and its ping, reproduced exactly — 1.8s, `--ease-out-expo`,
 * scale 1 → 2.6, opacity 0.6 → 0.
 *
 * Under reduced motion the CSS sets `animation: none`, which leaves the
 * `::after` at its *initial* keyframe — scale 1, fully opaque, sitting exactly
 * on the dot. That is a plain dot to the eye, and that is what is reproduced
 * here, rather than removing the ring and changing the dot's weight.
 */
const LiveDot: FC = () => {
  const frame = useCurrentFrame();
  const reduced = useReduced();
  const t = reduced ? 0 : (frame % PING_PERIOD) / PING_PERIOD;
  const expo = Easing.bezier(0.16, 1, 0.3, 1);

  const scale = interpolate(t, [0, 0.8, 1], [1, 2.6, 2.6], { easing: expo });
  const alpha = reduced ? 1 : interpolate(t, [0, 0.8, 1], [0.6, 0, 0], { easing: expo });

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        width: 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: P.primary,
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          backgroundColor: P.primary,
          transform: `scale(${scale.toFixed(3)})`,
          opacity: alpha,
        }}
      />
    </span>
  );
};

const Header: FC = () => {
  const frame = useMotionFrame();
  const { fps } = useVideoConfig();

  const mark = spring({
    frame,
    fps,
    delay: 6,
    config: ENTER_SPRING,
    durationInFrames: 34,
  });
  const pill = spring({
    frame,
    fps,
    delay: 20,
    config: REVEAL_SPRING,
    durationInFrames: 30,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 64,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            transform: `scale(${interpolate(mark, [0, 1], [0.6, 1]).toFixed(4)}) rotate(${interpolate(mark, [0, 1], [-14, 0]).toFixed(2)}deg)`,
            opacity: interpolate(mark, [0, 0.3], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          <BrandMark size={64} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 31,
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: P.foreground,
              lineHeight: 1,
            }}
          >
            <Reveal delay={12} distance={30} drop={6}>
              SportsBnB
            </Reveal>
          </div>
          <div
            style={{
              ...EYEBROW,
              fontSize: 11,
              color: P.mutedForeground,
              lineHeight: 1,
            }}
          >
            <Reveal delay={18} distance={16} drop={4}>
              Sports venues · Armenia
            </Reveal>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 16px 9px 14px",
          borderRadius: 999,
          border: `1px solid hsl(151 90% 47% / 0.28)`,
          backgroundColor: P.primarySoft,
          transform: `scale(${interpolate(pill, [0, 1], [0.88, 1]).toFixed(4)})`,
          opacity: interpolate(pill, [0, 0.35], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        <LiveDot />
        <span
          style={{
            ...EYEBROW,
            fontSize: 11,
            letterSpacing: "0.18em",
            color: P.primary,
            lineHeight: 1,
          }}
        >
          Live
        </span>
      </div>
    </div>
  );
};

/** Hairline under the header, drawn left-to-right off a spring. */
const Divider: FC = () => {
  const frame = useMotionFrame();
  const { fps } = useVideoConfig();
  const draw = spring({
    frame,
    fps,
    delay: 26,
    config: { damping: 200, mass: 1, stiffness: 90 },
    durationInFrames: 44,
  });

  return (
    <div
      style={{
        height: 1,
        marginTop: 30,
        transformOrigin: "left center",
        transform: `scaleX(${draw.toFixed(4)})`,
        background: `linear-gradient(to right, ${P.borderStrong} 0%, ${P.border} 55%, transparent 100%)`,
      }}
    />
  );
};

/* ──────────────────────────────── title ───────────────────────────────── */

const HEADLINE_WORDS = ["Armenia", "plays", "here."];

const TitleBlock: FC = () => (
  <div style={{ marginTop: 34 }}>
    <div
      style={{
        ...EYEBROW,
        fontSize: 13,
        color: P.primary,
        lineHeight: 1.35,
      }}
    >
      <Reveal delay={0} distance={18} drop={5}>
        Platform snapshot · July 2026
      </Reveal>
    </div>

    <h1
      style={{
        margin: "12px 0 0",
        fontFamily: FONT_DISPLAY,
        fontSize: 72,
        lineHeight: "78px",
        fontWeight: 700,
        letterSpacing: "-0.04em",
        color: P.foreground,
      }}
    >
      {HEADLINE_WORDS.map((word, i) => (
        <span key={word} style={{ marginRight: i === HEADLINE_WORDS.length - 1 ? 0 : 20 }}>
          <Reveal delay={8 + i * 8} distance={84} drop={18}>
            <span style={i === HEADLINE_WORDS.length - 1 ? { color: P.primary } : undefined}>
              {word}
            </span>
          </Reveal>
        </span>
      ))}
    </h1>

    <p
      style={{
        margin: "14px 0 0",
        fontFamily: FONT_SANS,
        fontSize: 22,
        lineHeight: "30px",
        fontWeight: 400,
        color: P.foregroundSoft,
      }}
    >
      <Reveal delay={36} distance={22} drop={8}>
        Courts, pitches and halls — booked by the hour, in seconds.
      </Reveal>
    </p>
  </div>
);

/* ───────────────────────────────── tile ───────────────────────────────── */

const StatTile: FC<{ stat: Stat }> = ({ stat }) => {
  const frame = useMotionFrame();
  const { fps } = useVideoConfig();
  const accent = stat.accent;

  /* Entrance — underdamped, so the tile settles rather than stops. */
  const enter = spring({
    frame,
    fps,
    config: ENTER_SPRING,
    durationInFrames: 36,
  });
  const edge = spring({
    frame,
    fps,
    delay: 5,
    config: { damping: 200, mass: 1, stiffness: 100 },
    durationInFrames: 40,
  });

  /* Count — overdamped, `durationInFrames` so it arrives exactly at COUNT_END. */
  const count = spring({
    frame,
    fps,
    delay: COUNT_DELAY,
    config: COUNT_SPRING,
    durationInFrames: COUNT_DURATION,
  });

  /* A short flare as the number lands, clamped to 0 either side of it. */
  const land = interpolate(
    frame,
    [COUNT_END - 12, COUNT_END + 2, COUNT_END + 36],
    [0, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    },
  );

  const shown = count * stat.value;
  const text = stat.decimals === 1 ? shown.toFixed(1) : group(shown);

  const fade = (delay: number, span = 14): number =>
    interpolate(frame, [delay, delay + span], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    });

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: "26px 26px 24px",
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: P.card,
        border: `1px solid ${P.border}`,
        boxShadow: `0 16px 32px -8px hsl(160 30% 2% / 0.55)`,
        transform: `translateY(${interpolate(enter, [0, 1], [34, 0]).toFixed(2)}px) scale(${interpolate(enter, [0, 1], [0.94, 1]).toFixed(4)})`,
        opacity: fade(0, 12),
      }}
    >
      {/* Accent wash in the corner the eye enters from. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle 260px at 8% 0%, ${tone(accent, 0.1)}, transparent 70%)`,
        }}
      />

      {/* Accent rule along the top edge, drawn out from the left. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          transformOrigin: "left center",
          transform: `scaleX(${edge.toFixed(4)})`,
          background: `linear-gradient(to right, ${tone(accent, 0.95)}, ${tone(accent, 0)})`,
        }}
      />

      {/* The land flare: a ring that brightens for ~0.6s and goes. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 24,
          border: `1px solid ${tone(accent, 0.55)}`,
          opacity: land,
          boxShadow: `0 0 34px -6px ${tone(accent, 0.35 * land)}`,
        }}
      />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* icon + trend chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 40,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: tone(accent, 0.12),
              border: `1px solid ${tone(accent, 0.24)}`,
              transform: `scale(${interpolate(fade(4, 16), [0, 1], [0.7, 1]).toFixed(4)})`,
              opacity: fade(4, 16),
            }}
          >
            <StatIcon kind={stat.icon} color={tone(accent)} size={21} />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: stat.chipArrow ? "5px 11px 5px 8px" : "5px 11px",
              borderRadius: 999,
              backgroundColor: "hsl(158 13% 18% / 0.85)",
              border: `1px solid ${P.border}`,
              opacity: fade(10, 18),
              transform: `translateX(${interpolate(fade(10, 18), [0, 1], [10, 0]).toFixed(2)}px)`,
            }}
          >
            {stat.chipArrow ? <TrendArrow color={P.success} /> : null}
            <span
              style={{
                ...EYEBROW,
                fontSize: 10,
                letterSpacing: "0.14em",
                lineHeight: 1,
                color: stat.chipArrow ? P.success : P.mutedForeground,
              }}
            >
              {stat.chip}
            </span>
          </div>
        </div>

        {/* the number */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            marginTop: 18,
            height: 78,
          }}
        >
          <span
            style={{
              ...NUMERAL,
              fontSize: 74,
              lineHeight: "78px",
              fontWeight: 500,
              color: P.foreground,
              textShadow: `0 0 ${(30 * land).toFixed(1)}px ${tone(accent, 0.5 * land)}`,
            }}
          >
            {text}
          </span>
          {stat.suffix ? (
            <span
              style={{
                ...NUMERAL,
                fontSize: 30,
                lineHeight: "34px",
                fontWeight: 500,
                color: stat.suffix.onAccent ? tone(accent) : P.mutedForeground,
                opacity: interpolate(count, [0.72, 1], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              {stat.suffix.text}
            </span>
          ) : null}
        </div>

        {/* label */}
        <div
          style={{
            ...EYEBROW,
            fontSize: 12,
            letterSpacing: "0.18em",
            lineHeight: "16px",
            marginTop: 6,
            color: P.mutedForeground,
            opacity: fade(16, 18),
          }}
        >
          {stat.label}
        </div>

        <div style={{ flex: 1 }} />

        {/* meter — same spring as the number, so they are one motion */}
        <div style={{ opacity: fade(14, 20) }}>
          <div
            style={{
              position: "relative",
              height: 6,
              borderRadius: 999,
              backgroundColor: P.surface3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${(count * stat.meter * 100).toFixed(3)}%`,
                borderRadius: 999,
                background: `linear-gradient(to right, ${tone(accent, 0.55)}, ${tone(accent)})`,
                boxShadow: `0 0 ${(14 + 16 * land).toFixed(1)}px -2px ${tone(accent, 0.6)}`,
              }}
            />
          </div>
          <div
            style={{
              ...EYEBROW,
              fontSize: 10,
              letterSpacing: "0.14em",
              lineHeight: 1,
              marginTop: 11,
              color: "hsl(130 8% 52%)",
            }}
          >
            {stat.meterNote}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatGrid: FC = () => (
  <div
    style={{
      flex: 1,
      marginTop: 36,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: 24,
    }}
  >
    {STATS.map((stat, i) => (
      <Beat key={stat.key} from={i * TILE_STAGGER}>
        <StatTile stat={stat} />
      </Beat>
    ))}
  </div>
);

/* ──────────────────────────────── footer ──────────────────────────────── */

/**
 * 1px rule + 20 gap + 24 row. Stated as a constant because the *wrapper*
 * reserves it from frame 0 — see `Stage`. The grid above is `flex: 1`, so a
 * footer that mounts at its beat would take 45px back off the tiles at frame
 * 140 and the whole grid would visibly jump. Reserving the box means the beat
 * only reveals content into space that was always there.
 */
const FOOTER_HEIGHT = 45;

const Footer: FC = () => {
  const frame = useMotionFrame();
  const { fps } = useVideoConfig();
  const rule = spring({
    frame,
    fps,
    config: { damping: 200, mass: 1, stiffness: 90 },
    durationInFrames: 40,
  });

  return (
    <>
      <div
        style={{
          height: 1,
          marginBottom: 20,
          transformOrigin: "left center",
          transform: `scaleX(${rule.toFixed(4)})`,
          background: `linear-gradient(to right, transparent 0%, ${P.border} 30%, ${P.borderStrong} 100%)`,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 24,
        }}
      >
        <span
          style={{
            ...EYEBROW,
            fontSize: 11,
            letterSpacing: "0.16em",
            color: P.mutedForeground,
            lineHeight: 1,
          }}
        >
          <Reveal delay={8} distance={16} drop={4}>
            Yerevan · Gyumri · Vanadzor · Dilijan · Abovyan
          </Reveal>
        </span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: P.primary,
            lineHeight: 1,
          }}
        >
          <Reveal delay={14} distance={16} drop={5}>
            sportsbnb.am
          </Reveal>
        </span>
      </div>
    </>
  );
};

/* ───────────────────────────────── stage ──────────────────────────────── */

const Stage: FC = () => {
  const frame = useMotionFrame();
  const { fps } = useVideoConfig();

  const shell = spring({
    frame,
    fps,
    config: { damping: 200, mass: 1, stiffness: 110 },
    durationInFrames: 42,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: P.background }}>
      <AbsoluteFill style={{ padding: 44 }}>
        <div
          style={{
            position: "relative",
            flex: 1,
            borderRadius: 44,
            overflow: "hidden",
            border: `1px solid ${P.border}`,
            background: `linear-gradient(158deg, ${P.surface1} 0%, hsl(160 20% 7%) 56%, ${P.background} 100%)`,
            boxShadow: `0 24px 48px -12px hsl(160 30% 2% / 0.7)`,
            transform: `scale(${interpolate(shell, [0, 1], [0.972, 1]).toFixed(4)})`,
            opacity: interpolate(shell, [0, 0.4], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          <Backdrop />

          {/* 1px top inner highlight, as `.glass` does. */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(to right, transparent, hsl(155 20% 30% / 0.6) 30%, hsl(155 20% 30% / 0.6) 70%, transparent)`,
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: 56,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Beat from={BEAT_HEADER}>
              <Header />
              <Divider />
            </Beat>

            <Beat from={BEAT_TITLE}>
              <TitleBlock />
            </Beat>

            <Beat from={BEAT_GRID}>
              <StatGrid />
            </Beat>

            {/* Height reserved from frame 0 so the `flex: 1` grid above never
                reflows when the footer's beat arrives. */}
            <div style={{ height: FOOTER_HEIGHT, marginTop: 28, flexShrink: 0 }}>
              <Beat from={BEAT_FOOTER}>
                <Footer />
              </Beat>
            </div>
          </div>

          <Sweep />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ──────────────────────────────── export ──────────────────────────────── */

/**
 * No props: the card states one fixed snapshot, and the four numbers are part
 * of the composition rather than an input. `Record<string, never>` rather than
 * `{}`, which is the "any non-nullish value" type and is rejected by
 * `no-empty-object-type`.
 */
export type StatCounterProps = Record<string, never>;

export const StatCounter: FC<StatCounterProps> = () => {
  const reduced = usePrefersReducedMotion();

  return (
    <ReducedMotionContext.Provider value={reduced}>
      <Stage />
    </ReducedMotionContext.Provider>
  );
};
