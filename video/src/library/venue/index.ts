/**
 * The venue / listing / booking composition family — 27 pieces covering the
 * eight per-sport promos, the rate cards, availability and slot picking, the
 * photo gallery, amenities, the map, reviews and the booking-confirmed moment.
 * Re-exports every composition plus `venueCompositions`, the registry a Root
 * can map over. This folder never edits Root.tsx itself.
 */

import type { FC } from "react";

import {
  AmenityBadgeGrid,
  amenityBadgeGridDefaultProps,
  type AmenityBadgeGridProps,
  type AmenityItem,
} from "./AmenityBadgeGrid";
import {
  AmenityBadgeMarquee,
  amenityBadgeMarqueeDefaultProps,
  type AmenityBadgeMarqueeProps,
} from "./AmenityBadgeMarquee";
import {
  AmenityBadgeSpotlight,
  amenityBadgeSpotlightDefaultProps,
  type AmenityBadgeSpotlightProps,
} from "./AmenityBadgeSpotlight";
import {
  AvailabilityDayStrip,
  availabilityDayStripDefaultProps,
  type AvailabilityDayStripProps,
} from "./AvailabilityDayStrip";
import {
  AvailabilityHeatmapWeek,
  availabilityHeatmapWeekDefaultProps,
  type AvailabilityHeatmapWeekProps,
} from "./AvailabilityHeatmapWeek";
import {
  BookingConfirmedStamp,
  bookingConfirmedStampDefaultProps,
  type BookingConfirmedStampProps,
} from "./BookingConfirmedStamp";
import {
  BookingConfirmedTicket,
  bookingConfirmedTicketDefaultProps,
  type BookingConfirmedTicketProps,
} from "./BookingConfirmedTicket";
import {
  GalleryCrossfadeStack,
  galleryCrossfadeStackDefaultProps,
  type GalleryCrossfadeStackProps,
} from "./GalleryCrossfadeStack";
import {
  GallerySlidePush,
  gallerySlidePushDefaultProps,
  type GallerySlidePushProps,
} from "./GallerySlidePush";
import {
  GalleryTileMosaic,
  galleryTileMosaicDefaultProps,
  type GalleryTileMosaicProps,
} from "./GalleryTileMosaic";
import {
  MapPinClusterReveal,
  mapPinClusterRevealDefaultProps,
  type MapPinClusterRevealProps,
} from "./MapPinClusterReveal";
import {
  MapPinDropSingle,
  mapPinDropSingleDefaultProps,
  type MapPinDropSingleProps,
} from "./MapPinDropSingle";
import {
  MapPinRadarSweep,
  mapPinRadarSweepDefaultProps,
  type MapPinRadarSweepProps,
} from "./MapPinRadarSweep";
import {
  RateCardBookingTotal,
  rateCardBookingTotalDefaultProps,
  type RateCardBookingTotalProps,
} from "./RateCardBookingTotal";
import {
  RateCardPeakOffPeak,
  rateCardPeakOffPeakDefaultProps,
  type RateCardPeakOffPeakProps,
  type RateTier,
} from "./RateCardPeakOffPeak";
import {
  RateCardZeroCommission,
  rateCardZeroCommissionDefaultProps,
  type RateCardZeroCommissionProps,
} from "./RateCardZeroCommission";
import {
  ReviewQuoteRotator,
  reviewQuoteRotatorDefaultProps,
  type ReviewQuote,
  type ReviewQuoteRotatorProps,
} from "./ReviewQuoteRotator";
import {
  ReviewScoreReveal,
  reviewScoreRevealDefaultProps,
  type ReviewScoreRevealProps,
} from "./ReviewScoreReveal";
import {
  SlotPickerTapSelect,
  slotPickerTapSelectDefaultProps,
  type SlotPickerTapSelectProps,
} from "./SlotPickerTapSelect";
import {
  VenuePromoBadminton,
  venuePromoBadmintonDefaultProps,
  type VenuePromoBadmintonProps,
} from "./VenuePromoBadminton";
import {
  VenuePromoBasketball,
  venuePromoBasketballDefaultProps,
  type VenuePromoBasketballProps,
} from "./VenuePromoBasketball";
import {
  VenuePromoFootball,
  venuePromoFootballDefaultProps,
  type VenuePromoFootballProps,
} from "./VenuePromoFootball";
import {
  VenuePromoFutsal,
  venuePromoFutsalDefaultProps,
  type VenuePromoFutsalProps,
} from "./VenuePromoFutsal";
import {
  VenuePromoPadel,
  venuePromoPadelDefaultProps,
  type VenuePromoPadelProps,
} from "./VenuePromoPadel";
import {
  VenuePromoSwimming,
  venuePromoSwimmingDefaultProps,
  type VenuePromoSwimmingProps,
} from "./VenuePromoSwimming";
import {
  VenuePromoTennis,
  venuePromoTennisDefaultProps,
  type VenuePromoTennisProps,
} from "./VenuePromoTennis";
import {
  VenuePromoVolleyball,
  venuePromoVolleyballDefaultProps,
  type VenuePromoVolleyballProps,
} from "./VenuePromoVolleyball";

