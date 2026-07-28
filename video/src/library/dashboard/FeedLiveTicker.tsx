/**
 * FeedLiveTicker — the always-on bookings ticker for an owner's wall display
 * or the /owner/bookings side rail, scrolling the day's confirmed slots.
 * A seamless loop: the list is a wrap() lattice — it translates by exactly one
 * full list height per cycle against a doubled copy, so the seam is invisible.
 */

import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  breathe,
  cardSurface,
  courtGreen,
  dram,
  eyebrowStyle,
  hairline,
  loopT,
  muted,
  useMotionFrame,
  wrap,
} from "./dashboardKit";

const CANVAS_W = 720;

export type TickerBooking = {
  id: string;
  venueName: string;
  whenLabel: string;
  amount: number;
};

export type FeedLiveTickerProps = {
  /** The rows to cycle. Any length; the loop scrolls exactly one list height. */
  bookings: TickerBooking[];
  /** Card heading. */
  title: string;
  /** Row height in design units (the 720-wide canvas). */
  rowHeight: number;
  /** How many full list heights scroll past per loop. Whole numbers only. */
  listsPerLoop: number;
};

export const feedLiveTickerDefaultProps: FeedLiveTickerProps = {
  bookings: [
    {
      id: "t1",
      venueName: "Ararat Arena · Court 1",
      whenLabel: "18:00 – 19:00",
      amount: 16000,
    },
    {
      id: "t2",
      venueName: "Ararat Arena · Court 2",
      whenLabel: "18:00 – 19:00",
      amount: 16000,
    },
    {
      id: "t3",
      venueName: "Nairi Hall",
      whenLabel: "19:00 – 20:00",
      amount: 15000,
    },
    {
      id: "t4",
      venueName: "Ararat Arena · Court 1",
      whenLabel: "20:00 – 21:00",
      amount: 16000,
    },
    {
      id: "t5",
      venueName: "Vanadzor Dome",
      whenLabel: "20:00 – 22:00",
      amount: 24000,
    },
    {
      id: "t6",
      venueName: "Nairi Hall",
      whenLabel: "21:00 – 22:00",
      amount: 15000,
    },
    {
      id: "t7",
      venueName: "Ararat Arena · Court 2",
      whenLabel: "21:00 – 22:00",
      amount: 16000,
    },
  ],
  title: "Booked today",
  rowHeight: 88,
  listsPerLoop: 1,
};

/**
 * ── Why it loops ─────────────────────────────────────────────────────────
 * The list is rendered twice, one copy directly beneath the other, and the
 * pair translates upward by `listsPerLoop · listHeight` over the cycle. At
 * t = 1 the translation is a whole number of list heights, so copy 2 sits
 * exactly where copy 1 sat at t = 0 — the frames are identical rather than
 * merely similar. `wrap()` keeps the offset inside one list height so the
 * doubled copy is always enough to cover the viewport.
 *
 * The header dot's glow rides `breathe(t)`, one full cosine period. Nothing
 * counts, and no figure changes: these are facts already on the books.
 */
export const FeedLiveTicker: FC<FeedLiveTickerProps> = ({
  bookings,
  title,
  rowHeight,
  listsPerLoop,
}) => {
  const rawFrame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const unit = width / CANVAS_W;

  // Loop: frame 0 both opens and closes the cycle.
  const frame = useMotionFrame(rawFrame, 0);
  const t = loopT(frame, durationInFrames);
  const glow = breathe(t);

  const rows = bookings.length > 0 ? bookings : [];
  const rowH = Math.max(24, rowHeight) * unit;
  const listHeight = Math.max(1, rows.length) * rowH;
  const lists = Math.max(1, Math.round(listsPerLoop));

  /** Inside one list height, always — the doubled copy covers the rest. */
  const offset = wrap(t * lists * listHeight, listHeight);

  const headerH = 84 * unit;
  const dayTotal = rows.reduce((s, r) => s + Math.max(0, r.amount), 0);

  const renderList = (copy: number) =>
    rows.map((row, i) => (
      <div
        key={`${copy}-${row.id}`}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: copy * listHeight + i * rowH,
          height: rowH,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${24 * unit}px`,
          borderBottom: `${1 * unit}px solid ${hairline(0.7)}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 * unit }}>
          <div
            style={{
              width: 8 * unit,
              height: 8 * unit,
              borderRadius: 999,
              backgroundColor: courtGreen(0.85),
              flexShrink: 0,
            }}
          />
          <div
            style={{ display: "flex", flexDirection: "column", gap: 4 * unit }}
          >
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 17 * unit,
                fontWeight: 600,
                color: BRAND.foreground,
              }}
            >
              {row.venueName}
            </span>
            <span
              style={{
                fontFamily: SANS_FONT,
                fontSize: 14 * unit,
                color: muted(0.95),
              }}
            >
              {row.whenLabel}
            </span>
          </div>
        </div>
        <span
          style={{
            fontFamily: MONO_FONT,
            fontVariantNumeric: "tabular-nums",
            fontSize: 19 * unit,
            fontWeight: 500,
            color: BRAND.foreground,
          }}
        >
          {dram(row.amount)}
        </span>
      </div>
    ));

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.background }}>
      <div
        style={{
          position: "absolute",
          inset: 22 * unit,
          ...cardSurface(unit, 22),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 24 * unit,
            right: 24 * unit,
            top: 24 * unit,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 11 * unit }}
          >
            <div
              style={{
                width: 9 * unit,
                height: 9 * unit,
                borderRadius: 999,
                backgroundColor: BRAND.primary,
                boxShadow: `0 0 ${(10 + 12 * glow) * unit}px ${courtGreen(0.3 + 0.35 * glow)}`,
              }}
            />
            <span style={{ ...eyebrowStyle(unit * 1.05) }}>{title}</span>
          </div>
          <span
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 24 * unit,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: BRAND.foreground,
            }}
          >
            {dram(dayTotal)}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: headerH,
            bottom: 0,
            overflow: "hidden",
            WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, #000 7%, #000 88%, transparent 100%)`,
            maskImage: `linear-gradient(to bottom, transparent 0%, #000 7%, #000 88%, transparent 100%)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: listHeight * 3,
              transform: `translateY(${(-offset).toFixed(3)}px)`,
            }}
          >
            {/* Three copies, not two: `offset` runs to just under one list
                height, so two copies can leave the bottom of a tall viewport
                uncovered. The third costs nothing and removes the case. */}
            {renderList(0)}
            {renderList(1)}
            {renderList(2)}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 24 * unit,
            right: 24 * unit,
            top: headerH - 1 * unit,
            height: 1 * unit,
            backgroundColor: hairline(1),
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
