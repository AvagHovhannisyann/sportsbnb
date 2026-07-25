import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Calendar, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { EmptyState } from "@/components/owner/EmptyState";
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

const OwnerSchedulePage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isProfileLoading } = useAuth();
  const { data: myVenues = [], isLoading: venuesLoading } = useOwnerVenues(user?.id);
  const { data: analytics } = useOwnerAnalytics();

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [newBookingDialogOpen, setNewBookingDialogOpen] = useState(false);

  // Set default venue when data loads
  useEffect(() => {
    if (myVenues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(myVenues[0].id);
    }
  }, [myVenues, selectedVenueId]);

  const { data: venueHours = [] } = useVenueHours(selectedVenueId || undefined);
  const { data: blockedDates = [] } = useBlockedDates(selectedVenueId || undefined);
  const { data: venueBookings = [], refetch: refetchBookings } = useVenueBookings(selectedVenueId || undefined);
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

  if (authLoading || venuesLoading) {
    return (
      <OwnerLayout title="Schedule">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const handleBlockTime = async (data: any) => {
    if (!selectedVenueId) return;

    try {
      await addBlockedDate.mutateAsync({
        venueId: selectedVenueId,
        blockedDate: format(data.date, "yyyy-MM-dd"),
        reason: data.reason || `Blocked: ${data.startTime} - ${data.endTime}`,
      });
      toast.success("Time blocked successfully");
    } catch (error) {
      toast.error("Failed to block time");
    }
  };

  const handleBookingCreated = () => {
    refetchBookings();
  };

  return (
    <OwnerLayout title="Schedule" subtitle="Manage your venue calendar and bookings">
      {myVenues.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No venues to schedule"
            description="Add a venue first to manage its schedule and bookings."
            actionLabel="Add Your First Venue"
            actionHref="/add-venue"
            tip="Once you add a venue, you can set opening hours and start accepting bookings."
          />
        </Card>
      ) : (
        <>
          {/* Venue Selector */}
          <div className="mb-6">
            <Select
              value={selectedVenueId || ""}
              onValueChange={setSelectedVenueId}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select a venue" />
              </SelectTrigger>
              <SelectContent>
                {myVenues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calendar */}
          {selectedVenue && (
            <WeekCalendar
              bookings={bookings}
              blockedDates={blockedDates}
              openingHours={venueHours}
              resourceName={selectedVenue.name}
              onBookingClick={(booking) => setSelectedBooking(booking)}
              onBlockTime={() => setBlockDialogOpen(true)}
              onNewBooking={() => setNewBookingDialogOpen(true)}
            />
          )}

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Today's Bookings</p>
              <p className="text-2xl font-bold text-foreground">
                {bookings.filter((b: any) => b.booking_date === format(new Date(), "yyyy-MM-dd")).length}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold text-foreground">{bookings.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Blocked Days</p>
              <p className="text-2xl font-bold text-foreground">{blockedDates.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Occupancy</p>
              <p className="text-2xl font-bold text-foreground">
                {analytics?.occupancyRate || 0}%
              </p>
            </Card>
          </div>

          {/* Booking Detail Drawer */}
          <BookingDetailDrawer
            booking={selectedBooking}
            open={!!selectedBooking}
            onOpenChange={(open) => !open && setSelectedBooking(null)}
          />

          {/* Block Time Dialog */}
          <BlockTimeDialog
            open={blockDialogOpen}
            onOpenChange={setBlockDialogOpen}
            onBlock={handleBlockTime}
          />

          {/* Manual Booking Dialog */}
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
