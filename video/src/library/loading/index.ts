/**
 * The "loading, skeletons & transitions" family — 25 compositions covering the
 * waits, placeholders and state changes that the SportsBnB app actually has:
 * the Suspense fallback, the venue grid and detail page, the booking calendar,
 * the owner KPI row, route changes, empty states and the payment result page.
 *
 * `loadingCompositions` is the registration manifest. Every entry carries the
 * id, component, timing and canvas the piece was authored against, plus its
 * `defaultProps`, so registering the family is mechanical:
 *
 *     {loadingCompositions.map((c) => (
 *       <Composition key={c.id} {...c} />
 *     ))}
 *
 * Sizes and durations are not arbitrary. The five skeleton shimmers run at
 * 60fps because a sheen crossing a wide layout shows stepping at 30; the
 * spinners and result screens run at 30fps because nothing in them moves fast
 * enough to need more. Every duration satisfies the constraint each file's
 * header states for its own loop — most importantly `hold + fall + 1 ≤ period`
 * wherever `loopPulse` is used, which is what makes those springs close exactly
 * rather than approximately.
 */

import type { ComponentType } from "react";

import {
  EmptyConnectionLost,
  emptyConnectionLostDefaultProps,
  type EmptyConnectionLostProps,
} from "./EmptyConnectionLost";
import {
  EmptyNoBookings,
  emptyNoBookingsDefaultProps,
  type EmptyNoBookingsProps,
} from "./EmptyNoBookings";
import {
  EmptyNoVenues,
  emptyNoVenuesDefaultProps,
  type EmptyNoVenuesProps,
} from "./EmptyNoVenues";
import {
  IndeterminateBarberStripes,
  indeterminateBarberStripesDefaultProps,
  type IndeterminateBarberStripesProps,
} from "./IndeterminateBarberStripes";
import {
  IndeterminateRailSweep,
  indeterminateRailSweepDefaultProps,
  type IndeterminateRailSweepProps,
} from "./IndeterminateRailSweep";
import {
  ProgressLinearBar,
  progressLinearBarDefaultProps,
  type ProgressLinearBarProps,
} from "./ProgressLinearBar";
import {
  ProgressRadialRing,
  progressRadialRingDefaultProps,
  type ProgressRadialRingProps,
} from "./ProgressRadialRing";
import {
  ProgressSegmentedSteps,
  progressSegmentedStepsDefaultProps,
  type ProgressSegmentedStepsProps,
} from "./ProgressSegmentedSteps";
import {
  ResultBookingConfirmed,
  resultBookingConfirmedDefaultProps,
  type ResultBookingConfirmedProps,
} from "./ResultBookingConfirmed";
import {
  ResultHoldExpired,
  resultHoldExpiredDefaultProps,
  type ResultHoldExpiredProps,
} from "./ResultHoldExpired";
import {
  ResultPaymentDeclined,
  resultPaymentDeclinedDefaultProps,
  type ResultPaymentDeclinedProps,
} from "./ResultPaymentDeclined";
import {
  ResultPaymentPending,
  resultPaymentPendingDefaultProps,
  type ResultPaymentPendingProps,
} from "./ResultPaymentPending";
import {
  SkeletonCalendarGrid,
  skeletonCalendarGridDefaultProps,
  type SkeletonCalendarGridProps,
} from "./SkeletonCalendarGrid";
import {
  SkeletonListRow,
  skeletonListRowDefaultProps,
  type SkeletonListRowProps,
} from "./SkeletonListRow";
import {
  SkeletonStatTile,
  skeletonStatTileDefaultProps,
  type SkeletonStatTileProps,
} from "./SkeletonStatTile";
import {
  SkeletonVenueCard,
  skeletonVenueCardDefaultProps,
  type SkeletonVenueCardProps,
} from "./SkeletonVenueCard";
import {
  SkeletonVenueDetail,
  skeletonVenueDetailDefaultProps,
  type SkeletonVenueDetailProps,
} from "./SkeletonVenueDetail";
import {
  SpinnerArcSweep,
  spinnerArcSweepDefaultProps,
  type SpinnerArcSweepProps,
} from "./SpinnerArcSweep";
import {
  SpinnerDotRelay,
  spinnerDotRelayDefaultProps,
  type SpinnerDotRelayProps,
} from "./SpinnerDotRelay";
import {
  SpinnerOrbitTrio,
  spinnerOrbitTrioDefaultProps,
  type SpinnerOrbitTrioProps,
} from "./SpinnerOrbitTrio";
import {
  SpinnerPulseRings,
  spinnerPulseRingsDefaultProps,
  type SpinnerPulseRingsProps,
} from "./SpinnerPulseRings";
import {
  TransitionFadeThrough,
  transitionFadeThroughDefaultProps,
  type TransitionFadeThroughProps,
} from "./TransitionFadeThrough";
import {
  TransitionMaskWipe,
  transitionMaskWipeDefaultProps,
  type TransitionMaskWipeProps,
} from "./TransitionMaskWipe";
import {
  TransitionScaleDepth,
  transitionScaleDepthDefaultProps,
  type TransitionScaleDepthProps,
} from "./TransitionScaleDepth";
import {
  TransitionSlidePush,
  transitionSlidePushDefaultProps,
  type TransitionSlidePushProps,
} from "./TransitionSlidePush";

