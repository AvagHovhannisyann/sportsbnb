import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Calendar, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { EmptyState } from "@/components/owner/EmptyState";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { BookingDetailDrawer } from "@/components/owner/schedule/BookingDetailDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues } from "@/hooks/useVenues";
import { useOwnerAnalytics } from "@/hooks/useOwnerAnalytics";
import { format, parseISO } from "date-fns";
import { formatTimeOfDay } from "@/lib/time";
import { bookingStatusDescriptor, type BookingStatusTone } from "@/features/booking/status";

const OwnerBookingsPage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isProfileLoading } = useAuth();
  const { data: myVenues = [] } = useOwnerVenues(user?.id);
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsError,
    refetch: refetchAnalytics,
    isFetching: analyticsFetching,
  } = useOwnerAnalytics();

  const [selectedVenueId, setSelectedVenueId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

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

  if (authLoading || analyticsLoading) {
    return (
      <OwnerLayout title="Bookings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OwnerLayout>
    );
  }

  // Get bookings from analytics
  const allBookings = (analytics?.recentBookings || []).map((b: any) => ({
    id: b.id,
    booking_date: b.booking_date,
    booking_time: b.booking_time || "10:00",
    duration_hours: b.duration_hours || 1,
    venue_name: b.venue_name,
    venue_id: b.venue_id,
    total_price: b.total_price,
    status: b.status || "confirmed",
    customer_name: "Customer",
    customer_email: "customer@example.com",
  }));

  // Apply filters
  const filteredBookings = allBookings.filter((booking: any) => {
    if (selectedVenueId !== "all" && booking.venue_id !== selectedVenueId) return false;
    if (statusFilter !== "all" && booking.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        booking.venue_name.toLowerCase().includes(query) ||
        booking.customer_name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Keyed by tone rather than by status, so the six statuses added with in-app
  // payment cannot fall through to grey the way they did when this map listed
  // only the four legacy values.
  const toneClasses: Record<BookingStatusTone, string> = {
    positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    danger: "bg-destructive/10 text-destructive",
    neutral: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <OwnerLayout title="Bookings" subtitle="View and manage all your venue bookings">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Bookings</p>
          <p className="text-2xl font-bold text-foreground">{analytics?.totalBookings || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Confirmed</p>
          <p className="text-2xl font-bold text-emerald-600">
            {allBookings.filter((b: any) => b.status === "confirmed").length}
          </p>
        </Card>
        <Card className="p-4">
          {/* Counts `pending_payment` as well as the legacy `pending`.
              It matched only the latter, so an owner with unpaid bookings saw
              "Pending 0" directly above a table listing them as awaiting
              payment — and this is the number that tells them there is money
              to chase before those holds expire. */}
          <p className="text-sm text-muted-foreground">Awaiting payment</p>
          <p className="text-2xl font-bold text-amber-600">
            {
              allBookings.filter(
                (b: any) => b.status === "pending" || b.status === "pending_payment",
              ).length
            }
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="text-2xl font-bold text-foreground">
            ֏{(analytics?.totalRevenue || 0).toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Venues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Venues</SelectItem>
                {myVenues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      {/* Same hazard as the overview: an owner who reads "no bookings" from a
          failed request may not turn up for one that exists. */}
      {analyticsError ? (
        <Card>
          <ErrorPanel
            what="your bookings"
            description="We couldn't reach our servers. Don't assume your schedule is clear until this loads."
            onRetry={() => refetchAnalytics()}
            isRetrying={analyticsFetching}
          />
        </Card>
      ) : filteredBookings.length === 0 ? (
        <Card>
          <EmptyState
            icon={Calendar}
            title="No bookings found"
            description={
              allBookings.length === 0
                ? "When customers book your venues, they'll appear here."
                : "No bookings match your current filters."
            }
          />
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking: any) => (
                <TableRow key={booking.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{booking.venue_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.duration_hours} hour{booking.duration_hours > 1 ? "s" : ""}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{booking.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{booking.customer_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">
                        {format(parseISO(booking.booking_date), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatTimeOfDay(booking.booking_time)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground">
                      ֏{booking.total_price.toLocaleString()}
                    </p>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const { label, tone } = bookingStatusDescriptor(booking.status);
                      return <Badge className={toneClasses[tone]}>{label}</Badge>;
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
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
