/**
 * Composition metadata — the one place duration/fps/size are written down.
 *
 * These numbers have two consumers that cannot see each other's config:
 * `video/src/Root.tsx` registers `<Composition>`s with them for `remotion
 * render` and the Studio, and `<Player>` in the app takes the identical four
 * values as props. Duplicating them is a silent failure rather than a loud
 * one — a Player told `durationInFrames: 60` for a 180-frame loop does not
 * error, it just plays the first third and wraps, which looks like a
 * badly-authored animation rather than a mismatched constant.
 */

export type CompositionMetadata = {
  readonly durationInFrames: number;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
};

/** Square logo animation, 2s @ 30fps. Seamless loop. */
export const BRAND_LOADER: CompositionMetadata = {
  durationInFrames: 60,
  fps: 30,
  width: 600,
  height: 600,
};

/** Landscape ambient plate, 6s @ 30fps. Seamless loop. */
export const HERO_BACKDROP: CompositionMetadata = {
  durationInFrames: 180,
  fps: 30,
  width: 1920,
  height: 1080,
};
