import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Calendar, DollarSign, Users, TrendingUp, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { EmptyState } from "@/components/owner/EmptyState";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { WeekCalendar } from "@/components/owner/schedule/WeekCalendar";
import { BookingDetailDrawer } from "@/components/owner/schedule/BookingDetailDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues, getVenueImage } from "@/hooks/useVenues";
import { useOwnerAnalytics } from "@/hooks/useOwnerAnalytics";
import { format, parseISO, isToday, isTomorrow } from "date-fns";

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
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OwnerLayout>
    );
  }

  const stats = [
    {
      label: "Total Revenue",
      value: analytics ? `֏${analytics.totalRevenue.toLocaleString()}` : "֏0",
      change: analytics?.totalRevenue > 0 ? "+12%" : "—",
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      label: "Total Bookings",
      value: analytics?.totalBookings?.toString() || "0",
      change: analytics?.totalBookings > 0 ? "+8%" : "—",
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Unique Customers",
      value: analytics?.uniqueCustomers?.toString() || "0",
      change: analytics?.uniqueCustomers > 0 ? "+15%" : "—",
      icon: Users,
      color: "text-violet-600",
      bgColor: "bg-violet-100 dark:bg-violet-900/30",
    },
    {
      label: "Occupancy Rate",
      value: analytics ? `${analytics.occupancyRate}%` : "0%",
      change: analytics?.occupancyRate > 0 ? "+5%" : "—",
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
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {stat.change}
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content - Calendar */}
        <div className="lg:col-span-2 space-y-6">
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

                    return (
                      <div key={booking.id}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{booking.venue_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {dateLabel} at {booking.booking_time}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              ֏{booking.total_price.toLocaleString()}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {booking.status || "Confirmed"}
                            </Badge>
                          </div>
                        </div>
                        {index < upcomingReservations.length - 1 && <Separator className="mt-4" />}
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
        <div className="space-y-6">
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
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : myVenues.length > 0 ? (
                <div className="space-y-3">
                  {myVenues.slice(0, 3).map((venue) => (
                    <div
                      key={venue.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/venue/${venue.id}/edit`)}
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                        <img
                          src={getVenueImage(venue)}
                          alt={venue.name}
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
                    </div>
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
