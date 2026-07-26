import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VerifiedField {
  id: string;
  candidate_id: string | null;
  name: string;
  latitude: number;
  longitude: number;
  sport_type: string;
  address: string | null;
  city: string;
  is_public: boolean;
  verification_status: string;
  surface_type: string | null;
  has_lighting: boolean;
  condition_rating: number | null;
  photo_url: string | null;
  description: string | null;
  active_checkins: number;
  last_checkin_at: string | null;
  busyness_score: string | null;
  peak_hours: string | null;
  best_time: string | null;
  distance?: number;
}

export const useVerifiedFields = () => {
  const [fields, setFields] = useState<VerifiedField[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFields = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("verified_fields")
      .select("*")
      .eq("verification_status", "verified")
      .order("condition_rating", { ascending: false });

    if (error) {
      console.error("Error fetching verified fields:", error);
    } else {
      setFields((data as unknown as VerifiedField[]) || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  // Realtime subscription - auto-refresh when new fields are added
  useEffect(() => {
    const channel = supabase
      .channel('verified-fields-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'verified_fields',
        },
        () => {
          // Re-fetch all fields when any change occurs
          fetchFields();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFields]);

  const checkIn = async (fieldId: string, playerCount: number = 1) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to check in");
      return false;
    }

    const { error } = await supabase
      .from("field_checkins")
      .insert({ verified_field_id: fieldId, field_id: fieldId, user_id: user.id, player_count: playerCount } as any);

    if (error) {
      toast.error("Failed to check in");
      return false;
    }

    // Not "others can see this field is active".
    //
    // The check-in row lands in `field_checkins`, and the counter the UI reads
    // — `active_checkins` on public_fields / verified_fields — has no writer:
    // no trigger on the table, no database function referencing it (checked
    // against pg_proc and pg_trigger on the live project, not by grepping),
    // no edge function, and the client only ever inserts. So nobody sees
    // anything, and the old copy promised a visible effect that does not
    // happen. See docs/handover.md for the aggregate-RPC fix.
    toast.success("Checked in.");
    await fetchFields();
    return true;
  };

  return { fields, isLoading, fetchFields, checkIn };
};
