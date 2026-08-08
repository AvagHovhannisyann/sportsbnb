import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { User, Bell, Shield, LogOut, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import AvatarUploader from "@/features/profile/AvatarUploader";
import ProfileInfoTab from "@/features/profile/ProfileInfoTab";
import NotificationsTab from "@/features/profile/NotificationsTab";
import SecurityTab from "@/features/profile/SecurityTab";
import type { ProfileFormData } from "@/features/profile/hooks/useProfileSettings";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Form state (lifted here so the header reflects edits live)
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    city: "",
    dateOfBirth: "",
    gender: "",
    preferredSports: [],
    skillLevel: "",
    // Owner fields
    businessName: "",
    venueName: "",
    venueAddress: "",
    venueDescription: "",
    sportsOffered: [],
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || "",
        username: profile.username || "",
        email: user?.email || "",
        phone: profile.phone || "",
        city: profile.city || "",
        dateOfBirth: profile.date_of_birth || "",
        gender: profile.gender || "",
        preferredSports: profile.preferred_sports || [],
        skillLevel: profile.skill_level || "",
        businessName: profile.business_name || "",
        venueName: profile.venue_name || "",
        venueAddress: profile.venue_address || "",
        venueDescription: profile.venue_description || "",
        sportsOffered: profile.sports_offered || [],
      });
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getUserInitials = () => {
    const name = formData.fullName || formData.username || user?.email || "";
    if (name.includes("@")) {
      return name.charAt(0).toUpperCase();
    }
    return name.split(" ").map((n: string) => n.charAt(0)).join("").toUpperCase().slice(0, 2);
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container py-16 text-center" role="status" aria-label="Loading your profile">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
        </div>
      </Layout>
    );
  }

  const isOwner = profile?.user_type === "owner";

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="container py-6 sm:py-8 lg:py-10">
          {/* Profile Header */}
          <div className="mb-7 flex max-w-5xl flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-center sm:gap-6 sm:pb-8">
            <AvatarUploader
              previewUrl={avatarPreview}
              initials={getUserInitials()}
              onFileSelected={(file, previewDataUrl) => {
                setAvatarFile(file);
                setAvatarPreview(previewDataUrl);
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="eyebrow mb-2">Account</p>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="page-title min-w-0 break-words">
                  {formData.fullName || formData.username || "Your Profile"}
                </h1>
                {isOwner && (
                  <Badge variant="secondary">Venue Owner</Badge>
                )}
              </div>
              <p className="mt-2 break-all text-sm text-muted-foreground sm:text-base">{user?.email}</p>
              {formData.city && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{formData.city}</span>
                </div>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl space-y-6">
            <TabsList className="flex w-full sm:w-auto">
              <TabsTrigger value="profile" className="gap-2">
                <User className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <ProfileInfoTab
                isOwner={isOwner}
                formData={formData}
                setFormData={setFormData}
                avatarFile={avatarFile}
                onProfileSaved={() => setAvatarFile(null)}
              />
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationsTab />
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <SecurityTab />
            </TabsContent>
          </Tabs>

          {/* Sign Out */}
          <div className="mt-8 max-w-5xl border-t border-border pt-6">
            <Button variant="ghost" onClick={handleSignOut} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
