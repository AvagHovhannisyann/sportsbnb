/**
 * SlotPickerTapSelect — the moment a player picks their hour: chips settle in,
 * a pointer travels to one, it selects, and the confirm bar arms with the
 * total. The booking step on /venues/:id, played once.
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { StageDressing } from "./venueChrome";
import {
  BRAND,
  DISPLAY_FONT,
  EASE_OUT_EXPO,
  MONO_FONT,
  SANS_FONT,
  SPORTS,
  type SportKey,
  chalk,
  clamp01,
  formatDram,
  hairline,
  ink,
  interpolateSafe,
  mix,
  tint,
  useMotionFrame,
} from "./venueKit";

const CANVAS_W = 1080;

export type SlotPickerTapSelectProps = {
  /** Slot labels in grid order. Eight to twelve read best. */
  slots: string[];
  /** Indices of slots already taken — rendered dead and never selectable. */
  takenIndices: number[];
  /** Index of the slot the pointer picks. */
  pickIndex: number;
  /** Hourly rate in dram. The confirm bar shows exactly this, with nothing added. */
  hourlyRate: number;
  /** Chips per row. */
  columns: number;
  /** Drives the accent only. */
  sport: SportKey;
};

export const slotPickerTapSelectDefaultProps: SlotPickerTapSelectProps = {
  slots: [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
    "22:00",
  ],
  takenIndices: [1, 4, 8],
  pickIndex: 6,
  hourlyRate: 12000,
  columns: 5,
  sport: "football",
};

/**
 * One-way: chips arrive, the pointer lands, the slot is taken. Reduced motion
 * freezes on the LAST frame — the selected chip and the armed confirm bar are
 * the content; frame 0 is an empty grid.
 *
 * `spring()` carries the pointer and the selection pop, because both have
 * mass. The confirm bar's fill and the pointer's ring are `interpolate()`,
 * because a bar filling is linear and a ring expanding once is not a landing.
 */
