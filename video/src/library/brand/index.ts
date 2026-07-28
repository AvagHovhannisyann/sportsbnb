/**
 * The SportsBnB brand & identity composition family — 25 pieces covering logo
 * build-ons, wordmark reveals, monogram marks, seamless loader loops, sign-off
 * cards, lower thirds, scene stingers and corner bugs.
 *
 * `brandCompositions` below describes every one of them, so registering the
 * family in `Root.tsx` is mechanical:
 *
 *   {brandCompositions.map((c) => (
 *     <Composition
 *       key={c.id}
 *       id={c.id}
 *       component={c.component}
 *       durationInFrames={c.durationInFrames}
 *       fps={c.fps}
 *       width={c.width}
 *       height={c.height}
 *       defaultProps={c.defaultProps}
 *     />
 *   ))}
 */

import type { FC } from "react";

/* ─────────────────────────── shared modules ───────────────────────────── */

export {
  BRAND,
  DISPLAY_FONT,
  MONO_FONT,
  SANS_FONT,
  bloom,
  bloomWindow,
  loopT,
  popPulse,
  staggerPhase,
  useBrandFrame,
  wrap,
} from "./brandKit";
export {
  LockupWordmark,
  MarkTile,
  MonogramGlyph,
  PITCH_STROKES,
  PitchGlyph,
  StagePlate,
  WORDMARK_HEAD,
  WORDMARK_TAIL,
} from "./BrandGeometry";

/* ───────────────────────── logo build-ons (4) ─────────────────────────── */

import { LogoDraw, logoDrawDefaultProps } from "./LogoDraw";
import { LogoScaleIn, logoScaleInDefaultProps } from "./LogoScaleIn";
import { LogoMaskReveal, logoMaskRevealDefaultProps } from "./LogoMaskReveal";
import { LogoParticleSettle, logoParticleSettleDefaultProps } from "./LogoParticleSettle";

export { LogoDraw, logoDrawDefaultProps } from "./LogoDraw";
export type { LogoDrawProps } from "./LogoDraw";
export { LogoScaleIn, logoScaleInDefaultProps } from "./LogoScaleIn";
export type { LogoScaleInProps } from "./LogoScaleIn";
export { LogoMaskReveal, logoMaskRevealDefaultProps } from "./LogoMaskReveal";
export type { LogoMaskRevealProps } from "./LogoMaskReveal";
export { LogoParticleSettle, logoParticleSettleDefaultProps } from "./LogoParticleSettle";
export type { LogoParticleSettleProps } from "./LogoParticleSettle";

/* ───────────────────────── wordmark reveals (3) ───────────────────────── */

import { WordmarkSlide, wordmarkSlideDefaultProps } from "./WordmarkSlide";
import { WordmarkTypeOn, wordmarkTypeOnDefaultProps } from "./WordmarkTypeOn";
import {
  WordmarkUnderlineWipe,
  wordmarkUnderlineWipeDefaultProps,
} from "./WordmarkUnderlineWipe";

export { WordmarkSlide, wordmarkSlideDefaultProps } from "./WordmarkSlide";
export type { WordmarkSlideProps } from "./WordmarkSlide";
export { WordmarkTypeOn, wordmarkTypeOnDefaultProps } from "./WordmarkTypeOn";
export type { WordmarkTypeOnProps } from "./WordmarkTypeOn";
export {
  WordmarkUnderlineWipe,
  wordmarkUnderlineWipeDefaultProps,
} from "./WordmarkUnderlineWipe";
export type { WordmarkUnderlineWipeProps } from "./WordmarkUnderlineWipe";

/* ────────────────────────── monogram marks (3) ────────────────────────── */

import { MonogramStamp, monogramStampDefaultProps } from "./MonogramStamp";
import {
  MonogramFaviconScale,
  monogramFaviconScaleDefaultProps,
} from "./MonogramFaviconScale";
import { MonogramFlip, monogramFlipDefaultProps } from "./MonogramFlip";

export { MonogramStamp, monogramStampDefaultProps } from "./MonogramStamp";
export type { MonogramStampProps } from "./MonogramStamp";
export {
  MonogramFaviconScale,
  monogramFaviconScaleDefaultProps,
} from "./MonogramFaviconScale";
export type { MonogramFaviconScaleProps } from "./MonogramFaviconScale";
export { MonogramFlip, monogramFlipDefaultProps } from "./MonogramFlip";
export type { MonogramFlipProps } from "./MonogramFlip";

/* ─────────────────────── seamless brand loops (4) ─────────────────────── */

import { LoopPulse, loopPulseDefaultProps } from "./LoopPulse";
import { LoopOrbit, loopOrbitDefaultProps } from "./LoopOrbit";
import { LoopDashCycle, loopDashCycleDefaultProps } from "./LoopDashCycle";
import { LoopShimmerBar, loopShimmerBarDefaultProps } from "./LoopShimmerBar";

