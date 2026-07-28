/**
 * SportsBnB — "OwnerPitch"
 * 1920x1080 · 30fps · 600 frames (20s) · the venue-owner onboarding explainer.
 *
 * The argument, in three beats and a close:
 *
 *   01  An empty pitch earns nothing   (frames  18–190)
 *   02  Players fill it for you        (frames 179–378)
 *   03  You get paid                   (frames 367–517)
 *   →   List your venue                (frames 506–600)
 *
 * The visual through-line is one object: a pitch, mown in seven vertical
 * stripes. Those stripes never move. In act one they are turf with chalk
 * markings on them; in act two the same seven stripes carry the seven days of
 * a booking week and fill with slots; in act three they carry seven revenue
 * bars. The metaphor is load-bearing rather than decorative — the mowing
 * stripes ARE the days, and the days ARE the revenue.
 *
 * The numbers tie to each other, because owners at a conference will check:
 *   42 bookable slots/week (7 days x 6 evening hours) = 168 hours a month.
 *   29 of 42 booked = 69% occupancy = 116 bookings a month.
 *   Day revenue at ֏12–16k/hr sums to ֏405,000 a week, ֏1,620,000 a month.
 * Act one's "168 idle hours", act two's counters and act three's odometer and
 * bar heights are all derived from the same BOOKED table below, so the story
 * cannot drift out of sync with itself.
 *
 * Palette and type are lifted from the real design system (src/index.css, the
 * `.dark` "Court at night" block) rather than invented.
 *
 * Self-contained by construction. No @font-face, no URL, no fetch. The brand
 * families are *named* at the head of each stack — naming a family is not a
 * request — and a headless render falls through to the system faces behind
 * them. The stacks end in FreeSans/FreeMono deliberately: the dram sign
 * (U+058F) is absent from DejaVu and Liberation but present in the GNU
 * FreeFont families, and CSS fallback is per-glyph, so ֏ resolves there while
 * Latin stays in the primary face. Verified with `fc-list :charset=58F`.
 *
 * Motion contract:
 *   - spring() drives anything with mass: every entrance, each slot landing in
 *     the calendar, the notification stack reflowing, the revenue bars, the
 *     end-card lockup.
 *   - interpolate() drives only what is genuinely a ramp: opacity crossfades,
 *     the chalk-line draw-on, the earnings odometer, the progress rail, the
 *     CTA sheen, the ambient drift.
 *   - Act crossfades are LINEAR and exactly complementary over an 11-frame
 *     overlap (out = 1-t, in = t, sum = 1), so elements that persist across a
 *     cut — the day header, the card shell — do not dip in brightness.
 *   - Ambient drift uses whole sine periods that divide 600 exactly (600/300=2,
 *     600/200=3, 600/150=4) off the absolute frame, so a conference screen
 *     looping the file finds frame 600 identical to frame 0 in every ambient
 *     layer. The narrative itself is a one-way build, not a loop, and is not
 *     claimed to be one.
 *   - `prefers-reduced-motion: reduce` removes every transform, every drift and
 *     every counter roll, leaving the same staggered composition arriving as
 *     opacity alone. The progress rail is the one thing it keeps, because it
 *     reports how much of the clip is left rather than decorating it.
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

/* ================================================================== *
 * Composition constants
 * ================================================================== */

export const OWNER_PITCH_FPS = 30;
export const OWNER_PITCH_DURATION_IN_FRAMES = 600; // 20s
export const OWNER_PITCH_WIDTH = 1920;
export const OWNER_PITCH_HEIGHT = 1080;

/** Act windows. Each starts 11 frames before its predecessor ends, and the
 *  fades are linear, so the overlap sums to exactly 1. */
const ACT1 = { from: 18, dur: 172 } as const; //  18 – 190
const ACT2 = { from: 179, dur: 183 } as const; // 179 – 362
const ACT3 = { from: 351, dur: 166 } as const; // 351 – 517
const ACT4 = { from: 506, dur: 94 } as const; //  506 – 600
const XFADE = 11;

/* ================================================================== *
 * Design tokens — the `.dark` block of src/index.css, verbatim.
 * Bare HSL triplets so alpha composes the way the stylesheet does it:
 * hsl(var(--primary) / 0.18).
 * ================================================================== */

const T = {
  background: "160 22% 5%",
  surface1: "160 18% 10%",
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
  chart2: "190 80% 50%",
  chart3: "42 95% 55%",
  chart4: "268 80% 76%",
} as const;

const c = (token: string, alpha?: number): string =>
  alpha === undefined ? `hsl(${token})` : `hsl(${token} / ${alpha})`;

/* ================================================================== *
 * Type stacks. Brand families first, then the faces that actually exist
 * on a render box, then FreeSans/FreeMono to carry ֏.
 * ================================================================== */

const DRAM = "'FreeSans', 'DejaVu Sans'";
const FONT_DISPLAY = `'Space Grotesk', ui-sans-serif, 'DejaVu Sans', 'Liberation Sans', ${DRAM}, sans-serif`;
const FONT_SANS = `'DM Sans', ui-sans-serif, 'Liberation Sans', 'DejaVu Sans', ${DRAM}, sans-serif`;
const FONT_MONO = `'JetBrains Mono', ui-monospace, 'DejaVu Sans Mono', 'Liberation Mono', 'FreeMono', monospace`;

/* ================================================================== *
 * Geometry. Every act paints in composition coordinates, so a column in
 * act two lands on the same pixels as the mowing stripe under it in act
 * one and the revenue bar over it in act three.
 * ================================================================== */

const COL_X = 112; // left copy column
const COL_W = 640;

const CARD_X = 836;
const CARD_Y = 168;
const CARD_W = 964;
const CARD_H = 760;

const TITLE_H = 76; // card title bar

const BOX_X = CARD_X + 30; // 866 — turf panel
const BOX_Y = 260;
const BOX_W = CARD_W - 60; // 904
const BOX_H = 640; // ends at 900, clear of the card's rounded corners

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const STRIPE_W = BOX_W / DAYS.length; // 129.142…

const HEAD_Y = BOX_Y; // 260 — day-label band
const HEAD_H = 52;
const GRID_Y = BOX_Y + HEAD_H; // 312
const GRID_H = BOX_H - HEAD_H; // 588
const ROWS = 6;
const ROW_H = GRID_H / ROWS; // 98

