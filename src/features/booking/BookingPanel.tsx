import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, format } from "date-fns";
import { CalendarDays, Clock, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAvailableSlots, useCreateBookingHold, formatAmd } from "./hooks/useBookingFlow";

interface BookingPanelProps {
  venueId: string;
  pricePerHour: number;
  currencySymbol?: string;
}

/**
 * Airbnb-style booking card: pick a date, pick a free hour slot, reserve.
 * Reserving creates a 20-minute payment hold and moves to checkout.
 */
export function BookingPanel({ venueId, pricePerHour }: BookingPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const dates = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = addDays(new Date(), i);
        return {
          value: format(d, "yyyy-MM-dd"),
          weekday: format(d, "EEE"),
          day: format(d, "d"),
          month: format(d, "MMM"),
        };
      }),
    [],
  );

  const { data: slots, isLoading: slotsLoading } = useAvailableSlots(venueId, selectedDate);
  const createHold = useCreateBookingHold();

  const { data: policy } = useQuery({
    queryKey: ["venue-policy", venueId],
    queryFn: async () => {
      const { data } = await supabase
        .from("venue_policies")
        .select("cancellation_policy, cancellation_hours, refund_type")
        .eq("venue_id", venueId)
        .maybeSingle();
      return data;
    },
  });

  const policyText = (() => {
    const hours = policy?.cancellation_hours ?? 24;
    const refundType = policy?.refund_type ?? "full";
    if (refundType === "none") return "Non-refundable after payment.";
    if (refundType === "partial") return `Free cancellation until ${hours}h before start — 50% refund after that.`;
    return `Free cancellation until ${hours}h before start.`;
  })();

  const handleReserve = async () => {
    if (!user) {
      toast.error("Please log in to book");
      navigate(`/login?redirect=/venue/${venueId}`);
      return;
    }
    const slot = slots?.find((s) => s.slot_start === selectedSlot);
    if (!slot) {
      toast.error("Pick a time slot first");
      return;
    }
    try {
      const hold = await createHold.mutateAsync({
        venueId,
        startsAt: slot.slot_start,
        endsAt: slot.slot_end,
      });
      navigate(`/book/${hold.booking_id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reserve this slot");
    }
  };

  const selected = slots?.find((s) => s.slot_start === selectedSlot);

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <span className="stat-numeral text-2xl font-bold">֏{pricePerHour.toLocaleString()}</span>
          <span className="text-muted-foreground"> / hour</span>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" /> Date
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dates.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => {
                setSelectedDate(d.value);
                setSelectedSlot(null);
              }}
              className={cn(
                "flex flex-col items-center rounded-xl border px-3 py-2 min-w-[3.5rem] text-sm transition-colors",
                selectedDate === d.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:border-primary/50",
              )}
            >
              <span className="text-xs opacity-80">{d.weekday}</span>
              <span className="font-semibold">{d.day}</span>
              <span className="text-xs opacity-80">{d.month}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> Time
        </p>
        {slotsLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !slots || slots.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Closed on this day.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {slots.map((slot) => {
              const label = format(new Date(slot.slot_start), "HH:mm");
              return (
                <button
                  key={slot.slot_start}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => setSelectedSlot(slot.slot_start)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-sm transition-colors",
                    !slot.available && "opacity-40 cursor-not-allowed line-through",
                    slot.available && selectedSlot === slot.slot_start
                      ? "border-primary bg-primary text-primary-foreground"
                      : slot.available && "hover:border-primary/50",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="mb-4 rounded-lg bg-muted/50 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">1 hour</span>
            <span>֏{pricePerHour.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service fee (5%)</span>
            <span>{formatAmd(Math.round(pricePerHour * 100 * 0.05))}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-1 mt-1">
            <span>Total</span>
            <span>{formatAmd(Math.round(pricePerHour * 100 * 1.05))}</span>
          </div>
        </div>
      )}

      <Button className="w-full" size="lg" onClick={handleReserve} disabled={createHold.isPending || !selectedSlot}>
        {createHold.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Reserve
      </Button>
      <div className="mt-3 space-y-1.5 text-center">
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Secure payment via Ameriabank / Idram
        </p>
        <p className="text-xs text-muted-foreground">{policyText}</p>
      </div>
    </div>
  );
}

export default BookingPanel;
