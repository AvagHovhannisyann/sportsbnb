import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { CreditCard, Loader2, ShieldCheck, Timer, Wallet, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useInitPayment,
  submitProviderForm,
  formatAmd,
  PaymentProviderKey,
} from "./hooks/useBookingFlow";

const MOCK_ENABLED = import.meta.env.DEV || import.meta.env.VITE_PAYMENTS_MOCK === "true";

const providerOptions: {
  key: PaymentProviderKey;
  icon: typeof CreditCard;
  title: string;
  detail: string;
  dashed?: boolean;
}[] = [
  {
    key: "ameria",
    icon: CreditCard,
    title: "Bank card",
    detail: "Visa, Mastercard, ArCa · Ameriabank vPOS",
  },
  { key: "idram", icon: Wallet, title: "Idram", detail: "Pay from your Idram wallet" },
  ...(MOCK_ENABLED
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

/** Checkout for a booking hold: countdown, provider choice, redirect to pay. */
export default function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [provider, setProvider] = useState<PaymentProviderKey>("ameria");
  const [remaining, setRemaining] = useState<number | null>(null);
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
      <Layout>
        <div className="container flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <Layout>
        <div className="container max-w-lg py-24 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <WifiOff className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-bold">Couldn't load this reservation</h1>
          <p className="mx-auto mt-2 max-w-[46ch] text-[15px] leading-relaxed text-foreground-soft">
            We couldn't reach our servers. Your hold has not been cancelled —
            don't book again until this loads.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Retrying…
                </>
              ) : (
                "Try again"
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate("/my-activity")}>
              View my bookings
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!booking || booking.status !== "pending_payment" || (remaining !== null && remaining <= 0)) {
    const isPaid = booking?.status === "confirmed";
    const isMissing = !booking;

    return (
      <Layout>
        <div className="container max-w-lg py-24 text-center">
          <div
            className={cn(
              "mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl",
              isPaid ? "bg-primary/10 text-primary" : "bg-surface-2 text-muted-foreground",
            )}
          >
            {isPaid ? (
              <ShieldCheck className="h-7 w-7" aria-hidden="true" />
            ) : (
              <Timer className="h-7 w-7" aria-hidden="true" />
            )}
          </div>
          <h1 className="font-display text-2xl font-bold">
            {isPaid
              ? "Already paid"
              : isMissing
                ? "Reservation not found"
                : "This reservation has expired"}
          </h1>
          <p className="mx-auto mt-2 max-w-[46ch] text-[15px] leading-relaxed text-foreground-soft">
            {isPaid
              ? "This booking is confirmed — nothing further to pay."
              : isMissing
                ? "The link may be out of date, or the reservation was cancelled."
                : "Holds last 20 minutes so slots don't sit locked. Pick your slot again to start a new one."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {isPaid ? (
              <Button onClick={() => navigate(`/booking/${booking!.id}/status`)}>
                View booking
              </Button>
            ) : (
              <Button
                onClick={() =>
                  navigate(
                    booking ? `/venue/${booking.venue_uuid ?? booking.venue_id}` : "/venues",
                  )
                }
              >
                {booking ? "Back to venue" : "Browse venues"}
              </Button>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-lg py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Confirm and pay</span>
              {/* Was a hardcoded text-amber-600 — off the token system and
                  muddy on a dark surface — and it looked identical at 19:00
                  and at 0:20. Under two minutes it escalates to destructive,
                  and the value is announced politely so the deadline is not
                  purely visual. */}
              {countdown && (
                <span
                  role="timer"
                  aria-live="polite"
                  aria-label={`Time left to pay: ${countdown}`}
                  className={cn(
                    "flex items-center gap-1.5 font-mono text-sm font-medium tabular-nums transition-colors",
                    isUrgent ? "text-destructive" : "text-warning",
                  )}
                >
                  <Timer className="h-4 w-4" aria-hidden="true" /> {countdown}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted/50 p-4 space-y-1 text-sm">
              <p className="font-semibold text-base">{booking.venue_name}</p>
              <p className="text-muted-foreground">
                {booking.starts_at
                  ? `${format(new Date(booking.starts_at), "EEEE, MMM d")} · ${format(new Date(booking.starts_at), "HH:mm")}–${format(new Date(booking.ends_at!), "HH:mm")}`
                  : `${booking.booking_date} · ${booking.booking_time}`}
              </p>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Venue</span>
                <span>{formatAmd(booking.owner_amount_minor ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service fee</span>
                <span>{formatAmd(booking.platform_fee_minor ?? 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2 text-base font-semibold">
                <span>Total</span>
                <span>{formatAmd(booking.amount_minor ?? 0)}</span>
              </div>
            </div>

            {/* These were three plain buttons: the choice was conveyed only by
                a border colour, so a screen reader announced all of them
                identically with no indication of which was selected — on the
                control that decides how someone pays. Now a real radio group. */}
            <div className="space-y-2">
              <p id="pay-with-label" className="text-sm font-medium">
                Pay with
              </p>
              <div role="radiogroup" aria-labelledby="pay-with-label" className="space-y-2">
                {providerOptions.map(({ key, icon: Icon, title, detail, dashed }) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={provider === key}
                    onClick={() => setProvider(key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3 text-left outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      dashed && "border-dashed",
                      provider === key
                        ? "border-primary ring-1 ring-primary"
                        : "hover:border-primary/50",
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
                      <p className="text-xs text-muted-foreground">{detail}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handlePay} disabled={initPayment.isPending}>
              {initPayment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pay {formatAmd(booking.amount_minor ?? 0)}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Payments are processed securely by the provider — card details never touch SportsBnB.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
