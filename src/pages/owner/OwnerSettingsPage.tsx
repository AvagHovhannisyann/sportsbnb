import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Save, Building2, Mail, Phone, Globe, MapPin, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues } from "@/hooks/useVenues";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AMD", symbol: "֏", name: "Armenian Dram" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
];

const OwnerSettingsPage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isProfileLoading } = useAuth();
  const { data: myVenues = [], isLoading: venuesLoading, refetch } = useOwnerVenues(user?.id);

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    phone: "",
    website: "",
    price_per_hour: 0,
  });

  // Profile state for currency
  const [currency, setCurrency] = useState("USD");

  // Set default venue
  useEffect(() => {
    if (myVenues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(myVenues[0].id);
    }
  }, [myVenues, selectedVenueId]);

  // Load venue data when venue changes
  useEffect(() => {
    if (selectedVenueId) {
      const venue = myVenues.find((v) => v.id === selectedVenueId);
      if (venue) {
        setFormData({
          name: venue.name || "",
          description: venue.description || "",
          address: venue.address || "",
          city: venue.city || "",
          phone: "",
          website: "",
          price_per_hour: venue.price_per_hour || 0,
        });
      }
    }
  }, [selectedVenueId, myVenues]);

  // Load profile currency (preferred_currency may exist in DB)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prefCurrency = (profile as any)?.preferred_currency;
    if (prefCurrency) {
      setCurrency(prefCurrency);
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
    // isProfileLoading, not just authLoading: authLoading covers the
    // session only, so without it this reads user_type off a null profile
    // and bounces the owner. RequireRole already guards this route; keeping
    // the check correct here means it stays safe if that ever changes.
    if (!authLoading && !isProfileLoading && user && profile?.user_type !== "owner") {
      navigate("/dashboard");
    }
  }, [user, profile, authLoading, isProfileLoading, navigate]);

  if (authLoading || venuesLoading) {
    return (
      <OwnerLayout title="Settings">
        <div className="flex items-center justify-center h-64" role="status" aria-label="Loading settings">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OwnerLayout>
    );
  }

  const handleSave = async () => {
    if (!selectedVenueId) return;
    setIsSaving(true);

    try {
      // Update venue
      const { error: venueError } = await supabase
        .from("venues")
        .update({
          name: formData.name,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          price_per_hour: formData.price_per_hour,
        })
        .eq("id", selectedVenueId);

      if (venueError) throw venueError;

      // Update profile currency
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ preferred_currency: currency })
        .eq("user_id", user?.id);

      if (profileError) throw profileError;

      await refetch();
      toast.success("Settings saved successfully!");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <OwnerLayout title="Settings" subtitle="Update your venue's basic information and settings">
      {myVenues.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No venues to configure"
            description="Add a venue first to configure settings."
            actionLabel="Add Your First Venue"
            actionHref="/add-venue"
          />
        </Card>
      ) : (
        <div className="max-w-3xl space-y-6">
          {/* Venue Selector */}
          {myVenues.length > 1 && (
            <div>
              {/* `htmlFor`/`id`, not just proximity. The label was rendered
                  right above the control and tied to nothing, so Chrome
                  computed no accessible name for it and a screen reader
                  announced an unnamed combobox. */}
              <Label htmlFor="settings-venue" className="mb-2 block">Select Venue</Label>
              <Select
                value={selectedVenueId || ""}
                onValueChange={setSelectedVenueId}
              >
                <SelectTrigger id="settings-venue" className="w-full max-w-xs">
                  <SelectValue placeholder="Select a venue" />
                </SelectTrigger>
                <SelectContent>
                  {myVenues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                General Information
              </CardTitle>
              <CardDescription>
                Update your venue's basic information and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Venue Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Venue Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10"
                      placeholder="Your venue name"
                    />
                  </div>
                </div>

                {/* Email (from profile) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={profile?.email || ""}
                      disabled
                      className="pl-10 bg-muted"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10"
                      placeholder="+374 XX XXXXXX"
                    />
                  </div>
                </div>

                {/* Currency */}
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This will be used throughout your dashboard
                  </p>
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="pl-10"
                      placeholder="https://yourvenue.com"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your venue's website URL
                  </p>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="pl-10"
                      placeholder="123 Sports Lane"
                    />
                  </div>
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Yerevan"
                  />
                </div>

                {/* Price per hour */}
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Hour</Label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      value={formData.price_per_hour}
                      onChange={(e) => setFormData({ ...formData, price_per_hour: Number(e.target.value) })}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your venue..."
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full"
                size="lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerSettingsPage;