import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, ArrowLeft, Loader2, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/seo/SEOHead";
import { usePublicFields } from "@/hooks/usePublicFields";
import { toast } from "sonner";

const SPORTS = ["Football", "Basketball", "Tennis", "Volleyball", "Running", "Cycling", "Swimming"];
const SURFACES = ["Grass", "Artificial Turf", "Concrete", "Asphalt", "Clay", "Indoor"];

const fieldSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  address: z.string().trim().max(200, "Address too long").optional(),
  description: z.string().trim().max(500, "Description too long").optional(),
  surface_type: z.string().optional(),
  has_lighting: z.boolean().default(false),
});

type FieldFormValues = z.infer<typeof fieldSchema>;

const SubmitFieldPage: React.FC = () => {
  const navigate = useNavigate();
  const { submitField } = usePublicFields();
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const form = useForm<FieldFormValues>({
    resolver: zodResolver(fieldSchema),
    defaultValues: { name: "", address: "", description: "", surface_type: "", has_lighting: false },
  });

  const handleLocate = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
        toast.success("Location captured!");
      },
      () => {
        setIsLocating(false);
        toast.error("Could not get your location. Please try again.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleSport = (sport: string) => {
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );
  };

  const onSubmit = async (values: FieldFormValues) => {
    if (!location) {
      toast.error("Please capture your location first");
      return;
    }
    if (selectedSports.length === 0) {
      toast.error("Please select at least one sport");
      return;
    }

    setIsSubmitting(true);
    const success = await submitField({
      name: values.name,
      address: values.address,
      description: values.description,
      latitude: location.lat,
      longitude: location.lng,
      sports: selectedSports,
      surface_type: values.surface_type,
      has_lighting: values.has_lighting,
    });

    setIsSubmitting(false);
    if (success) {
      navigate("/nearby");
    }
  };

  return (
    <Layout>
      <SEOHead
        title="Submit a Sports Field | Sportsbnb"
        description="Help the community by adding a public sports field or court to our map."
      />
      <div className="min-h-screen bg-background">
        <div className="container max-w-3xl py-6 sm:py-8 lg:py-10">
          <Button variant="ghost" onClick={() => navigate("/nearby")} className="-ml-3 mb-5">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to fields
          </Button>

          <header className="mb-7 border-b border-border pb-7">
            <p className="mb-2 text-sm font-semibold text-primary">Community map</p>
            <h1 className="page-title text-balance">Add a public field</h1>
            <p className="mt-3 max-w-2xl text-foreground-soft">
              Know a free place to play? Share the essentials and we’ll review it before it appears on the map.
            </p>
          </header>

          <Card>
            <CardContent className="p-5 sm:p-7">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Victory Park Basketball Court" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address or landmark" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Location */}
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold text-foreground">Location *</legend>
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                      <Button type="button" variant="outline" onClick={handleLocate} disabled={isLocating}>
                        {isLocating ? (
                          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        ) : (
                          <MapPin className="h-4 w-4" aria-hidden="true" />
                        )}
                        {location ? "Capture again" : "Use my location"}
                      </Button>
                      {location && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground" role="status">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="tabular-nums">
                            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                          </span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Stand at the field and capture its GPS location.</p>
                  </fieldset>

                  {/* Sports */}
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold text-foreground">Sports available *</legend>
                    <div className="flex flex-wrap gap-2" role="group">
                      {SPORTS.map(sport => (
                        <button
                          key={sport}
                          type="button"
                          aria-pressed={selectedSports.includes(sport)}
                          onClick={() => toggleSport(sport)}
                          className={`focus-ring min-h-11 rounded-full border px-4 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none ${
                            selectedSports.includes(sport)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border-interactive bg-background text-foreground hover:border-primary/50 hover:bg-accent"
                          }`}
                        >
                          {sport}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <FormField
                    control={form.control}
                    name="surface_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Surface type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select surface type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SURFACES.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="has_lighting"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-1 p-4">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <div>
                            <FormLabel className="mb-0">Has lighting</FormLabel>
                            <p className="text-xs text-muted-foreground">Can you play here at night?</p>
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any helpful details — condition, nearby parking, best times to play..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Submitting…</>
                    ) : (
                      "Submit field for review"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SubmitFieldPage;
