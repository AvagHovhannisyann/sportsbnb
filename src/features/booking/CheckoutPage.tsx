import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { formatTimeOfDay } from "@/lib/time";
import { atVenue } from "@/lib/venueTime";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { CreditCard, Loader2, ShieldCheck, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import Layout from "@/components/layout/Layout";
import { StatusPanel, ErrorPanel } from "@/components/common/StatusPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useInitPayment,
  submitProviderForm,
  formatAmd,
  LIVE_PAYMENT_PROVIDER,
  MOCK_PAYMENTS_ENABLED,
  PaymentProviderKey,
} from "./hooks/useBookingFlow";

/**
 * Ways to pay, in order of preference.
 *
 * There is one live rail, so in production this list has a single entry and
 * the picker below does not render at all: a radio group with one radio in it
 * is a decision that isn't one, and it puts a click between someone and the
 * payment page they were always going to. The list and the radio group are
 * kept rather than inlined — add a second entry here and the picker comes
 * back on its own, still accessible, with nothing else to change.
 */
const providerOptions: {
  key: PaymentProviderKey;
  icon: typeof CreditCard;
  title: string;
  detail: string;
  dashed?: boolean;
}[] = [
  {
    key: LIVE_PAYMENT_PROVIDER,
    icon: CreditCard,
    title: "Pay by card",
    detail: "Visa or Mastercard, in dram",
  },
  ...(MOCK_PAYMENTS_ENABLED
    ? [
        {
          key: "mock" as PaymentProviderKey,
          icon: ShieldCheck,
          title: "Test payment",
          detail: "Development only",
          dashed: true,
        },
      ]
    : []),
];

