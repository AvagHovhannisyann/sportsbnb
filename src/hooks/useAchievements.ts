import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useAchievements = () => {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("requirement_value", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

export const useUserAchievements = (userId?: string) => {
  return useQuery({
    queryKey: ["user-achievements", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*, achievements(*)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useLeaderboard = () => {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, xp, level, city")
        .gt("xp", 0)
        .order("xp", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
};

export const useCheckAndAwardAchievements = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return [];

      // Awarding happens atomically server-side; returns newly earned rows.
      const { data, error } = await supabase.rpc("check_and_award_achievements");
      if (error) {
        console.error("Achievement check failed:", error.message);
        return [];
      }
      return data ?? [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-achievements"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
};
