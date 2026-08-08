import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { atVenue } from "@/lib/venueTime";
import { CheckCircle2, CircleAlert, Clock3, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useVerifyPayment, useCancelBooking, formatAmd } from "./hooks/useBookingFlow";
import { formatTimeOfDay } from "@/lib/time";

/**
 * Landing page after returning from the payment provider.
 * Polls payments-verify until the payment reaches a terminal state
 * (covers redirect races, and providers that confirm by webhook rather than on
 * the redirect itself).
 */
export default function BookingStatusPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user } = useAuth();
  const verify = useVerifyPayment();
  const [finalStatus, setFinalStatus] = useState<string | null>(null);
  const attempts = useRef(0);

  const cancelBooking = useCancelBooking();

  const { data: booking, refetch } = useQuery({
    queryKey: ["booking-status", bookingId],
    enabled: !!bookingId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("id", bookingId!).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!booking || !user) return;
    if (booking.status === "confirmed") {
      setFinalStatus("paid");
      return;
    }
    if (["cancelled_by_player", "cancelled_by_owner", "refunded", "expired"].includes(booking.status)) {
      setFinalStatus(booking.status);
      return;
    }

    let stopped = false;
    const poll = async () => {
      const { data: payment } = await supabase
        .from("payments")
        .select("id, status")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (stopped) return;
      if (!payment) {
        setFinalStatus("no_payment");
        return;
      }
      try {
        const result = await verify.mutateAsync({ paymentId: payment.id });
        if (stopped) return;
        if (result.status === "paid") {
          setFinalStatus("paid");
          refetch();
          return;
        }
        if (["failed", "cancelled"].includes(result.status)) {
          setFinalStatus(result.status);
          return;
        }
      } catch {
        // transient — keep polling
      }
      attempts.current += 1;
      if (attempts.current < 30) {
        setTimeout(poll, 2000);
      } else {
        setFinalStatus("timeout");
      }
    };
    poll();
    return () => {
      stopped = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id, booking?.status, user?.id]);

  const renderBody = () => {
    if (!finalStatus) {
      return (
        <div className="px-5 py-12 text-center sm:px-8" role="status" aria-live="polite">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          </div>
          <h1 className="font-display text-xl font-semibold tracking-extra-tight sm:text-2xl">
            Confirming your payment…
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            This usually takes a few seconds. You can leave this page open.
          </p>
        </div>
      );
    }
    if (finalStatus === "paid") {
      return (
        <div className="px-5 py-10 text-center sm:px-8 sm:py-12">
          <span className="sr-only" role="status" aria-live="polite">
            Booking confirmed.
          </span>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-success/25 bg-success/10 text-success">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="eyebrow mb-2 text-success">Payment received</p>
          <h1 className="font-display text-2xl font-semibold tracking-extra-tight sm:text-3xl">
            Booking confirmed
          </h1>
          {booking && (
            <>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
                {booking.venue_name} ·{" "}
                {booking.starts_at
                  ? `${format(atVenue(booking.starts_at), "EEE, MMM d")} at ${format(atVenue(booking.starts_at), "HH:mm")}`
                  : `${booking.booking_date} at ${formatTimeOfDay(booking.booking_time)}`}
              </p>
              {/* What was charged, and something to quote.
                  This screen confirmed a payment without stating its amount or
                  giving any reference — and an email receipt is not guaranteed,
                  since the sending domain is still unverified. Someone querying
                  a charge on their card statement had nothing on this page to
                  point at. */}
              <dl className="surface-inset mx-auto my-6 max-w-sm space-y-2 rounded-lg px-4 py-3.5 text-sm">
                {booking.amount_minor != null && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Paid</dt>
                    <dd className="stat-numeral font-semibold tabular-nums text-foreground">
                      {formatAmd(booking.amount_minor)}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd className="font-mono text-xs uppercase text-foreground-soft">
                    {booking.id.slice(0, 8)}
                  </dd>
                </div>
              </dl>
            </>
          )}
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/dashboard">My bookings</Link>
            </Button>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link to="/venues">Browse more venues</Link>
            </Button>
          </div>
          {booking?.starts_at && new Date(booking.starts_at) > new Date() && (
            <div className="mt-7 border-t border-border pt-5">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
                  >
                    Cancel booking
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your refund is calculated from the venue's cancellation policy that applied
                      when you booked. Refunds go back to the card you paid with, and most
                      arrive within a few business days.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep booking</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
                      onClick={async () => {
                        try {
                          const result = await cancelBooking.mutateAsync({ bookingId: booking.id });
                          setFinalStatus(result.status);
                          refetch();
                          if (result.refundMinor > 0) {
                            toast.success(
                              result.manual
                                ? `Cancelled — ${formatAmd(result.refundMinor)} refund is being processed`
                                : `Cancelled — ${formatAmd(result.refundMinor)} refunded`,
                            );
                          } else {
                            toast.success("Booking cancelled");
                          }
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Cancellation failed");
                        }
                      }}
                    >
                      Cancel booking
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      );
    }
    const failed = ["failed", "cancelled", "expired", "timeout", "no_payment"].includes(finalStatus);
    const stillProcessing = finalStatus === "timeout";
    const cancelledBooking = !failed;
    const StatusIcon = stillProcessing ? Clock3 : cancelledBooking ? CircleAlert : XCircle;
    return (
      <div className="px-5 py-10 text-center sm:px-8 sm:py-12">
        <span className="sr-only" role="status" aria-live="polite">
          {finalStatus === "timeout" ? "Payment is still processing." : "Payment or booking status updated."}
        </span>
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border ${
            stillProcessing
              ? "border-information/25 bg-information/10 text-information"
              : cancelledBooking
                ? "border-warning/25 bg-warning/10 text-warning"
                : "border-destructive/25 bg-destructive/5 text-destructive"
          }`}
        >
          <StatusIcon className="h-7 w-7" aria-hidden="true" />
        </div>
        <p
          className={`eyebrow mb-2 ${
            stillProcessing ? "text-information" : cancelledBooking ? "text-warning" : "text-destructive"
          }`}
        >
          {stillProcessing ? "Provider response pending" : cancelledBooking ? "Booking update" : "Payment status"}
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-extra-tight sm:text-3xl">
          {finalStatus === "timeout" ? "Payment still processing" : failed ? "Payment not completed" : "Booking cancelled"}
        </h1>
        <p className="mx-auto mb-6 mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
          {finalStatus === "timeout"
            ? "We haven't received confirmation yet. If you completed the payment, this page will update — check back shortly."
            : "No money was taken. You can try booking the slot again."}
        </p>
        <Button asChild className="w-full sm:w-auto">
          <Link to={booking ? `/venue/${booking.venue_uuid ?? booking.venue_id}` : "/venues"}>Back to venue</Link>
        </Button>
      </div>
    );
  };

  return (
    <Layout showFooter={false} showMobileNav={false} showAssistant={false}>
      <div className="section-tinted min-h-[calc(100dvh-4rem)] py-6 sm:py-10">
        <div className="container max-w-xl">
          <Card className="shadow-sm">
            <CardContent className="p-0">{renderBody()}</CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
