import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Banknote,
  Building2,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Save,
  Settings2,
} from "lucide-react";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues } from "@/hooks/useVenues";
import { supabase } from "@/integrations/supabase/client";
import { CURRENCIES } from "@/lib/currencies";
import { toast } from "sonner";

const currencies = Object.entries(CURRENCIES).map(([code, info]) => ({
  code,
  symbol: info.symbol,
  name: info.name,
}));

const OwnerSettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, isLoading: authLoading, isProfileLoading } = useAuth();
  const {
    data: myVenues = [],
    isLoading: venuesLoading,
    isError: venuesError,
    isFetching: venuesFetching,
    refetch,
  } = useOwnerVenues(user?.id);

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    phone: "",
    website: "",
    price_per_hour: 0,
  });
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    if (myVenues.length === 0 || selectedVenueId) return;
    const requested = searchParams.get("venue");
    const match = requested ? myVenues.find((venue) => venue.id === requested) : undefined;
    setSelectedVenueId(match?.id ?? myVenues[0].id);
  }, [myVenues, selectedVenueId, searchParams]);

  useEffect(() => {
    if (selectedVenueId) {
      const venue = myVenues.find((candidate) => candidate.id === selectedVenueId);
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

  useEffect(() => {
    // preferred_currency exists in the database but predates the generated
    // profile type used by this auth context.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preferredCurrency = (profile as any)?.preferred_currency;
    if (preferredCurrency) {
      setCurrency(preferredCurrency);
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
    if (!authLoading && !isProfileLoading && user && profile?.user_type !== "owner") {
      navigate("/dashboard");
    }
  }, [user, profile, authLoading, isProfileLoading, navigate]);

  if (authLoading || venuesLoading) {
    return (
      <OwnerLayout title="Settings">
        <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading settings">
          <Loader2
            aria-hidden="true"
            className="h-7 w-7 animate-spin text-primary motion-reduce:animate-none"
          />
        </div>
      </OwnerLayout>
    );
  }

  if (venuesError) {
    return (
      <OwnerLayout title="Settings" subtitle="Update listing basics and your dashboard currency.">
        <Card className="max-w-3xl">
          <ErrorPanel
            what="your venues"
            description="No settings have changed. Try loading your venues again."
            onRetry={() => refetch()}
            isRetrying={venuesFetching}
          />
        </Card>
      </OwnerLayout>
    );
  }

  const handleSave = async () => {
    if (!selectedVenueId) return;
    setIsSaving(true);

    try {
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

  const selectedVenue = myVenues.find((venue) => venue.id === selectedVenueId);

  return (
    <OwnerLayout title="Settings" subtitle="Update listing basics and your dashboard currency.">
      {myVenues.length === 0 ? (
        <Card className="max-w-3xl">
          <EmptyState
            icon={Building2}
            title="No venues to configure"
            description="Add a venue first to configure settings."
            actionLabel="Add your first venue"
            actionHref="/add-venue"
          />
        </Card>
      ) : (
        <div className="max-w-5xl space-y-5">
          <section
            aria-labelledby="settings-venue-context"
            className="rounded-lg border border-border bg-surface-1 p-4 sm:flex sm:items-end sm:justify-between sm:gap-6"
          >
            <div className="min-w-0">
              <p className="eyebrow">Venue context</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <h2
                  id="settings-venue-context"
                  className="truncate font-display text-lg font-semibold tracking-extra-tight text-foreground"
                >
                  {selectedVenue?.name || "Choose a venue"}
                </h2>
                {selectedVenue && (
                  <Badge variant={selectedVenue.is_active ? "default" : "secondary"}>
                    {selectedVenue.is_active ? "Active" : "Draft"}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Listing changes below are written only to this venue.
              </p>
            </div>
            <div className="mt-4 w-full sm:mt-0 sm:max-w-xs">
              <Label htmlFor="settings-venue">Venue</Label>
              <Select value={selectedVenueId || ""} onValueChange={setSelectedVenueId}>
                <SelectTrigger id="settings-venue" className="mt-1.5">
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
          </section>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
            <Card>
              <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                  <Building2 aria-hidden="true" className="h-5 w-5 text-primary" />
                  Listing basics
                </CardTitle>
                <CardDescription className="mt-1.5">
                  Name, location, rate, and description shown across the marketplace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-5 pt-0 sm:p-6 sm:pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="settings-name">Venue name</Label>
                    <Input
                      id="settings-name"
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      placeholder="Your venue name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="settings-address">Address</Label>
                    <Input
                      id="settings-address"
                      autoComplete="street-address"
                      value={formData.address}
                      onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                      placeholder="Street and building"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="settings-city">City</Label>
                    <Input
                      id="settings-city"
                      autoComplete="address-level2"
                      value={formData.city}
                      onChange={(event) => setFormData({ ...formData, city: event.target.value })}
                      placeholder="Yerevan"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="settings-price">Base price per hour</Label>
                    <div className="relative">
                      <Banknote
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        id="settings-price"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={formData.price_per_hour}
                        onChange={(event) =>
                          setFormData({ ...formData, price_per_hour: Number(event.target.value) })
                        }
                        className="pl-10 font-mono tabular-nums"
                      />
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      This is the venue base rate. Existing booking and payment pricing rules remain unchanged.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-border pt-5">
                  <Label htmlFor="settings-description">Description</Label>
                  <Textarea
                    id="settings-description"
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    placeholder="Describe the venue, playing surface, and experience."
                    rows={5}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                  <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                    <Settings2 aria-hidden="true" className="h-5 w-5 text-primary" />
                    Dashboard preference
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    Currency is stored on your owner profile, not on one venue.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-currency">Preferred currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger id="settings-currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((candidate) => (
                          <SelectItem key={candidate.code} value={candidate.code}>
                            {candidate.code} ({candidate.symbol}) — {candidate.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      This changes dashboard display preference; it does not convert booking settlement amounts.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                  <CardTitle as="h2" className="text-lg">Account and contact</CardTitle>
                  <CardDescription className="mt-1.5">
                    Identity is read from your profile. Venue contact is managed in the listing editor.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-email">Account email</Label>
                    <div className="relative">
                      <Mail
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        id="settings-email"
                        type="email"
                        autoComplete="email"
                        value={profile?.email || ""}
                        disabled
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-surface-1 p-4">
                    <div className="flex items-start gap-3">
                      <MapPin aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-foreground-soft" />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">Venue contact details</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          Phone is stored through the venue editor. A venue website field is not part of the current save contract on this page.
                        </p>
                        {selectedVenue?.phone && (
                          <p className="mt-2 truncate text-sm font-medium text-foreground">
                            Current phone: {selectedVenue.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4 w-full"
                      disabled={!selectedVenueId}
                      onClick={() => navigate(`/venue/${selectedVenueId}/edit`)}
                    >
                      <Globe aria-hidden="true" />
                      Open venue editor
                      <ArrowUpRight aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface-1 p-3 sm:flex sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:p-0">
            <p className="hidden text-sm text-muted-foreground sm:block">
              Saves listing basics for {selectedVenue?.name || "the selected venue"} and currency for your profile.
            </p>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={handleSave}
              disabled={isSaving}
              aria-busy={isSaving}
            >
              {isSaving ? (
                <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Save aria-hidden="true" />
              )}
              {isSaving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerSettingsPage;
