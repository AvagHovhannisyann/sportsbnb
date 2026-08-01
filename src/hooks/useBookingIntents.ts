import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";

export type IntentStatus =
  | "clicked"
  | "owner_contacted"
  | "confirmed_booking"
  | "no_booking"
  | "no_response";

export interface BookingIntent {
  id: string;
  venue_id: string;
  venue_name: string;
  user_id: string | null;
  channel_used: "whatsapp" | "sms" | "call";
  booking_code: string;
  booking_date: string | null;
  booking_time: string | null;
  players_count: number | null;
  note: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  status: IntentStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Admin-only: fetch all booking handoff leads. */
export function useAllBookingIntents() {
  return useQuery({
    queryKey: ["booking-intents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_intents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as BookingIntent[];
    },
  });
}

export function useUpdateBookingIntent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      admin_notes,
    }: {
      id: string;
      status?: IntentStatus;
      admin_notes?: string;
    }) => {
      const update: TablesUpdate<"booking_intents"> = {};
      if (status) update.status = status;
      if (admin_notes !== undefined) update.admin_notes = admin_notes;
      const { error } = await supabase
        .from("booking_intents")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking-intents"] }),
  });
}
