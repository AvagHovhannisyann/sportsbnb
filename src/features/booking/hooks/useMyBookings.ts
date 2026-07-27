import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";


export interface MyBooking {
  id: string;
  venue_id: string;
  venue_uuid: string | null;
  venue_name: string;
  booking_date: string;
  booking_time: string;
  starts_at: string | null;
  ends_at: string | null;
  duration_hours: number;
  status: string;
  amount_minor: number | null;
  total_price: number;
  currency: string;
  created_at: string;
}

/**
 * Every booking belonging to the signed-in player.
 *
 * There was no such query, and no page that asked one. A player could pay for
 * a court and then find nowhere in the app that listed what they had paid for:
 * `/booking/:id/status` shows exactly one booking to whoever already has its
 * id, the dashboard tile labelled "Confirmed bookings" counts `booking_intents`
 * — the legacy WhatsApp handoff, retired when in-app payment landed — and the
 * "View my bookings" button on the checkout error panel pointed at
 * `/my-activity`, which is a tab id inside CommunityPage and has never been a
 * route at all.
 *
 * Newest first. RLS restricts the rows to the caller; the `user_id` filter is
 * there so the intent is legible at the call site rather than inferred from a
 * policy in another repository.
 */
export function useMyBookings(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-bookings", userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyBooking[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, venue_id, venue_uuid, venue_name, booking_date, booking_time, starts_at, ends_at, duration_hours, status, amount_minor, total_price, currency, created_at",
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MyBooking[];
    },
    // One retry, then surface it. An empty list and a failed request mean
    // opposite things here — "you have never booked anything" is a claim about
    // someone's own money, and it must not be made on a request that fell over.
    retry: 1,
  });
}
