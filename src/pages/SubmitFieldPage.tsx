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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/nearby")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Fields
          </Button>

          <Card>
            <CardHeader>
              {/* The page had no h1 at all — its only heading was this card title, so
                  that is what the page is called. */}
              <CardTitle as="h1" className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Submit a Public Field
              </CardTitle>
              <CardDescription>
                Know a free sports field? Add it to help others find great places to play. 
                Fields are reviewed before being added to the map.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field Name *</FormLabel>
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location *</label>
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="outline" onClick={handleLocate} disabled={isLocating}>
                        {isLocating ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <MapPin className="h-4 w-4 mr-1" />
                        )}
                        {location ? "Re-capture" : "Use My Location"}
                      </Button>
                      {location && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="tabular-nums">
                            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                          </span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Stand at the field and capture your GPS location</p>
                  </div>

                  {/* Sports */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sports Available *</label>
                    <div className="flex flex-wrap gap-2">
                      {SPORTS.map(sport => (
                        <Badge
                          key={sport}
                          variant={selectedSports.includes(sport) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleSport(sport)}
                        >
                          {sport}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="surface_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Surface Type</FormLabel>
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
                      <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <FormLabel className="mb-0">Has Lighting</FormLabel>
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
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                    ) : (
                      "Submit Field for Review"
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
