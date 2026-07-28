/**
 * BookingFlow — SportsBnB's three-tap booking flow, for Reels / TikTok / Stories.
 *
 * 1080×1920, 12s @ 30fps (360 frames).
 *
 * ── What it shows ─────────────────────────────────────────────────────────
 * One continuous app surface, three taps:
 *
 *   Tap 1 (≈3.1s)  find a pitch      — search + three venue rows, one gets picked
 *   Tap 2 (≈6.7s)  pick a time       — date chips + a 3×3 slot grid, 19:00 gets picked
 *   Tap 3 (≈9.8s)  confirm & pay     — price breakdown, pay, then the booked state
 *
 * ── Safe margins ──────────────────────────────────────────────────────────
 * Vertical platforms overlay chrome top and bottom. Nothing that carries
 * meaning is placed above y=170 or below y=1692, i.e. ≥170px of top margin and
 * ≥228px of bottom margin. `SAFE_TOP` / `SAFE_BOTTOM` below are the contract;
 * every block is positioned against them. Only the backdrop and the confetti
 * are allowed to bleed into the margins, and neither carries information.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * Everything that *arrives* arrives on a `spring()` — panels, rows, slot cells,
 * price lines, the tap cursor's press. `interpolate()` is used only where a
 * linear-ish ramp is genuinely the right model: opacity cross-fades, the step
 * progress rail (it is a timer, and a timer that springs is a lie), the ripple
 * radius, and the confetti's opacity envelope. Easings are the design system's
 * own `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`.
 *
 * Nothing appears at once. Each panel staggers its own children (rows 8 frames
 * apart, slot cells on a diagonal `(row + col)` delay, price lines 4 apart) and
 * the panels themselves cross-fade with an 8-frame overlap.
 *
 * ── Reduced motion ────────────────────────────────────────────────────────
 * `(prefers-reduced-motion: reduce)` is honoured live. Rather than freezing the
 * video — which would destroy a narrative piece and show the viewer nothing —
 * the *timeline* is kept and the *motion* is removed: `motion` collapses to 0,
 * so every translate / scale / rotate amount multiplies out to zero and springs
 * resolve instantly to their settled value. Opacity cross-fades remain (a fade
 * is not motion), the tap cursor stops travelling and rippling, the ambient
 * float and glow stop, and the confetti is not emitted at all. Headless Chrome
 * reports `no-preference`, so the rendered file is unaffected; this is for the
 * composition when it is played back inside the app or a browser.
 *
 * ── Self-containment ──────────────────────────────────────────────────────
 * No network of any kind: no `<Img>`, no `@font-face`, no remote CSS. The app's
 * `src/index.css` pulls Space Grotesk / DM Sans / JetBrains Mono from Google
 * Fonts, which a headless render cannot reach, so we use the documented system
 * tails of those same stacks. Every graphic is inline SVG or CSS. The single
 * `data:` URI is the noise tile copied verbatim from `.glass::before`.
 *
 * The dram sign ֏ (U+058F) is deliberately *not* used: `src/index.css` notes
 * that no bundled face carries it and that it is served by a separate Google
 * Fonts subset request — unreachable here, so it would render as tofu. Prices
 * use the "AMD" prefix instead, and the 5% figure matches
 * `PLATFORM_FEE_PERCENTAGE` in `src/lib/pricing.ts` (18,000 + 900 = 18,900).
 *
 * ── Colour ────────────────────────────────────────────────────────────────
 * Every colour is lifted from the `.dark` block of `src/index.css` ("Court at
 * night"), the theme the app actually ships. Nothing is invented.
 */

import { useEffect, useState, type CSSProperties, type FC, type ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* ══════════════════════════════ brand tokens ═════════════════════════════ */

/**
 * `src/index.css` → `.dark`. Raw HSL triples from the custom properties,
 * written in comma form so they are valid standalone CSS colours.
 */
const BRAND = {
  /** --background: 160 22% 5% */
  background: "hsl(160, 22%, 5%)",
  /** --surface-1: 160 18% 10% */
  surface1: "hsl(160, 18%, 10%)",
  /** --surface-2: 160 15% 14% */
  surface2: "hsl(160, 15%, 14%)",
  /** --surface-3: 158 13% 18% */
  surface3: "hsl(158, 13%, 18%)",
  /** --card: 160 15% 13% */
  card: "hsl(160, 15%, 13%)",
  /** --popover: 160 16% 12% */
  popover: "hsl(160, 16%, 12%)",
  /** --muted: 158 13% 13% */
  muted: "hsl(158, 13%, 13%)",
  /** --primary: 151 90% 47% — electric court green */
  primary: "hsl(151, 90%, 47%)",
  /** --primary-foreground: 160 25% 5% */
  primaryForeground: "hsl(160, 25%, 5%)",
  /** --primary-soft: 155 45% 12% */
  primarySoft: "hsl(155, 45%, 12%)",
  /** --foreground: 100 20% 96% — chalk white */
  foreground: "hsl(100, 20%, 96%)",
  /** --foreground-soft: 130 8% 72% */
  foregroundSoft: "hsl(130, 8%, 72%)",
  /** --muted-foreground: 130 8% 64% */
  mutedForeground: "hsl(130, 8%, 64%)",
  /** --border: 157 12% 22% */
  border: "hsl(157, 12%, 22%)",
  /** --border-strong: 155 10% 26% */
  borderStrong: "hsl(155, 10%, 26%)",
  /** --chart-2: 190 80% 50% */
  cyan: "hsl(190, 80%, 50%)",
  /** --chart-3 / --warning: 42 95% 55% */
  amber: "hsl(42, 95%, 55%)",
  /** --chart-4: 268 80% 76% */
  violet: "hsl(268, 80%, 76%)",
} as const;

const green = (a: number) => `hsla(151, 90%, 47%, ${a})`;
const chalk = (a: number) => `hsla(100, 20%, 96%, ${a})`;
const soft = (a: number) => `hsla(130, 8%, 72%, ${a})`;
const dim = (a: number) => `hsla(130, 8%, 64%, ${a})`;
const line = (a: number) => `hsla(157, 12%, 22%, ${a})`;
const ink = (a: number) => `hsla(160, 22%, 5%, ${a})`;
const cyan = (a: number) => `hsla(190, 80%, 50%, ${a})`;

/**
 * The system tails of `--font-display` / `--font-sans` / `--font-mono`. The
 * webfont heads are dropped on purpose — see the header note.
 */
const DISPLAY_FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SANS_FONT = DISPLAY_FONT;
const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

/** Inline noise tile — identical to the one in `.glass::before`. */
const NOISE_TILE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`.
 * The design system's `--ease-spring` is deliberately not ported: everything
 * that would have used it gets a real `spring()` here instead.
 */
const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);

const TAU = Math.PI * 2;

/* ═══════════════════════════ canvas & layout ═════════════════════════════ */

/** Everything below is authored against this design canvas and then scaled. */
const W = 1080;
const H = 1920;

/** Platform-chrome safe area. Nothing meaningful crosses these lines. */
const SAFE_TOP = 170;
const SAFE_BOTTOM = 1692;

/** The app surface. */
const CARD_X = 110;
const CARD_W = 860;
const CARD_Y = 452;
const CARD_H = 990;
const CARD_R = 56;
const PAD = 44;
/** Inner content column of the app surface. */
const IN_X = CARD_X + PAD; // 154
const IN_W = CARD_W - PAD * 2; // 772
/** First usable y inside the app surface, below its chrome. */
const CONTENT_Y = 620;

/* ═════════════════════════════ timeline ══════════════════════════════════ */

export const BOOKING_FLOW_FPS = 30;
export const BOOKING_FLOW_DURATION = 360;

type Window = { from: number; duration: number };

/**
 * The three panels. They overlap by 8 frames so one cross-fades into the next
 * rather than cutting.
 */
const PANEL_FIND: Window = { from: 18, duration: 126 }; // 18 → 144
const PANEL_TIME: Window = { from: 136, duration: 108 }; // 136 → 244
const PANEL_PAY: Window = { from: 236, duration: 124 }; // 236 → 360

/** Frames a panel spends fading itself out at the end of its window. */
const PANEL_EXIT = 16;

/**
 * Tap timings, in each panel's *local* frames.
 * `REACH` is when the cursor starts travelling in; `PRESS` is contact.
 */
const FIND_REACH = 62;
const FIND_PRESS = 76; // abs 94  ≈ 3.13s
const TIME_REACH = 52;
const TIME_PRESS = 66; // abs 202 ≈ 6.73s
const PAY_REACH = 44;
const PAY_PRESS = 58; // abs 294 ≈ 9.80s
/** Payment authorisation spinner runs from PAY_PRESS to here. */
const PAY_SETTLED = 76; // abs 312 ≈ 10.40s

/** Absolute frame at which the booking-confirmed state takes over. */
const SUCCESS_AT = PANEL_PAY.from + PAY_SETTLED; // 312

/** Caption windows, nudged ahead of their panels so the words lead the UI. */
const CAPTIONS: (Window & { step: string; head: [string, string] })[] = [
  { from: 14, duration: 128, step: "STEP 01 — FIND A PITCH", head: ["Find the", "right pitch"] },
  { from: 134, duration: 116, step: "STEP 02 — PICK A TIME", head: ["Grab the", "slot you want"] },
  { from: 242, duration: 74, step: "STEP 03 — CONFIRM & PAY", head: ["Book it in", "one tap"] },
  { from: 308, duration: 52, step: "BOOKED · SPORTSBNB.AM", head: ["Done.", "Go play."] },
];

/* ═════════════════════════════ content ══════════════════════════════════ */

type Venue = {
  name: string;
  /** A real Yerevan district — see YEREVAN_KEYWORDS in src/lib/market.ts. */
  district: string;
  format: string;
  rating: string;
  reviews: string;
  /** AMD per hour, already formatted. */
  price: string;
  /** Hue for the pitch thumbnail, kept inside the brand's green range. */
  hue: number;
};

const VENUES: Venue[] = [
  {
    name: "Ararat Arena",
    district: "Kentron",
    format: "5-a-side",
    rating: "4.9",
    reviews: "128",
    price: "12,000",
    hue: 151,
  },
  {
    name: "Mika Sports Complex",
    district: "Davtashen",
    format: "7-a-side",
    rating: "4.8",
    reviews: "204",
    price: "18,000",
    hue: 166,
  },
  {
    name: "Nairi Football Park",
    district: "Ajapnyak",
    format: "11-a-side",
    rating: "4.7",
    reviews: "96",
    price: "26,000",
    hue: 138,
  },
];

/** The row the first tap lands on. */
const PICKED_VENUE = 1;

const SLOTS = [
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
];
/** Indices already taken — the grid has to look like a real day. */
const SLOTS_TAKEN = [1, 6, 8];
/** Centre cell: 19:00. */
const PICKED_SLOT = 4;

/* ═══════════════════════════ motion helpers ═════════════════════════════ */

/**
 * `(prefers-reduced-motion: reduce)`, live.
 *
 * Headless Chrome reports `no-preference`, so renders are unaffected; a viewer
 * who has asked their OS to calm things down and then meets this composition
 * playing in a browser gets the still, fade-only cut.
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

/** Shared by every animated component: `motion` is 0 when calm is requested. */
type Stage = { fps: number; motion: number };

/**
 * The one entrance curve in this file.
 *
 * Returns 0 → 1 with the design system's overshoot. When `motion` is 0 the
 * spring is skipped entirely and the value snaps to its settled state the
 * instant its delay elapses — callers multiply their travel distance by
 * `1 - enter()`, so a settled value of 1 means "no movement at all".
 */
const enter = (
  frame: number,
  { fps, motion }: Stage,
  delay: number,
  duration = 28,
): number => {
  if (motion === 0) return frame >= delay ? 1 : 0;
  return spring({
    frame,
    fps,
    delay,
    config: { damping: 17, mass: 0.9, stiffness: 110 },
    durationInFrames: duration,
  });
};

/** A tighter, snappier spring for small objects (chips, cells, pips). */
const pop = (frame: number, { fps, motion }: Stage, delay: number, duration = 22): number => {
  if (motion === 0) return frame >= delay ? 1 : 0;
  return spring({
    frame,
    fps,
    delay,
    config: { damping: 14, mass: 0.6, stiffness: 190 },
    durationInFrames: duration,
  });
};

/**
 * A press: down fast, back up. Spring-in minus spring-out, so it is exactly 0
 * before `delay` and returns to exactly 0 once both springs have settled —
 * `spring()` with an explicit `durationInFrames` short-circuits to `to`.
 */
const press = (frame: number, { fps, motion }: Stage, delay: number): number => {
  if (motion === 0) return 0;
  const down = spring({
    frame,
    fps,
    delay,
    config: { damping: 20, mass: 0.6, stiffness: 260 },
    durationInFrames: 6,
  });
  const up = spring({
    frame,
    fps,
    delay: delay + 7,
    config: { damping: 18, mass: 0.7, stiffness: 180 },
    durationInFrames: 12,
  });
  return down - up;
};

/** Linear-with-a-lift opacity ramp. Fades are not motion, so `motion` is moot. */
const fade = (frame: number, from: number, length: number): number =>
  interpolate(frame, [from, from + length], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

const clamped = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* ═══════════════════════════════ icons ═══════════════════════════════════ */

type IconProps = {
  size: number;
  color: string;
  /** Stroke width in the 24×24 icon space. */
  weight?: number;
  opacity?: number;
};

const strokeIcon =
  (paths: string[]): FC<IconProps> =>
  ({ size, color, weight = 1.8, opacity = 1 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: "block", opacity, flexShrink: 0 }}
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={weight}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );

const PinIcon = strokeIcon([
  "M12 21.4c4.2-4.4 6.3-7.8 6.3-10.4a6.3 6.3 0 1 0-12.6 0c0 2.6 2.1 6 6.3 10.4z",
  "M9.8 11a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0",
]);
const ClockIcon = strokeIcon([
  "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  "M12 7v5.3l3.4 2",
]);
const CalendarIcon = strokeIcon([
  "M6 5.5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2z",
  "M4 10h16",
  "M8.5 3v4.5",
  "M15.5 3v4.5",
]);
const UsersIcon = strokeIcon([
  "M16.2 20.2v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.9a3.6 3.6 0 0 0-3.6 3.6v1.8",
  "M9.75 11.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z",
  "M20.7 20.2v-1.8a3.6 3.6 0 0 0-2.7-3.48",
  "M15.3 4.12a3.6 3.6 0 0 1 0 6.96",
]);
const SearchIcon = strokeIcon([
  "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  "M16.9 16.9 21 21",
]);
const LockIcon = strokeIcon([
  "M6 10.4h12a1.6 1.6 0 0 1 1.6 1.6v7A1.6 1.6 0 0 1 18 20.6H6A1.6 1.6 0 0 1 4.4 19v-7A1.6 1.6 0 0 1 6 10.4z",
  "M8.3 10.4V7.7a3.7 3.7 0 0 1 7.4 0v2.7",
]);
const SlidersIcon = strokeIcon([
  "M5 7h9",
  "M18 7h1",
  "M5 12h3",
  "M12 12h7",
  "M5 17h9",
  "M18 17h1",
  "M16 5.2v3.6",
  "M10 10.2v3.6",
  "M16 15.2v3.6",
]);

const StarIcon: FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flexShrink: 0 }}>
    <path
      d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.06l-5.7 3.3 1.09-6.35-4.62-4.5 6.38-.93z"
      fill={color}
    />
  </svg>
);

/* ═════════════════════════════ primitives ═══════════════════════════════ */

/** Absolutely positioned box in design-canvas coordinates. */
const Box: FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  style?: CSSProperties;
  children?: ReactNode;
}> = ({ x, y, w, h, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Uppercase mono micro-label — the design system's `.eyebrow`, scaled up. */
const MicroLabel: FC<{ children: ReactNode; color?: string; size?: number }> = ({
  children,
  color = dim(1),
  size = 22,
}) => (
  <span
    style={{
      fontFamily: MONO_FONT,
      fontSize: size,
      fontWeight: 500,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

/** AMD price. The dram sign is avoided on purpose — see the header. */
const Money: FC<{ amount: string; size: number; color?: string; weight?: number }> = ({
  amount,
  size,
  color = BRAND.foreground,
  weight = 500,
}) => (
  <span
    style={{
      fontFamily: MONO_FONT,
      fontSize: size,
      fontWeight: weight,
      color,
      letterSpacing: "-0.02em",
      fontVariantNumeric: "tabular-nums",
      whiteSpace: "nowrap",
    }}
  >
    <span style={{ fontSize: size * 0.62, opacity: 0.72, marginRight: size * 0.16 }}>AMD</span>
    {amount}
  </span>
);

/* ═════════════════════════════ backdrop ═════════════════════════════════ */

/**
 * "Court at night": the page background, a court-green bloom, the design
 * system's 56px soft grid, two faint pitch markings that drift, and grain.
 *
 * The bloom and the drift are the only ambient motion in the piece and both
 * ride a **full** cosine period over the composition, so they are continuous
 * end to end and multiply out to a dead still when `motion` is 0.
 */
const Backdrop: FC<{ frame: number; motion: number }> = ({ frame, motion }) => {
  const t = frame / BOOKING_FLOW_DURATION;
  /** cos(2πt) — equal at t=0 and t=1, so no ambient hitch on a loop or a cut. */
  const breath = Math.cos(TAU * t);
  const bloom = 0.13 + 0.05 * breath * motion;
  const drift = 26 * breath * motion;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background, overflow: "hidden" }}>
      {/* .bg-grid-soft — 56px, border at half alpha. */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(to right, ${line(0.5)} 1px, transparent 1px), linear-gradient(to bottom, ${line(0.5)} 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
          opacity: 0.55,
          transform: `translateY(${drift * 0.35}px)`,
        }}
      />

      {/* Pitch markings — a centre circle and the halfway line, way off-canvas
          bottom so they read as an abstract court rather than a diagram. */}
      <AbsoluteFill style={{ opacity: 0.5, transform: `translateY(${drift}px)` }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
          <circle cx={540} cy={1980} r={520} fill="none" stroke={line(0.85)} strokeWidth={3} />
          <circle cx={540} cy={1980} r={760} fill="none" stroke={line(0.5)} strokeWidth={3} />
          <circle cx={540} cy={-160} r={430} fill="none" stroke={line(0.7)} strokeWidth={3} />
          <path d={`M0 1460 H${W}`} stroke={line(0.45)} strokeWidth={3} />
        </svg>
      </AbsoluteFill>

      {/* .bg-radial-fade, court-green, breathing. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 72% 34% at 50% 16%, ${green(bloom)}, transparent 62%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 26% at 50% 92%, ${cyan(0.06 - 0.02 * breath * motion)}, transparent 66%)`,
        }}
      />

      {/* Vignette — keeps the safe margins visually quiet. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 90% 60% at 50% 46%, transparent 40%, ${ink(0.62)} 100%)`,
        }}
      />

      {/* Grain, straight from .glass::before. */}
      <AbsoluteFill
        style={{ backgroundImage: NOISE_TILE, opacity: 0.05, mixBlendMode: "overlay" }}
      />
    </AbsoluteFill>
  );
};

/* ═════════════════════════════ captions ═════════════════════════════════ */

/** Step label + two-line headline. One instance per caption window. */
const Caption: FC<{
  stage: Stage;
  duration: number;
  step: string;
  head: [string, string];
}> = ({ stage, duration, step, head }) => {
  const frame = useCurrentFrame();
  const { motion } = stage;

  const out = interpolate(frame, [duration - 14, duration], [0, 1], clamped);
  const alive = 1 - out;

  const stepIn = enter(frame, stage, 0, 24);
  const l1 = enter(frame, stage, 4, 30);
  const l2 = enter(frame, stage, 10, 30);

  return (
    <>
      <Box
        x={CARD_X}
        y={SAFE_TOP}
        w={CARD_W}
        style={{
          opacity: fade(frame, 0, 10) * alive,
          transform: `translateY(${(1 - stepIn) * 22 * motion - out * 16 * motion}px)`,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: BRAND.primary,
            boxShadow: `0 0 18px ${green(0.9)}`,
            flexShrink: 0,
          }}
        />
        <MicroLabel color={BRAND.primary} size={25}>
          {step}
        </MicroLabel>
      </Box>

      <Box x={CARD_X} y={230} w={CARD_W} style={{ opacity: alive }}>
        {[head[0], head[1]].map((text, i) => {
          const p = i === 0 ? l1 : l2;
          return (
            <div
              key={i}
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: 82,
                fontWeight: 700,
                lineHeight: 1.0,
                letterSpacing: "-0.04em",
                color: i === 0 ? BRAND.foreground : BRAND.primary,
                opacity: fade(frame, i === 0 ? 2 : 8, 12),
                transform: `translateY(${(1 - p) * 34 * motion - out * 20 * motion}px)`,
                whiteSpace: "nowrap",
              }}
            >
              {text}
            </div>
          );
        })}
      </Box>
    </>
  );
};

/* ═══════════════════════════ app surface ════════════════════════════════ */

/** Battery / signal glyphs for the fake status bar. */
const StatusGlyphs: FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <svg width={26} height={20} viewBox="0 0 26 20" style={{ display: "block" }}>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * 6.5}
          y={14 - i * 4}
          width={4.5}
          height={4 + i * 4}
          rx={1.4}
          fill={chalk(i === 3 ? 0.45 : 0.85)}
        />
      ))}
    </svg>
    <svg width={34} height={18} viewBox="0 0 34 18" style={{ display: "block" }}>
      <rect x={0.9} y={0.9} width={28} height={16.2} rx={5} fill="none" stroke={chalk(0.45)} strokeWidth={1.8} />
      <rect x={3.6} y={3.6} width={19} height={10.8} rx={3} fill={BRAND.primary} />
      <rect x={31} y={6} width={3} height={6} rx={1.5} fill={chalk(0.45)} />
    </svg>
  </div>
);

/**
 * The persistent app window: status bar, product chrome, hairline, and a
 * clipped content well the three panels slide through.
 */
