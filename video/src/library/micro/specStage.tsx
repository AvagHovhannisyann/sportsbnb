/**
 * specStage — the chrome every composition in this folder wears.
 *
 * Not a composition either. A motion spec is only useful if the numbers are on
 * the screen next to the thing they describe, so all 25 pieces share one frame:
 * the case reference and title at the top, the CSS/framer-motion equivalent
 * under it in mono, the interaction itself in the middle, and a millisecond
 * rail at the bottom with the phase windows marked and a playhead running
 * through them. Pause on any frame and the readout tells you where in the
 * transition you are.
 *
 * The rail reads in *spec* milliseconds. Compositions scale their clock by
 * `speed` before anything else, and the value handed to `elapsedMs` is derived
 * from that scaled clock, so slowing a demo down to a quarter pace to inspect
 * a nine-frame gesture does not make the rail lie about the timing a developer
 * has to type into CSS.
 */

import type { FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  RADIUS,
  SANS_FONT,
  amber,
  chalk,
  courtGreen,
  cyan,
  eyebrowStyle,
  hairline,
  interpolateSafe,
  mutedInk,
  rose,
} from "./microKit";

export type SpecTone = "primary" | "cyan" | "amber" | "rose" | "muted";

const TONE_INK: Record<SpecTone, (alpha: number) => string> = {
  primary: courtGreen,
  cyan,
  amber,
  rose,
  muted: mutedInk,
};

/** One transition window on the rail: `250ms starting at 350ms`. */
export type SpecPhase = {
  label: string;
  fromMs: number;
  toMs: number;
  tone?: SpecTone;
};

export type SpecStageProps = {
  /** e.g. `"CASE 95"`. Omitted when no catalogue case covers the piece. */
  caseRef?: string;
  title: string;
  /** The CSS or framer-motion equivalent, one line, as you would type it. */
  css: string;
  /** What `prefers-reduced-motion: reduce` does to this interaction. */
  reduced: string;
  phases: readonly SpecPhase[];
  /** Position of the playhead, in spec milliseconds. */
  elapsedMs: number;
  /** Length of the rail, in spec milliseconds. */
  totalMs: number;
  /** Canvas scale factor — `width / 960`. */
  unit: number;
  children: ReactNode;
};

