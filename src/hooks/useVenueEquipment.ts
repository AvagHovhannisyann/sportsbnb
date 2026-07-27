import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VenueEquipment {
  id: string;
  venue_id: string;
  name: string;
  description: string | null;
  price: number;
  equipment_type: 'item' | 'package';
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export const useVenueEquipment = (venueId: string | undefined) => {
  return useQuery({
    queryKey: ['venue-equipment', venueId],
    queryFn: async () => {
      if (!venueId) return [];
      
      const { data, error } = await supabase
        .from('venue_equipment')
        .select('*')
        .eq('venue_id', venueId)
        .order('equipment_type', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as VenueEquipment[];
    },
    enabled: !!venueId,
  });
};

export const useAddEquipment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (equipment: Omit<VenueEquipment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('venue_equipment')
        .insert(equipment)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['venue-equipment', variables.venue_id] });
      toast.success('Equipment added successfully');
    },
    onError: (error) => {
      console.error('Error adding equipment:', error);
      toast.error('Failed to add equipment');
    },
  });
};

export const useUpdateEquipment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; venueId: string } & Partial<VenueEquipment>) => {
      const { data, error } = await supabase
        .from('venue_equipment')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['venue-equipment', variables.venueId] });
      toast.success('Equipment updated successfully');
    },
    onError: (error) => {
      console.error('Error updating equipment:', error);
      toast.error('Failed to update equipment');
    },
  });
};

export const useDeleteEquipment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id }: { id: string; venueId: string }) => {
      const { error } = await supabase
        .from('venue_equipment')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['venue-equipment', variables.venueId] });
      toast.success('Equipment deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting equipment:', error);
      toast.error('Failed to delete equipment');
    },
  });
};

// Hook to fetch platform-wide cancellation policy
export const usePlatformCancellationPolicy = () => {
  return useQuery({
    queryKey: ['platform-cancellation-policy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_policies')
        .select('*')
        .eq('policy_type', 'cancellation')
        .single();
      
      if (error) throw error;
      return data?.policy_data as {
        tiers: Array<{
          hours_before: number;
          fee_percentage: number;
          description: string;
        }>;
        max_fee_percentage: number;
      };
    },
  });
};
