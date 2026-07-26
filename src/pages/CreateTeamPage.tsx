import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Upload, Sparkles, Users, Eye, EyeOff } from "lucide-react";
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
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useCreateTeam } from "@/hooks/useTeams";
import { sportTypes } from "@/data/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CreateTeamPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createTeam = useCreateTeam();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sport: "",
    team_size: "10",
    visibility: "public",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const handleGenerateLogo = async () => {
    if (!aiPrompt.trim() && !formData.name.trim()) {
      toast.error("Please enter a team name or description for the AI");
      return;
    }

    setIsGeneratingLogo(true);
    try {
      const prompt = aiPrompt.trim() || `${formData.name} ${formData.sport} team`;
      const { data, error } = await supabase.functions.invoke("generate-ai-image", {
        body: {
          prompt,
          type: "team-logo",
          bucket: "team-logos",
        },
      });

      if (error) throw error;
      if (data?.url) {
        setLogoUrl(data.url);
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
    setLogoUrl(publicUrl.publicUrl);
    toast.success("Logo uploaded!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.name.trim() || !formData.sport) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const team = await createTeam.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        sport: formData.sport,
        team_size: parseInt(formData.team_size),
        logo_url: logoUrl || undefined,
        visibility: formData.visibility,
      });

      // Sonner draws its own success mark; the 🎉 was a second one.
      toast.success("Team created");
      navigate(`/team/${team.id}`);
    } catch {
      toast.error("Failed to create team");
    }
  };

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8 max-w-2xl">
          <div className="flex items-center gap-4 mb-8">
            <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div>
              <h1 className="page-title">Create a Team</h1>
              <p className="text-muted-foreground">Build your squad</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Team Info */}
            <Card>
              <CardHeader><CardTitle>Team Info</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Thunder FC"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    maxLength={60}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell others about your team..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-20"
                    maxLength={300}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sport *</Label>
                    <Select value={formData.sport} onValueChange={(v) => setFormData({ ...formData, sport: v })}>
                      <SelectTrigger aria-label="Sport"><SelectValue placeholder="Select sport" /></SelectTrigger>
                      <SelectContent>
                        {sportTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Team Size</Label>
                    <Select value={formData.team_size} onValueChange={(v) => setFormData({ ...formData, team_size: v })}>
                      <SelectTrigger aria-label="Team size"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[2, 4, 5, 6, 7, 8, 10, 11, 12, 15, 20].map(n => (
                          <SelectItem key={n} value={String(n)}>{n} players</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logo */}
            <Card>
              <CardHeader><CardTitle>Team Logo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {logoUrl && (
                  <div className="flex justify-center">
                    <img src={logoUrl} alt="Team logo" className="h-24 w-24 rounded-xl object-cover border border-border" />
                  </div>
                )}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Generate with AI</Label>
                    <div className="flex gap-2">
                      <Input
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
                        {isGeneratingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
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

            {/* Visibility */}
            <Card>
              <CardHeader><CardTitle>Visibility</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup
                  value={formData.visibility}
                  onValueChange={(v) => setFormData({ ...formData, visibility: v })}
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
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={createTeam.isPending} className="flex-1">
                {createTeam.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  <><Users className="h-4 w-4 mr-2" />Create Team</>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateTeamPage;