const BASELINE_Y = 848; // act three: bars stand here, labels sit under
const BAR_MAX_H = 448;

const RAIL_Y = 1032;
const RAIL_X = 112;
const RAIL_W = OWNER_PITCH_WIDTH - RAIL_X * 2;

const stripeX = (i: number): number => BOX_X + i * STRIPE_W;

/* ================================================================== *
 * The week. One table; every number on screen is derived from it.
 * ================================================================== */

/** Booked row indices per day. Row i is the hour 17:00 + i. */
const BOOKED_ROWS: number[][] = [
  [1, 2, 3], // Mon  3
  [2, 3], // Tue  2
  [1, 2, 3, 4], // Wed  4
  [2, 3, 4], // Thu  3
  [0, 1, 2, 3, 4, 5], // Fri  6
  [0, 1, 2, 3, 4, 5], // Sat  6
  [0, 1, 2, 3, 4], // Sun  5
];

/** ֏ per hour by day — weekends and Friday peak, as they do. */
const RATE = [12000, 12000, 12000, 12000, 15000, 16000, 15000];

const DAY_REVENUE = BOOKED_ROWS.map((rows, d) => rows.length * RATE[d]);
const MAX_REVENUE = DAY_REVENUE.reduce((a, b) => Math.max(a, b), 0); // 96 000
const WEEK_REVENUE = DAY_REVENUE.reduce((a, b) => a + b, 0); // 405 000
const MONTH_REVENUE = WEEK_REVENUE * 4; // 1 620 000

const TOTAL_SLOTS = DAYS.length * ROWS; // 42
const BOOKED_COUNT = BOOKED_ROWS.reduce((a, r) => a + r.length, 0); // 29
const IDLE_HOURS = TOTAL_SLOTS * 4; // 168 a month, all of them empty
const MONTH_BOOKINGS = BOOKED_COUNT * 4; // 116
const OCCUPANCY = Math.round((BOOKED_COUNT / TOTAL_SLOTS) * 100); // 69

const INITIALS = ["AG", "NS", "DH", "VM", "TK", "SA", "HP", "LB", "RT", "MZ"];
const AVATAR_TINT = [T.primary, T.chart2, T.chart3, T.chart4];

type Slot = { d: number; r: number; delay: number; who: string; tint: string };

/**
 * Bookings do not arrive left to right, so the fill order is shuffled with a
 * fixed-seed Lehmer generator: deterministic across every render, but with
 * none of the mechanical sweep a nested loop would give. Kept at module scope
 * so the order is computed once, not per frame.
 */
const BOOKED: Slot[] = (() => {
  const flat: { d: number; r: number }[] = [];
  for (let d = 0; d < BOOKED_ROWS.length; d++) {
    for (let k = 0; k < BOOKED_ROWS[d].length; k++) {
      flat.push({ d, r: BOOKED_ROWS[d][k] });
    }
  }
  let s = 20250728 % 2147483647;
  const next = (): number => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
  for (let i = flat.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const tmp = flat[i];
    flat[i] = flat[j];
    flat[j] = tmp;
  }
  return flat.map((it, i) => {
    const key = it.d * ROWS + it.r;
    return {
      d: it.d,
      r: it.r,
      delay: 22 + i * 3.9,
      who: INITIALS[key % INITIALS.length],
      tint: AVATAR_TINT[key % AVATAR_TINT.length],
    };
  });
})();

/* ================================================================== *
 * Helpers
 * ================================================================== */

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Thousands separators, written out rather than delegated to
 * `toLocaleString()`, which would make the frame depend on the render box's
 * locale. Matches `formatPrice` in src/lib/pricing.ts: ֏ then comma groups,
 * no space.
 */
const groupDigits = (n: number): string => {
  const s = String(Math.max(0, Math.round(n)));
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ",";
    out += s.charAt(i);
  }
  return out;
};

const dram = (n: number): string => `֏${groupDigits(n)}`;

type Cfg = { damping: number; mass: number; stiffness: number };

const SOFT: Cfg = { damping: 26, mass: 1, stiffness: 108 };
const SNAP: Cfg = { damping: 21, mass: 0.7, stiffness: 185 };
const POP: Cfg = { damping: 14, mass: 0.55, stiffness: 200 };

/* ================================================================== *
 * Reduced motion
 *
 * Read once at the root and pushed down through context, so one
 * matchMedia subscription serves every animated node in the tree.
 * ================================================================== */

const ReducedMotionContext = createContext<boolean>(false);
const useReducedMotion = (): boolean => useContext(ReducedMotionContext);

const useSystemReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (): void => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
};

/* ================================================================== *
 * Primitives
 * ================================================================== */

type RevealProps = {
  delay?: number;
  y?: number;
  x?: number;
  scaleFrom?: number;
  config?: Cfg;
  style?: CSSProperties;
  children: ReactNode;
};

/**
 * One staggered entrance. The spring carries the travel; a short linear ramp
 * carries the opacity, because a spring's overshoot on opacity reads as a
 * flicker. Under reduced motion the travel is dropped entirely and only the
 * ramp survives — the stagger, and therefore the reading order, is unchanged.
 */
