/**
 * The social-media composition family — 25 templates covering the three
 * placements SportsBnB posts to: 10 × 9:16 Reels / TikTok / Stories, 9 × 1:1
 * feed posts and 6 × 16:9 YouTube / web / display pieces.
 * Every piece is parameterised so one render can be fired per venue, per city
 * or per week straight from listing data. Re-exports every composition plus
 * `socialCompositions`, the registry a Root can map over. This folder never
 * edits Root.tsx itself.
 */

import type { FC } from "react";

import {
  PostCommunityGame,
  postCommunityGameDefaultProps,
  type PostCommunityGameProps,
} from "./PostCommunityGame";
import {
  PostNewCityLaunch,
  postNewCityLaunchDefaultProps,
  type PostNewCityLaunchProps,
} from "./PostNewCityLaunch";
import {
  PostOwnerTestimonial,
  postOwnerTestimonialDefaultProps,
  type PostOwnerTestimonialProps,
} from "./PostOwnerTestimonial";
import {
  PostQuoteCard,
  postQuoteCardDefaultProps,
  type PostQuoteCardProps,
} from "./PostQuoteCard";
import {
  PostSeasonalPromo,
  postSeasonalPromoDefaultProps,
  type PostSeasonalPromoProps,
} from "./PostSeasonalPromo";
import {
  PostSportOfTheWeek,
  postSportOfTheWeekDefaultProps,
  type PostSportOfTheWeekProps,
  type SportStat,
} from "./PostSportOfTheWeek";
import {
  PostStat,
  postStatDefaultProps,
  type PostStatProps,
} from "./PostStat";
import {
  PostVenueCard,
  postVenueCardDefaultProps,
  type PostVenueCardProps,
} from "./PostVenueCard";
import {
  PostZeroCommission,
  postZeroCommissionDefaultProps,
  type PostZeroCommissionProps,
} from "./PostZeroCommission";
import {
  ReelBeforeAfterEmptyBooked,
  reelBeforeAfterEmptyBookedDefaultProps,
  type ReelBeforeAfterEmptyBookedProps,
} from "./ReelBeforeAfterEmptyBooked";
import {
  ReelBookInThreeTaps,
  reelBookInThreeTapsDefaultProps,
  type BookingStep,
  type ReelBookInThreeTapsProps,
} from "./ReelBookInThreeTaps";
import {
  ReelCityGuide,
  reelCityGuideDefaultProps,
  type CityDistrict,
  type ReelCityGuideProps,
} from "./ReelCityGuide";
import {
  ReelGameNightInvite,
  reelGameNightInviteDefaultProps,
  type ReelGameNightInviteProps,
} from "./ReelGameNightInvite";
import {
  ReelNewVenueAnnouncement,
  reelNewVenueAnnouncementDefaultProps,
  type ReelNewVenueAnnouncementProps,
  type VenueSpec,
} from "./ReelNewVenueAnnouncement";
import {
  ReelPriceReveal,
  reelPriceRevealDefaultProps,
  type ReelPriceRevealProps,
} from "./ReelPriceReveal";
import {
  ReelTestimonial,
  reelTestimonialDefaultProps,
  type ReelTestimonialProps,
} from "./ReelTestimonial";
import {
  ReelVenueSpotlight,
  reelVenueSpotlightDefaultProps,
  type ReelVenueSpotlightProps,
} from "./ReelVenueSpotlight";
import {
  ReelWeeklySlots,
  reelWeeklySlotsDefaultProps,
  type ReelWeeklySlotsProps,
} from "./ReelWeeklySlots";
import {
  ReelZeroCommissionOwner,
  reelZeroCommissionOwnerDefaultProps,
  type ReelZeroCommissionOwnerProps,
} from "./ReelZeroCommissionOwner";
import {
  WideBrandIntro,
  wideBrandIntroDefaultProps,
  type IntroStat,
  type WideBrandIntroProps,
} from "./WideBrandIntro";
import {
  WideEventPromo,
  wideEventPromoDefaultProps,
  type WideEventPromoProps,
} from "./WideEventPromo";
import {
  WideOutro,
  wideOutroDefaultProps,
  type WideOutroProps,
} from "./WideOutro";
import {
  WideOwnerExplainer,
  wideOwnerExplainerDefaultProps,
  type WideOwnerExplainerProps,
} from "./WideOwnerExplainer";
import {
  WidePartnershipCard,
  widePartnershipCardDefaultProps,
  type WidePartnershipCardProps,
} from "./WidePartnershipCard";
import {
  WideProductTour,
  wideProductTourDefaultProps,
  type TourGlyph,
  type TourStep,
  type WideProductTourProps,
} from "./WideProductTour";

