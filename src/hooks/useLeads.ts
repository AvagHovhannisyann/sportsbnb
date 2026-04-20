import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type LeadOutcome = "pending" | "confirmed" | "no_show" | "lost";

export interface OwnerLead {
  id: string;
  venue_id: string;
  venue_name: string;
  channel_used: "whatsapp" | "sms" | "call";
  booking_code: string;
  booking_date: string | null;
  booking_time: string | null;
  players_count: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  note: string | null;
  status: string;
  lead_outcome: LeadOutcome;
  outcome_updated_at: string | null;
  created_at: string;
}

/** Owner: leads for venues I own. */
export function useOwnerLeads() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["owner-leads", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<OwnerLead[]> => {
      const { data: venues } = await supabase
        .from("venues")
        .select("id")
        .eq("owner_id", user!.id);
      const ids = (venues ?? []).map((v) => v.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("booking_intents")
        .select("*")
        .in("venue_id", ids)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as OwnerLead[];
    },
  });
}

/** Player: my own outgoing booking inquiries. */
export function useMyLeads() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-leads", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<OwnerLead[]> => {
      const { data, error } = await supabase
        .from("booking_intents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as OwnerLead[];
    },
  });
}

export function useUpdateLeadOutcome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, lead_outcome }: { id: string; lead_outcome: LeadOutcome }) => {
      const { error } = await supabase
        .from("booking_intents")
        .update({ lead_outcome })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-leads"] });
      qc.invalidateQueries({ queryKey: ["booking-intents"] });
      toast.success("Lead updated");
    },
    onError: () => toast.error("Could not update lead"),
  });
}

/** Aggregate KPIs computed from a leads list. */
export function summarizeLeads(leads: OwnerLead[]) {
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const recent = leads.filter((l) => now - new Date(l.created_at).getTime() <= SEVEN_DAYS);
  const confirmed = leads.filter((l) => l.lead_outcome === "confirmed").length;
  const responded = recent.filter((l) => l.lead_outcome !== "pending").length;
  const responseRate = recent.length === 0 ? 0 : Math.round((responded / recent.length) * 100);
  return {
    total7d: recent.length,
    confirmed,
    responseRate,
    pending: leads.filter((l) => l.lead_outcome === "pending").length,
  };
}
