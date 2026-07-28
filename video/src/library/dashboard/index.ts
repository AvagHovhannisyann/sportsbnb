/**
 * The owner dashboard / earnings / data composition family — 25 pieces covering
 * /owner-dashboard, /owner/bookings, /owner/analytics, /owner/earnings and the
 * two empty states every new SportsBnB owner actually starts on.
 * Re-exports every composition plus `dashboardCompositions`, the registry a Root
 * can map over. This folder never edits Root.tsx itself.
 */

import type { FC } from "react";

import {
  CalendarHeatIdle,
  calendarHeatIdleDefaultProps,
  type CalendarHeatIdleProps,
} from "./CalendarHeatIdle";
import {
  CalendarHeatMapMonth,
  calendarHeatMapMonthDefaultProps,
  type CalendarHeatMapMonthProps,
} from "./CalendarHeatMapMonth";
import {
  CalendarWeekView,
  calendarWeekViewDefaultProps,
  type CalendarWeekViewProps,
  type WeekBlock,
} from "./CalendarWeekView";
import {
  ChartBookingsLine,
  chartBookingsLineDefaultProps,
  type ChartBookingsLineProps,
} from "./ChartBookingsLine";
import {
  ChartHoursStacked,
  chartHoursStackedDefaultProps,
  type ChartHoursStackedProps,
  type WeekdayHours,
} from "./ChartHoursStacked";
import {
  ChartRevenueArea,
  chartRevenueAreaDefaultProps,
  type ChartRevenueAreaProps,
} from "./ChartRevenueArea";
import {
  ChartRevenueBars,
  chartRevenueBarsDefaultProps,
  type ChartRevenueBarsProps,
  type RevenueBar,
} from "./ChartRevenueBars";
import {
  ChartSparklineDrift,
  chartSparklineDriftDefaultProps,
  type ChartSparklineDriftProps,
} from "./ChartSparklineDrift";
import {
  EarningsMonthOverMonth,
  earningsMonthOverMonthDefaultProps,
  type EarningsMonthOverMonthProps,
} from "./EarningsMonthOverMonth";
import {
  EarningsPayoutFullAmount,
  earningsPayoutFullAmountDefaultProps,
  type EarningsPayoutFullAmountProps,
} from "./EarningsPayoutFullAmount";
import {
  EarningsTodayLive,
  earningsTodayLiveDefaultProps,
  type EarningsTodayLiveProps,
} from "./EarningsTodayLive";
import {
  EarningsTotalCounter,
  earningsTotalCounterDefaultProps,
  type EarningsTotalCounterProps,
} from "./EarningsTotalCounter";
import {
  EmptyDashboardAwaitingBookings,
  emptyDashboardAwaitingBookingsDefaultProps,
  type EmptyDashboardAwaitingBookingsProps,
} from "./EmptyDashboardAwaitingBookings";
import {
  EmptyDashboardFirstVenue,
  emptyDashboardFirstVenueDefaultProps,
  type EmptyDashboardFirstVenueProps,
  type EmptyGhostTile,
} from "./EmptyDashboardFirstVenue";
import {
  FeedBookingsStagger,
  feedBookingsStaggerDefaultProps,
  type FeedBooking,
  type FeedBookingsStaggerProps,
} from "./FeedBookingsStagger";
import {
  FeedLiveTicker,
  feedLiveTickerDefaultProps,
  type FeedLiveTickerProps,
  type TickerBooking,
} from "./FeedLiveTicker";
import {
  FeedNewBookingArrives,
  feedNewBookingArrivesDefaultProps,
  type ArrivingBooking,
  type ExistingRow,
  type FeedNewBookingArrivesProps,
} from "./FeedNewBookingArrives";
import {
  GaugeCapacityIdle,
  gaugeCapacityIdleDefaultProps,
  type GaugeCapacityIdleProps,
} from "./GaugeCapacityIdle";
import {
  GaugeOccupancyArc,
  gaugeOccupancyArcDefaultProps,
  type GaugeOccupancyArcProps,
} from "./GaugeOccupancyArc";
import {
  GaugeUtilisationSegments,
  gaugeUtilisationSegmentsDefaultProps,
  type GaugeUtilisationSegmentsProps,
} from "./GaugeUtilisationSegments";
import {
  KpiTileGridPulse,
  kpiTileGridPulseDefaultProps,
  type KpiPulseFormat,
  type KpiPulseTile,
  type KpiTileGridPulseProps,
} from "./KpiTileGridPulse";
import {
  KpiTileRowReveal,
  kpiTileRowRevealDefaultProps,
  type KpiFormat,
  type KpiTileRowRevealProps,
  type KpiTileSpec,
} from "./KpiTileRowReveal";
import {
  PayoutSentConfirmation,
  payoutSentConfirmationDefaultProps,
  type PayoutSentConfirmationProps,
} from "./PayoutSentConfirmation";
import {
  PayoutStatusPending,
  payoutStatusPendingDefaultProps,
  type PayoutStatusPendingProps,
} from "./PayoutStatusPending";
import {
  PayoutTimelineSteps,
  payoutTimelineStepsDefaultProps,
  type PayoutStop,
  type PayoutTimelineStepsProps,
} from "./PayoutTimelineSteps";

