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

/**
 * A suggestion the model produced, or null.
 *
 * `player-insights` is LLM-backed, so a partial or reshaped payload is a
 * realistic outcome rather than a theoretical one — and `data as
 * PlayerNextMove` is a cast, not a check. A response missing `headline` and
 * `cta_link` still passed the card's `!data` guard, because `{}` is truthy,
 * and rendered an empty husk: a "Suggestion" badge, no text, and an arrow
 * button with no accessible name pointing at `to={undefined}`.
 */
export const asNextMove = (value: unknown): PlayerNextMove | null => {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const str = (k: string) => (typeof v[k] === "string" && v[k] ? (v[k] as string) : null);
  const headline = str("headline");
  const ctaLabel = str("cta_label");
  const ctaLink = str("cta_link");
  // Everything the card renders has to be present. A suggestion missing its
  // own call to action is not a partial suggestion, it is not one.
  if (!headline || !ctaLabel || !ctaLink) return null;
  const vibe = str("vibe");
  return {
    headline,
    detail: str("detail") ?? "",
    cta_label: ctaLabel,
    cta_link: ctaLink,
    vibe:
      vibe === "urgent" || vibe === "positive" || vibe === "discovery"
        ? vibe
        : "neutral",
  };
};

export function usePlayerNextMove() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["player-next-move", user?.id],
    enabled: !!user?.id,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<PlayerNextMove | null> => {
      const { data, error } = await supabase.functions.invoke("player-insights");
      if (error) throw error;
      return asNextMove(data);
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
