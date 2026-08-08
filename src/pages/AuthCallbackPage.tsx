import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { AuthHeading, AuthPanel, AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get session from URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          setStatus("error");
          setMessage(error.message || "Authentication failed");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        if (!session) {
          // Check if there's a hash in the URL (for magic link)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get("access_token");
          
          if (accessToken) {
            // Set the session from the hash
            const { error: setError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get("refresh_token") || "",
            });

            if (setError) {
              setStatus("error");
              setMessage("Failed to complete authentication");
              setTimeout(() => navigate("/login"), 3000);
              return;
            }
          } else {
            setStatus("error");
            setMessage("No session found");
            setTimeout(() => navigate("/login"), 3000);
            return;
          }
        }

        // Get fresh session
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        
        if (freshSession?.user) {
          setStatus("success");
          setMessage("Welcome! Redirecting...");

          // Check profile to determine redirect
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_completed, user_type")
            .eq("user_id", freshSession.user.id)
            .maybeSingle();

          // Ensure profile exists
          if (!profile) {
            // Create profile if missing
            await supabase.from("profiles").insert({
              user_id: freshSession.user.id,
              email: freshSession.user.email,
              full_name: freshSession.user.user_metadata?.full_name || freshSession.user.email?.split("@")[0],
              user_type: "player",
            });
            
            setTimeout(() => navigate("/onboarding/player"), 1500);
            return;
          }

          // Redirect based on profile
          setTimeout(() => {
            if (!profile.onboarding_completed) {
              navigate(profile.user_type === "owner" ? "/owner-dashboard" : "/onboarding/player");
            } else if (profile.user_type === "owner") {
              navigate("/owner-dashboard");
            } else {
              navigate("/dashboard");
            }
          }, 1500);
        } else {
          setStatus("error");
          setMessage("Authentication failed");
          setTimeout(() => navigate("/login"), 3000);
        }
      } catch (err) {
        console.error("Callback error:", err);
        setStatus("error");
        setMessage("Something went wrong");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <AuthShell
      asideTitle="One secure handoff, then you are back in the game."
      asideDescription="Sportsbnb is confirming your session and checking where your account should continue."
    >
      <section aria-labelledby="callback-heading">
        <AuthHeading
          id="callback-heading"
          title={status === "error" ? "Sign-in needs attention" : status === "success" ? "You are signed in" : "Completing sign in"}
          description={status === "error" ? "We could not finish this authentication request." : "Keep this page open for a moment."}
        />
        <AuthPanel className="text-center">
          <div aria-live="polite" aria-atomic="true" role={status === "error" ? "alert" : "status"}>
            {status === "loading" && (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Loader2 aria-hidden="true" className="h-7 w-7 animate-spin motion-reduce:animate-none" />
              </div>
            )}
            {status === "success" && (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
              </div>
            )}
            {status === "error" && (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <XCircle aria-hidden="true" className="h-7 w-7" />
              </div>
            )}
            <p className="mt-5 font-medium text-foreground">{message}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {status === "loading"
                ? "We are verifying the secure response."
                : status === "success"
                  ? "Taking you to the right Sportsbnb workspace…"
                  : "Returning you to sign in…"}
            </p>
          </div>
          {status === "error" && (
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link to="/login">Return to sign in now</Link>
            </Button>
          )}
        </AuthPanel>
      </section>
    </AuthShell>
  );
};

export default AuthCallbackPage;