/* ───────────────────────────── components ─────────────────────────────── */

export { SpinnerArcSweep } from "./SpinnerArcSweep";
export { SpinnerDotRelay } from "./SpinnerDotRelay";
export { SpinnerPulseRings } from "./SpinnerPulseRings";
export { SpinnerOrbitTrio } from "./SpinnerOrbitTrio";

export { SkeletonVenueCard } from "./SkeletonVenueCard";
export { SkeletonListRow } from "./SkeletonListRow";
export { SkeletonVenueDetail } from "./SkeletonVenueDetail";
export { SkeletonCalendarGrid } from "./SkeletonCalendarGrid";
export { SkeletonStatTile } from "./SkeletonStatTile";

export { ProgressLinearBar } from "./ProgressLinearBar";
export { ProgressRadialRing } from "./ProgressRadialRing";
export { ProgressSegmentedSteps } from "./ProgressSegmentedSteps";

export { IndeterminateRailSweep } from "./IndeterminateRailSweep";
export { IndeterminateBarberStripes } from "./IndeterminateBarberStripes";

export { TransitionFadeThrough } from "./TransitionFadeThrough";
export { TransitionSlidePush } from "./TransitionSlidePush";
export { TransitionMaskWipe } from "./TransitionMaskWipe";
export { TransitionScaleDepth } from "./TransitionScaleDepth";

export { EmptyNoVenues } from "./EmptyNoVenues";
export { EmptyNoBookings } from "./EmptyNoBookings";
export { EmptyConnectionLost } from "./EmptyConnectionLost";

export { ResultBookingConfirmed } from "./ResultBookingConfirmed";
export { ResultPaymentDeclined } from "./ResultPaymentDeclined";
export { ResultPaymentPending } from "./ResultPaymentPending";
export { ResultHoldExpired } from "./ResultHoldExpired";

/* ─────────────────────────── prop types & defaults ────────────────────── */

export type {
  SpinnerArcSweepProps,
  SpinnerDotRelayProps,
  SpinnerPulseRingsProps,
  SpinnerOrbitTrioProps,
  SkeletonVenueCardProps,
  SkeletonListRowProps,
  SkeletonVenueDetailProps,
  SkeletonCalendarGridProps,
  SkeletonStatTileProps,
  ProgressLinearBarProps,
  ProgressRadialRingProps,
  ProgressSegmentedStepsProps,
  IndeterminateRailSweepProps,
  IndeterminateBarberStripesProps,
  TransitionFadeThroughProps,
  TransitionSlidePushProps,
  TransitionMaskWipeProps,
  TransitionScaleDepthProps,
  EmptyNoVenuesProps,
  EmptyNoBookingsProps,
  EmptyConnectionLostProps,
  ResultBookingConfirmedProps,
  ResultPaymentDeclinedProps,
  ResultPaymentPendingProps,
  ResultHoldExpiredProps,
};