export { LoopPulse, loopPulseDefaultProps } from "./LoopPulse";
export type { LoopPulseProps } from "./LoopPulse";
export { LoopOrbit, loopOrbitDefaultProps } from "./LoopOrbit";
export type { LoopOrbitProps } from "./LoopOrbit";
export { LoopDashCycle, loopDashCycleDefaultProps } from "./LoopDashCycle";
export type { LoopDashCycleProps } from "./LoopDashCycle";
export { LoopShimmerBar, loopShimmerBarDefaultProps } from "./LoopShimmerBar";
export type { LoopShimmerBarProps } from "./LoopShimmerBar";

/* ────────────────────────── sign-off cards (3) ────────────────────────── */

import { SignOffLockup, signOffLockupDefaultProps } from "./SignOffLockup";
import { SignOffCTA, signOffCTADefaultProps } from "./SignOffCTA";
import { SignOffCredits, signOffCreditsDefaultProps } from "./SignOffCredits";

export { SignOffLockup, signOffLockupDefaultProps } from "./SignOffLockup";
export type { SignOffLockupProps } from "./SignOffLockup";
export { SignOffCTA, signOffCTADefaultProps } from "./SignOffCTA";
export type { SignOffCTAProps } from "./SignOffCTA";
export { SignOffCredits, signOffCreditsDefaultProps } from "./SignOffCredits";
export type { CreditRow, SignOffCreditsProps } from "./SignOffCredits";

/* ──────────────────────────── lower thirds (3) ────────────────────────── */

import { LowerThirdName, lowerThirdNameDefaultProps } from "./LowerThirdName";
import { LowerThirdVenue, lowerThirdVenueDefaultProps } from "./LowerThirdVenue";
import { LowerThirdStat, lowerThirdStatDefaultProps } from "./LowerThirdStat";

export { LowerThirdName, lowerThirdNameDefaultProps } from "./LowerThirdName";
export type { LowerThirdNameProps } from "./LowerThirdName";
export { LowerThirdVenue, lowerThirdVenueDefaultProps } from "./LowerThirdVenue";
export type { LowerThirdVenueProps } from "./LowerThirdVenue";
export { LowerThirdStat, lowerThirdStatDefaultProps } from "./LowerThirdStat";
export type { LowerThirdStatProps } from "./LowerThirdStat";

/* ───────────────────────────── stingers (3) ──────────────────────────── */

import { StingerWipe, stingerWipeDefaultProps } from "./StingerWipe";
import { StingerShutter, stingerShutterDefaultProps } from "./StingerShutter";
import { StingerLogoPop, stingerLogoPopDefaultProps } from "./StingerLogoPop";

export { StingerWipe, stingerWipeDefaultProps } from "./StingerWipe";
export type { StingerWipeProps } from "./StingerWipe";
export { StingerShutter, stingerShutterDefaultProps } from "./StingerShutter";
export type { StingerShutterProps } from "./StingerShutter";
export { StingerLogoPop, stingerLogoPopDefaultProps } from "./StingerLogoPop";
export type { StingerLogoPopProps } from "./StingerLogoPop";

/* ──────────────────────────── watermarks (2) ─────────────────────────── */

import {
  WatermarkCornerBug,
  watermarkCornerBugDefaultProps,
} from "./WatermarkCornerBug";
import {
  WatermarkLiveBadge,
  watermarkLiveBadgeDefaultProps,
} from "./WatermarkLiveBadge";

export {
  WatermarkCornerBug,
  watermarkCornerBugDefaultProps,
} from "./WatermarkCornerBug";
export type { WatermarkCornerBugProps } from "./WatermarkCornerBug";
export {
  WatermarkLiveBadge,
  watermarkLiveBadgeDefaultProps,
} from "./WatermarkLiveBadge";
export type { WatermarkLiveBadgeProps } from "./WatermarkLiveBadge";

/* ──────────────────────── the registration manifest ───────────────────── */

export type BrandCompositionEntry = {
  readonly id: string;
  /**
   * The component with its prop type erased. `<Composition>` requires
   * `component` and `defaultProps` to agree on one `Props extends
   * Record<string, unknown>`; erasing both to that base is what lets a
   * heterogeneous list be mapped over in JSX without 25 separate call sites.
   * The pairing is still checked — see `entry()` below.
   */
  readonly component: FC<Record<string, unknown>>;
  readonly durationInFrames: number;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly defaultProps: Record<string, unknown>;
};