/* ─────────────────────────────── components ────────────────────────────── */

export {
  PostCommunityGame,
  PostNewCityLaunch,
  PostOwnerTestimonial,
  PostQuoteCard,
  PostSeasonalPromo,
  PostSportOfTheWeek,
  PostStat,
  PostVenueCard,
  PostZeroCommission,
  ReelBeforeAfterEmptyBooked,
  ReelBookInThreeTaps,
  ReelCityGuide,
  ReelGameNightInvite,
  ReelNewVenueAnnouncement,
  ReelPriceReveal,
  ReelTestimonial,
  ReelVenueSpotlight,
  ReelWeeklySlots,
  ReelZeroCommissionOwner,
  WideBrandIntro,
  WideEventPromo,
  WideOutro,
  WideOwnerExplainer,
  WidePartnershipCard,
  WideProductTour,
};

/* ──────────────────────────── props + defaults ─────────────────────────── */

export {
  postCommunityGameDefaultProps,
  postNewCityLaunchDefaultProps,
  postOwnerTestimonialDefaultProps,
  postQuoteCardDefaultProps,
  postSeasonalPromoDefaultProps,
  postSportOfTheWeekDefaultProps,
  postStatDefaultProps,
  postVenueCardDefaultProps,
  postZeroCommissionDefaultProps,
  reelBeforeAfterEmptyBookedDefaultProps,
  reelBookInThreeTapsDefaultProps,
  reelCityGuideDefaultProps,
  reelGameNightInviteDefaultProps,
  reelNewVenueAnnouncementDefaultProps,
  reelPriceRevealDefaultProps,
  reelTestimonialDefaultProps,
  reelVenueSpotlightDefaultProps,
  reelWeeklySlotsDefaultProps,
  reelZeroCommissionOwnerDefaultProps,
  wideBrandIntroDefaultProps,
  wideEventPromoDefaultProps,
  wideOutroDefaultProps,
  wideOwnerExplainerDefaultProps,
  widePartnershipCardDefaultProps,
  wideProductTourDefaultProps,
};

export type {
  BookingStep,
  CityDistrict,
  IntroStat,
  PostCommunityGameProps,
  PostNewCityLaunchProps,
  PostOwnerTestimonialProps,
  PostQuoteCardProps,
  PostSeasonalPromoProps,
  PostSportOfTheWeekProps,
  PostStatProps,
  PostVenueCardProps,
  PostZeroCommissionProps,
  ReelBeforeAfterEmptyBookedProps,
  ReelBookInThreeTapsProps,
  ReelCityGuideProps,
  ReelGameNightInviteProps,
  ReelNewVenueAnnouncementProps,
  ReelPriceRevealProps,
  ReelTestimonialProps,
  ReelVenueSpotlightProps,
  ReelWeeklySlotsProps,
  ReelZeroCommissionOwnerProps,
  SportStat,
  TourGlyph,
  TourStep,
  VenueSpec,
  WideBrandIntroProps,
  WideEventPromoProps,
  WideOutroProps,
  WideOwnerExplainerProps,
  WidePartnershipCardProps,
  WideProductTourProps,
};

/* ─────────────────────────────── the registry ──────────────────────────── */

