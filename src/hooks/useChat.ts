import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useCallback } from "react";

export interface ChatRoom {
  id: string;
  type: "game" | "booking" | "venue";
  reference_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMember {
  id: string;
  room_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at: string | null;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string | null;
  message_text: string;
  message_type: "user" | "system";
  created_at: string;
  is_reported: boolean;
  sender?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  sender_role?: string;
}

// Get or create a chat room for a game/booking/venue
export const useGetOrCreateChatRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, referenceId }: { type: "game" | "booking" | "venue"; referenceId: string }) => {
      const { data, error } = await supabase.rpc("get_or_create_chat_room", {
        p_type: type,
        p_reference_id: referenceId,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });
};

// Fetch chat room by type and reference
export const useChatRoom = (type: "game" | "booking" | "venue", referenceId: string) => {
  return useQuery({
    queryKey: ["chat-room", type, referenceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("type", type)
        .eq("reference_id", referenceId)
        .maybeSingle();

      if (error) throw error;
      return data as ChatRoom | null;
    },
    enabled: !!referenceId,
  });
};

// Fetch chat members for a room
export const useChatMembers = (roomId: string | undefined) => {
  return useQuery({
    queryKey: ["chat-members", roomId],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("chat_members")
        .select("*")
        .eq("room_id", roomId!);

      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = members?.map(m => m.user_id) || [];
      let profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles_public")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);
        
        if (profileData) {
          profiles = profileData.reduce((acc, p) => {
            if (p.user_id) {
              acc[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
            }
            return acc;
          }, {} as Record<string, { full_name: string | null; avatar_url: string | null }>);
        }
      }

      return (members || []).map(m => ({
        ...m,
        profile: profiles[m.user_id],
      })) as ChatMember[];
    },
    enabled: !!roomId,
  });
};

