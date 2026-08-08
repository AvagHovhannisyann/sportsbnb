import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CalendarDays, Ban, Gauge, ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { WeekCalendar } from "@/components/owner/schedule/WeekCalendar";
import { BookingDetailDrawer } from "@/components/owner/schedule/BookingDetailDrawer";
import { BlockTimeDialog } from "@/components/owner/schedule/BlockTimeDialog";
import { ManualBookingDialog } from "@/components/owner/schedule/ManualBookingDialog";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues } from "@/hooks/useVenues";
import { useVenueHours, useBlockedDates, useAddBlockedDate } from "@/hooks/useAvailability";
import { useVenueBookings } from "@/hooks/useVenueBookings";
import { useOwnerAnalytics } from "@/hooks/useOwnerAnalytics";
import { toast } from "sonner";
import { format } from "date-fns";

interface ScheduleBooking {
  id: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number;
  venue_name: string;
  total_price: number;
  status: string;
  customer_name?: string;
}

const OwnerSchedulePage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isProfileLoading } = useAuth();
  const {
    data: myVenues = [],
    isLoading: venuesLoading,
    isError: venuesError,
    isFetching: venuesFetching,
    refetch: refetchVenues,
  } = useOwnerVenues(user?.id);
  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError } = useOwnerAnalytics();

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<ScheduleBooking | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [newBookingDialogOpen, setNewBookingDialogOpen] = useState(false);

  // Set default venue when data loads
  useEffect(() => {
    if (myVenues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(myVenues[0].id);
    }
  }, [myVenues, selectedVenueId]);

  const {
    data: venueHours = [],
    isLoading: hoursLoading,
    isError: hoursError,
    isFetching: hoursFetching,
    refetch: refetchHours,
  } = useVenueHours(selectedVenueId || undefined);
  const {
    data: blockedDates = [],
    isLoading: blocksLoading,
    isError: blocksError,
    isFetching: blocksFetching,
    refetch: refetchBlocks,
  } = useBlockedDates(selectedVenueId || undefined);
  const {
    data: venueBookings = [],
    isLoading: bookingsLoading,
    isError: bookingsError,
    isFetching: bookingsFetching,
    refetch: refetchBookings,
  } = useVenueBookings(selectedVenueId || undefined);
  const addBlockedDate = useAddBlockedDate();

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

  if (authLoading || (venuesLoading && !venuesError)) {
    return (
      <OwnerLayout title="Schedule">
        <div className="space-y-4" role="status" aria-label="Loading the schedule">
          <Card>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-64 max-w-full" />
              </div>
              <Skeleton className="h-11 w-48" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="mt-4 h-[28rem] w-full" />
            </CardContent>
          </Card>
        </div>
      </OwnerLayout>
    );
  }

  const selectedVenue = myVenues.find((v) => v.id === selectedVenueId);

  // Format bookings for calendar - now uses dedicated venue bookings hook
  const bookings = venueBookings.map((b) => ({
    id: b.id,
    booking_date: b.booking_date,
    booking_time: b.booking_time || "10:00",
    duration_hours: b.duration_hours || 1,
    venue_name: b.venue_name,
    total_price: b.total_price,
    status: b.status || "confirmed",
    customer_name: b.customer_name || "Customer",
  }));
  const scheduleLoading = hoursLoading || blocksLoading || bookingsLoading;
  const scheduleError = hoursError || blocksError || bookingsError;
  const scheduleFetching = hoursFetching || blocksFetching || bookingsFetching;

  const handleBlockTime = async (data: {
    date: Date;
    startTime: string;
    endTime: string;
    reason: string;
    blockType: "time" | "full_day";
  }) => {
    if (!selectedVenueId) return;

    // Guard, not dead code. `blocked_dates` stores a date only, and
    // `get_available_slots` drops every slot on a date it finds there, so a
    // partial block cannot be honoured. This used to fall through to a
    // whole-day block with the requested range pasted into `reason`, and
    // reported success — the owner lost the day without being told.
    if (data.blockType !== "full_day") {
      toast.error("Blocking part of a day isn't supported yet — this would close the whole day.");
      return;
    }

    try {
      await addBlockedDate.mutateAsync({
        venueId: selectedVenueId,
        blockedDate: format(data.date, "yyyy-MM-dd"),
        reason: data.reason || "Blocked by owner",
      });
      toast.success(`${format(data.date, "EEE, MMM d")} is now closed for bookings`);
    } catch (error) {
      toast.error("Failed to block that day");
    }
  };

  const handleBookingCreated = () => {
    refetchBookings();
  };

  return (
    <OwnerLayout title="Schedule" subtitle="Run each venue's bookings, hours, and closures from one calendar.">
      {venuesError ? (
        <Card>
          <ErrorPanel
            what="your venues"
            description="The schedule cannot identify which venue to show. Existing bookings are unaffected."
            onRetry={() => refetchVenues()}
            isRetrying={venuesFetching}
          />
        </Card>
      ) : myVenues.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No venues to schedule"
            description="Add a venue first to manage its schedule and bookings."
            actionLabel="Add your first venue"
            actionHref="/add-venue"
            tip="Once you add a venue, you can set opening hours and start accepting bookings."
          />
        </Card>
      ) : (
        <>
          <Card className="mb-5 sm:mb-6">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
              <div className="w-full max-w-sm space-y-2">
                <Label id="schedule-venue-label">Schedule for</Label>
                <Select value={selectedVenueId || ""} onValueChange={setSelectedVenueId}>
                  <SelectTrigger aria-labelledby="schedule-venue-label">
                    <SelectValue placeholder="Select a venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {myVenues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedVenue && (
                <div className="min-w-0 sm:text-right">
                  <p className="truncate text-sm font-semibold text-foreground">{selectedVenue.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedVenue.is_active ? "Active player-facing listing" : "Draft or inactive listing"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {scheduleError ? (
            <Card>
              <ErrorPanel
                what="this venue's schedule"
                description="Hours, closures, or bookings did not load completely. Don't assume an empty slot is available."
                onRetry={() => {
                  void refetchHours();
                  void refetchBlocks();
                  void refetchBookings();
                }}
                isRetrying={scheduleFetching}
              />
            </Card>
          ) : scheduleLoading ? (
            <Card>
              <CardContent className="p-4 sm:p-5" role="status" aria-label="Loading the selected venue schedule">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Skeleton className="h-6 w-44" />
                    <Skeleton className="mt-2 h-4 w-56 max-w-full" />
                  </div>
                  <Skeleton className="h-11 w-52" />
                </div>
                <Skeleton className="mt-5 h-[30rem] w-full" />
              </CardContent>
            </Card>
          ) : selectedVenue ? (
            <>
              <WeekCalendar
                bookings={bookings}
                blockedDates={blockedDates}
                openingHours={venueHours}
                resourceName={selectedVenue.name}
                onBookingClick={(booking) => setSelectedBooking(booking)}
                onBlockTime={() => setBlockDialogOpen(true)}
                onNewBooking={() => setNewBookingDialogOpen(true)}
              />

              <section className="mt-5 sm:mt-6" aria-labelledby="schedule-summary-heading">
                <h2 id="schedule-summary-heading" className="mb-3 font-display text-lg font-semibold tracking-extra-tight text-foreground">
                  Schedule summary
                </h2>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                      <p className="stat-numeral mt-4 text-2xl font-semibold text-foreground">
                        {bookings.filter((booking) => booking.booking_date === format(new Date(), "yyyy-MM-dd")).length}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Today's bookings</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <CalendarDays className="h-5 w-5 text-information" aria-hidden="true" />
                      <p className="stat-numeral mt-4 text-2xl font-semibold text-foreground">{bookings.length}</p>
                      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Calendar bookings</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <Ban className="h-5 w-5 text-destructive" aria-hidden="true" />
                      <p className="stat-numeral mt-4 text-2xl font-semibold text-foreground">{blockedDates.length}</p>
                      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Upcoming blocked days</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <Gauge className="h-5 w-5 text-warning" aria-hidden="true" />
                      <p className="stat-numeral mt-4 text-2xl font-semibold text-foreground">
                        {analyticsLoading || analyticsError ? "—" : `${analytics?.occupancyRate || 0}%`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Portfolio occupancy</p>
                    </CardContent>
                  </Card>
                </div>
              </section>
            </>
          ) : null}

          <BookingDetailDrawer
            booking={selectedBooking}
            open={!!selectedBooking}
            onOpenChange={(open) => !open && setSelectedBooking(null)}
          />

          <BlockTimeDialog
            open={blockDialogOpen}
            onOpenChange={setBlockDialogOpen}
            onBlock={handleBlockTime}
          />

          <ManualBookingDialog
            open={newBookingDialogOpen}
            onOpenChange={setNewBookingDialogOpen}
            venues={myVenues}
            selectedVenueId={selectedVenueId}
            onBookingCreated={handleBookingCreated}
          />
        </>
      )}
    </OwnerLayout>
  );
};

export default OwnerSchedulePage;
