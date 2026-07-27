import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfMonth, endOfMonth, subMonths, format, parseISO, startOfWeek, endOfWeek } from "date-fns";

interface BookingAnalytics {
  totalRevenue: number;
  totalBookings: number;
  uniqueCustomers: number;
  averageBookingValue: number;
  revenueByMonth: { month: string; revenue: number; bookings: number }[];
  bookingsByVenue: { venue: string; count: number }[];
  recentBookings: {
    id: string;
    venue_name: string;
    booking_date: string;
    booking_time: string;
    total_price: number;
    status: string;
  }[];
  occupancyRate: number;
}

export const useOwnerAnalytics = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["owner-analytics", user?.id],
    queryFn: async (): Promise<BookingAnalytics> => {
      if (!user) throw new Error("Not authenticated");

      // Get owner's venues first
      const { data: venues, error: venuesError } = await supabase
        .from("venues")
        .select("id, name")
        .eq("owner_id", user.id);

      if (venuesError) throw venuesError;

      const venueIds = venues?.map(v => v.id) || [];
      const venueNames = new Map(venues?.map(v => [v.id, v.name]) || []);

      if (venueIds.length === 0) {
        return {
          totalRevenue: 0,
          totalBookings: 0,
          uniqueCustomers: 0,
          averageBookingValue: 0,
          revenueByMonth: [],
          bookingsByVenue: [],
          recentBookings: [],
          occupancyRate: 0,
        };
      }

      // Get bookings for owner's venues
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .in("venue_id", venueIds)
        .eq("status", "confirmed")
        .order("booking_date", { ascending: false });

      if (bookingsError) throw bookingsError;

      const allBookings = bookings || [];

      // Calculate total revenue
      const totalRevenue = allBookings.reduce((sum, b) => sum + Number(b.total_price), 0);
      const totalBookings = allBookings.length;
      
      // Unique customers
      const uniqueCustomers = new Set(allBookings.map(b => b.user_id)).size;
      
      // Average booking value
      const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      // Revenue and bookings by month (last 6 months). Counting alongside the
      // sum costs nothing here and is what lets the overview show a real
      // month-over-month change instead of a hardcoded one.
      const revenueByMonth: { month: string; revenue: number; bookings: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(subMonths(new Date(), i));
        const monthBookings = allBookings.filter(b => {
          const date = parseISO(b.booking_date);
          return date >= monthStart && date <= monthEnd;
        });
        revenueByMonth.push({
          month: format(monthStart, "MMM"),
          revenue: monthBookings.reduce((sum, b) => sum + Number(b.total_price), 0),
          bookings: monthBookings.length,
        });
      }

      // Bookings by venue
      const venueBookingCounts = new Map<string, number>();
      allBookings.forEach(b => {
        const current = venueBookingCounts.get(b.venue_id) || 0;
        venueBookingCounts.set(b.venue_id, current + 1);
      });
      const bookingsByVenue = Array.from(venueBookingCounts.entries()).map(([id, count]) => ({
        venue: venueNames.get(id) || "Unknown",
        count,
      }));

      // Recent bookings (last 10)
      const recentBookings = allBookings.slice(0, 10).map(b => ({
        id: b.id,
        venue_name: b.venue_name,
        booking_date: b.booking_date,
        booking_time: b.booking_time,
        total_price: b.total_price,
        status: b.status,
      }));

      // Calculate occupancy rate (simplified: bookings this week / available hours)
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      const thisWeekBookings = allBookings.filter(b => {
        const date = parseISO(b.booking_date);
        return date >= weekStart && date <= weekEnd;
      });
      const totalBookedHours = thisWeekBookings.reduce((sum, b) => sum + (b.duration_hours || 1), 0);
      // Assume 12 hours per day * 7 days per venue
      const totalAvailableHours = venueIds.length * 12 * 7;
      const occupancyRate = totalAvailableHours > 0 
        ? Math.min(100, Math.round((totalBookedHours / totalAvailableHours) * 100))
        : 0;

      return {
        totalRevenue,
        totalBookings,
        uniqueCustomers,
        averageBookingValue,
        revenueByMonth,
        bookingsByVenue,
        recentBookings,
        occupancyRate,
      };
    },
    enabled: !!user,
  });
};