const Reveal: FC<RevealProps> = ({
  delay = 0,
  y = 22,
  x = 0,
  scaleFrom = 1,
  config = SOFT,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = useReducedMotion();

  const opacity = interpolate(frame, [delay, delay + (reduced ? 8 : 13)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (reduced) {
    return <div style={{ ...style, opacity }}>{children}</div>;
  }

  const p = spring({ frame, fps, delay, config });
  const tx = lerp(x, 0, p);
  const ty = lerp(y, 0, p);
  const sc = lerp(scaleFrom, 1, p);

  return (
    <div
      style={{
        ...style,
        opacity,
        transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${sc.toFixed(4)})`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Act-level crossfade. Linear on purpose: two acts overlapping for XFADE
 * frames produce (1-t) + t = 1, so the day header and anything else drawn
 * identically on both sides of a cut holds a constant brightness instead of
 * dipping through the transition.
 */
const ActFade: FC<{ dur: number; out?: boolean; children: ReactNode }> = ({
  dur,
  out = true,
  children,
}) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, XFADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // The closing act passes out={false}. Without it the last eleven frames of
  // the composition dip to black, which on a conference loop reads as the
  // file being broken rather than as an ending.
  const fadeOut = out
    ? interpolate(frame, [dur - XFADE, dur], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  return <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>{children}</AbsoluteFill>;
};

const Eyebrow: FC<{ text: string; delay: number }> = ({ text, delay }) => (
  <Reveal delay={delay} y={14} config={SNAP} style={{ position: "absolute", left: COL_X, top: 296 }}>
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: 15,
        fontWeight: 500,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: c(T.primary),
      }}
    >
      {text}
    </span>
  </Reveal>
);

const Headline: FC<{ lines: [string, string]; delay: number }> = ({ lines, delay }) => (
  <div style={{ position: "absolute", left: COL_X, top: 336, width: COL_W }}>
    {lines.map((line, i) => (
      <Reveal key={line} delay={delay + i * 7} y={30} config={SOFT}>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 62,
            fontWeight: 700,
            lineHeight: 1.06,
            letterSpacing: "-0.03em",
            color: c(T.foreground),
            whiteSpace: "nowrap",
          }}
        >
          {line}
        </div>
      </Reveal>
    ))}
  </div>
);

const Body: FC<{ text: string; delay: number; top?: number }> = ({ text, delay, top = 512 }) => (
  <>
    <Reveal
      delay={delay}
      y={0}
      x={-18}
      config={SNAP}
      style={{ position: "absolute", left: COL_X, top: top - 34 }}
    >
      <div style={{ width: 54, height: 3, borderRadius: 2, background: c(T.primary) }} />
    </Reveal>
    <Reveal delay={delay + 5} y={18} config={SOFT} style={{ position: "absolute", left: COL_X, top }}>
      <p
        style={{
          margin: 0,
          width: COL_W,
          fontFamily: FONT_SANS,
          fontSize: 23,
          lineHeight: 1.56,
          color: c(T.foregroundSoft),
        }}
      >
        {text}
      </p>
    </Reveal>
  </>
);

/** A number with a caption under it. The workhorse of the left column. */
const StatTile: FC<{
  value: string;
  label: string;
  delay: number;
  left: number;
  top: number;
  accent?: string;
  size?: number;
}> = ({ value, label, delay, left, top, accent = T.foreground, size = 58 }) => (
  <Reveal delay={delay} y={20} config={SNAP} style={{ position: "absolute", left, top }}>
    <div
      style={{
        fontFamily: FONT_MONO,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "-0.03em",
        lineHeight: 1,
        color: c(accent),
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </div>
    <div
      style={{
        marginTop: 12,
        fontFamily: FONT_MONO,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: c(T.mutedForeground),
      }}
    >
      {label}
    </div>
  </Reveal>
);

/** Card title-bar text — same slot in all three acts, different sentence. */
const CardTitle: FC<{ text: string; delay: number }> = ({ text, delay }) => (
  <Reveal
    delay={delay}
    y={0}
    x={-14}
    config={SNAP}
    style={{ position: "absolute", left: CARD_X + 30, top: CARD_Y + 27 }}
  >
    <span
      style={{
        fontFamily: FONT_SANS,
        fontSize: 20,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        color: c(T.foreground),
      }}
    >
      {text}
    </span>
  </Reveal>
);

/* ================================================================== *
 * Backdrop — ambient only. Lives outside every Sequence, so
 * useCurrentFrame() here is already the absolute composition frame and
 * the sine periods below stay aligned to 600.
 * ================================================================== */

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")";

const Backdrop: FC<Record<string, never>> = () => {
  const frame = useCurrentFrame();
  const reduced = useReducedMotion();

  // 600/300 = 2 whole periods, 600/200 = 3, 600/150 = 4. Frame 600 therefore
  // holds exactly the value of frame 0 in all three, so a looping screen has
  // nothing to jump.
  const driftA = reduced ? 0 : Math.sin((2 * Math.PI * frame) / 300);
  const driftB = reduced ? 0 : Math.cos((2 * Math.PI * frame) / 200);
  const breathe = reduced ? 0 : Math.sin((2 * Math.PI * frame) / 150);

  return (
    <AbsoluteFill style={{ backgroundColor: c(T.background) }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(to right, ${c(T.border, 0.55)} 1px, transparent 1px), linear-gradient(to bottom, ${c(T.border, 0.55)} 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 62% 58% at 50% 42%, black, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 62% 58% at 50% 42%, black, transparent 78%)",
          opacity: 0.5,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: -220 + driftA * 40,
          top: -300 + driftB * 30,
          width: 1100,
          height: 900,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${c(T.primary, 0.16)} 0%, transparent 66%)`,
          filter: "blur(24px)",
          opacity: 0.9 + breathe * 0.08,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -320 - driftB * 44,
          bottom: -380 + driftA * 34,
          width: 1200,
          height: 1000,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${c(T.chart2, 0.1)} 0%, transparent 64%)`,
          filter: "blur(28px)",
          opacity: 0.85 - breathe * 0.06,
        }}
      />

      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 78% 52% at 50% -10%, ${c(T.primary, 0.1)}, transparent 62%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 88% 78% at 50% 46%, transparent 42%, ${c("160 40% 2%", 0.72)} 100%)`,
        }}
      />
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.035 }} />
    </AbsoluteFill>
  );
};

/* ================================================================== *
 * Persistent chrome
 * ================================================================== */

const Wordmark: FC<{ size: number }> = ({ size }) => (
  <span
    style={{
      fontFamily: FONT_DISPLAY,
      fontSize: size,
      fontWeight: 700,
      letterSpacing: "-0.035em",
      color: c(T.foreground),
      whiteSpace: "nowrap",
    }}
  >
    Sports<span style={{ color: c(T.primary) }}>BnB</span>
  </span>
);

/** The mark: a goal box and a centre spot, at 40px. */
const BrandMark: FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: c(T.primarySoft),
      border: `1px solid ${c(T.primary, 0.45)}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 0 22px -6px ${c(T.primary, 0.55)}`,
    }}
  >
    <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
      <rect
        x="1.5"
        y="4"
        width="21"
        height="16"
        rx="2"
        stroke={c(T.primary)}
        strokeWidth="1.6"
      />
      <path d="M12 4v16" stroke={c(T.primary)} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.4" stroke={c(T.primary)} strokeWidth="1.6" />
    </svg>
  </div>
);

