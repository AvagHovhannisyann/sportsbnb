import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type AppRole = "admin" | "moderator" | "user";

interface _UnusedUserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

interface AdminStats {
  totalUsers: number;
  totalVenues: number;
  totalBookings: number;
  totalGames: number;
  totalRevenue: number;
  pendingVenues: number;
}

export const useUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async (): Promise<AppRole | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return (data?.role as AppRole) || null;
    },
    enabled: !!user,
  });
};

// Derived from useUserRole — shares its cache entry, single return shape.
export const useIsAdmin = () => {
  const roleQuery = useUserRole();
  return { ...roleQuery, data: roleQuery.data === "admin" || roleQuery.data === "moderator" };
};

export const useAdminStats = () => {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async (): Promise<AdminStats> => {
      // Fetch counts in parallel
      const [usersRes, venuesRes, bookingsRes, gamesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("venues").select("id, is_active", { count: "exact" }),
        supabase.from("bookings").select("id, total_price"),
        supabase.from("games").select("id", { count: "exact", head: true }),
      ]);

      const totalRevenue = bookingsRes.data?.reduce((sum, b) => sum + Number(b.total_price), 0) || 0;
      const pendingVenues = venuesRes.data?.filter(v => !v.is_active).length || 0;

      return {
        totalUsers: usersRes.count || 0,
        totalVenues: venuesRes.count || 0,
        totalBookings: bookingsRes.data?.length || 0,
        totalGames: gamesRes.count || 0,
        totalRevenue,
        pendingVenues,
      };
    },
    enabled: isAdmin === true,
  });
};

export const useAllUsers = () => {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          id,
          user_id,
          user_type,
          full_name,
          username,
          email,
          phone,
          city,
          avatar_url,
          onboarding_completed,
          created_at,
          updated_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get roles for all users
      const { data: roles } = await supabase
        .from("user_roles")
        .select("*");

      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      return profiles.map(p => ({
        ...p,
        role: rolesMap.get(p.user_id) || "user",
      }));
    },
    enabled: isAdmin === true,
  });
};

export const useAllVenues = () => {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["admin-venues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select(`
          *,
          owner:profiles!venues_owner_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });
};

export const useAllBookings = () => {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });
};

export const useAllGames = () => {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["admin-games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First check if user already has a role
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId);
        
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User role updated");
    },
    onError: (error) => {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role");
    },
  });
};

export const useApproveVenue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ venueId, approved }: { venueId: string; approved: boolean }) => {
      const { error } = await supabase
        .from("venues")
        .update({ is_active: approved })
        .eq("id", venueId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-venues"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(variables.approved ? "Venue approved" : "Venue disabled");
    },
    onError: (error) => {
      console.error("Error updating venue:", error);
      toast.error("Failed to update venue");
    },
  });
};

export const useDeleteGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gameId: string) => {
      const { error } = await supabase
        .from("games")
        .delete()
        .eq("id", gameId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-games"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Game deleted");
    },
    onError: (error) => {
      console.error("Error deleting game:", error);
      toast.error("Failed to delete game");
    },
  });
};

export const useDeleteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review deleted");
    },
    onError: (error) => {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    },
  });
};
