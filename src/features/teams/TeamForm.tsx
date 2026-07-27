import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Upload, Sparkles, Users, Eye, EyeOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { sportTypes } from "@/data/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

/**
 * The team form, shared by create and edit.
 *
 * Extracted from `CreateTeamPage` when `EditTeamPage` was built, for the same
 * reason `VenueForm` is shared between adding and editing a venue: a captain
 * editing a team should be looking at the fields they filled in, in the order
 * they filled them, and two copies of a form drift the moment either is
 * touched. The only differences between the modes are the submit label and
 * whether the fields start empty.
 */
export function TeamForm({ mode, initialValues, onSubmit, isSubmitting }: TeamFormProps) {
  const navigate = useNavigate();
  const [values, setValues] = useState<TeamFormValues>({ ...EMPTY, ...initialValues });
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const set = <K extends keyof TeamFormValues>(key: K, value: TeamFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

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

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim() || !values.sport) {
      toast.error("Please fill in required fields");
      return;
    }
    await onSubmit({ ...values, name: values.name.trim(), description: values.description.trim() });
  };

  // A team saved before this list existed, or through the API, keeps whatever
  // size it has — offering only the canonical set would silently rewrite it to
  // the nearest option the first time anyone edited an unrelated field.
  const sizes = TEAM_SIZES.includes(values.teamSize)
    ? TEAM_SIZES
    : [...TEAM_SIZES, values.teamSize].sort((a, b) => a - b);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle as="h2">Team Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Thunder FC"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={60}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell others about your team..."
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              className="min-h-20"
              maxLength={300}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team-sport">Sport *</Label>
              <Select value={values.sport} onValueChange={(v) => set("sport", v)}>
                <SelectTrigger id="team-sport" aria-label="Sport">
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent>
                  {sportTypes.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-size">Team Size</Label>
              <Select value={String(values.teamSize)} onValueChange={(v) => set("teamSize", Number(v))}>
                <SelectTrigger id="team-size" aria-label="Team size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sizes.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} players
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {values.logoUrl && (
            <div className="flex justify-center">
              <img
                src={values.logoUrl}
                alt="Team logo"
                className="h-24 w-24 rounded-xl object-cover border border-border"
              />
            </div>
          )}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="logo-prompt">Generate with AI</Label>
              <div className="flex gap-2">
                <Input
                  id="logo-prompt"
                  placeholder="Describe your team logo..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateLogo}
                  disabled={isGeneratingLogo}
                  className="shrink-0 gap-2"
                >
                  {isGeneratingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate
                </Button>
              </div>
            </div>
            <div className="text-center text-sm text-muted-foreground">or</div>
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="flex items-center justify-center gap-2 p-3 border border-dashed border-border rounded-lg hover:border-primary/50 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload image</span>
                </div>
              </Label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleUploadLogo}
                className="hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={values.visibility}
            onValueChange={(v) => set("visibility", v)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border">
              <RadioGroupItem value="public" id="public" />
              <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer flex-1">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Public</p>
                  <p className="text-sm text-muted-foreground">Anyone can find and join</p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border">
              <RadioGroupItem value="private" id="private" />
              <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer flex-1">
                <EyeOff className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Private</p>
                  <p className="text-sm text-muted-foreground">Invite only or approval required</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {mode === "create" ? "Creating..." : "Saving..."}
            </>
          ) : mode === "create" ? (
            <>
              <Users className="h-4 w-4 mr-2" />
              Create Team
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
