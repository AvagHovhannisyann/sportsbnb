import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-lg font-medium text-foreground">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-lg font-medium text-foreground">{message}</p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;