const AppSurface: FC<{ frame: number; stage: Stage; children: ReactNode }> = ({
  frame,
  stage,
  children,
}) => {
  const { motion } = stage;
  const rise = enter(frame, stage, 4, 34);
  /** Ambient float on a full cosine period — continuous, and 0 when calm. */
  const float = Math.cos(TAU * (frame / BOOKING_FLOW_DURATION)) * 5 * motion;

  return (
    <Box
      x={CARD_X}
      y={CARD_Y}
      w={CARD_W}
      h={CARD_H}
      style={{
        opacity: fade(frame, 2, 12),
        transform: `translateY(${(1 - rise) * 90 * motion + float}px) scale(${1 - (1 - rise) * 0.04 * motion})`,
        transformOrigin: "50% 30%",
        borderRadius: CARD_R,
        // .glass, dark: --glass-bg 160 18% 8% at --glass-alpha 0.9.
        backgroundColor: "hsla(160, 18%, 8%, 0.9)",
        border: `1.5px solid hsla(155, 20%, 30%, 0.42)`,
        boxShadow: `inset 0 2px 0 0 hsla(155, 20%, 30%, 0.4), 0 40px 90px -30px hsl(160, 30%, 2%), 0 0 90px -20px ${green(0.14)}`,
        overflow: "hidden",
      }}
    >
      {/* Grain on the glass, exactly as .glass::before does it. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: NOISE_TILE,
          opacity: 0.04,
          pointerEvents: "none",
        }}
      />

      {/* Status bar. */}
      <div
        style={{
          position: "absolute",
          left: PAD,
          top: 22,
          width: IN_W,
          height: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: fade(frame, 10, 12) * 0.9,
        }}
      >
        <span
          style={{
            fontFamily: MONO_FONT,
            fontSize: 24,
            fontWeight: 500,
            color: chalk(0.72),
            letterSpacing: "0.02em",
          }}
        >
          18:42
        </span>
        <StatusGlyphs />
      </div>

      {/* Product chrome. */}
      <div
        style={{
          position: "absolute",
          left: PAD,
          top: 84,
          width: IN_W,
          height: 76,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: fade(frame, 14, 14),
          transform: `translateX(${(1 - enter(frame, stage, 14, 26)) * -20 * motion}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 18,
              backgroundColor: BRAND.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 26px -6px ${green(0.7)}`,
            }}
          >
            <span
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: 32,
                fontWeight: 700,
                color: BRAND.primaryForeground,
                letterSpacing: "-0.04em",
              }}
            >
              S
            </span>
          </div>
          <span
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 34,
              fontWeight: 600,
              color: BRAND.foreground,
              letterSpacing: "-0.025em",
            }}
          >
            sportsbnb
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            height: 48,
            padding: "0 20px",
            borderRadius: 24,
            backgroundColor: BRAND.muted,
            border: `1px solid ${line(1)}`,
          }}
        >
          {/* .live-dot, without the ping (a render has no compositor loop for
              a CSS keyframe; the pulse is done with a spring instead). */}
          <LiveDot frame={frame} stage={stage} />
          <MicroLabel size={20} color={soft(0.95)}>
            Yerevan
          </MicroLabel>
        </div>
      </div>

      {/* Hairline under the chrome. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: CONTENT_Y - CARD_Y - 16,
          width: CARD_W,
          height: 1.5,
          background: `linear-gradient(to right, transparent, ${line(1)} 12%, ${line(1)} 88%, transparent)`,
          opacity: fade(frame, 18, 12),
        }}
      />

      {/* The well the panels live in. Positioned in card-local space, but the
          panels are authored in canvas space, so it is offset back out. */}
      <div
        style={{
          position: "absolute",
          left: -CARD_X,
          top: -CARD_Y,
          width: W,
          height: H,
        }}
      >
        {children}
      </div>
    </Box>
  );
};

/** The pulsing live dot — spring in, spring out, forever, 1.8s apart. */
const LiveDot: FC<{ frame: number; stage: Stage }> = ({ frame, stage }) => {
  const { fps, motion } = stage;
  const period = 54; // 1.8s at 30fps, matching --dur of .live-dot
  const local = ((frame % period) + period) % period;
  const rise = motion === 0 ? 0 : spring({ frame: local, fps, config: { damping: 200 }, durationInFrames: 30 });
  const ringScale = 1 + rise * 1.9;
  const ringOpacity = (1 - rise) * 0.55 * motion;

  return (
    <div style={{ position: "relative", width: 12, height: 12, flexShrink: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 6,
          backgroundColor: BRAND.primary,
          transform: `scale(${ringScale})`,
          opacity: ringOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 6,
          backgroundColor: BRAND.primary,
        }}
      />
    </div>
  );
};

/**
 * Wraps a panel's children in its enter / exit transform. Panels cross-fade
 * and slide a short way; the slide is the only thing `motion` removes.
 */
const PanelFrame: FC<{
  frame: number;
  stage: Stage;
  duration: number;
  /** The last panel never leaves. */
  exits?: boolean;
  children: ReactNode;
}> = ({ frame, stage, duration, exits = true, children }) => {
  const { motion } = stage;
  const out = exits
    ? interpolate(frame, [duration - PANEL_EXIT, duration], [0, 1], clamped)
    : 0;
  const inX = (1 - enter(frame, stage, 0, 26)) * 70 * motion;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: fade(frame, 0, 10) * (1 - out),
        transform: `translateX(${inX - out * 90 * motion}px) scale(${1 - out * 0.04 * motion})`,
        transformOrigin: "50% 45%",
      }}
    >
      {children}
    </div>
  );
};

/* ═══════════════════════════ tap indicator ══════════════════════════════ */

/**
 * The finger. Travels in on `--ease-out-expo`, presses on a spring, and throws
 * two ripples. With `motion` at 0 it simply fades in at its target, holds, and
 * fades out — the tap still *reads*, it just does not move.
 */
const TapCursor: FC<{
  frame: number;
  stage: Stage;
  x: number;
  y: number;
  reach: number;
  contact: number;
  /** Where it comes from, relative to the target. */
  fromX?: number;
  fromY?: number;
}> = ({ frame, stage, x, y, reach, contact, fromX = 96, fromY = 150 }) => {
  const { motion } = stage;
  const travel = interpolate(frame, [reach, contact], [1, 0], {
    ...clamped,
    easing: EASE_OUT_EXPO,
  });
  const visible =
    fade(frame, reach, 8) * (1 - interpolate(frame, [contact + 20, contact + 32], [0, 1], clamped));
  const squash = press(frame, stage, contact);
  const scale = 1 - squash * 0.3;

  const ripple = (delay: number, max: number) => {
    const p = interpolate(frame, [contact + delay, contact + delay + 26], [0, 1], {
      ...clamped,
      easing: EASE_OUT_EXPO,
    });
    return {
      r: 44 + (max - 44) * p * motion,
      o: (1 - p) * 0.5 * (frame >= contact + delay ? 1 : 0) * motion,
    };
  };
  const r1 = ripple(0, 170);
  const r2 = ripple(7, 130);

  return (
    <Box
      x={x - 130}
      y={y - 130}
      w={260}
      h={260}
      style={{
        opacity: visible,
        transform: `translate(${travel * fromX * motion}px, ${travel * fromY * motion}px)`,
      }}
    >
      <svg width={260} height={260} viewBox="0 0 260 260" style={{ display: "block" }}>
        <circle cx={130} cy={130} r={r1.r} fill="none" stroke={green(r1.o)} strokeWidth={4} />
        <circle cx={130} cy={130} r={r2.r} fill="none" stroke={chalk(r2.o * 0.7)} strokeWidth={3} />
        <g transform={`translate(130 130) scale(${scale}) translate(-130 -130)`}>
          <circle cx={130} cy={130} r={46} fill={chalk(0.14)} />
          <circle cx={130} cy={130} r={46} fill="none" stroke={chalk(0.75)} strokeWidth={4} />
          <circle cx={130} cy={130} r={15} fill={chalk(0.92)} />
        </g>
      </svg>
    </Box>
  );
};

/* ══════════════════════════ panel 1 — find ══════════════════════════════ */