export const SpecStage: FC<SpecStageProps> = ({
  caseRef,
  title,
  css,
  reduced,
  phases,
  elapsedMs,
  totalMs,
  unit,
  children,
}) => {
  const pad = 44 * unit;
  const railTop = 430 * unit;
  const railW = 960 * unit - pad * 2;
  const railH = 7 * unit;
  const head = interpolateSafe(elapsedMs, [0, totalMs], [0, railW]);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      {/* The stage plate. Flat on purpose — a spec sheet should not have a
          mood, and any gradient behind a shadow demo would misreport it. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 90% at 50% -20%, ${BRAND.surface1} 0%, ${BRAND.background} 70%)`,
        }}
      />

      {/* ── header ─────────────────────────────────────────────────────── */}
      <div style={{ position: "absolute", left: pad, top: 34 * unit }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 * unit }}>
          <span style={eyebrowStyle(unit, 10)}>Motion spec</span>
          {caseRef ? (
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 10 * unit,
                letterSpacing: 0.12 * 10 * unit,
                textTransform: "uppercase",
                color: BRAND.mutedForeground,
                border: `${1 * unit}px solid ${BRAND.border}`,
                borderRadius: 999,
                padding: `${3 * unit}px ${8 * unit}px`,
              }}
            >
              {caseRef}
            </span>
          ) : null}
        </div>
        <div
          style={{
            marginTop: 9 * unit,
            fontFamily: DISPLAY_FONT,
            fontSize: 25 * unit,
            fontWeight: 600,
            letterSpacing: -0.025 * 25 * unit,
            color: BRAND.foreground,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 7 * unit,
            fontFamily: MONO_FONT,
            fontSize: 12 * unit,
            lineHeight: 1.45,
            color: BRAND.foregroundSoft,
            maxWidth: 820 * unit,
          }}
        >
          {css}
        </div>
      </div>

      {/* ── the interaction ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: pad,
          right: pad,
          top: 150 * unit,
          height: 255 * unit,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>

      {/* ── the millisecond rail ───────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: pad,
          top: railTop - 20 * unit,
          width: railW,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontFamily: MONO_FONT,
          fontSize: 11 * unit,
          color: BRAND.mutedForeground,
        }}
      >
        <span>0 ms</span>
        <span style={{ color: BRAND.primary, fontSize: 13 * unit }}>
          {`t = ${Math.round(elapsedMs)} ms`}
        </span>
        <span>{`${Math.round(totalMs)} ms`}</span>
      </div>

      <div
        style={{
          position: "absolute",
          left: pad,
          top: railTop,
          width: railW,
          height: railH,
          borderRadius: 999,
          backgroundColor: hairline(0.55),
          overflow: "hidden",
        }}
      >
        {phases.map((p) => {
          const tone = TONE_INK[p.tone ?? "primary"];
          return (
            <div
              key={`${p.label}-${p.fromMs}`}
              style={{
                position: "absolute",
                left: interpolateSafe(p.fromMs, [0, totalMs], [0, railW]),
                width: Math.max(
                  1.5 * unit,
                  interpolateSafe(p.toMs - p.fromMs, [0, totalMs], [0, railW]),
                ),
                top: 0,
                bottom: 0,
                backgroundColor: tone(0.75),
              }}
            />
          );
        })}
      </div>

      {/* Playhead. A hairline, not a knob — it has to be readable against a
          7px rail without covering the window it is inside. */}
      <div
        style={{
          position: "absolute",
          left: pad + head - 1 * unit,
          top: railTop - 7 * unit,
          width: 2 * unit,
          height: railH + 14 * unit,
          borderRadius: 999,
          backgroundColor: BRAND.foreground,
          boxShadow: `0 0 ${8 * unit}px ${chalk(0.5)}`,
        }}
      />

      {/* ── phase legend ───────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: pad,
          top: railTop + 20 * unit,
          width: railW,
          display: "flex",
          flexWrap: "wrap",
          gap: `${5 * unit}px ${14 * unit}px`,
        }}
      >
        {phases.map((p) => {
          const tone = TONE_INK[p.tone ?? "primary"];
          const active = elapsedMs >= p.fromMs && elapsedMs <= p.toMs;
          return (
            <div
              key={`legend-${p.label}-${p.fromMs}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6 * unit,
                fontFamily: MONO_FONT,
                fontSize: 10.5 * unit,
                color: active ? BRAND.foreground : BRAND.mutedForeground,
              }}
            >
              <span
                style={{
                  width: 7 * unit,
                  height: 7 * unit,
                  borderRadius: 2 * unit,
                  backgroundColor: tone(active ? 1 : 0.55),
                }}
              />
              <span>{`${p.label} · ${Math.round(p.toMs - p.fromMs)}ms`}</span>
            </div>
          );
        })}
      </div>

      {/* ── reduced-motion contract ────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: pad,
          right: pad,
          top: 496 * unit,
          display: "flex",
          alignItems: "center",
          gap: 8 * unit,
          fontFamily: SANS_FONT,
          fontSize: 11.5 * unit,
          color: BRAND.mutedForeground,
        }}
      >
        <span
          style={{
            fontFamily: MONO_FONT,
            fontSize: 10 * unit,
            textTransform: "uppercase",
            letterSpacing: 0.1 * 10 * unit,
            color: BRAND.warning,
            border: `${1 * unit}px solid ${amber(0.35)}`,
            borderRadius: RADIUS.sm * unit,
            padding: `${2 * unit}px ${7 * unit}px`,
          }}
        >
          reduce
        </span>
        <span>{reduced}</span>
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────────────────── stage furniture ─────────────────────────── */

export type PointerProps = {
  unit: number;
  x: number;
  y: number;
  /** 0 → 1, how far into a press the pointer is. Tints and shrinks the arrow. */
  pressed?: number;
  /** 0 → 1 overall visibility; the pointer fades with the hover it explains. */
  opacity?: number;
};

/**
 * A synthetic cursor. Every hover and press spec needs one, because "hover"
 * with no pointer on screen is just a colour change with no cause, and the
 * reader has to be told what the interaction *was*.
 */
export const Pointer: FC<PointerProps> = ({
  unit,
  x,
  y,
  pressed = 0,
  opacity = 1,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      opacity,
      transform: `scale(${1 - 0.08 * pressed})`,
      transformOrigin: "0% 0%",
      pointerEvents: "none",
    }}
  >
    {/* The press halo. Grows out of the tip so the eye reads "here". */}
    {pressed > 0 ? (
      <div
        style={{
          position: "absolute",
          left: -14 * unit,
          top: -14 * unit,
          width: 28 * unit,
          height: 28 * unit,
          borderRadius: 999,
          border: `${1.5 * unit}px solid ${courtGreen(0.5 * (1 - pressed * 0.4))}`,
          transform: `scale(${0.6 + 0.6 * pressed})`,
        }}
      />
    ) : null}
    <svg
      width={22 * unit}
      height={26 * unit}
      viewBox="0 0 22 26"
      fill="none"
      style={{ display: "block" }}
    >
      <path
        d="M2 1.6 L2 21.2 L7.1 16.4 L10.4 23.4 L13.6 21.9 L10.4 15.1 L17.3 15.1 Z"
        fill={BRAND.foreground}
        stroke={BRAND.background}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export type KeyCapProps = {
  unit: number;
  label: string;
  /** 0 → 1, how far down the cap is pressed. */
  pressed?: number;
};

/** A keycap, for the keyboard-affordance specs. */
export const KeyCap: FC<KeyCapProps> = ({ unit, label, pressed = 0 }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 46 * unit,
      height: 30 * unit,
      padding: `0 ${10 * unit}px`,
      borderRadius: RADIUS.sm * unit,
      backgroundColor: pressed > 0.5 ? BRAND.surface3 : BRAND.surface2,
      border: `${1 * unit}px solid ${pressed > 0.5 ? BRAND.borderInteractive : BRAND.border}`,
      boxShadow: `0 ${(2 - 1.6 * pressed) * unit}px 0 0 ${hairline(0.9)}`,
      transform: `translateY(${1.6 * pressed * unit}px)`,
      fontFamily: MONO_FONT,
      fontSize: 12 * unit,
      color: pressed > 0.5 ? BRAND.foreground : BRAND.foregroundSoft,
    }}
  >
    {label}
  </div>
);

export type StateChipProps = {
  unit: number;
  label: string;
  tone?: SpecTone;
  /** 0 → 1. Chips light up while their state is the live one. */
  active: number;
};

/** The little state name that sits under a demo: `:hover`, `:active`, … */
export const StateChip: FC<StateChipProps> = ({
  unit,
  label,
  tone = "primary",
  active,
}) => {
  const paint = TONE_INK[tone];
  return (
    <span
      style={{
        fontFamily: MONO_FONT,
        fontSize: 11 * unit,
        padding: `${4 * unit}px ${10 * unit}px`,
        borderRadius: 999,
        color: active > 0.5 ? BRAND.foreground : BRAND.mutedForeground,
        backgroundColor: paint(0.06 + 0.14 * active),
        border: `${1 * unit}px solid ${paint(0.18 + 0.5 * active)}`,
      }}
    >
      {label}
    </span>
  );
};
