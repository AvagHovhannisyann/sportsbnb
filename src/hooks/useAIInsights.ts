import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PlayerNextMove {
  headline: string;
  detail: string;
  cta_label: string;
  cta_link: string;
  vibe: "urgent" | "positive" | "neutral" | "discovery";
}

export interface OwnerNudge {
  title: string;
  body: string;
  priority: "high" | "medium" | "low";
  category: "leads" | "response" | "listing" | "reputation" | "visibility";
}

export interface AdminBrief {
  brief: {
    headline: string;
    trends: string[];
    actions: string[];
    health: "healthy" | "watch" | "concern";
  };
  kpis: Record<string, unknown>;
}

export function usePlayerNextMove() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["player-next-move", user?.id],
    enabled: !!user?.id,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<PlayerNextMove> => {
      const { data, error } = await supabase.functions.invoke("player-insights");
      if (error) throw error;
      return data as PlayerNextMove;
    },
  });
}

export function useOwnerCoach() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["owner-coach", user?.id],
    enabled: !!user?.id,
    staleTime: 6 * 60 * 60 * 1000,
    queryFn: async (): Promise<{ nudges: OwnerNudge[] }> => {
      const { data, error } = await supabase.functions.invoke("owner-coach");
      if (error) throw error;
      return data as { nudges: OwnerNudge[] };
    },
  });
}

export function useAdminPulse() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-pulse", user?.id],
    enabled: !!user?.id,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<AdminBrief> => {
      const { data, error } = await supabase.functions.invoke("admin-pulse");
      if (error) throw error;
      return data as AdminBrief;
    },
  });
}
