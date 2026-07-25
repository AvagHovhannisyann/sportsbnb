import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Game {
  id: string;
  host_id: string;
  venue_id: string | null;
  title: string;
  description: string | null;
  sport: string;
  skill_level: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  game_date: string;
  game_time: string;
  duration_hours: number;
  max_players: number;
  price_per_player: number;
  is_public: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  host?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  participant_count?: number;
}

export interface GameParticipant {
  id: string;
  game_id: string;
  user_id: string;
  status: string;
  joined_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Helper function to calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const useGames = (filters?: { 
  sport?: string; 
  level?: string; 
  search?: string;
  userLocation?: { lat: number; lng: number } | null;
}) => {
  return useQuery({
    queryKey: ["games", filters],
    queryFn: async () => {
      // Get games
      let query = supabase
        .from("games")
        .select("*")
        .eq("status", "open")
        .eq("is_public", true)
        .gte("game_date", new Date().toISOString().split("T")[0])
        .order("game_date", { ascending: true });

      if (filters?.sport) {
        query = query.eq("sport", filters.sport);
      }
      if (filters?.level) {
        query = query.eq("skill_level", filters.level);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
      }

      const { data: games, error: gamesError } = await query;
      if (gamesError) throw gamesError;

      if (!games || games.length === 0) return [];

      // Get host profiles
      const hostIds = [...new Set(games.map(g => g.host_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", hostIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Get participant counts
      const gameIds = games.map(g => g.id);
      const { data: participants } = await supabase
        .from("game_participants")
        .select("game_id")
        .in("game_id", gameIds)
        .eq("status", "confirmed");

      const countMap = new Map<string, number>();
      participants?.forEach(p => {
        countMap.set(p.game_id, (countMap.get(p.game_id) || 0) + 1);
      });

      let enrichedGames = games.map(game => ({
        ...game,
        host: profileMap.get(game.host_id) || { full_name: null, avatar_url: null },
        participant_count: countMap.get(game.id) || 0,
        distance: filters?.userLocation && game.latitude && game.longitude
          ? calculateDistance(
              filters.userLocation.lat,
              filters.userLocation.lng,
              game.latitude,
              game.longitude
            )
          : null,
      })) as (Game & { distance: number | null })[];

      // Sort by distance if user location is provided
      if (filters?.userLocation) {
        enrichedGames = enrichedGames.sort((a, b) => {
          // Games with coordinates come first
          if (a.distance === null && b.distance === null) return 0;
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }

      return enrichedGames;
    },
  });
};

export const useGameById = (gameId: string | undefined) => {
  return useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      if (!gameId) return null;

      const { data: game, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .maybeSingle();

      if (error) throw error;
      if (!game) return null;

      // Get host profile
      const { data: hostProfile } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("user_id", game.host_id)
        .maybeSingle();

      // Get all participants (both confirmed and pending)
      const { data: allParticipants } = await supabase
        .from("game_participants")
        .select("*")
        .eq("game_id", gameId);

      const confirmedParticipants = allParticipants?.filter(p => p.status === "confirmed") || [];
      const pendingParticipants = allParticipants?.filter(p => p.status === "pending") || [];
      
      const allUserIds = allParticipants?.map(p => p.user_id) || [];
      let participantProfiles: Map<string, { full_name: string | null; avatar_url: string | null }> = new Map();
      
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", allUserIds);
        
        participantProfiles = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      return {
        ...game,
        host: hostProfile || { full_name: null, avatar_url: null },
        participant_count: confirmedParticipants.length,
        participants: confirmedParticipants.map(p => ({
          ...p,
          profile: participantProfiles.get(p.user_id) || { full_name: null, avatar_url: null },
        })),
        pending_participants: pendingParticipants.map(p => ({
          ...p,
          profile: participantProfiles.get(p.user_id) || { full_name: null, avatar_url: null },
        })),
      } as Game & { participants: GameParticipant[]; pending_participants: GameParticipant[] };
    },
    enabled: !!gameId,
  });
};

export const useUserGames = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-games", userId],
    queryFn: async () => {
      if (!userId) return { hosted: [], joined: [] };

      // Rethrow rather than coalesce: dropping the error made this query
      // succeed with an empty result, so the dashboard could not tell "no
      // games" from "could not load games" and told players their schedule
      // was clear when it was simply unknown.
      const { data: hostedGames, error: hostedError } = await supabase
        .from("games")
        .select("*")
        .eq("host_id", userId)
        .order("game_date", { ascending: true });
      if (hostedError) throw hostedError;

      // Games user has joined
      const { data: participations, error: participationsError } = await supabase
        .from("game_participants")
        .select("game_id")
        .eq("user_id", userId)
        .eq("status", "confirmed");
      if (participationsError) throw participationsError;

      const joinedGameIds = participations?.map(p => p.game_id) || [];
      let joinedGames: Game[] = [];

      if (joinedGameIds.length > 0) {
        const { data, error } = await supabase
          .from("games")
          .select("*")
          .in("id", joinedGameIds)
          .neq("host_id", userId)
          .order("game_date", { ascending: true });
        if (error) throw error;
        joinedGames = data || [];
      }

      return {
        hosted: hostedGames || [],
        joined: joinedGames,
      };
    },
    enabled: !!userId,
  });
};

export const useCreateGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gameData: {
      host_id: string;
      title: string;
      description?: string;
      sport: string;
      skill_level: string;
      location: string;
      venue_id?: string;
      latitude?: number;
      longitude?: number;
      game_date: string;
      game_time: string;
      duration_hours: number;
      max_players: number;
      price_per_player?: number;
      play_mode?: "individual" | "team";
      team_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("games")
        .insert({
          ...gameData,
          is_public: true,
          status: "open",
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["user-games"] });
    },
  });
};