/* ─────────────────────────────── components ────────────────────────────── */

export {
  CalendarHeatIdle,
  CalendarHeatMapMonth,
  CalendarWeekView,
  ChartBookingsLine,
  ChartHoursStacked,
  ChartRevenueArea,
  ChartRevenueBars,
  ChartSparklineDrift,
  EarningsMonthOverMonth,
  EarningsPayoutFullAmount,
  EarningsTodayLive,
  EarningsTotalCounter,
  EmptyDashboardAwaitingBookings,
  EmptyDashboardFirstVenue,
  FeedBookingsStagger,
  FeedLiveTicker,
  FeedNewBookingArrives,
  GaugeCapacityIdle,
  GaugeOccupancyArc,
  GaugeUtilisationSegments,
  KpiTileGridPulse,
  KpiTileRowReveal,
  PayoutSentConfirmation,
  PayoutStatusPending,
  PayoutTimelineSteps,
};

/* ──────────────────────────── props + defaults ─────────────────────────── */

export {
  calendarHeatIdleDefaultProps,
  calendarHeatMapMonthDefaultProps,
  calendarWeekViewDefaultProps,
  chartBookingsLineDefaultProps,
  chartHoursStackedDefaultProps,
  chartRevenueAreaDefaultProps,
  chartRevenueBarsDefaultProps,
  chartSparklineDriftDefaultProps,
  earningsMonthOverMonthDefaultProps,
  earningsPayoutFullAmountDefaultProps,
  earningsTodayLiveDefaultProps,
  earningsTotalCounterDefaultProps,
  emptyDashboardAwaitingBookingsDefaultProps,
  emptyDashboardFirstVenueDefaultProps,
  feedBookingsStaggerDefaultProps,
  feedLiveTickerDefaultProps,
  feedNewBookingArrivesDefaultProps,
  gaugeCapacityIdleDefaultProps,
  gaugeOccupancyArcDefaultProps,
  gaugeUtilisationSegmentsDefaultProps,
  kpiTileGridPulseDefaultProps,
  kpiTileRowRevealDefaultProps,
  payoutSentConfirmationDefaultProps,
  payoutStatusPendingDefaultProps,
  payoutTimelineStepsDefaultProps,
};

export type {
  ArrivingBooking,
  CalendarHeatIdleProps,
  CalendarHeatMapMonthProps,
  CalendarWeekViewProps,
  ChartBookingsLineProps,
  ChartHoursStackedProps,
  ChartRevenueAreaProps,
  ChartRevenueBarsProps,
  ChartSparklineDriftProps,
  EarningsMonthOverMonthProps,
  EarningsPayoutFullAmountProps,
  EarningsTodayLiveProps,
  EarningsTotalCounterProps,
  EmptyDashboardAwaitingBookingsProps,
  EmptyDashboardFirstVenueProps,
  EmptyGhostTile,
  ExistingRow,
  FeedBooking,
  FeedBookingsStaggerProps,
  FeedLiveTickerProps,
  FeedNewBookingArrivesProps,
  GaugeCapacityIdleProps,
  GaugeOccupancyArcProps,
  GaugeUtilisationSegmentsProps,
  KpiFormat,
  KpiPulseFormat,
  KpiPulseTile,
  KpiTileGridPulseProps,
  KpiTileRowRevealProps,
  KpiTileSpec,
  PayoutSentConfirmationProps,
  PayoutStatusPendingProps,
  PayoutStop,
  PayoutTimelineStepsProps,
  RevenueBar,
  TickerBooking,
  WeekBlock,
  WeekdayHours,
};

