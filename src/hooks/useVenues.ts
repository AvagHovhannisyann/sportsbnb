import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

// Default images for venues without custom images
const defaultImages: Record<string, string> = {
  Football: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop",
  Basketball: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop",
  Tennis: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
  Swimming: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800&h=600&fit=crop",
  Volleyball: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=800&h=600&fit=crop",
  Badminton: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800&h=600&fit=crop",
  Rugby: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&h=600&fit=crop",
  Gym: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop",
  default: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=600&fit=crop",
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
