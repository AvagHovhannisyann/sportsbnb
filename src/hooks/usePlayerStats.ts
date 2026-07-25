import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PlayerStats {
  games_played: number;
  games_hosted: number;
  total_bookings: number;
  sports_played: string[];
  member_since: string | null;
  referral_credits: number;
}

export const usePlayerStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase.rpc("get_player_stats", {
          p_user_id: user.id,
        });

        if (error) throw error;
        // The result used to be cast straight through with `as unknown as
        // PlayerStats`, which asserts a shape without checking one. A
        // set-returning RPC hands back an array, and an array is truthy — so
        // it sailed past the consumer's `if (!stats)` guard and every field
        // read as undefined, rendering a card of blank numbers. Narrow to a
        // plain object before trusting it.
        const isRecord = data !== null && typeof data === "object" && !Array.isArray(data);
        setStats(isRecord ? (data as unknown as PlayerStats) : null);
        setIsError(!isRecord);
      } catch (error) {
        // Was swallowed entirely, so a failed call left stats null and the
        // card silently returned null — indistinguishable from "no stats yet".
        console.error("Error fetching player stats:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return { stats, isLoading, isError };
};
