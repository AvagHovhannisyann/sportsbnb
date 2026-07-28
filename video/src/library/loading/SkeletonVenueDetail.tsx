/**
 * SkeletonVenueDetail — the whole-page placeholder for `VenueDetailsPage`
 * while the venue query resolves: gallery, title block, amenity grid, the
 * description column, and the sticky booking panel on the right.
 *
 * ── Why it loops ──────────────────────────────────────────────────────────
 * The sheen is a tiled gradient of exactly `SWEEP_PERIOD` px shifted by exactly
 * one tile per cycle (a modulo cycle — the identity map, so no snap), at an
 * intensity of `sin²(πt)` which is exactly 0 at both ends. The booking panel's
 * elevation is `loopPulse`, exactly 0 at both ends of its own cycle. Because
 * the shimmer phase is computed from *global* stage coordinates, one wavefront
 * crosses the gallery, the column and the panel together instead of each block
 * running its own unrelated shimmer.
 */

import type { FC } from "react";
import { AbsoluteFill } from "remotion";

import {
  C,
  CourtBackdrop,
  Eyebrow,
  Rule,
  ShimmerBlock,
  SkeletonPanel,
  Stage,
  cosWave,
  loopPulse,
  primary,
  sheenAxis,
  useLoopClock,
  useSweep,
  wrap,
} from "./shared";

export type SkeletonVenueDetailProps = {
  /** Thumbnails under the hero gallery. */
  thumbnailCount: number;
  /** Amenity tiles in the two-column grid. */
  amenityCount: number;
  /** Paragraph lines in the description block. */
  paragraphLines: number;
  /** Draw the sticky booking panel on the right. */
  showBookingPanel: boolean;
  /** Caption above the page. Empty string hides it. */
  label: string;
};

export const skeletonVenueDetailDefaultProps: SkeletonVenueDetailProps = {
  thumbnailCount: 4,
  amenityCount: 6,
  paragraphLines: 4,
  showBookingPanel: true,
  label: "Loading venue",
};

const STAGE_W = 1280;
const STAGE_H = 860;
const SWEEP_PERIOD = 1840;
const SWEEP_START = -280;

const PAGE_X = 72;
const COL_W = 716;
const PANEL_X = 828;
const PANEL_W = 380;

