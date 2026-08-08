import React from "react";
import { Globe, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency, CURRENCIES } from "@/hooks/useCurrency";
import { useProfileSettings, type ProfileFormData } from "./hooks/useProfileSettings";

const SPORTS_OPTIONS = [
  "Football", "Basketball", "Tennis", "Swimming",
  "Volleyball", "Badminton", "Rugby", "Gym",
  "Cricket", "Golf", "Running", "Cycling"
];

interface ProfileInfoTabProps {
  isOwner: boolean;
  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  avatarFile: File | null;
  onProfileSaved: () => void;
}

const ProfileInfoTab = ({ isOwner, formData, setFormData, avatarFile, onProfileSaved }: ProfileInfoTabProps) => {
  const { currency, setCurrency, detectedCurrency } = useCurrency();
  const { updateProfile, isSaving } = useProfileSettings();

  const handleSportToggle = (sport: string) => {
    if (isOwner) {
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
    const success = await updateProfile(formData, avatarFile);
    if (success) {
      onProfileSaved();
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader>
          {/* First heading under the page h1, so h2 — the CardTitle default
              of h3 skipped a level here. */}
          <CardTitle as="h2">Personal Information</CardTitle>
          <CardDescription>
            Update your personal details and public profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                autoComplete="name"
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

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
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
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+374 XX XXXXXX"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                autoComplete="address-level2"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Yerevan"
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
            <fieldset className="space-y-2.5">
              <legend className="text-sm font-medium text-foreground">Gender</legend>
              <RadioGroup
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
                className="flex flex-wrap gap-2"
              >
                {["male", "female", "other", "prefer not to say"].map((gender) => (
                  <div key={gender} className="flex min-h-11 items-center space-x-2 rounded-lg border border-border px-3">
                    <RadioGroupItem value={gender} id={`gender-${gender}`} />
                    <Label htmlFor={`gender-${gender}`} className="font-normal cursor-pointer capitalize">
                      {gender}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </fieldset>
          )}
        </CardContent>
      </Card>

      {/* Sports Preferences */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle as="h2">{isOwner ? "Sports Offered" : "Sports Preferences"}</CardTitle>
          <CardDescription>
            {isOwner
              ? "Select the sports available at your venue."
              : "Select your favorite sports to get personalized recommendations."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <fieldset>
            <legend className="sr-only">{isOwner ? "Sports offered" : "Preferred sports"}</legend>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {SPORTS_OPTIONS.map((sport) => {
              const isSelected = isOwner
                ? formData.sportsOffered.includes(sport)
                : formData.preferredSports.includes(sport);
              // Was a plain <div onClick> holding a `pointer-events-none`
              // checkbox: the card looked like a checkbox, reported itself to
              // assistive tech as an unnamed one, and could not be reached or
              // toggled by keyboard at all — twelve sports, none selectable
              // without a mouse. A <Label> wrapping a real Checkbox keeps the
              // whole card as the hit area, gives the control its name from
              // the sport, and restores Tab and Space for free.
              const id = `sport-${sport.toLowerCase().replace(/\s+/g, "-")}`;
              return (
                <Label
                  key={sport}
                  htmlFor={id}
                  className={`min-h-12 cursor-pointer rounded-lg border p-3 font-normal transition-[background-color,border-color,color] duration-150 motion-reduce:transition-none flex items-center gap-3 ${
                    isSelected
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-background hover:border-border-strong hover:bg-surface-1"
                  }`}
                >
                  <Checkbox
                    id={id}
                    checked={isSelected}
                    onCheckedChange={() => handleSportToggle(sport)}
                  />
                  <span className="text-sm font-medium">{sport}</span>
                </Label>
              );
            })}
            </div>
          </fieldset>

          {!isOwner && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">Skill level</legend>
              <RadioGroup
                value={formData.skillLevel}
                onValueChange={(value) => setFormData({ ...formData, skillLevel: value })}
                className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
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
                      className="flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-border-interactive bg-background p-3 transition-colors duration-150 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary-soft peer-data-[state=checked]:text-primary motion-reduce:transition-none"
                    >
                      <span className="font-medium">{level.label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </fieldset>
          )}

          <Button onClick={handleSaveProfile} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                Save changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Currency Preferences Card */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" aria-hidden="true" />
            Currency preferences
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
            <Label htmlFor="currency">Display currency</Label>
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
    </>
  );
};

export default ProfileInfoTab;
