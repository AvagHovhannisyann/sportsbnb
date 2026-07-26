import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
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
 * (covers redirect races and Idram's callback-driven flow).
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
        <div className="text-center py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-1">Confirming your payment…</h1>
          <p className="text-muted-foreground text-sm">This usually takes a few seconds.</p>
        </div>
      );
    }
    if (finalStatus === "paid") {
      return (
        <div className="text-center py-8">
          <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-1">Booking confirmed!</h1>
          {booking && (
            <>
              <p className="text-muted-foreground mb-6">
                {booking.venue_name} ·{" "}
                {booking.starts_at
                  ? `${format(new Date(booking.starts_at), "EEE, MMM d")} at ${format(new Date(booking.starts_at), "HH:mm")}`
                  : `${booking.booking_date} at ${formatTimeOfDay(booking.booking_time)}`}
              </p>
              {/* What was charged, and something to quote.
                  This screen confirmed a payment without stating its amount or
                  giving any reference — and an email receipt is not guaranteed,
                  since the sending domain is still unverified. Someone querying
                  a charge on their card statement had nothing on this page to
                  point at. */}
              <dl className="mx-auto mb-6 max-w-xs space-y-1 rounded-xl bg-surface-1 px-4 py-3 text-sm">
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
          <div className="flex justify-center gap-3">
            <Button asChild>
              <Link to="/dashboard">My bookings</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/venues">Browse more venues</Link>
            </Button>
          </div>
          {booking?.starts_at && new Date(booking.starts_at) > new Date() && (
            <div className="mt-6 border-t pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    Cancel booking
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your refund is calculated from the venue's cancellation policy that applied
                      when you booked. Card refunds usually arrive within a few business days;
                      Idram has no refund API, so those are processed by hand and can take longer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep booking</AlertDialogCancel>
                    <AlertDialogAction
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
    return (
      <div className="text-center py-8">
        <XCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-1">
          {finalStatus === "timeout" ? "Payment still processing" : failed ? "Payment not completed" : "Booking cancelled"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {finalStatus === "timeout"
            ? "We haven't received confirmation yet. If you completed the payment, this page will update — check back shortly."
            : "No money was taken. You can try booking the slot again."}
        </p>
        <Button asChild>
          <Link to={booking ? `/venue/${booking.venue_uuid ?? booking.venue_id}` : "/venues"}>Back to venue</Link>
        </Button>
      </div>
    );
  };

  return (
    <Layout>
      <div className="container max-w-lg py-10">
        <Card>
          <CardContent>{renderBody()}</CardContent>
        </Card>
      </div>
    </Layout>
  );
}
