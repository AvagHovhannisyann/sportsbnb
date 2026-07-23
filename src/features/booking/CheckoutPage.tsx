import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { CreditCard, Loader2, ShieldCheck, Timer, Wallet } from "lucide-react";
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

/** Checkout for a booking hold: countdown, provider choice, redirect to pay. */
export default function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [provider, setProvider] = useState<PaymentProviderKey>("ameria");
  const [remaining, setRemaining] = useState<number | null>(null);
  const initPayment = useInitPayment();

  const { data: booking, isLoading } = useQuery({
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

  if (!booking || booking.status !== "pending_payment" || (remaining !== null && remaining <= 0)) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">
            {booking?.status === "confirmed" ? "Already paid" : "This reservation has expired"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {booking?.status === "confirmed"
              ? "This booking is already confirmed."
              : "Holds last 20 minutes. Please pick your slot again."}
          </p>
          <Button onClick={() => navigate(booking ? `/venue/${booking.venue_uuid ?? booking.venue_id}` : "/venues")}>
            Back to venue
          </Button>
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
              {countdown && (
                <span className="flex items-center gap-1.5 text-sm font-normal text-amber-600">
                  <Timer className="h-4 w-4" /> {countdown}
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

            <div className="space-y-2">
              <p className="text-sm font-medium">Pay with</p>
              <button
                type="button"
                onClick={() => setProvider("ameria")}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  provider === "ameria" ? "border-primary ring-1 ring-primary" : "hover:border-primary/50",
                )}
              >
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Bank card</p>
                  <p className="text-xs text-muted-foreground">Visa, Mastercard, ArCa · Ameriabank vPOS</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setProvider("idram")}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  provider === "idram" ? "border-primary ring-1 ring-primary" : "hover:border-primary/50",
                )}
              >
                <Wallet className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Idram</p>
                  <p className="text-xs text-muted-foreground">Pay from your Idram wallet</p>
                </div>
              </button>
              {MOCK_ENABLED && (
                <button
                  type="button"
                  onClick={() => setProvider("mock")}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border border-dashed p-3 text-left transition-colors",
                    provider === "mock" ? "border-primary ring-1 ring-primary" : "hover:border-primary/50",
                  )}
                >
                  <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Test payment</p>
                    <p className="text-xs text-muted-foreground">Development only</p>
                  </div>
                </button>
              )}
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
