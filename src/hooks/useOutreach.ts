import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export type OutreachTarget = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  language: string;
  contact_email: string | null;
  contact_name: string | null;
  enriched: Record<string, unknown>;
  research: Record<string, unknown>;
  ai_subject: string | null;
  ai_body: string | null;
  status: "new" | "enriched" | "researched" | "drafted" | "contacted" | "replied" | "onboarded" | "passed" | "unreachable";
  notes: string | null;
  last_contacted_at: string | null;
  followup_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OutreachMessage = {
  id: string;
  target_id: string;
  direction: "outbound" | "inbound";
  subject: string | null;
  body: string;
  from_email: string | null;
  to_email: string | null;
  resend_id: string | null;
  status: string;
  sent_at: string;
};

export function useOutreachTargets() {
  return useQuery({
    queryKey: ["outreach_targets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_targets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OutreachTarget[];
    },
  });
}

export function useOutreachMessages(targetId: string | null) {
  return useQuery({
    queryKey: ["outreach_messages", targetId],
    enabled: !!targetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_messages")
        .select("*")
        .eq("target_id", targetId!)
        .order("sent_at", { ascending: true });
      if (error) throw error;
      return data as unknown as OutreachMessage[];
    },
  });
}

function detectLang(city: string): "hy" | "en" {
  const armenian = /yerevan|gyumri|vanadzor|abovyan|ejmiatsin|հայ|երևան/i;
  return armenian.test(city) ? "hy" : "en";
}

export function useImportTargets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { name: string; city?: string; country?: string }[]) => {
      const payload = rows.map((r) => ({
        name: r.name.trim(),
        city: r.city?.trim() || null,
        country: r.country?.trim() || null,
        language: detectLang(r.city || ""),
      })).filter((r) => r.name.length > 0);
      if (!payload.length) throw new Error("No valid rows");
      const { error } = await supabase.from("outreach_targets").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (n) => {
      toast.success(`Imported ${n} venue${n === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["outreach_targets"] });
    },
    onError: (e: Error) => toast.error("Import failed", { description: e.message }),
  });
}

async function invoke(fn: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useEnrichTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (target_id: string) => invoke("outreach-enrich", { target_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outreach_targets"] }),
    onError: (e: Error) => toast.error("Enrich failed", { description: e.message }),
  });
}

export function useResearchTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (target_id: string) => invoke("outreach-research", { target_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outreach_targets"] }),
    onError: (e: Error) => toast.error("Research failed", { description: e.message }),
  });
}

export function useDraftTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (target_id: string) => invoke("outreach-draft", { target_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outreach_targets"] }),
    onError: (e: Error) => toast.error("Draft failed", { description: e.message }),
  });
}

export function usePrepareTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (target_id: string) => invoke("outreach-prepare", { target_id }),
    onSuccess: (data) => {
      const phones = Array.isArray(data?.phones) ? data.phones : [];
      const socials = data?.socials && typeof data.socials === "object" ? Object.keys(data.socials) : [];
      if (data?.unreachable) {
        toast.error("No contact channel found", {
          description: "Moved to Unreachable for later review.",
        });
      } else if (data?.contact_email) {
        toast.success("Outreach prepared", { description: `Email: ${data.contact_email}` });
      } else {
        const alt = [phones.length && `${phones.length} phone${phones.length > 1 ? "s" : ""}`, socials.length && `${socials.length} social link${socials.length > 1 ? "s" : ""}`, data?.contact_form_url && "contact form"].filter(Boolean).join(", ");
        toast("No email — try other channels", { description: alt || "Only partial data found." });
      }
      qc.invalidateQueries({ queryKey: ["outreach_targets"] });
    },
    onError: (e: Error) => toast.error("AI preparation failed", { description: e.message }),
  });
}

export function useSendTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { target_id: string; to: string; subject: string; body: string }) =>
      invoke("outreach-send", args),
    onSuccess: (_d, vars) => {
      toast.success("Email sent", { description: vars.to });
      qc.invalidateQueries({ queryKey: ["outreach_targets"] });
      qc.invalidateQueries({ queryKey: ["outreach_messages", vars.target_id] });
    },
    onError: (e: Error) => toast.error("Send failed", { description: e.message }),
  });
}

export function useUpdateTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("outreach_targets").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outreach_targets"] }),
    onError: (e: Error) => toast.error("Update failed", { description: e.message }),
  });
}

export function useDeleteTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("outreach_targets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outreach_targets"] }),
  });
}
