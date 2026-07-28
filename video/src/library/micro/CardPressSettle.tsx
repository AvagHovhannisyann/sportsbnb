/**
 * CardPressSettle — a lifted card being pressed back down into the page.
 * The press half of `.card-lift` (`src/index.css:614-616`), which currently has
 * no `:active` state at all. Companion to CardHoverLift.
 *
 * WHAT IS SPECIFIED
 *   The press UNDOES the hover rather than adding a gesture of its own:
 *   `translateY` returns from `-4px` to `0` over 120ms and the shadow drops
 *   from `--shadow-lg` back to `--shadow-sm` over the same 120ms. Release takes
 *   160ms to lift again — slower, because a control returning to rest is not
 *   urgent, and a 120ms return reads as a snap-back. Same 120/160 asymmetry as
 *   the button press (case 10, ButtonPressScale).
 *
 *   NOT `scale`. `tapScale` in `src/lib/motion.ts:52` is `{ scale: 0.97 }`, and
 *   it is right for a button and wrong for a card, for the reason already
 *   written into `src/index.css:605-608`: `scale` resamples every glyph, so a
 *   card carrying a title, a meta line and a price goes soft for the length of
 *   the press and snaps back at the end. On a button — one short label,
 *   centred, 2% — nobody sees it. On a 280px card with three text rows,
 *   everybody does. If a card needs `whileTap`, give it `{ y: 0 }`, not a
 *   scale.
 *
 *   The press is therefore free of any new property: it moves the same
 *   `translateY` and the same `box-shadow` the hover already owns, in the
 *   opposite direction. That is the whole reason it feels physical — the card
 *   was picked up, and pressing puts it back on the page.
 *
 * CSS EQUIVALENT
 *   .card-lift {
 *     transition: transform  200ms cubic-bezier(0.16,1,0.3,1),
 *                 box-shadow 200ms cubic-bezier(0.16,1,0.3,1);
 *   }
 *   .card-lift:hover  { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
 *   .card-lift:active { transform: translateY(0);    box-shadow: var(--shadow-sm);
 *                       transition-duration: 120ms; }
 *   /  release inherits the 160ms below, not the 200ms above  /
 *   .card-lift:hover:not(:active) { transition-duration: 160ms; }
 *   framer-motion: whileHover={{ y: -4 }} whileTap={{ y: 0 }} — and explicitly
 *   NOT `tapScale`.
 *
 * REDUCED MOTION
 *   `transform: none` throughout, exactly as `src/index.css:627-629` already
 *   does for the hover — so the press is carried by the shadow alone, which
 *   still runs at 200ms ease and still steps `lg → sm` under the finger. The
 *   card is a link; the navigation that follows is the real acknowledgement,
 *   and it is unaffected. Nothing here is load-bearing enough that its removal
 *   costs information.
 *   Loop freezes at frame 0 — card at rest, unhovered, unpressed.
 *
 * LOOP
 *   Seamless. Two independent `toggleCycle` values, `hover` and `press`, each a
 *   clamped rise minus a clamped fall and therefore exactly 0 at local frame 0
 *   and exactly 0 at local frame 180. Every painted value is their product:
 *   `y = -4 · hover · (1 − press)` and the shadow is
 *   `shadowBlend(sm, lg, hover · (1 − press))`. A product of two terms that are
 *   both exactly zero at the seam is exactly zero at the seam; nothing here
 *   relies on the two cycles being arranged to agree.
 *   3000ms at 60fps.
 */

import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_OUT_EXPO,
  EASE_SNAP,
  MONO_FONT,
  RADIUS,
  SANS_FONT,
  framesToMs,
  hairline,
  shadowBlend,
  toggleCycle,
  useSpecFrame,
  wrap,
} from "./microKit";
import { Pointer, SpecStage, StateChip } from "./specStage";

const CANVAS_W = 960;
/** 3000ms at 60fps. */
const PERIOD = 180;

const HOVER_MS = 300;
const HOVER_DUR_MS = 200;
const PRESS_MS = 1000;
const PRESS_DUR_MS = 120;
const RELEASE_MS = 1600;
const RELEASE_DUR_MS = 160;
const LEAVE_MS = 2200;