export const useRequestToJoinGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, userId }: { gameId: string; userId: string }) => {
      const { data, error } = await supabase
        .from("game_participants")
        .insert({
          game_id: gameId,
          user_id: userId,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      
      // Notify the host that someone wants to join their game
      const { data: game } = await supabase
        .from("games")
        .select("host_id, title")
        .eq("id", gameId)
        .single();
      
      const { data: requester } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .single();
      
      if (game && game.host_id !== userId) {
        await supabase.rpc("notify_user", {
          p_user_id: game.host_id,
          p_type: "game",
          p_title: "New Join Request! 🙋",
          p_message: `${requester?.full_name || "Someone"} wants to join your game "${game.title}". Review their request.`,
          p_link: `/game/${gameId}`,
        });
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["game", variables.gameId] });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["user-games"] });
      queryClient.invalidateQueries({ queryKey: ["pending-requests"] });
    },
  });
};

// Legacy hook for direct joining (used after payment confirmation)
export const useJoinGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, userId }: { gameId: string; userId: string }) => {
      const { data, error } = await supabase
        .from("game_participants")
        .insert({
          game_id: gameId,
          user_id: userId,
          status: "confirmed",
        })
        .select()
        .single();

      if (error) throw error;
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["game", variables.gameId] });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["user-games"] });
    },
  });
};

export const useApproveParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ participantId, gameId, userId }: { participantId: string; gameId: string; userId: string }) => {
      const { error } = await supabase
        .from("game_participants")
        .update({ status: "confirmed" })
        .eq("id", participantId);

      if (error) throw error;
      
      // Notify the user that they've been approved
      const { data: game } = await supabase
        .from("games")
        .select("title")
        .eq("id", gameId)
        .single();
      
      await supabase.rpc("notify_user", {
        p_user_id: userId,
        p_type: "game",
        p_title: "Request Approved! 🎉",
        p_message: `Your request to join "${game?.title}" has been approved. See you there!`,
        p_link: `/game/${gameId}`,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["game", variables.gameId] });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["pending-requests"] });
    },
  });
};

export const useRejectParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ participantId, gameId, userId }: { participantId: string; gameId: string; userId: string }) => {
      const { error } = await supabase
        .from("game_participants")
        .delete()
        .eq("id", participantId);

      if (error) throw error;
      
      // Notify the user that their request was declined
      const { data: game } = await supabase
        .from("games")
        .select("title")
        .eq("id", gameId)
        .single();
      
      await supabase.rpc("notify_user", {
        p_user_id: userId,
        p_type: "game",
        p_title: "Request Declined",
        p_message: `Your request to join "${game?.title}" was not approved.`,
        p_link: `/games`,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["game", variables.gameId] });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["pending-requests"] });
    },
  });
};

export const useLeaveGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, userId }: { gameId: string; userId: string }) => {
      const { error } = await supabase
        .from("game_participants")
        .delete()
        .eq("game_id", gameId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["game", variables.gameId] });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["user-games"] });
    },
  });
};

export const useCancelGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gameId: string) => {
      // Get game info and participants before cancelling
      const { data: game } = await supabase
        .from("games")
        .select("title")
        .eq("id", gameId)
        .single();
      
      const { data: participants } = await supabase
        .from("game_participants")
        .select("user_id")
        .eq("game_id", gameId)
        .eq("status", "confirmed");
      
      const { error } = await supabase
        .from("games")
        .update({ status: "cancelled" })
        .eq("id", gameId);

      if (error) throw error;
      
      // Notify all participants that the game was cancelled
      if (participants && participants.length > 0 && game) {
        await Promise.all(
          participants.map((p) =>
            supabase.rpc("notify_user", {
              p_user_id: p.user_id,
              p_type: "game",
              p_title: "Game Cancelled 😔",
              p_message: `The game "${game.title}" has been cancelled by the host.`,
              p_link: `/games`,
            })
          )
        );
      }
    },
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["user-games"] });
    },
  });
};
