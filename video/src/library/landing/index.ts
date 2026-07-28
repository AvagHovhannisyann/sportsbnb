/**
 * Landing & marketing composition family — the 25 pieces that support
 * `src/pages/HomePage.tsx` and the marketing surfaces around it.
 *
 * Every composition is self-contained: no network of any kind, no `<Img>`, no
 * `@font-face`, no remote CSS. Colours come from the `.dark` ("Court at
 * night") block of `src/index.css` and type from the documented system tails
 * of the three brand stacks, so a headless render never waits on a fetch.
 *
 * The five `Hero*` plates are seamless ambient loops — frame 0 and frame
 * `durationInFrames` are identical by construction, so they can be dropped
 * behind headline copy with `loop` and never show a seam. Everything else is a
 * one-shot reveal that settles and holds.
 */

import type { ComponentType } from "react";

/* ── ambient hero backdrops (5) — all seamless loops ───────────────────── */
export {
  HeroAuroraDrift,
  heroAuroraDriftDefaultProps,
  type HeroAuroraDriftProps,
} from "./HeroAuroraDrift";
export {
  HeroPitchLines,
  heroPitchLinesDefaultProps,
  type HeroPitchLinesProps,
} from "./HeroPitchLines";
export {
  HeroFloodlightHaze,
  heroFloodlightHazeDefaultProps,
  type HeroFloodlightHazeProps,
} from "./HeroFloodlightHaze";
export {
  HeroCourtGridPulse,
  heroCourtGridPulseDefaultProps,
  type HeroCourtGridPulseProps,
} from "./HeroCourtGridPulse";
export {
  HeroAraratRidge,
  heroAraratRidgeDefaultProps,
  type HeroAraratRidgeProps,
} from "./HeroAraratRidge";

/* ── headline / value-prop reveals (4) ─────────────────────────────────── */
export {
  HeadlineBookTheCourt,
  headlineBookTheCourtDefaultProps,
  type HeadlineBookTheCourtProps,
} from "./HeadlineBookTheCourt";
export {
  ValuePropZeroCommission,
  valuePropZeroCommissionDefaultProps,
  type ValuePropZeroCommissionProps,
} from "./ValuePropZeroCommission";
export {
  HeadlineSlotIsYours,
  headlineSlotIsYoursDefaultProps,
  type HeadlineSlotIsYoursProps,
} from "./HeadlineSlotIsYours";
export {
  ValuePropLiveAvailability,
  valuePropLiveAvailabilityDefaultProps,
  type ValuePropLiveAvailabilityProps,
} from "./ValuePropLiveAvailability";

/* ── animated stat counters (3) ────────────────────────────────────────── */
export {
  StatVenuesListed,
  statVenuesListedDefaultProps,
  type StatVenuesListedProps,
} from "./StatVenuesListed";
export {
  StatHoursBooked,
  statHoursBookedDefaultProps,
  type StatHoursBookedProps,
} from "./StatHoursBooked";
export {
  StatCitiesCovered,
  statCitiesCoveredDefaultProps,
  type StatCitiesCoveredProps,
} from "./StatCitiesCovered";

/* ── feature explainer scenes (4) ──────────────────────────────────────── */
export {
  FeatureSearchScene,
  featureSearchSceneDefaultProps,
  type FeatureSearchSceneProps,
} from "./FeatureSearchScene";
export {
  FeatureBookScene,
  featureBookSceneDefaultProps,
  type FeatureBookSceneProps,
} from "./FeatureBookScene";
export {
  FeaturePlayScene,
  featurePlaySceneDefaultProps,
  type FeaturePlaySceneProps,
} from "./FeaturePlayScene";
export {
  FeatureManageScene,
  featureManageSceneDefaultProps,
  type FeatureManageSceneProps,
} from "./FeatureManageScene";

/* ── testimonial / social proof (3) ────────────────────────────────────── */
export {
  TestimonialPlayerCard,
  testimonialPlayerCardDefaultProps,
  type TestimonialPlayerCardProps,
} from "./TestimonialPlayerCard";
export {
  TestimonialOwnerCard,
  testimonialOwnerCardDefaultProps,
  type TestimonialOwnerCardProps,
} from "./TestimonialOwnerCard";
export {
  SocialProofRatingCard,
  socialProofRatingCardDefaultProps,
  type SocialProofRatingCardProps,
} from "./SocialProofRatingCard";

