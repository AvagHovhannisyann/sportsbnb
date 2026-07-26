import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Team {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  team_size: number;
  logo_url: string | null;
  visibility: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

export interface TeamInvite {
  id: string;
  team_id: string;
  invited_by: string;
  invited_user_id: string | null;
  invited_email: string | null;
  status: string;
  created_at: string;
  team?: Team;
}

export const useTeams = (filters?: { sport?: string; search?: string }) => {
  return useQuery({
    queryKey: ["teams", filters],
    queryFn: async () => {
      let query = supabase
        .from("teams")
        .select("*")
        .eq("visibility", "public")
        .order("created_at", { ascending: false });

      if (filters?.sport) query = query.eq("sport", filters.sport);
      if (filters?.search) query = query.ilike("name", `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;

      // Get member counts
      if (data && data.length > 0) {
        const teamIds = data.map(t => t.id);
        const { data: members } = await supabase
          .from("team_members")
          .select("team_id")
          .in("team_id", teamIds);

        const countMap = new Map<string, number>();
        members?.forEach(m => {
          countMap.set(m.team_id, (countMap.get(m.team_id) || 0) + 1);
        });

        return data.map(t => ({ ...t, member_count: countMap.get(t.id) || 0 })) as Team[];
      }

      return (data || []) as Team[];
    },
  });
};

export const useTeamById = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      if (!teamId) return null;
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .maybeSingle();
      if (error) throw error;
      return data as Team | null;
    },
    enabled: !!teamId,
  });
};

export const useTeamMembers = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data: members, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", teamId)
        .order("joined_at", { ascending: true });
      if (error) throw error;

      const userIds = members?.map(m => m.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, full_name, avatar_url, username")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (members || []).map(m => ({
        ...m,
        profile: profileMap.get(m.user_id) || { full_name: null, avatar_url: null, username: null },
      })) as TeamMember[];
    },
    enabled: !!teamId,
  });
};

export const useUserTeams = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-teams", user?.id],
    queryFn: async () => {
      if (!user) return { owned: [], member: [] };

      // Errors are rethrown rather than coalesced away. Swallowing them here
      // made the query *succeed* with an empty result, so the Teams page could
      // not tell "you have no teams" from "we could not load your teams" — it
      // rendered "No teams yet. Create your first team." to someone who may
      // already own several, inviting a duplicate.
      const { data: owned, error: ownedError } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (ownedError) throw ownedError;

      // Teams user is a member of (not owner)
      const { data: memberships, error: membershipsError } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id);
      if (membershipsError) throw membershipsError;

      const memberTeamIds = memberships?.map(m => m.team_id).filter(
        id => !(owned || []).some(t => t.id === id)
      ) || [];

      let memberTeams: Team[] = [];
      if (memberTeamIds.length > 0) {
        const { data, error } = await supabase
          .from("teams")
          .select("*")
          .in("id", memberTeamIds);
        if (error) throw error;
        memberTeams = (data || []) as Team[];
      }

      // Member counts, the same way useTeams does them.
      //
      // Without this, every card on the "My Teams" tab rendered
      // "—/11 players" — TeamCard falls back to an em-dash when member_count
      // is undefined, and this hook never set it. Browse Teams showed real
      // numbers, so your own teams were the only ones missing them.
      const all = [...(owned || []), ...memberTeams] as Team[];
      if (all.length === 0) return { owned: [], member: [] };

      const { data: members } = await supabase
        .from("team_members")
        .select("team_id")
        .in("team_id", all.map((t) => t.id));

      const countMap = new Map<string, number>();
      members?.forEach((m) => {
        countMap.set(m.team_id, (countMap.get(m.team_id) || 0) + 1);
      });
      const withCounts = (teams: Team[]) =>
        teams.map((t) => ({ ...t, member_count: countMap.get(t.id) || 0 }));

      return {
        owned: withCounts((owned || []) as Team[]),
        member: withCounts(memberTeams),
      };
    },
    enabled: !!user?.id,
  });
};

export const useUserTeamInvites = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["team-invites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("team_invites")
        .select("*")
        .eq("invited_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch team info
      const teamIds = [...new Set(data?.map(i => i.team_id) || [])];
      if (teamIds.length === 0) return [];

      const { data: teams } = await supabase
        .from("teams")
        .select("*")
        .in("id", teamIds);

      const teamMap = new Map(teams?.map(t => [t.id, t]) || []);

      return (data || []).map(i => ({ ...i, team: teamMap.get(i.team_id) })) as TeamInvite[];
    },
    enabled: !!user?.id,
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (teamData: {
      name: string;
      description?: string;
      sport: string;
      team_size: number;
      logo_url?: string;
      visibility: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Create team
      const { data: team, error } = await supabase
        .from("teams")
        .insert({ ...teamData, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;

      // Add creator as captain
      await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: user.id,
        role: "captain",
      });

      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, ...updates }: { teamId: string } & Partial<Team>) => {
      const { data, error } = await supabase
        .from("teams")
        .update(updates)
        .eq("id", teamId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["team", data.id] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
    },
  });
};

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
    },
  });
};

export const useInviteToTeam = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, userId, email }: { teamId: string; userId?: string; email?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("team_invites")
        .insert({
          team_id: teamId,
          invited_by: user.id,
          invited_user_id: userId || null,
          invited_email: email || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Send notification if inviting by user ID
      if (userId) {
        const { data: team } = await supabase.from("teams").select("name").eq("id", teamId).single();
        await supabase.rpc("notify_user", {
          p_user_id: userId,
          p_type: "team",
          p_title: "Team Invite! 🏆",
          p_message: `You've been invited to join "${team?.name}".`,
          p_link: `/teams`,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invites"] });
    },
  });
};

export const useRespondToInvite = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ inviteId, teamId, accept }: { inviteId: string; teamId: string; accept: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("team_invites")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", inviteId);
      if (updateError) throw updateError;

      if (accept) {
        const { error: joinError } = await supabase.from("team_members").insert({
          team_id: teamId,
          user_id: user.id,
          role: "member",
        });
        if (joinError) throw joinError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invites"] });
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
};

export const useJoinTeamByCode = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("invite_code", inviteCode)
        .maybeSingle();

      if (teamError) throw teamError;
      if (!team) throw new Error("Invalid invite code");

      if (team.visibility === "private") {
        // Create a pending invite/request
        const { error } = await supabase.from("team_invites").insert({
          team_id: team.id,
          invited_by: user.id,
          invited_user_id: user.id,
          status: "pending",
        });
        if (error) throw error;
        return { team, joined: false, message: "Join request sent to captain" };
      }

      // Public team - join directly
      const { error } = await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: user.id,
        role: "member",
      });
      if (error) throw error;
      return { team, joined: true, message: "Joined team!" };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase
        .from("team_members")
        .update({ role })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
};

export const useRemoveTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
    },
  });
};

export const useLeaveTeam = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
    },
  });
};
