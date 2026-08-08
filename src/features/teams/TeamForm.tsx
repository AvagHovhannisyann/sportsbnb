import { useState } from "react";
import { Eye, EyeOff, Loader2, Save, Sparkles, Upload, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { sportTypes } from "@/data/constants";
import { supabase } from "@/integrations/supabase/client";

export interface TeamFormValues {
  name: string;
  description: string;
  sport: string;
  teamSize: number;
  visibility: string;
  logoUrl: string | null;
}

const EMPTY: TeamFormValues = {
  name: "",
  description: "",
  sport: "",
  teamSize: 10,
  visibility: "public",
  logoUrl: null,
};

/** The sizes the picker offers. A team saved with something else keeps it. */
const TEAM_SIZES = [2, 4, 5, 6, 7, 8, 10, 11, 12, 15, 20];

interface TeamFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<TeamFormValues>;
  onSubmit: (values: TeamFormValues) => void | Promise<void>;
  isSubmitting: boolean;
}

/** Shared presentation and values for team creation and editing. */
export function TeamForm({ mode, initialValues, onSubmit, isSubmitting }: TeamFormProps) {
  const navigate = useNavigate();
  const [values, setValues] = useState<TeamFormValues>({ ...EMPTY, ...initialValues });
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const set = <K extends keyof TeamFormValues>(key: K, value: TeamFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const handleGenerateLogo = async () => {
    if (!aiPrompt.trim() && !values.name.trim()) {
      toast.error("Please enter a team name or description for the AI");
      return;
    }

    setIsGeneratingLogo(true);
    try {
      const prompt = aiPrompt.trim() || `${values.name} ${values.sport} team`;
      const { data, error } = await supabase.functions.invoke("generate-ai-image", {
        body: { prompt, type: "team-logo", bucket: "team-logos" },
      });

      if (error) throw error;
      if (data?.url) {
        set("logoUrl", data.url);
        toast.success("Logo generated!");
      }
    } catch (error) {
      console.error("Logo generation error:", error);
      toast.error("Failed to generate logo. Try again.");
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const handleUploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const path = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("team-logos").upload(path, file);
    if (error) {
      toast.error("Failed to upload logo");
      return;
    }
    const { data: publicUrl } = supabase.storage.from("team-logos").getPublicUrl(path);
    set("logoUrl", publicUrl.publicUrl);
    toast.success("Logo uploaded!");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.name.trim() || !values.sport) {
      toast.error("Please fill in required fields");
      return;
    }
    await onSubmit({ ...values, name: values.name.trim(), description: values.description.trim() });
  };

  // Preserve non-canonical team sizes saved before this picker existed.
  const sizes = TEAM_SIZES.includes(values.teamSize)
    ? TEAM_SIZES
    : [...TEAM_SIZES, values.teamSize].sort((a, b) => a - b);

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card shadow-xs">
      <section className="border-b border-border p-5 md:p-6" aria-labelledby="team-info-heading">
        <div className="mb-5">
          <h2 id="team-info-heading" className="text-xl font-semibold text-foreground">
            Team details
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Give players enough context to recognize the team and its sport.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name *</Label>
            <Input
              id="name"
              aria-required="true"
              placeholder="e.g., Thunder FC"
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell players what your team is about…"
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
              className="min-h-24"
              maxLength={300}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="team-sport">Sport *</Label>
              <Select value={values.sport} onValueChange={(value) => set("sport", value)}>
                <SelectTrigger id="team-sport" aria-label="Sport" aria-required="true">
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent>
                  {sportTypes.map((sport) => (
                    <SelectItem key={sport} value={sport}>
                      {sport}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-size">Team Size</Label>
              <Select
                value={String(values.teamSize)}
                onValueChange={(value) => set("teamSize", Number(value))}
              >
                <SelectTrigger id="team-size" aria-label="Team size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sizes.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} players
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border p-5 md:p-6" aria-labelledby="team-logo-heading">
        <div className="mb-5">
          <h2 id="team-logo-heading" className="text-xl font-semibold text-foreground">
            Team logo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional. Upload a finished mark or generate a starting point.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-start">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-1">
            {values.logoUrl ? (
              <img
                src={values.logoUrl}
                alt={`${values.name || "Team"} logo preview`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl font-semibold text-primary" aria-hidden="true">
                {(values.name || "T").charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logo-prompt">Generate a logo</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="logo-prompt"
                  placeholder="Describe a simple team mark…"
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateLogo}
                  disabled={isGeneratingLogo}
                  className="shrink-0"
                >
                  {isGeneratingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  )}
                  Generate
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="relative">
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleUploadLogo}
                className="peer sr-only"
              />
              <Label
                htmlFor="logo-upload"
                className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-interactive bg-background px-4 text-sm font-medium text-foreground transition-[background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none hover:bg-surface-1 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
              >
                <Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Upload image
              </Label>
            </div>
          </div>
        </div>
      </section>

      <section className="p-5 md:p-6" aria-labelledby="team-visibility-heading">
        <div className="mb-5">
          <h2 id="team-visibility-heading" className="text-xl font-semibold text-foreground">
            Visibility
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Control how new players discover and join.</p>
        </div>

        <RadioGroup
          value={values.visibility}
          onValueChange={(value) => set("visibility", value)}
          aria-label="Team visibility"
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="relative">
            <RadioGroupItem
              value="public"
              id="public"
              className="peer !absolute !h-px !w-px overflow-hidden whitespace-nowrap !border-0 !p-0 [clip:rect(0,0,0,0)]"
            />
            <Label
              htmlFor="public"
              className="flex min-h-[5.5rem] cursor-pointer items-start gap-3 rounded-lg border border-border-interactive bg-background p-4 transition-[background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none hover:bg-surface-1 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary-soft peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
            >
              <Eye className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="block font-semibold text-foreground">Public</span>
                <span className="mt-1 block text-sm font-normal leading-relaxed text-muted-foreground">
                  Anyone can find and join the team.
                </span>
              </span>
            </Label>
          </div>

          <div className="relative">
            <RadioGroupItem
              value="private"
              id="private"
              className="peer !absolute !h-px !w-px overflow-hidden whitespace-nowrap !border-0 !p-0 [clip:rect(0,0,0,0)]"
            />
            <Label
              htmlFor="private"
              className="flex min-h-[5.5rem] cursor-pointer items-start gap-3 rounded-lg border border-border-interactive bg-background p-4 transition-[background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none hover:bg-surface-1 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary-soft peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
            >
              <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="block font-semibold text-foreground">Private</span>
                <span className="mt-1 block text-sm font-normal leading-relaxed text-muted-foreground">
                  Players join through an invite or approval.
                </span>
              </span>
            </Label>
          </div>
        </RadioGroup>
      </section>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex gap-3 rounded-b-xl border-t border-border bg-card/95 p-4 backdrop-blur-sm md:static md:justify-end md:p-5">
        <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1 md:flex-none">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1 md:min-w-40 md:flex-none">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {mode === "create" ? "Creating…" : "Saving…"}
            </>
          ) : mode === "create" ? (
            <>
              <Users className="h-4 w-4" aria-hidden="true" />
              Create team
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
