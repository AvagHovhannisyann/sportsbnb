import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVerifyPayment } from "./hooks/useBookingFlow";

/** Result page after paying to join a game. */
export default function GameJoinStatusPage() {
  const { id: gameId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const paymentIdParam = searchParams.get("paymentId");
  const { user } = useAuth();
  const verify = useVerifyPayment();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const attempts = useRef(0);

  useEffect(() => {
    if (!user || !gameId) return;
    let stopped = false;

    const poll = async () => {
      let paymentId = paymentIdParam;
      if (!paymentId) {
        const { data: payment } = await supabase
          .from("payments")
          .select("id")
          .eq("game_id", gameId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        paymentId = payment?.id ?? null;
      }
      if (!paymentId) {
        setStatus("error");
        return;
      }
      try {
        const result = await verify.mutateAsync({ paymentId });
        if (stopped) return;
        if (result.status === "paid") {
          setStatus("success");
          return;
        }
        if (["failed", "cancelled"].includes(result.status)) {
          setStatus("error");
          return;
        }
      } catch {
        // transient
      }
      attempts.current += 1;
      if (attempts.current < 30) setTimeout(poll, 2000);
      else setStatus("error");
    };

    poll();
    return () => {
      stopped = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, gameId, paymentIdParam]);

  return (
    <Layout>
      <div className="container py-16 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-10">
            {status === "loading" && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <h1 className="text-xl font-semibold">Confirming your payment…</h1>
              </>
            )}
            {status === "success" && (
              <>
                <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto mb-4" />
                {/* A CheckCircle2 already sits directly above this line; the 🎉
                    was a second celebratory glyph in a different font. */}
                <h1 className="text-2xl font-bold mb-2">You're in!</h1>
                <p className="text-muted-foreground mb-6">Payment received — see you on the field.</p>
                <Button asChild>
                  <Link to={`/game/${gameId}`}>Back to the game</Link>
                </Button>
              </>
            )}
            {status === "error" && (
              <>
                <XCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Payment not completed</h1>
                <p className="text-muted-foreground mb-6">
                  If you were charged, your spot will be confirmed automatically — otherwise try again.
                </p>
                <Button asChild>
                  <Link to={`/game/${gameId}`}>Back to the game</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