/* ─────────────────────────────── components ────────────────────────────── */

export {
  AmenityBadgeGrid,
  AmenityBadgeMarquee,
  AmenityBadgeSpotlight,
  AvailabilityDayStrip,
  AvailabilityHeatmapWeek,
  BookingConfirmedStamp,
  BookingConfirmedTicket,
  GalleryCrossfadeStack,
  GallerySlidePush,
  GalleryTileMosaic,
  MapPinClusterReveal,
  MapPinDropSingle,
  MapPinRadarSweep,
  RateCardBookingTotal,
  RateCardPeakOffPeak,
  RateCardZeroCommission,
  ReviewQuoteRotator,
  ReviewScoreReveal,
  SlotPickerTapSelect,
  VenuePromoBadminton,
  VenuePromoBasketball,
  VenuePromoFootball,
  VenuePromoFutsal,
  VenuePromoPadel,
  VenuePromoSwimming,
  VenuePromoTennis,
  VenuePromoVolleyball,
};

/* ──────────────────────────── props + defaults ─────────────────────────── */

export {
  amenityBadgeGridDefaultProps,
  amenityBadgeMarqueeDefaultProps,
  amenityBadgeSpotlightDefaultProps,
  availabilityDayStripDefaultProps,
  availabilityHeatmapWeekDefaultProps,
  bookingConfirmedStampDefaultProps,
  bookingConfirmedTicketDefaultProps,
  galleryCrossfadeStackDefaultProps,
  gallerySlidePushDefaultProps,
  galleryTileMosaicDefaultProps,
  mapPinClusterRevealDefaultProps,
  mapPinDropSingleDefaultProps,
  mapPinRadarSweepDefaultProps,
  rateCardBookingTotalDefaultProps,
  rateCardPeakOffPeakDefaultProps,
  rateCardZeroCommissionDefaultProps,
  reviewQuoteRotatorDefaultProps,
  reviewScoreRevealDefaultProps,
  slotPickerTapSelectDefaultProps,
  venuePromoBadmintonDefaultProps,
  venuePromoBasketballDefaultProps,
  venuePromoFootballDefaultProps,
  venuePromoFutsalDefaultProps,
  venuePromoPadelDefaultProps,
  venuePromoSwimmingDefaultProps,
  venuePromoTennisDefaultProps,
  venuePromoVolleyballDefaultProps,
};

export type {
  AmenityBadgeGridProps,
  AmenityBadgeMarqueeProps,
  AmenityBadgeSpotlightProps,
  AmenityItem,
  AvailabilityDayStripProps,
  AvailabilityHeatmapWeekProps,
  BookingConfirmedStampProps,
  BookingConfirmedTicketProps,
  GalleryCrossfadeStackProps,
  GallerySlidePushProps,
  GalleryTileMosaicProps,
  MapPinClusterRevealProps,
  MapPinDropSingleProps,
  MapPinRadarSweepProps,
  RateCardBookingTotalProps,
  RateCardPeakOffPeakProps,
  RateCardZeroCommissionProps,
  RateTier,
  ReviewQuote,
  ReviewQuoteRotatorProps,
  ReviewScoreRevealProps,
  SlotPickerTapSelectProps,
  VenuePromoBadmintonProps,
  VenuePromoBasketballProps,
  VenuePromoFootballProps,
  VenuePromoFutsalProps,
  VenuePromoPadelProps,
  VenuePromoSwimmingProps,
  VenuePromoTennisProps,
  VenuePromoVolleyballProps,
};