export const SlotPickerTapSelect: FC<SlotPickerTapSelectProps> = ({
  slots,
  takenIndices,
  pickIndex,
  hourlyRate,
  columns,
  sport,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const frame = useMotionFrame(rawFrame, durationInFrames - 1);

  const unit = width / CANVAS_W;
  const accent = SPORTS[sport].accent;

  const list = slots.length > 0 ? slots : slotPickerTapSelectDefaultProps.slots;
  const cols = Math.max(1, columns);
  const pick = Math.min(Math.max(0, pickIndex), list.length - 1);

  const padX = 70 * unit;
  const gridW = width - padX * 2;
  const gap = 14 * unit;
  const chipW = (gridW - gap * (cols - 1)) / cols;
  const chipH = 74 * unit;
  const gridTop = 168 * unit;

  const chipAt = (i: number) => ({
    x: padX + (i % cols) * (chipW + gap),
    y: gridTop + Math.floor(i / cols) * (chipH + gap),
  });

  const taken = (i: number): boolean => takenIndices.indexOf(i) !== -1;

  /* ── Beats ──────────────────────────────────────────────────────────── */
  const CHIPS_AT = 6;
  const CHIP_STEP = 3;
  const POINTER_AT = CHIPS_AT + CHIP_STEP * list.length + 6;
  const SELECT_AT = POINTER_AT + 20;
  const CONFIRM_AT = SELECT_AT + 14;

  // The pointer travels from just off the bottom-right to the chosen chip.
  const travel = spring({
    frame,
    fps,
    delay: POINTER_AT,
    config: { damping: 24, mass: 1, stiffness: 120 },
    durationInFrames: 22,
  });
  const target = chipAt(pick);
  const pointerX = mix(width * 0.86, target.x + chipW / 2, clamp01(travel));
  const pointerY = mix(height * 0.94, target.y + chipH / 2, clamp01(travel));

  const select = spring({
    frame,
    fps,
    delay: SELECT_AT,
    // The one overshoot: a tap that lands should feel like it landed.
    config: { damping: 12, mass: 0.7, stiffness: 190 },
    durationInFrames: 20,
  });
  const ripple = interpolateSafe(frame, [SELECT_AT, SELECT_AT + 18], [0, 1], EASE_OUT_EXPO);

  const confirm = spring({
    frame,
    fps,
    delay: CONFIRM_AT,
    config: { damping: 22, mass: 0.9, stiffness: 140 },
    durationInFrames: 18,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 64% at 50% 18%, ${BRAND.surface1} 0%, ${BRAND.background} 78%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: padX,
          top: 62 * unit,
          opacity: interpolateSafe(frame, [0, 12], [0, 1]),
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 40 * unit,
            fontWeight: 700,
            letterSpacing: -0.04 * 40 * unit,
            color: BRAND.foreground,
          }}
        >
          Pick your hour
        </div>
        <div
          style={{
            marginTop: 8 * unit,
            fontFamily: SANS_FONT,
            fontSize: 20 * unit,
            color: BRAND.mutedForeground,
          }}
        >
          Saturday 12 July · {formatDram(hourlyRate)} per hour
        </div>
      </div>

      <Sequence name="Chips" layout="none">
        {list.map((slot, i) => {
          const pos = chipAt(i);
          const isTaken = taken(i);
          const arrive = spring({
            frame,
            fps,
            delay: CHIPS_AT + i * CHIP_STEP,
            config: { damping: 21, mass: 0.8, stiffness: 155 },
            durationInFrames: 16,
          });
          const isPicked = i === pick && !isTaken;
          const chosen = isPicked ? clamp01(select) : 0;
          const pop = isPicked ? Math.max(0, select) : 0;

          return (
            <div
              key={slot}
              style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                width: chipW,
                height: chipH,
                borderRadius: 16 * unit,
                backgroundColor: isTaken ? BRAND.surface1 : BRAND.surface2,
                border: `${1.4 * unit}px solid ${isTaken ? hairline(0.8) : BRAND.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: clamp01(arrive) * (isTaken ? 0.5 : 1),
                transform: `translateY(${16 * unit * (1 - clamp01(arrive))}px) scale(${mix(0.94, 1, clamp01(arrive)) + 0.05 * pop})`,
              }}
            >
              {/* Selected state as a second surface fading over the first, so
                  the resting chip never changes colour mid-tween. */}
              <div
                style={{
                  position: "absolute",
                  inset: -1 * unit,
                  borderRadius: 16 * unit,
                  backgroundColor: tint(accent, 0.16),
                  border: `${1.6 * unit}px solid ${tint(accent, 0.8)}`,
                  boxShadow: `0 0 ${30 * unit * chosen}px ${tint(accent, 0.45 * chosen)}`,
                  opacity: chosen,
                }}
              />
              <span
                style={{
                  position: "relative",
                  fontFamily: MONO_FONT,
                  fontSize: 24 * unit,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                  color: isTaken
                    ? BRAND.mutedForeground
                    : chosen > 0.5
                      ? accent
                      : BRAND.foregroundSoft,
                  textDecoration: isTaken ? "line-through" : undefined,
                }}
              >
                {slot}
              </span>
            </div>
          );
        })}
      </Sequence>

      {/* Tap ripple, drawn under the pointer. */}
      {ripple > 0 ? (
        <div
          style={{
            position: "absolute",
            left: target.x + chipW / 2 - 60 * unit,
            top: target.y + chipH / 2 - 60 * unit,
            width: 120 * unit,
            height: 120 * unit,
            borderRadius: "50%",
            border: `${2 * unit}px solid ${tint(accent, 0.5 * (1 - ripple))}`,
            transform: `scale(${mix(0.25, 1.3, ripple)})`,
          }}
        />
      ) : null}

      {/* The pointer itself. */}
      <svg
        width={54 * unit}
        height={54 * unit}
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: pointerX - 8 * unit,
          top: pointerY - 6 * unit,
          opacity: interpolateSafe(frame, [POINTER_AT - 6, POINTER_AT + 4, CONFIRM_AT + 16, CONFIRM_AT + 26], [0, 1, 1, 0]),
        }}
        fill="none"
      >
        <path
          d="M5 2.5 L18.5 12.5 L12 13.2 L15.2 20 L12.4 21.2 L9.3 14.6 L5 18.6 Z"
          fill={chalk(0.96)}
          stroke={ink(0.6)}
          strokeWidth={1.1}
          strokeLinejoin="round"
        />
      </svg>

      {/* Confirm bar — the price is the listed price, nothing added. */}
      <div
        style={{
          position: "absolute",
          left: padX,
          right: padX,
          bottom: 54 * unit,
          height: 96 * unit,
          borderRadius: 24 * unit,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${28 * unit}px`,
          backgroundColor: BRAND.card,
          border: `${1.4 * unit}px solid ${clamp01(confirm) > 0.5 ? tint(accent, 0.6) : BRAND.border}`,
          boxShadow: `0 ${18 * unit}px ${40 * unit}px ${-14 * unit}px ${ink(0.8)}`,
          opacity: interpolateSafe(frame, [12, 26], [0, 1]),
        }}
      >
        <div>
          <div
            style={{
              fontFamily: MONO_FONT,
              fontSize: 13 * unit,
              letterSpacing: 0.18 * 13 * unit,
              textTransform: "uppercase",
              color: BRAND.mutedForeground,
            }}
          >
            Selected
          </div>
          <div
            style={{
              marginTop: 5 * unit,
              fontFamily: MONO_FONT,
              fontSize: 28 * unit,
              fontVariantNumeric: "tabular-nums",
              color: clamp01(select) > 0.5 ? BRAND.foreground : BRAND.mutedForeground,
            }}
          >
            {clamp01(select) > 0.5 ? `${list[pick]} · 1 hour` : "—"}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22 * unit,
          }}
        >
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 34 * unit,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              color: BRAND.foreground,
              opacity: clamp01(select),
            }}
          >
            {formatDram(hourlyRate)}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: 60 * unit,
              padding: `0 ${28 * unit}px`,
              borderRadius: 18 * unit,
              backgroundColor: tint(accent, mix(0.12, 1, clamp01(confirm))),
              transform: `scale(${mix(0.96, 1, clamp01(confirm))})`,
            }}
          >
            <span
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: 24 * unit,
                fontWeight: 700,
                letterSpacing: -0.02 * 24 * unit,
                color: clamp01(confirm) > 0.5 ? BRAND.primaryForeground : BRAND.mutedForeground,
              }}
            >
              Confirm
            </span>
          </div>
        </div>
      </div>

      <StageDressing strength={0.6} />
    </AbsoluteFill>
  );
};