// Fetch messages for a room with realtime subscription
export const useChatMessages = (roomId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chat-messages", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Fetch sender profiles separately
      const senderIds = [...new Set(data?.filter(m => m.sender_id).map(m => m.sender_id) || [])];
      let profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      let memberRoles: Record<string, string> = {};
      
      if (senderIds.length > 0) {
        // Fetch profiles
        const { data: profileData } = await supabase
          .from("profiles_public")
          .select("user_id, full_name, avatar_url")
          .in("user_id", senderIds);
        
        if (profileData) {
          profiles = profileData.reduce((acc, p) => {
            if (p.user_id) {
              acc[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
            }
            return acc;
          }, {} as Record<string, { full_name: string | null; avatar_url: string | null }>);
        }

        // Fetch member roles for this room
        const { data: membersData } = await supabase
          .from("chat_members")
          .select("user_id, role")
          .eq("room_id", roomId!);
        
        if (membersData) {
          memberRoles = membersData.reduce((acc, m) => {
            acc[m.user_id] = m.role;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return (data || []).map(msg => ({
        ...msg,
        sender: msg.sender_id ? profiles[msg.sender_id] : undefined,
        sender_role: msg.sender_id ? memberRoles[msg.sender_id] : undefined,
      })) as ChatMessage[];
    },
    enabled: !!roomId,
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`chat-messages-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // Fetch sender profile and role for new message
          const newMessage = payload.new as ChatMessage;
          let sender = undefined;
          let sender_role = undefined;
          
          if (newMessage.sender_id) {
            // Fetch profile
            const { data: profile } = await supabase
              .from("profiles_public")
              .select("full_name, avatar_url")
              .eq("user_id", newMessage.sender_id)
              .maybeSingle();
            
            if (profile) {
              sender = profile;
            }

            // Fetch role
            const { data: memberData } = await supabase
              .from("chat_members")
              .select("role")
              .eq("room_id", roomId)
              .eq("user_id", newMessage.sender_id)
              .maybeSingle();
            
            if (memberData) {
              sender_role = memberData.role;
            }
          }

          queryClient.setQueryData(["chat-messages", roomId], (old: ChatMessage[] | undefined) => {
            if (!old) return [{ ...newMessage, sender, sender_role }];
            // Avoid duplicates
            if (old.some(m => m.id === newMessage.id)) return old;
            return [...old, { ...newMessage, sender, sender_role }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);

  return query;
};

// Send a message
export const useSendMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, message }: { roomId: string; message: string }) => {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          room_id: roomId,
          sender_id: user?.id,
          message_text: message,
          message_type: "user",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", roomId] });
    },
  });
};

// Add a member to a chat room
export const useAddChatMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, userId, role }: { roomId: string; userId: string; role: string }) => {
      const { error } = await supabase.rpc("add_chat_member", {
        p_room_id: roomId,
        p_user_id: userId,
        p_role: role,
      });

      if (error) throw error;
    },
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ["chat-members", roomId] });
    },
  });
};

// Send a system message
export const useSendSystemMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, message }: { roomId: string; message: string }) => {
      const { data, error } = await supabase.rpc("send_system_message", {
        p_room_id: roomId,
        p_message: message,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", roomId] });
    },
  });
};

// Report a message
export const useReportMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId }: { messageId: string; roomId: string }) => {
      const { error } = await supabase
        .from("chat_messages")
        .update({
          is_reported: true,
          reported_by: user?.id,
          reported_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", roomId] });
    },
  });
};

// Update last read timestamp
export const useUpdateLastRead = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase
        .from("chat_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("room_id", roomId)
        .eq("user_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
    },
  });
};

// Get all chat rooms for the current user with unread counts
export const useUserChatRooms = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-chat-rooms", user?.id],
    queryFn: async () => {
      // Get all rooms where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from("chat_members")
        .select(`
          room_id,
          last_read_at,
          role,
          chat_room:chat_rooms!chat_members_room_id_fkey(*)
        `)
        .eq("user_id", user!.id);

      if (memberError) {
        // Fallback query without join
        const { data: memberData, error } = await supabase
          .from("chat_members")
          .select("room_id, last_read_at, role")
          .eq("user_id", user!.id);
        
        if (error) throw error;
        return memberData || [];
      }

      return memberships || [];
    },
    enabled: !!user?.id,
  });
};

// Get total unread message count
export const useUnreadMessageCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-messages", user?.id],
    queryFn: async () => {
      // Get all rooms where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from("chat_members")
        .select("room_id, last_read_at")
        .eq("user_id", user!.id);

      if (memberError) throw memberError;
      if (!memberships || memberships.length === 0) return 0;

      let totalUnread = 0;

      for (const membership of memberships) {
        const { count, error } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", membership.room_id)
          .gt("created_at", membership.last_read_at || "1970-01-01");

        if (!error && count) {
          totalUnread += count;
        }
      }

      return totalUnread;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Initialize chat for a game (create room and add members)
export const useInitializeGameChat = () => {
  const getOrCreateRoom = useGetOrCreateChatRoom();
  const addMember = useAddChatMember();
  const sendSystemMessage = useSendSystemMessage();

  const initializeGameChat = useCallback(async (
    gameId: string, 
    hostId: string, 
    participantIds: string[] = [],
    newParticipantName?: string
  ) => {
    try {
      // Get or create the room
      const roomId = await getOrCreateRoom.mutateAsync({ type: "game", referenceId: gameId });
      
      // Add host as member
      await addMember.mutateAsync({ roomId, userId: hostId, role: "host" });
      
      // Add all participants
      for (const participantId of participantIds) {
        await addMember.mutateAsync({ roomId, userId: participantId, role: "player" });
      }

      // Send system message if new participant joined
      if (newParticipantName) {
        await sendSystemMessage.mutateAsync({ 
          roomId, 
          message: `${newParticipantName} joined the game` 
        });
      }

      return roomId;
    } catch (error) {
      console.error("Error initializing game chat:", error);
      throw error;
    }
  }, [getOrCreateRoom, addMember, sendSystemMessage]);

  return { initializeGameChat, isLoading: getOrCreateRoom.isPending };
};

// Initialize chat for a booking
export const useInitializeBookingChat = () => {
  const getOrCreateRoom = useGetOrCreateChatRoom();
  const addMember = useAddChatMember();
  const sendSystemMessage = useSendSystemMessage();

  const initializeBookingChat = useCallback(async (
    bookingId: string,
    customerId: string,
    ownerId: string,
    venueName?: string
  ) => {
    try {
      // Get or create the room
      const roomId = await getOrCreateRoom.mutateAsync({ type: "booking", referenceId: bookingId });
      
      // Add customer and owner as members
      await addMember.mutateAsync({ roomId, userId: customerId, role: "customer" });
      await addMember.mutateAsync({ roomId, userId: ownerId, role: "owner" });

      // Send system message
      if (venueName) {
        await sendSystemMessage.mutateAsync({ 
          roomId, 
          message: `Booking confirmed at ${venueName}` 
        });
      }

      return roomId;
    } catch (error) {
      console.error("Error initializing booking chat:", error);
      throw error;
    }
  }, [getOrCreateRoom, addMember, sendSystemMessage]);

  return { initializeBookingChat, isLoading: getOrCreateRoom.isPending };
};

// Initialize venue inquiry chat (customer <-> owner)
export const useInitializeVenueChat = () => {
  const getOrCreateRoom = useGetOrCreateChatRoom();
  const addMember = useAddChatMember();

  const initializeVenueChat = useCallback(async (
    venueId: string,
    userId: string,
    ownerId: string,
    _venueName?: string
  ) => {
    try {
      const roomId = await getOrCreateRoom.mutateAsync({ type: "venue", referenceId: venueId });
      await addMember.mutateAsync({ roomId, userId, role: "customer" });
      await addMember.mutateAsync({ roomId, userId: ownerId, role: "owner" });
      return roomId;
    } catch (error) {
      console.error("Error initializing venue chat:", error);
      throw error;
    }
  }, [getOrCreateRoom, addMember]);

  return { initializeVenueChat, isLoading: getOrCreateRoom.isPending };
};

// Block a user in a room
export const useBlockUser = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ roomId, blockedId, reason }: { roomId: string; blockedId: string; reason?: string }) => {
      const { error } = await supabase
        .from("blocked_users")
        .insert({
          blocker_id: user?.id,
          blocked_id: blockedId,
          room_id: roomId,
          reason,
        });

      if (error) throw error;
    },
  });
};