/* ─────────────────────────────── the registry ──────────────────────────── */

export type DashboardCompositionEntry = {
  /** Stable id. Also the folder name a render lands in. */
  id: string;
  /**
   * The component, with its prop type erased.
   *
   * The registry is heterogeneous — 25 different prop shapes — so the pair
   * cannot stay tied in a single array type. `defineDashboardComposition` below
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
   * True when frame 0 and frame `durationInFrames` are the same state, i.e. the
   * piece can be looped in the dashboard with no visible seam. False means it is
   * event-driven — a figure arriving, a chart drawing — and plays once.
   */
  seamless: boolean;
};

type DashboardCompositionSpec<P extends Record<string, unknown>> = {
  id: string;
  component: FC<P>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: P;
  seamless: boolean;
};

const defineDashboardComposition = <P extends Record<string, unknown>>(
  spec: DashboardCompositionSpec<P>,
): DashboardCompositionEntry => ({
  id: spec.id,
  component: spec.component as unknown as FC<never>,
  durationInFrames: spec.durationInFrames,
  fps: spec.fps,
  width: spec.width,
  height: spec.height,
  defaultProps: spec.defaultProps,
  seamless: spec.seamless,
});

export const dashboardCompositions: DashboardCompositionEntry[] = [
  /* ── Earnings counters and revenue reveals ──────────────────────────── */
  defineDashboardComposition({
    id: "DashboardEarningsTotalCounter",
    component: EarningsTotalCounter,
    durationInFrames: 180,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: earningsTotalCounterDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardEarningsPayoutFullAmount",
    component: EarningsPayoutFullAmount,
    durationInFrames: 150,
    fps: 30,
    width: 1200,
    height: 675,
    defaultProps: earningsPayoutFullAmountDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardEarningsMonthOverMonth",
    component: EarningsMonthOverMonth,
    durationInFrames: 150,
    fps: 30,
    width: 1200,
    height: 675,
    defaultProps: earningsMonthOverMonthDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardEarningsTodayLive",
    component: EarningsTodayLive,
    durationInFrames: 180,
    fps: 30,
    width: 720,
    height: 400,
    defaultProps: earningsTodayLiveDefaultProps,
    seamless: true,
  }),

  /* ── Bar, line and area chart draw-ins ──────────────────────────────── */
  defineDashboardComposition({
    id: "DashboardChartRevenueBars",
    component: ChartRevenueBars,
    durationInFrames: 180,
    fps: 30,
    width: 1280,
    height: 720,
    defaultProps: chartRevenueBarsDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardChartBookingsLine",
    component: ChartBookingsLine,
    durationInFrames: 150,
    fps: 30,
    width: 1280,
    height: 720,
    defaultProps: chartBookingsLineDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardChartRevenueArea",
    component: ChartRevenueArea,
    durationInFrames: 150,
    fps: 30,
    width: 1280,
    height: 720,
    defaultProps: chartRevenueAreaDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardChartHoursStacked",
    component: ChartHoursStacked,
    durationInFrames: 150,
    fps: 30,
    width: 1280,
    height: 720,
    defaultProps: chartHoursStackedDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardChartSparklineDrift",
    component: ChartSparklineDrift,
    durationInFrames: 240,
    fps: 30,
    width: 720,
    height: 300,
    defaultProps: chartSparklineDriftDefaultProps,
    seamless: true,
  }),

  /* ── Occupancy / utilisation gauges ─────────────────────────────────── */
  defineDashboardComposition({
    id: "DashboardGaugeOccupancyArc",
    component: GaugeOccupancyArc,
    durationInFrames: 180,
    fps: 60,
    width: 600,
    height: 600,
    defaultProps: gaugeOccupancyArcDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardGaugeUtilisationSegments",
    component: GaugeUtilisationSegments,
    durationInFrames: 180,
    fps: 60,
    width: 720,
    height: 720,
    defaultProps: gaugeUtilisationSegmentsDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardGaugeCapacityIdle",
    component: GaugeCapacityIdle,
    durationInFrames: 240,
    fps: 30,
    width: 600,
    height: 600,
    defaultProps: gaugeCapacityIdleDefaultProps,
    seamless: true,
  }),

  /* ── Booking feed staggers ──────────────────────────────────────────── */
  defineDashboardComposition({
    id: "DashboardFeedBookingsStagger",
    component: FeedBookingsStagger,
    durationInFrames: 120,
    fps: 30,
    width: 720,
    height: 640,
    defaultProps: feedBookingsStaggerDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardFeedNewBookingArrives",
    component: FeedNewBookingArrives,
    durationInFrames: 120,
    fps: 30,
    width: 720,
    height: 520,
    defaultProps: feedNewBookingArrivesDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardFeedLiveTicker",
    component: FeedLiveTicker,
    durationInFrames: 300,
    fps: 30,
    width: 720,
    height: 420,
    defaultProps: feedLiveTickerDefaultProps,
    seamless: true,
  }),

  /* ── Calendar heat maps and week views ──────────────────────────────── */
  defineDashboardComposition({
    id: "DashboardCalendarHeatMapMonth",
    component: CalendarHeatMapMonth,
    durationInFrames: 180,
    fps: 30,
    width: 900,
    height: 640,
    defaultProps: calendarHeatMapMonthDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardCalendarWeekView",
    component: CalendarWeekView,
    durationInFrames: 150,
    fps: 30,
    width: 1280,
    height: 720,
    defaultProps: calendarWeekViewDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardCalendarHeatIdle",
    component: CalendarHeatIdle,
    durationInFrames: 240,
    fps: 30,
    width: 900,
    height: 420,
    defaultProps: calendarHeatIdleDefaultProps,
    seamless: true,
  }),

  /* ── Payout status and timeline ─────────────────────────────────────── */
  defineDashboardComposition({
    id: "DashboardPayoutStatusPending",
    component: PayoutStatusPending,
    durationInFrames: 180,
    fps: 30,
    width: 720,
    height: 220,
    defaultProps: payoutStatusPendingDefaultProps,
    seamless: true,
  }),
  defineDashboardComposition({
    id: "DashboardPayoutTimelineSteps",
    component: PayoutTimelineSteps,
    durationInFrames: 150,
    fps: 30,
    width: 900,
    height: 720,
    defaultProps: payoutTimelineStepsDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardPayoutSentConfirmation",
    component: PayoutSentConfirmation,
    durationInFrames: 180,
    fps: 30,
    width: 960,
    height: 620,
    defaultProps: payoutSentConfirmationDefaultProps,
    seamless: false,
  }),

  /* ── KPI tile groups ────────────────────────────────────────────────── */
  defineDashboardComposition({
    id: "DashboardKpiTileRowReveal",
    component: KpiTileRowReveal,
    durationInFrames: 150,
    fps: 30,
    width: 1440,
    height: 400,
    defaultProps: kpiTileRowRevealDefaultProps,
    seamless: false,
  }),
  defineDashboardComposition({
    id: "DashboardKpiTileGridPulse",
    component: KpiTileGridPulse,
    durationInFrames: 300,
    fps: 30,
    width: 1200,
    height: 760,
    defaultProps: kpiTileGridPulseDefaultProps,
    seamless: true,
  }),

  /* ── Empty dashboard, where every real owner starts ─────────────────── */
  defineDashboardComposition({
    id: "DashboardEmptyFirstVenue",
    component: EmptyDashboardFirstVenue,
    durationInFrames: 300,
    fps: 30,
    width: 1280,
    height: 800,
    defaultProps: emptyDashboardFirstVenueDefaultProps,
    seamless: true,
  }),
  defineDashboardComposition({
    id: "DashboardEmptyAwaitingBookings",
    component: EmptyDashboardAwaitingBookings,
    durationInFrames: 270,
    fps: 30,
    width: 1180,
    height: 760,
    defaultProps: emptyDashboardAwaitingBookingsDefaultProps,
    seamless: true,
  }),
];
