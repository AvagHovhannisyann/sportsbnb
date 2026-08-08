import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, format } from "date-fns";
import { CalendarDays, Clock, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useLanguage";
import {
  useAvailableSlots,
  useBookingQuote,
  useCreateBookingHold,
  formatAmd,
} from "./hooks/useBookingFlow";
import { useVenueHours } from "@/hooks/useAvailability";
import { useVenuePolicy } from "@/hooks/useVenuePolicies";
import { VENUE_TIME_ZONE, atVenue } from "@/lib/venueTime";

interface BookingPanelProps {
  venueId: string;
  pricePerHour: number;
  currencySymbol?: string;
  /** Dates the owner has closed. Distinct from the weekly opening hours, and
      distinct again from every slot being taken — all three produce an empty
      slot list and mean different things to whoever is trying to book. */
  blockedDates?: { blocked_date: string }[];
  /**
   * A date and wall-clock time to arrive pre-selected on, from `?date=` and
   * `?time=`.
   *
   * The embeddable widget's Book Now button has always put those in the URL and
   * nothing has ever read them: a customer picked Saturday 18:00 inside an
   * owner's embedded widget, pressed the button, and landed here with no date
   * and no time chosen, to do it again. On the surface whose entire job is to
   * turn a slot choice into a booking.
   */
  initialDate?: string | null;
  initialTime?: string | null;
}

/**
 * Airbnb-style booking card: pick a date, pick a free hour slot, reserve.
 * Reserving creates a 20-minute payment hold and moves to checkout.
 */
export function BookingPanel({
  venueId,
  pricePerHour,
  blockedDates = [],
  initialDate = null,
  initialTime = null,
}: BookingPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = useTranslation();
  // Only a date this strip actually offers. A stale link to last month would
  // otherwise select a date with no button to show it as selected, and no way
  // back to today.
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    if (!initialDate || !/^\d{4}-\d{2}-\d{2}$/.test(initialDate)) return today;
    const last = format(addDays(new Date(), 13), "yyyy-MM-dd");
    return initialDate >= today && initialDate <= last ? initialDate : today;
  });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const dates = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = addDays(new Date(), i);
        return {
          value: format(d, "yyyy-MM-dd"),
          label: format(d, "EEEE, MMMM d, yyyy"),
          weekday: format(d, "EEE"),
          day: format(d, "d"),
          month: format(d, "MMM"),
        };
      }),
    [],
  );

  const {
    data: slots,
    isLoading: slotsLoading,
    isError: slotsError,
    refetch: refetchSlots,
    isFetching: slotsFetching,
  } = useAvailableSlots(venueId, selectedDate);
  const createHold = useCreateBookingHold();

  // The venue's weekly opening hours, so an empty slot list can be read
  // correctly. Same query key the page already uses, so React Query serves it
  // from cache rather than fetching twice.
  const { data: venueHours = [] } = useVenueHours(venueId);
  const blockedToday = useMemo(
    () => blockedDates.some((b) => b.blocked_date === selectedDate),
    [blockedDates, selectedDate],
  );
  const closedToday = useMemo(() => {
    const dow = new Date(`${selectedDate}T00:00:00`).getDay();
    const row = venueHours.find((h) => h.day_of_week === dow);
    return row ? row.is_closed : null;
  }, [venueHours, selectedDate]);

  /**
   * The shared hook, not a second query under the same cache key.
   *
   * This used to be its own `useQuery` with `queryKey: ["venue-policy", venueId]`
   * — byte for byte the key `useVenuePolicy` uses — but selecting three columns
   * where that one selects `*`. Same key, different shape: whichever ran first
   * populated the cache, and the other read it back. An owner who looked at
   * their own venue page and then opened Policies got the form filled from a
   * row with three columns in it, every other field reading as undefined; the
   * reverse order silently worked, which is the worst property a bug can have.
   *
   * `select("*")` here costs a few unused columns and removes the collision
   * entirely. The error is still surfaced rather than swallowed — see below for
   * why "the lookup failed" and "no custom policy" must not look the same.
   */
  const { data: policy, isError: policyError } = useVenuePolicy(venueId);

  // A null row genuinely means "no custom policy, platform default applies",
  // so the ?? fallbacks are right in that case. A *failed* lookup is different:
  // it used to land on the same fallbacks and print "Free cancellation until
  // 24h before start" for a venue that may be non-refundable — a refund promise
  // the platform invented, shown immediately above the pay button. When the
  // terms are unknown, say so rather than guess.
  const policyText = (() => {
    if (policyError) return "Cancellation terms couldn't be loaded — check before you pay.";
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

  /**
   * Match `?time=18:00` to a slot once the slots for that date have arrived.
   *
   * The parameter is a venue-local wall clock — that is what the widget
   * displayed and what the customer chose — while a slot is an instant, so the
   * comparison has to be made in the venue's zone rather than the browser's.
   *
   * Applies once. `appliedInitialTime` stops it re-selecting the slot after
   * someone has deliberately picked a different one and the query refetches.
   */
  const appliedInitialTime = useRef(false);
  useEffect(() => {
    if (appliedInitialTime.current || !initialTime || !slots?.length) return;
    if (!/^\d{2}:\d{2}$/.test(initialTime)) {
      appliedInitialTime.current = true;
      return;
    }
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: VENUE_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const match = slots.find(
      (slot) => slot.available && fmt.format(new Date(slot.slot_start)) === initialTime,
    );
    if (match) setSelectedSlot(match.slot_start);
    appliedInitialTime.current = true;
  }, [slots, initialTime]);

  const selected = slots?.find((s) => s.slot_start === selectedSlot);
  const quote = useBookingQuote(venueId, selected?.slot_start, selected?.slot_end);

  return (
    // Every figure in this panel goes through formatAmd. Two of them used to
    // build the string inline — `֏{pricePerHour.toLocaleString()}` — while the
    // fee and total below used the helper, so one panel converted major to
    // minor units in two places and hardcoded the symbol in two more. Same
    // pixels today; a currency or locale change would have landed on half of
    // the breakdown and left the header quoting the old one.
    <section
      aria-labelledby="booking-panel-title"
      className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2
            id="booking-panel-title"
            className="font-display text-lg font-semibold leading-tight tracking-extra-tight"
          >
            {t("booking.reserveThisVenue")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("booking.chooseDateAndHour")}</p>
        </div>
        <div className="shrink-0 text-right">
          <Price
            amount={pricePerHour}
            suffix="/ hour"
            className="text-xl font-semibold sm:text-2xl"
            suffixClassName="text-muted-foreground"
          />
        </div>
      </div>

      <div className="mb-5">
        <p id="booking-date-label" className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Date
        </p>
        <div
          role="group"
          aria-labelledby="booking-date-label"
          className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 overscroll-x-contain"
        >
          {dates.map((d) => (
            <button
              key={d.value}
              type="button"
              aria-pressed={selectedDate === d.value}
              aria-label={d.label}
              onClick={() => {
                setSelectedDate(d.value);
                setSelectedSlot(null);
              }}
              className={cn(
                "focus-ring flex min-h-16 min-w-14 snap-start touch-manipulation flex-col items-center justify-center rounded-lg border px-2 py-2 text-sm transition-[background-color,border-color,color,opacity] duration-150 ease-out active:opacity-80 motion-reduce:transition-none",
                selectedDate === d.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border-interactive bg-background text-foreground hover:border-primary/50 hover:bg-accent",
              )}
            >
              <span className="text-xs font-medium opacity-80">{d.weekday}</span>
              <span className="stat-numeral text-base font-semibold leading-tight">{d.day}</span>
              <span className="text-xs opacity-80">{d.month}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <p id="booking-time-label" className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Time
        </p>
        {slotsLoading ? (
          <div
            className="surface-inset flex min-h-24 items-center justify-center gap-2 rounded-lg px-4 py-6 text-sm text-muted-foreground"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Loading available times…
          </div>
        ) : slotsError ? (
          /* Three different things used to print "Closed on this day.": the
             venue being shut that weekday, every hour already taken, and the
             availability lookup failing outright. Only the first is true, and
             the third told a paying customer the place was closed because a
             request errored — the page even contradicted itself, listing
             08:00-23:00 under Operating Hours directly beside it. */
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-foreground">
              Couldn&apos;t load available times.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Your date selection is still saved.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => refetchSlots()}
              disabled={slotsFetching}
            >
              {slotsFetching ? (
                <>
                  <Loader2
                    className="mr-1.5 h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  Retrying…
                </>
              ) : (
                "Try again"
              )}
            </Button>
          </div>
        ) : !slots || slots.length === 0 ? (
          <p className="surface-inset rounded-lg px-4 py-5 text-center text-sm text-muted-foreground">
            {blockedToday
              ? "The owner has closed this date."
              : closedToday === false
                ? "Fully booked on this date — try another day."
                : "Closed on this day."}
          </p>
        ) : (
          <div role="group" aria-labelledby="booking-time-label" className="grid grid-cols-3 gap-2">
            {slots.map((slot) => {
              // `atVenue`, not the raw instant: date-fns formats in the browser's zone,
              // so this printed 14:00 for an 18:00 Yerevan slot to anyone outside
              // UTC+4 — the number the whole booking decision is made on.
              const label = format(atVenue(slot.slot_start), "HH:mm");
              return (
                <button
                  key={slot.slot_start}
                  type="button"
                  disabled={!slot.available}
                  aria-pressed={slot.available ? selectedSlot === slot.slot_start : undefined}
                  aria-label={`${label}${slot.available ? "" : ", unavailable"}`}
                  onClick={() => setSelectedSlot(slot.slot_start)}
                  className={cn(
                    "focus-ring stat-numeral min-h-11 touch-manipulation rounded-lg border px-2 py-2 text-sm font-medium transition-[background-color,border-color,color,opacity] duration-150 ease-out active:opacity-80 motion-reduce:transition-none",
                    !slot.available &&
                      "cursor-not-allowed border-border bg-surface-1 text-muted-foreground line-through opacity-55",
                    slot.available && selectedSlot === slot.slot_start
                      ? "border-primary bg-primary text-primary-foreground"
                      : slot.available &&
                          "border-border-interactive bg-background text-foreground hover:border-primary/50 hover:bg-accent",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div aria-live="polite" className="mb-5 min-h-14">
        {selected ? (
          <div className="surface-inset rounded-lg p-4 text-sm">
            {/* Every figure here comes from quote_booking_price() — the same
              function create_booking_hold() prices from — so the panel cannot
              quote one total and checkout charge another.

              It used to assert "No booking fee" and print the listed rate as
              the total. That held only while the service fee was zero, and
              before that the panel carried its own hardcoded 5%, applied once
              here and again in the total, for a fee the server never charged.
              Both failures come from the client deciding the price. It no
              longer does. */}
            {quote.isLoading ? (
              <p className="text-muted-foreground">{t("booking.pricingSlot")}</p>
            ) : quote.data ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {quote.data.hours === 1 ? "1 hour" : `${quote.data.hours} hours`}
                  </span>
                  <span className="stat-numeral font-medium">
                    {formatAmd(quote.data.owner_amount_minor)}
                  </span>
                </div>
                {quote.data.platform_fee_minor > 0 && (
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">{t("booking.serviceFee")}</span>
                    <span className="stat-numeral font-medium">
                      {formatAmd(quote.data.platform_fee_minor)}
                    </span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-2 font-semibold">
                  <span>{t("booking.total")}</span>
                  <span className="stat-numeral">{formatAmd(quote.data.amount_minor)}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {quote.data.platform_fee_minor > 0
                    ? t("booking.feeExplainer")
                    : t("booking.noBookingFee")}
                </p>
              </>
            ) : (
              // Never fall back to a price computed here. A failed quote is the
              // one case where showing a number is worse than showing none.
              <p className="text-muted-foreground">
                {t("booking.quoteUnavailable")}
              </p>
            )}
          </div>
        ) : (
          <p className="flex min-h-14 items-center rounded-lg border border-dashed border-border px-4 text-sm text-muted-foreground">
            {t("booking.selectTimeToSeeTotal")}
          </p>
        )}
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={handleReserve}
        disabled={createHold.isPending || !selectedSlot}
        aria-busy={createHold.isPending}
      >
        {createHold.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : null}
        {createHold.isPending ? "Reserving…" : "Reserve"}
      </Button>
      <div className="mt-3 space-y-1.5 text-center">
        <p className="flex items-center justify-center gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Pay securely by card — Visa or Mastercard
        </p>
        <p
          role={policyError ? "alert" : undefined}
          className={
            policyError
              ? "text-xs font-medium leading-relaxed text-warning"
              : "text-xs leading-relaxed text-muted-foreground"
          }
        >
          {policyText}
        </p>
      </div>
    </section>
  );
}

export default BookingPanel;