/* ── city showcase cards (3) ───────────────────────────────────────────── */
export {
  CityShowcaseYerevan,
  cityShowcaseYerevanDefaultProps,
  type CityShowcaseYerevanProps,
} from "./CityShowcaseYerevan";
export {
  CityShowcaseGyumri,
  cityShowcaseGyumriDefaultProps,
  type CityShowcaseGyumriProps,
} from "./CityShowcaseGyumri";
export {
  CityShowcaseVanadzor,
  cityShowcaseVanadzorDefaultProps,
  type CityShowcaseVanadzorProps,
} from "./CityShowcaseVanadzor";

/* ── call-to-action moments (3) ────────────────────────────────────────── */
export {
  CtaBrowseVenues,
  ctaBrowseVenuesDefaultProps,
  type CtaBrowseVenuesProps,
} from "./CtaBrowseVenues";
export {
  CtaListYourVenue,
  ctaListYourVenueDefaultProps,
  type CtaListYourVenueProps,
} from "./CtaListYourVenue";
export {
  CtaNextGameStory,
  ctaNextGameStoryDefaultProps,
  type CtaNextGameStoryProps,
} from "./CtaNextGameStory";

/* ─────────────────────────── the registry ─────────────────────────────── */

import { HeroAuroraDrift, heroAuroraDriftDefaultProps } from "./HeroAuroraDrift";
import { HeroPitchLines, heroPitchLinesDefaultProps } from "./HeroPitchLines";
import {
  HeroFloodlightHaze,
  heroFloodlightHazeDefaultProps,
} from "./HeroFloodlightHaze";
import {
  HeroCourtGridPulse,
  heroCourtGridPulseDefaultProps,
} from "./HeroCourtGridPulse";
import { HeroAraratRidge, heroAraratRidgeDefaultProps } from "./HeroAraratRidge";
import {
  HeadlineBookTheCourt,
  headlineBookTheCourtDefaultProps,
} from "./HeadlineBookTheCourt";
import {
  ValuePropZeroCommission,
  valuePropZeroCommissionDefaultProps,
} from "./ValuePropZeroCommission";
import {
  HeadlineSlotIsYours,
  headlineSlotIsYoursDefaultProps,
} from "./HeadlineSlotIsYours";
import {
  ValuePropLiveAvailability,
  valuePropLiveAvailabilityDefaultProps,
} from "./ValuePropLiveAvailability";
import {
  StatVenuesListed,
  statVenuesListedDefaultProps,
} from "./StatVenuesListed";
import { StatHoursBooked, statHoursBookedDefaultProps } from "./StatHoursBooked";
import {
  StatCitiesCovered,
  statCitiesCoveredDefaultProps,
} from "./StatCitiesCovered";
import {
  FeatureSearchScene,
  featureSearchSceneDefaultProps,
} from "./FeatureSearchScene";
import { FeatureBookScene, featureBookSceneDefaultProps } from "./FeatureBookScene";
import { FeaturePlayScene, featurePlaySceneDefaultProps } from "./FeaturePlayScene";
import {
  FeatureManageScene,
  featureManageSceneDefaultProps,
} from "./FeatureManageScene";
import {
  TestimonialPlayerCard,
  testimonialPlayerCardDefaultProps,
} from "./TestimonialPlayerCard";
import {
  TestimonialOwnerCard,
  testimonialOwnerCardDefaultProps,
} from "./TestimonialOwnerCard";
import {
  SocialProofRatingCard,
  socialProofRatingCardDefaultProps,
} from "./SocialProofRatingCard";
import {
  CityShowcaseYerevan,
  cityShowcaseYerevanDefaultProps,
} from "./CityShowcaseYerevan";
import {
  CityShowcaseGyumri,
  cityShowcaseGyumriDefaultProps,
} from "./CityShowcaseGyumri";
import {
  CityShowcaseVanadzor,
  cityShowcaseVanadzorDefaultProps,
} from "./CityShowcaseVanadzor";
import { CtaBrowseVenues, ctaBrowseVenuesDefaultProps } from "./CtaBrowseVenues";
import { CtaListYourVenue, ctaListYourVenueDefaultProps } from "./CtaListYourVenue";
import {
  CtaNextGameStory,
  ctaNextGameStoryDefaultProps,
} from "./CtaNextGameStory";

/**
 * One row of the registry — everything `<Composition>` needs, minus the
 * component's own prop type.
 *
 * Props are erased to `Record<string, unknown>` here on purpose. A registry is
 * a heterogeneous list, and with `strictFunctionTypes` an `FC<SpecificProps>`
 * is not assignable to `ComponentType<Record<string, unknown>>` — the variance
 * is genuinely unsound in general. `entry()` below is the one place that
 * narrowing happens, under a signature that checks `component` and
 * `defaultProps` agree *before* the erasure, so the guarantee is enforced at
 * every call site and given up exactly once, in one line, rather than at each
 * of the 25 registrations.
 */