export type CardPressSettleProps = {
  title: string;
  meta: string;
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const cardPressSettleDefaultProps: CardPressSettleProps = {
  title: "Mika Sports Complex",
  meta: "Yerevan · Basketball",
  speed: 1,
};

export const CardPressSettle: FC<CardPressSettleProps> = ({
  title,
  meta,
  speed,
}) => {
  const rawFrame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const frame = useSpecFrame(rawFrame, speed, 0);
  const unit = width / CANVAS_W;

  const hover = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: HOVER_MS,
    onDurMs: HOVER_DUR_MS,
    offAtMs: LEAVE_MS,
    offDurMs: HOVER_DUR_MS,
    onEase: EASE_OUT_EXPO,
    offEase: EASE_OUT_EXPO,
  });

  const press = toggleCycle({
    frame,
    fps,
    period: PERIOD,
    onAtMs: PRESS_MS,
    onDurMs: PRESS_DUR_MS,
    offAtMs: RELEASE_MS,
    offDurMs: RELEASE_DUR_MS,
    onEase: EASE_SNAP,
    offEase: EASE_SNAP,
  });

  /** One scalar, two properties, and a product that is zero at the seam. */
  const elevation = hover * (1 - press);
  const lift = -4 * elevation;

  const stageW = 560 * unit;
  const stageH = 232 * unit;
  const cardW = 280 * unit;
  const cardH = 150 * unit;
  const cardLeft = (stageW - cardW) / 2;
  const cardTop = 44 * unit;

  return (
    <SpecStage
      caseRef="Case 10"
      title="Card — press settles it back onto the page"
      css="press: translateY(-4px → 0) + box-shadow lg → sm, 120ms cubic-bezier(.2,.8,.2,1) · release 160ms · NOT scale — tapScale 0.97 resamples every glyph in the card"
      reduced="transform: none. The press is carried by box-shadow lg → sm at 200ms ease, which is what the hover already does."
      phases={[
        { label: "hover in", fromMs: HOVER_MS, toMs: HOVER_MS + HOVER_DUR_MS, tone: "cyan" },
        { label: "press", fromMs: PRESS_MS, toMs: PRESS_MS + PRESS_DUR_MS },
        { label: "held", fromMs: PRESS_MS + PRESS_DUR_MS, toMs: RELEASE_MS, tone: "muted" },
        { label: "release", fromMs: RELEASE_MS, toMs: RELEASE_MS + RELEASE_DUR_MS, tone: "amber" },
        { label: "leave", fromMs: LEAVE_MS, toMs: LEAVE_MS + HOVER_DUR_MS, tone: "muted" },
      ]}
      elapsedMs={framesToMs(wrap(frame, PERIOD), fps)}
      totalMs={framesToMs(PERIOD, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        <div
          style={{
            position: "absolute",
            left: cardLeft - 14 * unit,
            top: cardTop + cardH,
            width: cardW + 28 * unit,
            height: 1 * unit,
            backgroundColor: hairline(1),
          }}
        />

        <div
          style={{
            position: "absolute",
            left: cardLeft,
            top: cardTop,
            width: cardW,
            height: cardH,
            boxSizing: "border-box",
            borderRadius: RADIUS.lg * unit,
            backgroundColor: BRAND.card,
            border: `${1 * unit}px solid ${BRAND.border}`,
            boxShadow: shadowBlend(unit, "sm", "lg", elevation),
            transform: `translateY(${lift * unit}px)`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: 74 * unit,
              backgroundColor: BRAND.surface2,
              borderBottom: `${1 * unit}px solid ${BRAND.border}`,
            }}
          />
          <div style={{ padding: 13 * unit }}>
            <div
              style={{
                fontFamily: SANS_FONT,
                fontSize: 14 * unit,
                fontWeight: 600,
                color: BRAND.foreground,
              }}
            >
              {title}
            </div>
            <div
              style={{
                marginTop: 4 * unit,
                fontFamily: SANS_FONT,
                fontSize: 11.5 * unit,
                color: BRAND.mutedForeground,
              }}
            >
              {meta}
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: cardLeft,
            top: cardTop - 32 * unit,
            display: "flex",
            gap: 8 * unit,
          }}
        >
          <StateChip unit={unit} label=":hover" tone="cyan" active={hover} />
          <StateChip unit={unit} label=":active" active={press} />
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            fontFamily: MONO_FONT,
            fontSize: 11 * unit,
            lineHeight: 1.8,
            color: BRAND.mutedForeground,
          }}
        >
          {`translateY ${lift.toFixed(2)}px`}
          <br />
          {`elevation sm → lg, ${(elevation * 100).toFixed(0)}%`}
        </div>

        <Pointer
          unit={unit}
          x={cardLeft + cardW * 0.7}
          y={cardTop + cardH * 0.6}
          pressed={press}
          opacity={hover}
        />
      </div>
    </SpecStage>
  );
};
