import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, Upload, User, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SPORTS_OPTIONS = [
  "Football", "Basketball", "Tennis", "Swimming", 
  "Volleyball", "Badminton", "Rugby", "Gym",
  "Cricket", "Golf", "Running", "Cycling"
];

const PlayerOnboarding = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    dateOfBirth: "",
    gender: "",
    city: "",
    phone: "",
    preferredSports: [] as string[],
    skillLevel: "",
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Check if onboarding is already completed and redirect
  useEffect(() => {
    if (!authLoading && profile?.onboarding_completed) {
      navigate("/dashboard", { replace: true });
    }
  }, [profile, authLoading, navigate]);

  // Pre-fill data from user metadata (Google OAuth provides name and avatar)
  useEffect(() => {
    if (user && !isInitialized) {
      const metadata = user.user_metadata || {};
      const googleAvatar = metadata.avatar_url || metadata.picture;
      
      setFormData(prev => ({
        ...prev,
        fullName: metadata.full_name || metadata.name || prev.fullName,
        username: prev.username, // Keep empty for user to set
      }));
      
      // Pre-fill avatar from Google if available
      if (googleAvatar && !avatarPreview) {
        setAvatarPreview(googleAvatar);
      }
      
      // Also pre-fill from existing profile if any
      if (profile) {
        setFormData(prev => ({
          ...prev,
          fullName: profile.full_name || prev.fullName,
          username: profile.username || prev.username,
          dateOfBirth: profile.date_of_birth || prev.dateOfBirth,
          gender: profile.gender || prev.gender,
          city: profile.city || prev.city,
          phone: profile.phone || prev.phone,
          preferredSports: profile.preferred_sports || prev.preferredSports,
          skillLevel: profile.skill_level || prev.skillLevel,
        }));
        if (profile.avatar_url) {
          setAvatarPreview(profile.avatar_url);
        }
      }
      
      setIsInitialized(true);
    }
  }, [user, profile, isInitialized, avatarPreview]);

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleSportToggle = (sport: string) => {
    setFormData(prev => ({
      ...prev,
      preferredSports: prev.preferredSports.includes(sport)
        ? prev.preferredSports.filter(s => s !== sport)
        : [...prev.preferredSports, sport]
    }));
  };

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

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.fullName.trim()) {
        toast.error("Please enter your full name");
        return;
      }
      if (!formData.username.trim()) {
        toast.error("Please enter a username");
        return;
      }
    }
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);

    try {
      let avatarUrl = avatarPreview;

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);

        if (uploadError) {
          console.error("Avatar upload error:", uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          avatarUrl = publicUrl;
        }
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          username: formData.username,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          city: formData.city || null,
          phone: formData.phone || null,
          preferred_sports: formData.preferredSports.length > 0 ? formData.preferredSports : null,
          skill_level: formData.skillLevel || null,
          avatar_url: avatarUrl,
          onboarding_completed: true,
        })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      await refreshProfile();
      toast.success("Profile completed!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      if (error?.code === '23505' || error?.message?.includes('profiles_username_unique_idx')) {
        toast.error("That username is already taken. Please choose a different one.");
        setCurrentStep(1); // Go back to step 1 where username is entered
      } else {
        toast.error("Failed to save profile. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">S</span>
            </div>
            <span className="text-xl font-semibold text-foreground">Sportsbnb</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="container max-w-2xl py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Sportsbnb!</h1>
              <p className="text-muted-foreground">Let's set up your player profile</p>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-lg p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  placeholder="Choose a unique username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">This will be your public display name</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth (optional)</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Gender (optional)</Label>
                <RadioGroup
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  className="flex flex-wrap gap-4"
                >
                  {["Male", "Female", "Other", "Prefer not to say"].map((gender) => (
                    <div key={gender} className="flex items-center space-x-2">
                      <RadioGroupItem value={gender.toLowerCase()} id={gender.toLowerCase()} />
                      <Label htmlFor={gender.toLowerCase()} className="font-normal cursor-pointer">
                        {gender}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Where are you located?</h1>
              <p className="text-muted-foreground">This helps us find venues and games near you</p>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-lg p-6">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Enter your city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="h-12"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Sports Preferences */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">What sports do you play?</h1>
              <p className="text-muted-foreground">Select all that apply</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SPORTS_OPTIONS.map((sport) => (
                // Same div-with-a-dead-checkbox as the profile tab, on the
                // step a new player hits before they have used anything else.
                // Keyboard users could not pick a single sport here.
                <Label
                  key={sport}
                  htmlFor={`onboarding-sport-${sport.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all font-normal ${
                    formData.preferredSports.includes(sport)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    id={`onboarding-sport-${sport.toLowerCase().replace(/\s+/g, "-")}`}
                    checked={formData.preferredSports.includes(sport)}
                    onCheckedChange={() => handleSportToggle(sport)}
                  />
                  <span className="font-medium">{sport}</span>
                </Label>
              ))}
            </div>

            <div className="space-y-3 pt-4">
              <Label>Skill Level (optional)</Label>
              <RadioGroup
                value={formData.skillLevel}
                onValueChange={(value) => setFormData({ ...formData, skillLevel: value })}
                className="grid grid-cols-3 gap-3"
              >
                {[
                  { value: "beginner", label: "Beginner", desc: "Just starting out" },
                  { value: "intermediate", label: "Intermediate", desc: "Some experience" },
                  { value: "advanced", label: "Advanced", desc: "Highly skilled" },
                ].map((level) => (
                  <div key={level.value}>
                    <RadioGroupItem value={level.value} id={level.value} className="peer sr-only" />
                    <Label
                      htmlFor={level.value}
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-border-interactive bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center"
                    >
                      <span className="font-medium">{level.label}</span>
                      <span className="text-xs text-muted-foreground mt-1">{level.desc}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Step 4: Profile Photo */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Add a profile photo</h1>
              <p className="text-muted-foreground">Help others recognize you (optional)</p>
            </div>

            <div className="flex flex-col items-center gap-6">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="bg-muted text-4xl">
                  <User className="h-16 w-16 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>

              <Label
                htmlFor="avatar-upload"
                className="flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer transition-colors"
              >
                <Upload className="h-5 w-5" />
                <span>{avatarPreview ? "Change photo" : "Upload photo"}</span>
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-lg p-6 mt-8">
              <h3 className="font-semibold text-foreground mb-4">Profile Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Full Name</span>
                  <span className="font-medium">{formData.fullName || "Not set"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Username</span>
                  <span className="font-medium">{formData.username || "Not set"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">City</span>
                  <span className="font-medium">{formData.city || "Not set"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Sports</span>
                  <span className="font-medium">
                    {formData.preferredSports.length > 0 
                      ? formData.preferredSports.slice(0, 3).join(", ") + (formData.preferredSports.length > 3 ? "..." : "")
                      : "Not set"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Skill Level</span>
                  <span className="font-medium capitalize">{formData.skillLevel || "Not set"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={handleNext} className="gap-2 shadow-lg shadow-primary/20">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2 shadow-lg shadow-primary/20">
              {isSubmitting ? "Saving..." : "Complete Setup"}
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Skip option */}
        {currentStep < totalSteps && (
          <div className="text-center mt-4">
            <Button
              variant="link"
              onClick={handleNext}
              className="text-muted-foreground"
            >
              Skip this step
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerOnboarding;
