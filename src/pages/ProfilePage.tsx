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
        <div className="container py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  const isOwner = profile?.user_type === "owner";

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8">
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
            <AvatarUploader
              previewUrl={avatarPreview}
              initials={getUserInitials()}
              onFileSelected={(file, previewDataUrl) => {
                setAvatarFile(file);
                setAvatarPreview(previewDataUrl);
              }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {formData.fullName || formData.username || "Your Profile"}
                </h1>
                {isOwner && (
                  <Badge variant="secondary">Venue Owner</Badge>
                )}
              </div>
              <p className="text-muted-foreground">{user?.email}</p>
              {formData.city && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{formData.city}</span>
                </div>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4 hidden sm:block" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4 hidden sm:block" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4 hidden sm:block" />
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
          <div className="mt-8 pt-6 border-t border-border">
            <Button variant="ghost" onClick={handleSignOut} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
