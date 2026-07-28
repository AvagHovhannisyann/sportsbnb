/**
 * CardHoverLift — `.card-lift`, and the `transition-all` that should not be
 * there.
 * Component: `src/index.css:614-616` —
 * `@apply transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`.
 * Related catalogue work: case 17 (sports cards revealing on scroll) and case
 * 34, which is the *other* card gesture and is deliberately not folded in here.
 *
 * WHAT IS SPECIFIED
 *   Two properties, 200ms, `--ease-out-expo`, and no third property:
 *     transform  — `translateY(0 → -4px)`. Tailwind's `-translate-y-1` is
 *       0.25rem. Four pixels is enough because the shadow is doing most of the
 *       work; eight starts to read as the card detaching.
 *     box-shadow — `--shadow-base → --shadow-lg`, interpolated component by
 *       component (offset, blur, spread, alpha) exactly as CSS does it. This is
 *       one paint per frame. Cross-fading two stacked shadows instead
 *       double-darkens at the midpoint, which is the usual reason a hover lift
 *       looks like it dips before it rises.
 *
 *   LIFT, NOT SCALE, and the source comment at `src/index.css:605-608` already
 *   gives the reason: `scale` resamples every glyph in the card, so the text
 *   softens for the length of the transition and snaps back at the end, while
 *   `translate` moves the same rasterisation. Both are GPU-composited, so the
 *   correct choice is free.
 *
 *   REPLACE `transition-all`. It is the actual defect. `all` means the card
 *   also animates `border-color`, `background-color` and anything else a
 *   variant touches, over the same 200ms — so a card that changes its border on
 *   `:focus-within` while the pointer is leaving gets a 200ms colour tween
 *   nobody asked for, and every one of those is an extra property the style
 *   engine has to diff per frame on a grid of twenty cards.
 *
 *   The image zoom inside a card is a different job and stays out of this: the
 *   picture moves, the frame does not (case 34). So do the auth CTA glow, the
 *   chatbot's floating button and the header logo — all named as excluded in
 *   the same source comment.
 *
 * CSS EQUIVALENT
 *   .card-lift {
 *     transition: transform  200ms cubic-bezier(0.16,1,0.3,1),
 *                 box-shadow 200ms cubic-bezier(0.16,1,0.3,1);
 *   }
 *   .card-lift:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
 *   framer-motion: whileHover={{ y: -4 }} transition={{ duration: 0.2,
 *   ease: [0.16,1,0.3,1] }} — but do not reach for it. This is two CSS
 *   properties on a class that is applied to every card in the app, and a
 *   `motion.div` per grid cell is a runtime per card for no gain.
 *
 * REDUCED MOTION
 *   Already shipped, and correctly — `src/index.css:624-629` keeps
 *   `transition: box-shadow 200ms ease` and sets `.card-lift:hover { transform:
 *   none; }`. Worth reading twice, because it is the pattern the rest of this
 *   family argues for: the shadow still answers the pointer, so the hover is
 *   still acknowledged; only the movement is removed. Reduced motion means no
 *   motion, not no feedback.
 *   Loop freezes at frame 0, the card at rest.
 *
 * LOOP
 *   Seamless. One `toggleCycle` drives both properties: a clamped rise minus a
 *   clamped fall, exactly 0 at local frame 0 (neither window has opened) and
 *   exactly 0 at local frame 144 (1 − 1, both have closed). `translateY` is
 *   `-4 · hover` and the shadow is `shadowBlend(base, lg, hover)`, so both
 *   return to their rest values by construction rather than by arrangement.
 *   2400ms at 60fps.
 */

import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  EASE_OUT_EXPO,
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
/** 2400ms at 60fps. */
const PERIOD = 144;

const ENTER_MS = 400;
const LEAVE_MS = 1800;
const DUR_MS = 200;

export type CardHoverLiftProps = {
  title: string;
  meta: string;
  price: string;
  /** Clock multiplier; 1 is production timing. */
  speed: number;
};

export const cardHoverLiftDefaultProps: CardHoverLiftProps = {
  title: "Ararat Arena",
  meta: "Yerevan · Football · 5-a-side",
  price: "12 000 ֏ / hr",
  speed: 1,
};

export const CardHoverLift: FC<CardHoverLiftProps> = ({
  title,
  meta,
  price,
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
    onAtMs: ENTER_MS,
    onDurMs: DUR_MS,
    offAtMs: LEAVE_MS,
    offDurMs: DUR_MS,
    onEase: EASE_OUT_EXPO,
    offEase: EASE_OUT_EXPO,
  });

  const lift = -4 * hover;

  const stageW = 560 * unit;
  const stageH = 232 * unit;
  const cardW = 280 * unit;
  const cardH = 168 * unit;
  const cardLeft = (stageW - cardW) / 2;
  const cardTop = 34 * unit;

  return (
    <SpecStage
      caseRef="Case 17"
      title="Card — hover lift"
      css="transform: translateY(-4px) + box-shadow --shadow-base → --shadow-lg · 200ms var(--ease-out-expo) · replaces transition-all, which also tweens border-color and background-color"
      reduced="Shipped already: transform: none, transition: box-shadow 200ms ease. The shadow still answers the pointer."
      phases={[
        { label: "enter", fromMs: ENTER_MS, toMs: ENTER_MS + DUR_MS },
        { label: "hovered", fromMs: ENTER_MS + DUR_MS, toMs: LEAVE_MS, tone: "muted" },
        { label: "leave", fromMs: LEAVE_MS, toMs: LEAVE_MS + DUR_MS, tone: "cyan" },
      ]}
      elapsedMs={framesToMs(wrap(frame, PERIOD), fps)}
      totalMs={framesToMs(PERIOD, fps)}
      unit={unit}
    >
      <div style={{ position: "relative", width: stageW, height: stageH }}>
        {/* Rest-position guide. A 4px lift is worth specifying precisely
            because it is barely visible on its own — that is the design. */}
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
            left: cardLeft + cardW + 20 * unit,
            top: cardTop + cardH - 6 * unit,
            fontFamily: MONO_FONT,
            fontSize: 9.5 * unit,
            color: BRAND.mutedForeground,
          }}
        >
          rest baseline
        </div>

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
            // border-color is NOT in the transition list. It is a constant.
            border: `${1 * unit}px solid ${BRAND.border}`,
            boxShadow: shadowBlend(unit, "base", "lg", hover),
            transform: `translateY(${lift * unit}px)`,
            overflow: "hidden",
          }}
        >
          {/* The photo. It does not zoom — that is case 34, a different job. */}
          <div
            style={{
              height: 84 * unit,
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
            <div
              style={{
                marginTop: 8 * unit,
                fontFamily: MONO_FONT,
                fontSize: 12 * unit,
                color: BRAND.primary,
              }}
            >
              {price}
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: cardLeft,
            top: cardTop - 32 * unit,
          }}
        >
          <StateChip unit={unit} label=":hover" active={hover} />
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
          {`box-shadow base → lg, ${(hover * 100).toFixed(0)}%`}
        </div>

        <Pointer
          unit={unit}
          x={cardLeft + cardW * 0.72}
          y={cardTop + cardH * 0.62}
          opacity={hover}
        />
      </div>
    </SpecStage>
  );
};
