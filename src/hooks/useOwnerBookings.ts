import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Every booking across an owner's venues, in every status.
 *
 * `/owner/bookings` used to read `useOwnerAnalytics().recentBookings`, which is
 * the wrong source for it twice over:
 *
 *  - That query is `.eq("status", "confirmed")`, because it exists to compute
 *    revenue and revenue only counts confirmed money. The bookings page offers
 *    a status filter with Confirmed, Pending, Cancelled and Completed — and
 *    three of those four could never match a row. Selecting "Pending" on your
 *    own bookings page always showed an empty table.
 *
 *  - Its return type carries six fields and no customer, so the page filled in
 *    `customer_name: "Customer"` and `customer_email: "customer@example.com"`
 *    for every row. The columns were being fetched — the analytics query is
 *    `select("*")` — and then dropped. Meanwhile the page's search box filters
 *    on `customer_name`, so searching for a real customer matched nothing but
 *    that constant.
 *
 * Analytics keeps its confirmed-only query, which is correct for what it does.
 */
export interface OwnerBooking {
  id: string;
  venue_id: string | null;
  venue_name: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number;
  total_price: number;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
}

export const useOwnerBookings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["owner-bookings", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OwnerBooking[]> => {
      if (!user) throw new Error("Not authenticated");

      const { data: venues, error: venuesError } = await supabase
        .from("venues")
        .select("id, name")
        .eq("owner_id", user.id);
      if (venuesError) throw venuesError;

      const venueIds = venues?.map((v) => v.id) ?? [];
      if (venueIds.length === 0) return [];
      const venueNames = new Map((venues ?? []).map((v) => [v.id, v.name]));

      // No status filter: the point of this hook is the statuses analytics
      // excludes.
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, venue_id, booking_date, booking_time, duration_hours, total_price, status, customer_name, customer_email",
        )
        .in("venue_id", venueIds)
        .order("booking_date", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((b) => ({
        id: b.id,
        venue_id: b.venue_id,
        venue_name: venueNames.get(b.venue_id ?? "") ?? "Unknown venue",
        booking_date: b.booking_date,
        // No `|| "10:00"`. A booking whose time did not come through is not a
        // booking at ten o'clock, and an owner reading a made-up time off
        // their own schedule is worse than reading an em-dash.
        booking_time: b.booking_time,
        duration_hours: b.duration_hours,
        total_price: b.total_price,
        // No `|| "confirmed"` either — that defaulted an unknown state to the
        // one that means "this is happening and it is paid for".
        status: b.status,
        customer_name: b.customer_name,
        customer_email: b.customer_email,
      }));
    },
  });
};
