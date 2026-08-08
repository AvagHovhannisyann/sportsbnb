import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import { toast } from "sonner";
import { useVerifyPayment } from "./hooks/useBookingFlow";

/** Fake "bank page" for the mock provider (dev/E2E only). */
export default function MockPayPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const verify = useVerifyPayment();
  const [busy, setBusy] = useState<"paid" | "failed" | null>(null);

  const decide = async (outcome: "paid" | "failed") => {
    if (!paymentId) return;
    setBusy(outcome);
    try {
      const result = await verify.mutateAsync({ paymentId, mockOutcome: outcome });
      if (result.bookingId) {
        navigate(`/booking/${result.bookingId}/status`);
      } else if (result.gameId) {
        navigate(`/game/${result.gameId}/join-status?paymentId=${paymentId}`);
      } else {
        navigate("/dashboard");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mock payment failed");
      setBusy(null);
    }
  };

  return (
    <Layout showFooter={false} showMobileNav={false} showAssistant={false}>
      <div className="section-tinted flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 py-10">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="border-b border-border p-5 sm:p-6">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-warning/25 bg-warning/10 text-warning">
              <FlaskConical className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="eyebrow mb-1 text-warning">Development utility</p>
            <CardTitle as="h1" className="text-2xl">
              Mock payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="rounded-lg border border-warning/25 bg-warning/5 p-3.5 text-sm leading-relaxed">
              This simulated bank page exists only in development. No real card is charged.
            </div>
            <p className="text-sm text-muted-foreground">Choose the provider outcome to continue:</p>
            <Button
              className="w-full"
              size="lg"
              onClick={() => decide("paid")}
              disabled={busy !== null}
              aria-busy={busy === "paid"}
            >
              {busy === "paid" ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : null}
              Simulate successful payment
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
              onClick={() => decide("failed")}
              disabled={busy !== null}
              aria-busy={busy === "failed"}
            >
              {busy === "failed" ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : null}
              Simulate failed payment
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