export const SkeletonVenueDetail: FC<SkeletonVenueDetailProps> = ({
  thumbnailCount,
  amenityCount,
  paragraphLines,
  showBookingPanel,
  label,
}) => {
  const clock = useLoopClock();
  const { t, frame, fps, period, reduced } = clock;
  const sweep = useSweep(clock, SWEEP_PERIOD, SWEEP_START);

  const passFrame = (gx: number, gy: number, w: number, h: number): number =>
    ((sheenAxis(gx + w / 2, gy + h / 2) - SWEEP_START) / SWEEP_PERIOD) * period;

  const liftOf = (gx: number, gy: number, w: number, h: number): number =>
    reduced
      ? 0
      : loopPulse({
          frame,
          fps,
          period,
          phase: wrap(passFrame(gx, gy, w, h) - 8, period),
          rise: 16,
          hold: 28,
          fall: 20,
        });

  const thumbs = Math.max(0, Math.round(thumbnailCount));
  const thumbW = thumbs > 0 ? (COL_W - (thumbs - 1) * 14) / thumbs : 0;
  const amenities = Math.max(0, Math.round(amenityCount));
  const lines = Math.max(0, Math.round(paragraphLines));

  const GALLERY_Y = 120;
  const GALLERY_H = 340;
  const THUMB_Y = GALLERY_Y + GALLERY_H + 14;
  const TITLE_Y = THUMB_Y + 86;
  const AMENITY_Y = TITLE_Y + 108;
  const DESC_Y = AMENITY_Y + Math.ceil(amenities / 2) * 54 + 34;

  return (
    <Stage w={STAGE_W} h={STAGE_H}>
      <CourtBackdrop t={t} bloom={0.1} vignette={0.5} />

      <AbsoluteFill>
        {/* Breadcrumb row — the real page's back link and share/save buttons. */}
        {label.length > 0 ? (
          <Eyebrow x={PAGE_X} y={72} color={primary(0.5 + 0.26 * cosWave(t))}>
            {label}
          </Eyebrow>
        ) : null}
        <ShimmerBlock
          sweep={sweep}
          x={STAGE_W - PAGE_X - 196}
          y={64}
          w={90}
          h={30}
          r={15}
          tone="soft"
        />
        <ShimmerBlock
          sweep={sweep}
          x={STAGE_W - PAGE_X - 96}
          y={64}
          w={96}
          h={30}
          r={15}
          tone="soft"
        />

        {/* Hero gallery + thumbnail strip. */}
        <ShimmerBlock
          sweep={sweep}
          x={PAGE_X}
          y={GALLERY_Y}
          w={COL_W}
          h={GALLERY_H}
          r={22}
          tone="strong"
        />
        {Array.from({ length: thumbs }, (_, i) => (
          <ShimmerBlock
            key={i}
            sweep={sweep}
            x={PAGE_X + i * (thumbW + 14)}
            y={THUMB_Y}
            w={thumbW}
            h={68}
            r={12}
            tone="soft"
          />
        ))}

        {/* Title, location line, rating. */}
        <ShimmerBlock
          sweep={sweep}
          x={PAGE_X}
          y={TITLE_Y}
          w={430}
          h={30}
          r={15}
          tone="strong"
        />
        <ShimmerBlock
          sweep={sweep}
          x={PAGE_X}
          y={TITLE_Y + 46}
          w={286}
          h={16}
          r={8}
          tone="soft"
        />
        <ShimmerBlock
          sweep={sweep}
          x={PAGE_X + COL_W - 148}
          y={TITLE_Y + 4}
          w={148}
          h={22}
          r={11}
          tone="brand"
        />

        <Rule x={PAGE_X} y={AMENITY_Y - 22} w={COL_W} />

        {/* Amenity grid — two columns, icon + label per row. */}
        {Array.from({ length: amenities }, (_, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = PAGE_X + col * (COL_W / 2);
          const y = AMENITY_Y + row * 54;
          return (
            <div key={i}>
              <ShimmerBlock
                sweep={sweep}
                x={x}
                y={y}
                w={30}
                h={30}
                r={10}
                tone="soft"
              />
              <ShimmerBlock
                sweep={sweep}
                x={x + 44}
                y={y + 9}
                w={140 + ((i * 37) % 70)}
                h={13}
                r={7}
                tone="faint"
              />
            </div>
          );
        })}

        <Rule x={PAGE_X} y={DESC_Y - 24} w={COL_W} />

        {/* Description paragraph. The last line is short, as prose is. */}
        {Array.from({ length: lines }, (_, i) => (
          <ShimmerBlock
            key={i}
            sweep={sweep}
            x={PAGE_X}
            y={DESC_Y + i * 26}
            w={i === lines - 1 ? COL_W * 0.52 : COL_W}
            h={13}
            r={7}
            tone="faint"
          />
        ))}

        {/* Sticky booking panel. */}
        {showBookingPanel ? (
          <SkeletonPanel
            x={PANEL_X}
            y={GALLERY_Y}
            w={PANEL_W}
            h={468}
            r={24}
            lift={liftOf(PANEL_X, GALLERY_Y, PANEL_W, 468)}
            background={C.surface2}
          >
            <ShimmerBlock
              sweep={sweep}
              ox={PANEL_X}
              oy={GALLERY_Y}
              x={26}
              y={28}
              w={168}
              h={26}
              r={13}
              tone="brand"
            />
            <ShimmerBlock
              sweep={sweep}
              ox={PANEL_X}
              oy={GALLERY_Y}
              x={26}
              y={66}
              w={104}
              h={13}
              r={7}
              tone="faint"
            />

            <div
              style={{
                position: "absolute",
                left: 26,
                top: 104,
                width: PANEL_W - 52,
                height: 1,
                backgroundColor: C.border,
              }}
            />

            <ShimmerBlock
              sweep={sweep}
              ox={PANEL_X}
              oy={GALLERY_Y}
              x={26}
              y={128}
              w={PANEL_W - 52}
              h={52}
              r={14}
              tone="soft"
            />
            <ShimmerBlock
              sweep={sweep}
              ox={PANEL_X}
              oy={GALLERY_Y}
              x={26}
              y={192}
              w={(PANEL_W - 64) / 2}
              h={52}
              r={14}
              tone="soft"
            />
            <ShimmerBlock
              sweep={sweep}
              ox={PANEL_X}
              oy={GALLERY_Y}
              x={26 + (PANEL_W - 64) / 2 + 12}
              y={192}
              w={(PANEL_W - 64) / 2}
              h={52}
              r={14}
              tone="soft"
            />

            {[0, 1, 2].map((i) => (
              <div key={i}>
                <ShimmerBlock
                  sweep={sweep}
                  ox={PANEL_X}
                  oy={GALLERY_Y}
                  x={26}
                  y={272 + i * 30}
                  w={130}
                  h={12}
                  r={6}
                  tone="faint"
                />
                <ShimmerBlock
                  sweep={sweep}
                  ox={PANEL_X}
                  oy={GALLERY_Y}
                  x={PANEL_W - 26 - 82}
                  y={272 + i * 30}
                  w={82}
                  h={12}
                  r={6}
                  tone="soft"
                />
              </div>
            ))}

            <ShimmerBlock
              sweep={sweep}
              ox={PANEL_X}
              oy={GALLERY_Y}
              x={26}
              y={382}
              w={PANEL_W - 52}
              h={54}
              r={16}
              tone="brand"
            />
          </SkeletonPanel>
        ) : null}
      </AbsoluteFill>
    </Stage>
  );
};