const TopChrome: FC<Record<string, never>> = () => {
  const frame = useCurrentFrame();
  const reduced = useReducedMotion();

  // Present for the argument, gone for the close — the end card takes the
  // wordmark over at full size, so two of them on screen would compete.
  const opacity =
    interpolate(frame, [4, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(frame, [ACT4.from, ACT4.from + XFADE], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  return (
    <AbsoluteFill style={{ opacity }}>
      <Reveal
        delay={4}
        y={reduced ? 0 : -14}
        config={SNAP}
        style={{
          position: "absolute",
          left: COL_X,
          top: 72,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <BrandMark size={42} />
        <Wordmark size={27} />
      </Reveal>

      <Reveal
        delay={11}
        y={reduced ? 0 : -14}
        config={SNAP}
        style={{ position: "absolute", right: COL_X, top: 78 }}
      >
        <div
          style={{
            padding: "9px 18px",
            borderRadius: 999,
            border: `1px solid ${c(T.border)}`,
            background: c(T.surface1, 0.7),
            fontFamily: FONT_MONO,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: c(T.foregroundSoft),
          }}
        >
          For venue owners
        </div>
      </Reveal>
    </AbsoluteFill>
  );
};

const BottomChrome: FC<Record<string, never>> = () => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, OWNER_PITCH_DURATION_IN_FRAMES - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labelOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ticks = [ACT2.from, ACT3.from, ACT4.from];

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: RAIL_X,
          top: 984,
          width: RAIL_W,
          display: "flex",
          justifyContent: "space-between",
          opacity: labelOpacity,
          fontFamily: FONT_MONO,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: c(T.mutedForeground),
        }}
      >
        <span>sportsbnb.am</span>
        <span>Yerevan · Armenia</span>
      </div>

      <div
        style={{
          position: "absolute",
          left: RAIL_X,
          top: RAIL_Y,
          width: RAIL_W,
          height: 3,
          borderRadius: 2,
          background: c(T.border, 0.9),
        }}
      >
        {ticks.map((t) => (
          <div
            key={t}
            style={{
              position: "absolute",
              left: (t / OWNER_PITCH_DURATION_IN_FRAMES) * RAIL_W,
              top: -3,
              width: 1,
              height: 9,
              background: c(T.borderStrong),
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: 3,
            width: RAIL_W * progress,
            borderRadius: 2,
            background: c(T.primary),
            boxShadow: `0 0 14px -2px ${c(T.primary, 0.7)}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== *
 * The pitch — chalk markings, drawn on.
 *
 * `pathLength={1}` normalises every shape to a unit length, so one
 * dash-offset ramp draws a rect, a circle and an arc at the same rate
 * without measuring any of them.
 * ================================================================== */

const P_W = BOX_W;
const P_H = GRID_H;
const PAD_X = 46;
const PAD_Y = 32;
const PX = PAD_X;
const PY = PAD_Y;
const PW = P_W - PAD_X * 2; // 812
const PH = P_H - PAD_Y * 2; // 524
const CX = PX + PW / 2;
const CY = PY + PH / 2;

const PitchMarkings: FC<{ opacity: number; frame: number }> = ({ opacity, frame }) => {
  const reduced = useReducedMotion();

  const draw = (delay: number, dur: number): number =>
    reduced
      ? 1
      : interpolate(frame, [delay, delay + dur], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });

  const stroke = c(T.foreground, 0.9);
  const line = (p: number): CSSProperties => ({
    strokeDasharray: 1,
    strokeDashoffset: 1 - p,
  });

  const perimeter = draw(34, 46);
  const halfway = draw(52, 30);
  const boxes = draw(62, 30);
  const goalAreas = draw(72, 26);
  const detail = draw(82, 24);

  const arcDy = Math.sqrt(86 * 86 - 48 * 48); // 71.43

  return (
    <svg
      width={P_W}
      height={P_H}
      viewBox={`0 0 ${P_W} ${P_H}`}
      style={{ position: "absolute", left: 0, top: HEAD_H, opacity }}
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
    >
      <rect x={PX} y={PY} width={PW} height={PH} pathLength={1} style={line(perimeter)} />

      <line x1={CX} y1={PY} x2={CX} y2={PY + PH} pathLength={1} style={line(halfway)} />
      <circle cx={CX} cy={CY} r={86} pathLength={1} style={line(halfway)} />

      <rect x={PX} y={CY - 146} width={148} height={292} pathLength={1} style={line(boxes)} />
      <rect
        x={PX + PW - 148}
        y={CY - 146}
        width={148}
        height={292}
        pathLength={1}
        style={line(boxes)}
      />

      <rect x={PX} y={CY - 70} width={60} height={140} pathLength={1} style={line(goalAreas)} />
      <rect
        x={PX + PW - 60}
        y={CY - 70}
        width={60}
        height={140}
        pathLength={1}
        style={line(goalAreas)}
      />

      <path
        d={`M ${PX + 148} ${CY - arcDy} A 86 86 0 0 1 ${PX + 148} ${CY + arcDy}`}
        pathLength={1}
        style={line(detail)}
      />
      <path
        d={`M ${PX + PW - 148} ${CY - arcDy} A 86 86 0 0 0 ${PX + PW - 148} ${CY + arcDy}`}
        pathLength={1}
        style={line(detail)}
      />

      {/* Corner arcs. All four turn the same way, so one sweep flag serves. */}
      <path d={`M ${PX} ${PY + 14} A 14 14 0 0 0 ${PX + 14} ${PY}`} pathLength={1} style={line(detail)} />
      <path
        d={`M ${PX + PW - 14} ${PY} A 14 14 0 0 0 ${PX + PW} ${PY + 14}`}
        pathLength={1}
        style={line(detail)}
      />
      <path
        d={`M ${PX + PW} ${PY + PH - 14} A 14 14 0 0 0 ${PX + PW - 14} ${PY + PH}`}
        pathLength={1}
        style={line(detail)}
      />
      <path
        d={`M ${PX + 14} ${PY + PH} A 14 14 0 0 0 ${PX} ${PY + PH - 14}`}
        pathLength={1}
        style={line(detail)}
      />

      <circle cx={CX} cy={CY} r={3.5} fill={stroke} stroke="none" opacity={detail} />
      <circle cx={PX + 100} cy={CY} r={3.5} fill={stroke} stroke="none" opacity={detail} />
      <circle cx={PX + PW - 100} cy={CY} r={3.5} fill={stroke} stroke="none" opacity={detail} />

      <rect x={PX - 14} y={CY - 38} width={14} height={76} pathLength={1} style={line(detail)} />
      <rect x={PX + PW} y={CY - 38} width={14} height={76} pathLength={1} style={line(detail)} />
    </svg>
  );
};

/**
 * The card, its turf, and the chalk on it. Persistent across all three acts —
 * only the things standing on the grass change — so it reads the absolute
 * frame rather than living inside a Sequence.
 */
const CardShell: FC<Record<string, never>> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = useReducedMotion();

  const enter = reduced ? 1 : spring({ frame, fps, delay: 8, config: SOFT });
  const fadeIn = interpolate(frame, [8, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [ACT4.from, ACT4.from + XFADE], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The chalk is the subject in act one and the texture underneath a
  // calendar in acts two and three. Stepping it down at the act boundaries
  // keeps the metaphor visible without letting it fight the data.
  const chalk = interpolate(
    frame,
    [40, 120, ACT2.from, ACT2.from + XFADE, ACT3.from, ACT3.from + XFADE],
    [0, 0.34, 0.34, 0.1, 0.1, 0.06],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        position: "absolute",
        left: CARD_X,
        top: CARD_Y,
        width: CARD_W,
        height: CARD_H,
        borderRadius: 26,
        background: c(T.card),
        border: `1px solid ${c(T.border)}`,
        boxShadow: `0 24px 48px -12px ${c("160 30% 2%", 0.7)}, inset 0 1px 0 0 ${c(T.borderStrong, 0.5)}`,
        opacity: fadeIn * fadeOut,
        transform: reduced
          ? undefined
          : `translateY(${lerp(34, 0, enter).toFixed(2)}px) scale(${lerp(0.985, 1, enter).toFixed(4)})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: TITLE_H,
          width: "100%",
          height: 1,
          background: c(T.border),
        }}
      />

      {/* Turf. Seven mown stripes — the days, before they are days. */}
      <div
        style={{
          position: "absolute",
          left: BOX_X - CARD_X,
          top: BOX_Y - CARD_Y,
          width: BOX_W,
          height: BOX_H,
          borderRadius: 14,
          overflow: "hidden",
          background: c("154 30% 8%"),
          border: `1px solid ${c(T.border, 0.8)}`,
        }}
      >
        {DAYS.map((d, i) => (
          <div
            key={d}
            style={{
              position: "absolute",
              left: i * STRIPE_W,
              top: 0,
              width: STRIPE_W + 0.5,
              height: "100%",
              background: i % 2 === 0 ? c("154 32% 9.5%") : c("154 32% 7%"),
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 70% 62% at 50% 40%, ${c("151 60% 30%", 0.1)}, transparent 72%)`,
          }}
        />
        <PitchMarkings opacity={chalk} frame={frame} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 92% 86% at 50% 44%, transparent 44%, ${c("160 40% 2%", 0.55)} 100%)`,
          }}
        />
      </div>
    </div>
  );
};

/* ================================================================== *
 * Act 01 — an empty pitch earns nothing
 * ================================================================== */

const Act1: FC<Record<string, never>> = () => {
  const frame = useCurrentFrame();
  const reduced = useReducedMotion();

  // A counter, not a tween of a counter: the eased ramp is what an odometer
  // genuinely is, so interpolate is the right tool and a spring would be the
  // wrong one.
  const idle = reduced
    ? IDLE_HOURS
    : Math.round(
        interpolate(frame, [40, 96], [0, IDLE_HOURS], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        }),
      );

  return (
    <AbsoluteFill>
      <Eyebrow text="01 / The problem" delay={0} />
      <Headline lines={["An empty pitch", "earns nothing."]} delay={5} />
      <Body
        delay={22}
        text="Across Yerevan, five-a-side pitches sit dark four evenings a week. The turf is ready, the lights work, and nobody is paying for either."
      />
      <StatTile
        value={String(idle)}
        label="Idle hours every month"
        delay={38}
        left={COL_X}
        top={694}
        accent={T.foreground}
      />
      <StatTile
        value={`0 / ${TOTAL_SLOTS}`}
        label="Slots booked this week"
        delay={48}
        left={COL_X + 300}
        top={694}
        accent={T.mutedForeground}
        size={44}
      />

      <CardTitle text="Nor Nork Arena · 5-a-side" delay={2} />
      <Reveal
        delay={8}
        y={0}
        x={16}
        config={SNAP}
        style={{ position: "absolute", left: CARD_X + CARD_W - 30 - 152, top: CARD_Y + 26 }}
      >
        <div
          style={{
            width: 152,
            textAlign: "center",
            padding: "7px 0",
            borderRadius: 999,
            border: `1px dashed ${c(T.borderStrong)}`,
            fontFamily: FONT_MONO,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: c(T.mutedForeground),
          }}
        >
          Not listed
        </div>
      </Reveal>

      {/* The seven stripes, named but unlit. Act two switches them on in
          place, which is the whole point of leaving them here. */}
      <DayHeader mode="idle" delay={62} />

      <Reveal
        delay={96}
        y={16}
        config={SOFT}
        style={{ position: "absolute", left: BOX_X + BOX_W / 2 - 210, top: 792 }}
      >
        <div
          style={{
            width: 420,
            padding: "20px 24px",
            borderRadius: 16,
            border: `1px dashed ${c(T.borderStrong)}`,
            background: c(T.background, 0.82),
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: c(T.mutedForeground),
            }}
          >
            No bookings
          </div>
          <div
            style={{
              marginTop: 9,
              fontFamily: FONT_SANS,
              fontSize: 17,
              color: c(T.foregroundSoft),
            }}
          >
            Nobody can find this pitch yet.
          </div>
        </div>
      </Reveal>
    </AbsoluteFill>
  );
};

/* ================================================================== *
 * Day header — the same seven labels in acts one and two, at the same
 * pixels, so the cut between them is a change of state rather than a
 * change of layout.
 * ================================================================== */

const DayHeader: FC<{ mode: "idle" | "live"; delay: number; counts?: number[] }> = ({
  mode,
  delay,
  counts,
}) => {
  const live = mode === "live";
  return (
    <div style={{ position: "absolute", left: BOX_X, top: HEAD_Y, width: BOX_W, height: HEAD_H }}>
      {DAYS.map((d, i) => (
        <Reveal
          key={d}
          delay={delay + i * 3}
          y={10}
          config={SNAP}
          style={{
            position: "absolute",
            left: i * STRIPE_W,
            top: 0,
            width: STRIPE_W,
            height: HEAD_H,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.18em",
              color: live ? c(T.foregroundSoft) : c(T.mutedForeground, 0.55),
            }}
          >
            {d}
          </span>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 12,
              fontWeight: 600,
              color: live ? c(T.primary) : c(T.mutedForeground, 0.4),
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {live && counts ? counts[i] : "—"}
          </span>
        </Reveal>
      ))}
    </div>
  );
};

/* ================================================================== *
 * Act 02 — players fill it for you
 * ================================================================== */

const SlotCell: FC<{ slot: Slot; progress: number; reduced: boolean }> = ({
  slot,
  progress,
  reduced,
}) => {
  const x = stripeX(slot.d) + 6;
  const y = GRID_Y + slot.r * ROW_H + 5;
  const w = STRIPE_W - 12;
  const h = ROW_H - 10;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 10,
        background: c(T.primary, 0.15),
        border: `1px solid ${c(T.primary, 0.5)}`,
        boxShadow: `0 0 20px -6px ${c(T.primary, 0.55)}`,
        opacity: clamp01(progress * 1.6),
        transform: reduced
          ? undefined
          : `scale(${lerp(0.62, 1, clamp01(progress)).toFixed(4)})`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 3,
          height: "100%",
          background: c(T.primary),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 12,
          top: 11,
          fontFamily: FONT_MONO,
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: c(T.primary),
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {`${17 + slot.r}:00`}
      </div>
      <div
        style={{
          position: "absolute",
          right: 10,
          bottom: 9,
          width: 26,
          height: 26,
          borderRadius: 999,
          background: c(slot.tint, 0.9),
          color: c(T.primaryForeground),
          fontFamily: FONT_MONO,
          fontSize: 11,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "0.02em",
        }}
      >
        {slot.who}
      </div>
    </div>
  );
};

const EmptyCell: FC<{ d: number; r: number; opacity: number }> = ({ d, r, opacity }) => (
  <div
    style={{
      position: "absolute",
      left: stripeX(d) + 6,
      top: GRID_Y + r * ROW_H + 5,
      width: STRIPE_W - 12,
      height: ROW_H - 10,
      borderRadius: 10,
      border: `1px dashed ${c(T.border)}`,
      opacity,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 12,
        top: 11,
        fontFamily: FONT_MONO,
        fontSize: 15,
        fontWeight: 500,
        color: c(T.mutedForeground, 0.42),
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {`${17 + r}:00`}
    </div>
  </div>
);

type Toast = { at: number; who: string; when: string; amount: number; tint: string };

const TOASTS: Toast[] = [
  { at: 52, who: "Narek S.", when: "Fri · 20:00", amount: 15000, tint: T.primary },
  { at: 86, who: "Team Ararat", when: "Sat · 21:00", amount: 16000, tint: T.chart2 },
  { at: 120, who: "Vahe M.", when: "Sun · 19:00", amount: 15000, tint: T.chart3 },
];

const TOAST_W = 392;
const TOAST_H = 76;
const TOAST_GAP = 12;

/**
 * A notification stack. Each arrival springs in from the right and pushes the
 * ones already there upward — also on a spring, because a stack reflowing is
 * a physical event and a linear shove reads as a slide show.
 */
const ToastStack: FC<Record<string, never>> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = useReducedMotion();

  return (
    <>
      {TOASTS.map((t, i) => {
        if (frame < t.at) return null;

        const enter = reduced ? 1 : spring({ frame, fps, delay: t.at, config: POP });
        const opacity = interpolate(frame, [t.at, t.at + (reduced ? 8 : 12)], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // How many arrived after this one — that is how far up it has been
        // pushed. Springing on each arrival rather than on elapsed time means
        // the shove is driven by the event that caused it.
        let lift = 0;
        for (let k = i + 1; k < TOASTS.length; k++) {
          if (frame >= TOASTS[k].at) {
            const push = reduced
              ? 1
              : spring({ frame, fps, delay: TOASTS[k].at, config: SNAP });
            lift += push * (TOAST_H + TOAST_GAP);
          }
        }

        const top = 900 - 18 - TOAST_H - lift;
        const slide = reduced ? 0 : lerp(56, 0, enter);

        return (
          <div
            key={t.who}
            style={{
              position: "absolute",
              left: BOX_X + BOX_W - 18 - TOAST_W + slide,
              top,
              width: TOAST_W,
              height: TOAST_H,
              borderRadius: 14,
              // Fully opaque on purpose: a notification sitting over a
              // calendar has to be readable, and at any alpha at all the
              // slot behind it showed through its own text.
              background: c(T.surface1),
              border: `1px solid ${c(T.borderStrong)}`,
              boxShadow: `0 18px 34px -12px ${c("160 40% 2%", 0.85)}`,
              opacity,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "0 16px",
              transform: reduced ? undefined : `scale(${lerp(0.94, 1, enter).toFixed(4)})`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                flexShrink: 0,
                background: c(t.tint, 0.16),
                border: `1px solid ${c(t.tint, 0.55)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 9, height: 9, borderRadius: 999, background: c(t.tint) }} />
            </div>
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: c(T.primary),
                }}
              >
                New booking
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontFamily: FONT_SANS,
                  fontSize: 15,
                  fontWeight: 600,
                  color: c(T.foreground),
                  whiteSpace: "nowrap",
                }}
              >
                {t.who} · {t.when}
              </div>
            </div>
            <div
              style={{
                flexShrink: 0,
                fontFamily: FONT_MONO,
                fontSize: 16,
                fontWeight: 700,
                color: c(T.foreground),
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {dram(t.amount)}
            </div>
          </div>
        );
      })}
    </>
  );
};

const Act2: FC<Record<string, never>> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = useReducedMotion();

  // The counters are not animated separately from the grid — they count the
  // cells that have actually landed, so the number on the left and the
  // squares on the right can never disagree.
  const landedAll = BOOKED.filter((b) => frame >= b.delay + 5);
  const landed = landedAll.length;
  const perDay = DAYS.map((_, d) => landedAll.filter((b) => b.d === d).length);
  const occupancy = Math.round((landed / TOTAL_SLOTS) * 100);

  const pulse = 1 - ((frame % 54) / 54) * 1; // live dot, act-local

  return (
    <AbsoluteFill>
      <Eyebrow text="02 / List it" delay={0} />
      <Headline lines={["Players fill", "it for you."]} delay={5} />
      <Body
        delay={22}
        text="Publish your pitch in ten minutes. Players nearby find it, pick a slot and pay up front — you just get the notification."
      />
      <StatTile
        value={String(landed)}
        label="Bookings this week"
        delay={38}
        left={COL_X}
        top={694}
        accent={T.primary}
      />
      <StatTile
        value={`${occupancy}%`}
        label="Evening occupancy"
        delay={48}
        left={COL_X + 300}
        top={694}
        accent={T.foreground}
      />

      <CardTitle text="Booking calendar · This week" delay={2} />
      <Reveal
        delay={8}
        y={0}
        x={16}
        config={SNAP}
        style={{ position: "absolute", left: CARD_X + CARD_W - 30 - 122, top: CARD_Y + 26 }}
      >
        <div
          style={{
            width: 122,
            padding: "7px 0",
            borderRadius: 999,
            border: `1px solid ${c(T.primary, 0.42)}`,
            background: c(T.primarySoft),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
          }}
        >
          <span style={{ position: "relative", width: 8, height: 8 }}>
            <span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                background: c(T.primary),
              }}
            />
            {reduced ? null : (
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 999,
                  background: c(T.primary),
                  transform: `scale(${(1 + (1 - pulse) * 1.8).toFixed(3)})`,
                  opacity: pulse * 0.55,
                }}
              />
            )}
          </span>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: c(T.primary),
            }}
          >
            Live
          </span>
        </div>
      </Reveal>

      <DayHeader mode="live" delay={4} counts={perDay} />

      {/* Every slot in the week, so the grid exists before it fills. */}
      {DAYS.map((_, d) =>
        Array.from({ length: ROWS }).map((__, r) => (
          <EmptyCell
            key={`e-${d}-${r}`}
            d={d}
            r={r}
            opacity={interpolate(frame, [8 + d * 2, 24 + d * 2], [0, 0.85], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />
        )),
      )}

      {BOOKED.map((slot) => {
        const p = reduced
          ? interpolate(frame, [slot.delay, slot.delay + 8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          : spring({ frame, fps, delay: slot.delay, config: POP });
        if (p <= 0) return null;
        return (
          <SlotCell key={`b-${slot.d}-${slot.r}`} slot={slot} progress={p} reduced={reduced} />
        );
      })}

      <ToastStack />
    </AbsoluteFill>
  );
};

/* ================================================================== *
 * Act 03 — you get paid
 * ================================================================== */

const Chip: FC<{ text: string; delay: number; left: number }> = ({ text, delay, left }) => (
  <Reveal
    delay={delay}
    y={14}
    config={SNAP}
    style={{ position: "absolute", left, top: 744 }}
  >
    <div
      style={{
        padding: "10px 18px",
        borderRadius: 999,
        border: `1px solid ${c(T.border)}`,
        background: c(T.surface1, 0.75),
        fontFamily: FONT_SANS,
        fontSize: 16,
        fontWeight: 500,
        color: c(T.foregroundSoft),
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  </Reveal>
);

const Act3: FC<Record<string, never>> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = useReducedMotion();

  const rollT = reduced
    ? 1
    : interpolate(frame, [16, 70], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
  const earned = Math.round(MONTH_REVENUE * rollT);

  return (
    <AbsoluteFill>
      <Eyebrow text="03 / Get paid" delay={0} />

      <Reveal
        delay={8}
        y={26}
        config={SOFT}
        style={{ position: "absolute", left: COL_X, top: 344, width: COL_W }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.045em",
            color: c(T.foreground),
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {dram(earned)}
        </div>
      </Reveal>

      <Reveal
        delay={18}
        y={14}
        config={SNAP}
        style={{ position: "absolute", left: COL_X, top: 452 }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: c(T.mutedForeground),
          }}
        >
          {`Earned in October · ${MONTH_BOOKINGS} bookings`}
        </span>
      </Reveal>

      <Reveal
        delay={74}
        y={10}
        scaleFrom={0.86}
        config={POP}
        style={{ position: "absolute", left: COL_X, top: 496 }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            padding: "8px 16px",
            borderRadius: 999,
            background: c(T.primarySoft),
            border: `1px solid ${c(T.primary, 0.42)}`,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 1.5 L11 9.5 L1 9.5 Z" fill={c(T.primary)} />
          </svg>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: c(T.primary),
            }}
          >
            {`${dram(WEEK_REVENUE)} a week, on average`}
          </span>
        </div>
      </Reveal>

      <Body
        delay={30}
        top={606}
        text="Paid out every Friday to your Armenian bank account. You set the price, the hours and who gets to book."
      />

      <Chip text="0% to list" delay={84} left={COL_X} />
      <Chip text="Weekly payouts" delay={92} left={COL_X + 152} />
      <Chip text="Cancel anytime" delay={100} left={COL_X + 358} />

      <CardTitle text="Earnings · October" delay={2} />
      <Reveal
        delay={8}
        y={0}
        x={16}
        config={SNAP}
        style={{ position: "absolute", left: CARD_X + CARD_W - 30 - 226, top: CARD_Y + 26 }}
      >
        <div
          style={{
            width: 226,
            textAlign: "center",
            padding: "7px 0",
            borderRadius: 999,
            border: `1px solid ${c(T.border)}`,
            background: c(T.surface3, 0.6),
            fontFamily: FONT_MONO,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: c(T.foregroundSoft),
          }}
        >
          Next payout · Fri 31 Oct
        </div>
      </Reveal>

      <Reveal
        delay={2}
        y={0}
        config={SNAP}
        style={{ position: "absolute", left: BOX_X, top: HEAD_Y, width: BOX_W, height: HEAD_H }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "100%",
            padding: "0 16px",
            fontFamily: FONT_MONO,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: c(T.mutedForeground),
          }}
        >
          <span>Revenue by day</span>
          <span>{`Average week · ${dram(WEEK_REVENUE)}`}</span>
        </div>
      </Reveal>

      {/* Baseline the bars stand on. */}
      <div
        style={{
          position: "absolute",
          left: BOX_X,
          top: BASELINE_Y,
          width: BOX_W,
          height: 1,
          background: c(T.borderStrong),
          opacity: interpolate(frame, [6, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />

      {DAY_REVENUE.map((value, i) => {
        const delay = 16 + i * 7;
        const grow = reduced
          ? interpolate(frame, [delay, delay + 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          : spring({ frame, fps, delay, config: { damping: 19, mass: 0.9, stiffness: 150 } });
        const full = (value / MAX_REVENUE) * BAR_MAX_H;
        const h = Math.max(0, full * clamp01(grow));
        const w = STRIPE_W - 30;
        const x = stripeX(i) + 15;
        const isPeak = value === MAX_REVENUE;

        return (
          <div key={DAYS[i]}>
            <div
              style={{
                position: "absolute",
                left: x,
                top: BASELINE_Y - h,
                width: w,
                height: h,
                borderRadius: "10px 10px 2px 2px",
                background: `linear-gradient(to top, ${c(T.primary, isPeak ? 0.5 : 0.3)}, ${c(T.primary, isPeak ? 0.95 : 0.68)})`,
                border: `1px solid ${c(T.primary, isPeak ? 0.85 : 0.5)}`,
                boxShadow: isPeak ? `0 0 30px -6px ${c(T.primary, 0.6)}` : undefined,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: x,
                top: BASELINE_Y - h - 28,
                width: w,
                textAlign: "center",
                fontFamily: FONT_MONO,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: isPeak ? c(T.primary) : c(T.foregroundSoft),
                fontVariantNumeric: "tabular-nums",
                opacity: clamp01((grow - 0.55) / 0.35),
              }}
            >
              {dram(value)}
            </div>
            <Reveal
              delay={delay + 4}
              y={8}
              config={SNAP}
              style={{
                position: "absolute",
                left: stripeX(i),
                top: BASELINE_Y + 16,
                width: STRIPE_W,
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  color: c(T.foregroundSoft),
                }}
              >
                {DAYS[i]}
              </span>
            </Reveal>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ================================================================== *
 * The close
 * ================================================================== */

const MICRO = ["No listing fee", "Weekly payouts", "You set the hours"];

const EndCard: FC<Record<string, never>> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = useReducedMotion();

  const lock = reduced ? 1 : spring({ frame, fps, delay: 6, config: SOFT });

  // 94 frames, period 47 — exactly two sweeps, so the sheen leaves the button
  // as the composition ends rather than freezing mid-pass.
  const sheen = reduced ? -1 : ((frame % 47) / 47) * 2.4 - 0.7;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 322, textAlign: "center" }}>
        <Reveal delay={4} y={reduced ? 0 : 30} scaleFrom={reduced ? 1 : 0.94} config={SOFT}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 22,
              transform: reduced ? undefined : `scale(${lerp(0.98, 1, lock).toFixed(4)})`,
            }}
          >
            <BrandMark size={82} />
            <Wordmark size={92} />
          </div>
        </Reveal>
      </div>

      <Reveal
        delay={16}
        y={22}
        config={SOFT}
        style={{ position: "absolute", left: 0, right: 0, top: 468, textAlign: "center" }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 42,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: c(T.foreground),
          }}
        >
          List your venue in ten minutes.
        </div>
      </Reveal>

      <Reveal
        delay={26}
        y={20}
        scaleFrom={reduced ? 1 : 0.93}
        config={POP}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 556,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "22px 52px",
            borderRadius: 999,
            background: c(T.primary),
            color: c(T.primaryForeground),
            fontFamily: FONT_DISPLAY,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "-0.015em",
            boxShadow: `0 0 44px -8px ${c(T.primary, 0.6)}, 0 18px 34px -14px ${c("160 40% 2%", 0.9)}`,
          }}
        >
          sportsbnb.am/host
          {reduced ? null : (
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${sheen * 100}%`,
                width: "36%",
                background: `linear-gradient(100deg, transparent, ${c(T.foreground, 0.34)}, transparent)`,
              }}
            />
          )}
        </div>
      </Reveal>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 684,
          display: "flex",
          justifyContent: "center",
          gap: 16,
        }}
      >
        {MICRO.map((m, i) => (
          <Reveal key={m} delay={40 + i * 6} y={16} config={SNAP}>
            <div
              style={{
                padding: "11px 22px",
                borderRadius: 999,
                border: `1px solid ${c(T.border)}`,
                background: c(T.surface1, 0.7),
                fontFamily: FONT_SANS,
                fontSize: 17,
                fontWeight: 500,
                color: c(T.foregroundSoft),
                whiteSpace: "nowrap",
              }}
            >
              {m}
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal
        delay={48}
        y={12}
        config={SNAP}
        style={{ position: "absolute", left: 0, right: 0, top: 796, textAlign: "center" }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: c(T.mutedForeground),
          }}
        >
          {`${dram(MONTH_REVENUE)} a month · ${OCCUPANCY}% occupancy · Yerevan`}
        </span>
      </Reveal>
    </AbsoluteFill>
  );
};

/* ================================================================== *
 * Stage
 * ================================================================== */

const OwnerPitchStage: FC<Record<string, never>> = () => (
  <AbsoluteFill style={{ backgroundColor: c(T.background) }}>
    <Backdrop />
    <CardShell />
    <TopChrome />

    <Sequence from={ACT1.from} durationInFrames={ACT1.dur} name="01 · Empty pitch" layout="none">
      <ActFade dur={ACT1.dur}>
        <Act1 />
      </ActFade>
    </Sequence>

    <Sequence from={ACT2.from} durationInFrames={ACT2.dur} name="02 · Calendar fills" layout="none">
      <ActFade dur={ACT2.dur}>
        <Act2 />
      </ActFade>
    </Sequence>

    <Sequence from={ACT3.from} durationInFrames={ACT3.dur} name="03 · Money earned" layout="none">
      <ActFade dur={ACT3.dur}>
        <Act3 />
      </ActFade>
    </Sequence>

    <Sequence from={ACT4.from} durationInFrames={ACT4.dur} name="04 · List your venue" layout="none">
      <ActFade dur={ACT4.dur} out={false}>
        <EndCard />
      </ActFade>
    </Sequence>

    <BottomChrome />
  </AbsoluteFill>
);

export type OwnerPitchProps = Record<string, never>;

/**
 * Register with:
 *   width={1920} height={1080} fps={30} durationInFrames={600}
 */
export const OwnerPitch: FC<OwnerPitchProps> = () => {
  const reduced = useSystemReducedMotion();
  return (
    <ReducedMotionContext.Provider value={reduced}>
      <OwnerPitchStage />
    </ReducedMotionContext.Provider>
  );
};

export default OwnerPitch;
