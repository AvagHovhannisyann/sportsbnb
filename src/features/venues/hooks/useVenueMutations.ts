import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizePhoneE164 } from "@/lib/phone";
import { MIN_PHOTOS, type VenueFormValues } from "../venueSchema";
import type { TablesUpdate } from "@/integrations/supabase/types";

export function useCreateVenue() {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const uploadImages = async (files: File[], userId: string): Promise<string[]> => {
    if (files.length === 0) return [];

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('venue-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('venue-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      return uploadedUrls;
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload images");
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const createVenue = async (values: VenueFormValues, userId: string): Promise<boolean> => {
    setIsSubmitting(true);

    try {
      const imageUrls = await uploadImages(values.imageFiles, userId);
      if (imageUrls.length < MIN_PHOTOS) {
        toast.error("Failed to upload required images. Please try again.");
        setIsSubmitting(false);
        return false;
      }

      const { error } = await supabase
        .from('venues')
        .insert({
          owner_id: userId,
          name: values.name.trim(),
          description: values.description.trim(),
          address: values.address.trim(),
          city: values.city.trim(),
          zip_code: values.zipCode.trim() || null,
          sports: values.sports,
          amenities: values.amenities,
          price_per_hour: parseFloat(values.pricePerHour) || 30,
          is_indoor: values.isIndoor,
          is_active: false, // Always start as inactive - requires admin approval
          image_url: imageUrls[0],
          latitude: values.latitude,
          longitude: values.longitude,
          location_confirmed: values.locationConfirmed,
          phone: normalizePhoneE164(values.phone),
          contact_name: values.contactName.trim() || null,
          whatsapp_enabled: values.whatsappEnabled,
          sms_enabled: values.smsEnabled,
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["owner-venues"] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });

      toast.success("Venue submitted for review! It will become visible to players once approved by our team.");
      return true;
    } catch (error) {
      console.error("Error adding venue:", error);
      toast.error("Failed to add venue. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { createVenue, isSubmitting, uploadingImages };
}

export function useUpdateVenue() {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('venue-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('venue-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const updateVenue = async (
    values: VenueFormValues,
    params: { venueId: string; userId: string },
  ): Promise<boolean> => {
    setIsSubmitting(true);

    try {
      let imageUrl: string | null | undefined = undefined;
      const imageFile = values.imageFiles[0];

      if (imageFile) {
        imageUrl = await uploadImage(imageFile, params.userId);
      } else if (values.imageRemoved) {
        // Image was removed
        imageUrl = null;
      }

      const updateData: TablesUpdate<'venues'> = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        address: values.address.trim() || null,
        city: values.city.trim(),
        sports: values.sports,
        amenities: values.amenities,
        price_per_hour: parseFloat(values.pricePerHour) || 30,
        is_indoor: values.isIndoor,
        is_active: values.isActive,
        latitude: values.latitude,
        longitude: values.longitude,
        location_confirmed: values.locationConfirmed,
        phone: normalizePhoneE164(values.phone) || null,
        contact_name: values.contactName.trim() || null,
        whatsapp_enabled: values.whatsappEnabled,
        sms_enabled: values.smsEnabled,
      };

      if (imageUrl !== undefined) {
        updateData.image_url = imageUrl;
      }

      const { error } = await supabase
        .from('venues')
        .update(updateData)
        .eq('id', params.venueId)
        .eq('owner_id', params.userId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["owner-venues"] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      queryClient.invalidateQueries({ queryKey: ["venue", params.venueId] });

      toast.success("Venue updated successfully!");
      return true;
    } catch (error) {
      console.error("Error updating venue:", error);
      toast.error("Failed to update venue. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { updateVenue, isSubmitting, uploadingImage };
}

export function useDeleteVenue() {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteVenue = async (venueId: string, userId: string): Promise<boolean> => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId)
        .eq('owner_id', userId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["owner-venues"] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });

      toast.success("Venue deleted successfully!");
      return true;
    } catch (error) {
      console.error("Error deleting venue:", error);
      toast.error("Failed to delete venue. Please try again.");
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteVenue, isDeleting };
}
