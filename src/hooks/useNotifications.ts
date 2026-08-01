import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

/**
 * One realtime channel per user, shared by every mount of `useNotifications`.
 *
 * This hook is mounted twice by a single component: `NotificationDropdown`
 * calls `useNotifications()` for the list and `useUnreadNotificationCount()`
 * for the badge, and the latter calls `useNotifications()` itself. Both
 * effects asked for the same topic, and `supabase.channel(topic)` returns the
 * *existing* channel rather than a new one — so the second mount called `.on()`
 * on a channel that had already been subscribed.
 *
 * Under supabase-js 2.90 that was tolerated. 2.111 throws:
 *
 *   cannot add `postgres_changes` callbacks for realtime:notifications-… after
 *   `subscribe()`
 *
 * The throw happens inside `useEffect`, so the error boundary caught it,
 * remounted the header, and the new mount threw again — an unbroken render
 * loop that pinned the CPU on every signed-in page. It was found because the
 * browser audits stopped finishing: with the main thread spinning, later
 * navigations timed out and the smoke suites ran for hours instead of minutes.
 *
 * Refcounting keeps the fix to this file and keeps exactly one subscription per
 * user however many components ask for notifications. Callbacks are held in a
 * set so each mount still gets its own invalidation.
 */
type SharedChannel = {
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<() => void>;
};
const sharedChannels = new Map<string, SharedChannel>();

function subscribeToNotifications(userId: string, onInsert: () => void) {
  let shared = sharedChannels.get(userId);

  if (!shared) {
    const listeners = new Set<() => void>();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          for (const listener of listeners) listener();
        }
      )
      .subscribe();
    shared = { channel, listeners };
    sharedChannels.set(userId, shared);
  }

  shared.listeners.add(onInsert);
  const entry = shared;

  return () => {
    entry.listeners.delete(onInsert);
    // Last mount out closes the channel, so a signed-out user leaves nothing
    // subscribed behind.
    if (entry.listeners.size === 0 && sharedChannels.get(userId) === entry) {
      sharedChannels.delete(userId);
      supabase.removeChannel(entry.channel);
    }
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Subscribe to realtime notifications. Keyed on the id rather than the user
  // object: `useAuth` hands out a fresh object on every auth event, and the
  // subscription only ever depended on the id.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;

    return subscribeToNotifications(userId, () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    });
  }, [userId, queryClient]);

  return query;
};

export const useUnreadNotificationCount = () => {
  const { data: notifications } = useNotifications();
  return notifications?.filter((n) => !n.is_read).length || 0;
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
};