export type SocialCompositionEntry = {
  /** Stable id. Also the folder name a render lands in. */
  id: string;
  /**
   * The component, with its prop type erased.
   *
   * The registry is heterogeneous — 25 different prop shapes — so the pair
   * cannot stay tied in a single array type. `defineSocialComposition` below
   * is the only place the erasure happens, and it checks that `defaultProps`
   * really does satisfy `component`'s props before erasing anything.
   */
  component: FC<never>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: Record<string, unknown>;
  /**
   * True when frame 0 and frame `durationInFrames` are the same state, i.e.
   * the piece can be posted as a looping Story or held on a page with no
   * visible seam. False means it plays once and lands on an end state.
   */
  seamless: boolean;
};

type SocialCompositionSpec<P extends Record<string, unknown>> = {
  id: string;
  component: FC<P>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: P;
  seamless: boolean;
};

const defineSocialComposition = <P extends Record<string, unknown>>(
  spec: SocialCompositionSpec<P>,
): SocialCompositionEntry => ({
  id: spec.id,
  component: spec.component as unknown as FC<never>,
  durationInFrames: spec.durationInFrames,
  fps: spec.fps,
  width: spec.width,
  height: spec.height,
  defaultProps: spec.defaultProps,
  seamless: spec.seamless,
});

