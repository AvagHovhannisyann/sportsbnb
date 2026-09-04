import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import venueFootball from "@/assets/venue-football.jpg";
import venueBasketball from "@/assets/venue-basketball.jpg";
import venueTennis from "@/assets/venue-tennis.jpg";
import venueSwimming from "@/assets/venue-swimming.jpg";
import venueGeneric from "@/assets/hero-sports.jpg";

export interface Venue {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string;
  zip_code: string | null;
  image_url: string | null;
  sports: string[];
  price_per_hour: number;
  /** ISO 4217 — the listing's settlement currency ("AMD" | "USD"). */
  currency: string;
  is_indoor: boolean;
  amenities: string[];
  is_active: boolean;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  latitude?: number | null;
  longitude?: number | null;
  location_confirmed?: boolean;
  phone?: string | null;
  contact_name?: string | null;
  whatsapp_enabled?: boolean;
  sms_enabled?: boolean;
}

// Fallback imagery for venues with no photo of their own.
//
// These were hot-linked from images.unsplash.com. That meant a third-party
// request for every photoless venue card, a page that stops rendering
// correctly if those URLs rot or Unsplash blocks hotlinking, and an
// inconsistency with the landing page — which already ships bundled versions
// of the same four sports. Serving them from the bundle removes the
// dependency entirely and makes the fallback deterministic.
//
// Sports without a bundled photo share the generic one rather than reaching
// back out to a third party for a more specific image.
const defaultImages: Record<string, string> = {
  Football: venueFootball,
  Basketball: venueBasketball,
  Tennis: venueTennis,
  Swimming: venueSwimming,
  default: venueGeneric,
};

export const getVenueImage = (venue: Venue): string => {
  if (venue.image_url) return venue.image_url;
  const primarySport = venue.sports[0];
  return defaultImages[primarySport] || defaultImages.default;
};

export const useVenues = () => {
  return useQuery({
    queryKey: ["venues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Venue[];
    },
  });
};

export const useOwnerVenues = (ownerId: string | undefined) => {
  return useQuery({
    queryKey: ["owner-venues", ownerId],
    queryFn: async () => {
      if (!ownerId) return [];
      
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Venue[];
    },
    enabled: !!ownerId,
  });
};

export const useVenueById = (venueId: string | undefined) => {
  return useQuery({
    queryKey: ["venue", venueId],
    queryFn: async () => {
      if (!venueId) return null;
      
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", venueId)
        .maybeSingle();

      if (error) throw error;
      return data as Venue | null;
    },
    enabled: !!venueId,
  });
};