/* ─────────────────────────────── the registry ──────────────────────────── */

export type VenueCompositionEntry = {
  /**
   * Stable id. Also the folder name a render lands in. Family-prefixed with
   * `Venue`, the same way the landing and dashboard registries prefix theirs.
   */
  id: string;
  /**
   * The component, with its prop type erased.
   *
   * The registry is heterogeneous — 27 different prop shapes — so the pair
   * cannot stay tied in a single array type. `defineVenueComposition` below is
   * the only place the erasure happens, and it checks that `defaultProps`
   * really does satisfy `component`'s props before erasing anything.
   */
  component: FC<never>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: Record<string, unknown>;
  /**
   * True when frame 0 and frame `durationInFrames` are the same state, i.e. the
   * piece can be looped in the app with no visible seam. False means it is
   * event-driven and plays once.
   */
  seamless: boolean;
};

type VenueCompositionSpec<P extends Record<string, unknown>> = {
  id: string;
  component: FC<P>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: P;
  seamless: boolean;
};

const defineVenueComposition = <P extends Record<string, unknown>>(
  spec: VenueCompositionSpec<P>,
): VenueCompositionEntry => ({
  id: spec.id,
  component: spec.component as unknown as FC<never>,
  durationInFrames: spec.durationInFrames,
  fps: spec.fps,
  width: spec.width,
  height: spec.height,
  defaultProps: spec.defaultProps,
  seamless: spec.seamless,
});