/** A miniature pitch, drawn rather than photographed — no network, no assets. */
const PitchThumb: FC<{ size: number; hue: number }> = ({ size, hue }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 20,
      overflow: "hidden",
      flexShrink: 0,
      background: `linear-gradient(150deg, hsl(${hue}, 46%, 26%), hsl(${hue}, 40%, 13%))`,
      border: `1px solid ${line(1)}`,
      position: "relative",
    }}
  >
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <rect x={12} y={8} width={76} height={84} fill="none" stroke={chalk(0.34)} strokeWidth={2} rx={3} />
      <path d="M12 50 H88" stroke={chalk(0.34)} strokeWidth={2} />
      <circle cx={50} cy={50} r={14} fill="none" stroke={chalk(0.34)} strokeWidth={2} />
      <rect x={31} y={8} width={38} height={15} fill="none" stroke={chalk(0.28)} strokeWidth={2} />
      <rect x={31} y={77} width={38} height={15} fill="none" stroke={chalk(0.28)} strokeWidth={2} />
    </svg>
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(to top, ${ink(0.42)}, transparent 55%)`,
      }}
    />
  </div>
);

const ROW_H = 176;
const ROW_GAP = 22;
const ROW_Y0 = 818;

const VenueRow: FC<{
  frame: number;
  stage: Stage;
  venue: Venue;
  index: number;
  /** 0 → 1 as the tap registers on this row. */
  selected: number;
}> = ({ frame, stage, venue, index, selected }) => {
  const { motion } = stage;
  const rise = enter(frame, stage, 12 + index * 8, 32);
  const y = ROW_Y0 + index * (ROW_H + ROW_GAP);
  /** The tapped row dips under the finger, then settles proud of the others. */
  const dip = press(frame, stage, FIND_PRESS) * (index === PICKED_VENUE ? 1 : 0);

  return (
    <Box
      x={IN_X}
      y={y}
      w={IN_W}
      h={ROW_H}
      style={{
        opacity: fade(frame, 12 + index * 8, 12),
        transform: `translateX(${(1 - rise) * 64 * motion}px) scale(${1 - dip * 0.03 * motion})`,
        transformOrigin: "50% 50%",
        borderRadius: 30,
        backgroundColor: selected > 0 ? BRAND.primarySoft : BRAND.card,
        border: `${1.5 + selected * 1}px solid ${selected > 0 ? green(0.25 + selected * 0.55) : line(1)}`,
        boxShadow:
          selected > 0
            ? `0 0 ${36 * selected}px -6px ${green(0.42 * selected)}, 0 10px 26px -12px hsl(160, 30%, 2%)`
            : `0 10px 26px -14px hsl(160, 30%, 2%)`,
        padding: 22,
        display: "flex",
        alignItems: "center",
        gap: 22,
      }}
    >
      <PitchThumb size={132} hue={venue.hue} />

      <div style={{ width: 372, display: "flex", flexDirection: "column", gap: 9 }}>
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: BRAND.foreground,
            whiteSpace: "nowrap",
          }}
        >
          {venue.name}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PinIcon size={24} color={dim(1)} weight={1.9} />
          <span style={{ fontFamily: SANS_FONT, fontSize: 24, color: BRAND.mutedForeground }}>
            {venue.district} · {venue.format}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StarIcon size={22} color={BRAND.amber} />
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 23,
              color: chalk(0.86),
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {venue.rating}
          </span>
          <span style={{ fontFamily: SANS_FONT, fontSize: 22, color: dim(0.8) }}>
            ({venue.reviews})
          </span>
        </div>
      </div>

      <div
        style={{
          width: 190,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        <Money amount={venue.price} size={30} color={selected > 0 ? BRAND.primary : BRAND.foreground} />
        <span style={{ fontFamily: SANS_FONT, fontSize: 20, color: dim(0.85) }}>per hour</span>
        {/* Confirmation pip — springs in only on the row that was tapped. */}
        <div
          style={{
            marginTop: 6,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: BRAND.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: selected,
            transform: `scale(${0.4 + selected * 0.6})`,
          }}
        >
          <svg width={24} height={24} viewBox="0 0 24 24" style={{ display: "block" }}>
            <path
              d="M5 12.4l4.6 4.6L19 6.6"
              fill="none"
              stroke={BRAND.primaryForeground}
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </Box>
  );
};

const PanelFind: FC<{ stage: Stage }> = ({ stage }) => {
  const frame = useCurrentFrame();
  const { motion } = stage;
  const searchRise = enter(frame, stage, 2, 30);
  const selected = pop(frame, stage, FIND_PRESS + 3, 20);

  return (
    <PanelFrame frame={frame} stage={stage} duration={PANEL_FIND.duration}>
      {/* Search field. */}
      <Box
        x={IN_X}
        y={CONTENT_Y + 16}
        w={IN_W}
        h={96}
        style={{
          opacity: fade(frame, 2, 12),
          transform: `translateY(${(1 - searchRise) * 26 * motion}px)`,
          borderRadius: 28,
          backgroundColor: BRAND.surface3,
          border: `1.5px solid ${line(1)}`,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 16,
        }}
      >
        <SearchIcon size={32} color={soft(0.9)} weight={2} />
        <span style={{ fontFamily: SANS_FONT, fontSize: 29, color: chalk(0.92), flex: 1 }}>
          Football · Yerevan
        </span>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: BRAND.primarySoft,
            border: `1px solid ${green(0.28)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SlidersIcon size={30} color={BRAND.primary} weight={2} />
        </div>
      </Box>

      {/* Result count. */}
      <Box
        x={IN_X}
        y={764}
        w={IN_W}
        style={{
          opacity: fade(frame, 8, 12),
          transform: `translateY(${(1 - enter(frame, stage, 8, 26)) * 18 * motion}px)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <MicroLabel color={soft(0.95)}>12 pitches nearby</MicroLabel>
        <MicroLabel color={dim(0.75)}>By distance</MicroLabel>
      </Box>

      {VENUES.map((venue, i) => (
        <VenueRow
          key={venue.name}
          frame={frame}
          stage={stage}
          venue={venue}
          index={i}
          selected={i === PICKED_VENUE ? selected : 0}
        />
      ))}

      <TapCursor
        frame={frame}
        stage={stage}
        x={IN_X + IN_W - 230}
        y={ROW_Y0 + PICKED_VENUE * (ROW_H + ROW_GAP) + ROW_H / 2 + 26}
        reach={FIND_REACH}
        contact={FIND_PRESS}
      />
    </PanelFrame>
  );
};

/* ══════════════════════════ panel 2 — time ══════════════════════════════ */

const CHIPS = ["Today", "Tue 29", "Wed 30", "Thu 31"];
const CHIP_Y = 712;
const CHIP_H = 78;
const GRID_X = IN_X;
const GRID_Y = 862;
const CELL_GAP = 16;
const CELL_W = (IN_W - CELL_GAP * 2) / 3;
const CELL_H = 116;

const SlotCell: FC<{
  frame: number;
  stage: Stage;
  index: number;
  label: string;
  taken: boolean;
  selected: number;
}> = ({ frame, stage, index, label, taken, selected }) => {
  const { motion } = stage;
  const row = Math.floor(index / 3);
  const col = index % 3;
  /** Diagonal stagger — the grid fills from the top-left corner outwards. */
  const rise = pop(frame, stage, 18 + (row + col) * 3, 24);
  const dip = press(frame, stage, TIME_PRESS) * (index === PICKED_SLOT ? 1 : 0);

  const x = GRID_X + col * (CELL_W + CELL_GAP);
  const y = GRID_Y + row * (CELL_H + CELL_GAP);

  const bg = selected > 0 ? BRAND.primary : taken ? BRAND.muted : BRAND.card;
  const fg = selected > 0 ? BRAND.primaryForeground : taken ? dim(0.5) : BRAND.foreground;

  return (
    <Box
      x={x}
      y={y}
      w={CELL_W}
      h={CELL_H}
      style={{
        opacity: fade(frame, 18 + (row + col) * 3, 10) * (taken ? 0.72 : 1),
        transform: `translateY(${(1 - rise) * 26 * motion}px) scale(${(motion === 0 ? 1 : 0.86 + rise * 0.14) - dip * 0.06 * motion})`,
        transformOrigin: "50% 50%",
        borderRadius: 26,
        backgroundColor: bg,
        border: `${1.5 + selected}px solid ${selected > 0 ? green(0.95) : taken ? line(0.7) : line(1)}`,
        boxShadow: selected > 0 ? `0 0 ${40 * selected}px -8px ${green(0.7 * selected)}` : "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        position: "absolute",
      }}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <span
          style={{
            fontFamily: MONO_FONT,
            fontSize: 38,
            fontWeight: 500,
            color: fg,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {label}
        </span>
        {taken ? (
          <div
            style={{
              position: "absolute",
              left: -6,
              right: -6,
              top: "50%",
              height: 2,
              backgroundColor: dim(0.55),
            }}
          />
        ) : null}
      </div>
      <MicroLabel size={17} color={selected > 0 ? ink(0.62) : taken ? dim(0.5) : dim(0.8)}>
        {taken ? "Booked" : "Free"}
      </MicroLabel>
    </Box>
  );
};

const PanelTime: FC<{ stage: Stage }> = ({ stage }) => {
  const frame = useCurrentFrame();
  const { motion } = stage;
  const selected = pop(frame, stage, TIME_PRESS + 3, 20);
  const stripRise = enter(frame, stage, 42, 28);
  /** The summary strip only resolves to real numbers once the slot is chosen. */
  const resolved = fade(frame, TIME_PRESS + 4, 12);

  return (
    <PanelFrame frame={frame} stage={stage} duration={PANEL_TIME.duration}>
      {/* Chosen venue, carried over from panel 1. */}
      <Box
        x={IN_X}
        y={CONTENT_Y + 10}
        w={IN_W}
        style={{
          opacity: fade(frame, 0, 12),
          transform: `translateY(${(1 - enter(frame, stage, 0, 26)) * 20 * motion}px)`,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <PitchThumb size={56} hue={VENUES[PICKED_VENUE].hue} />
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: BRAND.foreground,
          }}
        >
          {VENUES[PICKED_VENUE].name}
        </span>
      </Box>

      {/* Date chips. */}
      {CHIPS.map((chip, i) => {
        const rise = pop(frame, stage, 6 + i * 4, 22);
        const active = i === 0;
        const chipW = (IN_W - 3 * 14) / 4;
        return (
          <Box
            key={chip}
            x={IN_X + i * (chipW + 14)}
            y={CHIP_Y}
            w={chipW}
            h={CHIP_H}
            style={{
              opacity: fade(frame, 6 + i * 4, 10),
              transform: `translateY(${(1 - rise) * 22 * motion}px) scale(${motion === 0 ? 1 : 0.88 + rise * 0.12})`,
              borderRadius: 24,
              backgroundColor: active ? chalk(0.94) : BRAND.card,
              border: `1.5px solid ${active ? chalk(0.94) : line(1)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 26,
                fontWeight: active ? 600 : 500,
                color: active ? BRAND.background : soft(0.95),
                whiteSpace: "nowrap",
              }}
            >
              {chip}
            </span>
          </Box>
        );
      })}

      <Box
        x={IN_X}
        y={GRID_Y - 48}
        w={IN_W}
        style={{
          opacity: fade(frame, 14, 10),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <MicroLabel color={soft(0.95)}>Available times</MicroLabel>
        <MicroLabel color={dim(0.75)}>1 hour blocks</MicroLabel>
      </Box>

      {SLOTS.map((label, i) => (
        <SlotCell
          key={label}
          frame={frame}
          stage={stage}
          index={i}
          label={label}
          taken={SLOTS_TAKEN.indexOf(i) !== -1}
          selected={i === PICKED_SLOT ? selected : 0}
        />
      ))}

      {/* Running total. */}
      <Box
        x={IN_X}
        y={1290}
        w={IN_W}
        h={110}
        style={{
          opacity: fade(frame, 42, 12),
          transform: `translateY(${(1 - stripRise) * 30 * motion}px)`,
          borderRadius: 30,
          backgroundColor: BRAND.primarySoft,
          border: `1.5px solid ${green(0.2 + resolved * 0.35)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <ClockIcon size={30} color={resolved > 0.5 ? BRAND.primary : dim(1)} weight={2} />
          <span style={{ position: "relative", display: "block", height: 36 }}>
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 28,
                color: dim(1),
                opacity: 1 - resolved,
                whiteSpace: "nowrap",
              }}
            >
              Choose a start time
            </span>
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                fontFamily: SANS_FONT,
                fontSize: 28,
                color: chalk(0.95),
                opacity: resolved,
                whiteSpace: "nowrap",
              }}
            >
              19:00 – 20:00 · 1 hour
            </span>
          </span>
        </div>
        <div style={{ opacity: resolved, transform: `scale(${0.9 + resolved * 0.1})` }}>
          <Money amount={VENUES[PICKED_VENUE].price} size={34} color={BRAND.primary} weight={600} />
        </div>
      </Box>

      <TapCursor
        frame={frame}
        stage={stage}
        x={GRID_X + CELL_W + CELL_GAP + CELL_W / 2}
        y={GRID_Y + CELL_H + CELL_GAP + CELL_H / 2}
        reach={TIME_REACH}
        contact={TIME_PRESS}
        fromX={-70}
        fromY={160}
      />
    </PanelFrame>
  );
};

/* ═══════════════════════════ panel 3 — pay ══════════════════════════════ */

const META_ROWS: { icon: FC<IconProps>; label: string }[] = [
  { icon: CalendarIcon, label: "Tuesday, 29 July" },
  { icon: ClockIcon, label: "19:00 – 20:00 · 1 hour" },
  { icon: UsersIcon, label: "7-a-side · up to 14 players" },
];

/**
 * The paid state: a ring that fills, a check stroked on with `pathLength`, the
 * booking reference, and the venue line.
 */
const BookedState: FC<{ frame: number; stage: Stage }> = ({ frame, stage }) => {
  const { motion } = stage;
  const at = PAY_SETTLED;
  const ring = enter(frame, stage, at + 1, 26);
  /** 0 → 1 draws the tick. Under calm it is simply already drawn. */
  const draw = motion === 0
    ? (frame >= at + 6 ? 1 : 0)
    : interpolate(frame, [at + 7, at + 22], [0, 1], { ...clamped, easing: EASE_OUT_EXPO });
  const title = enter(frame, stage, at + 12, 28);
  const detail = enter(frame, stage, at + 18, 28);
  const code = pop(frame, stage, at + 24, 24);

  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade(frame, at, 10) }}>
      <Box x={540 - 130} y={740} w={260} h={260}>
        <svg width={260} height={260} viewBox="0 0 260 260" style={{ display: "block" }}>
          <circle
            cx={130}
            cy={130}
            r={118}
            fill={green(0.1)}
            stroke={green(0.28)}
            strokeWidth={3}
            style={{
              transformOrigin: "130px 130px",
              transform: `scale(${motion === 0 ? 1 : 0.7 + ring * 0.3})`,
              opacity: ring,
            }}
          />
          <circle
            cx={130}
            cy={130}
            r={92}
            fill={BRAND.primary}
            style={{
              transformOrigin: "130px 130px",
              transform: `scale(${motion === 0 ? 1 : 0.5 + ring * 0.5})`,
              opacity: ring,
            }}
          />
          <path
            d="M92 132 L120 160 L172 104"
            fill="none"
            stroke={BRAND.primaryForeground}
            strokeWidth={13}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - draw}
          />
        </svg>
      </Box>

      <Box
        x={CARD_X}
        y={1026}
        w={CARD_W}
        style={{
          textAlign: "center",
          opacity: fade(frame, at + 12, 12),
          transform: `translateY(${(1 - title) * 26 * motion}px)`,
        }}
      >
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 74,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: BRAND.foreground,
          }}
        >
          Pitch booked
        </span>
      </Box>

      <Box
        x={CARD_X}
        y={1128}
        w={CARD_W}
        style={{
          textAlign: "center",
          opacity: fade(frame, at + 18, 12),
          transform: `translateY(${(1 - detail) * 22 * motion}px)`,
        }}
      >
        <span style={{ fontFamily: SANS_FONT, fontSize: 30, color: soft(1), lineHeight: 1.45 }}>
          {VENUES[PICKED_VENUE].name} · Tue 19:00
          <br />
          Confirmation sent to your phone
        </span>
      </Box>

      <Box
        x={540 - 190}
        y={1252}
        w={380}
        h={78}
        style={{
          opacity: code,
          transform: `scale(${motion === 0 ? 1 : 0.88 + code * 0.12})`,
          borderRadius: 26,
          backgroundColor: BRAND.muted,
          border: `1.5px solid ${line(1)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <MicroLabel size={20} color={dim(1)}>
          Ref
        </MicroLabel>
        <span
          style={{
            fontFamily: MONO_FONT,
            fontSize: 30,
            fontWeight: 500,
            color: BRAND.primary,
            letterSpacing: "0.06em",
          }}
        >
          SB-4821
        </span>
      </Box>
    </div>
  );
};

const PanelPay: FC<{ stage: Stage }> = ({ stage }) => {
  const frame = useCurrentFrame();
  const { motion } = stage;

  /** The summary is replaced by the booked state, not stacked on top of it. */
  const done = fade(frame, PAY_SETTLED, 10);
  const summaryAlive = 1 - done;

  const titleIn = enter(frame, stage, 2, 22);
  const totalIn = enter(frame, stage, 31, 22);
  const buttonIn = enter(frame, stage, 30, 24);
  const dip = press(frame, stage, PAY_PRESS);
  /** Authorising: label swaps for a spinner between contact and settlement. */
  const busy =
    fade(frame, PAY_PRESS + 2, 6) *
    (1 - interpolate(frame, [PAY_SETTLED - 6, PAY_SETTLED], [0, 1], clamped));
  const spin = motion === 0 ? 0 : ((frame - PAY_PRESS) * 11) % 360;

  return (
    <PanelFrame frame={frame} stage={stage} duration={PANEL_PAY.duration} exits={false}>
      <div style={{ position: "absolute", inset: 0, opacity: summaryAlive }}>
        {/* Venue + district. */}
        <Box
          x={IN_X}
          y={CONTENT_Y + 10}
          w={IN_W}
          style={{
            opacity: fade(frame, 2, 12),
            transform: `translateY(${(1 - titleIn) * 24 * motion}px)`,
          }}
        >
          <div
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: BRAND.foreground,
            }}
          >
            {VENUES[PICKED_VENUE].name}
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: SANS_FONT,
              fontSize: 26,
              color: BRAND.mutedForeground,
            }}
          >
            {VENUES[PICKED_VENUE].district}, Yerevan
          </div>
        </Box>

        {/* Booking facts. */}
        {META_ROWS.map((row, i) => {
          const rise = enter(frame, stage, 8 + i * 4, 22);
          const Icon = row.icon;
          return (
            <Box
              key={row.label}
              x={IN_X}
              y={748 + i * 80}
              w={IN_W}
              h={72}
              style={{
                opacity: fade(frame, 8 + i * 4, 10),
                transform: `translateX(${(1 - rise) * 40 * motion}px)`,
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 20,
                  backgroundColor: BRAND.muted,
                  border: `1px solid ${line(1)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={30} color={BRAND.primary} weight={1.9} />
              </div>
              <span style={{ fontFamily: SANS_FONT, fontSize: 29, color: chalk(0.93) }}>
                {row.label}
              </span>
            </Box>
          );
        })}

        {/* Divider. */}
        <Box
          x={IN_X}
          y={996}
          w={IN_W}
          h={1.5}
          style={{
            backgroundColor: line(1),
            opacity: fade(frame, 20, 10),
            transform: `scaleX(${motion === 0 ? 1 : fade(frame, 20, 16)})`,
            transformOrigin: "0% 50%",
          }}
        />

        {/* Breakdown — the 5% platform fee from src/lib/pricing.ts. */}
        {[
          { label: "Pitch rental · 1 hour", value: "18,000", delay: 22 },
          { label: "Service fee · 5%", value: "900", delay: 26 },
        ].map((row) => {
          const rise = enter(frame, stage, row.delay, 22);
          return (
            <Box
              key={row.label}
              x={IN_X}
              y={row.delay === 22 ? 1018 : 1070}
              w={IN_W}
              h={44}
              style={{
                opacity: fade(frame, row.delay, 10),
                transform: `translateY(${(1 - rise) * 16 * motion}px)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontFamily: SANS_FONT, fontSize: 27, color: BRAND.mutedForeground }}>
                {row.label}
              </span>
              <Money amount={row.value} size={27} color={soft(1)} />
            </Box>
          );
        })}

        {/* Total. */}
        <Box
          x={IN_X}
          y={1130}
          w={IN_W}
          h={60}
          style={{
            opacity: fade(frame, 31, 10),
            transform: `translateY(${(1 - totalIn) * 20 * motion}px)`,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: BRAND.foreground,
            }}
          >
            Total
          </span>
          <Money amount="18,900" size={46} color={BRAND.primary} weight={600} />
        </Box>

        {/* Pay button. */}
        <Box
          x={IN_X}
          y={1200}
          w={IN_W}
          h={120}
          style={{
            opacity: fade(frame, 30, 12),
            transform: `translateY(${(1 - buttonIn) * 34 * motion}px) scale(${1 - dip * 0.035 * motion})`,
            transformOrigin: "50% 50%",
            borderRadius: 34,
            backgroundColor: BRAND.primary,
            // .glow-primary
            boxShadow: `0 0 ${44 + dip * 40}px -8px ${green(0.45 + dip * 0.35)}, 0 14px 30px -12px hsl(160, 30%, 2%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          {/* Idle label. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              opacity: 1 - busy,
            }}
          >
            <LockIcon size={34} color={BRAND.primaryForeground} weight={2.2} />
            <span
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: 40,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: BRAND.primaryForeground,
              }}
            >
              Confirm &amp; pay
            </span>
          </div>

          {/* Authorising. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
              opacity: busy,
            }}
          >
            <svg
              width={40}
              height={40}
              viewBox="0 0 40 40"
              style={{ display: "block", transform: `rotate(${spin}deg)` }}
            >
              <circle cx={20} cy={20} r={15} fill="none" stroke={ink(0.25)} strokeWidth={4.5} />
              <path
                d="M20 5a15 15 0 0 1 15 15"
                fill="none"
                stroke={BRAND.primaryForeground}
                strokeWidth={4.5}
                strokeLinecap="round"
              />
            </svg>
            <span
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: 38,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: BRAND.primaryForeground,
              }}
            >
              Authorising…
            </span>
          </div>
        </Box>

        {/* Trust line — the app's real processors. */}
        <Box
          x={IN_X}
          y={1348}
          w={IN_W}
          style={{
            opacity: fade(frame, 36, 12) * (1 - busy * 0.5),
            transform: `translateY(${(1 - enter(frame, stage, 36, 22)) * 14 * motion}px)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <LockIcon size={22} color={dim(1)} weight={2} />
          <MicroLabel size={19} color={dim(1)}>
            Ameria vPOS · Idram
          </MicroLabel>
        </Box>
      </div>

      <BookedState frame={frame} stage={stage} />

      <TapCursor
        frame={frame}
        stage={stage}
        x={730}
        y={1260}
        reach={PAY_REACH}
        contact={PAY_PRESS}
        fromX={40}
        fromY={170}
      />
    </PanelFrame>
  );
};

/* ════════════════════════════ confetti ══════════════════════════════════ */

const CONFETTI = 26;

/**
 * A burst from the tick, at composition level so it can spread past the app
 * surface. Not emitted at all when calm is requested.
 */
const Confetti: FC<{ frame: number; stage: Stage }> = ({ frame, stage }) => {
  const { fps, motion } = stage;
  if (motion === 0) return null;

  const cx = 540;
  /** The centre of the tick, so the burst reads as coming out of it. */
  const cy = 870;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: CONFETTI }).map((_, i) => {
        const delay = SUCCESS_AT + 2 + (i % 5) * 2;
        const p = spring({
          frame,
          fps,
          delay,
          config: { damping: 13, mass: 1.1, stiffness: 62 },
          durationInFrames: 40,
        });
        const angle = (i / CONFETTI) * TAU + (i % 3) * 0.26;
        /* Fast enough to clear the app surface before "Pitch booked" lands
           under it — confetti that lingers over the payoff line is confetti
           that costs you the payoff line. */
        const speed = 430 + ((i * 67) % 330);
        const x = cx + Math.cos(angle) * speed * p;
        const y = cy + Math.sin(angle) * speed * p + 240 * p * p;
        const o = interpolate(
          frame,
          [delay, delay + 6, SUCCESS_AT + 24, SUCCESS_AT + 38],
          [0, 1, 1, 0],
          clamped,
        );
        const size = 11 + (i % 4) * 4;
        const palette = [BRAND.primary, BRAND.cyan, BRAND.amber, BRAND.foreground, BRAND.violet];
        const colour = palette[i % palette.length];
        const round = i % 3 === 0;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: round ? size : size * 1.9,
              borderRadius: round ? size : 3,
              backgroundColor: colour,
              opacity: o * 0.92,
              transform: `rotate(${angle * 57.3 + p * 320}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ═════════════════════════ rail & footer ════════════════════════════════ */

const RAIL_STEPS: { label: string; from: number; to: number }[] = [
  { label: "Find", from: PANEL_FIND.from, to: 128 },
  { label: "Time", from: PANEL_TIME.from, to: 232 },
  { label: "Pay", from: PANEL_PAY.from, to: SUCCESS_AT - 6 },
];

/**
 * Three segments that fill in step time. A progress bar is a timer, and a
 * timer that springs would be lying about where it is — so this is one of the
 * few places `interpolate` is the right tool.
 */
const ProgressRail: FC<{ frame: number; stage: Stage }> = ({ frame, stage }) => {
  const { motion } = stage;
  const segW = (CARD_W - 32) / 3;
  const appear = enter(frame, stage, 22, 30);

  return (
    <Box
      x={CARD_X}
      y={1540}
      w={CARD_W}
      style={{
        opacity: fade(frame, 22, 14),
        transform: `translateY(${(1 - appear) * 22 * motion}px)`,
      }}
    >
      {RAIL_STEPS.map((step, i) => {
        const fill = interpolate(frame, [step.from, step.to], [0, 1], {
          ...clamped,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        });
        const active = frame >= step.from ? 1 : 0;
        /** A small kick as each segment takes over. */
        const kick = pop(frame, stage, step.from - PANEL_FIND.from + 22, 20);
        return (
          <div key={step.label} style={{ position: "absolute", left: i * (segW + 16), top: 0 }}>
            <div
              style={{
                width: segW,
                height: 12,
                borderRadius: 6,
                backgroundColor: BRAND.muted,
                border: `1px solid ${line(1)}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${fill * 100}%`,
                  height: "100%",
                  borderRadius: 6,
                  backgroundColor: BRAND.primary,
                  boxShadow: fill > 0 ? `0 0 16px ${green(0.65)}` : "none",
                }}
              />
            </div>
            <div
              style={{
                marginTop: 16,
                textAlign: "center",
                width: segW,
                transform: `translateY(${(1 - kick) * 10 * motion}px)`,
              }}
            >
              <MicroLabel size={21} color={active ? BRAND.primary : dim(0.55)}>
                {`0${i + 1} ${step.label}`}
              </MicroLabel>
            </div>
          </div>
        );
      })}
    </Box>
  );
};

const Footer: FC<{ frame: number; stage: Stage }> = ({ frame, stage }) => {
  const { motion } = stage;
  const rise = enter(frame, stage, 28, 32);
  return (
    <Box
      x={CARD_X}
      y={SAFE_BOTTOM - 56}
      w={CARD_W}
      h={56}
      style={{
        opacity: fade(frame, 28, 16),
        transform: `translateY(${(1 - rise) * 20 * motion}px)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
      }}
    >
      <span
        style={{
          fontFamily: DISPLAY_FONT,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "0.2em",
          color: BRAND.foreground,
        }}
      >
        SPORTSBNB
      </span>
      <span style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dim(0.7) }} />
      <MicroLabel size={24} color={BRAND.primary}>
        sportsbnb.am
      </MicroLabel>
    </Box>
  );
};

