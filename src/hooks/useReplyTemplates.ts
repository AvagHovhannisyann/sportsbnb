import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Owner quick-reply templates for venue chat. */

export const useOwnerReplyTemplates = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["owner-reply-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_reply_templates")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useCreateReplyTemplate = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, messageText }: { title: string; messageText: string }) => {
      const { data, error } = await supabase
        .from("owner_reply_templates")
        .insert({
          owner_id: user?.id,
          title,
          message_text: messageText,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-reply-templates"] });
    },
  });
};

export const useDeleteReplyTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("owner_reply_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-reply-templates"] });
    },
  });
};