export {
  spinnerArcSweepDefaultProps,
  spinnerDotRelayDefaultProps,
  spinnerPulseRingsDefaultProps,
  spinnerOrbitTrioDefaultProps,
  skeletonVenueCardDefaultProps,
  skeletonListRowDefaultProps,
  skeletonVenueDetailDefaultProps,
  skeletonCalendarGridDefaultProps,
  skeletonStatTileDefaultProps,
  progressLinearBarDefaultProps,
  progressRadialRingDefaultProps,
  progressSegmentedStepsDefaultProps,
  indeterminateRailSweepDefaultProps,
  indeterminateBarberStripesDefaultProps,
  transitionFadeThroughDefaultProps,
  transitionSlidePushDefaultProps,
  transitionMaskWipeDefaultProps,
  transitionScaleDepthDefaultProps,
  emptyNoVenuesDefaultProps,
  emptyNoBookingsDefaultProps,
  emptyConnectionLostDefaultProps,
  resultBookingConfirmedDefaultProps,
  resultPaymentDeclinedDefaultProps,
  resultPaymentPendingDefaultProps,
  resultHoldExpiredDefaultProps,
};

/* ───────────────────────────── the manifest ───────────────────────────── */

export type LoadingCompositionEntry = {
  /** Composition id. Prefixed `Loading` so the family groups in the sidebar. */
  id: string;
  /**
   * The component. Typed loosely on purpose: the manifest is a heterogeneous
   * list of components with unrelated prop shapes, and `<Composition>` infers
   * its own generic from `defaultProps`. A narrower type here would force a
   * cast at every registration site instead of none.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: Record<string, unknown>;
};

export const loadingCompositions: LoadingCompositionEntry[] = [
  /* ── Spinner loops: four distinct rhythms ── */
  {
    id: "LoadingSpinnerArcSweep",
    component: SpinnerArcSweep,
    durationInFrames: 60,
    fps: 30,
    width: 600,
    height: 600,
    defaultProps: spinnerArcSweepDefaultProps,
  },
  {
    id: "LoadingSpinnerDotRelay",
    component: SpinnerDotRelay,
    durationInFrames: 48,
    fps: 30,
    width: 720,
    height: 360,
    defaultProps: spinnerDotRelayDefaultProps,
  },
  {
    id: "LoadingSpinnerPulseRings",
    component: SpinnerPulseRings,
    durationInFrames: 75,
    fps: 30,
    width: 600,
    height: 600,
    defaultProps: spinnerPulseRingsDefaultProps,
  },
  {
    id: "LoadingSpinnerOrbitTrio",
    component: SpinnerOrbitTrio,
    durationInFrames: 90,
    fps: 30,
    width: 600,
    height: 600,
    defaultProps: spinnerOrbitTrioDefaultProps,
  },

  /* ── Skeleton shimmers. 60fps: a sheen crossing a wide layout steps at 30. ── */
  {
    id: "LoadingSkeletonVenueCard",
    component: SkeletonVenueCard,
    durationInFrames: 90,
    fps: 60,
    width: 760,
    height: 900,
    defaultProps: skeletonVenueCardDefaultProps,
  },
  {
    id: "LoadingSkeletonListRow",
    component: SkeletonListRow,
    durationInFrames: 90,
    fps: 60,
    width: 1200,
    height: 700,
    defaultProps: skeletonListRowDefaultProps,
  },
  {
    id: "LoadingSkeletonVenueDetail",
    component: SkeletonVenueDetail,
    durationInFrames: 105,
    fps: 60,
    width: 1280,
    height: 860,
    defaultProps: skeletonVenueDetailDefaultProps,
  },
  {
    id: "LoadingSkeletonCalendarGrid",
    component: SkeletonCalendarGrid,
    durationInFrames: 90,
    fps: 60,
    width: 1080,
    height: 800,
    defaultProps: skeletonCalendarGridDefaultProps,
  },
  {
    id: "LoadingSkeletonStatTile",
    component: SkeletonStatTile,
    durationInFrames: 90,
    fps: 60,
    width: 1200,
    height: 460,
    defaultProps: skeletonStatTileDefaultProps,
  },

  /* ── Determinate progress ── */
  {
    id: "LoadingProgressLinearBar",
    component: ProgressLinearBar,
    durationInFrames: 60,
    fps: 30,
    width: 1000,
    height: 420,
    defaultProps: progressLinearBarDefaultProps,
  },
  {
    id: "LoadingProgressRadialRing",
    component: ProgressRadialRing,
    durationInFrames: 90,
    fps: 30,
    width: 640,
    height: 640,
    defaultProps: progressRadialRingDefaultProps,
  },
  {
    id: "LoadingProgressSegmentedSteps",
    component: ProgressSegmentedSteps,
    durationInFrames: 60,
    fps: 30,
    width: 1200,
    height: 420,
    defaultProps: progressSegmentedStepsDefaultProps,
  },

  /* ── Indeterminate progress ── */
  {
    id: "LoadingIndeterminateRailSweep",
    component: IndeterminateRailSweep,
    durationInFrames: 60,
    fps: 30,
    width: 1280,
    height: 720,
    defaultProps: indeterminateRailSweepDefaultProps,
  },
  {
    id: "LoadingIndeterminateBarberStripes",
    component: IndeterminateBarberStripes,
    durationInFrames: 45,
    fps: 30,
    width: 1000,
    height: 440,
    defaultProps: indeterminateBarberStripesDefaultProps,
  },

  /* ── Page-transition wipes. 120 frames: hold · traverse · hold · traverse. ── */
  {
    id: "LoadingTransitionFadeThrough",
    component: TransitionFadeThrough,
    durationInFrames: 120,
    fps: 30,
    width: 1280,
    height: 720,
    defaultProps: transitionFadeThroughDefaultProps,
  },
  {
    id: "LoadingTransitionSlidePush",
    component: TransitionSlidePush,
    durationInFrames: 120,
    fps: 30,
    width: 1280,
    height: 720,
    defaultProps: transitionSlidePushDefaultProps,
  },
  {
    id: "LoadingTransitionMaskWipe",
    component: TransitionMaskWipe,
    durationInFrames: 120,
    fps: 30,
    width: 1280,
    height: 720,
    defaultProps: transitionMaskWipeDefaultProps,
  },
  {
    id: "LoadingTransitionScaleDepth",
    component: TransitionScaleDepth,
    durationInFrames: 120,
    fps: 30,
    width: 1280,
    height: 720,
    defaultProps: transitionScaleDepthDefaultProps,
  },

  /* ── Empty-state idle loops. Long and calm — these are dead ends. ── */
  {
    id: "LoadingEmptyNoVenues",
    component: EmptyNoVenues,
    durationInFrames: 120,
    fps: 30,
    width: 900,
    height: 760,
    defaultProps: emptyNoVenuesDefaultProps,
  },
  {
    id: "LoadingEmptyNoBookings",
    component: EmptyNoBookings,
    durationInFrames: 120,
    fps: 30,
    width: 900,
    height: 760,
    defaultProps: emptyNoBookingsDefaultProps,
  },
  {
    id: "LoadingEmptyConnectionLost",
    component: EmptyConnectionLost,
    durationInFrames: 120,
    fps: 30,
    width: 900,
    height: 760,
    defaultProps: emptyConnectionLostDefaultProps,
  },

  /* ── Result screens. 90 frames: reveal · hold · dissolve, and back to the
       exact frame the loop opened on. ── */
  {
    id: "LoadingResultBookingConfirmed",
    component: ResultBookingConfirmed,
    durationInFrames: 90,
    fps: 30,
    width: 1000,
    height: 720,
    defaultProps: resultBookingConfirmedDefaultProps,
  },
  {
    id: "LoadingResultPaymentDeclined",
    component: ResultPaymentDeclined,
    durationInFrames: 90,
    fps: 30,
    width: 1000,
    height: 720,
    defaultProps: resultPaymentDeclinedDefaultProps,
  },
  {
    id: "LoadingResultPaymentPending",
    component: ResultPaymentPending,
    durationInFrames: 90,
    fps: 30,
    width: 1000,
    height: 720,
    defaultProps: resultPaymentPendingDefaultProps,
  },
  {
    id: "LoadingResultHoldExpired",
    component: ResultHoldExpired,
    durationInFrames: 90,
    fps: 30,
    width: 1000,
    height: 720,
    defaultProps: resultHoldExpiredDefaultProps,
  },
];
