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
    <Layout>
      <div className="container max-w-md py-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" /> Mock payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This simulated bank page exists only in development. Choose an outcome:
            </p>
            <Button className="w-full" onClick={() => decide("paid")} disabled={busy !== null}>
              {busy === "paid" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simulate successful payment
            </Button>
            <Button variant="destructive" className="w-full" onClick={() => decide("failed")} disabled={busy !== null}>
              {busy === "failed" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simulate failed payment
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
