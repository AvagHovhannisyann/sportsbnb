/**
 * SportsBnB — "FeatureReel"
 * 1920x1080 · 30fps · 720 frames (24s) conference showcase.
 *
 * Story: SEARCH a venue -> pick a SLOT -> BOOK -> CONFIRMED.
 * Told entirely with type, shape and colour. No mock UI screenshots,
 * no imagery, no network requests of any kind.
 *
 * Palette and type stacks are lifted verbatim from the real design system
 * (src/index.css, the `.dark` "Court at night" block) rather than invented.
 * The webfont families are still *named* in the stacks — naming a family is
 * not a fetch — but nothing here declares an @font-face or a URL, so a
 * headless render simply falls through to the system stack below them.
 *
 * Motion contract:
 *   - spring() drives every entrance, selection and settle.
 *   - interpolate() drives only things that are literally linear in the
 *     fiction: typing, a payment progress ring, wipes, the timeline rail.
 *   - Ambient drift uses whole sine periods that divide 720 exactly, so the
 *     background is continuous if the reel is looped on a conference screen.
 *   - `prefers-reduced-motion: reduce` collapses every transform to zero and
 *     leaves short opacity fades only.
 */

import type { CSSProperties, FC, ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* ------------------------------------------------------------------ *
 * Composition constants
 * ------------------------------------------------------------------ */

export const FEATURE_REEL_FPS = 30;
export const FEATURE_REEL_DURATION = 720; // 24s
export const FEATURE_REEL_WIDTH = 1920;
export const FEATURE_REEL_HEIGHT = 1080;

/** Frames of crossfade between adjacent scenes. */
const OVERLAP = 14;

type Chapter = {
  readonly id: string;
  readonly label: string;
  readonly from: number;
  readonly len: number;
};

const CHAPTERS: readonly Chapter[] = [
  { id: "intro", label: "SPORTSBNB", from: 0, len: 108 },
  { id: "search", label: "SEARCH", from: 108, len: 168 },
  { id: "slot", label: "SLOT", from: 276, len: 168 },
  { id: "book", label: "BOOK", from: 444, len: 138 },
  { id: "confirm", label: "CONFIRMED", from: 582, len: 138 },
];

/* ------------------------------------------------------------------ *
 * Brand tokens — from src/index.css `.dark` ("Court at night")
 * Stored as hex so interpolateColors() can read them directly.
 * ------------------------------------------------------------------ */

const C = {
  bg: "#0A100E", // --background          160 22% 5%
  surface1: "#151E1B", // --surface-1     160 18% 10%
  surface2: "#1E2925", // --surface-2     160 15% 14%
  surface3: "#28342F", // --surface-3     158 13% 18%
  card: "#1C2623", // --card              160 15% 13%
  fg: "#F4F7F3", // --foreground          100 20% 96%
  fgSoft: "#B2BDB4", // --foreground-soft 130 8% 72%
  muted: "#9CAB9E", // --muted-foreground 130 8% 64%
  primary: "#0CE47B", // --primary        151 90% 47%
  primaryFg: "#0A100E", // --primary-foreground
  primarySoft: "#112C21", // --primary-soft
  border: "#313F3A", // --border          157 12% 22%
  borderStrong: "#3C4943", // --border-strong
  success: "#16CA73", // --success        151 80% 44%
  cyan: "#1AC3E6", // --chart-2           190 80% 50%
  amber: "#F9B81F", // --chart-3          42 95% 55%
  violet: "#BF91F3", // --chart-4         268 80% 76%
} as const;

/** rgba() from one of the hex tokens above. */
const alpha = (hex: string, a: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/**
 * Type stacks copied from --font-display / --font-sans / --font-mono.
 * The Armenian face and the webfont names are declared but never fetched;
 * headless renders resolve to the system entries.
 */
const FONT_DISPLAY =
  "'Space Grotesk', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const FONT_SANS =
  "'DM Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const FONT_MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'DejaVu Sans Mono', monospace";

const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

/* ------------------------------------------------------------------ *
 * Reduced motion
 * ------------------------------------------------------------------ */

const ReducedMotionContext = createContext<boolean>(false);
const useReducedMotion = (): boolean => useContext(ReducedMotionContext);

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
 * Motion primitives
 * ------------------------------------------------------------------ */

type SpringTuning = {
  damping?: number;
  stiffness?: number;
  mass?: number;
  durationInFrames?: number;
};

/**
 * The one entrance curve. Returns 0..~1 (may overshoot slightly when
 * underdamped, which is the point). Under reduced motion it degrades to a
 * short opacity-only ramp so callers can keep the same call site.
 */
const useEntrance = (delay: number, tuning?: SpringTuning): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = useReducedMotion();

  if (reduced) {
    return interpolate(frame, [delay, delay + 8], [0, 1], CLAMP);
  }

  return spring({
    frame: frame - delay,
    fps,
    config: {
      damping: tuning?.damping ?? 26,
      stiffness: tuning?.stiffness ?? 180,
      mass: tuning?.mass ?? 0.8,
    },
    durationInFrames: tuning?.durationInFrames,
  });
};

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

type RevealProps = {
  delay?: number;
  y?: number;
  x?: number;
  scaleFrom?: number;
  tuning?: SpringTuning;
  style?: CSSProperties;
  children: ReactNode;
};

/** Staggerable spring entrance: slide + fade (+ optional scale). */
const Reveal: FC<RevealProps> = ({
  delay = 0,
  y = 26,
  x = 0,
  scaleFrom = 1,
  tuning,
  style,
  children,
}) => {
  const p = useEntrance(delay, tuning);
  const reduced = useReducedMotion();
  const rest = reduced ? 0 : 1 - p;
  const scale = reduced ? 1 : scaleFrom + (1 - scaleFrom) * p;

  return (
    <div
      style={{
        opacity: clamp01(p),
        transform: `translate3d(${x * rest}px, ${y * rest}px, 0) scale(${scale})`,
        willChange: "transform, opacity",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

type SplitTextProps = {
  text: string;
  delay?: number;
  stagger?: number;
  y?: number;
  tuning?: SpringTuning;
  style?: CSSProperties;
  colorFor?: (index: number) => string;
};

/** Per-character spring stagger — used for the two big wordmarks only. */
const SplitText: FC<SplitTextProps> = ({
  text,
  delay = 0,
  stagger = 2.5,
  y = 46,
  tuning,
  style,
  colorFor,
}) => {
  const chars: string[] = text.split("");
  return (
    <span style={{ display: "inline-block", whiteSpace: "pre", ...style }}>
      {chars.map((ch, i) => (
        <SplitChar
          key={`${ch}-${i}`}
          char={ch}
          delay={delay + i * stagger}
          y={y}
          tuning={tuning}
          color={colorFor ? colorFor(i) : undefined}
        />
      ))}
    </span>
  );
};

const SplitChar: FC<{
  char: string;
  delay: number;
  y: number;
  tuning?: SpringTuning;
  color?: string;
}> = ({ char, delay, y, tuning, color }) => {
  const p = useEntrance(delay, tuning);
  const reduced = useReducedMotion();
  const rest = reduced ? 0 : 1 - p;

  return (
    <span
      style={{
        display: "inline-block",
        opacity: clamp01(p),
        transform: `translate3d(0, ${y * rest}px, 0)`,
        color,
        willChange: "transform, opacity",
      }}
    >
      {char === " " ? " " : char}
    </span>
  );
};

/** A rule that wipes in from its left edge. */
const WipeRule: FC<{
  delay?: number;
  width: number | string;
  height?: number;
  color?: string;
  fade?: boolean;
  style?: CSSProperties;
}> = ({ delay = 0, width, height = 2, color = C.border, fade = false, style }) => {
  const p = useEntrance(delay, { damping: 200, durationInFrames: 22 });
  return (
    <div
      style={{
        width,
        height,
        transformOrigin: "left center",
        transform: `scaleX(${clamp01(p)})`,
        background: fade ? `linear-gradient(90deg, ${color}, ${alpha(color, 0)})` : color,
        ...style,
      }}
    />
  );
};

/* ------------------------------------------------------------------ *
 * Small formatting helpers (tsconfig lib is es2015 — no padStart etc.)
 * ------------------------------------------------------------------ */

const groupThousands = (value: number): string => {
  const s = String(Math.round(value));
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) {
      out += " ";
    }
    out += s.charAt(i);
  }
  return out;
};

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/* ------------------------------------------------------------------ *
 * Shared chrome
 * ------------------------------------------------------------------ */

const Eyebrow: FC<{ index: string; label: string; delay?: number }> = ({
  index,
  label,
  delay = 0,
}) => {
  const p = useEntrance(delay, { damping: 14, stiffness: 190, mass: 0.7 });
  const reduced = useReducedMotion();

  return (
    <Reveal delay={delay} y={14} style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: C.primary,
          boxShadow: `0 0 22px ${alpha(C.primary, 0.65)}`,
          transform: reduced ? undefined : `rotate(${45 * clamp01(p)}deg)`,
        }}
      />
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: "0.24em",
          color: C.primary,
        }}
      >
        {index}
      </span>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        {label}
      </span>
    </Reveal>
  );
};

