import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VenueHours {
  id: string;
  venue_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  created_at: string;
}

export interface BlockedDate {
  id: string;
  venue_id: string;
  blocked_date: string;
  reason: string | null;
  created_at: string;
}

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const useVenueHours = (venueId: string | undefined) => {
  return useQuery({
    queryKey: ["venue-hours", venueId],
    queryFn: async () => {
      if (!venueId) return [];

      const { data, error } = await supabase
        .from("venue_hours")
        .select("*")
        .eq("venue_id", venueId)
        .order("day_of_week", { ascending: true });

      if (error) throw error;
      return data as VenueHours[];
    },
    enabled: !!venueId,
  });
};

export const useBlockedDates = (venueId: string | undefined) => {
  return useQuery({
    queryKey: ["blocked-dates", venueId],
    queryFn: async () => {
      if (!venueId) return [];

      const { data, error } = await supabase
        .from("blocked_dates")
        .select("*")
        .eq("venue_id", venueId)
        .gte("blocked_date", new Date().toISOString().split("T")[0])
        .order("blocked_date", { ascending: true });

      if (error) throw error;
      return data as BlockedDate[];
    },
    enabled: !!venueId,
  });
};

export const useSaveVenueHours = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      venueId,
      hours,
    }: {
      venueId: string;
      hours: Omit<VenueHours, "id" | "venue_id" | "created_at">[];
    }) => {
      // Delete existing hours
      await supabase.from("venue_hours").delete().eq("venue_id", venueId);

      // Insert new hours
      if (hours.length > 0) {
        const { error } = await supabase.from("venue_hours").insert(
          hours.map((h) => ({
            venue_id: venueId,
            day_of_week: h.day_of_week,
            open_time: h.open_time,
            close_time: h.close_time,
            is_closed: h.is_closed,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["venue-hours", variables.venueId] });
    },
  });
};

export const useAddBlockedDate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      venueId,
      blockedDate,
      reason,
    }: {
      venueId: string;
      blockedDate: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from("blocked_dates")
        .insert({
          venue_id: venueId,
          blocked_date: blockedDate,
          reason: reason || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["blocked-dates", variables.venueId] });
    },
  });
};

export const useRemoveBlockedDate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; venueId: string }) => {
      const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["blocked-dates", variables.venueId] });
    },
  });
};
