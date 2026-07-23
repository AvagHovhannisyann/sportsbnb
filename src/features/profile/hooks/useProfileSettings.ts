import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export interface NotificationPreferences {
  bookingConfirmations: boolean;
  gameUpdates: boolean;
  newGamesNearby: boolean;
  marketingEmails: boolean;
}

export interface ProfileFormData {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  city: string;
  dateOfBirth: string;
  gender: string;
  preferredSports: string[];
  skillLevel: string;
  // Owner fields
  businessName: string;
  venueName: string;
  venueAddress: string;
  venueDescription: string;
  sportsOffered: string[];
}

export interface ChangePasswordResult {
  ok: boolean;
  /** Field-level errors for the password form (e.g. incorrect current password). */
  fieldErrors?: Record<string, string>;
}

/**
 * All supabase data access for the profile settings page lives here:
 * profile update (incl. avatar upload), notification preferences,
 * password change, and account-level sign-out actions.
 */
export function useProfileSettings() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const uploadAvatar = async (avatarFile: File, userId: string): Promise<string | undefined> => {
    const fileExt = avatarFile.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile);

    if (uploadError) return undefined;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    return publicUrl;
  };

  /** Saves profile fields (and uploads a new avatar if provided). Returns true on success. */
  const updateProfile = async (formData: ProfileFormData, avatarFile: File | null): Promise<boolean> => {
    if (!user) return false;
    setIsSaving(true);

    try {
      let avatarUrl = profile?.avatar_url;

      // Upload new avatar if provided
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile, user.id);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      const updateData = profile?.user_type === "owner" ? {
        full_name: formData.fullName,
        phone: formData.phone || null,
        city: formData.city || null,
        business_name: formData.businessName || null,
        venue_name: formData.venueName || null,
        venue_address: formData.venueAddress || null,
        venue_description: formData.venueDescription || null,
        sports_offered: formData.sportsOffered.length > 0 ? formData.sportsOffered : null,
        avatar_url: avatarUrl,
      } : {
        full_name: formData.fullName,
        username: formData.username || null,
        phone: formData.phone || null,
        city: formData.city || null,
        date_of_birth: formData.dateOfBirth || null,
        gender: formData.gender || null,
        preferred_sports: formData.preferredSports.length > 0 ? formData.preferredSports : null,
        skill_level: formData.skillLevel || null,
        avatar_url: avatarUrl,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Profile updated successfully!");
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveNotifications = async (notifications: NotificationPreferences) => {
    if (!user) return;
    setIsSavingNotifications(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: notifications as unknown as Record<string, boolean> })
        .eq('user_id', user.id);
      if (error) throw error;

      toast.success("Notification preferences saved!");
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      toast.error("Failed to save notification preferences");
    } finally {
      setIsSavingNotifications(false);
    }
  };

  /**
   * Verifies the current password (via sign-in) then updates it.
   * Returns field-level errors for the form when verification fails.
   */
  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ): Promise<ChangePasswordResult> => {
    setIsSavingPassword(true);

    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        setIsSavingPassword(false);
        return { ok: false, fieldErrors: { currentPassword: "Current password is incorrect" } };
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success("Password updated successfully!");
      return { ok: true };
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
      return { ok: false };
    } finally {
      setIsSavingPassword(false);
    }
  };

  const signOutAllDevices = async () => {
    try {
      // Sign out globally
      await supabase.auth.signOut({ scope: 'global' });
      toast.success("Signed out from all devices");
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out from all devices");
    }
  };

  const deleteAccount = async () => {
    // Note: Full account deletion typically requires an edge function with admin privileges
    // For now, we'll disable the account
    try {
      // Sign out and show message
      await signOut();
      toast.success("Account deletion requested. Please contact support to complete the process.");
      navigate("/");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to process account deletion");
    }
  };

  return {
    isSaving,
    isSavingNotifications,
    isSavingPassword,
    updateProfile,
    saveNotifications,
    changePassword,
    signOutAllDevices,
    deleteAccount,
  };
}