export type LandingCompositionEntry = {
  readonly id: string;
  readonly component: ComponentType<Record<string, unknown>>;
  readonly durationInFrames: number;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly defaultProps: Record<string, unknown>;
  /** Which group of the family this belongs to. */
  readonly group:
    | "hero-backdrop"
    | "headline"
    | "stat"
    | "feature"
    | "testimonial"
    | "city"
    | "cta";
  /** True only for the mathematically seamless ambient plates. */
  readonly seamlessLoop: boolean;
};

type EntryInput<P extends Record<string, unknown>> = {
  readonly id: string;
  readonly component: ComponentType<P>;
  readonly durationInFrames: number;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly defaultProps: P;
  readonly group: LandingCompositionEntry["group"];
  readonly seamlessLoop: boolean;
};

/** Type-checks a registration, then erases its prop type exactly once. */
const entry = <P extends Record<string, unknown>>(
  input: EntryInput<P>,
): LandingCompositionEntry => ({
  id: input.id,
  component: input.component as ComponentType<Record<string, unknown>>,
  durationInFrames: input.durationInFrames,
  fps: input.fps,
  width: input.width,
  height: input.height,
  defaultProps: input.defaultProps,
  group: input.group,
  seamlessLoop: input.seamlessLoop,
});

const LANDSCAPE = { width: 1920, height: 1080 } as const;
const SQUARE = { width: 1080, height: 1080 } as const;
const PORTRAIT_CARD = { width: 1080, height: 1350 } as const;
const STORY = { width: 1080, height: 1920 } as const;

