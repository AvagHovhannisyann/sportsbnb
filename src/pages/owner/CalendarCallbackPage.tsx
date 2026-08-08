import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { useCalendarIntegrations } from "@/hooks/useCalendarIntegrations";

const CalendarCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const { handleOAuthCallback } = useCalendarIntegrations(null);

  useEffect(() => {
    const processCallback = async () => {
      if (error) {
        setStatus("error");
        setErrorMessage(error === "access_denied" ? "You cancelled the authorization" : "Authorization failed");
        return;
      }

      if (!code) {
        setStatus("error");
        setErrorMessage("No authorization code received");
        return;
      }

      const success = await handleOAuthCallback(code, state || "");

      if (success) {
        setStatus("success");
        setTimeout(() => {
          navigate("/owner/integrations");
        }, 2000);
      } else {
        setStatus("error");
        setErrorMessage("Failed to complete calendar connection");
      }
    };

    processCallback();
  }, [code, state, error]);

  return (
    <OwnerLayout title="Calendar integration" subtitle="Completing the provider authorization handoff.">
      <Card className="mx-auto max-w-md">
        <CardContent className="px-5 py-10 text-center sm:px-8 sm:py-12">
          <div aria-live="polite" aria-atomic="true">
            {status === "loading" && (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Loader2
                    aria-hidden="true"
                    className="h-6 w-6 animate-spin motion-reduce:animate-none"
                  />
                </div>
                <h2 className="font-display text-xl font-semibold tracking-extra-tight text-foreground">
                  Connecting calendar
                </h2>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Keep this page open while SportsBnB completes the account connection.
                </p>
                <span className="sr-only" role="status">
                  Connecting your calendar
                </span>
              </>
            )}

            {status === "success" && (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-success/20 bg-success/10 text-success">
                  <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
                </div>
                <h2 className="font-display text-xl font-semibold tracking-extra-tight text-foreground">
                  Calendar connected
                </h2>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Provider access was saved. Returning you to calendar integrations…
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-destructive/25 bg-destructive/5 text-destructive">
                  <CircleAlert aria-hidden="true" className="h-6 w-6" />
                </div>
                <h2 className="font-display text-xl font-semibold tracking-extra-tight text-foreground">
                  Connection not completed
                </h2>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {errorMessage}
                </p>
                <Button
                  type="button"
                  className="mt-6 w-full"
                  onClick={() => navigate("/owner/integrations")}
                >
                  <ArrowLeft aria-hidden="true" />
                  Back to integrations
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </OwnerLayout>
  );
};

export default CalendarCallbackPage;
