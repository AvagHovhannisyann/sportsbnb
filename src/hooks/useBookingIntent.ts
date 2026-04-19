import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateBookingCode } from "@/lib/phone";

export type BookingChannel = "whatsapp" | "sms" | "call";

export interface CreateBookingIntentInput {
  venueId: string;
  venueName: string;
  userId?: string | null;
  channelUsed: BookingChannel;
  bookingDate?: string | null;
  bookingTime?: string | null;
  playersCount?: number | null;
  note?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
}

export interface BookingIntentResult {
  id: string;
  code: string;
}

/**
 * Logs a booking-handoff click. Returns the generated tracking code so the
 * caller can include it in the WhatsApp/SMS message before redirecting.
 *
 * Failure is non-fatal — we never block the user from being redirected to
 * the venue owner. Tracking is best-effort.
 */
export function useCreateBookingIntent() {
  return useMutation<BookingIntentResult, Error, CreateBookingIntentInput>({
    mutationFn: async (input) => {
      const code = generateBookingCode();
      const { data, error } = await supabase
        .from("booking_intents")
        .insert({
          venue_id: input.venueId,
          venue_name: input.venueName,
          user_id: input.userId ?? null,
          channel_used: input.channelUsed,
          booking_code: code,
          booking_date: input.bookingDate ?? null,
          booking_time: input.bookingTime ?? null,
          players_count: input.playersCount ?? null,
          note: input.note ?? null,
          customer_name: input.customerName ?? null,
          customer_phone: input.customerPhone ?? null,
          status: "clicked",
        })
        .select("id, booking_code")
        .single();

      if (error || !data) {
        // Non-fatal — surface the code so caller can still build the link
        return { id: "", code };
      }
      return { id: data.id, code: data.booking_code };
    },
  });
}