export const landingCompositions: readonly LandingCompositionEntry[] = [
  /* ── ambient hero backdrops — seamless loops ──────────────────────────── */
  entry({
    id: "LandingHeroAuroraDrift",
    component: HeroAuroraDrift,
    durationInFrames: 240,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: heroAuroraDriftDefaultProps,
    group: "hero-backdrop",
    seamlessLoop: true,
  }),
  entry({
    id: "LandingHeroPitchLines",
    component: HeroPitchLines,
    durationInFrames: 300,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: heroPitchLinesDefaultProps,
    group: "hero-backdrop",
    seamlessLoop: true,
  }),
  entry({
    id: "LandingHeroFloodlightHaze",
    component: HeroFloodlightHaze,
    durationInFrames: 270,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: heroFloodlightHazeDefaultProps,
    group: "hero-backdrop",
    seamlessLoop: true,
  }),
  entry({
    id: "LandingHeroCourtGridPulse",
    component: HeroCourtGridPulse,
    durationInFrames: 240,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: heroCourtGridPulseDefaultProps,
    group: "hero-backdrop",
    seamlessLoop: true,
  }),
  entry({
    id: "LandingHeroAraratRidge",
    component: HeroAraratRidge,
    durationInFrames: 300,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: heroAraratRidgeDefaultProps,
    group: "hero-backdrop",
    seamlessLoop: true,
  }),

  /* ── headline / value-prop reveals ────────────────────────────────────── */
  entry({
    id: "LandingHeadlineBookTheCourt",
    component: HeadlineBookTheCourt,
    durationInFrames: 240,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: headlineBookTheCourtDefaultProps,
    group: "headline",
    seamlessLoop: false,
  }),
  entry({
    id: "LandingValuePropZeroCommission",
    component: ValuePropZeroCommission,
    durationInFrames: 300,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: valuePropZeroCommissionDefaultProps,
    group: "headline",
    seamlessLoop: false,
  }),
  entry({
    id: "LandingHeadlineSlotIsYours",
    component: HeadlineSlotIsYours,
    durationInFrames: 270,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: headlineSlotIsYoursDefaultProps,
    group: "headline",
    seamlessLoop: false,
  }),
  entry({
    id: "LandingValuePropLiveAvailability",
    component: ValuePropLiveAvailability,
    durationInFrames: 240,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: valuePropLiveAvailabilityDefaultProps,
    group: "headline",
    seamlessLoop: false,
  }),

  /* ── animated stat counters — 60fps for a smooth digit roll ───────────── */
  entry({
    id: "LandingStatVenuesListed",
    component: StatVenuesListed,
    durationInFrames: 360,
    fps: 60,
    ...SQUARE,
    defaultProps: statVenuesListedDefaultProps,
    group: "stat",
    seamlessLoop: false,
  }),
  entry({
    id: "LandingStatHoursBooked",
    component: StatHoursBooked,
    durationInFrames: 360,
    fps: 60,
    ...SQUARE,
    defaultProps: statHoursBookedDefaultProps,
    group: "stat",
    seamlessLoop: false,
  }),
  entry({
    id: "LandingStatCitiesCovered",
    component: StatCitiesCovered,
    durationInFrames: 360,
    fps: 60,
    ...SQUARE,
    defaultProps: statCitiesCoveredDefaultProps,
    group: "stat",
    seamlessLoop: false,
  }),

  /* ── feature explainer scenes ─────────────────────────────────────────── */
  entry({
    id: "LandingFeatureSearch",
    component: FeatureSearchScene,
    durationInFrames: 300,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: featureSearchSceneDefaultProps,
    group: "feature",
    seamlessLoop: false,
  }),
  entry({
    id: "LandingFeatureBook",
    component: FeatureBookScene,
    durationInFrames: 330,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: featureBookSceneDefaultProps,
    group: "feature",
    seamlessLoop: false,
  }),
  entry({
    id: "LandingFeaturePlay",
    component: FeaturePlayScene,
    durationInFrames: 300,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: featurePlaySceneDefaultProps,
    group: "feature",
    seamlessLoop: false,
  }),
  entry({
    id: "LandingFeatureManage",
    component: FeatureManageScene,
    durationInFrames: 330,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: featureManageSceneDefaultProps,
    group: "feature",
    seamlessLoop: false,
  }),

  /* ── testimonial / social proof ───────────────────────────────────────── */
  entry({
    id: "LandingTestimonialPlayer",
    component: TestimonialPlayerCard,
    durationInFrames: 270,
    fps: 30,
    ...PORTRAIT_CARD,
    defaultProps: testimonialPlayerCardDefaultProps,
    group: "testimonial",
    seamlessLoop: false,
  }),
  entry({
    id: "LandingTestimonialOwner",
    component: TestimonialOwnerCard,
    durationInFrames: 300,
    fps: 30,
    ...PORTRAIT_CARD,
    defaultProps: testimonialOwnerCardDefaultProps,
    group: "testimonial",
    seamlessLoop: false,
  }),
  entry({
    id: "LandingSocialProofRating",
    component: SocialProofRatingCard,
    durationInFrames: 300,
    fps: 30,
    ...PORTRAIT_CARD,
    defaultProps: socialProofRatingCardDefaultProps,
    group: "testimonial",
    seamlessLoop: false,
  }),

  /* ── city showcase cards ──────────────────────────────────────────────── */
  entry({
    id: "LandingCityYerevan",
    component: CityShowcaseYerevan,
    durationInFrames: 270,
    fps: 30,
    ...PORTRAIT_CARD,
    defaultProps: cityShowcaseYerevanDefaultProps,
    group: "city",
    seamlessLoop: false,
  }),
  entry({
    id: "LandingCityGyumri",
    component: CityShowcaseGyumri,
    durationInFrames: 270,
    fps: 30,
    ...PORTRAIT_CARD,
    defaultProps: cityShowcaseGyumriDefaultProps,
    group: "city",
    seamlessLoop: false,
  }),
  entry({
    id: "LandingCityVanadzor",
    component: CityShowcaseVanadzor,
    durationInFrames: 270,
    fps: 30,
    ...PORTRAIT_CARD,
    defaultProps: cityShowcaseVanadzorDefaultProps,
    group: "city",
    seamlessLoop: false,
  }),

  /* ── call-to-action moments ───────────────────────────────────────────── */
  entry({
    id: "LandingCtaBrowseVenues",
    component: CtaBrowseVenues,
    durationInFrames: 240,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: ctaBrowseVenuesDefaultProps,
    group: "cta",
    seamlessLoop: false,
  }),
  entry({
    id: "LandingCtaListYourVenue",
    component: CtaListYourVenue,
    durationInFrames: 270,
    fps: 30,
    ...LANDSCAPE,
    defaultProps: ctaListYourVenueDefaultProps,
    group: "cta",
    seamlessLoop: false,
  }),
  entry({
    id: "LandingCtaNextGameStory",
    component: CtaNextGameStory,
    durationInFrames: 300,
    fps: 30,
    ...STORY,
    defaultProps: ctaNextGameStoryDefaultProps,
    group: "cta",
    seamlessLoop: false,
  }),
];
