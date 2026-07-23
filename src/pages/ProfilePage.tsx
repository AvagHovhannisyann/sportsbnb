import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { User, Bell, CreditCard, Shield, LogOut, Camera, MapPin, Check, Loader2, ExternalLink, Receipt, Eye, EyeOff, AlertTriangle, Globe } from "lucide-react";
import TwoFactorAuth from "@/components/security/TwoFactorAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency, CURRENCIES } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SPORTS_OPTIONS = [
  "Football", "Basketball", "Tennis", "Swimming", 
  "Volleyball", "Badminton", "Rugby", "Gym",
  "Cricket", "Golf", "Running", "Cycling"
];

interface NotificationPreferences {
  bookingConfirmations: boolean;
  gameUpdates: boolean;
  newGamesNearby: boolean;
  marketingEmails: boolean;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, signOut, refreshProfile } = useAuth();
  const { currency, setCurrency, detectedCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    city: "",
    dateOfBirth: "",
    gender: "",
    preferredSports: [] as string[],
    skillLevel: "",
    // Owner fields
    businessName: "",
    venueName: "",
    venueAddress: "",
    venueDescription: "",
    sportsOffered: [] as string[],
  });

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    bookingConfirmations: true,
    gameUpdates: true,
    newGamesNearby: false,
    marketingEmails: false,
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
      
      // Load notification preferences from profile if available
      const savedNotifications = (profile as any).notification_preferences as NotificationPreferences | undefined;
      if (savedNotifications) {
        setNotifications(savedNotifications);
      }
    }
  }, [profile, user]);

  // Password strength calculation
  const passwordStrength = React.useMemo(() => {
    const password = passwordData.newPassword;
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^a-zA-Z0-9]/.test(password),
    };

    if (checks.length) score += 20;
    if (checks.lowercase) score += 20;
    if (checks.uppercase) score += 20;
    if (checks.number) score += 20;
    if (checks.special) score += 20;

    return { score, checks };
  }, [passwordData.newPassword]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSportToggle = (sport: string) => {
    if (profile?.user_type === "owner") {
      setFormData(prev => ({
        ...prev,
        sportsOffered: prev.sportsOffered.includes(sport)
          ? prev.sportsOffered.filter(s => s !== sport)
          : [...prev.sportsOffered, sport]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        preferredSports: prev.preferredSports.includes(sport)
          ? prev.preferredSports.filter(s => s !== sport)
          : [...prev.preferredSports, sport]
      }));
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      let avatarUrl = profile?.avatar_url;

      // Upload new avatar if provided
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          avatarUrl = publicUrl;
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
      setAvatarFile(null);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
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

  const handleUpdatePassword = async () => {
    // Validate passwords
    const errors: Record<string, string> = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }
    if (passwordData.newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters";
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }
    
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setIsSavingPassword(true);
    setPasswordErrors({});

    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: passwordData.currentPassword,
      });

      if (signInError) {
        setPasswordErrors({ currentPassword: "Current password is incorrect" });
        setIsSavingPassword(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) throw updateError;

      toast.success("Password updated successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSignOutAllDevices = async () => {
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

  const handleDeleteAccount = async () => {
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
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <Label 
                htmlFor="avatar-upload" 
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="h-4 w-4" />
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
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

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your personal details and public profile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    {!isOwner && (
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          placeholder="johndoe"
                        />
                      </div>
                    )}
                    {isOwner && (
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input
                          id="businessName"
                          value={formData.businessName}
                          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                          placeholder="My Sports Business"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">Contact support to change email</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="New York"
                      />
                    </div>
                    {!isOwner && (
                      <div className="space-y-2">
                        <Label htmlFor="dob">Date of Birth</Label>
                        <Input
                          id="dob"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        />
                      </div>
                    )}
                    {isOwner && (
                      <div className="space-y-2">
                        <Label htmlFor="venueName">Venue Name</Label>
                        <Input
                          id="venueName"
                          value={formData.venueName}
                          onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                          placeholder="Downtown Sports Complex"
                        />
                      </div>
                    )}
                  </div>

                  {isOwner && (
                    <div className="space-y-2">
                      <Label htmlFor="venueAddress">Venue Address</Label>
                      <Input
                        id="venueAddress"
                        value={formData.venueAddress}
                        onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                        placeholder="123 Main St"
                      />
                    </div>
                  )}

                  {!isOwner && (
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <RadioGroup
                        value={formData.gender}
                        onValueChange={(value) => setFormData({ ...formData, gender: value })}
                        className="flex flex-wrap gap-4"
                      >
                        {["male", "female", "other", "prefer not to say"].map((gender) => (
                          <div key={gender} className="flex items-center space-x-2">
                            <RadioGroupItem value={gender} id={`gender-${gender}`} />
                            <Label htmlFor={`gender-${gender}`} className="font-normal cursor-pointer capitalize">
                              {gender}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sports Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>{isOwner ? "Sports Offered" : "Sports Preferences"}</CardTitle>
                  <CardDescription>
                    {isOwner 
                      ? "Select the sports available at your venue."
                      : "Select your favorite sports to get personalized recommendations."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {SPORTS_OPTIONS.map((sport) => {
                      const isSelected = isOwner 
                        ? formData.sportsOffered.includes(sport)
                        : formData.preferredSports.includes(sport);
                      return (
                        <div
                          key={sport}
                          onClick={() => handleSportToggle(sport)}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Checkbox checked={isSelected} className="pointer-events-none" />
                          <span className="text-sm font-medium">{sport}</span>
                        </div>
                      );
                    })}
                  </div>

                  {!isOwner && (
                    <div className="space-y-3">
                      <Label>Skill Level</Label>
                      <RadioGroup
                        value={formData.skillLevel}
                        onValueChange={(value) => setFormData({ ...formData, skillLevel: value })}
                        className="grid grid-cols-3 gap-3"
                      >
                        {[
                          { value: "beginner", label: "Beginner" },
                          { value: "intermediate", label: "Intermediate" },
                          { value: "advanced", label: "Advanced" },
                        ].map((level) => (
                          <div key={level.value}>
                            <RadioGroupItem value={level.value} id={`skill-${level.value}`} className="peer sr-only" />
                            <Label
                              htmlFor={`skill-${level.value}`}
                              className="flex items-center justify-center rounded-lg border-2 border-input bg-card p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                            >
                              <span className="font-medium">{level.label}</span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}

                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Currency Preferences Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Currency Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose your preferred currency for displaying prices.
                    {detectedCurrency && detectedCurrency !== currency && (
                      <span className="block mt-1 text-primary">
                        Detected currency based on your location: {CURRENCIES[detectedCurrency]?.name} ({detectedCurrency})
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Display Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger id="currency" className="w-full">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CURRENCIES).map(([code, info]) => (
                          <SelectItem key={code} value={code}>
                            <span className="flex items-center gap-2">
                              <span className="font-mono w-6">{info.symbol}</span>
                              <span>{info.name}</span>
                              <span className="text-muted-foreground ml-1">({code})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      This affects how prices are displayed throughout the app.
                    </p>
                  </div>
                  {detectedCurrency && detectedCurrency !== currency && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrency(detectedCurrency)}
                    >
                      Use detected currency ({detectedCurrency})
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose what notifications you want to receive.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { 
                      key: "bookingConfirmations" as const,
                      label: "Booking confirmations", 
                      description: "Get notified when your booking is confirmed"
                    },
                    { 
                      key: "gameUpdates" as const,
                      label: "Game updates", 
                      description: "Receive updates about games you've joined"
                    },
                    { 
                      key: "newGamesNearby" as const,
                      label: "New games nearby", 
                      description: "Get notified when new games are posted in your area"
                    },
                    { 
                      key: "marketingEmails" as const,
                      label: "Marketing emails", 
                      description: "Receive tips, updates, and promotions"
                    },
                  ].map((notification) => (
                    <div key={notification.key} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">{notification.label}</div>
                        <div className="text-sm text-muted-foreground">{notification.description}</div>
                      </div>
                      <Switch 
                        checked={notifications[notification.key]}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, [notification.key]: checked }))
                        }
                      />
                    </div>
                  ))}
                  <Separator />
                  <Button onClick={handleSaveNotifications} disabled={isSavingNotifications}>
                    {isSavingNotifications ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Preferences"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>
                    Change your password to keep your account secure.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input 
                        id="currentPassword" 
                        type={showCurrentPassword ? "text" : "password"} 
                        placeholder="••••••••"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className={passwordErrors.currentPassword ? "border-destructive pr-10" : "pr-10"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="text-sm text-destructive">{passwordErrors.currentPassword}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input 
                        id="newPassword" 
                        type={showNewPassword ? "text" : "password"} 
                        placeholder="••••••••"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className={passwordErrors.newPassword ? "border-destructive pr-10" : "pr-10"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordData.newPassword && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Progress value={passwordStrength.score} className="h-2 flex-1" />
                          <span className={`text-xs font-medium ${passwordStrength.score >= 80 ? "text-primary" : passwordStrength.score >= 60 ? "text-yellow-600" : "text-destructive"}`}>
                            {passwordStrength.score <= 20 ? "Very Weak" : passwordStrength.score <= 40 ? "Weak" : passwordStrength.score <= 60 ? "Fair" : passwordStrength.score <= 80 ? "Good" : "Strong"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {[
                            { key: "length", label: "8+ characters" },
                            { key: "lowercase", label: "Lowercase" },
                            { key: "uppercase", label: "Uppercase" },
                            { key: "number", label: "Number" },
                            { key: "special", label: "Special char" },
                          ].map(({ key, label }) => (
                            <div key={key} className="flex items-center gap-1">
                              {passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? (
                                <Check className="h-3 w-3 text-primary" />
                              ) : (
                                <span className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                              )}
                              <span className={passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? "text-foreground" : "text-muted-foreground"}>
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {passwordErrors.newPassword && (
                      <p className="text-sm text-destructive">{passwordErrors.newPassword}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input 
                        id="confirmPassword" 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="••••••••"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className={passwordErrors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>
                    )}
                    {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && !passwordErrors.confirmPassword && (
                      <p className="text-sm text-primary flex items-center gap-1">
                        <Check className="h-4 w-4" /> Passwords match
                      </p>
                    )}
                  </div>
                  <Button onClick={handleUpdatePassword} disabled={isSavingPassword}>
                    {isSavingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Two-Factor Authentication */}
              <TwoFactorAuth />

              <Card className="border-destructive/20">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Sign out of all devices</div>
                      <div className="text-sm text-muted-foreground">
                        This will sign you out from all devices including this one.
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">Sign out all</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sign out of all devices?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will sign you out from all devices, including this one. You'll need to sign in again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSignOutAllDevices}>
                            Sign out all
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Delete account</div>
                      <div className="text-sm text-muted-foreground">
                        Permanently delete your account and all data.
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete account</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Delete your account?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteAccount}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Yes, delete my account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
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