import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Banknote, Building2, Calendar, Clock3, Loader2, Plus, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { bookingStatusDescriptor } from "@/features/booking/status";

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
    isLoading: analyticsLoading,
    isError: analyticsError,
    refetch: refetchAnalytics,
    isFetching: analyticsFetching,
  } = useOwnerAnalytics();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

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
          <Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
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
      value: `֏${(analytics?.totalRevenue ?? 0).toLocaleString()}`,
      change: changeOf(thisMonth?.revenue, lastMonth?.revenue),
      icon: Banknote,
      color: "text-primary",
      bgColor: "bg-primary-soft",
    },
    {
      label: "Total Bookings",
      value: (analytics?.totalBookings ?? 0).toString(),
      change: changeOf(thisMonth?.bookings, lastMonth?.bookings),
      icon: Calendar,
      color: "text-information",
      bgColor: "bg-information/10",
    },
    {
      label: "Unique Customers",
      value: (analytics?.uniqueCustomers ?? 0).toString(),
      change: null,
      icon: Users,
      color: "text-brand-tuff",
      bgColor: "bg-brand-tuff-soft",
    },
    {
      label: "Occupancy Rate",
      value: `${analytics?.occupancyRate ?? 0}%`,
      change: null,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
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
    <OwnerLayout title="Overview" subtitle="Bookings, schedule, and venue health at a glance.">
      <section aria-labelledby="business-snapshot-heading">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 id="business-snapshot-heading" className="font-display text-lg font-semibold tracking-extra-tight text-foreground">
              Business snapshot
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Current totals across your venues</p>
          </div>
        </div>

        {analyticsError ? (
          <Card>
            <ErrorPanel
              what="your business snapshot"
              description="Your analytics are temporarily unavailable. Booking and venue data are unaffected."
              onRetry={() => refetchAnalytics()}
              isRetrying={analyticsFetching}
              className="py-8"
            />
          </Card>
        ) : analyticsLoading ? (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" role="status" aria-label="Loading your business snapshot">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="mt-5 h-6 w-24" />
                  <Skeleton className="mt-2 h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="min-w-0">
                  <CardContent className="p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", stat.bgColor)}>
                        <Icon aria-hidden="true" className={cn("h-5 w-5", stat.color)} />
                      </div>
                      {stat.change && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "tabular-nums",
                            stat.change.startsWith("-")
                              ? "bg-destructive/5 text-destructive"
                              : "bg-primary-soft text-primary",
                          )}
                          title="Compared with last month"
                        >
                          {stat.change}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate font-display text-xl font-semibold tracking-extra-tight text-foreground sm:text-2xl" title={stat.value}>
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6" aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="mb-3 font-display text-lg font-semibold tracking-extra-tight text-foreground">
          Quick actions
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button className="justify-start" onClick={() => navigate("/add-venue")}>
            <Plus aria-hidden="true" />
            Add new venue
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => navigate("/owner/schedule")}>
            <Calendar aria-hidden="true" />
            Manage schedule
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => navigate("/owner/hours")}>
            <Clock3 aria-hidden="true" />
            Set opening hours
          </Button>
        </div>
      </section>

      {/* min-w-0 on both columns. The week calendar inside deliberately sets
          `min-w-[800px]` on its grid and wraps it in `overflow-x-auto` so it
          scrolls on a phone — but an explicit min-width still counts toward a
          grid item's min-content, and the item defaults to `min-width: auto`.
          The 800px propagated all the way out and scrolled the entire owner
          dashboard sideways instead of just the calendar. */}
      <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        {/* Main Content - Calendar */}
        <div className="min-w-0 space-y-6">
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
          ) : venuesLoading ? (
            <Card>
              <CardContent className="p-5" role="status" aria-label="Loading your schedule">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="mt-2 h-4 w-24" />
                  </div>
                  <Skeleton className="h-11 w-28" />
                </div>
                <Skeleton className="mt-5 h-72 w-full" />
              </CardContent>
            </Card>
          ) : myVenues.length === 0 ? (
            <Card>
              <EmptyState
                icon={Building2}
                title="No venues yet"
                description="Add your first venue to start managing bookings and see your schedule."
                actionLabel="Add Your First Venue"
                actionHref="/add-venue"
              />
            </Card>
          ) : analyticsError ? (
            <Card>
              <ErrorPanel
                what="your schedule"
                description="We couldn't verify the latest bookings. Don't assume the calendar is clear until this loads."
                onRetry={() => refetchAnalytics()}
                isRetrying={analyticsFetching}
              />
            </Card>
          ) : analyticsLoading ? (
            <Card>
              <CardContent className="p-5" role="status" aria-label="Loading your schedule">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="mt-2 h-4 w-24" />
                  </div>
                  <Skeleton className="h-11 w-28" />
                </div>
                <Skeleton className="mt-5 h-72 w-full" />
              </CardContent>
            </Card>
          ) : (
            <WeekCalendar
              bookings={demoBookings}
              resourceName={myVenues[0]?.name || "Your Venue"}
              onBookingClick={(booking) => setSelectedBooking(booking)}
            />
          )}

          {/* Recent Bookings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
              <CardTitle as="h2" className="text-lg">Recent bookings</CardTitle>
              <Button variant="ghost" onClick={() => navigate("/owner/bookings")}>
                View all
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
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
              ) : analyticsLoading ? (
                <div className="space-y-4 py-1" role="status" aria-label="Loading recent bookings">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="mt-2 h-3 w-24" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : upcomingReservations.length > 0 ? (
                <div>
                  {upcomingReservations.map((booking: any, index: number) => {
                    const bookingDate = parseISO(booking.booking_date);
                    let dateLabel = format(bookingDate, "MMM d");
                    if (isToday(bookingDate)) dateLabel = "Today";
                    else if (isTomorrow(bookingDate)) dateLabel = "Tomorrow";

                    return (
                      <div key={booking.id}>
                        <div className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                              <Calendar aria-hidden="true" className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{booking.venue_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {dateLabel} at {formatTimeOfDay(booking.booking_time)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3 pl-[3.25rem] sm:block sm:pl-0 sm:text-right">
                            <p className="font-semibold tabular-nums text-foreground">
                              ֏{booking.total_price.toLocaleString()}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {bookingStatusDescriptor(booking.status).label}
                            </Badge>
                          </div>
                        </div>
                        {index < upcomingReservations.length - 1 && <Separator />}
                      </div>
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
          {/* My Venues */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
              <CardTitle as="h2" className="text-lg">My venues</CardTitle>
              <Button variant="ghost" onClick={() => navigate("/owner/venues")}>
                View all
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {venuesError ? (
                <ErrorPanel
                  what="your venues"
                  description="Your listings are unaffected. Try loading them again."
                  onRetry={() => refetchVenues()}
                  isRetrying={venuesFetching}
                  className="py-8"
                />
              ) : venuesLoading ? (
                <div className="space-y-3" role="status" aria-label="Loading your venues">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3 p-2">
                      <Skeleton className="h-12 w-12 shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="mt-2 h-3 w-20" />
                      </div>
                    </div>
                  ))}
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
                      className="flex min-h-16 items-center gap-3 rounded-lg p-2 transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-1">
                        <img
                          src={getVenueImage(venue)}
                          alt="" loading="lazy" decoding="async"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{venue.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{venue.city}</p>
                      </div>
                      <Badge variant={venue.is_active ? "default" : "secondary"}>
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
            <CardHeader className="pb-4">
              <CardTitle as="h2" className="text-lg">This week</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {analyticsError ? (
                <ErrorPanel
                  what="this week's performance"
                  onRetry={() => refetchAnalytics()}
                  isRetrying={analyticsFetching}
                  className="py-8"
                />
              ) : analyticsLoading ? (
                <div className="space-y-4" role="status" aria-label="Loading this week's performance">
                  <Skeleton className="h-4 w-full" />
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Occupancy</span>
                      <span className="font-medium tabular-nums text-foreground">{analytics?.occupancyRate || 0}%</span>
                    </div>
                    <Progress value={analytics?.occupancyRate || 0} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-lg bg-surface-1 p-3">
                      <p className="font-display text-xl font-semibold tracking-extra-tight text-foreground">{analytics?.totalBookings || 0}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Bookings</p>
                    </div>
                    <div className="rounded-lg bg-surface-1 p-3">
                      <p className="font-display text-xl font-semibold tracking-extra-tight text-foreground">
                        ֏{((analytics?.totalRevenue || 0) / 1000).toFixed(0)}k
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Revenue</p>
                    </div>
                  </div>
                </div>
              )}
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
