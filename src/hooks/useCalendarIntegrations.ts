import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CalendarIntegrationStatus {
  google: boolean;
  outlook: boolean;
}

export function useCalendarIntegrations(venueId: string | null) {
  const [status, setStatus] = useState<CalendarIntegrationStatus>({ google: false, outlook: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!venueId) return;
    
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("calendar-auth", {
        body: {
          action: "get-status",
          venueId,
        },
      });

      if (error) {
        console.error("Error fetching calendar status:", error);
        return;
      }

      setStatus({
        google: data?.integrations?.google || false,
        outlook: data?.integrations?.outlook || false,
      });
    } catch (error) {
      console.error("Error fetching calendar status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [venueId]);

  const initiateOAuth = async (provider: "google" | "outlook") => {
    if (!venueId) {
      toast.error("Please select a venue first");
      return;
    }

    setIsConnecting(provider);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in first");
        return;
      }

      const redirectUri = `${window.location.origin}/owner/integrations/callback`;

      const { data, error } = await supabase.functions.invoke("calendar-auth", {
        body: {
          action: "get-auth-url",
          provider,
          venueId,
          redirectUri,
        },
      });

      if (error) {
        console.error("Error getting auth URL:", error);
        toast.error(`Failed to connect ${provider} calendar`);
        return;
      }

      if (data?.authUrl) {
        // Store state for callback
        localStorage.setItem("calendar_oauth_state", JSON.stringify({
          provider,
          venueId,
          redirectUri,
        }));
        
        // Redirect to OAuth
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("OAuth initiation error:", error);
      toast.error(`Failed to connect ${provider} calendar`);
    } finally {
      setIsConnecting(null);
    }
  };

  const handleOAuthCallback = async (code: string, _state: string) => {
    try {
      const savedState = localStorage.getItem("calendar_oauth_state");
      if (!savedState) {
        toast.error("OAuth state not found");
        return false;
      }

      const { provider, venueId: storedVenueId, redirectUri } = JSON.parse(savedState);

      const { error } = await supabase.functions.invoke("calendar-auth", {
        body: {
          action: "exchange-code",
          provider,
          code,
          venueId: storedVenueId,
          redirectUri,
        },
      });

      if (error) {
        console.error("Token exchange error:", error);
        toast.error("Failed to complete calendar connection");
        return false;
      }

      localStorage.removeItem("calendar_oauth_state");
      toast.success(`${provider === "google" ? "Google" : "Outlook"} Calendar connected successfully!`);
      await fetchStatus();
      return true;
    } catch (error) {
      console.error("OAuth callback error:", error);
      toast.error("Failed to complete calendar connection");
      return false;
    }
  };

  const disconnect = async (provider: "google" | "outlook") => {
    if (!venueId) return;

    try {
      const { error } = await supabase.functions.invoke("calendar-auth", {
        body: {
          action: "disconnect",
          provider,
          venueId,
        },
      });

      if (error) {
        console.error("Disconnect error:", error);
        toast.error(`Failed to disconnect ${provider} calendar`);
        return;
      }

      toast.success(`${provider === "google" ? "Google" : "Outlook"} Calendar disconnected`);
      await fetchStatus();
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.error(`Failed to disconnect ${provider} calendar`);
    }
  };

  return {
    status,
    isLoading,
    isConnecting,
    initiateOAuth,
    handleOAuthCallback,
    disconnect,
    refetch: fetchStatus,
  };
}