/* ════════════════════════════ composition ═══════════════════════════════ */

export type BookingFlowProps = Record<string, never>;

export const BookingFlow: FC<BookingFlowProps> = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const reduced = usePrefersReducedMotion();

  /**
   * One switch. Every translate / scale / rotate amount in the file is
   * multiplied by this, and `enter` / `pop` / `press` read it too, so a value
   * of 0 removes movement everywhere at once while the cross-fades survive.
   */
  const stage: Stage = { fps, motion: reduced ? 0 : 1 };

  /** Fit the 1080×1920 design canvas into whatever the composition really is. */
  const unit = Math.min(width / W, height / H);
  const offsetX = (width - W * unit) / 2;
  const offsetY = (height - H * unit) / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <div
        style={{
          position: "absolute",
          left: offsetX,
          top: offsetY,
          width: W,
          height: H,
          transform: `scale(${unit})`,
          transformOrigin: "top left",
          overflow: "hidden",
        }}
      >
        <Backdrop frame={frame} motion={stage.motion} />

        {CAPTIONS.map((caption) => (
          <Sequence
            key={caption.step}
            name={caption.step}
            from={caption.from}
            durationInFrames={caption.duration}
            layout="none"
          >
            <Caption
              stage={stage}
              duration={caption.duration}
              step={caption.step}
              head={caption.head}
            />
          </Sequence>
        ))}

        <AppSurface frame={frame} stage={stage}>
          <Sequence
            name="01 Find a pitch"
            from={PANEL_FIND.from}
            durationInFrames={PANEL_FIND.duration}
            layout="none"
          >
            <PanelFind stage={stage} />
          </Sequence>

          <Sequence
            name="02 Pick a time"
            from={PANEL_TIME.from}
            durationInFrames={PANEL_TIME.duration}
            layout="none"
          >
            <PanelTime stage={stage} />
          </Sequence>

          <Sequence
            name="03 Confirm & pay"
            from={PANEL_PAY.from}
            durationInFrames={PANEL_PAY.duration}
            layout="none"
          >
            <PanelPay stage={stage} />
          </Sequence>
        </AppSurface>

        <Sequence name="Confetti" from={SUCCESS_AT} layout="none">
          <Confetti frame={frame} stage={stage} />
        </Sequence>

        <ProgressRail frame={frame} stage={stage} />
        <Footer frame={frame} stage={stage} />
      </div>
    </AbsoluteFill>
  );
};
