import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PublicField {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string;
  latitude: number;
  longitude: number;
  sports: string[];
  surface_type: string | null;
  has_lighting: boolean;
  has_goals: boolean;
  has_nets: boolean;
  has_markings: boolean;
  condition_rating: number | null;
  photo_url: string | null;
  active_checkins: number;
  last_checkin_at: string | null;
  busyness_score: string | null;
  peak_hours: string | null;
  best_time: string | null;
}

export const usePublicFields = () => {
  const [fields, setFields] = useState<PublicField[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFields = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("public_fields")
      .select("*")
      .eq("is_approved", true)
      .order("condition_rating", { ascending: false });

    if (error) {
      console.error("Error fetching public fields:", error);
    } else {
      setFields((data as unknown as PublicField[]) || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const checkIn = async (fieldId: string, playerCount: number = 1) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to check in");
      return false;
    }

    const { error } = await supabase
      .from("field_checkins")
      .insert({ field_id: fieldId, user_id: user.id, player_count: playerCount } as any);

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

  const submitField = async (field: {
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
    sports: string[];
    surface_type?: string;
    has_lighting?: boolean;
    description?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to submit a field");
      return false;
    }

    const { error } = await supabase
      .from("field_submissions")
      .insert({ ...field, submitted_by: user.id } as any);

    if (error) {
      toast.error("Failed to submit field");
      return false;
    }

    toast.success("Field submitted for review! We'll add it once approved.");
    return true;
  };

  return { fields, isLoading, fetchFields, checkIn, submitField };
};