const SceneTitle: FC<{ text: string; delay?: number; size?: number }> = ({
  text,
  delay = 0,
  size = 96,
}) => (
  <Reveal delay={delay} y={34} tuning={{ damping: 24, stiffness: 165, mass: 0.9 }}>
    <h2
      style={{
        margin: 0,
        fontFamily: FONT_DISPLAY,
        fontSize: size,
        lineHeight: 1.02,
        fontWeight: 700,
        letterSpacing: "-0.035em",
        color: C.fg,
      }}
    >
      {text}
    </h2>
  </Reveal>
);

const MonoLabel: FC<{ children: ReactNode; color?: string; size?: number }> = ({
  children,
  color = C.muted,
  size = 13,
}) => (
  <span
    style={{
      fontFamily: FONT_MONO,
      fontSize: size,
      fontWeight: 500,
      letterSpacing: "0.24em",
      textTransform: "uppercase",
      color,
    }}
  >
    {children}
  </span>
);

/**
 * Chapter heads hold back a few frames so they land into the tail of the
 * previous scene's exit rather than on top of it.
 */
const CHAPTER_IN = 7;

/** Per-scene shell: consistent padding + the shared exit move. */
const SceneShell: FC<{ len: number; exit?: boolean; children: ReactNode }> = ({
  len,
  exit = true,
  children,
}) => {
  const frame = useCurrentFrame();
  const reduced = useReducedMotion();
  // Leaves early and fast so the outgoing chapter head is already faint by the
  // time the incoming one lands (see CHAPTER_IN below) — a dissolve, not a
  // moment where two eyebrows are legible at once.
  const out = exit
    ? interpolate(frame, [len - 2, len + OVERLAP - 4], [0, 1], {
        ...CLAMP,
        easing: Easing.inOut(Easing.quad),
      })
    : 0;

  return (
    <AbsoluteFill
      style={{
        padding: "104px 132px 148px",
        opacity: 1 - out,
        transform: reduced
          ? undefined
          : `translate3d(0, ${-52 * out}px, 0) scale(${1 - 0.03 * out})`,
        willChange: "transform, opacity",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ *
 * Ambient stage — court glow, grid, slow centre circle
 * ------------------------------------------------------------------ */

const Stage: FC<Record<string, never>> = () => {
  const frame = useCurrentFrame();
  const reduced = useReducedMotion();

  // 240-frame period divides 720 exactly (3 whole cycles) so the ambient
  // layer is continuous across a loop point: sin(2*pi*720/240) === sin(0).
  const breathe = reduced ? 0 : Math.sin((frame / 240) * Math.PI * 2);
  // One full turn over the whole reel — 0deg and 360deg are the same pose.
  const spin = reduced ? 0 : (frame / FEATURE_REEL_DURATION) * 360;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* Court grid, masked away from the edges */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(to right, ${alpha(C.border, 0.55)} 1px, transparent 1px), linear-gradient(to bottom, ${alpha(C.border, 0.55)} 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          opacity: 0.5,
          WebkitMaskImage:
            "radial-gradient(ellipse 68% 62% at 50% 44%, rgba(0,0,0,1), rgba(0,0,0,0) 78%)",
          maskImage:
            "radial-gradient(ellipse 68% 62% at 50% 44%, rgba(0,0,0,1), rgba(0,0,0,0) 78%)",
        }}
      />

      {/* Slow centre-circle motif, far left, very low contrast */}
      <div
        style={{
          position: "absolute",
          left: -420,
          top: 120,
          width: 900,
          height: 900,
          borderRadius: "50%",
          border: `1px solid ${alpha(C.primary, 0.1)}`,
          transform: `rotate(${spin}deg)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 130,
            borderRadius: "50%",
            border: `1px dashed ${alpha(C.primary, 0.08)}`,
          }}
        />
      </div>

      {/* Court-green key light */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 76% 52% at 50% -12%, ${alpha(C.primary, 0.16)}, transparent 62%)`,
          opacity: 0.85 + breathe * 0.15,
        }}
      />
      {/* Cool fill from the opposite corner */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 52% 46% at 88% 108%, ${alpha(C.cyan, 0.11)}, transparent 64%)`,
          opacity: 0.85 - breathe * 0.15,
        }}
      />
      {/* Vignette keeps type off the frame edge */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 82% 78% at 50% 50%, transparent 40%, ${alpha(C.bg, 0.82)} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ *
 * Timeline rail (persistent, global frame)
 * ------------------------------------------------------------------ */

const TimelineRail: FC<Record<string, never>> = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const activeIndex = (() => {
    let idx = 0;
    for (let i = 0; i < CHAPTERS.length; i++) {
      if (frame >= CHAPTERS[i].from) {
        idx = i;
      }
    }
    return idx;
  })();

  const seconds = Math.min(durationInFrames - 1, frame) / fps;
  const timecode = `${pad2(Math.floor(seconds / 60))}:${pad2(Math.floor(seconds % 60))}`;
  const overall = interpolate(frame, [0, durationInFrames - 1], [0, 1], CLAMP);
  const introP = useEntrance(10, { damping: 200, durationInFrames: 24 });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: clamp01(introP) }}>
      {/* chapter segments */}
      <div
        style={{
          position: "absolute",
          left: 132,
          right: 132,
          bottom: 78,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {CHAPTERS.map((ch, i) => {
          const local = interpolate(frame, [ch.from, ch.from + ch.len], [0, 1], CLAMP);
          const isActive = i === activeIndex;
          return (
            <div
              key={ch.id}
              style={{
                flexGrow: ch.len,
                flexBasis: 0,
                height: 3,
                borderRadius: 2,
                background: alpha(C.borderStrong, 0.85),
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${local * 100}%`,
                  height: "100%",
                  background: isActive ? C.primary : alpha(C.primary, 0.42),
                  boxShadow: isActive ? `0 0 14px ${alpha(C.primary, 0.55)}` : undefined,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* labels */}
      <div
        style={{
          position: "absolute",
          left: 132,
          right: 132,
          bottom: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <MonoLabel color={C.muted}>SPORTSBNB.AM</MonoLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <MonoLabel color={C.primary}>{CHAPTERS[activeIndex].label}</MonoLabel>
          <span style={{ color: alpha(C.muted, 0.4), fontFamily: FONT_MONO, fontSize: 13 }}>
            /
          </span>
          <MonoLabel color={C.muted}>{timecode}</MonoLabel>
        </div>
      </div>

      {/* hairline overall progress — literally linear, so no spring here */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          background: alpha(C.border, 0.6),
        }}
      >
        <div
          style={{
            width: `${overall * 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${alpha(C.primary, 0.35)}, ${C.primary})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ *
 * Chapter sweep — a light bar crossing frame at each scene boundary
 * ------------------------------------------------------------------ */

const ChapterSweep: FC<Record<string, never>> = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const reduced = useReducedMotion();

  if (reduced) {
    return null;
  }

  const boundaries = CHAPTERS.slice(1).map((ch) => ch.from);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {boundaries.map((b) => {
        const start = b - 8;
        const end = b + 14;
        if (frame < start || frame > end) {
          return null;
        }
        const p = interpolate(frame, [start, end], [0, 1], {
          ...CLAMP,
          easing: Easing.inOut(Easing.cubic),
        });
        const fade = interpolate(p, [0, 0.14, 0.86, 1], [0, 1, 1, 0], CLAMP);
        return (
          <div
            key={b}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: 240,
              transform: `translate3d(${-240 + p * (width + 240)}px, 0, 0)`,
              background: `linear-gradient(90deg, ${alpha(C.primary, 0)}, ${alpha(C.primary, 0.1)} 74%, ${alpha(C.primary, 0.55)} 97%, ${alpha(C.primary, 0)})`,
              opacity: fade,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ *
 * Scene 00 — Intro lockup
 * ------------------------------------------------------------------ */

const SceneIntro: FC<{ len: number }> = ({ len }) => (
  <SceneShell len={len}>
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 30,
      }}
    >
      <Reveal delay={2} y={12} style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 46, height: 1, background: alpha(C.primary, 0.6) }} />
        <MonoLabel color={C.primary} size={16}>
          Sports venue marketplace
        </MonoLabel>
        <div style={{ width: 46, height: 1, background: alpha(C.primary, 0.6) }} />
      </Reveal>

      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 196,
          fontWeight: 700,
          letterSpacing: "-0.05em",
          lineHeight: 1,
          color: C.fg,
        }}
      >
        <SplitText
          text="SportsBnB"
          delay={8}
          stagger={2.6}
          y={72}
          tuning={{ damping: 17, stiffness: 165, mass: 0.85 }}
          colorFor={(i) => (i >= 6 ? C.primary : C.fg)}
        />
      </div>

      <WipeRule
        delay={38}
        width={620}
        height={2}
        color={C.primary}
        style={{ opacity: 0.7, marginTop: -6 }}
      />

      <Reveal delay={44} y={22}>
        <p
          style={{
            margin: 0,
            fontFamily: FONT_SANS,
            fontSize: 40,
            fontWeight: 400,
            color: C.fgSoft,
            letterSpacing: "-0.015em",
            textAlign: "center",
          }}
        >
          Book a pitch, a court or a hall. In under a minute.
        </p>
      </Reveal>

      <Reveal delay={58} y={18} style={{ marginTop: 14 }}>
        <MonoLabel color={C.muted} size={15}>
          Yerevan · Gyumri · Vanadzor · Abovyan
        </MonoLabel>
      </Reveal>
    </div>
  </SceneShell>
);

/* ------------------------------------------------------------------ *
 * Scene 01 — Search
 * ------------------------------------------------------------------ */

const QUERY = "football pitch · yerevan · tonight";

const RESULTS: readonly { name: string; district: string; price: number }[] = [
  { name: "Arena 5", district: "Ajapnyak", price: 9000 },
  { name: "Football City", district: "Davtashen", price: 7500 },
  { name: "Mika Sport", district: "Nork Marash", price: 12000 },
  { name: "Kentron Courts", district: "Kentron", price: 8200 },
];

const FILTERS: readonly { text: string; active: boolean }[] = [
  { text: "5-a-side", active: true },
  { text: "Indoor", active: false },
  { text: "18:00 - 22:00", active: true },
  { text: "Under 20 000 AMD", active: false },
];

const SearchQuery: FC<{ delay: number; frames: number }> = ({ delay, frames }) => {
  const frame = useCurrentFrame();
  const reduced = useReducedMotion();

  const shown = reduced
    ? QUERY.length
    : Math.floor(
        interpolate(frame, [delay, delay + frames], [0, QUERY.length], CLAMP),
      );
  const typed = QUERY.slice(0, shown);
  const caretOn = reduced ? true : Math.floor(frame / 9) % 2 === 0;

  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 38,
          fontWeight: 500,
          color: C.fg,
          letterSpacing: "-0.01em",
          whiteSpace: "pre",
        }}
      >
        {typed}
      </span>
      <span
        style={{
          display: "inline-block",
          width: 3,
          height: 40,
          background: C.primary,
          opacity: caretOn ? 1 : 0,
          transform: "translateY(4px)",
          boxShadow: `0 0 16px ${alpha(C.primary, 0.7)}`,
        }}
      />
    </div>
  );
};

const MatchCounter: FC<{ delay: number; target: number }> = ({ delay, target }) => {
  const p = useEntrance(delay, { damping: 200, durationInFrames: 52 });
  const value = Math.round(interpolate(clamp01(p), [0, 1], [0, target]));

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 132,
          fontWeight: 500,
          lineHeight: 0.9,
          letterSpacing: "-0.05em",
          color: C.primary,
          fontVariantNumeric: "tabular-nums",
          textShadow: `0 0 60px ${alpha(C.primary, 0.35)}`,
        }}
      >
        {value}
      </span>
      <div style={{ paddingBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <MonoLabel color={C.fgSoft}>venues</MonoLabel>
        <MonoLabel color={C.muted}>matched</MonoLabel>
      </div>
    </div>
  );
};

const ResultRow: FC<{
  name: string;
  district: string;
  price: number;
  delay: number;
  highlightDelay?: number;
}> = ({ name, district, price, delay, highlightDelay }) => {
  const p = useEntrance(delay, { damping: 24, stiffness: 170, mass: 0.85 });
  const hl = useEntrance(highlightDelay ?? 1e6, { damping: 18, stiffness: 160, mass: 0.8 });
  const on = highlightDelay === undefined ? 0 : clamp01(hl);
  const reduced = useReducedMotion();
  const rest = reduced ? 0 : 1 - p;

  return (
    <div
      style={{
        opacity: clamp01(p),
        transform: `translate3d(${34 * rest}px, 0, 0)`,
        borderTop: `1px solid ${alpha(C.border, 0.9)}`,
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "20px 0 18px",
        willChange: "transform, opacity",
      }}
    >
      <div
        style={{
          width: 4,
          height: 34,
          borderRadius: 2,
          background: C.primary,
          transformOrigin: "center",
          transform: `scaleY(${on})`,
          boxShadow: on > 0 ? `0 0 18px ${alpha(C.primary, 0.6)}` : undefined,
        }}
      />
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: interpolateColors(on, [0, 1], [C.fg, C.primary]),
          flexGrow: 1,
        }}
      >
        {name}
      </span>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 15,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: C.muted,
          width: 230,
        }}
      >
        {district}
      </span>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 28,
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
          color: interpolateColors(on, [0, 1], [C.fgSoft, C.primary]),
          width: 130,
          textAlign: "right",
        }}
      >
        {groupThousands(price)}
      </span>
    </div>
  );
};

const FilterChip: FC<{ text: string; active: boolean; delay: number }> = ({
  text,
  active,
  delay,
}) => (
  <Reveal
    delay={delay}
    y={18}
    scaleFrom={0.86}
    tuning={{ damping: 15, stiffness: 200, mass: 0.7 }}
    style={{ display: "inline-block" }}
  >
    <div
      style={{
        padding: "13px 24px",
        borderRadius: 999,
        border: `1px solid ${active ? alpha(C.primary, 0.55) : C.border}`,
        background: active ? C.primarySoft : alpha(C.surface2, 0.7),
        color: active ? C.primary : C.fgSoft,
        fontFamily: FONT_MONO,
        fontSize: 17,
        fontWeight: 500,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  </Reveal>
);

const SceneSearch: FC<{ len: number }> = ({ len }) => (
  <SceneShell len={len}>
    <div style={{ display: "flex", width: "100%", height: "100%", gap: 96 }}>
      {/* Left — the query */}
      <div
        style={{
          width: 800,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 34,
        }}
      >
        <Eyebrow index="01" label="Search" delay={CHAPTER_IN} />
        <SceneTitle text="Find the court." delay={CHAPTER_IN + 6} />

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <Reveal delay={20} y={12}>
            <MonoLabel color={C.muted}>Query</MonoLabel>
          </Reveal>
          <div style={{ minHeight: 60, display: "flex", alignItems: "center" }}>
            <SearchQuery delay={26} frames={52} />
          </div>
          <WipeRule delay={22} width={720} height={2} color={C.borderStrong} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 12 }}>
          {FILTERS.map((f, i) => (
            <FilterChip key={f.text} text={f.text} active={f.active} delay={84 + i * 5} />
          ))}
        </div>
      </div>

      {/* Right — the board */}
      <div
        style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 40,
        }}
      >
        <MatchCounter delay={62} target={128} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <Reveal delay={70} y={10} style={{ paddingBottom: 12, display: "flex", gap: 20 }}>
            <span style={{ flexGrow: 1 }}>
              <MonoLabel color={alpha(C.muted, 0.75)}>Venue</MonoLabel>
            </span>
            <span style={{ width: 230 }}>
              <MonoLabel color={alpha(C.muted, 0.75)}>District</MonoLabel>
            </span>
            <span style={{ width: 130, textAlign: "right" }}>
              <MonoLabel color={alpha(C.muted, 0.75)}>AMD / hr</MonoLabel>
            </span>
          </Reveal>

          {RESULTS.map((r, i) => (
            <ResultRow
              key={r.name}
              name={r.name}
              district={r.district}
              price={r.price}
              delay={76 + i * 7}
              highlightDelay={i === 0 ? 126 : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  </SceneShell>
);

/* ------------------------------------------------------------------ *
 * Scene 02 — Slot
 * ------------------------------------------------------------------ */

const DAYS: readonly { dow: string; date: string }[] = [
  { dow: "TUE", date: "28" },
  { dow: "WED", date: "29" },
  { dow: "THU", date: "30" },
  { dow: "FRI", date: "31" },
  { dow: "SAT", date: "01" },
  { dow: "SUN", date: "02" },
  { dow: "MON", date: "03" },
];
const ACTIVE_DAY = 4;

const SLOTS: readonly { t: string; taken: boolean }[] = [
  { t: "10:00", taken: false },
  { t: "11:00", taken: true },
  { t: "12:00", taken: false },
  { t: "13:00", taken: false },
  { t: "14:00", taken: false },
  { t: "15:00", taken: true },
  { t: "16:00", taken: true },
  { t: "17:00", taken: false },
  { t: "18:00", taken: false },
  { t: "19:00", taken: true },
  { t: "20:00", taken: false },
  { t: "21:00", taken: false },
];

const CELL_W = 196;
const CELL_H = 94;
const CELL_GAP = 18;
const COLS = 4;
const PICK_INDEX = 10; // 20:00
const SELECT_AT = 88;
const EXTEND_AT = 108;

const DayPill: FC<{ dow: string; date: string; active: boolean; delay: number }> = ({
  dow,
  date,
  active,
  delay,
}) => {
  const p = useEntrance(delay, { damping: 20, stiffness: 190, mass: 0.75 });
  const sel = useEntrance(active ? 44 : 1e6, { damping: 13, stiffness: 190, mass: 0.7 });
  const on = active ? clamp01(sel) : 0;
  const reduced = useReducedMotion();
  const rest = reduced ? 0 : 1 - p;

  return (
    <div
      style={{
        width: 94,
        height: 84,
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        opacity: clamp01(p),
        transform: `translate3d(0, ${20 * rest}px, 0)`,
        border: `1px solid ${interpolateColors(on, [0, 1], [C.border, C.primary])}`,
        background: interpolateColors(on, [0, 1], [C.surface1, C.primary]),
        boxShadow: on > 0.05 ? `0 0 34px ${alpha(C.primary, 0.32 * on)}` : undefined,
        willChange: "transform, opacity",
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 12,
          letterSpacing: "0.2em",
          color: interpolateColors(on, [0, 1], [C.muted, alpha(C.primaryFg, 0.7)]),
        }}
      >
        {dow}
      </span>
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: interpolateColors(on, [0, 1], [C.fg, C.primaryFg]),
        }}
      >
        {date}
      </span>
    </div>
  );
};

const SlotCell: FC<{
  time: string;
  taken: boolean;
  index: number;
  delay: number;
  cover: number;
}> = ({ time, taken, index, delay, cover }) => {
  const p = useEntrance(delay, { damping: 22, stiffness: 200, mass: 0.7 });
  const reduced = useReducedMotion();
  const rest = reduced ? 0 : 1 - p;
  const col = index % COLS;
  const row = Math.floor(index / COLS);

  const idleText = taken ? alpha(C.muted, 0.5) : C.fg;
  const textColor = interpolateColors(cover, [0, 1], [idleText, C.primaryFg]);

  return (
    <div
      style={{
        position: "absolute",
        left: col * (CELL_W + CELL_GAP),
        top: row * (CELL_H + CELL_GAP),
        width: CELL_W,
        height: CELL_H,
        opacity: clamp01(p),
        transform: `translate3d(0, ${18 * rest}px, 0) scale(${reduced ? 1 : 0.94 + 0.06 * clamp01(p)})`,
        willChange: "transform, opacity",
      }}
    >
      {/* the cell's own surface, dissolved where the selection covers it */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 16,
          border: `1px solid ${taken ? alpha(C.border, 0.65) : C.border}`,
          background: taken ? "transparent" : alpha(C.surface2, 0.92),
          opacity: 1 - cover,
        }}
      />
      {taken ? (
        <div
          style={{
            position: "absolute",
            left: 26,
            right: 26,
            top: "50%",
            height: 1,
            background: alpha(C.muted, 0.42),
            transform: "rotate(-9deg)",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 30,
            fontWeight: 500,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
            color: textColor,
          }}
        >
          {time}
        </span>
      </div>
    </div>
  );
};

const SceneSlot: FC<{ len: number }> = ({ len }) => {
  const selectP = clamp01(useEntrance(SELECT_AT, { damping: 13, stiffness: 175, mass: 0.8 }));
  const extendP = clamp01(useEntrance(EXTEND_AT, { damping: 17, stiffness: 160, mass: 0.85 }));

  const gridW = COLS * CELL_W + (COLS - 1) * CELL_GAP;
  const gridH = 3 * CELL_H + 2 * CELL_GAP;

  const pickCol = PICK_INDEX % COLS;
  const pickRow = Math.floor(PICK_INDEX / COLS);
  const selLeft = pickCol * (CELL_W + CELL_GAP);
  const selTop = pickRow * (CELL_H + CELL_GAP);
  const selWidth = CELL_W + extendP * (CELL_W + CELL_GAP);

  return (
    <SceneShell len={len}>
      <div style={{ display: "flex", width: "100%", height: "100%", gap: 84 }}>
        <div
          style={{
            width: 900,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 26,
          }}
        >
          <Eyebrow index="02" label="Slot" delay={CHAPTER_IN} />
          <SceneTitle text="Pick your hour." delay={CHAPTER_IN + 6} />
          <Reveal delay={CHAPTER_IN + 12} y={18}>
            <p
              style={{
                margin: 0,
                fontFamily: FONT_SANS,
                fontSize: 26,
                color: C.fgSoft,
                letterSpacing: "-0.01em",
              }}
            >
              Arena 5 — Ajapnyak, Yerevan
            </p>
          </Reveal>

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            {DAYS.map((d, i) => (
              <DayPill
                key={d.dow}
                dow={d.dow}
                date={d.date}
                active={i === ACTIVE_DAY}
                delay={24 + i * 4}
              />
            ))}
          </div>

          <div
            style={{
              position: "relative",
              width: gridW,
              height: gridH,
              marginTop: 20,
            }}
          >
            {/* selection fill sits under the numerals */}
            <div
              style={{
                position: "absolute",
                left: selLeft,
                top: selTop,
                width: selWidth,
                height: CELL_H,
                borderRadius: 16,
                background: C.primary,
                opacity: selectP,
                transform: `scale(${0.9 + 0.1 * selectP})`,
                transformOrigin: "left center",
                boxShadow: `0 0 56px ${alpha(C.primary, 0.45 * selectP)}`,
              }}
            />
            {SLOTS.map((s, i) => {
              const cover =
                i === PICK_INDEX ? selectP : i === PICK_INDEX + 1 ? extendP * selectP : 0;
              return (
                <SlotCell
                  key={s.t}
                  time={s.t}
                  taken={s.taken}
                  index={i}
                  delay={48 + i * 3}
                  cover={cover}
                />
              );
            })}
          </div>
        </div>

        {/* Right — the readout */}
        <div
          style={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 26,
          }}
        >
          <Reveal delay={116} y={22}>
            <MonoLabel color={C.primary}>Selected</MonoLabel>
          </Reveal>
          <Reveal delay={120} y={30} tuning={{ damping: 20, stiffness: 165, mass: 0.9 }}>
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 74,
                fontWeight: 700,
                letterSpacing: "-0.04em",
                color: C.fg,
                lineHeight: 1,
              }}
            >
              20:00 – 22:00
            </div>
          </Reveal>
          <Reveal delay={126} y={22}>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 27,
                color: C.fgSoft,
              }}
            >
              Saturday 01 August
            </div>
          </Reveal>

          <WipeRule delay={132} width={420} height={1} color={C.border} style={{ marginTop: 8 }} />

          <div style={{ display: "flex", gap: 64, marginTop: 6 }}>
            <Reveal delay={136} y={20} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <MonoLabel color={C.muted}>Duration</MonoLabel>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 40,
                  fontWeight: 500,
                  color: C.fg,
                }}
              >
                2 h
              </span>
            </Reveal>
            <Reveal delay={142} y={20} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <MonoLabel color={C.muted}>Pitch</MonoLabel>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 40,
                  fontWeight: 500,
                  color: C.fg,
                }}
              >
                5v5
              </span>
            </Reveal>
          </div>
        </div>
      </div>
    </SceneShell>
  );
};

/* ------------------------------------------------------------------ *
 * Scene 03 — Book
 * ------------------------------------------------------------------ */

const LEDGER: readonly { label: string; value: string }[] = [
  { label: "Court rate — 9 000 × 2 h", value: "18 000" },
  { label: "Service fee", value: "900" },
  { label: "Equipment", value: "0" },
];

const TOTAL = 18900;
const PAY_START = 44;
const PAY_END = 106;

const LedgerRow: FC<{ label: string; value: string; delay: number; last?: boolean }> = ({
  label,
  value,
  delay,
  last = false,
}) => (
  <Reveal
    delay={delay}
    y={22}
    tuning={{ damping: 24, stiffness: 180, mass: 0.8 }}
    style={{
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 30,
      padding: "20px 0",
      borderBottom: last ? undefined : `1px solid ${alpha(C.border, 0.7)}`,
    }}
  >
    <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: C.fgSoft }}>{label}</span>
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: 30,
        fontWeight: 500,
        fontVariantNumeric: "tabular-nums",
        color: C.fg,
      }}
    >
      {value}
    </span>
  </Reveal>
);

const PayRing: FC<Record<string, never>> = () => {
  const frame = useCurrentFrame();
  const reduced = useReducedMotion();

  // Literal progress -> an eased tween is the honest primitive here.
  const progress = reduced
    ? 1
    : interpolate(frame, [PAY_START, PAY_END], [0, 1], {
        ...CLAMP,
        easing: Easing.inOut(Easing.cubic),
      });

  const pop = clamp01(
    useEntrance(PAY_END - 2, { damping: 11, stiffness: 210, mass: 0.7 }),
  );
  const done = progress >= 0.999;
  const appear = clamp01(useEntrance(28, { damping: 20, stiffness: 170, mass: 0.85 }));

  const size = 300;
  const r = 132;
  const ringColor = interpolateColors(done ? pop : 0, [0, 1], [C.primary, C.success]);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        opacity: appear,
        transform: reduced
          ? undefined
          : `scale(${0.9 + 0.1 * appear + (done ? 0.03 * Math.sin(pop * Math.PI) : 0)})`,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={alpha(C.borderStrong, 0.9)}
          strokeWidth={10}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={10}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
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
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 58,
            fontWeight: 500,
            fontVariantNumeric: "tabular-nums",
            color: done ? C.success : C.fg,
            letterSpacing: "-0.03em",
          }}
        >
          {Math.round(progress * 100)}%
        </span>
        <MonoLabel color={done ? C.success : C.muted}>
          {done ? "Slot held" : "Securing"}
        </MonoLabel>
      </div>
    </div>
  );
};

const SceneBook: FC<{ len: number }> = ({ len }) => {
  const totalP = clamp01(useEntrance(52, { damping: 200, durationInFrames: 42 }));
  const total = Math.round(interpolate(totalP, [0, 1], [0, TOTAL]));

  return (
    <SceneShell len={len}>
      <div style={{ display: "flex", width: "100%", height: "100%", gap: 110 }}>
        <div
          style={{
            width: 880,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 22,
          }}
        >
          <Eyebrow index="03" label="Book" delay={CHAPTER_IN} />
          <SceneTitle text="Confirm and pay." delay={CHAPTER_IN + 6} />

          <div style={{ marginTop: 18 }}>
            {LEDGER.map((row, i) => (
              <LedgerRow
                key={row.label}
                label={row.label}
                value={row.value}
                delay={18 + i * 8}
                last={i === LEDGER.length - 1}
              />
            ))}
          </div>

          <WipeRule
            delay={48}
            width="100%"
            height={2}
            color={alpha(C.primary, 0.5)}
            style={{ marginTop: 6 }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 30,
              marginTop: 26,
            }}
          >
            <Reveal delay={50} y={16} style={{ display: "inline-block" }}>
              <MonoLabel color={C.muted} size={15}>
                Total
              </MonoLabel>
            </Reveal>
            <Reveal
              delay={52}
              y={26}
              tuning={{ damping: 19, stiffness: 170, mass: 0.9 }}
              style={{ display: "flex", alignItems: "baseline", gap: 16 }}
            >
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 92,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.05em",
                  color: C.primary,
                  lineHeight: 1,
                  textShadow: `0 0 48px ${alpha(C.primary, 0.3)}`,
                }}
              >
                {groupThousands(total)}
              </span>
              <MonoLabel color={C.muted} size={22}>
                AMD
              </MonoLabel>
            </Reveal>
          </div>
        </div>

        <div
          style={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 42,
          }}
        >
          <PayRing />
          <Reveal delay={34} y={20} style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                color: C.fgSoft,
                lineHeight: 1.6,
              }}
            >
              Instant confirmation
              <br />
              <span style={{ color: C.muted, fontSize: 20 }}>
                Free cancellation up to 24 h before
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </SceneShell>
  );
};

/* ------------------------------------------------------------------ *
 * Scene 04 — Confirmed
 * ------------------------------------------------------------------ */

const CONFIRM_DETAILS: readonly { label: string; value: string }[] = [
  { label: "Venue", value: "Arena 5" },
  { label: "When", value: "Sat 01 Aug · 20:00" },
  { label: "Reference", value: "SB-4417-YVN" },
];

const CheckMark: FC<Record<string, never>> = () => {
  const frame = useCurrentFrame();
  const reduced = useReducedMotion();

  const ring = reduced
    ? 1
    : interpolate(frame, [4, 30], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const tick = reduced
    ? 1
    : interpolate(frame, [24, 44], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const pop = clamp01(useEntrance(26, { damping: 11, stiffness: 200, mass: 0.75 }));
  const gate = clamp01(
    interpolate(frame, [30, 46], [0, 1], CLAMP),
  );

  const size = 210;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* pulse rings — modulo cycle, so there is no jump if the reel loops */}
      {reduced
        ? null
        : [0, 1, 2].map((i) => {
            const cycle = (frame - 34) / 48;
            const raw = ((cycle - i / 3) % 1 + 1) % 1;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: `2px solid ${C.primary}`,
                  transform: `scale(${1 + raw * 1.5})`,
                  opacity: (1 - raw) * 0.3 * gate,
                }}
              />
            );
          })}

      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: reduced ? undefined : `scale(${0.86 + 0.14 * pop})`,
        }}
      >
        <svg width={size} height={size} viewBox="0 0 210 210">
          <circle
            cx={105}
            cy={105}
            r={96}
            fill={alpha(C.primary, 0.07)}
            stroke="none"
          />
          <circle
            cx={105}
            cy={105}
            r={96}
            fill="none"
            stroke={C.primary}
            strokeWidth={4}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - ring}
            transform="rotate(-90 105 105)"
          />
          <path
            d="M64 107 L92 136 L148 74"
            fill="none"
            stroke={C.primary}
            strokeWidth={11}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - tick}
          />
        </svg>
      </div>
    </div>
  );
};

const SceneConfirm: FC<{ len: number }> = ({ len }) => (
  <SceneShell len={len} exit={false}>
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 34,
      }}
    >
      <CheckMark />

      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 132,
          fontWeight: 700,
          letterSpacing: "-0.045em",
          lineHeight: 1,
          color: C.primary,
          textShadow: `0 0 80px ${alpha(C.primary, 0.28)}`,
          marginTop: 6,
        }}
      >
        <SplitText
          text="CONFIRMED"
          delay={40}
          stagger={2.2}
          y={52}
          tuning={{ damping: 16, stiffness: 175, mass: 0.8 }}
        />
      </div>

      <WipeRule delay={62} width={780} height={1} color={C.border} style={{ marginTop: 4 }} />

      <div
        style={{
          display: "flex",
          gap: 110,
          marginTop: 12,
        }}
      >
        {CONFIRM_DETAILS.map((d, i) => (
          <Reveal
            key={d.label}
            delay={68 + i * 7}
            y={24}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <MonoLabel color={C.muted}>{d.label}</MonoLabel>
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: C.fg,
                whiteSpace: "nowrap",
              }}
            >
              {d.value}
            </span>
          </Reveal>
        ))}
      </div>

      <Reveal
        delay={94}
        y={22}
        style={{ marginTop: 34, display: "flex", alignItems: "baseline", gap: 20 }}
      >
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            color: C.fg,
          }}
        >
          Sports<span style={{ color: C.primary }}>BnB</span>
        </span>
        <span style={{ color: alpha(C.muted, 0.45), fontFamily: FONT_MONO, fontSize: 20 }}>/</span>
        <MonoLabel color={C.muted} size={19}>
          sportsbnb.am
        </MonoLabel>
      </Reveal>
    </div>
  </SceneShell>
);

/* ------------------------------------------------------------------ *
 * Composition root
 * ------------------------------------------------------------------ */

type Props = Record<string, never>;

const SCENE_COMPONENTS: Record<string, FC<{ len: number }>> = {
  intro: SceneIntro,
  search: SceneSearch,
  slot: SceneSlot,
  book: SceneBook,
  confirm: SceneConfirm,
};

export const FeatureReel: FC<Props> = () => {
  const reduced = useSystemReducedMotion();

  return (
    <ReducedMotionContext.Provider value={reduced}>
      <AbsoluteFill
        style={{
          backgroundColor: C.bg,
          color: C.fg,
          fontFamily: FONT_SANS,
          WebkitFontSmoothing: "antialiased",
          textRendering: "optimizeLegibility",
        }}
      >
        <Stage />

        {CHAPTERS.map((ch, i) => {
          const Scene = SCENE_COMPONENTS[ch.id];
          const isLast = i === CHAPTERS.length - 1;
          return (
            <Sequence
              key={ch.id}
              name={ch.label}
              from={ch.from}
              durationInFrames={isLast ? ch.len : ch.len + OVERLAP}
            >
              <Scene len={ch.len} />
            </Sequence>
          );
        })}

        <ChapterSweep />
        <TimelineRail />
      </AbsoluteFill>
    </ReducedMotionContext.Provider>
  );
};

export default FeatureReel;
