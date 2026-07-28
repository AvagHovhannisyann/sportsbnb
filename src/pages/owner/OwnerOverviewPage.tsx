import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import type { MotionProps, Variants } from "framer-motion";
import { Loader2, Plus, Calendar, Banknote, Users, TrendingUp, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { WeekCalendar } from "@/components/owner/schedule/WeekCalendar";
import { BookingDetailDrawer } from "@/components/owner/schedule/BookingDetailDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues, getVenueImage } from "@/hooks/useVenues";
import { useOwnerAnalytics } from "@/hooks/useOwnerAnalytics";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { formatTimeOfDay } from "@/lib/time";
import { cn } from "@/lib/utils";
import { easeOutExpo } from "@/lib/motion";
import { bookingStatusDescriptor } from "@/features/booking/status";

/* ------------------------------------------------------------------
   Motion.

   Three things move on this page, and each one is answering a question
   the owner is already asking:

     the four figures count up   — "did this number change?"
     the occupancy bar draws in  — the same answer, drawn
     the booking feed staggers   — "how many are coming, and in what order?"

   Nothing else does. The calendar, the venue list and the quick
   actions arrive with the region they sit in and then hold still; a
   dashboard someone reads every morning should not re-perform itself
   every morning.

   Easing comes from lib/motion, which mirrors --ease-out-expo in
   index.css, so this page agrees with the rest of the app about what a
   settle looks like. Under `prefers-reduced-motion: reduce` the motion
   props are not passed at all rather than given a zero duration, and
   the counters render their final figure on the first frame — the
   convention HomePage and DiscoverPage already established.
   ------------------------------------------------------------------ */

/** Card is a forwardRef div, so this animates it in place — no extra wrapper
    element inside the stats grid, and therefore no change to the layout. */
const MotionCard = motion.create(Card);

/** Gap between one stat card's entrance and the next. Four cards, so no cap
    is needed: the row is fully dealt in 150ms. */
const STAT_STAGGER_STEP = 0.05;

/** Gap between one booking row and the next. */
const FEED_STAGGER_STEP = 0.045;
/**
 * The index past which every remaining row shares the last delay.
 *
 * The overview slices its feed to five, so the cap is inert here — it exists
 * so that raising that slice later cannot turn the stagger into a queue. Past
 * this index rows arrive together, which is what someone scanning a list for
 * "what's next" wants anyway.
 */
const FEED_STAGGER_CAP = 8;

/** How long a figure takes to reach its value. */
const COUNT_UP_MS = 550;

const statVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOutExpo, delay: index * STAT_STAGGER_STEP },
  }),
};

const feedRowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: easeOutExpo,
      delay: Math.min(index, FEED_STAGGER_CAP) * FEED_STAGGER_STEP,
    },
  }),
};

/**
 * Counts a figure up once it is real, and lands on it exactly.
 *
 * Two details matter more than the animation. The last frame assigns
 * `target` itself rather than a rounded interpolation, so what finally sits
 * on screen is the analytics figure formatted exactly as it was before —
 * a count-up that settled on its own approximation would be a dashboard
 * quietly reporting the wrong revenue. And the tween starts from whatever is
 * currently displayed, not from zero, so a react-query refetch that nudges a
 * figure animates the difference instead of dropping to nothing and climbing
 * back up.
 *
 * `active` gates it on the data having arrived: the first render has no
 * analytics, and counting 0 → 0 before the fetch resolves would spend the
 * animation on a placeholder and leave the real number to appear abruptly.
 */
const useCountUp = (target: number, active: boolean) => {
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (prefersReduced || !active || displayRef.current === target) {
      setDisplay(target);
      displayRef.current = target;
      return;
    }

    const from = displayRef.current;
    const delta = target - from;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now: number) {
      const t = Math.min((now - start) / COUNT_UP_MS, 1);
      if (t >= 1) {
        setDisplay(target);
        return;
      }
      // Expo-out — the curve --ease-out-expo approximates as a bezier.
      setDisplay(Math.round(from + delta * (1 - Math.pow(2, -10 * t))));
      frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [target, active, prefersReduced]);

  return display;
};

