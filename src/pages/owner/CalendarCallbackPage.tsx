import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
        setErrorMessage(error === "access_denied" 
          ? "You cancelled the authorization" 
          : "Authorization failed");
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
    <OwnerLayout title="Calendar Integration">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            {status === "loading" && (
              <>
                <div className="flex justify-center mb-4" role="status" aria-label="Connecting your calendar">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <CardTitle as="h2">Connecting Calendar...</CardTitle>
                <CardDescription>
                  Please wait while we complete the connection
                </CardDescription>
              </>
            )}
            
            {status === "success" && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Check className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <CardTitle as="h2" className="text-emerald-600">Calendar Connected!</CardTitle>
                <CardDescription>
                  Redirecting you back to integrations...
                </CardDescription>
              </>
            )}
            
            {status === "error" && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  </div>
                </div>
                <CardTitle as="h2" className="text-destructive">Connection Failed</CardTitle>
                <CardDescription>
                  {errorMessage}
                </CardDescription>
              </>
            )}
          </CardHeader>
          
          {status === "error" && (
            <CardContent>
              <Button 
                onClick={() => navigate("/owner/integrations")} 
                className="w-full"
              >
                Back to Integrations
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </OwnerLayout>
  );
};

export default CalendarCallbackPage;