/** Checkout for a booking hold: countdown, amount, redirect to pay. */
export default function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [provider, setProvider] = useState<PaymentProviderKey>(providerOptions[0].key);
  const [remaining, setRemaining] = useState<number | null>(null);
  const providerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const initPayment = useInitPayment();

  const {
    data: booking,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["booking", bookingId],
    enabled: !!bookingId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!booking?.expires_at) return;
    const tick = () => {
      const ms = new Date(booking.expires_at!).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [booking?.expires_at]);

  const countdown = useMemo(() => {
    if (remaining === null) return null;
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, [remaining]);

  const isUrgent = remaining !== null && remaining <= 120;

  // The visual timer stays precise, but the live region advances only at
  // meaningful intervals. Announcing every second makes the payment controls
  // nearly impossible to use with a screen reader.
  const timerAnnouncement = useMemo(() => {
    if (remaining === null) return "";
    if (remaining <= 0) return "Reservation hold expired.";
    if (remaining <= 120) {
      const seconds = Math.ceil(remaining / 30) * 30;
      return `${seconds} seconds left to pay.`;
    }
    const minutes = Math.ceil(remaining / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} left to pay.`;
  }, [remaining]);

  const handleProviderKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (index + 1) % providerOptions.length;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = (index - 1 + providerOptions.length) % providerOptions.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = providerOptions.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    setProvider(providerOptions[nextIndex].key);
    providerRefs.current[nextIndex]?.focus();
  };

  const handlePay = async () => {
    if (!bookingId) return;
    try {
      const result = await initPayment.mutateAsync({ bookingId, provider });
      if (result.formAction && result.formFields) {
        submitProviderForm(result.formAction, result.formFields);
        return;
      }
      window.location.href = result.redirectUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment could not be started");
    }
  };

  if (isLoading) {
    return (
      <Layout showFooter={false} showMobileNav={false} showAssistant={false}>
        <div
          className="section-tinted flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 py-12 text-center"
          role="status"
        >
          <div>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            </div>
            <h1 className="font-display text-xl font-semibold tracking-extra-tight">Preparing checkout</h1>
            <p className="mt-1 text-sm text-muted-foreground">Loading your reservation details…</p>
          </div>
        </div>
      </Layout>
    );
  }

  // A failed fetch used to fall through to the expiry branch below, so a
  // dropped connection told people "This reservation has expired. Please pick
  // your slot again" while their hold was still live in the database. Acting
  // on that advice means colliding with your own hold, or creating a second
  // one and paying twice. Never guess about the state of someone's money —
  // say the request failed and offer a retry.
  if (isError) {
    return (
      <Layout showFooter={false} showMobileNav={false} showAssistant={false}>
        <div className="section-tinted min-h-[calc(100dvh-4rem)] py-8 sm:py-12">
          <div className="container max-w-xl">
            <Card className="shadow-sm">
              <ErrorPanel
                what="this reservation"
                description="We couldn't reach our servers. Your hold has not been cancelled — don't book again until this loads."
                onRetry={() => refetch()}
                isRetrying={isFetching}
              >
                {/* Was `/my-activity`, which is a tab id inside CommunityPage and
                    has never been a route — so the one escape hatch offered to
                    someone just told "your hold has not been cancelled, don't book
                    again until this loads" took them to the 404 page. */}
                <Button variant="outline" onClick={() => navigate("/my-bookings")}>
                  View my bookings
                </Button>
              </ErrorPanel>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  if (!booking || booking.status !== "pending_payment" || (remaining !== null && remaining <= 0)) {
    const isPaid = booking?.status === "confirmed";
    const isMissing = !booking;

    return (
      <Layout showFooter={false} showMobileNav={false} showAssistant={false}>
        <div className="section-tinted min-h-[calc(100dvh-4rem)] py-8 sm:py-12">
          <div className="container max-w-xl">
            <Card className="shadow-sm">
              <StatusPanel
                icon={isPaid ? ShieldCheck : Timer}
                tone={isPaid ? "positive" : "neutral"}
                title={
                  isPaid
                    ? "Already paid"
                    : isMissing
                      ? "Reservation not found"
                      : "This reservation has expired"
                }
                description={
                  isPaid
                    ? "This booking is confirmed — nothing further to pay."
                    : isMissing
                      ? "The link may be out of date, or the reservation was cancelled."
                      : "Holds last 20 minutes so slots don't sit locked. Pick your slot again to start a new one."
                }
              >
                {isPaid ? (
                  <Button onClick={() => navigate(`/booking/${booking!.id}/status`)}>
                    View booking
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      navigate(booking ? `/venue/${booking.venue_uuid ?? booking.venue_id}` : "/venues")
                    }
                  >
                    {booking ? "Back to venue" : "Browse venues"}
                  </Button>
                )}
              </StatusPanel>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false} showMobileNav={false} showAssistant={false}>
      <div className="section-tinted min-h-[calc(100dvh-4rem)] py-6 sm:py-10">
        <div className="container max-w-xl">
          <Card className="shadow-sm">
            <CardHeader className="border-b border-border p-5 sm:p-6">
            {/* The page had no h1: its only heading was this card title.
                "Confirm and pay" is what the page is, so it is the page
                heading — on the one screen in the app where money changes
                hands, which is not a good place to have no document outline. */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="eyebrow mb-2">Secure checkout</p>
                <CardTitle as="h1" className="text-2xl sm:text-3xl">
                  Confirm and pay
                </CardTitle>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Review the reservation before continuing to the card provider.
                </p>
              </div>
              {/* Was a hardcoded text-amber-600 — off the token system and
                  muddy on a dark surface — and it looked identical at 19:00
                  and at 0:20. Under two minutes it escalates to destructive,
                  while the live announcement below changes only at useful
                  intervals rather than speaking every second. */}
              {countdown && (
                <span
                  role="timer"
                  aria-label={`Time left to pay: ${countdown}`}
                  className={cn(
                    "inline-flex min-h-9 shrink-0 items-center gap-1.5 self-start rounded-full border px-3 font-mono text-sm font-semibold tabular-nums transition-colors duration-150 motion-reduce:transition-none",
                    isUrgent
                      ? "border-destructive/30 bg-destructive/5 text-destructive"
                      : "border-warning/30 bg-warning/5 text-warning",
                  )}
                >
                  <Timer className="h-4 w-4" aria-hidden="true" /> {countdown}
                </span>
              )}
              <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {timerAnnouncement}
              </span>
            </div>
            </CardHeader>
            <CardContent className="space-y-6 p-5 sm:p-6">
            <section aria-labelledby="reservation-summary-heading" className="surface-inset rounded-lg p-4">
              <p id="reservation-summary-heading" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Reservation
              </p>
              <p className="mt-2 font-display text-lg font-semibold tracking-extra-tight">
                {booking.venue_name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {booking.starts_at
                  ? `${format(atVenue(booking.starts_at), "EEEE, MMM d")} · ${format(atVenue(booking.starts_at), "HH:mm")}–${format(atVenue(booking.ends_at!), "HH:mm")}`
                  : `${booking.booking_date} · ${formatTimeOfDay(booking.booking_time)}`}
              </p>
            </section>

            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Venue</dt>
                <dd>
                  <Price amount={(booking.owner_amount_minor ?? 0) / 100} className="font-medium" />
                </dd>
              </div>
              {/* Only rendered when a fee was actually charged. Sportsbnb takes
                  no commission, so this row is a permanent "֏0" for every
                  booking made today — a line item that exists only to say
                  nothing happened. The row is kept rather than deleted so a
                  future non-zero commission still itemises correctly; the
                  booking carries the fee it was priced with, so historical
                  bookings that did pay one keep showing it. */}
              {(booking.platform_fee_minor ?? 0) > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Service fee</dt>
                  <dd>
                    <Price
                      amount={(booking.platform_fee_minor ?? 0) / 100}
                      className="font-medium"
                    />
                  </dd>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>
                  <Price amount={(booking.amount_minor ?? 0) / 100} />
                </dd>
              </div>
            </dl>

            {/* Only shown when there is something to choose between. These were
                three plain buttons: the choice was conveyed only by a border
                colour, so a screen reader announced all of them identically
                with no indication of which was selected — on the control that
                decides how someone pays. Now a real radio group, and it stays
                one for whenever a second rail is added back. */}
            {providerOptions.length === 1 ? (
              <section aria-labelledby="payment-method-heading">
                <p id="payment-method-heading" className="mb-2 text-sm font-semibold">
                  Payment method
                </p>
                <div className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-background p-3.5">
                  <CreditCard className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium">{providerOptions[0].title}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {providerOptions[0].detail}
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              <div className="space-y-2">
                <p id="pay-with-label" className="text-sm font-semibold">
                  Pay with
                </p>
                <div role="radiogroup" aria-labelledby="pay-with-label" className="space-y-2">
                  {providerOptions.map(({ key, icon: Icon, title, detail, dashed }, index) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={provider === key}
                      aria-describedby={`provider-${key}-detail`}
                      tabIndex={provider === key ? 0 : -1}
                      ref={(node) => {
                        providerRefs.current[index] = node;
                      }}
                      onClick={() => setProvider(key)}
                      onKeyDown={(event) => handleProviderKeyDown(event, index)}
                      className={cn(
                        "flex min-h-14 w-full touch-manipulation items-center gap-3 rounded-lg border p-3.5 text-left outline-none transition-[background-color,border-color,box-shadow,opacity] duration-150 active:opacity-80 motion-reduce:transition-none",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        dashed && "border-dashed",
                        provider === key
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border-interactive bg-background hover:border-primary/50 hover:bg-accent",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          key === "mock" ? "text-muted-foreground" : "text-primary",
                        )}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-medium">{title}</p>
                        <p id={`provider-${key}-detail`} className="text-xs text-muted-foreground">
                          {detail}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handlePay}
              disabled={initPayment.isPending}
              aria-busy={initPayment.isPending}
            >
              {initPayment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : null}
              Pay {formatAmd(booking.amount_minor ?? 0)}
            </Button>
            <p className="flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> You'll be taken to a
              secure page to pay by card — card details never touch SportsBnB.
            </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
