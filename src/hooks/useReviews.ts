import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Review {
  id: string;
  venue_id: string;
  user_id: string;
  booking_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useVenueReviews = (venueId: string | undefined) => {
  return useQuery({
    queryKey: ["venue-reviews", venueId],
    queryFn: async () => {
      if (!venueId) return [];

      // First get reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .eq("venue_id", venueId)
        .order("created_at", { ascending: false });

      if (reviewsError) throw reviewsError;

      // Then get profile info for each review, from the public view — the
      // `profiles` table is own-row-only, so this returned nothing and every
      // review on every venue page was attributed to "Anonymous".
      const userIds = [...new Set(reviews.map(r => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles_public")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      return reviews.map(review => ({
        ...review,
        profiles: profileMap.get(review.user_id) || { full_name: null, avatar_url: null }
      })) as Review[];
    },
    enabled: !!venueId,
  });
};

export const useUserReviewForVenue = (venueId: string | undefined, userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-venue-review", venueId, userId],
    queryFn: async () => {
      if (!venueId || !userId) return null;

      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("venue_id", venueId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data as Review | null;
    },
    enabled: !!venueId && !!userId,
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      venueId,
      userId,
      bookingId,
      rating,
      comment,
    }: {
      venueId: string;
      userId: string;
      bookingId?: string;
      rating: number;
      comment?: string;
    }) => {
      const { data, error } = await supabase
        .from("reviews")
        .insert({
          venue_id: venueId,
          user_id: userId,
          booking_id: bookingId || null,
          rating,
          comment: comment || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["venue-reviews", variables.venueId] });
      queryClient.invalidateQueries({ queryKey: ["user-venue-review", variables.venueId] });
      queryClient.invalidateQueries({ queryKey: ["venue", variables.venueId] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
    },
  });
};

export const useUpdateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      rating,
      comment,
    }: {
      reviewId: string;
      rating: number;
      comment?: string;
      venueId: string;
    }) => {
      const { data, error } = await supabase
        .from("reviews")
        .update({
          rating,
          comment: comment || null,
        })
        .eq("id", reviewId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["venue-reviews", variables.venueId] });
      queryClient.invalidateQueries({ queryKey: ["user-venue-review", variables.venueId] });
      queryClient.invalidateQueries({ queryKey: ["venue", variables.venueId] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
    },
  });
};

export const useDeleteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId }: { reviewId: string; venueId: string }) => {
      const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["venue-reviews", variables.venueId] });
      queryClient.invalidateQueries({ queryKey: ["user-venue-review", variables.venueId] });
      queryClient.invalidateQueries({ queryKey: ["venue", variables.venueId] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
    },
  });
};