const OwnerOverviewPage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const {
    data: myVenues = [],
    isLoading: venuesLoading,
    isError: venuesError,
    refetch: refetchVenues,
    isFetching: venuesFetching,
  } = useOwnerVenues(user?.id);
  const {
    data: analytics,
    isError: analyticsError,
    refetch: refetchAnalytics,
    isFetching: analyticsFetching,
  } = useOwnerAnalytics();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const prefersReduced = useReducedMotion();

  // The four figures the page animates. Declared here, above the `authLoading`
  // early return, because they are hooks — and read straight off `analytics`,
  // so each one is the same number it always was, just on its way there.
  const hasAnalytics = !!analytics;
  const revenueCount = useCountUp(analytics?.totalRevenue ?? 0, hasAnalytics);
  const bookingsCount = useCountUp(analytics?.totalBookings ?? 0, hasAnalytics);
  const customersCount = useCountUp(analytics?.uniqueCustomers ?? 0, hasAnalytics);
  const occupancyCount = useCountUp(analytics?.occupancyRate ?? 0, hasAnalytics);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
    // Deliberately no onboarding redirect. /onboarding/owner is a deprecated
    // stub that immediately sends owners back to /owner-dashboard, so this
    // pair looped forever for any owner with onboarding_completed = false —
    // which is every newly created owner. Owners set their venue up from the
    // dashboard itself, which is what the stub's own comment says.
  }, [user, profile, authLoading, navigate]);

  if (authLoading) {
    return (
      <OwnerLayout title="Overview">
        <div className="flex items-center justify-center h-64" role="status" aria-label="Loading your dashboard">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OwnerLayout>
    );
  }

  // Month-over-month, computed, or absent.
  //
  // These four badges read "+12%", "+8%", "+15%" and "+5%" — string literals,
  // shown whenever the matching figure was above zero. An owner looking at
  // "Total Revenue ֏27,000 +12%" on their own business dashboard would
  // reasonably conclude revenue grew 12% against the previous period. Nothing
  // was compared; the numbers were decoration.
  //
  // `revenueByMonth` carries six real months, so revenue and bookings can show
  // a true change. Unique customers and occupancy have no prior-period figure
  // anywhere in the analytics, so they show none — an absent badge is honest,
  // an invented one is not.
  const monthly = analytics?.revenueByMonth ?? [];
  const thisMonth = monthly[monthly.length - 1];
  const lastMonth = monthly[monthly.length - 2];
  const changeOf = (now?: number, before?: number): string | null => {
    if (now === undefined || before === undefined || before === 0) return null;
    const pct = Math.round(((now - before) / before) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}%`;
  };

  const stats = [
    {
      label: "Total Revenue",
      value: `֏${revenueCount.toLocaleString()}`,
      change: changeOf(thisMonth?.revenue, lastMonth?.revenue),
      icon: Banknote,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      label: "Total Bookings",
      value: bookingsCount.toString(),
      change: changeOf(thisMonth?.bookings, lastMonth?.bookings),
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Unique Customers",
      value: customersCount.toString(),
      change: null,
      icon: Users,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    {
      label: "Occupancy Rate",
      value: `${occupancyCount}%`,
      change: null,
      icon: TrendingUp,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
  ];

  // Format upcoming reservations
  const upcomingReservations = (analytics?.recentBookings || [])
    .filter((booking: any) => {
      const bookingDate = parseISO(booking.booking_date);
      return bookingDate >= new Date();
    })
    .slice(0, 5);

  // Demo bookings for calendar
  const demoBookings = upcomingReservations.map((b: any) => ({
    id: b.id,
    booking_date: b.booking_date,
    booking_time: b.booking_time || "10:00",
    duration_hours: b.duration_hours || 1,
    venue_name: b.venue_name,
    total_price: b.total_price,
    status: b.status || "confirmed",
    customer_name: "Customer",
  }));

  return (
    <OwnerLayout title="Overview" subtitle="Welcome back! Here's what's happening today.">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          // Reduced motion: the props are omitted entirely rather than given a
          // zero duration, so the card mounts in its final state.
          const motionProps: MotionProps = prefersReduced
            ? {}
            : { variants: statVariants, initial: "hidden", animate: "visible", custom: index };
          return (
            <MotionCard key={stat.label} className="relative overflow-hidden" {...motionProps}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  {stat.change && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs font-normal tabular-nums",
                        stat.change.startsWith("-") && "text-destructive",
                      )}
                      title="Compared with last month"
                    >
                      {stat.change}
                    </Badge>
                  )}
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </MotionCard>
          );
        })}
      </div>

      {/* min-w-0 on both columns. The week calendar inside deliberately sets
          `min-w-[800px]` on its grid and wraps it in `overflow-x-auto` so it
          scrolls on a phone — but an explicit min-width still counts toward a
          grid item's min-content, and the item defaults to `min-width: auto`.
          The 800px propagated all the way out and scrolled the entire owner
          dashboard sideways instead of just the calendar. */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content - Calendar */}
        <div className="min-w-0 lg:col-span-2 space-y-6">
          {/* An owner with venues must never be told they have none because a
              request failed — the empty state's call to action is "add your
              first venue", which invites a duplicate listing. */}
          {venuesError ? (
            <Card>
              <ErrorPanel
                what="your venues"
                description="We couldn't reach our servers. Your listings are unaffected."
                onRetry={() => refetchVenues()}
                isRetrying={venuesFetching}
              />
            </Card>
          ) : myVenues.length > 0 ? (
            <WeekCalendar
              bookings={demoBookings}
              resourceName={myVenues[0]?.name || "Your Venue"}
              onBookingClick={(booking) => setSelectedBooking(booking)}
            />
          ) : (
            <Card>
              <EmptyState
                icon={Building2}
                title="No venues yet"
                description="Add your first venue to start managing bookings and see your schedule."
                actionLabel="Add Your First Venue"
                actionHref="/add-venue"
              />
            </Card>
          )}

          {/* Recent Bookings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Bookings</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/owner/bookings")}>
                View all
              </Button>
            </CardHeader>
            <CardContent>
              {/* "No bookings yet" on a failed fetch is the dangerous one: an
                  owner who believes their day is clear does not turn up. */}
              {analyticsError ? (
                <ErrorPanel
                  what="your bookings"
                  description="We couldn't reach our servers. Don't assume your schedule is clear until this loads."
                  onRetry={() => refetchAnalytics()}
                  isRetrying={analyticsFetching}
                  className="py-8"
                />
              ) : upcomingReservations.length > 0 ? (
                <div className="space-y-4">
                  {upcomingReservations.map((booking: any, index: number) => {
                    const bookingDate = parseISO(booking.booking_date);
                    let dateLabel = format(bookingDate, "MMM d");
                    if (isToday(bookingDate)) dateLabel = "Today";
                    else if (isTomorrow(bookingDate)) dateLabel = "Tomorrow";

                    const rowMotion: MotionProps = prefersReduced
                      ? {}
                      : { variants: feedRowVariants, initial: "hidden", animate: "visible", custom: index };

                    return (
                      <motion.div key={booking.id} {...rowMotion}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{booking.venue_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {dateLabel} at {formatTimeOfDay(booking.booking_time)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              ֏{booking.total_price.toLocaleString()}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {bookingStatusDescriptor(booking.status).label}
                            </Badge>
                          </div>
                        </div>
                        {index < upcomingReservations.length - 1 && <Separator className="mt-4" />}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No bookings yet"
                  description="When customers book your venues, they'll appear here."
                  className="py-8"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="min-w-0 space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/add-venue")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Venue
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/owner/schedule")}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Manage Schedule
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/owner/hours")}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Set Opening Hours
              </Button>
            </CardContent>
          </Card>

          {/* My Venues */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">My Venues</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/owner/venues")}>
                View all
              </Button>
            </CardHeader>
            <CardContent>
              {venuesLoading ? (
                <div className="flex justify-center py-8" role="status" aria-label="Loading your dashboard">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : myVenues.length > 0 ? (
                <div className="space-y-3">
                  {myVenues.slice(0, 3).map((venue) => (
                    // A Link rather than a div with navigate(): this is
                    // navigation, so it should be focusable, openable in a new
                    // tab, and announced as a link. It was none of those.
                    <Link
                      key={venue.id}
                      to={`/venue/${venue.id}/edit`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                        <img
                          src={getVenueImage(venue)}
                          alt={venue.name} loading="lazy" decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{venue.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{venue.city}</p>
                      </div>
                      <Badge variant={venue.is_active ? "default" : "secondary"} className="text-xs">
                        {venue.is_active ? "Active" : "Draft"}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Building2}
                  title="No venues"
                  description="Add your first venue to get started."
                  actionLabel="Add Venue"
                  actionHref="/add-venue"
                  className="py-6"
                />
              )}
            </CardContent>
          </Card>

          {/* Weekly Occupancy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">This Week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Occupancy</span>
                  <span className="font-medium text-foreground">{analytics?.occupancyRate || 0}%</span>
                </div>
                <Progress value={analytics?.occupancyRate || 0} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-foreground">{analytics?.totalBookings || 0}</p>
                  <p className="text-xs text-muted-foreground">Bookings</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-foreground">
                    ֏{((analytics?.totalRevenue || 0) / 1000).toFixed(0)}k
                  </p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Booking Detail Drawer */}
      <BookingDetailDrawer
        booking={selectedBooking}
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      />
    </OwnerLayout>
  );
};

export default OwnerOverviewPage;
