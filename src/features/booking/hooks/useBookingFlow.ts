import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Providers `payments-init` will accept. Ameria vPOS and Idram were removed
 * from the payment path; sending either now returns a 400, so they are gone
 * from the union rather than left as values nothing rejects until runtime.
 *
 * "mock" is the dev/E2E rail and is the reason this stays a union of two: the
 * shape below (a provider key chosen at the call site, a redirect-or-form
 * result) is what lets a second real provider be added without reworking the
 * flow.
 */
export type PaymentProviderKey = "lemonsqueezy" | "mock";

/**
 * The live rail. Every caller sends this unless it is deliberately paying
 * against the mock provider — declared once so the next provider change is a
 * one-line edit rather than a grep across call sites.
 */
export const LIVE_PAYMENT_PROVIDER: PaymentProviderKey = "lemonsqueezy";

/** The mock provider is offered in dev, and in any build that opts in. */
export const MOCK_PAYMENTS_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_PAYMENTS_MOCK === "true";

export interface BookingHold {
  booking_id: string;
  amount_minor: number;
  owner_amount_minor: number;
  platform_fee_minor: number;
  currency: string;
  expires_at: string;
}

export interface AvailableSlot {
  slot_start: string;
  slot_end: string;
  available: boolean;
}

export interface PaymentInitResult {
  paymentId: string;
  redirectUrl: string;
  formAction: string | null;
  formFields: Record<string, string> | null;
  amountMinor: number;
  currency: string;
}

/**
 * Minor units to a dram string.
 *
 * The hardcoded ֏ is an assumption, and it is worth writing down rather than
 * leaving for someone to find: every money column in this schema is
 * `currency text NOT NULL DEFAULT 'AMD'` — `bookings`, `payments`,
 * `ledger_entries`, `payouts` — and every writer in the payment path pins it,
 * `payments-init` and `_shared/payments.ts` both falling back to "AMD"
 * explicitly. Every venue in the catalogue is priced and settled in dram. So a
 * row with another currency cannot presently exist, and the twelve call sites
 * that print money with this are correct.
 *
 * If that ever stops being true — a second provider, a second region with its
 * own settlement — this becomes silently wrong everywhere at once, because it
 * takes the amount and ignores the `currency` column sitting beside it. The
 * fix at that point is to pass the row's currency in, not to add a second
 * formatter: `useCurrency` already had one of those, and it was relabelling
 * dram as dollars without converting. See the note left in its place.
 */
export function formatAmd(amountMinor: number): string {
  return `֏${(amountMinor / 100).toLocaleString()}`;
}

export function useAvailableSlots(venueId: string | undefined, date: string | undefined, courtId?: string) {
  return useQuery({
    queryKey: ["available-slots", venueId, date, courtId ?? null],
    enabled: !!venueId && !!date,
    queryFn: async (): Promise<AvailableSlot[]> => {
      const { data, error } = await supabase.rpc("get_available_slots", {
        p_venue_id: venueId!,
        p_date: date!,
        p_court_id: courtId ?? null,
      });
      if (error) throw error;
      return data ?? [];
    },
    // One retry, then surface it. Callers must distinguish "no slots" from
    // "the lookup failed" — an empty array reads as "closed" to a customer,
    // and saying a venue is shut when the RPC errored costs the owner a
    // booking they never hear about.
    retry: 1,
  });
}

export function useCreateBookingHold() {
  return useMutation({
    mutationFn: async (params: {
      venueId: string;
      startsAt: string;
      endsAt: string;
      courtId?: string;
      notes?: string;
    }): Promise<BookingHold> => {
      const { data, error } = await supabase.rpc("create_booking_hold", {
        p_venue_id: params.venueId,
        p_starts_at: params.startsAt,
        p_ends_at: params.endsAt,
        p_court_id: params.courtId ?? null,
        p_notes: params.notes ?? null,
      });
      if (error) {
        if (error.message.includes("slot_taken")) {
          throw new Error("That slot was just taken — please pick another time.");
        }
        throw error;
      }
      return data as unknown as BookingHold;
    },
  });
}

export function useInitPayment() {
  return useMutation({
    mutationFn: async (params: {
      bookingId?: string;
      gameId?: string;
      provider: PaymentProviderKey;
      lang?: string;
    }): Promise<PaymentInitResult> => {
      const { data, error } = await supabase.functions.invoke("payments-init", { body: params });
      if (error) throw error;
      return data as PaymentInitResult;
    },
  });
}

export function useVerifyPayment() {
  return useMutation({
    mutationFn: async (params: {
      paymentId: string;
      mockOutcome?: "paid" | "failed";
    }): Promise<{ status: string; bookingId?: string; gameId?: string }> => {
      const { data, error } = await supabase.functions.invoke("payments-verify", { body: params });
      if (error) throw error;
      return data;
    },
  });
}

export function useCancelBooking() {
  return useMutation({
    mutationFn: async (params: { bookingId: string; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke("payments-refund", { body: params });
      if (error) throw error;
      return data as { status: string; refundMinor: number; manual?: boolean };
    },
  });
}

/**
 * Submits a provider form-post by injecting a temporary form.
 *
 * No live provider uses this today — Lemon Squeezy is a plain redirect, so
 * `formAction`/`formFields` come back null and callers fall through to
 * `redirectUrl`. Kept because the init contract still carries those fields and
 * a form-post provider may return; callers must guard on both being present.
 */
export function submitProviderForm(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.style.display = "none";
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}
