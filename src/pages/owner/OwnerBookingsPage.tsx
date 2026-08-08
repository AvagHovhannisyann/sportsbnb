import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TONE_CHIP } from "@/lib/chips";
import { Calendar, Search, Download, CheckCircle2, Clock3, Banknote, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { BookingDetailDrawer } from "@/components/owner/schedule/BookingDetailDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues } from "@/hooks/useVenues";
import { useOwnerAnalytics } from "@/hooks/useOwnerAnalytics";
import { useOwnerBookings, type OwnerBooking } from "@/hooks/useOwnerBookings";
import { format, parseISO } from "date-fns";
import { formatTimeOfDay } from "@/lib/time";
import { bookingStatusDescriptor, type BookingStatusTone } from "@/features/booking/status";

const OwnerBookingsPage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isProfileLoading } = useAuth();
  const {
    data: myVenues = [],
    isLoading: venuesLoading,
    isError: venuesError,
  } = useOwnerVenues(user?.id);
  // Two sources on purpose. The table needs every status; the summary cards
  // are revenue figures and revenue counts confirmed money only.
  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    isError: bookingsError,
    refetch: refetchBookings,
    isFetching: bookingsFetching,
  } = useOwnerBookings();
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsError,
  } = useOwnerAnalytics();

  const [selectedVenueId, setSelectedVenueId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<OwnerBooking | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
    // isProfileLoading, not just authLoading: authLoading covers the
    // session only, so without it this reads user_type off a null profile
    // and bounces the owner. RequireRole already guards this route; keeping
    // the check correct here means it stays safe if that ever changes.
    if (!authLoading && !isProfileLoading && user && profile?.user_type !== "owner") {
      navigate("/dashboard");
    }
  }, [user, profile, authLoading, isProfileLoading, navigate]);

  if (authLoading || (bookingsLoading && !bookingsError)) {
    return (
      <OwnerLayout title="Bookings">
        <div className="space-y-5" role="status" aria-label="Loading bookings">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="mt-4 h-7 w-20" />
                  <Skeleton className="mt-2 h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card><CardContent className="p-4"><Skeleton className="h-11 w-full" /></CardContent></Card>
          <Card><CardContent className="space-y-3 p-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></CardContent></Card>
        </div>
      </OwnerLayout>
    );
  }

  if (bookingsError) {
    return (
      <OwnerLayout title="Bookings" subtitle="Review every reservation across your venues.">
        <Card>
          <ErrorPanel
            what="your bookings"
            description="We couldn't reach our servers. Don't assume your schedule is clear until this loads."
            onRetry={() => refetchBookings()}
            isRetrying={bookingsFetching}
          />
        </Card>
      </OwnerLayout>
    );
  }

  // Straight from the hook. This used to remap analytics' confirmed-only rows
  // and hardcode the customer as "Customer" / "customer@example.com" on every
  // one of them — while the search box below filters on customer_name.
  const allBookings = bookings;
  const confirmedCount = allBookings.filter((booking) => booking.status === "confirmed").length;
  const awaitingPaymentCount = allBookings.filter(
    (booking) => booking.status === "pending" || booking.status === "pending_payment",
  ).length;
  const hasActiveFilters = selectedVenueId !== "all" || statusFilter !== "all" || !!searchQuery;

  // Apply filters
  const filteredBookings = allBookings.filter((booking) => {
    if (selectedVenueId !== "all" && booking.venue_id !== selectedVenueId) return false;
    if (statusFilter !== "all" && booking.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        booking.venue_name.toLowerCase().includes(query) ||
        booking.customer_name?.toLowerCase().includes(query) ||
        booking.customer_email?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Keyed by tone rather than by status, so the six statuses added with in-app
  // payment cannot fall through to grey the way they did when this map listed
  // only the four legacy values.
  const toneClasses: Record<BookingStatusTone, string> = {
    positive: TONE_CHIP.positive,
    warning: TONE_CHIP.warning,
    danger: TONE_CHIP.danger,
    neutral: TONE_CHIP.neutral,
  };

  return (
    <OwnerLayout title="Bookings" subtitle="Review every reservation across your venues.">
      <section aria-labelledby="booking-overview-heading">
        <h2 id="booking-overview-heading" className="sr-only">Booking overview</h2>
        <div className="mb-5 grid grid-cols-2 gap-3 xl:mb-6 xl:grid-cols-4">
          <Card><CardContent className="p-4">
            <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" />
            <p className="stat-numeral mt-4 text-2xl font-semibold text-foreground">{allBookings.length}</p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Total bookings</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
            <p className="stat-numeral mt-4 text-2xl font-semibold text-foreground">{confirmedCount}</p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Confirmed</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <Clock3 className="h-5 w-5 text-warning" aria-hidden="true" />
            <p className="stat-numeral mt-4 text-2xl font-semibold text-foreground">{awaitingPaymentCount}</p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Awaiting payment</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <Banknote className="h-5 w-5 text-brand-tuff" aria-hidden="true" />
            <p
              className="mt-4 truncate text-xl font-semibold text-foreground sm:text-2xl"
              title={analyticsLoading || analyticsError ? "Unavailable" : `֏${(analytics?.totalRevenue || 0).toLocaleString()}`}
            >
              {analyticsLoading || analyticsError ? (
                <span className="stat-numeral">—</span>
              ) : (
                <Price amount={analytics?.totalRevenue || 0} />
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Confirmed revenue</p>
          </CardContent></Card>
        </div>
      </section>

      <Card className="mb-5 sm:mb-6">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(14rem,1fr)_minmax(10rem,14rem)_minmax(10rem,13rem)_auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="booking-search">Search bookings</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="booking-search"
                  name="bookingSearch"
                  type="search"
                  placeholder="Venue, customer, or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label id="booking-venue-filter-label">Venue</Label>
              {venuesLoading ? (
                <Skeleton className="h-11 w-full" />
              ) : (
                <Select value={selectedVenueId} onValueChange={setSelectedVenueId} disabled={venuesError}>
                  <SelectTrigger aria-labelledby="booking-venue-filter-label">
                    <SelectValue placeholder="All venues" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All venues</SelectItem>
                    {myVenues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {venuesError && <p className="text-xs text-destructive">Venue filter unavailable</p>}
            </div>

            <div className="space-y-2">
              <Label id="booking-status-filter-label">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger aria-labelledby="booking-status-filter-label">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="pending_payment">Awaiting payment</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="cancelled_by_player">Cancelled by player</SelectItem>
                  <SelectItem value="cancelled_by_owner">Cancelled by you</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="expired">Expired unpaid</SelectItem>
                  <SelectItem value="no_show">No-show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" disabled title="Export is not connected yet" className="w-full lg:w-auto">
              <Download aria-hidden="true" />
              Export unavailable
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {filteredBookings.length} of {allBookings.length} booking{allBookings.length === 1 ? "" : "s"}
            </p>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedVenueId("all");
                  setStatusFilter("all");
                  setSearchQuery("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {filteredBookings.length === 0 ? (
        <Card>
          <EmptyState
            icon={Calendar}
            title="No bookings found"
            description={
              allBookings.length === 0
                ? "When customers book your venues, they'll appear here."
                : "No bookings match your current filters."
            }
            actionLabel={allBookings.length > 0 ? "Clear filters" : undefined}
            onAction={allBookings.length > 0 ? () => {
              setSelectedVenueId("all");
              setStatusFilter("all");
              setSearchQuery("");
            } : undefined}
          />
        </Card>
      ) : (
        <>
          <div className="space-y-3 xl:hidden" aria-label="Bookings">
            {filteredBookings.map((booking) => {
              const status = bookingStatusDescriptor(booking.status);
              const bookingDate = format(parseISO(booking.booking_date), "MMM d, yyyy");

              return (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => setSelectedBooking(booking)}
                  className="w-full rounded-lg border border-border bg-card p-4 text-left shadow-xs transition-[background-color,border-color,box-shadow] duration-150 hover:border-foreground/25 hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                  aria-label={`View ${booking.venue_name} booking for ${booking.customer_name || "unnamed customer"} on ${bookingDate}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-foreground">{booking.venue_name}</span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                        {booking.customer_name || "No name given"}
                      </span>
                    </span>
                    <Badge className={toneClasses[status.tone]}>{status.label}</Badge>
                  </span>
                  <span className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                    <span>
                      <span className="block text-xs text-muted-foreground">Date &amp; time</span>
                      <span className="mt-0.5 block font-medium text-foreground">{bookingDate}</span>
                      <span className="block text-xs text-muted-foreground">{formatTimeOfDay(booking.booking_time)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-xs text-muted-foreground">Amount</span>
                      <span className="mt-0.5 block font-semibold text-foreground"><Price amount={booking.total_price} /></span>
                      <span className="block text-xs text-muted-foreground">
                        {booking.duration_hours} hour{booking.duration_hours !== 1 ? "s" : ""}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <Card className="hidden overflow-hidden xl:block">
            <Table className="min-w-[52rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date &amp; time</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id} className="transition-colors duration-100 hover:bg-surface-1 motion-reduce:transition-none">
                    <TableCell>
                      <p className="font-medium text-foreground">{booking.venue_name}</p>
                      <p className="text-xs text-muted-foreground">{booking.duration_hours} hour{booking.duration_hours !== 1 ? "s" : ""}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{booking.customer_name || "No name given"}</p>
                      {booking.customer_email && <p className="max-w-48 truncate text-xs text-muted-foreground" title={booking.customer_email}>{booking.customer_email}</p>}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{format(parseISO(booking.booking_date), "MMM d, yyyy")}</p>
                      <p className="text-xs text-muted-foreground">{formatTimeOfDay(booking.booking_time)}</p>
                    </TableCell>
                    <TableCell><p className="font-semibold text-foreground"><Price amount={booking.total_price} /></p></TableCell>
                    <TableCell>
                      {(() => {
                        const status = bookingStatusDescriptor(booking.status);
                        return <Badge className={toneClasses[status.tone]}>{status.label}</Badge>;
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(booking)}>View details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Booking Detail Drawer */}
      <BookingDetailDrawer
        booking={selectedBooking}
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      />
    </OwnerLayout>
  );
};

export default OwnerBookingsPage;
