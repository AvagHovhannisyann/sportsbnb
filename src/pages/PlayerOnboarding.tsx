import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Camera, Check, Loader2, MapPin, Trophy, User } from "lucide-react";
import Logo from "@/components/brand/Logo";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SPORTS_OPTIONS = [
  "Football", "Basketball", "Tennis", "Swimming", 
  "Volleyball", "Badminton", "Rugby", "Gym",
  "Cricket", "Golf", "Running", "Cycling"
];

const ONBOARDING_STEPS = [
  { label: "Profile", icon: User },
  { label: "Location", icon: MapPin },
  { label: "Sports", icon: Trophy },
  { label: "Photo", icon: Camera },
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
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-4 text-center" role="status" aria-label="Loading player setup">
          <Logo variant="mark" className="h-12 w-auto" />
          <Loader2 className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Preparing your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/90">
        <div className="container flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <Logo variant="full" className="h-9 w-auto" />
        </div>
      </header>

      <main className="container max-w-3xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
        <section aria-labelledby={`onboarding-step-${currentStep}-title`}>
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-foreground">Player profile</span>
              <span className="tabular-nums text-muted-foreground">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <Progress
              value={progress}
              className="h-1.5"
              aria-label={`Profile setup: step ${currentStep} of ${totalSteps}`}
            />
            <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Profile setup progress">
              {ONBOARDING_STEPS.map((step, index) => {
                const stepNumber = index + 1;
                const isComplete = stepNumber < currentStep;
                const isCurrent = stepNumber === currentStep;
                const StepIcon = step.icon;
                return (
                  <li
                    key={step.label}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-2 text-xs sm:px-2 sm:text-sm ${
                      isCurrent ? "bg-primary-soft font-semibold text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                        isComplete
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCurrent
                            ? "border-primary bg-card text-primary"
                            : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {isComplete ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <StepIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </span>
                    <span className="hidden truncate sm:block">{step.label}</span>
                    <span className="sr-only sm:hidden">{step.label}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-xs">
            {currentStep === 1 && (
              <div className="p-5 sm:p-8">
                <div className="mb-7 max-w-xl">
                  <p className="text-eyebrow mb-2">Your player identity</p>
                  <h1 id="onboarding-step-1-title" className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    Welcome to Sportsbnb
                  </h1>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    Add the essentials so other players know who they are meeting on court.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="fullName">Full name *</Label>
                    <Input
                      id="fullName"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      autoComplete="name"
                      required
                      aria-required="true"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      placeholder="Choose a unique username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      autoComplete="username"
                      required
                      aria-required="true"
                      aria-describedby="username-help"
                    />
                    <p id="username-help" className="text-sm leading-relaxed text-muted-foreground">
                      This will be your public display name.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number (optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+374 00 000 000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of birth (optional)</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      autoComplete="bday"
                    />
                  </div>

                  <fieldset className="space-y-3 sm:col-span-2">
                    <legend className="text-sm font-medium text-foreground">Gender (optional)</legend>
                    <RadioGroup
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                      className="grid gap-2 sm:grid-cols-2"
                      aria-label="Gender"
                    >
                      {["Male", "Female", "Other", "Prefer not to say"].map((gender) => {
                        const id = `gender-${gender.toLowerCase().replace(/\s+/g, "-")}`;
                        return (
                          <div key={gender} className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3.5 py-2">
                            <RadioGroupItem value={gender.toLowerCase()} id={id} />
                            <Label htmlFor={id} className="flex min-h-10 flex-1 cursor-pointer items-center font-normal">
                              {gender}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </fieldset>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="p-5 sm:p-8">
                <div className="mb-7 max-w-xl">
                  <p className="text-eyebrow mb-2">Local recommendations</p>
                  <h1 id="onboarding-step-2-title" className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    Where are you located?
                  </h1>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    Your city helps us surface nearby venues, games, and teams.
                  </p>
                </div>

                <div className="max-w-xl space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Enter your city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    autoComplete="address-level2"
                  />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    You can update this later from your profile settings.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="p-5 sm:p-8">
                <div className="mb-7 max-w-xl">
                  <p className="text-eyebrow mb-2">Your game</p>
                  <h1 id="onboarding-step-3-title" className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    What sports do you play?
                  </h1>
                  <p className="mt-2 leading-relaxed text-muted-foreground">Select every sport that belongs in your profile.</p>
                </div>

                <fieldset>
                  <legend className="sr-only">Preferred sports</legend>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {SPORTS_OPTIONS.map((sport) => {
                      const id = `onboarding-sport-${sport.toLowerCase().replace(/\s+/g, "-")}`;
                      const isSelected = formData.preferredSports.includes(sport);
                      return (
                        <Label
                          key={sport}
                          htmlFor={id}
                          className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 font-normal transition-[background-color,border-color,box-shadow] duration-150 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 motion-reduce:transition-none ${
                            isSelected
                              ? "border-primary bg-primary-soft text-primary"
                              : "border-border-interactive bg-background text-foreground hover:bg-surface-1"
                          }`}
                        >
                          <Checkbox
                            id={id}
                            checked={isSelected}
                            onCheckedChange={() => handleSportToggle(sport)}
                          />
                          <span className="min-w-0 font-medium leading-tight">{sport}</span>
                        </Label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="mt-8 space-y-3">
                  <legend className="text-sm font-medium text-foreground">Skill level (optional)</legend>
                  <RadioGroup
                    value={formData.skillLevel}
                    onValueChange={(value) => setFormData({ ...formData, skillLevel: value })}
                    className="grid gap-2.5 sm:grid-cols-3"
                    aria-label="Skill level"
                  >
                    {[
                      { value: "beginner", label: "Beginner", desc: "Just starting out" },
                      { value: "intermediate", label: "Intermediate", desc: "Some experience" },
                      { value: "advanced", label: "Advanced", desc: "Highly skilled" },
                    ].map((level) => (
                      <div key={level.value}>
                        <RadioGroupItem value={level.value} id={`skill-${level.value}`} className="peer sr-only" />
                        <Label
                          htmlFor={`skill-${level.value}`}
                          className="flex min-h-20 cursor-pointer flex-col justify-center rounded-lg border border-border-interactive bg-background px-4 py-3 transition-[background-color,border-color,box-shadow] duration-150 hover:bg-surface-1 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary-soft motion-reduce:transition-none"
                        >
                          <span className="font-semibold text-foreground">{level.label}</span>
                          <span className="mt-0.5 text-sm leading-snug text-muted-foreground">{level.desc}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </fieldset>
              </div>
            )}

            {currentStep === 4 && (
              <div className="p-5 sm:p-8">
                <div className="mb-7 max-w-xl">
                  <p className="text-eyebrow mb-2">Recognition</p>
                  <h1 id="onboarding-step-4-title" className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    Add a profile photo
                  </h1>
                  <p className="mt-2 leading-relaxed text-muted-foreground">A photo helps players recognize you. You can also leave this for later.</p>
                </div>

                <div className="grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)] md:items-center">
                  <div className="flex flex-col items-center gap-4 rounded-xl bg-surface-1 p-5 text-center">
                    <Avatar className="h-28 w-28 border border-border bg-card shadow-sm">
                      <AvatarImage src={avatarPreview || undefined} alt="" className="object-cover" />
                      <AvatarFallback className="bg-card">
                        <User className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium text-foreground">{avatarPreview ? "Photo ready" : "No photo selected"}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatar-upload">Profile photo (optional)</Label>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      aria-describedby="avatar-help"
                      className="h-auto min-h-12 cursor-pointer py-1.5 text-sm file:mr-3 file:rounded-md file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
                    />
                    <p id="avatar-help" className="text-sm leading-relaxed text-muted-foreground">
                      Choose an image from this device. Your existing account photo remains in place until you finish setup.
                    </p>
                  </div>
                </div>

                <div className="mt-8 rounded-xl border border-border bg-surface-1/70 p-4 sm:p-5">
                  <h2 className="font-display text-lg font-semibold text-foreground">Profile summary</h2>
                  <dl className="mt-3 divide-y divide-border text-sm">
                    {[
                      ["Full name", formData.fullName || "Not set"],
                      ["Username", formData.username || "Not set"],
                      ["City", formData.city || "Not set"],
                      [
                        "Sports",
                        formData.preferredSports.length > 0
                          ? formData.preferredSports.slice(0, 3).join(", ") + (formData.preferredSports.length > 3 ? "…" : "")
                          : "Not set",
                      ],
                      ["Skill level", formData.skillLevel || "Not set"],
                    ].map(([label, value]) => (
                      <div key={label} className="grid gap-1 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className={`min-w-0 break-words font-medium text-foreground ${label === "Skill level" ? "capitalize" : ""}`}>
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            )}
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm supports-[backdrop-filter]:bg-background/90 sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="shrink-0 gap-2"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>

              <div className="flex min-w-0 items-center justify-end gap-2">
                {currentStep < totalSteps && (
                  <Button variant="ghost" onClick={handleNext} className="min-w-0 px-2.5 text-muted-foreground sm:px-4">
                    Skip this step
                  </Button>
                )}

                {currentStep < totalSteps ? (
                  <Button onClick={handleNext} className="shrink-0 gap-2">
                    Next
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className="shrink-0 gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        Saving…
                      </>
                    ) : (
                      <>
                        Complete setup
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PlayerOnboarding;