export const socialCompositions: SocialCompositionEntry[] = [
  /* ── 9:16 — Reels / TikTok / Stories ─────────────────────────────────── */
  defineSocialComposition({
    id: "SocialReelVenueSpotlight",
    component: ReelVenueSpotlight,
    durationInFrames: 300,
    fps: 30,
    width: 1080,
    height: 1920,
    defaultProps: reelVenueSpotlightDefaultProps,
    seamless: true,
  }),
  defineSocialComposition({
    id: "SocialReelBookInThreeTaps",
    component: ReelBookInThreeTaps,
    durationInFrames: 270,
    fps: 30,
    width: 1080,
    height: 1920,
    defaultProps: reelBookInThreeTapsDefaultProps,
    seamless: false,
  }),
  defineSocialComposition({
    id: "SocialReelZeroCommissionOwner",
    component: ReelZeroCommissionOwner,
    durationInFrames: 330,
    fps: 30,
    width: 1080,
    height: 1920,
    defaultProps: reelZeroCommissionOwnerDefaultProps,
    seamless: false,
  }),
  defineSocialComposition({
    id: "SocialReelGameNightInvite",
    component: ReelGameNightInvite,
    durationInFrames: 300,
    fps: 30,
    width: 1080,
    height: 1920,
    defaultProps: reelGameNightInviteDefaultProps,
    seamless: true,
  }),
  defineSocialComposition({
    id: "SocialReelCityGuide",
    component: ReelCityGuide,
    durationInFrames: 360,
    fps: 30,
    width: 1080,
    height: 1920,
    defaultProps: reelCityGuideDefaultProps,
    seamless: true,
  }),
  defineSocialComposition({
    id: "SocialReelBeforeAfterEmptyBooked",
    component: ReelBeforeAfterEmptyBooked,
    durationInFrames: 300,
    fps: 30,
    width: 1080,
    height: 1920,
    defaultProps: reelBeforeAfterEmptyBookedDefaultProps,
    seamless: true,
  }),
  defineSocialComposition({
    id: "SocialReelPriceReveal",
    component: ReelPriceReveal,
    durationInFrames: 240,
    fps: 30,
    width: 1080,
    height: 1920,
    defaultProps: reelPriceRevealDefaultProps,
    seamless: false,
  }),
  defineSocialComposition({
    id: "SocialReelTestimonial",
    component: ReelTestimonial,
    durationInFrames: 240,
    fps: 30,
    width: 1080,
    height: 1920,
    defaultProps: reelTestimonialDefaultProps,
    seamless: false,
  }),
  defineSocialComposition({
    id: "SocialReelWeeklySlots",
    component: ReelWeeklySlots,
    durationInFrames: 300,
    fps: 30,
    width: 1080,
    height: 1920,
    defaultProps: reelWeeklySlotsDefaultProps,
    seamless: true,
  }),
  defineSocialComposition({
    id: "SocialReelNewVenueAnnouncement",
    component: ReelNewVenueAnnouncement,
    durationInFrames: 240,
    fps: 30,
    width: 1080,
    height: 1920,
    defaultProps: reelNewVenueAnnouncementDefaultProps,
    seamless: false,
  }),

  /* ── 1:1 — Instagram / Facebook feed ─────────────────────────────────── */
  defineSocialComposition({
    id: "SocialPostVenueCard",
    component: PostVenueCard,
    durationInFrames: 150,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: postVenueCardDefaultProps,
    seamless: false,
  }),
  defineSocialComposition({
    id: "SocialPostSportOfTheWeek",
    component: PostSportOfTheWeek,
    durationInFrames: 240,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: postSportOfTheWeekDefaultProps,
    seamless: true,
  }),
  defineSocialComposition({
    id: "SocialPostZeroCommission",
    component: PostZeroCommission,
    durationInFrames: 180,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: postZeroCommissionDefaultProps,
    seamless: false,
  }),
  defineSocialComposition({
    id: "SocialPostStat",
    component: PostStat,
    durationInFrames: 180,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: postStatDefaultProps,
    seamless: false,
  }),
  defineSocialComposition({
    id: "SocialPostQuoteCard",
    component: PostQuoteCard,
    durationInFrames: 240,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: postQuoteCardDefaultProps,
    seamless: true,
  }),
  defineSocialComposition({
    id: "SocialPostNewCityLaunch",
    component: PostNewCityLaunch,
    durationInFrames: 210,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: postNewCityLaunchDefaultProps,
    seamless: false,
  }),
  defineSocialComposition({
    id: "SocialPostOwnerTestimonial",
    component: PostOwnerTestimonial,
    durationInFrames: 210,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: postOwnerTestimonialDefaultProps,
    seamless: false,
  }),
  defineSocialComposition({
    id: "SocialPostSeasonalPromo",
    component: PostSeasonalPromo,
    durationInFrames: 240,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: postSeasonalPromoDefaultProps,
    seamless: true,
  }),
  defineSocialComposition({
    id: "SocialPostCommunityGame",
    component: PostCommunityGame,
    durationInFrames: 210,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: postCommunityGameDefaultProps,
    seamless: false,
  }),

  /* ── 16:9 — YouTube / web / display ──────────────────────────────────── */
  defineSocialComposition({
    id: "SocialWideBrandIntro",
    component: WideBrandIntro,
    durationInFrames: 240,
    fps: 30,
    width: 1920,
    height: 1080,
    defaultProps: wideBrandIntroDefaultProps,
    seamless: false,
  }),
  defineSocialComposition({
    id: "SocialWideProductTour",
    component: WideProductTour,
    durationInFrames: 480,
    fps: 30,
    width: 1920,
    height: 1080,
    defaultProps: wideProductTourDefaultProps,
    seamless: true,
  }),
  defineSocialComposition({
    id: "SocialWideOwnerExplainer",
    component: WideOwnerExplainer,
    durationInFrames: 240,
    fps: 30,
    width: 1920,
    height: 1080,
    defaultProps: wideOwnerExplainerDefaultProps,
    seamless: false,
  }),
  defineSocialComposition({
    id: "SocialWidePartnershipCard",
    component: WidePartnershipCard,
    durationInFrames: 300,
    fps: 30,
    width: 1920,
    height: 1080,
    defaultProps: widePartnershipCardDefaultProps,
    seamless: true,
  }),
  defineSocialComposition({
    id: "SocialWideEventPromo",
    component: WideEventPromo,
    durationInFrames: 240,
    fps: 30,
    width: 1920,
    height: 1080,
    defaultProps: wideEventPromoDefaultProps,
    seamless: false,
  }),
  defineSocialComposition({
    id: "SocialWideOutro",
    component: WideOutro,
    durationInFrames: 300,
    fps: 30,
    width: 1920,
    height: 1080,
    defaultProps: wideOutroDefaultProps,
    seamless: true,
  }),
];