export const venueCompositions: VenueCompositionEntry[] = [
  /* ── Per-sport listing promos — all eight loop ──────────────────────── */
  defineVenueComposition({
    id: "VenuePromoFootball",
    component: VenuePromoFootball,
    durationInFrames: 240,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: venuePromoFootballDefaultProps,
    seamless: true,
  }),
  defineVenueComposition({
    id: "VenuePromoFutsal",
    component: VenuePromoFutsal,
    durationInFrames: 240,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: venuePromoFutsalDefaultProps,
    seamless: true,
  }),
  defineVenueComposition({
    id: "VenuePromoBasketball",
    component: VenuePromoBasketball,
    durationInFrames: 270,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: venuePromoBasketballDefaultProps,
    seamless: true,
  }),
  defineVenueComposition({
    id: "VenuePromoTennis",
    component: VenuePromoTennis,
    durationInFrames: 270,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: venuePromoTennisDefaultProps,
    seamless: true,
  }),
  defineVenueComposition({
    id: "VenuePromoPadel",
    component: VenuePromoPadel,
    durationInFrames: 240,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: venuePromoPadelDefaultProps,
    seamless: true,
  }),
  defineVenueComposition({
    id: "VenuePromoVolleyball",
    component: VenuePromoVolleyball,
    durationInFrames: 240,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: venuePromoVolleyballDefaultProps,
    seamless: true,
  }),
  defineVenueComposition({
    id: "VenuePromoBadminton",
    component: VenuePromoBadminton,
    durationInFrames: 300,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: venuePromoBadmintonDefaultProps,
    seamless: true,
  }),
  defineVenueComposition({
    id: "VenuePromoSwimming",
    component: VenuePromoSwimming,
    durationInFrames: 300,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: venuePromoSwimmingDefaultProps,
    seamless: true,
  }),

  /* ── Price and rate cards ───────────────────────────────────────────── */
  defineVenueComposition({
    id: "VenueRateCardZeroCommission",
    component: RateCardZeroCommission,
    durationInFrames: 150,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: rateCardZeroCommissionDefaultProps,
    seamless: false,
  }),
  defineVenueComposition({
    id: "VenueRateCardBookingTotal",
    component: RateCardBookingTotal,
    durationInFrames: 150,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: rateCardBookingTotalDefaultProps,
    seamless: false,
  }),
  defineVenueComposition({
    id: "VenueRateCardPeakOffPeak",
    component: RateCardPeakOffPeak,
    durationInFrames: 150,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: rateCardPeakOffPeakDefaultProps,
    seamless: false,
  }),

  /* ── Availability and slot picking ──────────────────────────────────── */
  defineVenueComposition({
    id: "VenueAvailabilityDayStrip",
    component: AvailabilityDayStrip,
    durationInFrames: 240,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: availabilityDayStripDefaultProps,
    seamless: true,
  }),
  defineVenueComposition({
    id: "VenueAvailabilityHeatmapWeek",
    component: AvailabilityHeatmapWeek,
    durationInFrames: 300,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: availabilityHeatmapWeekDefaultProps,
    seamless: true,
  }),
  defineVenueComposition({
    id: "VenueSlotPickerTapSelect",
    component: SlotPickerTapSelect,
    durationInFrames: 150,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: slotPickerTapSelectDefaultProps,
    seamless: false,
  }),

  /* ── Photo gallery transitions ──────────────────────────────────────── */
  defineVenueComposition({
    id: "VenueGalleryCrossfadeStack",
    component: GalleryCrossfadeStack,
    durationInFrames: 240,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: galleryCrossfadeStackDefaultProps,
    seamless: true,
  }),
  defineVenueComposition({
    id: "VenueGallerySlidePush",
    component: GallerySlidePush,
    durationInFrames: 300,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: gallerySlidePushDefaultProps,
    seamless: true,
  }),
  defineVenueComposition({
    id: "VenueGalleryTileMosaic",
    component: GalleryTileMosaic,
    durationInFrames: 300,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: galleryTileMosaicDefaultProps,
    seamless: true,
  }),

  /* ── Amenity / facility badges ──────────────────────────────────────── */
  defineVenueComposition({
    id: "VenueAmenityBadgeGrid",
    component: AmenityBadgeGrid,
    durationInFrames: 150,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: amenityBadgeGridDefaultProps,
    seamless: false,
  }),
  defineVenueComposition({
    id: "VenueAmenityBadgeMarquee",
    component: AmenityBadgeMarquee,
    durationInFrames: 300,
    fps: 30,
    width: 1920,
    height: 1080,
    defaultProps: amenityBadgeMarqueeDefaultProps,
    seamless: true,
  }),
  defineVenueComposition({
    id: "VenueAmenityBadgeSpotlight",
    component: AmenityBadgeSpotlight,
    durationInFrames: 300,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: amenityBadgeSpotlightDefaultProps,
    seamless: true,
  }),

  /* ── Map pins and location ──────────────────────────────────────────── */
  defineVenueComposition({
    id: "VenueMapPinDropSingle",
    component: MapPinDropSingle,
    durationInFrames: 120,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: mapPinDropSingleDefaultProps,
    seamless: false,
  }),
  defineVenueComposition({
    id: "VenueMapPinClusterReveal",
    component: MapPinClusterReveal,
    durationInFrames: 150,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: mapPinClusterRevealDefaultProps,
    seamless: false,
  }),
  defineVenueComposition({
    id: "VenueMapPinRadarSweep",
    component: MapPinRadarSweep,
    durationInFrames: 300,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: mapPinRadarSweepDefaultProps,
    seamless: true,
  }),

  /* ── Reviews and ratings ────────────────────────────────────────────── */
  defineVenueComposition({
    id: "VenueReviewScoreReveal",
    component: ReviewScoreReveal,
    durationInFrames: 150,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: reviewScoreRevealDefaultProps,
    seamless: false,
  }),
  defineVenueComposition({
    id: "VenueReviewQuoteRotator",
    component: ReviewQuoteRotator,
    durationInFrames: 360,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: reviewQuoteRotatorDefaultProps,
    seamless: true,
  }),

  /* ── Booking confirmed ──────────────────────────────────────────────── */
  defineVenueComposition({
    id: "VenueBookingConfirmedStamp",
    component: BookingConfirmedStamp,
    durationInFrames: 150,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: bookingConfirmedStampDefaultProps,
    seamless: false,
  }),
  defineVenueComposition({
    id: "VenueBookingConfirmedTicket",
    component: BookingConfirmedTicket,
    durationInFrames: 150,
    fps: 30,
    width: 1080,
    height: 1350,
    defaultProps: bookingConfirmedTicketDefaultProps,
    seamless: false,
  }),
];
