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
    <Layout showFooter={false} showMobileNav={false} showAssistant={false}>
      <div className="section-tinted flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 py-10">
        <Card className="w-full max-w-lg shadow-sm">
          <CardContent className="p-0 text-center">
            {status === "loading" && (
              <div className="px-5 py-12 sm:px-8" role="status" aria-live="polite">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                </div>
                <h1 className="font-display text-xl font-semibold tracking-extra-tight sm:text-2xl">
                  Confirming your payment…
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  We’re securing your place in the game.
                </p>
              </div>
            )}
            {status === "success" && (
              <div className="px-5 py-10 sm:px-8 sm:py-12">
                <span className="sr-only" role="status" aria-live="polite">
                  Your place in the game is confirmed.
                </span>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-success/25 bg-success/10 text-success">
                  <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                </div>
                {/* A CheckCircle2 already sits directly above this line; the 🎉
                    was a second celebratory glyph in a different font. */}
                <p className="eyebrow mb-2 text-success">Place confirmed</p>
                <h1 className="font-display text-2xl font-semibold tracking-extra-tight sm:text-3xl">
                  You're in
                </h1>
                <p className="mx-auto mb-6 mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Payment received — see you on the field.
                </p>
                <Button asChild className="w-full sm:w-auto">
                  <Link to={`/game/${gameId}`}>Back to the game</Link>
                </Button>
              </div>
            )}
            {status === "error" && (
              <div className="px-5 py-10 sm:px-8 sm:py-12">
                <span className="sr-only" role="status" aria-live="polite">
                  Payment was not completed.
                </span>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-destructive/25 bg-destructive/5 text-destructive">
                  <XCircle className="h-7 w-7" aria-hidden="true" />
                </div>
                <p className="eyebrow mb-2 text-destructive">Payment status</p>
                <h1 className="font-display text-2xl font-semibold tracking-extra-tight sm:text-3xl">
                  Payment not completed
                </h1>
                <p className="mx-auto mb-6 mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
                  If you were charged, your spot will be confirmed automatically — otherwise try again.
                </p>
                <Button asChild className="w-full sm:w-auto">
                  <Link to={`/game/${gameId}`}>Back to the game</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