type Layout = {
  readonly durationInFrames: number;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Builds one manifest row. `P` is inferred from the component *and* the
 * defaults, so handing `LogoDraw` the wrong defaults is a compile error here
 * even though the row that comes out is type-erased.
 */
const entry = <P extends Record<string, unknown>>(
  id: string,
  component: FC<P>,
  defaultProps: P,
  layout: Layout,
): BrandCompositionEntry => ({
  id,
  component: component as unknown as FC<Record<string, unknown>>,
  defaultProps,
  ...layout,
});

/** 1080² for square build-ons, 16:9 for anything that sits in a timeline. */
const SQUARE: Layout = { durationInFrames: 90, fps: 30, width: 1080, height: 1080 };
const WIDE: Layout = { durationInFrames: 150, fps: 30, width: 1920, height: 1080 };

const withDuration = (layout: Layout, durationInFrames: number): Layout => ({
  ...layout,
  durationInFrames,
});

export const brandCompositions: readonly BrandCompositionEntry[] = [
  /* Logo build-ons */
  entry("Brand-LogoDraw", LogoDraw, logoDrawDefaultProps, withDuration(SQUARE, 105)),
  entry("Brand-LogoScaleIn", LogoScaleIn, logoScaleInDefaultProps, withDuration(SQUARE, 90)),
  entry(
    "Brand-LogoMaskReveal",
    LogoMaskReveal,
    logoMaskRevealDefaultProps,
    withDuration(SQUARE, 96),
  ),
  entry(
    "Brand-LogoParticleSettle",
    LogoParticleSettle,
    logoParticleSettleDefaultProps,
    withDuration(SQUARE, 126),
  ),

  /* Wordmark reveals */
  entry(
    "Brand-WordmarkSlide",
    WordmarkSlide,
    wordmarkSlideDefaultProps,
    withDuration(WIDE, 108),
  ),
  entry(
    "Brand-WordmarkTypeOn",
    WordmarkTypeOn,
    wordmarkTypeOnDefaultProps,
    withDuration(WIDE, 126),
  ),
  entry(
    "Brand-WordmarkUnderlineWipe",
    WordmarkUnderlineWipe,
    wordmarkUnderlineWipeDefaultProps,
    withDuration(WIDE, 126),
  ),

  /* Monogram / favicon-scale marks */
  entry(
    "Brand-MonogramStamp",
    MonogramStamp,
    monogramStampDefaultProps,
    withDuration(SQUARE, 78),
  ),
  entry(
    "Brand-MonogramFaviconScale",
    MonogramFaviconScale,
    monogramFaviconScaleDefaultProps,
    withDuration(WIDE, 150),
  ),
  entry("Brand-MonogramFlip", MonogramFlip, monogramFlipDefaultProps, withDuration(SQUARE, 105)),

  /* Seamless loops. Four deliberately different rhythms: 3s ambient, 4s
     orbital, 1.6s snappy, 1.33s quick. */
  entry("Brand-LoopPulse", LoopPulse, loopPulseDefaultProps, {
    durationInFrames: 90,
    fps: 30,
    width: 600,
    height: 600,
  }),
  entry("Brand-LoopOrbit", LoopOrbit, loopOrbitDefaultProps, {
    durationInFrames: 120,
    fps: 30,
    width: 600,
    height: 600,
  }),
  entry("Brand-LoopDashCycle", LoopDashCycle, loopDashCycleDefaultProps, {
    durationInFrames: 48,
    fps: 30,
    width: 600,
    height: 600,
  }),
  entry("Brand-LoopShimmerBar", LoopShimmerBar, loopShimmerBarDefaultProps, {
    durationInFrames: 40,
    fps: 30,
    width: 960,
    height: 120,
  }),

  /* Sign-off cards */
  entry("Brand-SignOffLockup", SignOffLockup, signOffLockupDefaultProps, withDuration(WIDE, 150)),
  entry("Brand-SignOffCTA", SignOffCTA, signOffCTADefaultProps, withDuration(WIDE, 180)),
  entry(
    "Brand-SignOffCredits",
    SignOffCredits,
    signOffCreditsDefaultProps,
    withDuration(WIDE, 210),
  ),

  /* Lower thirds. Durations leave room after each plate's default exit frame. */
  entry(
    "Brand-LowerThirdName",
    LowerThirdName,
    lowerThirdNameDefaultProps,
    withDuration(WIDE, 180),
  ),
  entry(
    "Brand-LowerThirdVenue",
    LowerThirdVenue,
    lowerThirdVenueDefaultProps,
    withDuration(WIDE, 210),
  ),
  entry(
    "Brand-LowerThirdStat",
    LowerThirdStat,
    lowerThirdStatDefaultProps,
    withDuration(WIDE, 186),
  ),

  /* Stingers — short by design; they are cut under, not watched. */
  entry("Brand-StingerWipe", StingerWipe, stingerWipeDefaultProps, withDuration(WIDE, 36)),
  entry(
    "Brand-StingerShutter",
    StingerShutter,
    stingerShutterDefaultProps,
    withDuration(WIDE, 66),
  ),
  entry(
    "Brand-StingerLogoPop",
    StingerLogoPop,
    stingerLogoPopDefaultProps,
    withDuration(WIDE, 45),
  ),

  /* Watermarks — small plates, composited over footage. */
  entry("Brand-WatermarkCornerBug", WatermarkCornerBug, watermarkCornerBugDefaultProps, {
    durationInFrames: 90,
    fps: 30,
    width: 480,
    height: 160,
  }),
  entry("Brand-WatermarkLiveBadge", WatermarkLiveBadge, watermarkLiveBadgeDefaultProps, {
    durationInFrames: 60,
    fps: 30,
    width: 360,
    height: 120,
  }),
];
